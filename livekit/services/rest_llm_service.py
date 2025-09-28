"""
REST LLM Service for handling OpenAI API calls via REST instead of WebSocket
This provides better compatibility with certain models and more control over the conversation flow
"""

import asyncio
import json
import logging
import os
from typing import Dict, List, Optional, AsyncGenerator
import aiohttp
from livekit.agents import llm

logger = logging.getLogger(__name__)

class RestLLMService:
    """REST-based LLM service that mimics LiveKit's LLM interface"""
    
    def __init__(self, model: str, api_key: str, base_url: str = "https://api.openai.com/v1"):
        self.model = model
        self.api_key = api_key
        self.base_url = base_url
        self.is_generating = False
        self.conversation_history: List[Dict] = []
        
    def add_message(self, role: str, content: str):
        """Add a message to conversation history"""
        self.conversation_history.append({
            "role": role,
            "content": content
        })
    
    def set_system_prompt(self, prompt: str):
        """Set or update the system prompt"""
        # Remove existing system messages
        self.conversation_history = [msg for msg in self.conversation_history if msg["role"] != "system"]
        # Add new system message at the beginning
        self.conversation_history.insert(0, {
            "role": "system",
            "content": prompt
        })
    
    async def generate_response(self, user_message: str) -> AsyncGenerator[str, None]:
        """Generate response using REST API with streaming"""
        if self.is_generating:
            logger.warning("Already generating response, cancelling previous")
            self.is_generating = False
            await asyncio.sleep(0.1)  # Brief pause to ensure cleanup
        
        self.is_generating = True
        
        try:
            # Add user message to history
            self.add_message("user", user_message)
            
            # Prepare API request
            url = f"{self.base_url}/chat/completions"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            
            payload = {
                "model": self.model,
                "messages": self.conversation_history,
                "stream": True,
                "temperature": 0.7,
                "max_tokens": 1000
            }
            
            logger.info(f"REST_LLM_REQUEST | model={self.model} | messages_count={len(self.conversation_history)}")
            
            # Add timeout configuration
            timeout = aiohttp.ClientTimeout(total=30, connect=10)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    if not response.ok:
                        error_text = await response.text()
                        logger.error(f"REST_LLM_ERROR | status={response.status} | error={error_text}")
                        self.is_generating = False
                        return
                    
                    # Stream the response
                    partial_response = ""
                    async for line in response.content:
                        if not self.is_generating:
                            break
                            
                        line_str = line.decode('utf-8').strip()
                        
                        if line_str.startswith('data: '):
                            data_str = line_str[6:]  # Remove 'data: ' prefix
                            
                            if data_str == '[DONE]':
                                break
                            
                            try:
                                data = json.loads(data_str)
                                delta = data.get('choices', [{}])[0].get('delta', {}).get('content', '')
                                
                                if delta:
                                    partial_response += delta
                                    yield delta
                                    
                            except json.JSONDecodeError as e:
                                logger.warning(f"REST_LLM_JSON_ERROR | line={line_str} | error={e}")
                                continue
            
            # Add assistant response to history
            if partial_response:
                self.add_message("assistant", partial_response)
                logger.info(f"REST_LLM_COMPLETE | response_length={len(partial_response)}")
            
        except asyncio.TimeoutError:
            logger.error("REST_LLM_TIMEOUT | Request timed out")
        except aiohttp.ClientError as e:
            logger.error(f"REST_LLM_CLIENT_ERROR | error={e}")
        except Exception as e:
            logger.error(f"REST_LLM_EXCEPTION | error={e}")
        finally:
            self.is_generating = False
    
    async def generate_complete_response(self, user_message: str) -> str:
        """Generate complete response (non-streaming)"""
        response_text = ""
        async for chunk in self.generate_response(user_message):
            response_text += chunk
        return response_text
    
    def cancel_generation(self):
        """Cancel ongoing generation"""
        self.is_generating = False
    
    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []
    
    def get_history(self) -> List[Dict]:
        """Get conversation history"""
        return self.conversation_history.copy()


class RestLLMProvider(llm.LLM):
    """LiveKit-compatible REST LLM provider"""
    
    def __init__(self, model: str, api_key: str, base_url: str = "https://api.openai.com/v1"):
        super().__init__()
        self.rest_service = RestLLMService(model, api_key, base_url)
        self._model = model  # Use private attribute instead of property
        self.api_key = api_key
        self.base_url = base_url
    
    @property
    def model(self) -> str:
        """Get the model name"""
        return self._model
    
    def chat(self, *, chat_ctx: llm.ChatContext, tools=None, conn_options=None, parallel_tool_calls=None, tool_choice=None, extra_kwargs=None) -> llm.LLMStream:
        """Implement LiveKit's chat interface"""
        
        # Log any additional parameters that might be passed
        if tools or conn_options or parallel_tool_calls or tool_choice or extra_kwargs:
            logger.debug(f"REST_LLM_CHAT_PARAMS | tools={tools} | conn_options={conn_options} | parallel_tool_calls={parallel_tool_calls} | tool_choice={tool_choice} | extra_kwargs={extra_kwargs}")
        
        # Convert LiveKit chat context to our format
        if chat_ctx.items:
            # Get the last user message
            last_message = chat_ctx.items[-1]
            if last_message.role == 'user':
                # Extract text content from the message
                user_text = last_message.text_content if hasattr(last_message, 'text_content') else str(last_message.content)
                
                # Set system prompt if available
                system_messages = [msg for msg in chat_ctx.items if msg.role == 'system']
                if system_messages:
                    system_prompt = system_messages[-1].text_content if hasattr(system_messages[-1], 'text_content') else str(system_messages[-1].content)
                    self.rest_service.set_system_prompt(system_prompt)
                
                # Generate response
                async def response_generator():
                    try:
                        chunk_id = 0
                        async for chunk in self.rest_service.generate_response(user_text):
                            chunk_id += 1
                            yield llm.ChatChunk(
                                id=f"chunk_{chunk_id}",
                                delta=llm.ChoiceDelta(content=chunk),
                                usage=None
                            )
                    except Exception as e:
                        logger.error(f"REST_LLM_STREAM_ERROR: {e}")
                        # Yield empty chunk on error
                        yield llm.ChatChunk(id="error", delta=None, usage=None)
                
                # Create a new generator function for each request
                def create_generator():
                    return response_generator()
                
                # Create a proper LLMStream with the required parameters
                return RestLLMStream(
                    llm=self,
                    chat_ctx=chat_ctx,
                    tools=tools or [],
                    conn_options=conn_options or llm.APIConnectOptions(),
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
            conn_options=conn_options or llm.APIConnectOptions(),
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
        if self._is_running:
            logger.warning("REST_LLM_STREAM already running, skipping")
            return self._event_aiter
            
        try:
            self._is_running = True
            # Create a new generator instance for each run
            self._event_aiter = self._generator_factory()
            return self._event_aiter
        except Exception as e:
            logger.error(f"REST_LLM_STREAM_RUN_ERROR: {e}")
            self._is_running = False
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
            self._is_running = False
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
    
    async def aclose(self):
        """Close the stream"""
        self._is_running = False
        if self._task:
            await asyncio.cancel_and_wait(self._task)
        if self._metrics_task:
            await self._metrics_task


def create_rest_llm(model: str, api_key: str, base_url: str = "https://api.openai.com/v1") -> RestLLMProvider:
    """Factory function to create REST LLM provider"""
    return RestLLMProvider(model, api_key, base_url)
