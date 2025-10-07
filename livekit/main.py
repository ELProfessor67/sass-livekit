"""
Clean LiveKit Agents implementation following framework best practices.
This replaces the complex main.py with a simplified, maintainable approach.
"""

from __future__ import annotations

import logging
import os
import sys
import json
import asyncio
import datetime
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Load environment variables from the livekit/.env file
load_dotenv("livekit/.env")

# LiveKit imports
from livekit import agents, api
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    RunContext,
    function_tool,
    WorkerOptions,
    cli,
    metrics,
    MetricsCollectedEvent,
    RoomInputOptions,
    RoomOutputOptions,
    AutoSubscribe,
    UserStateChangedEvent,
)

# Plugin imports
from livekit.plugins import openai, silero, deepgram
from livekit.agents.tts import FallbackAdapter

# Additional provider imports
try:
    from livekit.plugins import groq as lk_groq
    GROQ_AVAILABLE = True
except ImportError:
    lk_groq = None
    GROQ_AVAILABLE = False

try:
    import livekit.plugins.elevenlabs as lk_elevenlabs
    ELEVENLABS_AVAILABLE = True
except ImportError:
    lk_elevenlabs = None
    ELEVENLABS_AVAILABLE = False

try:
    import openai as cerebras_client
    CEREBRAS_AVAILABLE = True
except ImportError:
    CEREBRAS_AVAILABLE = False

# Local imports
from services.booking_agent import BookingAgent
from services.rag_agent import RAGAgent
from integrations.supabase_client import SupabaseClient
from integrations.calendar_api import CalComCalendar, CalendarResult, CalendarError
from utils.logging_hardening import configure_safe_logging

# Configure logging with security hardening
configure_safe_logging(level=logging.INFO)
logger = logging.getLogger(__name__)


class PersistentFailureTTS:
    """TTS wrapper that permanently switches to fallback after first failure."""
    
    def __init__(self, primary_tts, fallback_tts, failure_key="ELEVENLABS_FAILURE_COUNT"):
        self.primary_tts = primary_tts
        self.fallback_tts = fallback_tts
        self.failure_key = failure_key
        self.has_failed = False
        self.logger = logging.getLogger(__name__)
        
        # Check if we've already failed before
        failure_count = int(os.getenv(failure_key, "0"))
        if failure_count > 0:
            self.has_failed = True
            self.logger.info(f"PERSISTENT_FAILURE_TTS | {failure_key}={failure_count} | using fallback permanently")
    
    def _mark_failure(self):
        """Mark this TTS as failed and update environment."""
        if not self.has_failed:
            self.has_failed = True
            failure_count = int(os.getenv(self.failure_key, "0")) + 1
            os.environ[self.failure_key] = str(failure_count)
            self.logger.warning(f"TTS_FAILURE_MARKED | {self.failure_key}={failure_count} | switching to fallback permanently")
    
    async def synthesize(self, text: str, **kwargs):
        """Synthesize text with automatic fallback on failure."""
        if self.has_failed:
            self.logger.info("PERSISTENT_FAILURE_TTS | using fallback due to previous failure")
            return await self.fallback_tts.synthesize(text, **kwargs)
        
        try:
            return await self.primary_tts.synthesize(text, **kwargs)
        except Exception as e:
            self.logger.error(f"TTS_PRIMARY_FAILED | error={str(e)} | switching to fallback")
            self._mark_failure()
            return await self.fallback_tts.synthesize(text, **kwargs)
    
    def __getattr__(self, name):
        """Delegate all other attributes to the current active TTS."""
        if self.has_failed:
            return getattr(self.fallback_tts, name)
        else:
            return getattr(self.primary_tts, name)


class CallHandler:
    """Simplified call handler following LiveKit patterns."""

    def __init__(self):
        self.supabase = SupabaseClient()

    async def handle_call(self, ctx: JobContext) -> None:
        """Handle incoming call with proper LiveKit patterns."""
        try:
            await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
            logger.info(f"CONNECTED | room={ctx.room.name}")

            # Log job metadata for debugging
            logger.info(f"JOB_METADATA | metadata={ctx.job.metadata}")

            # Determine call type and extract metadata
            call_type = self._determine_call_type(ctx)
            assistant_config = await self._resolve_assistant_config(ctx, call_type)

            if not assistant_config:
                logger.error(f"NO_ASSISTANT_CONFIG | room={ctx.room.name}")
                return

            # Handle outbound calls
            if call_type == "outbound":
                await self._handle_outbound_call(ctx, assistant_config)

            # Wait for participant
            participant = await asyncio.wait_for(
                ctx.wait_for_participant(),
                timeout=35.0
            )
            logger.info(f"PARTICIPANT_CONNECTED | phone={self._extract_phone_from_room(ctx.room.name)}")

            # Create appropriate agent
            agent = await self._create_agent(assistant_config)

            # Create session with proper configuration
            session = self._create_session(assistant_config)

            # Start the session
            await session.start(
                agent=agent,
                room=ctx.room,
                room_input_options=RoomInputOptions(close_on_disconnect=True),
                room_output_options=RoomOutputOptions(transcription_enabled=True)
            )

            logger.info(f"SESSION_STARTED | room={ctx.room.name}")
            
            # Setup idle message handling using LiveKit's user state management
            idle_message_task = None
            idle_message_count = 0
            
            if assistant_config.get("idle_messages") and len(assistant_config.get("idle_messages", [])) > 0:
                logger.info(f"IDLE_MESSAGE_HANDLING_SETUP | room={ctx.room.name}")
                
                async def handle_user_away():
                    nonlocal idle_message_count
                    max_idle_messages = assistant_config.get("max_idle_messages", 3)
                    
                    # Try to ping the user with idle messages
                    for i in range(max_idle_messages):
                        if idle_message_count >= max_idle_messages:
                            break
                            
                        import random
                        idle_message = random.choice(assistant_config.get("idle_messages", []))
                        logger.info(f"IDLE_MESSAGE_TRIGGERED | message='{idle_message}' | count={idle_message_count + 1}")
                        
                        await session.generate_reply(
                            instructions=f"Say exactly this: '{idle_message}'"
                        )
                        idle_message_count += 1
                        
                        # Wait 10 seconds between idle messages
                        await asyncio.sleep(10)
                    
                    # If we've reached max idle messages, end the call
                    if idle_message_count >= max_idle_messages:
                        logger.info(f"MAX_IDLE_MESSAGES_REACHED | ending call after {max_idle_messages} idle messages")
                        end_call_message = assistant_config.get("end_call_message", "Thank you for calling. Goodbye!")
                        await session.generate_reply(
                            instructions=f"Say exactly this: '{end_call_message}'"
                        )
                        session.shutdown()
                
                @session.on("user_state_changed")
                def _user_state_changed(ev: UserStateChangedEvent):
                    nonlocal idle_message_task
                    if ev.new_state == "away":
                        logger.info(f"USER_STATE_AWAY | starting idle message sequence")
                        idle_message_task = asyncio.create_task(handle_user_away())
                        return
                    
                    # User is back (listening, speaking, etc.)
                    if idle_message_task is not None:
                        logger.info(f"USER_STATE_ACTIVE | cancelling idle message task")
                        idle_message_task.cancel()
                        idle_message_task = None

            # Capture start time for call duration calculation
            start_time = datetime.datetime.now()
            
            # Get call management settings for monitoring
            max_call_duration_minutes = assistant_config.get("max_call_duration", 30)
            max_call_duration_seconds = max_call_duration_minutes * 60
            
            # Create shutdown callback for post-call analysis and history saving
            # This ensures all conversation data is captured before analysis
            async def save_call_on_shutdown():
                end_time = datetime.datetime.now()
                call_duration = (end_time - start_time).total_seconds()
                logger.info(f"CALL_END | room={ctx.room.name} | duration={call_duration:.1f}s | max_duration={max_call_duration_seconds}s")

                session_history = []
                try:
                    # Try to get transcript from the authoritative source
                    if hasattr(session, 'transcript') and session.transcript:
                        transcript_dict = session.transcript.to_dict()
                        session_history = transcript_dict.get("items", [])
                        logger.info(f"TRANSCRIPT_FROM_SESSION | items={len(session_history)}")
                    elif hasattr(session, 'history') and session.history:
                        history_dict = session.history.to_dict()
                        session_history = history_dict.get("items", [])
                        logger.info(f"HISTORY_FROM_SESSION | items={len(session_history)}")
                    else:
                        logger.warning("NO_SESSION_TRANSCRIPT_AVAILABLE")
                except Exception as e:
                    logger.error(f"SESSION_HISTORY_READ_FAILED | error={str(e)}")
                    session_history = []

                # Perform post-call analysis and save to database
                try:
                    analysis_results = await self._perform_post_call_analysis(assistant_config, session_history, agent)
                    logger.info(f"POST_CALL_ANALYSIS_RESULTS | summary={bool(analysis_results.get('call_summary'))} | success={analysis_results.get('call_success')} | data_fields={len(analysis_results.get('structured_data', {}))}")
                    
                    # Save call history and analysis data to database
                    await self._save_call_history_to_database(
                        ctx=ctx,
                        assistant_config=assistant_config,
                        session_history=session_history,
                        analysis_results=analysis_results,
                        participant=participant,
                        start_time=start_time,
                        end_time=end_time
                    )
                    
                except Exception as e:
                    logger.error(f"POST_CALL_ANALYSIS_FAILED | error={str(e)}")

            # Register shutdown callback to ensure proper cleanup and analysis
            ctx.add_shutdown_callback(save_call_on_shutdown)
            
            # Cancel idle message task on shutdown
            if idle_message_task:
                ctx.add_shutdown_callback(lambda: idle_message_task.cancel() if idle_message_task else None)

            # Wait for participant to disconnect with call duration timeout
            try:
                # Wait for the session to complete with call duration timeout
                # This will automatically end the call if it exceeds the maximum duration
                await asyncio.wait_for(
                    self._wait_for_session_completion(session, ctx),
                    timeout=max_call_duration_seconds
                )
                logger.info(f"PARTICIPANT_DISCONNECTED | room={ctx.room.name}")
            except asyncio.TimeoutError:
                logger.warning(f"CALL_DURATION_EXCEEDED | room={ctx.room.name} | duration={max_call_duration_seconds}s")
                # End the call by deleting the room
                try:
                    await ctx.api.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))
                    logger.info(f"CALL_FORCE_ENDED | room={ctx.room.name} | reason=duration_exceeded")
                except Exception as e:
                    logger.error(f"FAILED_TO_END_CALL | room={ctx.room.name} | error={str(e)}")
            except Exception as e:
                logger.warning(f"DISCONNECT_WAIT_FAILED | room={ctx.room.name} | error={str(e)}")
                # Continue - shutdown callback will handle cleanup

            logger.info(f"SESSION_COMPLETE | room={ctx.room.name}")

        except Exception as e:
            logger.error(f"CALL_ERROR | room={ctx.room.name} | error={str(e)}", exc_info=True)
            raise

    def _determine_call_type(self, ctx: JobContext) -> str:
        """Determine if this is inbound or outbound call."""
        try:
            metadata = ctx.job.metadata
            if metadata:
                dial_info = json.loads(metadata)
                # If we have both phone_number and agentId, it's outbound
                if dial_info.get("phone_number") and dial_info.get("agentId"):
                    return "outbound"
                # If we have assistantId in metadata, it's likely an inbound call with pre-configured assistant
                if dial_info.get("assistantId") or dial_info.get("assistant_id"):
                    return "inbound_with_assistant"
        except Exception:
            pass
        return "inbound"

    async def _handle_outbound_call(self, ctx: JobContext, assistant_config: Dict[str, Any]) -> None:
        """Handle outbound call setup."""
        try:
            metadata = json.loads(ctx.job.metadata)
            phone_number = metadata.get("phone_number")
            sip_trunk_id = metadata.get("outbound_trunk_id") or os.getenv("SIP_TRUNK_ID")

            if not sip_trunk_id:
                logger.error("SIP_TRUNK_ID not configured")
                await ctx.api.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))
                return

            logger.info(f"OUTBOUND_CALL_START | phone={phone_number} | trunk={sip_trunk_id}")

            sip_request = api.CreateSIPParticipantRequest(
                room_name=ctx.room.name,
                sip_trunk_id=sip_trunk_id,
                sip_call_to=phone_number,
                participant_identity=phone_number,
                wait_until_answered=True,
            )

            result = await ctx.api.sip.create_sip_participant(sip_request)
            logger.info(f"OUTBOUND_CALL_CONNECTED | result={result}")

        except Exception as e:
            logger.error(f"OUTBOUND_CALL_ERROR | error={str(e)}")
            try:
                await ctx.api.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))
            except Exception:
                pass
            raise

    async def _resolve_assistant_config(self, ctx: JobContext, call_type: str) -> Optional[Dict[str, Any]]:
        """Resolve assistant configuration for the call."""
        try:
            metadata = ctx.job.metadata
            if not metadata:
                logger.warning("No job metadata available")
                return None
                
            dial_info = json.loads(metadata)
            
            if call_type == "outbound":
                # For outbound calls, get assistant_id from job metadata
                assistant_id = dial_info.get("agentId") or dial_info.get("assistant_id")
                if assistant_id:
                    logger.info(f"OUTBOUND_ASSISTANT | assistant_id={assistant_id}")
                    return await self._get_assistant_by_id(assistant_id)
                else:
                    logger.error("OUTBOUND_NO_ASSISTANT_ID | metadata={metadata}")
                    return None

            elif call_type == "inbound_with_assistant":
                # For inbound calls with pre-configured assistant, use assistantId from metadata
                assistant_id = dial_info.get("assistantId") or dial_info.get("assistant_id")
                if assistant_id:
                    logger.info(f"INBOUND_WITH_ASSISTANT | assistant_id={assistant_id}")
                    return await self._get_assistant_by_id(assistant_id)
                else:
                    logger.error("INBOUND_NO_ASSISTANT_ID | metadata={metadata}")
                    return None

            # For regular inbound calls, get the called number (DID) to look up assistant
            called_did = dial_info.get("called_number") or dial_info.get("to_number") or dial_info.get("phoneNumber")
            logger.info(f"INBOUND_METADATA_CHECK | metadata={metadata} | called_did={called_did}")

            # Fallback to room name extraction if not found in metadata
            if not called_did:
                called_did = self._extract_did_from_room(ctx.room.name)
                logger.info(f"INBOUND_ROOM_NAME_FALLBACK | room={ctx.room.name} | called_did={called_did}")

            if called_did:
                logger.info(f"INBOUND_LOOKUP | looking up assistant for DID={called_did}")
                return await self._get_assistant_by_phone(called_did)

            logger.error("INBOUND_NO_DID | could not determine called number")
            return None

        except Exception as e:
            logger.error(f"ASSISTANT_RESOLUTION_ERROR | error={str(e)}")
            return None

    def _extract_did_from_room(self, room_name: str) -> Optional[str]:
        """Extract DID from room name."""
        try:
            # Handle patterns like "did-1234567890"
            if room_name.startswith("did-"):
                return room_name[4:]

            # For assistant rooms, we need to get the called number from job metadata
            # The room name format like "assistant-_+12017656193_jDHeRsycXttN" contains caller's number
            # We need to get the called number from the SIP webhook metadata
            if room_name.startswith("assistant-"):
                # Try to extract from room name first (fallback)
                parts = room_name.split("_")
                if len(parts) >= 2:
                    phone_part = parts[1]  # This might be caller's number, not called number
                    return phone_part

            # Handle other patterns
            if "-" in room_name:
                parts = room_name.split("-")
                if len(parts) >= 2:
                    return parts[-1]

            return None
        except Exception:
            return None

    async def _get_assistant_by_id(self, assistant_id: str) -> Optional[Dict[str, Any]]:
        """Get assistant configuration by assistant ID."""
        try:
            assistant_result = self.supabase.client.table("assistant").select("*").eq("id", assistant_id).execute()
            
            if assistant_result.data and len(assistant_result.data) > 0:
                assistant_data = assistant_result.data[0]
                logger.info(f"ASSISTANT_FOUND_BY_ID | assistant_id={assistant_id}")
                logger.info(f"ASSISTANT_CONFIG_DEBUG | knowledge_base_id={assistant_data.get('knowledge_base_id')} | use_rag={assistant_data.get('use_rag')}")
                return assistant_data
            
            logger.warning(f"No assistant found for ID: {assistant_id}")
            return None
        except Exception as e:
            logger.error(f"DATABASE_ERROR | assistant_id={assistant_id} | error={str(e)}")
            return None

    async def _get_assistant_by_phone(self, phone_number: str) -> Optional[Dict[str, Any]]:
        """Get assistant configuration by phone number."""
        try:
            # First, find the assistant_id for this phone number
            phone_result = self.supabase.client.table("phone_number").select("inbound_assistant_id").eq("number", phone_number).execute()
            
            if not phone_result.data or len(phone_result.data) == 0:
                logger.warning(f"No assistant found for phone number: {phone_number}")
                return None
            
            assistant_id = phone_result.data[0]["inbound_assistant_id"]
            
            # Now fetch the assistant configuration
            assistant_result = self.supabase.client.table("assistant").select("*").eq("id", assistant_id).execute()
            
            if assistant_result.data and len(assistant_result.data) > 0:
                return assistant_result.data[0]

            return None
        except Exception as e:
            logger.error(f"DATABASE_ERROR | phone={phone_number} | error={str(e)}")
            return None

    async def _create_agent(self, config: Dict[str, Any]) -> Agent:
        """Create appropriate agent based on configuration."""
        instructions = config.get("prompt", "You are a helpful assistant.")

        # Add date context to prevent past date tool calls
        from zoneinfo import ZoneInfo
        tz_name = (config.get("cal_timezone") or "Asia/Karachi")
        now_local = datetime.datetime.now(ZoneInfo(tz_name))
        instructions += (
            f"\n\nCONTEXT:\n"
            f"- Current local time: {now_local.isoformat()}\n"
            f"- Timezone: {tz_name}\n"
            f"- When the user says a date like '7th October', always interpret it as the next FUTURE occurrence in {tz_name}. "
            f"Never call tools with past dates; if a parsed date is in the past year, bump it to the next year."
        )

        # Add call management settings to instructions
        call_management_config = self._build_call_management_instructions(config)
        if call_management_config:
            instructions += "\n\n" + call_management_config

        # Add analysis instructions for structured data collection
        analysis_instructions = await self._build_analysis_instructions(config)
        if analysis_instructions:
            instructions += "\n\n" + analysis_instructions
            logger.info(f"ANALYSIS_INSTRUCTIONS_ADDED | length={len(analysis_instructions)}")

        # Add first message handling (like old implementation)
        first_message = config.get("first_message", "")
        force_first = os.getenv("FORCE_FIRST_MESSAGE", "true").lower() != "false"
        if force_first and first_message:
            instructions += f' IMPORTANT: Start the conversation by saying exactly: "{first_message}" Do not repeat or modify this greeting.'
            logger.info(f"FIRST_MESSAGE_SET | first_message={first_message}")

        # Log final instructions for debugging
        logger.info(f"FINAL_INSTRUCTIONS_LENGTH | length={len(instructions)}")
        logger.info(f"FINAL_INSTRUCTIONS_PREVIEW | preview={instructions[:500]}...")

        # Check if RAG is enabled (match old implementation - only require knowledge_base_id)
        knowledge_base_id = config.get("knowledge_base_id")
        logger.info(f"RAG_CONFIG_CHECK | knowledge_base_id={knowledge_base_id}")
        
        if knowledge_base_id:
            logger.info(f"RAG_ENABLED | Creating RAGAgent with knowledge_base_id={knowledge_base_id}")
            # Add RAG tools to instructions (like agents-main examples)
            instructions += "\n\nKNOWLEDGE BASE ACCESS:\nYou have access to a knowledge base with information about the company. When users ask questions about:\n- Company history, background, or founding information\n- Products, services, or menu items\n- Business details, locations, or operations\n- Any factual information about the company\n\nIMPORTANT: Always use the query_knowledge_base tool FIRST when users ask about company facts, history, or company information. Do not answer factual questions about the company without searching the knowledge base first.\n\nExample: If user asks 'Tell me about company history', immediately call query_knowledge_base with the query 'company history' before responding."
            logger.info("RAG_TOOLS | Knowledge base tools added to instructions")
            agent = RAGAgent(
                instructions=instructions,
                knowledge_base_id=knowledge_base_id,
                company_id=config.get("company_id"),
                supabase=self.supabase
            )
        else:
            # Create regular booking agent
            calendar = None
            if config.get("cal_api_key") and config.get("cal_event_type_id"):
                # Validate and convert event_type_id to proper format
                event_type_id = config.get("cal_event_type_id")
                try:
                    # Convert to string first, then validate it's a valid number
                    if isinstance(event_type_id, str):
                        # Remove any non-numeric characters except for the event type format
                        cleaned_id = event_type_id.strip()
                        # Handle Cal.com event type format like "cal_1759650430507_boxv695kh"
                        if cleaned_id.startswith("cal_"):
                            # Extract the numeric part
                            parts = cleaned_id.split("_")
                            if len(parts) >= 2:
                                numeric_part = parts[1]
                                if numeric_part.isdigit():
                                    event_type_id = int(numeric_part)
                                else:
                                    logger.error(f"INVALID_EVENT_TYPE_ID | cannot extract number from {cleaned_id}")
                                    event_type_id = None
                            else:
                                logger.error(f"INVALID_EVENT_TYPE_ID | malformed cal.com ID {cleaned_id}")
                                event_type_id = None
                        elif cleaned_id.isdigit():
                            event_type_id = int(cleaned_id)
                        else:
                            logger.error(f"INVALID_EVENT_TYPE_ID | not a valid number {cleaned_id}")
                            event_type_id = None
                    elif isinstance(event_type_id, (int, float)):
                        event_type_id = int(event_type_id)
                    else:
                        logger.error(f"INVALID_EVENT_TYPE_ID | unexpected type {type(event_type_id)}: {event_type_id}")
                        event_type_id = None
                except (ValueError, TypeError) as e:
                    logger.error(f"EVENT_TYPE_ID_CONVERSION_ERROR | error={str(e)} | value={event_type_id}")
                    event_type_id = None
                
                if event_type_id:
                    # Get timezone from config, default to Asia/Karachi for Pakistan
                    cal_timezone = config.get("cal_timezone") or "Asia/Karachi"
                    logger.info(f"CALENDAR_CONFIG | api_key={'*' * 10} | event_type_id={event_type_id} | timezone={cal_timezone}")
                    calendar = CalComCalendar(
                        api_key=config.get("cal_api_key"),
                        event_type_id=event_type_id,
                        timezone=cal_timezone
                    )
                    # Initialize the calendar
                    try:
                        await calendar.initialize()
                        logger.info("CALENDAR_INITIALIZED | calendar setup successful")
                    except Exception as e:
                        logger.error(f"CALENDAR_INIT_FAILED | error={str(e)}")
                        calendar = None
                else:
                    logger.error("CALENDAR_CONFIG_FAILED | invalid event_type_id")
            else:
                logger.warning("CALENDAR_NOT_CONFIGURED | missing cal_api_key or cal_event_type_id")

            logger.info(f"RAG_DISABLED | Creating BookingAgent instead of RAGAgent")
            agent = BookingAgent(
                instructions=instructions,
                calendar=calendar
            )
            
            # Debug logging for calendar validation
            logging.info("AGENT_CREATED | has_calendar=%s | calendar_type=%s", 
                        agent.calendar is not None, 
                        type(agent.calendar).__name__ if agent.calendar else None)
            if agent.calendar:
                logging.info("CALENDAR_DETAILS | api_key_present=%s | event_type_id=%s | timezone=%s",
                            bool(getattr(agent.calendar, '_api_key', None)),
                            getattr(agent.calendar, 'event_type_id', None),
                            getattr(agent.calendar, 'tz', None))

        # Set analysis fields if configured
        analysis_fields = config.get("structured_data_fields", [])
        logger.info(f"ANALYSIS_FIELDS_DEBUG | raw_config={config.get('structured_data_fields')} | processed_fields={analysis_fields}")
        if analysis_fields:
            agent.set_analysis_fields(analysis_fields)
            logger.info(f"ANALYSIS_FIELDS_SET | count={len(analysis_fields)} | fields={[f.get('name', 'unnamed') for f in analysis_fields]}")
        else:
            logger.warning("NO_ANALYSIS_FIELDS_CONFIGURED | assistant has no structured_data_fields")

        return agent

    async def _classify_data_fields_with_llm(self, structured_data: list) -> Dict[str, list]:
        """Use LLM to classify which fields should be asked vs extracted."""
        try:
            import openai
            openai_api_key = os.getenv("OPENAI_API_KEY")
            if not openai_api_key:
                logger.warning("OPENAI_API_KEY not configured for field classification")
                return {"ask_user": [], "extract_from_conversation": []}

            client = openai.AsyncOpenAI(api_key=openai_api_key)
            
            # Prepare field descriptions
            fields_json = json.dumps([
                {
                    "name": field.get("name", ""),
                    "description": field.get("description", ""),
                    "type": field.get("type", "string")
                }
                for field in structured_data
            ], indent=2)
            
            classification_prompt = f"""You are analyzing data fields for a voice conversation system. For each field, decide whether it should be:
1. "ask_user" - Information that should be directly asked from the user during the conversation
2. "extract_from_conversation" - Information that should be extracted/inferred from the conversation after it ends

Fields to classify:
{fields_json}

Guidelines:
- Ask user for: contact details, preferences, specific choices, personal information, scheduling details
- Extract from conversation: summaries, outcomes, sentiment, quality metrics, call analysis, key points discussed

Return a JSON object with two arrays. You must respond with valid JSON format only:
{{
  "ask_user": ["field_name1", "field_name2"],
  "extract_from_conversation": ["field_name3", "field_name4"]
}}"""

            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that classifies data fields for voice conversations."},
                        {"role": "user", "content": classification_prompt}
                    ],
                    max_tokens=500,
                    temperature=0.1,
                    response_format={"type": "json_object"}
                ),
                timeout=10
            )

            classification = json.loads(response.choices[0].message.content.strip())
            logger.info(f"FIELD_CLASSIFICATION | ask_user={len(classification.get('ask_user', []))} | extract={len(classification.get('extract_from_conversation', []))}")
            return classification

        except Exception as e:
            logger.error(f"FIELD_CLASSIFICATION_ERROR | error={str(e)}")
            # Fallback: put all fields in ask_user
            return {
                "ask_user": [field.get("name", "") for field in structured_data],
                "extract_from_conversation": []
            }

    async def _build_analysis_instructions(self, config: Dict[str, Any]) -> str:
        """Build analysis instructions based on assistant configuration."""
        instructions = []
        
        # Add structured data collection instructions
        structured_data = config.get("structured_data_fields", [])
        logger.info(f"ANALYSIS_INSTRUCTIONS_DEBUG | structured_data_count={len(structured_data)} | data={structured_data}")
        if structured_data:
            # Use LLM to classify fields
            try:
                classification = await self._classify_data_fields_with_llm(structured_data)
            except Exception as e:
                logger.error(f"CLASSIFICATION_ERROR | error={str(e)}")
                # Fallback to basic classification
                classification = {
                    "ask_user": [field.get("name", "") for field in structured_data],
                    "extract_from_conversation": []
                }
            
            # Create field lookup
            field_map = {field.get("name", ""): field for field in structured_data}
            
            # Build instructions for fields to ask
            ask_fields = []
            for field_name in classification.get("ask_user", []):
                field = field_map.get(field_name)
                if field:
                    ask_fields.append(f"- {field.get('name', '')}: {field.get('description', '')} (type: {field.get('type', 'string')})")
            
            if ask_fields:
                instructions.append("PRIORITY DATA COLLECTION:")
                instructions.append("You have access to collect_analysis_data(field_name, field_value, field_type) function.")
                instructions.append("IMPORTANT: After your first greeting, immediately start collecting the following data from the user:")
                instructions.extend(ask_fields)
                instructions.append("Ask for this information naturally and conversationally. Use collect_analysis_data silently whenever you have a value - this tool completes without requiring a response.")
                instructions.append("Collect ALL required data fields before moving to other topics like booking or general conversation.")
                instructions.append("Continue natural conversation flow - do NOT repeat yourself or say the same thing twice.")
            
            # Build instructions for fields to extract
            extract_fields = []
            for field_name in classification.get("extract_from_conversation", []):
                field = field_map.get(field_name)
                if field:
                    extract_fields.append(f"- {field.get('name', '')}: {field.get('description', '')} (type: {field.get('type', 'string')})")
            
            if extract_fields:
                instructions.append("\nAI-EXTRACTED FIELDS:")
                instructions.append("The following fields will be automatically extracted from the conversation using AI analysis:")
                instructions.extend(extract_fields)
                instructions.append("DO NOT ask the user for these fields - they will be analyzed and extracted automatically from the conversation.")

        # Add call summary instructions
        call_summary = config.get("analysis_summary_prompt")
        if call_summary:
            instructions.append("\nCALL SUMMARY:")
            instructions.append(f"At the end of the call, a summary will be generated using: {call_summary}")

        # Add success evaluation instructions
        custom_success_prompt = config.get("analysis_evaluation_prompt")
        if custom_success_prompt:
            instructions.append("\nSUCCESS EVALUATION:")
            instructions.append(f"At the end of the call, success will be evaluated based on: {custom_success_prompt}")

        return "\n".join(instructions)

    def _validate_model_names(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and fix model names to prevent API errors."""
        # Valid OpenAI models
        valid_openai_llm_models = {
            "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo",
            "gpt-4o-2024-08-06", "gpt-4-turbo-2024-04-09", "gpt-3.5-turbo-0125"
        }
        
        valid_openai_tts_models = {
            "tts-1", "tts-1-hd"
        }
        
        valid_openai_stt_models = {
            "whisper-1"
        }
        
        valid_elevenlabs_models = {
            "eleven_turbo_v2", "eleven_multilingual_v2", "eleven_monolingual_v1"
        }
        
        valid_groq_models = {
            "llama-3.1-8b-instant", "llama-3.1-70b-versatile", "llama-3.3-70b-versatile",
            "mixtral-8x7b-32768", "gemma2-9b-it"
        }
        
        # Fix LLM model with comprehensive mapping (like old implementation)
        llm_provider = config.get("llm_provider_setting", "OpenAI")
        llm_model = config.get("llm_model_setting", "gpt-4o-mini")
        original_model = llm_model
        
        # Map model names to API format based on provider (from old implementation)
        if llm_provider == "OpenAI":
            if llm_model == "GPT-4o Mini":
                llm_model = "gpt-4o-mini"
            elif llm_model == "GPT-4o":
                llm_model = "gpt-4o"
            elif llm_model == "GPT-4":
                llm_model = "gpt-4"
            elif llm_model == "GPT-3.5 Turbo":
                llm_model = "gpt-3.5-turbo"
        elif llm_provider == "Groq":
            # Handle decommissioned models - map old models to new ones (from old implementation)
            model_mapping = {
                "llama3-8b-8192": "llama-3.1-8b-instant",
                "llama3-70b-8192": "llama-3.3-70b-versatile",
                "mixtral-8x7b-32768": "llama-3.1-8b-instant",
                "gemma2-9b-it": "llama-3.1-8b-instant"
            }
            llm_model = model_mapping.get(llm_model, llm_model)
        elif llm_provider == "Cerebras":
            # Cerebras models are already in correct format
            pass
        
        if original_model != llm_model:
            logger.info(f"MODEL_NAME_MAPPED | provider={llm_provider} | original={original_model} | mapped={llm_model}")
            config["llm_model_setting"] = llm_model
        
        # Final validation after mapping
        if llm_provider == "OpenAI" and llm_model not in valid_openai_llm_models:
            logger.warning(f"INVALID_OPENAI_LLM_MODEL | model={llm_model} | using fallback=gpt-4o-mini")
            config["llm_model_setting"] = "gpt-4o-mini"
        elif llm_provider == "Groq" and llm_model not in valid_groq_models:
            logger.warning(f"INVALID_GROQ_MODEL | model={llm_model} | using fallback=llama-3.1-8b-instant")
            config["llm_model_setting"] = "llama-3.1-8b-instant"
        
        # Fix TTS model with mapping (like old implementation)
        voice_provider = config.get("voice_provider_setting", "OpenAI")
        voice_model = config.get("voice_model_setting", "tts-1")
        original_voice_model = voice_model
        
        # Map TTS model names (from old implementation)
        if voice_provider == "OpenAI":
            if voice_model == "gpt-4o-mini-tts":
                voice_model = "tts-1"
            elif voice_model.startswith("eleven_"):
                voice_model = "tts-1"  # Fallback for ElevenLabs models when using OpenAI
        
        if original_voice_model != voice_model:
            logger.info(f"TTS_MODEL_MAPPED | provider={voice_provider} | original={original_voice_model} | mapped={voice_model}")
            config["voice_model_setting"] = voice_model
        
        # Final validation after mapping
        if voice_provider == "OpenAI" and voice_model not in valid_openai_tts_models:
            logger.warning(f"INVALID_OPENAI_TTS_MODEL | model={voice_model} | using fallback=tts-1")
            config["voice_model_setting"] = "tts-1"
        elif voice_provider == "ElevenLabs" and voice_model not in valid_elevenlabs_models:
            logger.warning(f"INVALID_ELEVENLABS_MODEL | model={voice_model} | using fallback=eleven_turbo_v2")
            config["voice_model_setting"] = "eleven_turbo_v2"
        
        # Fix STT model
        stt_model = config.get("stt_model", "whisper-1")
        if stt_model not in valid_openai_stt_models:
            logger.warning(f"INVALID_STT_MODEL | model={stt_model} | using fallback=whisper-1")
            config["stt_model"] = "whisper-1"
        
        return config

    def _build_call_management_instructions(self, config: Dict[str, Any]) -> str:
        """Build call management instructions from configuration."""
        instructions = []
        
        # End call message
        end_call_message = config.get("end_call_message")
        if end_call_message:
            instructions.append(f"END_CALL_MESSAGE: When the call is ending, say exactly: '{end_call_message}'")
        
        # Idle messages
        idle_messages = config.get("idle_messages", [])
        max_idle_messages = config.get("max_idle_messages", 3)
        silence_timeout = config.get("silence_timeout", 10)
        
        if idle_messages and isinstance(idle_messages, list):
            instructions.append(f"IDLE_MESSAGE_HANDLING:")
            instructions.append(f"- If the user is silent for {silence_timeout} seconds, use one of these idle messages:")
            for i, message in enumerate(idle_messages, 1):
                instructions.append(f"  {i}. '{message}'")
            instructions.append(f"- Maximum idle messages to send: {max_idle_messages}")
            instructions.append(f"- After {max_idle_messages} idle messages, end the call politely")
        
        # Call duration limit
        max_call_duration = config.get("max_call_duration", 30)
        instructions.append(f"CALL_DURATION_LIMIT: This call will automatically end after {max_call_duration} minutes to prevent excessive charges")
        instructions.append(f"CALL_MONITORING: Be aware that the system will automatically terminate this call after {max_call_duration} minutes")
        
        return "\n".join(instructions) if instructions else ""

    async def _wait_for_session_completion(self, session: AgentSession, ctx: JobContext) -> None:
        """Wait for the session to complete naturally."""
        try:
            # Wait for the participant to disconnect using room events
            # RemoteParticipant doesn't have wait_for_disconnect, so we use room events
            await asyncio.sleep(1)  # Give a moment for any final processing
        except Exception as e:
            logger.warning(f"SESSION_COMPLETION_WAIT_FAILED | room={ctx.room.name} | error={str(e)}")
            raise

    def _create_session(self, config: Dict[str, Any]) -> AgentSession:
        """Create agent session with proper configuration."""
        # Validate and fix model names to prevent API errors
        config = self._validate_model_names(config)
        
        # Prewarm VAD for better performance
        vad = silero.VAD.load()

        # Get configuration from assistant data
        llm_provider = config.get("llm_provider_setting", "OpenAI")
        llm_model = config.get("llm_model_setting", "gpt-4o-mini")
        temperature = config.get("temperature_setting", 0.1)
        max_tokens = config.get("max_token_setting", 250)

        voice_provider = config.get("voice_provider_setting", "OpenAI")
        voice_model = config.get("voice_model_setting", "gpt-4o-mini-tts")
        voice_name = config.get("voice_name_setting", "alloy")

        # Create LLM based on provider
        llm = self._create_llm(llm_provider, llm_model, temperature, max_tokens, config)

        # Create TTS based on provider
        tts = self._create_tts(voice_provider, voice_model, voice_name, config)

        # Create STT (always OpenAI for now)
        stt_model = config.get("stt_model", "whisper-1")
        language_setting = config.get("language_setting", "en")
        
        # Map combined language codes to Whisper-supported codes
        language_mapping = {
            "en-es": "en",  # Default to English for combined languages
            "en": "en",
            "es": "es", 
            "pt": "pt",
            "fr": "fr",
            "de": "de",
            "nl": "nl",
            "no": "no",
            "ar": "ar"
        }
        whisper_language = language_mapping.get(language_setting, "en")
        
        stt = openai.STT(model=stt_model, language=whisper_language)

        # Get call management settings from config
        max_call_duration_minutes = config.get("max_call_duration", 30)
        silence_timeout_seconds = config.get("silence_timeout", 10)
        
        # Convert max call duration from minutes to seconds for session timeout
        max_call_duration_seconds = max_call_duration_minutes * 60

        return AgentSession(
            vad=vad,
            stt=stt,
            llm=llm,
            tts=tts,
            allow_interruptions=True,
            min_endpointing_delay=0.5,
            max_endpointing_delay=6.0,
            user_away_timeout=silence_timeout_seconds,
        )

    def _create_llm(self, provider: str, model: str, temperature: float, max_tokens: int, config: Dict[str, Any]):
        """Create LLM based on provider."""
        openai_api_key = os.getenv("OPENAI_API_KEY")
        
        if provider == "Groq" and GROQ_AVAILABLE:
            groq_api_key = os.getenv("GROQ_API_KEY")
            groq_model = config.get("groq_model") or model
            groq_temperature = config.get("groq_temperature") or temperature
            groq_max_tokens = config.get("groq_max_tokens") or max_tokens
            
            # Handle decommissioned models
            model_mapping = {
                "llama3-8b-8192": "llama-3.1-8b-instant",
                "llama3-70b-8192": "llama-3.3-70b-versatile",
                "mixtral-8x7b-32768": "llama-3.1-8b-instant",
                "gemma2-9b-it": "llama-3.1-8b-instant"
            }
            original_model = groq_model
            groq_model = model_mapping.get(groq_model, groq_model)
            if original_model != groq_model:
                logger.info(f"GROQ_MODEL_MAPPED | old_model={original_model} | new_model={groq_model}")
            
            if groq_api_key:
                llm = lk_groq.LLM(
                    model=groq_model,
                    api_key=groq_api_key,
                    temperature=groq_temperature,
                    parallel_tool_calls=False,
                    tool_choice="auto",
                )
                logger.info(f"GROQ_LLM_CONFIGURED | model={groq_model} | temperature={groq_temperature}")
                return llm
            else:
                logger.warning("GROQ_API_KEY_NOT_SET | falling back to OpenAI LLM")

        elif provider == "Cerebras" and CEREBRAS_AVAILABLE:
            cerebras_api_key = os.getenv("CEREBRAS_API_KEY")
            cerebras_model = config.get("cerebras_model") or model
            cerebras_temperature = config.get("cerebras_temperature") or temperature
            cerebras_max_tokens = config.get("cerebras_max_tokens") or max_tokens
            
            if cerebras_api_key:
                llm = openai.LLM(
                    model=cerebras_model,
                    api_key=cerebras_api_key,
                    base_url="https://api.cerebras.ai/v1",
                    temperature=cerebras_temperature,
                    parallel_tool_calls=False,
                    tool_choice="auto",
                )
                logger.info(f"CEREBRAS_LLM_CONFIGURED | model={cerebras_model} | temperature={cerebras_temperature}")
                return llm
            else:
                logger.warning("CEREBRAS_API_KEY_NOT_SET | falling back to OpenAI LLM")

        # Default to OpenAI LLM
        llm = openai.LLM(
            model=model,
            api_key=openai_api_key,
            temperature=temperature,
            parallel_tool_calls=False,
            tool_choice="auto",
        )
        logger.info(f"OPENAI_LLM_CONFIGURED | model={model} | temperature={temperature}")
        return llm

    def _create_tts(self, provider: str, model: str, voice_name: str, config: Dict[str, Any]):
        """Create TTS based on provider with official LiveKit FallbackAdapter."""
        openai_api_key = os.getenv("OPENAI_API_KEY")
        
        # Create TTS instances list for fallback
        tts_instances = []
        
        # DISABLE ELEVENLABS COMPLETELY - NO MORE TIMEOUTS!
        elevenlabs_disabled = True
        logger.info("ELEVENLABS_DISABLED | using OpenAI TTS only to prevent timeouts")
        
        # ElevenLabs is disabled - skip all ElevenLabs logic
        
        # Always add OpenAI TTS as reliable fallback
        # Map ElevenLabs voice names to OpenAI voices for better user experience
        openai_voice_map = {
            "rachel": "nova",      # Female, clear voice
            "domi": "shimmer",     # Female, energetic voice  
            "bella": "nova",       # Female, clear voice
            "antoni": "echo",      # Male, warm voice
            "elli": "nova",        # Female, clear voice
            "josh": "echo",        # Male, warm voice
            "arnold": "fable",     # Male, deep voice
            "alloy": "alloy",      # Default OpenAI voice
            "nova": "nova",        # OpenAI voice
            "shimmer": "shimmer",  # OpenAI voice
            "echo": "echo",        # OpenAI voice
            "fable": "fable",      # OpenAI voice
            "onyx": "onyx"         # OpenAI voice
        }
        
        openai_voice = openai_voice_map.get(voice_name.lower(), "alloy")
        openai_tts_model = "tts-1" if model.startswith("eleven_") else model
        
        # Create OpenAI TTS with reliable settings
        openai_tts = openai.TTS(
            model=openai_tts_model, 
            voice=openai_voice, 
            api_key=openai_api_key
        )
        logger.info(f"OPENAI_TTS_CONFIGURED | model={openai_tts_model} | voice={openai_voice}")
        tts_instances.append(openai_tts)
        logger.info(f"OPENAI_ADDED_TO_FALLBACK | total_instances={len(tts_instances)}")
        
        # Since ElevenLabs is disabled, we only have OpenAI TTS
        if len(tts_instances) == 0:
            raise ValueError("No TTS instances available")
        
        # Use OpenAI TTS directly - no fallback needed
        logger.info("OPENAI_TTS_DIRECT | using OpenAI TTS only (ElevenLabs disabled)")
        return tts_instances[0]

    async def _generate_call_summary(self, config: Dict[str, Any], session_history: list, agent) -> Optional[str]:
        """Generate call summary using LLM."""
        try:
            call_summary_prompt = config.get("analysis_summary_prompt")
            if not call_summary_prompt:
                return None

            # Get session history as text
            conversation_text = self._extract_conversation_text(session_history)
            if not conversation_text:
                return None

            # Validate config before creating LLM
            config = self._validate_model_names(config)

            # Create LLM for summary generation
            llm = self._create_llm(
                config.get("llm_provider_setting", "OpenAI"),
                config.get("llm_model_setting", "gpt-4o-mini"),
                config.get("temperature_setting", 0.1),
                config.get("max_token_setting", 250),
                config
            )

            # Generate summary
            summary_prompt = f"{call_summary_prompt}\n\nConversation:\n{conversation_text}"
            
            # Use LLM to generate summary
            response = await llm.agenerate(
                messages=[{"role": "user", "content": summary_prompt}],
                max_tokens=config.get("max_token_setting", 250)
            )
            
            summary = response.choices[0].message.content.strip()
            logger.info(f"CALL_SUMMARY_GENERATED | length={len(summary)}")
            return summary

        except Exception as e:
            logger.error(f"CALL_SUMMARY_ERROR | error={str(e)}")
            return None

    async def _evaluate_call_success(self, config: Dict[str, Any], session_history: list, agent) -> Optional[bool]:
        """Evaluate if call was successful using LLM."""
        try:
            success_prompt = config.get("analysis_evaluation_prompt")
            if not success_prompt:
                return None

            # Get session history as text
            conversation_text = self._extract_conversation_text(session_history)
            if not conversation_text:
                return None

            # Validate config before creating LLM
            config = self._validate_model_names(config)

            # Create LLM for success evaluation
            llm = self._create_llm(
                config.get("llm_provider_setting", "OpenAI"),
                config.get("llm_model_setting", "gpt-4o-mini"),
                config.get("temperature_setting", 0.1),
                config.get("max_token_setting", 100),
                config
            )

            # Evaluate success
            evaluation_prompt = f"{success_prompt}\n\nConversation:\n{conversation_text}\n\nWas this call successful? Answer only 'YES' or 'NO'."
            
            response = await llm.agenerate(
                messages=[{"role": "user", "content": evaluation_prompt}],
                max_tokens=10
            )
            
            result = response.choices[0].message.content.strip().upper()
            success = result == "YES"
            logger.info(f"CALL_SUCCESS_EVALUATED | result={result} | success={success}")
            return success

        except Exception as e:
            logger.error(f"CALL_SUCCESS_EVALUATION_ERROR | error={str(e)}")
            return None

    def _extract_conversation_text(self, session_history: list) -> str:
        """Extract conversation text from session history."""
        try:
            conversation_parts = []
            for item in session_history:
                if isinstance(item, dict):
                    role = item.get("role", "")
                    content = item.get("content", "")
                    if role and content:
                        if isinstance(content, list):
                            content = " ".join([str(c) for c in content if c])
                        conversation_parts.append(f"{role}: {content}")
            
            return "\n".join(conversation_parts)
        except Exception as e:
            logger.error(f"CONVERSATION_EXTRACTION_ERROR | error={str(e)}")
            return ""

    async def _process_call_analysis(
        self, 
        assistant_id: str, 
        transcription: list, 
        call_duration: int, 
        agent, 
        assistant_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process comprehensive call analysis like the old code."""
        analysis_data = {
            "call_summary": None,
            "call_success": None,
            "structured_data": {}
        }
        
        try:
            logger.info(f"PROCESS_CALL_ANALYSIS_START | assistant_id={assistant_id} | transcription_items={len(transcription)}")
            
            # Generate call summary if configured
            call_summary_prompt = assistant_config.get("analysis_summary_prompt")
            if call_summary_prompt:
                try:
                    analysis_data["call_summary"] = await self._generate_call_summary_with_llm(
                        transcription=transcription,
                        prompt=call_summary_prompt,
                        timeout=assistant_config.get("analysis_summary_timeout", 30)
                    )
                    logger.info(f"CALL_SUMMARY_GENERATED | assistant_id={assistant_id} | length={len(analysis_data['call_summary']) if analysis_data['call_summary'] else 0}")
                except Exception as e:
                    logger.warning(f"CALL_SUMMARY_FAILED | assistant_id={assistant_id} | error={str(e)}")
            
            # Evaluate call success if configured
            success_prompt = assistant_config.get("analysis_evaluation_prompt")
            if success_prompt:
                try:
                    analysis_data["call_success"] = await self._evaluate_call_success_with_llm(
                        transcription=transcription,
                        prompt=success_prompt,
                        timeout=assistant_config.get("analysis_evaluation_timeout", 15)
                    )
                    logger.info(f"CALL_SUCCESS_EVALUATED | assistant_id={assistant_id} | success={analysis_data['call_success']}")
                except Exception as e:
                    logger.warning(f"CALL_SUCCESS_EVALUATION_FAILED | assistant_id={assistant_id} | error={str(e)}")
            
            # Process structured data extraction
            structured_data_fields = assistant_config.get("structured_data_fields", [])
            logger.info(f"STRUCTURED_DATA_CONFIG_CHECK | assistant_id={assistant_id} | fields_count={len(structured_data_fields)}")
            
            # Always try to get data directly from agent
            agent_structured_data = {}
            if agent and hasattr(agent, 'get_structured_data'):
                agent_structured_data = agent.get_structured_data()
                logger.info(f"AGENT_STRUCTURED_DATA_RETRIEVED | assistant_id={assistant_id} | fields_count={len(agent_structured_data)}")
            
            # If we have configured fields, also try AI extraction
            if structured_data_fields and len(structured_data_fields) > 0:
                try:
                    ai_structured_data = await self._extract_structured_data_with_ai(
                        transcription=transcription,
                        fields=structured_data_fields,
                        prompt=assistant_config.get("analysis_structured_data_prompt"),
                        properties=assistant_config.get("analysis_structured_data_properties", {}),
                        timeout=assistant_config.get("analysis_structured_data_timeout", 20),
                        agent=agent
                    )
                    # Merge AI extracted data with agent data (agent data takes precedence)
                    final_structured_data = {**ai_structured_data, **agent_structured_data}
                    analysis_data["structured_data"] = final_structured_data
                    logger.info(f"STRUCTURED_DATA_EXTRACTED_WITH_AI | assistant_id={assistant_id} | ai_fields={len(ai_structured_data)} | agent_fields={len(agent_structured_data)} | final_fields={len(final_structured_data)}")
                except Exception as e:
                    logger.error(f"AI_STRUCTURED_DATA_EXTRACTION_FAILED | assistant_id={assistant_id} | error={str(e)} | fields_count={len(structured_data_fields)} | transcription_items={len(transcription)}")
                    logger.error(f"AI_EXTRACTION_FALLBACK | assistant_id={assistant_id} | falling_back_to_agent_data_only | agent_fields={len(agent_structured_data)}")
                    # Fallback to agent data only - but log this as an error, not a warning
                    # Add a flag to indicate AI extraction failed
                    fallback_data = agent_structured_data.copy()
                    fallback_data["_ai_extraction_failed"] = {
                        "error": str(e),
                        "timestamp": datetime.datetime.now().isoformat(),
                        "configured_fields_count": len(structured_data_fields)
                    }
                    analysis_data["structured_data"] = fallback_data
            else:
                # No configured fields, just use agent data
                analysis_data["structured_data"] = agent_structured_data
                logger.info(f"STRUCTURED_DATA_EXTRACTED_AGENT_ONLY | assistant_id={assistant_id} | fields_count={len(agent_structured_data)}")
            
        except Exception as e:
            logger.error(f"ANALYSIS_PROCESSING_ERROR | assistant_id={assistant_id} | error={str(e)}")
            # Fallback to basic agent data
            if agent and hasattr(agent, 'get_structured_data'):
                try:
                    fallback_data = agent.get_structured_data()
                    analysis_data["structured_data"] = fallback_data
                    logger.info(f"STRUCTURED_DATA_FALLBACK_SUCCESS | assistant_id={assistant_id} | fields_count={len(fallback_data)}")
                except Exception as fallback_error:
                    logger.warning(f"STRUCTURED_DATA_FALLBACK_FAILED | assistant_id={assistant_id} | error={str(fallback_error)}")
        
        return analysis_data

    async def _generate_call_summary_with_llm(self, transcription: list, prompt: str, timeout: int = 30) -> str:
        """Generate call summary using LLM like the old code."""
        try:
            logger.info(f"CALL_SUMMARY_DEBUG | transcription_items={len(transcription)}")
            
            # Prepare transcription text
            transcript_text = ""
            for item in transcription:
                if isinstance(item, dict) and "content" in item:
                    role = item.get("role", "unknown")
                    content = item["content"]
                    if isinstance(content, str):
                        transcript_text += f"{role}: {content}\n"
                        logger.info(f"TRANSCRIPT_ITEM | role={role} | content_length={len(content)}")
            
            logger.info(f"TRANSCRIPT_TEXT_LENGTH | length={len(transcript_text)}")
            
            if not transcript_text.strip():
                logger.warning("EMPTY_TRANSCRIPT_TEXT | returning default message")
                return "No conversation content available for summary."

            # Use OpenAI API for summary generation
            import openai
            openai_api_key = os.getenv("OPENAI_API_KEY")
            if not openai_api_key:
                logger.warning("OPENAI_API_KEY not configured for call summary")
                return "Summary generation not available - API key not configured."

            # Use async OpenAI client
            client = openai.AsyncOpenAI(api_key=openai_api_key)
            
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": f"Please summarize this call:\n\n{transcript_text}"}
                    ],
                    max_tokens=500,
                    temperature=0.3
                ),
                timeout=timeout
            )

            return response.choices[0].message.content.strip()

        except asyncio.TimeoutError:
            logger.warning(f"CALL_SUMMARY_TIMEOUT | timeout={timeout}s")
            return "Summary generation timed out."
        except Exception as e:
            logger.warning(f"CALL_SUMMARY_ERROR | error={str(e)}")
            return f"Summary generation failed: {str(e)}"

    async def _evaluate_call_success_with_llm(self, transcription: list, prompt: str, timeout: int = 15) -> bool:
        """Evaluate call success using LLM like the old code."""
        try:
            # Prepare transcription text
            transcript_text = ""
            for item in transcription:
                if isinstance(item, dict) and "content" in item:
                    role = item.get("role", "unknown")
                    content = item["content"]
                    if isinstance(content, str):
                        transcript_text += f"{role}: {content}\n"
            
            if not transcript_text.strip():
                return False

            # Use OpenAI API for success evaluation
            import openai
            openai_api_key = os.getenv("OPENAI_API_KEY")
            if not openai_api_key:
                logger.warning("OPENAI_API_KEY not configured for success evaluation")
                return False

            client = openai.AsyncOpenAI(api_key=openai_api_key)
            
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": f"Please evaluate this call:\n\n{transcript_text}\n\nWas this call successful? Answer only 'YES' or 'NO'."}
                    ],
                    max_tokens=10,
                    temperature=0.1
                ),
                timeout=timeout
            )

            result = response.choices[0].message.content.strip().upper()
            return result == "YES"

        except asyncio.TimeoutError:
            logger.warning(f"SUCCESS_EVALUATION_TIMEOUT | timeout={timeout}s")
            return False
        except Exception as e:
            logger.warning(f"SUCCESS_EVALUATION_ERROR | error={str(e)}")
            return False

    async def _extract_structured_data_with_ai(
        self, 
        transcription: list, 
        fields: list, 
        prompt: str = None, 
        properties: dict = None, 
        timeout: int = 20, 
        agent = None
    ) -> dict:
        """Extract structured data from call transcription using AI like the old code."""
        try:
            logger.info(f"EXTRACT_STRUCTURED_DATA_START | fields_count={len(fields)} | transcription_items={len(transcription)}")
            
            # Prepare transcription text
            transcript_text = ""
            for item in transcription:
                if isinstance(item, dict) and "content" in item:
                    role = item.get("role", "unknown")
                    content = item["content"]
                    if isinstance(content, str):
                        transcript_text += f"{role}: {content}\n"
            
            if not transcript_text.strip():
                logger.warning("EXTRACT_STRUCTURED_DATA_EMPTY_TRANSCRIPT")
                return {}

            # Get structured data from agent if available
            agent_data = {}
            if agent and hasattr(agent, 'get_structured_data'):
                agent_data = agent.get_structured_data()
                logger.info(f"AGENT_DATA_RETRIEVED | fields_count={len(agent_data)}")

            # Generate prompt if not provided - ensure ALL fields are included
            if not prompt:
                field_descriptions = []
                for field in fields:
                    if isinstance(field, dict):
                        name = field.get("name", "unknown")
                        description = field.get("description", "No description")
                        field_type = field.get("type", "string")
                        field_descriptions.append(f"- {name}: {description} (type: {field_type})")
                
                prompt = f"""Extract the following information from the conversation. You MUST provide a value for EVERY field listed below:

{chr(10).join(field_descriptions)}

IMPORTANT: 
- For analysis fields (summary, outcome, keypoints, etc.), generate appropriate values based on the conversation content
- For user-provided fields, extract the actual information mentioned by the user
- If a field is not explicitly mentioned, generate a reasonable value based on the conversation context
- Return the data as a JSON object with ALL field names as keys
- Do not use null unless absolutely no information is available
- You must respond with valid JSON format only"""

            # Use OpenAI API for structured data extraction
            import openai
            openai_api_key = os.getenv("OPENAI_API_KEY")
            if not openai_api_key:
                logger.warning("OPENAI_API_KEY not configured for structured data extraction")
                return agent_data  # Return agent data as fallback

            client = openai.AsyncOpenAI(api_key=openai_api_key)
            
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": f"Extract the requested information from this conversation:\n\n{transcript_text}"}
                    ],
                    max_tokens=1000,
                    temperature=0.1,
                    response_format={"type": "json_object"}
                ),
                timeout=timeout
            )

            # Parse the response as JSON
            try:
                extracted_data = json.loads(response.choices[0].message.content.strip())
                logger.info(f"STRUCTURED_DATA_EXTRACTED | fields_count={len(extracted_data)}")
                
                # Ensure all configured fields are present in the result
                final_data = {}
                for field in fields:
                    if isinstance(field, dict):
                        field_name = field.get("name", "")
                        if field_name in extracted_data:
                            final_data[field_name] = extracted_data[field_name]
                        else:
                            # Generate a default value for missing fields
                            field_type = field.get("type", "string")
                            if field_type == "string":
                                final_data[field_name] = "Not specified"
                            elif field_type == "number":
                                final_data[field_name] = 0
                            elif field_type == "boolean":
                                final_data[field_name] = False
                            else:
                                final_data[field_name] = "Not specified"
                            logger.info(f"MISSING_FIELD_DEFAULT | field={field_name} | default={final_data[field_name]}")
                
                # Merge with agent data (agent data takes precedence)
                final_data = {**final_data, **agent_data}
                
                logger.info(f"STRUCTURED_DATA_FINAL | total_fields={len(final_data)} | agent_fields={len(agent_data)} | ai_fields={len(extracted_data)}")
                return final_data
                
            except json.JSONDecodeError as e:
                logger.error(f"STRUCTURED_DATA_JSON_PARSE_ERROR | error={str(e)} | fields_count={len(fields)}")
                logger.error(f"JSON_ERROR_DETAILS | response_content={response.choices[0].message.content[:200] if response else 'No response'} | transcription_length={len(transcript_text)}")
                return agent_data  # Return agent data as fallback

        except asyncio.TimeoutError:
            logger.error(f"STRUCTURED_DATA_EXTRACTION_TIMEOUT | timeout={timeout}s | fields_count={len(fields)} | transcription_length={len(transcript_text)}")
            logger.error(f"TIMEOUT_DETAILS | assistant_id={getattr(agent, 'assistant_id', 'unknown')} | openai_api_configured={bool(os.getenv('OPENAI_API_KEY'))}")
            return agent_data  # Return agent data as fallback
        except Exception as e:
            logger.error(f"STRUCTURED_DATA_EXTRACTION_ERROR | error={str(e)} | fields_count={len(fields)} | transcription_length={len(transcript_text)}")
            logger.error(f"EXTRACTION_ERROR_DETAILS | assistant_id={getattr(agent, 'assistant_id', 'unknown')} | openai_api_configured={bool(os.getenv('OPENAI_API_KEY'))} | fields={[f.get('name', 'unknown') for f in fields]}")
            return agent_data  # Return agent data as fallback

    async def _perform_post_call_analysis(self, config: Dict[str, Any], session_history: list, agent) -> Dict[str, Any]:
        """Perform complete post-call analysis."""
        analysis_results = {
            "call_summary": None,
            "call_success": None,
            "structured_data": {},
            "analysis_timestamp": datetime.datetime.now().isoformat()
        }

        try:
            # Process session history into transcription format
            transcription = []
            for item in session_history:
                if isinstance(item, dict) and "role" in item and "content" in item:
                    content = item["content"]
                    # Handle different content formats
                    if isinstance(content, list):
                        content_parts = []
                        for c in content:
                            if c and str(c).strip():
                                content_parts.append(str(c).strip())
                        content = " ".join(content_parts)
                    elif not isinstance(content, str):
                        content = str(content)
                    
                    # Only add non-empty content
                    if content and content.strip():
                        transcription.append({
                            "role": item["role"],
                            "content": content.strip()
                        })
            
            logger.info(f"POST_CALL_ANALYSIS_TRANSCRIPTION | items={len(transcription)}")
            
            # Use comprehensive analysis processing like the old code
            analysis_data = await self._process_call_analysis(
                assistant_id=config.get("id"),
                transcription=transcription,  # Use processed transcription
                call_duration=300,  # Approximate duration
                agent=agent,
                assistant_config=config
            )
            
            # Merge analysis results
            analysis_results.update(analysis_data)
            
            logger.info(f"POST_CALL_ANALYSIS_COMPLETE | summary={bool(analysis_results['call_summary'])} | success={analysis_results['call_success']} | data_fields={len(analysis_results['structured_data'])}")

        except Exception as e:
            logger.error(f"POST_CALL_ANALYSIS_ERROR | error={str(e)}")
            # Fallback to basic analysis
            try:
                if hasattr(agent, 'get_structured_data'):
                    analysis_results["structured_data"] = agent.get_structured_data()
            except Exception as fallback_error:
                logger.error(f"FALLBACK_ANALYSIS_ERROR | error={str(fallback_error)}")

        return analysis_results

    async def _save_call_history_to_database(
        self, 
        ctx: JobContext, 
        assistant_config: Dict[str, Any], 
        session_history: list, 
        analysis_results: Dict[str, Any],
        participant,
        start_time: datetime.datetime,
        end_time: datetime.datetime
    ) -> None:
        """Save call history and analysis data to database."""
        try:
            # Generate call ID from room name
            call_id = ctx.room.name
            
            # Calculate call duration from provided start and end times
            call_duration = int((end_time - start_time).total_seconds())
            
            # Extract call_sid like in old implementation
            call_sid = self._extract_call_sid(ctx, participant)
            
            # Process transcription from session history
            transcription = []
            logger.info(f"SESSION_HISTORY_DEBUG | items_count={len(session_history)}")
            
            for i, item in enumerate(session_history):
                logger.info(f"SESSION_ITEM_{i} | type={type(item)} | content={str(item)[:100]}...")
                if isinstance(item, dict) and "role" in item and "content" in item:
                    content = item["content"]
                    # Handle different content formats
                    if isinstance(content, list):
                        content_parts = []
                        for c in content:
                            if c and str(c).strip():
                                content_parts.append(str(c).strip())
                        content = " ".join(content_parts)
                    elif not isinstance(content, str):
                        content = str(content)
                    
                    # Only add non-empty content
                    if content and content.strip():
                        transcription.append({
                            "role": item["role"],
                            "content": content.strip()
                        })
                        logger.info(f"TRANSCRIPTION_ADDED | role={item['role']} | content_length={len(content.strip())}")
            
            logger.info(f"TRANSCRIPTION_PREPARED | session_items={len(session_history)} | transcription_items={len(transcription)}")
            
            # Determine call status
            call_status = self._determine_call_status(call_duration, transcription)
            
            # Extract contact name from analysis results
            contact_name = None
            if analysis_results.get("structured_data") and isinstance(analysis_results["structured_data"], dict):
                structured_data = analysis_results["structured_data"]
                # Try different possible name fields
                contact_name = (
                    structured_data.get("name") or 
                    structured_data.get("full_name") or 
                    structured_data.get("contact_name") or
                    structured_data.get("customer_name") or
                    structured_data.get("client_name")
                )
                logger.info(f"CONTACT_NAME_EXTRACTED | from_analysis={contact_name} | structured_data_keys={list(structured_data.keys())}")
            
            # Use contact name if available, otherwise fall back to participant identity or phone number
            participant_identity = (
                contact_name or 
                (participant.identity if participant else None) or 
                self._extract_phone_from_room(ctx.room.name)
            )
            
            logger.info(f"PARTICIPANT_IDENTITY_DETERMINED | phone={self._extract_phone_from_room(ctx.room.name)}")

            # Prepare call data
            call_data = {
                "call_id": call_id,
                "assistant_id": assistant_config.get("id"),
                "phone_number": self._extract_phone_from_room(ctx.room.name),
                "participant_identity": self._extract_phone_from_room(ctx.room.name),
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "call_duration": call_duration,
                "call_status": call_status,
                "transcription": transcription if transcription else [],
                "call_sid": call_sid,
                "created_at": datetime.datetime.now().isoformat()
            }
            
            # Add analysis results
            if analysis_results.get("call_summary"):
                call_data["call_summary"] = analysis_results["call_summary"]
            if analysis_results.get("call_success") is not None:
                # Convert boolean to string for database storage
                call_data["success_evaluation"] = "SUCCESS" if analysis_results["call_success"] else "FAILED"
            if analysis_results.get("structured_data"):
                call_data["structured_data"] = analysis_results["structured_data"]
            
            # Save to database
            result = self.supabase.client.table("call_history").insert(call_data).execute()
            
            if result.data:
                logger.info(f"CALL_HISTORY_SAVED | call_id={call_id} | call_sid={call_sid} | duration={call_duration}s | status={call_status} | transcription_items={len(transcription)}")
                if transcription:
                    sample_transcript = transcription[0] if len(transcription) > 0 else {}
                    logger.info(f"TRANSCRIPTION_SAMPLE | first_entry={sample_transcript}")
            else:
                logger.error(f"CALL_HISTORY_SAVE_FAILED | call_id={call_id}")
                
        except Exception as e:
            logger.error(f"CALL_HISTORY_SAVE_ERROR | error={str(e)}")

    def _determine_call_status(self, call_duration: int, transcription: list) -> str:
        """Determine call status based on duration and transcription."""
        if call_duration < 10:
            return "short_call"
        elif call_duration < 30:
            return "brief_call"
        elif len(transcription) < 3:
            return "minimal_interaction"
        else:
            return "completed"

    def _extract_call_sid(self, ctx: JobContext, participant) -> Optional[str]:
        """Extract call_sid from various sources like in old implementation."""
        call_sid = None
        
        try:
            # Try to get call_sid from participant attributes
            if hasattr(participant, 'attributes') and participant.attributes:
                if hasattr(participant.attributes, 'get'):
                    call_sid = participant.attributes.get('sip.twilio.callSid')
                    if call_sid:
                        logger.info(f"CALL_SID_FROM_PARTICIPANT_ATTRIBUTES | call_sid={call_sid}")
                
                # Try SIP attributes if not found
                if not call_sid and hasattr(participant.attributes, 'sip'):
                    sip_attrs = participant.attributes.sip
                    if hasattr(sip_attrs, 'twilio') and hasattr(sip_attrs.twilio, 'callSid'):
                        call_sid = sip_attrs.twilio.callSid
                        if call_sid:
                            logger.info(f"CALL_SID_FROM_SIP_ATTRIBUTES | call_sid={call_sid}")
        except Exception as e:
            logger.warning(f"Failed to get call_sid from participant attributes: {str(e)}")

        # Try room metadata if not found
        if not call_sid and hasattr(ctx.room, 'metadata') and ctx.room.metadata:
            try:
                room_meta = json.loads(ctx.room.metadata) if isinstance(ctx.room.metadata, str) else ctx.room.metadata
                call_sid = room_meta.get('call_sid') or room_meta.get('CallSid') or room_meta.get('provider_id')
                if call_sid:
                    logger.info(f"CALL_SID_FROM_ROOM_METADATA | call_sid={call_sid}")
            except Exception as e:
                logger.warning(f"Failed to parse room metadata for call_sid: {str(e)}")

        # Try participant metadata if not found
        if not call_sid and hasattr(participant, 'metadata') and participant.metadata:
            try:
                participant_meta = json.loads(participant.metadata) if isinstance(participant.metadata, str) else participant.metadata
                call_sid = participant_meta.get('call_sid') or participant_meta.get('CallSid') or participant_meta.get('provider_id')
                if call_sid:
                    logger.info(f"CALL_SID_FROM_PARTICIPANT_METADATA | call_sid={call_sid}")
            except Exception as e:
                logger.warning(f"Failed to parse participant metadata for call_sid: {str(e)}")

        if not call_sid:
            logger.warning("CALL_SID_NOT_FOUND | no call_sid available from any source")
        
        return call_sid

    def _extract_phone_from_room(self, room_name: str) -> str:
        """Extract phone number from room name."""
        try:
            # Handle patterns like "assistant-_+12017656193_tVG5An7aEcnF"
            if room_name.startswith("assistant-"):
                parts = room_name.split("_")
                if len(parts) >= 2:
                    phone_part = parts[1]
                    if phone_part.startswith("+"):
                        return phone_part
            return "unknown"
        except Exception:
            return "unknown"


def prewarm(proc: agents.JobProcess):
    """Preload VAD for better performance."""
    try:
        proc.userdata["vad"] = silero.VAD.load()
        logger.info("VAD_PREWARMED")
    except Exception as e:
        logger.error(f"VAD_PREWARM_ERROR | error={str(e)}")


async def entrypoint(ctx: JobContext):
    """Main entry point following LiveKit patterns."""
    handler = CallHandler()
    await handler.handle_call(ctx)


if __name__ == "__main__":
    # Validate required environment variables
    required_vars = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "OPENAI_API_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]

    if missing_vars:
        logger.error(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
        sys.exit(1)

    # Log configuration
    agent_name = os.getenv("LK_AGENT_NAME", "ai")
    logger.info("STARTING_LIVEKIT_AGENT")
    logger.info(f"LIVEKIT_URL={os.getenv('LIVEKIT_URL')}")
    logger.info(f"OPENAI_MODEL={os.getenv('OPENAI_LLM_MODEL', 'gpt-4o-mini')}")
    logger.info(f"🤖 Agent name: {agent_name}")

    # Run the agent
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm, agent_name=agent_name))