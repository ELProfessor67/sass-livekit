"""
REST LLM Service for handling OpenAI API calls via REST instead of WebSocket
This provides better compatibility with certain models and more control over the conversation flow
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional, AsyncGenerator
import aiohttp
from livekit.agents import llm, APIConnectOptions

logger = logging.getLogger(__name__)

class RestLLMService:
    """REST-based LLM service that mimics LiveKit's LLM interface"""
    
    def __init__(self, model: str, api_key: str, base_url: str = "https://api.openai.com/v1"):
        self.model = model
        self.api_key = api_key
        self.base_url = base_url
        self.conversation_history: List[Dict] = []
        self._lock = asyncio.Lock()  # Internal race protection
        
    def add_message(self, role: str, content: str, tool_calls: list = None):
        """Add a message to conversation history"""
        message = {
            "role": role,
            "content": content
        }
        if tool_calls:
            message["tool_calls"] = tool_calls
        self.conversation_history.append(message)
    
    def set_system_prompt(self, prompt: str):
        """Set or update the system prompt"""
        # Remove existing system messages
        self.conversation_history = [msg for msg in self.conversation_history if msg["role"] != "system"]
        # Add new system message at the beginning
        self.conversation_history.insert(0, {
            "role": "system",
            "content": prompt
        })
    
    async def generate_response(self, user_message: str, tools: list = None, tool_choice: str | dict | None = None) -> AsyncGenerator[dict, None]:
        """
        Stream **structured events**:
        - {"type":"content", "text": "..."} for normal text deltas
        - {"type":"tool_delta", "index": i, "id": "...", "name": "...", "arguments_delta": "..."} for tool-call deltas
        - {"type":"tool_final", "tool_calls": [...]} at the end, when tool calls are complete
        """
        # Remove the problematic race condition check that blocks subsequent requests
        partial_text = ""
        acc_tool_calls: list[dict] = []  # Accumulator for tool calls

        try:
            # 1) history - only add non-empty user message if it's not already in the conversation
            # (the conversation history is now synced from LiveKit context)
            if user_message and user_message.strip():
                if not self.conversation_history or self.conversation_history[-1].get("role") != "user":
                    self.add_message("user", user_message.strip())
            elif not user_message or not user_message.strip():
                # If user_message is empty, don't add it to conversation history
                logger.debug("REST_LLM_SKIP_EMPTY_USER_MESSAGE | user_message='%s'", user_message)

            # 2) request
            url = f"{self.base_url}/chat/completions"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
                "Accept": "text/event-stream",  # Helpful with some proxies
            }
            payload = {
                "model": self.model,
                "messages": self.conversation_history,
                "stream": True,
                "temperature": 0.7,
                "max_tokens": 1000,
            }

            # 3) tools + tool_choice - Enable tools for calendar functionality
            if tools:
                payload["tools"] = self._convert_tools_to_openai_format(tools)
                # Handle tool_choice properly - convert sentinel objects to strings
                if tool_choice is not None:
                    # Convert any sentinel objects (like NotGiven) to their string representation
                    if hasattr(tool_choice, '__class__') and 'NotGiven' in str(tool_choice.__class__):
                        payload["tool_choice"] = "auto"
                    elif tool_choice == "NOT_GIVEN":
                        payload["tool_choice"] = "auto"
                    else:
                        payload["tool_choice"] = tool_choice
                else:
                    payload["tool_choice"] = "auto"

            logger.info("REST_LLM_REQUEST | model=%s | msgs=%d | tools=%s | tool_choice=%s",
                        self.model, len(self.conversation_history), bool(tools), payload.get("tool_choice"))
            
            # Debug: log conversation history structure
            logger.debug("REST_LLM_CONVERSATION_HISTORY:")
            for i, msg in enumerate(self.conversation_history):
                role = msg.get("role", "unknown")
                content = msg.get("content", "") or ""
                msg_tool_calls = msg.get("tool_calls")  # Don't shadow acc_tool_calls
                tool_call_id = msg.get("tool_call_id")
                content_preview = content[:50] + "..." if len(content) > 50 else content
                logger.debug(f"  [{i}] role={role} | content='{content_preview}' | tool_calls={bool(msg_tool_calls)} | tool_call_id={tool_call_id}")

            timeout = aiohttp.ClientTimeout(total=None, connect=10, sock_read=None)  # No total timeout for long streams
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    if not response.ok:
                        err = await response.text()
                        logger.error("REST_LLM_ERROR | status=%s | %s", response.status, err)
                        yield {"type": "error", "message": f"API error: {response.status} - {err}"}
                        return

                    # 4) Robust SSE parsing with buffering
                    buf = ""
                    async for chunk in response.content.iter_any():
                        try:
                            buf += chunk.decode("utf-8", errors="ignore")
                        except Exception:
                            continue
                        
                        # Split on SSE record separator (blank line)
                        while "\n\n" in buf:
                            block, buf = buf.split("\n\n", 1)
                            # Each block can have multiple lines; collect 'data:' ones
                            for line in block.splitlines():
                                if not line.startswith("data: "):
                                    continue
                                data_str = line[6:].strip()
                                if data_str == "[DONE]":
                                    buf = ""  # drain
                                    break
                                try:
                                    data = json.loads(data_str)
                                except json.JSONDecodeError as e:
                                    logger.warning("REST_LLM_JSON_ERROR | %s | line=%s", e, line)
                                    continue

                                choice = (data.get("choices") or [{}])[0]
                                delta = choice.get("delta") or {}

                                # 4a) text delta
                                if delta.get("content"):
                                    partial_text += delta["content"]
                                    yield {"type": "content", "text": delta["content"]}

                                # 4b) tool-call deltas (OpenAI can send partial name/args)
                                for tc_delta in (delta.get("tool_calls") or []):
                                    idx = tc_delta.get("index", 0)
                                    while idx >= len(acc_tool_calls):
                                        acc_tool_calls.append({
                                            "id": None,
                                            "type": "function",
                                            "function": {"name": None, "arguments": ""}
                                        })
                                    cur = acc_tool_calls[idx]
                                    if tc_delta.get("id"):
                                        cur["id"] = tc_delta["id"]
                                    if tc_delta.get("type"):
                                        cur["type"] = tc_delta["type"]
                                    fn = tc_delta.get("function") or {}
                                    if fn.get("name"):
                                        cur["function"]["name"] = fn["name"]
                                    if "arguments" in fn and fn["arguments"] is not None:
                                        cur["function"]["arguments"] = (cur["function"]["arguments"] or "") + fn["arguments"]

                                    # Optional: emit delta, or skip to avoid noise
                                    # yield {"type": "tool_delta", ...}

            # 5) finalize history and emit final tool calls
            if acc_tool_calls and any((tc.get("function") or {}).get("name") for tc in acc_tool_calls):
                # Emit final tool calls
                yield {"type": "tool_final", "tool_calls": acc_tool_calls}
                # Keep assistant message with tool calls and empty content
                self.add_message("assistant", "", tool_calls=acc_tool_calls)
            elif partial_text and partial_text.strip():
                # normal assistant content - only add if there's actual content
                self.add_message("assistant", partial_text)
                logger.info("REST_LLM_COMPLETE | response_length=%d", len(partial_text))

        except asyncio.TimeoutError:
            logger.error("REST_LLM_TIMEOUT | Request timed out")
            yield {"type": "error", "message": "Request timed out"}
        except aiohttp.ClientError as e:
            logger.error("REST_LLM_CLIENT_ERROR | %s", e)
            yield {"type": "error", "message": f"Client error: {str(e)}"}
        except Exception as e:
            logger.error("REST_LLM_EXCEPTION | %s", e)
            import traceback
            logger.error("REST_LLM_EXCEPTION_TRACEBACK | %s", traceback.format_exc())
            yield {"type": "error", "message": f"Unexpected error: {str(e)}"}
    
    async def generate_complete_response(self, user_message: str, tools: list = None, tool_choice: str = None) -> str:
        """Generate complete response (non-streaming)"""
        response_text = ""
        async for event in self.generate_response(user_message, tools, tool_choice):
            if event.get("type") == "content":
                response_text += event["text"]
        return response_text
    
    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []
    
    def get_history(self) -> List[Dict]:
        """Get conversation history"""
        return self.conversation_history.copy()
    
    def _convert_tools_to_openai_format(self, tools: list) -> list:
        """
        Accepts LiveKit @function_tool wrappers or already-OpenAI-shaped tools.
        Returns OpenAI Tools array with robust fallback logic to prevent tools from being dropped.
        """
        out = []
        for t in tools:
            # Already OpenAI-shaped?
            if isinstance(t, dict) and t.get("type") == "function" and isinstance(t.get("function"), dict):
                out.append(t)
                continue

            # Prefer official helper, if present
            for helper in ("to_openai_tool", "openai_schema"):
                f = getattr(t, helper, None)
                if callable(f):
                    try:
                        tool = f()
                        if tool and tool.get("type") == "function":
                            out.append(tool)
                            break
                    except Exception:
                        pass
            else:
                # Enhanced name discovery with multiple fallbacks
                name = getattr(t, "name", None)
                if not name:
                    # Try LiveKit function_tool specific attributes first
                    if hasattr(t, "func") and callable(t.func):
                        name = getattr(t.func, "__name__", None)
                    # Try function name
                    elif hasattr(t, "fn") and callable(t.fn):
                        name = getattr(t.fn, "__name__", None)
                    # Try method name if it's a bound method
                    elif hasattr(t, "__self__") and hasattr(t, "__func__"):
                        name = getattr(t.__func__, "__name__", None)
                    # Try embedded schema name
                    elif hasattr(t, "json_schema") and isinstance(t.json_schema, dict):
                        schema_name = t.json_schema.get("name")
                        if schema_name:
                            name = schema_name
                        else:
                            func_schema = t.json_schema.get("function", {})
                            if isinstance(func_schema, dict):
                                name = func_schema.get("name")
                    # Last resort: generate a name from the tool object
                    if not name:
                        name = f"tool_{id(t)}"
                        logger.warning(f"REST_LLM_TOOL_NAME_FALLBACK | generated_name={name} | tool_type={type(t)}")

                desc = getattr(t, "description", None)
                if not desc and hasattr(t, "json_schema") and isinstance(t.json_schema, dict):
                    desc = t.json_schema.get("description", "")

                # Enhanced parameter discovery with multiple fallbacks
                params = None
                for attr in ("parameters", "json_schema", "schema"):
                    val = getattr(t, attr, None)
                    if isinstance(val, dict) and val:
                        params = val
                        break
                
                # Try embedded schema parameters
                if not params and hasattr(t, "json_schema") and isinstance(t.json_schema, dict):
                    params = t.json_schema.get("parameters")
                    if not params:
                        func_schema = t.json_schema.get("function", {})
                        if isinstance(func_schema, dict):
                            params = func_schema.get("parameters")
                
                # Try LiveKit function_tool specific parameter discovery
                if not params:
                    # Try to get parameters from the function signature
                    fn = getattr(t, "__func__", None) or getattr(t, "func", None) or getattr(t, "fn", None)
                    if callable(fn):
                        import inspect
                        try:
                            sig = inspect.signature(fn)
                            properties = {}
                            required_params = []
                            
                            for param_name, param in sig.parameters.items():
                                if param_name == "ctx" or param_name == "context" or param_name == "self":  # Skip RunContext and self parameters
                                    continue
                                    
                                param_type = "string"  # Default type
                                if param.annotation != inspect.Parameter.empty:
                                    if param.annotation == bool:
                                        param_type = "boolean"
                                    elif param.annotation == int:
                                        param_type = "integer"
                                    elif param.annotation == float:
                                        param_type = "number"
                                
                                properties[param_name] = {
                                    "type": param_type,
                                    "description": f"Parameter {param_name}"
                                }
                                
                                # Add to required if no default value
                                if param.default == inspect.Parameter.empty:
                                    required_params.append(param_name)
                            
                            if properties:
                                params = {
                                    "type": "object",
                                    "properties": properties,
                                    "required": required_params
                                }
                        except Exception:
                            pass

                # Ensure we have valid parameters
                if not params:
                    params = {"type": "object", "properties": {}}

                # Never skip tools - always include them with discovered or generated name
                tool_def = {
                    "type": "function",
                    "function": {
                        "name": name,
                        "description": desc or "",
                        "parameters": params
                    }
                }
                out.append(tool_def)

        return out


def _mk_text_chunk(chunk_id: int, text: str) -> llm.ChatChunk:
    return llm.ChatChunk(
        id=f"chunk_{chunk_id}",
        delta=llm.ChoiceDelta(content=text),
        usage=None,
    )




class RestLLMProvider(llm.LLM):
    """LiveKit-compatible REST LLM provider"""
    
    def __init__(self, model: str, api_key: str, base_url: str = "https://api.openai.com/v1"):
        super().__init__()
        self.rest_service = RestLLMService(model, api_key, base_url)
        self._model = model  # Use private attribute instead of property
        self.api_key = api_key
        self.base_url = base_url
        import asyncio
        self._gen_lock = asyncio.Lock()
    
    @property
    def model(self) -> str:
        """Get the model name"""
        return self._model
    
    def _sync_conversation_history(self, chat_items):
        """Sync conversation history from LiveKit chat context, including tool responses"""
        # Clear existing history except system messages
        system_messages = [msg for msg in self.rest_service.conversation_history if msg["role"] == "system"]
        self.rest_service.conversation_history = system_messages
        
        # Process chat items and convert to our format
        for item in chat_items:
            # Skip FunctionCall objects - they don't have a role attribute
            if not hasattr(item, 'role'):
                continue
                
            role = item.role
            content = item.text_content if hasattr(item, 'text_content') else str(item.content or "")
            
            if role == "system":
                # System messages are already handled by set_system_prompt
                continue
            elif role == "user":
                # Only add non-empty user messages
                if content and content.strip():
                    self.rest_service.add_message("user", content.strip())
                else:
                    logger.debug("REST_LLM_SYNC_SKIP_EMPTY_USER | content='%s'", content)
            elif role == "assistant":
                # Check if this assistant message has tool calls
                if hasattr(item, 'tool_calls') and item.tool_calls:
                    # This is an assistant message with tool calls
                    tool_calls = []
                    for tc in item.tool_calls:
                        tool_calls.append({
                            "id": tc.id,
                            "type": tc.type,
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        })
                    
                    self.rest_service.conversation_history.append({
                        "role": "assistant",
                        "content": content,
                        "tool_calls": tool_calls,
                    })
                else:
                    # Regular assistant message
                    self.rest_service.add_message("assistant", content)
            elif role == "tool":
                # This is a tool response - add it to conversation history
                tool_call_id = getattr(item, 'tool_call_id', None)
                if tool_call_id and content:  # Only add if there's actual content
                    self.rest_service.conversation_history.append({
                        "role": "tool",
                        "content": content,
                        "tool_call_id": tool_call_id,
                    })
        
        logger.debug(f"REST_LLM_HISTORY_SYNC | synced {len(chat_items)} items to {len(self.rest_service.conversation_history)} messages")
    
    def chat(self, *, chat_ctx: llm.ChatContext, tools=None, conn_options=None, parallel_tool_calls=None, tool_choice=None, extra_kwargs=None) -> llm.LLMStream:
        """Implement LiveKit's chat interface"""
        
        # If caller didn't specify, default to "auto" when tools exist
        if tools and (tool_choice is None or tool_choice == "NOT_GIVEN" or 
                     (hasattr(tool_choice, '__class__') and 'NotGiven' in str(tool_choice.__class__))):
            tool_choice = "auto"
        
        # Log any additional parameters that might be passed
        if tools or conn_options or parallel_tool_calls or tool_choice or extra_kwargs:
            logger.debug(f"REST_LLM_CHAT_PARAMS | tools={tools} | conn_options={conn_options} | parallel_tool_calls={parallel_tool_calls} | tool_choice={tool_choice} | extra_kwargs={extra_kwargs}")
        
        # Convert LiveKit chat context to our format and sync conversation history
        if chat_ctx.items:
            # Sync conversation history from LiveKit context
            self._sync_conversation_history(chat_ctx.items)
            # Get the last user message
            last_message = chat_ctx.items[-1]
            if hasattr(last_message, 'role') and last_message.role == 'user':
                # Extract text content from the message
                user_text = last_message.text_content if hasattr(last_message, 'text_content') else str(last_message.content)
                
                # Set system prompt if available
                system_messages = [msg for msg in chat_ctx.items if hasattr(msg, 'role') and msg.role == 'system']
                if system_messages:
                    system_prompt = system_messages[-1].text_content if hasattr(system_messages[-1], 'text_content') else str(system_messages[-1].content)
                    self.rest_service.set_system_prompt(system_prompt)
                
                # Generate response with tools and proper tool choice
                async def response_generator():
                    async with self._gen_lock:
                        try:
                            chunk_id = 0
                            async for ev in self.rest_service.generate_response(user_text, tools, tool_choice):
                                chunk_id += 1
                                et = ev.get("type")

                                if et == "content":
                                    yield _mk_text_chunk(chunk_id, ev["text"])
                                elif et == "tool_final":
                                    # Handle final tool calls
                                    tool_calls = ev.get("tool_calls", []) or []
                                    if tool_calls:
                                        lk_calls = []
                                        for i, tc in enumerate(tool_calls):
                                            fn = (tc.get("function") or {})
                                            name = fn.get("name") or ""
                                            args = fn.get("arguments") or ""
                                            call_id = tc.get("id") or f"call_{i}"

                                            # LiveKit expects FunctionToolCall
                                            lk_calls.append(
                                                llm.FunctionToolCall(
                                                    name=name,
                                                    arguments=args,
                                                    call_id=call_id,
                                                )
                                            )

                                        if lk_calls:
                                            yield llm.ChatChunk(
                                                id=f"tool_final_{chunk_id}",
                                                delta=llm.ChoiceDelta(
                                                    role="assistant",
                                                    content="",
                                                    tool_calls=lk_calls
                                                ),
                                                usage=None,
                                            )

                        except Exception as e:
                            logger.error(f"REST_LLM_STREAM_ERROR: {e}")
                            # Yield proper error chunk
                            yield llm.ChatChunk(
                                id="error", 
                                delta=llm.ChoiceDelta(content=f"Error: {str(e)}"), 
                                usage=None
                            )
                
                # Create a new generator function for each request
                def create_generator():
                    return response_generator()
                
                # Create a proper LLMStream with the required parameters
                return RestLLMStream(
                    llm=self,
                    chat_ctx=chat_ctx,
                    tools=tools or [],
                    conn_options=conn_options or APIConnectOptions(),
                    generator_factory=create_generator
                )
        
        # Fallback empty stream
        async def empty_generator():
            yield llm.ChatChunk(id="empty", delta=None, usage=None)
        
        def create_empty_generator():
            return empty_generator()
        
        return RestLLMStream(
            llm=self,
            chat_ctx=chat_ctx,
            tools=tools or [],
            conn_options=conn_options or APIConnectOptions(),
            generator_factory=create_empty_generator
        )


class RestLLMStream(llm.LLMStream):
    """Custom LLMStream implementation for REST API"""
    
    def __init__(self, llm, *, chat_ctx, tools, conn_options, generator_factory):
        super().__init__(llm, chat_ctx=chat_ctx, tools=tools, conn_options=conn_options)
        self._generator_factory = generator_factory
        self._event_aiter = None
        self._task = None
        self._metrics_task = None
        self._llm_request_span = None
        self._current_attempt_has_error = False
        self._is_running = False
    
    async def _run(self):
        """Implement the abstract _run method"""
        # Since each request gets its own stream instance, we don't need to check _is_running
        try:
            self._is_running = True
            # Create a new generator instance for each run
            self._event_aiter = self._generator_factory()
            return self._event_aiter
        except Exception as e:
            logger.error(f"REST_LLM_STREAM_RUN_ERROR: {e}")
            self.reset()
            raise
    
    async def _metrics_monitor_task(self, event_aiter):
        """Monitor metrics for the stream"""
        # Simplified metrics monitoring - just log completion
        try:
            async for ev in event_aiter:
                pass  # Just consume the events
        except Exception as e:
            logger.error(f"REST_LLM_METRICS_ERROR: {e}")
    
    async def __anext__(self):
        """Get next chunk from the stream"""
        if self._event_aiter is None:
            await self._run()
        
        try:
            return await self._event_aiter.__anext__()
        except StopAsyncIteration:
            # Reset the stream state when iteration completes
            self.reset()
            raise StopAsyncIteration from None
    
    def __aiter__(self):
        """Make this stream async iterable"""
        return self
    
    async def __aenter__(self):
        """Async context manager entry"""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.aclose()
    
    def reset(self):
        """Reset the stream state"""
        self._is_running = False
        self._event_aiter = None
        self._current_attempt_has_error = False
    
    async def aclose(self):
        """Close the stream with proper resource cleanup"""
        try:
            # Cancel any running tasks first
            if self._task and not self._task.done():
                self._task.cancel()
                try:
                    await self._task
                except asyncio.CancelledError:
                    pass
            
            if self._metrics_task and not self._metrics_task.done():
                self._metrics_task.cancel()
                try:
                    await self._metrics_task
                except asyncio.CancelledError:
                    pass
            
            # Reset state
            self.reset()
            
        except Exception as e:
            logger.error(f"REST_LLM_STREAM_CLOSE_ERROR: {e}")
        finally:
            # Ensure state is always reset
            self.reset()


def create_rest_llm(model: str, api_key: str, base_url: str = "https://api.openai.com/v1") -> RestLLMProvider:
    """Factory function to create REST LLM provider"""
    return RestLLMProvider(model, api_key, base_url)
