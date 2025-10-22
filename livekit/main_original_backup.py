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
import httpx
from openai import AsyncOpenAI

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
from services.call_outcome_service import CallOutcomeService
from integrations.supabase_client import SupabaseClient
from integrations.calendar_api import CalComCalendar, CalendarResult, CalendarError
from utils.logging_hardening import configure_safe_logging
from utils.latency_logger import (
    measure_latency_context, 
    get_tracker, 
    clear_tracker,
    LatencyProfiler
)

# Configure logging with security hardening
configure_safe_logging(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enable DEBUG logging for livekit.agents to see detailed transcript information
logging.getLogger("livekit.agents").setLevel(logging.DEBUG)

# ---- Shared OpenAI client & HTTP transport (used by all OpenAI calls) ----
_HTTP_TIMEOUT = httpx.Timeout(connect=5.0, read=60.0, write=30.0, pool=30.0)  # Increased read timeout
_HTTP_CLIENT = httpx.AsyncClient(timeout=_HTTP_TIMEOUT)

_OPENAI_CLIENT = AsyncOpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    http_client=_HTTP_CLIENT,  # ensures streaming reads don't hit short defaults
    timeout=60.0,              # increased overall guard for better reliability
    max_retries=5,             # increased retries for better resilience (was 3)
    default_headers={
        "User-Agent": "LiveKit-Agent/1.0",
    },
)
# --------------------------------------------------------------------------


class CallHandler:
    """Simplified call handler following LiveKit patterns."""

    def __init__(self):
        self.supabase = SupabaseClient()
        self.call_outcome_service = CallOutcomeService()
        
        # Pre-warm critical components for faster response
        self._prewarmed_agents = {}
        self._prewarmed_llms = {}
        self._prewarmed_tts = {}
        self._prewarmed_vad = None
        self._prewarmed_rag = None
        
        # Start pre-warming in background
        asyncio.create_task(self._prewarm_components())

    async def _prewarm_components(self):
        """Pre-warm critical components to eliminate cold start latency."""
        try:
            logger.info("PREWARM_START | warming up system components")
            
            # Pre-warm VAD (Voice Activity Detection)
            self._prewarmed_vad = silero.VAD.load()
            logger.info("PREWARM_VAD | VAD loaded successfully")
            
            # Pre-warm RAG service
            from services.rag_service import RAGService
            self._prewarmed_rag = RAGService()  # RAGService initializes itself in constructor
            logger.info("PREWARM_RAG | RAG service initialized")
            
            # Pre-warm common LLM configurations
            common_configs = [
                {"llm_provider_setting": "OpenAI", "llm_model_setting": "gpt-4o-mini"},
                {"llm_provider_setting": "Groq", "llm_model_setting": "llama-3.1-8b-instant"},
            ]
            
            for config in common_configs:
                config_key = f"{config['llm_provider_setting']}_{config['llm_model_setting']}"
                try:
                    llm = self._create_llm(
                        config["llm_provider_setting"], 
                        config["llm_model_setting"], 
                        0.1, 200, config
                    )
                    self._prewarmed_llms[config_key] = llm
                    logger.info("PREWARM_LLM | %s pre-warmed", config_key)
                except Exception as e:
                    logger.warning("PREWARM_LLM_FAILED | %s: %s", config_key, str(e))
            
            # Pre-warm TTS
            try:
                tts = self._create_tts("OpenAI", "tts-1", "nova", {})
                self._prewarmed_tts["openai_nova"] = tts
                logger.info("PREWARM_TTS | OpenAI TTS pre-warmed")
            except Exception as e:
                logger.warning("PREWARM_TTS_FAILED | %s", str(e))
            
            logger.info("PREWARM_COMPLETE | all components warmed up")
            
        except Exception as e:
            logger.error("PREWARM_ERROR | failed to pre-warm components: %s", str(e))

    async def handle_call(self, ctx: JobContext) -> None:
        """Handle incoming call with proper LiveKit patterns."""
        call_id = ctx.room.name  # Use room name as call ID
        profiler = LatencyProfiler(call_id, "call_processing")
        
        try:
            # Measure connection latency
            async with measure_latency_context("room_connection", call_id):
                await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
                logger.info(f"CONNECTED | room={ctx.room.name}")

            profiler.checkpoint("connected")

            # Log job metadata for debugging
            logger.info(f"JOB_METADATA | metadata={ctx.job.metadata}")

            # Measure call type determination and config resolution
            async with measure_latency_context("call_type_determination", call_id):
                call_type = self._determine_call_type(ctx)
                assistant_config = await self._resolve_assistant_config(ctx, call_type)

            profiler.checkpoint("config_resolved", {"call_type": call_type})

            if not assistant_config:
                logger.error(f"NO_ASSISTANT_CONFIG | room={ctx.room.name}")
                profiler.finish(success=False, error="No assistant config found")
                return

            # Handle outbound calls
            if call_type == "outbound":
                async with measure_latency_context("outbound_call_handling", call_id):
                    await self._handle_outbound_call(ctx, assistant_config)
                profiler.checkpoint("outbound_handled")

            # Create session and agent BEFORE waiting for participant to start listening immediately
            async with measure_latency_context("session_creation", call_id):
                session = self._create_session(assistant_config)
            profiler.checkpoint("session_created")

            # Create agent
            agent = await self._create_agent(assistant_config)
            profiler.checkpoint("agent_created")

            # Start the session IMMEDIATELY to begin listening for speech
            async with measure_latency_context("session_start", call_id):
                await session.start(
                    agent=agent,
                    room=ctx.room,
                    room_input_options=RoomInputOptions(close_on_disconnect=True),
                    room_output_options=RoomOutputOptions(transcription_enabled=True)  # Enable transcription for better speech recognition
                )
            logger.info(f"SESSION_STARTED | room={ctx.room.name} | listening for speech")
            profiler.checkpoint("session_started")

            # Wait for participant with configurable timeout
            participant_timeout = float(os.getenv("PARTICIPANT_TIMEOUT_SECONDS", "35.0"))
            try:
                async with measure_latency_context("participant_wait", call_id, {"timeout_seconds": participant_timeout}):
                    participant = await asyncio.wait_for(
                        ctx.wait_for_participant(),
                        timeout=participant_timeout
                    )
                logger.info(f"PARTICIPANT_CONNECTED | phone={self._extract_phone_from_room(ctx.room.name)}")
                profiler.checkpoint("participant_connected")
            except asyncio.TimeoutError:
                phone_number = self._extract_phone_from_room(ctx.room.name)
                logger.error(
                    f"PARTICIPANT_TIMEOUT | "
                    f"room={ctx.room.name} | "
                    f"phone={phone_number} | "
                    f"call_type={call_type} | "
                    f"timeout={participant_timeout}s | "
                    f"assistant_id={assistant_config.get('id', 'unknown')} | "
                    f"room_created={ctx.room.creation_time} | "
                    f"participants_count={ctx.room.num_participants}"
                )
                profiler.finish(success=False, error="Participant connection timeout")
                
                # Log timeout for analytics
                await self._log_call_outcome(
                    ctx.room.name,
                    "timeout",
                    "Participant failed to connect within timeout period",
                    phone_number,
                    call_type,
                    assistant_config.get('id', 'unknown')
                )
                
                # Clean up the room since no participant connected
                try:
                    await ctx.api.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))
                    logger.info(f"ROOM_CLEANED_UP | room={ctx.room.name} | reason=participant_timeout")
                except Exception as cleanup_error:
                    logger.error(f"ROOM_CLEANUP_FAILED | room={ctx.room.name} | error={str(cleanup_error)}")
                return
            except Exception as e:
                phone_number = self._extract_phone_from_room(ctx.room.name)
                logger.error(
                    f"PARTICIPANT_WAIT_ERROR | "
                    f"room={ctx.room.name} | "
                    f"phone={phone_number} | "
                    f"call_type={call_type} | "
                    f"error={str(e)} | "
                    f"error_type={type(e).__name__}",
                    exc_info=True
                )
                profiler.finish(success=False, error=f"Participant wait error: {str(e)}")
                
                # Log error for analytics
                await self._log_call_outcome(
                    ctx.room.name,
                    "error",
                    f"Participant wait failed: {str(e)}",
                    phone_number,
                    call_type,
                    assistant_config.get('id', 'unknown')
                )
                
                # Clean up the room on any participant wait error
                try:
                    await ctx.api.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))
                    logger.info(f"ROOM_CLEANED_UP | room={ctx.room.name} | reason=participant_wait_error")
                except Exception as cleanup_error:
                    logger.error(f"ROOM_CLEANUP_FAILED | room={ctx.room.name} | error={str(cleanup_error)}")
                return


            
            # Trigger first message if configured
            first_message = assistant_config.get("first_message", "")
            force_first = os.getenv("FORCE_FIRST_MESSAGE", "true").lower() != "false"
            if force_first and first_message:
                logger.info(f"TRIGGERING_FIRST_MESSAGE | message='{first_message}'")
                # Use direct TTS for static greeting to shave a round trip
                async with measure_latency_context("first_message_tts", call_id, {"message_length": len(first_message)}):
                    try:
                        await session.say(first_message)
                    except AttributeError:
                        # Fallback to generate_reply if say() not available
                        await session.generate_reply(
                            instructions=f"Say exactly this: '{first_message}'"
                        )
                profiler.checkpoint("first_message_sent")
            
            # Setup idle message handling using LiveKit's user state management
            idle_message_task = None
            idle_message_count = 0
            user_state = "active"  # Track state from events instead of private session state
            
            # Check if idle messages are enabled (default: enabled)
            # Disable idle messages if they interfere with speech recognition
            idle_messages_enabled = assistant_config.get("idle_messages_enabled", False)  # Changed default to False
            
            if idle_messages_enabled and assistant_config.get("idle_messages") and len(assistant_config.get("idle_messages", [])) > 0:
                logger.info(f"IDLE_MESSAGE_HANDLING_SETUP | room={ctx.room.name}")
                
                async def handle_user_away():
                    nonlocal idle_message_count, user_state
                    max_idle_messages = assistant_config.get("max_idle_messages", 3)
                    
                    # Try to ping the user with idle messages
                    for i in range(max_idle_messages):
                        if idle_message_count >= max_idle_messages:
                            break
                        
                        # Check if user has become active again before sending next message
                        if user_state != "away":
                            logger.info(f"USER_BECAME_ACTIVE | breaking idle message loop at count {idle_message_count}")
                            break
                            
                        import random
                        idle_messages = assistant_config.get("idle_messages", [])
                        if not idle_messages:
                            break
                            
                        idle_message = random.choice(idle_messages)
                        logger.info(f"IDLE_MESSAGE_TRIGGERED | message='{idle_message}' | count={idle_message_count + 1}")
                        
                        # Use direct TTS for idle messages to shave round trips
                        async with measure_latency_context("idle_message_tts", call_id, {
                            "message_length": len(idle_message),
                            "message_count": idle_message_count + 1
                        }):
                            try:
                                await session.say(idle_message)
                            except AttributeError:
                                # Fallback to generate_reply if say() not available
                                await session.generate_reply(
                                    instructions=f"Say exactly this: '{idle_message}'"
                                )
                        idle_message_count += 1
                        
                        # Wait longer between idle messages to prevent audio feedback loops
                        # Wait 15 seconds instead of 10 to give user more time to respond
                        await asyncio.sleep(15)
                    
                    # If we've reached max idle messages, end the call
                    if idle_message_count >= max_idle_messages:
                        logger.info(f"MAX_IDLE_MESSAGES_REACHED | ending call after {max_idle_messages} idle messages")
                        end_call_message = assistant_config.get("end_call_message", "Thank you for calling. Goodbye!")
                        # Use direct TTS for end call message
                        try:
                            await session.say(end_call_message)
                        except AttributeError:
                            # Fallback to generate_reply if say() not available
                            await session.generate_reply(
                                instructions=f"Say exactly this: '{end_call_message}'"
                            )
                        session.shutdown()
                
                @session.on("user_state_changed")
                def _user_state_changed(ev: UserStateChangedEvent):
                    nonlocal idle_message_task, user_state
                    old_state = user_state
                    user_state = ev.new_state
                    
                    logger.info(f"USER_STATE_CHANGED | old_state={old_state} | new_state={ev.new_state} | room={ctx.room.name}")
                    
                    if ev.new_state == "away":
                        logger.warning(f"USER_STATE_AWAY | starting idle message sequence | speech recognition may be affected")
                        idle_message_task = asyncio.create_task(handle_user_away())
                        return
                    
                    # User is back (listening, speaking, etc.)
                    if idle_message_task is not None:
                        logger.info(f"USER_STATE_ACTIVE | cancelling idle message task | speech recognition restored")
                        idle_message_task.cancel()
                        idle_message_task = None
            else:
                logger.info(f"IDLE_MESSAGES_DISABLED | room={ctx.room.name} | enabled={idle_messages_enabled} | messages_count={len(assistant_config.get('idle_messages', []))}")

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
                    analysis_results = await self._perform_post_call_analysis(assistant_config, session_history, agent, call_duration)
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
                # End the call by shutting down session and deleting the room
                try:
                    session.shutdown()
                except Exception as e:
                    logger.warning(f"SESSION_SHUTDOWN_ERROR | room={ctx.room.name} | error={str(e)}")
                
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
            profiler.finish(success=False, error=str(e))
            raise
        finally:
            # Always finish profiling and clear tracker
            profiler.finish(success=True)
            clear_tracker(call_id)

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
            assistant_result = await asyncio.wait_for(
                asyncio.to_thread(lambda: self.supabase.client.table("assistant").select("*").eq("id", assistant_id).execute()),
                timeout=5
            )
            
            if assistant_result.data and len(assistant_result.data) > 0:
                assistant_data = assistant_result.data[0]
                logger.info(f"ASSISTANT_FOUND_BY_ID | assistant_id={assistant_id}")
                logger.info(f"ASSISTANT_CONFIG_DEBUG | knowledge_base_id={assistant_data.get('knowledge_base_id')} | use_rag={assistant_data.get('use_rag')}")
                logger.info(f"ASSISTANT_CALENDAR_DEBUG | cal_api_key present: {bool(assistant_data.get('cal_api_key'))} | cal_event_type_id present: {bool(assistant_data.get('cal_event_type_id'))}")
                logger.info(f"ASSISTANT_CALENDAR_DEBUG | cal_api_key: {assistant_data.get('cal_api_key', 'NOT_FOUND')[:10]}... | cal_event_type_id: {assistant_data.get('cal_event_type_id', 'NOT_FOUND')}")
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
            phone_result = await asyncio.wait_for(
                asyncio.to_thread(lambda: self.supabase.client.table("phone_number").select("inbound_assistant_id").eq("number", phone_number).execute()),
                timeout=5
            )
            
            if not phone_result.data or len(phone_result.data) == 0:
                logger.warning(f"No assistant found for phone number: {phone_number}")
                return None
            
            assistant_id = phone_result.data[0]["inbound_assistant_id"]
            
            # Now fetch the assistant configuration
            assistant_result = await asyncio.wait_for(
                asyncio.to_thread(lambda: self.supabase.client.table("assistant").select("*").eq("id", assistant_id).execute()),
                timeout=5
            )
            
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

        # Create unified agent that combines RAG and booking capabilities
        knowledge_base_id = config.get("knowledge_base_id")
        logger.info(f"UNIFIED_AGENT_CONFIG | knowledge_base_id={knowledge_base_id}")
        
        # Initialize calendar if credentials are available
        calendar = None
        
        # Debug logging for calendar configuration
        logger.info(f"CALENDAR_DEBUG | cal_api_key present: {bool(config.get('cal_api_key'))} | cal_event_type_id present: {bool(config.get('cal_event_type_id'))}")
        logger.info(f"CALENDAR_DEBUG | cal_api_key value: {config.get('cal_api_key', 'NOT_FOUND')[:10]}... | cal_event_type_id value: {config.get('cal_event_type_id', 'NOT_FOUND')}")
        logger.info(f"CALENDAR_DEBUG | cal_timezone: {config.get('cal_timezone', 'NOT_FOUND')}")
        
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

        # Add RAG tools to instructions if knowledge base is available
        if knowledge_base_id:
            instructions += "\n\nKNOWLEDGE BASE ACCESS:\nYou have access to a knowledge base with information about the company. When users ask questions about:\n- Company history, background, or founding information\n- Products, services, or menu items\n- Business details, locations, or operations\n- Any factual information about the company\n\nIMPORTANT: Always use the query_knowledge_base tool FIRST when users ask about company facts, history, or company information. Do not answer factual questions about the company without searching the knowledge base first.\n\nExample: If user asks 'Tell me about company history', immediately call query_knowledge_base with the query 'company history' before responding."
            logger.info("RAG_TOOLS | Knowledge base tools added to instructions")

        # Create unified agent with both RAG and booking capabilities
        from services.unified_agent import UnifiedAgent
        
        # Use pre-warmed components if available
        llm_provider = config.get("llm_provider_setting", "OpenAI")
        llm_model = config.get("llm_model_setting", "gpt-4o-mini")
        config_key = f"{llm_provider}_{llm_model}"
        
        prewarmed_llm = self._prewarmed_llms.get(config_key)
        prewarmed_tts = self._prewarmed_tts.get("openai_nova")
        prewarmed_vad = self._prewarmed_vad
        
        agent = UnifiedAgent(
            instructions=instructions,
            calendar=calendar,
            knowledge_base_id=knowledge_base_id,
            company_id=config.get("company_id"),
            supabase=self.supabase,
            prewarmed_llm=prewarmed_llm,
            prewarmed_tts=prewarmed_tts,
            prewarmed_vad=prewarmed_vad
        )
        
        logger.info("UNIFIED_AGENT_CREATED | rag_enabled=%s | calendar_enabled=%s", 
                   bool(knowledge_base_id), bool(calendar))
        
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

            client = _OPENAI_CLIENT
            
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
                        {"role": "system", "content": "You are a helpful assistant that classifies data fields for voice conversations. Always respond with valid JSON only."},
                        {"role": "user", "content": classification_prompt}
                    ],
                    max_tokens=500,
                    temperature=0.1,
                    response_format={"type": "json_object"}
                ),
                timeout=12,
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
            "llama-3.1-8b-instant", "llama-3.3-70b-versatile", "meta-llama/llama-4-maverick-17b-128e-instruct"
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
                "llama3-70b-8192": "llama-3.3-70b-versatile"
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
        silence_timeout = config.get("silence_timeout", 20)  # Increased from 15 to 20 seconds
        
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
        """Block until all remote participants disconnect."""
        try:
            while True:
                remotes = getattr(ctx.room, "remote_participants", {}) or {}
                if not remotes:
                    break

                all_gone = True
                for p in remotes.values():
                    state = getattr(p, "state", None)
                    # treat anything not explicitly DISCONNECTED as still present
                    if state is None or str(state).upper() not in {"DISCONNECTED"}:
                        all_gone = False
                        break

                if all_gone:
                    break
                await asyncio.sleep(1.5)
        except Exception as e:
            logger.warning(f"SESSION_COMPLETION_WAIT_FAILED | room={ctx.room.name} | error={str(e)}")

    def _create_session(self, config: Dict[str, Any]) -> AgentSession:
        """Create agent session with proper configuration."""
        # Validate and fix model names to prevent API errors
        config = self._validate_model_names(config)
        
        # re-use prewarmed VAD, fallback if missing
        vad = getattr(self, "_prewarmed_vad", None) or silero.VAD.load()

        # Get configuration from assistant data - optimized for performance
        llm_provider = config.get("llm_provider_setting", "OpenAI")
        llm_model = config.get("llm_model_setting", "gpt-4o-mini")  # Fast model by default
        temperature = config.get("temperature_setting", 0.1)  # Lower temperature for consistency
        max_tokens = config.get("max_token_setting", 200)  # Reduced for faster responses

        voice_provider = config.get("voice_provider_setting", "OpenAI")
        voice_model = config.get("voice_model_setting", "gpt-4o-mini-tts")
        voice_name = config.get("voice_name_setting", "alloy")

        # Create LLM based on provider
        llm = self._create_llm(llm_provider, llm_model, temperature, max_tokens, config)

        # Create TTS based on provider
        tts = self._create_tts(voice_provider, voice_model, voice_name, config)

        # Create STT - prefer Deepgram streaming for better latency
        language_setting = config.get("language_setting", "en")
        
        # Map combined language codes to Deepgram-supported codes
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
        deepgram_language = language_mapping.get(language_setting, "en")
        
        # Use Deepgram streaming STT for better first-token latency
        stt = deepgram.STT(
            model="nova-3",
            interim_results=True,            # barge-in friendly
            language=deepgram_language,      # map your config same as before
            endpointing_ms=2000,             # 2 second endpointing to prevent premature cutoff
            smart_format=True,              # Better formatting of transcripts
        )

        # Get call management settings from config
        max_call_duration_minutes = config.get("max_call_duration", 30)
        silence_timeout_seconds = config.get("silence_timeout", 20)  # Increased from 15 to 20 seconds
        
        # Convert max call duration from minutes to seconds for session timeout
        max_call_duration_seconds = max_call_duration_minutes * 60

        return AgentSession(
            vad=vad,
            stt=stt,
            llm=llm,
            tts=tts,
            allow_interruptions=True,
            min_endpointing_delay=1.5,   # Increased from 0.4 to prevent premature cutoff
            max_endpointing_delay=8.0,   # Increased from 5.0 to allow longer speech segments
            user_away_timeout=silence_timeout_seconds + 30,  # Increased buffer to 50 seconds to prevent premature idle detection
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
                "llama3-70b-8192": "llama-3.3-70b-versatile"
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
                    parallel_tool_calls=True,  # Enable parallel tool calls for better performance
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
                    parallel_tool_calls=True,  # Enable parallel tool calls for better performance
                    tool_choice="auto",
                )
                logger.info(f"CEREBRAS_LLM_CONFIGURED | model={cerebras_model} | temperature={cerebras_temperature}")
                return llm
            else:
                logger.warning("CEREBRAS_API_KEY_NOT_SET | falling back to OpenAI LLM")

        # Default to OpenAI LLM with enhanced configuration
        llm = openai.LLM(
            model=model,
            client=_OPENAI_CLIENT,  # <-- use the shared AsyncOpenAI client
            temperature=float(temperature),
            parallel_tool_calls=True,  # Enable parallel tool calls for better performance
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
        
        # Create OpenAI TTS with optimized settings for speed
        openai_tts = openai.TTS(
            model="tts-1",  # Fastest model
            voice=openai_voice, 
            api_key=openai_api_key,
        )
        logger.info(f"OPENAI_TTS_CONFIGURED | model=tts-1 | voice={openai_voice}")
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
            
            # Extract names from call summary if no structured name data exists
            if analysis_data.get("call_summary") and not agent_structured_data.get("Customer Name"):
                extracted_name = self._extract_name_from_summary(analysis_data["call_summary"])
                if extracted_name:
                    agent_structured_data["Customer Name"] = {
                        "value": extracted_name,
                        "type": "string",
                        "timestamp": datetime.datetime.now().isoformat(),
                        "collection_method": "summary_extraction"
                    }
                    logger.info(f"NAME_EXTRACTED_FROM_SUMMARY | assistant_id={assistant_id} | name={extracted_name}")
            
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

            # Use shared OpenAI client
            client = _OPENAI_CLIENT
            
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
                timeout=min(max(timeout, 20), 60),
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

            # Use shared OpenAI client
            client = _OPENAI_CLIENT
            
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
                timeout=min(max(timeout, 10), 45),
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

            # Use shared OpenAI client
            client = _OPENAI_CLIENT
            
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": f"Extract the requested information from this conversation and return as JSON:\n\n{transcript_text}"}
                    ],
                    max_tokens=1000,
                    temperature=0.1,
                    response_format={"type": "json_object"}
                ),
                timeout=min(max(timeout, 20), 60),
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

    async def _perform_post_call_analysis(self, config: Dict[str, Any], session_history: list, agent, call_duration: int = 0) -> Dict[str, Any]:
        """Perform complete post-call analysis including AI-powered outcome determination."""
        analysis_results = {
            "call_summary": None,
            "call_success": None,
            "structured_data": {},
            "call_outcome": None,
            "outcome_confidence": None,
            "outcome_reasoning": None,
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
            
            logger.info(f"POST_CALL_ANALYSIS_TRANSCRIPTION | items={len(transcription)} | duration={call_duration}s")
            
            # Determine call type for outcome analysis
            call_type = "inbound"  # Default to inbound, could be determined from context
            
            # Use OpenAI to analyze call outcome
            outcome_analysis = await self.call_outcome_service.analyze_call_outcome(
                transcription=transcription,
                call_duration=call_duration,
                call_type=call_type
            )
            
            if outcome_analysis:
                analysis_results.update({
                    "call_outcome": outcome_analysis.outcome,
                    "outcome_confidence": outcome_analysis.confidence,
                    "outcome_reasoning": outcome_analysis.reasoning,
                    "outcome_key_points": outcome_analysis.key_points,
                    "outcome_sentiment": outcome_analysis.sentiment,
                    "follow_up_required": outcome_analysis.follow_up_required,
                    "follow_up_notes": outcome_analysis.follow_up_notes
                })
                logger.info(f"AI_OUTCOME_ANALYSIS | outcome={outcome_analysis.outcome} | confidence={outcome_analysis.confidence}")
            else:
                # Check actual booking status from agent before fallback analysis
                actual_booking_status = None
                if hasattr(agent, '_booking_data') and hasattr(agent._booking_data, 'booked'):
                    actual_booking_status = agent._booking_data.booked
                    logger.info(f"ACTUAL_BOOKING_STATUS | booked={actual_booking_status}")
                
                # Use actual booking status if available, otherwise fallback to heuristic
                if actual_booking_status is True:
                    analysis_results["call_outcome"] = "Booked Appointment"
                    analysis_results["outcome_confidence"] = 0.9  # High confidence for actual booking
                    analysis_results["outcome_reasoning"] = "Confirmed booking status from agent"
                    logger.info(f"BOOKING_STATUS_CONFIRMED | outcome=Booked Appointment")
                else:
                    # Fallback to heuristic-based outcome determination
                    fallback_outcome = self.call_outcome_service.get_fallback_outcome(transcription, call_duration)
                    analysis_results["call_outcome"] = fallback_outcome
                    analysis_results["outcome_confidence"] = 0.3  # Low confidence for fallback
                    analysis_results["outcome_reasoning"] = "Fallback heuristic analysis (OpenAI unavailable)"
                    logger.warning(f"FALLBACK_OUTCOME_ANALYSIS | outcome={fallback_outcome}")
            
            # Use comprehensive analysis processing like the old code
            analysis_data = await self._process_call_analysis(
                assistant_id=config.get("id"),
                transcription=transcription,  # Use processed transcription
                call_duration=call_duration,
                agent=agent,
                assistant_config=config
            )
            
            # Merge analysis results
            analysis_results.update(analysis_data)
            
            logger.info(f"POST_CALL_ANALYSIS_COMPLETE | summary={bool(analysis_results['call_summary'])} | success={analysis_results['call_success']} | outcome={analysis_results['call_outcome']} | data_fields={len(analysis_results['structured_data'])}")

        except Exception as e:
            logger.error(f"POST_CALL_ANALYSIS_ERROR | error={str(e)}")
            # Fallback to basic analysis
            try:
                if hasattr(agent, 'get_structured_data'):
                    analysis_results["structured_data"] = agent.get_structured_data()
                # Ensure we have at least a fallback outcome
                if not analysis_results.get("call_outcome"):
                    analysis_results["call_outcome"] = "Qualified"
                    analysis_results["outcome_confidence"] = 0.1
                    analysis_results["outcome_reasoning"] = "Error in analysis, using default outcome"
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
            # Check if database client is available
            if not self.supabase.is_available():
                logger.warning("Database client not available - skipping call history save")
                return
            
            # Generate call ID from room name
            call_id = ctx.room.name
            
            # Calculate call duration from provided start and end times
            call_duration = int((end_time - start_time).total_seconds())
            
            # Extract call_sid like in old implementation
            call_sid = self._extract_call_sid(ctx, participant)
            logger.info(f"CALL_SID_EXTRACTED | call_sid={call_sid}")
            
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
            
            # Determine call status from AI analysis results
            call_status = analysis_results.get("call_outcome", "Qualified")
            
            # Log the AI-determined call status
            logger.info(f"AI_CALL_STATUS_DETERMINED | status={call_status} | confidence={analysis_results.get('outcome_confidence', 'N/A')}")
            
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
                "call_sid": call_sid
            }
            
            # Add analysis results
            if analysis_results.get("call_summary"):
                call_data["call_summary"] = analysis_results["call_summary"]
            if analysis_results.get("call_success") is not None:
                # Convert boolean to string for database storage
                call_data["success_evaluation"] = "SUCCESS" if analysis_results["call_success"] else "FAILED"
            if analysis_results.get("structured_data"):
                call_data["structured_data"] = analysis_results["structured_data"]
            
            # Add outcome analysis details
            if analysis_results.get("outcome_confidence"):
                call_data["outcome_confidence"] = analysis_results["outcome_confidence"]
            if analysis_results.get("outcome_reasoning"):
                call_data["outcome_reasoning"] = analysis_results["outcome_reasoning"]
            if analysis_results.get("outcome_key_points"):
                call_data["outcome_key_points"] = analysis_results["outcome_key_points"]
            if analysis_results.get("outcome_sentiment"):
                call_data["outcome_sentiment"] = analysis_results["outcome_sentiment"]
            if analysis_results.get("follow_up_required"):
                call_data["follow_up_required"] = analysis_results["follow_up_required"]
            if analysis_results.get("follow_up_notes"):
                call_data["follow_up_notes"] = analysis_results["follow_up_notes"]
            
            # Log what we're saving
            logger.info(f"CALL_DATA_TO_SAVE | call_sid={call_data.get('call_sid')} | call_id={call_data.get('call_id')} | status={call_data.get('call_status')}")
            
            # Save to database with timeout protection
            result = await self._safe_db_insert("call_history", call_data, timeout=6)
            
            if result.data:
                logger.info(f"CALL_HISTORY_SAVED | call_id={call_id} | duration={call_duration}s | ai_status={call_status} | confidence={analysis_results.get('outcome_confidence', 'N/A')} | transcription_items={len(transcription)}")
                if transcription:
                    sample_transcript = transcription[0] if len(transcription) > 0 else {}
                    logger.info(f"TRANSCRIPTION_SAMPLE | first_entry={sample_transcript}")
            else:
                logger.error(f"CALL_HISTORY_SAVE_FAILED | call_id={call_id}")
                
        except Exception as e:
            logger.error(f"CALL_HISTORY_SAVE_ERROR | error={str(e)}")

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
    
    def _extract_name_from_summary(self, summary: str) -> str:
        """Extract customer name from call summary text."""
        if not summary:
            return None
        
        import re
        
        # Common patterns for names in summaries
        patterns = [
            r'greeting the user,?\s+([A-Z][a-z]+)',  # "greeting the user, Jane"
            r'customer\s+([A-Z][a-z]+)',  # "customer Jane"
            r'caller\s+([A-Z][a-z]+)',  # "caller Jane"
            r'user\s+([A-Z][a-z]+)',  # "user Jane"
            r'client\s+([A-Z][a-z]+)',  # "client Jane"
            r'([A-Z][a-z]+)\s+mentioned',  # "Jane mentioned"
            r'([A-Z][a-z]+)\s+requested',  # "Jane requested"
            r'([A-Z][a-z]+)\s+asked',  # "Jane asked"
            r'([A-Z][a-z]+)\s+provided',  # "Jane provided"
            r'([A-Z][a-z]+)\s+confirmed',  # "Jane confirmed"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, summary, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                # Basic validation - should be a proper name
                if len(name) >= 2 and name.isalpha() and name[0].isupper():
                    return name
        
        return None

    async def _log_call_outcome(
        self, 
        room_name: str, 
        outcome: str, 
        reason: str, 
        phone_number: str, 
        call_type: str, 
        assistant_id: str
    ):
        """Log call outcome for analytics and monitoring."""
        try:
            payload = {
                "room_name": room_name,
                "outcome": outcome,
                "reason": reason,
                "phone_number": phone_number,
                "call_type": call_type,
                "assistant_id": assistant_id,
                "timestamp": datetime.now().isoformat(),
                "duration_seconds": 0  # No duration for failed connections
            }
            
            await self._safe_db_insert("call_outcomes", payload, timeout=3)
            logger.info(f"CALL_OUTCOME_LOGGED | room={room_name} | outcome={outcome} | reason={reason}")
            
        except Exception as e:
            logger.error(f"CALL_OUTCOME_LOG_FAILED | room={room_name} | error={str(e)}")

    async def _safe_db_insert(self, table: str, payload: dict, timeout: int = 5):
        """Safely insert data into database with timeout protection."""
        try:
            return await asyncio.wait_for(
                asyncio.to_thread(lambda: self.supabase.client.table(table).insert(payload).execute()),
                timeout=timeout
            )
        except asyncio.TimeoutError:
            logger.error(f"DATABASE_INSERT_TIMEOUT | table={table} | timeout={timeout}s")
            raise
        except Exception as e:
            logger.error(f"DATABASE_INSERT_ERROR | table={table} | error={str(e)}")
            raise


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
    # reuse prewarmed VAD if present
    if "vad" in ctx.proc.userdata:
        handler._prewarmed_vad = ctx.proc.userdata["vad"]
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
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        prewarm_fnc=prewarm,
        agent_name=agent_name,
    ))