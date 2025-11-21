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
    UserStateChangedEvent,
    RoomInputOptions,
    RoomOutputOptions,
    AutoSubscribe,
)

try:
    from livekit.agents import BackgroundAudioPlayer, AudioConfig, BuiltinAudioClip
    BACKGROUND_AUDIO_SUPPORTED = True
except ImportError:
    BackgroundAudioPlayer = None  # type: ignore
    AudioConfig = None  # type: ignore
    BuiltinAudioClip = None  # type: ignore
    BACKGROUND_AUDIO_SUPPORTED = False

# Plugin imports
from livekit.plugins import openai, silero
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
    from livekit.plugins import rime as lk_rime
    RIME_AVAILABLE = True
except ImportError:
    lk_rime = None
    RIME_AVAILABLE = False

try:
    from livekit.plugins import hume as lk_hume
    HUME_AVAILABLE = True
except ImportError:
    lk_hume = None
    HUME_AVAILABLE = False

try:
    from livekit.plugins import deepgram as lk_deepgram
    DEEPGRAM_AVAILABLE = True
except ImportError:
    lk_deepgram = None
    DEEPGRAM_AVAILABLE = False

try:
    from livekit.plugins import cartesia as lk_cartesia
    CARTESIA_AVAILABLE = True
except ImportError:
    lk_cartesia = None
    CARTESIA_AVAILABLE = False
except Exception:
    lk_cartesia = None
    CARTESIA_AVAILABLE = False

try:
    import openai as cerebras_client
    CEREBRAS_AVAILABLE = True
except ImportError:
    CEREBRAS_AVAILABLE = False

# Local imports
from services.call_outcome_service import CallOutcomeService
from services.agent_factory import AgentFactory
from services.config_resolver import ConfigResolver
from integrations.supabase_client import SupabaseClient
from integrations.calendar_api import CalComCalendar, CalendarResult, CalendarError
from config.database import get_database_client
from utils.logging_hardening import configure_safe_logging
from utils.latency_logger import (
    measure_latency_context, 
    get_tracker, 
    clear_tracker,
    LatencyProfiler
)
from utils.data_extractors import extract_phone_from_room, extract_name_from_summary, extract_call_sid_from_metadata

# Configure logging with security hardening
configure_safe_logging(level=logging.INFO)
logger = logging.getLogger(__name__)

# Log Cartesia availability status after logger is initialized
if CARTESIA_AVAILABLE:
    logger.info("CARTESIA_PACKAGE_LOADED | Cartesia plugin successfully imported")
else:
    logger.warning("CARTESIA_IMPORT_FAILED | Cartesia plugin not available - install with: pip install livekit-plugins-cartesia")

# Enable DEBUG logging for livekit.agents to see detailed transcript information
logging.getLogger("livekit.agents").setLevel(logging.DEBUG)

# Enable DEBUG logging for Hume plugin to capture detailed error responses
if HUME_AVAILABLE:
    logging.getLogger("livekit.plugins.hume").setLevel(logging.DEBUG)


def _build_background_ambient_config(setting: Optional[str]):
    """Return an AudioConfig or list of configs for the requested ambient preset."""
    if not BACKGROUND_AUDIO_SUPPORTED or AudioConfig is None or BuiltinAudioClip is None:
        return None

    if not setting:
        return None

    key = str(setting).strip().lower()
    if key in {"", "none", "off"}:
        return None

    if key == "office":
        return AudioConfig(BuiltinAudioClip.OFFICE_AMBIENCE, volume=0.45)

    if key == "lounge":
        return [
            AudioConfig(BuiltinAudioClip.OFFICE_AMBIENCE, volume=0.32, probability=0.7),
            AudioConfig(BuiltinAudioClip.KEYBOARD_TYPING, volume=0.18, probability=0.3),
        ]

    if key == "restaurant":
        return [
            AudioConfig(BuiltinAudioClip.OFFICE_AMBIENCE, volume=0.55, probability=0.6),
            AudioConfig(BuiltinAudioClip.KEYBOARD_TYPING2, volume=0.25, probability=0.4),
        ]

    # Map frontend options to available clips
    # Note: LiveKit only has OFFICE_AMBIENCE, KEYBOARD_TYPING, KEYBOARD_TYPING2
    # Using OFFICE_AMBIENCE as base for cafe/nature/white-noise with different volumes
    if key == "cafe":
        # Cafe ambiance - use office ambience with slightly higher volume
        return AudioConfig(BuiltinAudioClip.OFFICE_AMBIENCE, volume=0.50)
    
    if key == "nature":
        # Nature sounds - use office ambience with lower volume for subtle effect
        return AudioConfig(BuiltinAudioClip.OFFICE_AMBIENCE, volume=0.35)
    
    if key == "white-noise" or key == "white_noise":
        # White noise - use keyboard typing sounds for consistent background
        return [
            AudioConfig(BuiltinAudioClip.KEYBOARD_TYPING, volume=0.20, probability=0.5),
            AudioConfig(BuiltinAudioClip.KEYBOARD_TYPING2, volume=0.20, probability=0.5),
        ]

    logger.debug("BACKGROUND_AUDIO_PRESET_UNKNOWN | setting=%s", key)
    return None

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
        
        # Initialize refactored components
        self.config_resolver = ConfigResolver(self.supabase)
        
        # Pre-warm critical components for faster response
        self._prewarmed_agents = {}
        self._prewarmed_llms = {}
        self._prewarmed_tts = {}
        self._prewarmed_vad = None
        self._prewarmed_rag = None
        
        # Latency monitoring variables
        self.end_of_utterance_delay = 0
        self.llm_latency = 0
        self.tts_latency = 0
        
        # Track idle message counts per session
        self._idle_message_counts = {}
        
        # Start pre-warming in background
        asyncio.create_task(self._prewarm_components())

    async def _prewarm_components(self):
        """Pre-warm critical components to eliminate cold start latency."""
        try:
            # logger.info("PREWARM_START | warming up system components")
            
            # Pre-warm VAD (Voice Activity Detection)
            self._prewarmed_vad = silero.VAD.load()
            # logger.info("PREWARM_VAD | VAD loaded successfully")
            
            # Pre-warm RAG service
            from services.rag_service import RAGService
            self._prewarmed_rag = RAGService()  # RAGService initializes itself in constructor
            # logger.info("PREWARM_RAG | RAG service initialized")
            
            # LLM will be created dynamically based on assistant configuration
            # No hardcoded LLM prewarming - each assistant uses its own LLM settings
            logger.info("PREWARM_LLM | LLM will be created dynamically per assistant config")
            
            # Pre-warm TTS with default settings (removed hardcoded OpenAI prewarming)
            # TTS will be created dynamically based on assistant configuration
            logger.info("PREWARM_TTS | TTS will be created dynamically per assistant config")
            
            # logger.info("PREWARM_COMPLETE | all components warmed up")
            
        except Exception as e:
            # logger.error("PREWARM_ERROR | failed to pre-warm components: %s", str(e))
            pass

    def _on_metrics_collected(self, event: MetricsCollectedEvent):
        """Handle metrics collection events for latency monitoring."""
        try:
            if event.type != "metrics_collected":
                return

            # Update latency variables based on metric type
            if event.metrics.type == "eou_metrics":
                self.end_of_utterance_delay = event.metrics.end_of_utterance_delay
                logger.info(f"LATENCY_EOU | end_of_utterance_delay={self.end_of_utterance_delay}s")

            elif event.metrics.type == "llm_metrics":
                self.llm_latency = event.metrics.ttft
                logger.info(f"LATENCY_LLM | ttft={self.llm_latency}s")

            elif event.metrics.type == "tts_metrics":
                self.tts_latency = event.metrics.ttfb
                # Calculate and log total latency when TTS completes
                total_latency = self.end_of_utterance_delay + self.llm_latency + self.tts_latency
                logger.info(f"LATENCY_TTS | ttfb={self.tts_latency}s")
                logger.info(f"LATENCY_TOTAL | transcription_delay={self.end_of_utterance_delay}s | llm={self.llm_latency}s | tts={self.tts_latency}s | total={total_latency}s")

        except Exception as e:
            logger.error(f"METRICS_COLLECTION_ERROR | error={str(e)}")

    async def _on_user_state_changed(self, event: UserStateChangedEvent, session: AgentSession, config: Dict[str, Any], ctx: JobContext) -> None:
        """Handle user state changes to send idle messages when user goes away."""
        try:
            session_id = id(session)
            
            # Reset idle message count when user returns from away state
            if event.old_state == "away" and event.new_state != "away":
                if session_id in self._idle_message_counts:
                    self._idle_message_counts[session_id] = 0
                    logger.info(f"IDLE_MESSAGE_RESET | user returned from away state")
                return
            
            # Only handle transitions to 'away' state
            if event.new_state != "away":
                return
            
            # Initialize count for this session if not exists
            if session_id not in self._idle_message_counts:
                self._idle_message_counts[session_id] = 0
            
            # Get idle message configuration
            idle_messages = config.get("idle_messages", [])
            max_idle_messages = config.get("max_idle_messages", 3)
            
            # Check if we have idle messages configured
            if not idle_messages or not isinstance(idle_messages, list) or len(idle_messages) == 0:
                logger.debug("IDLE_MESSAGE_SKIP | no idle messages configured")
                return
            
            # Check if we've exceeded the maximum
            current_count = self._idle_message_counts[session_id]
            if current_count >= max_idle_messages:
                logger.info(f"IDLE_MESSAGE_MAX_REACHED | count={current_count} | max={max_idle_messages} | ending call")
                # End the call after max idle messages
                try:
                    # Disconnect the room using the context
                    await ctx.room.disconnect()
                    logger.info("IDLE_MESSAGE_DISCONNECT_SUCCESS | room disconnected")
                except Exception as disconnect_error:
                    logger.error(f"IDLE_MESSAGE_DISCONNECT_ERROR | error={str(disconnect_error)}")
                    # Fallback: try to close the session
                    try:
                        await session.aclose()
                    except Exception as close_error:
                        logger.error(f"IDLE_MESSAGE_CLOSE_ERROR | error={str(close_error)}")
                return
            
            # Select an idle message (cycle through available messages)
            message_index = current_count % len(idle_messages)
            idle_message = idle_messages[message_index]
            
            # Increment the count
            self._idle_message_counts[session_id] = current_count + 1
            
            logger.info(f"IDLE_MESSAGE_SENDING | count={current_count + 1}/{max_idle_messages} | message='{idle_message[:60]}{'...' if len(idle_message) > 60 else ''}'")
            
            # Send the idle message
            try:
                await session.say(idle_message)
                logger.info(f"IDLE_MESSAGE_SENT | count={current_count + 1}/{max_idle_messages}")
            except AttributeError:
                # Fallback if say() not available
                await session.generate_reply(
                    instructions=f"Say exactly this: '{idle_message}'"
                )
                logger.info(f"IDLE_MESSAGE_SENT_FALLBACK | count={current_count + 1}/{max_idle_messages}")
            except Exception as say_error:
                logger.error(f"IDLE_MESSAGE_SEND_ERROR | error={str(say_error)}")
                
        except Exception as e:
            logger.error(f"IDLE_MESSAGE_HANDLER_ERROR | error={str(e)}")

    def _start_max_call_duration_timer(self, ctx: JobContext, config: Dict[str, Any], session: AgentSession) -> None:
        """Automatically hang up the call once the configured max duration elapses."""
        max_call_duration_minutes = config.get("max_call_duration")
        try:
            max_call_duration_minutes = float(max_call_duration_minutes)
        except (TypeError, ValueError):
            max_call_duration_minutes = 0

        if not max_call_duration_minutes or max_call_duration_minutes <= 0:
            return

        duration_seconds = int(max_call_duration_minutes * 60)
        if duration_seconds <= 0:
            return

        logger.info(f"MAX_DURATION_TIMER_START | duration_seconds={duration_seconds}")

        async def enforce_max_duration():
            try:
                await asyncio.sleep(duration_seconds)
                logger.info("MAX_DURATION_REACHED | saying end call message before hanging up")
                
                # Say end call message if configured
                end_call_message = config.get("end_call_message")
                if end_call_message:
                    try:
                        logger.info(f"MAX_DURATION_END_MESSAGE | message='{end_call_message[:60]}{'...' if len(end_call_message) > 60 else ''}'")
                        try:
                            await session.say(end_call_message)
                        except AttributeError:
                            # Fallback if say() not available
                            await session.generate_reply(instructions=f"Say exactly this: '{end_call_message}'")
                        
                        # Wait for message to be spoken (estimate: ~3 seconds for short messages, up to 10 seconds for longer ones)
                        message_duration = min(len(end_call_message) * 0.1, 10)  # Rough estimate: 0.1s per character, max 10s
                        await asyncio.sleep(max(message_duration, 3))  # At least 3 seconds
                        logger.info("MAX_DURATION_END_MESSAGE_SPOKEN | waiting complete")
                    except Exception as message_error:
                        logger.error(f"MAX_DURATION_END_MESSAGE_ERROR | error={str(message_error)}")
                        # Continue to hangup even if message failed
                
                logger.info("MAX_DURATION_HANGUP | hanging up call by deleting room")
                try:
                    # Use delete_room API to properly hang up the call for all participants
                    # This is the recommended way per LiveKit telephony docs
                    await ctx.api.room.delete_room(
                        api.DeleteRoomRequest(
                            room=ctx.room.name,
                        )
                    )
                    logger.info("MAX_DURATION_HANGUP_SUCCESS | room deleted successfully")
                except Exception as delete_error:
                    logger.error(f"MAX_DURATION_HANGUP_FAILED | error={str(delete_error)}")
                    # Fallback to disconnect if delete_room fails
                    try:
                        await ctx.room.disconnect()
                        logger.info("MAX_DURATION_HANGUP_FALLBACK | used room.disconnect()")
                    except Exception as disconnect_error:
                        logger.error(f"MAX_DURATION_HANGUP_FALLBACK_FAILED | error={str(disconnect_error)}")
            except asyncio.CancelledError:
                logger.info("MAX_DURATION_TIMER_CANCELLED")
                raise
            except Exception as e:
                logger.error(f"MAX_DURATION_TIMER_ERROR | error={str(e)}")

        timer_task = asyncio.create_task(enforce_max_duration())

        async def cancel_timer():
            if timer_task.done():
                return
            timer_task.cancel()
            try:
                await timer_task
            except asyncio.CancelledError:
                pass

        ctx.add_shutdown_callback(cancel_timer)

    async def _maybe_start_background_audio(self, ctx: JobContext, session: AgentSession, config: Dict[str, Any]):
        """Start background audio if the assistant has an ambient preset configured."""
        background_setting = config.get("background_sound_setting")
        
        if not BACKGROUND_AUDIO_SUPPORTED or BackgroundAudioPlayer is None:
            logger.debug(
                "BACKGROUND_AUDIO_SKIPPED | room=%s | reason=NOT_SUPPORTED | setting=%s",
                ctx.room.name,
                background_setting
            )
            return None

        if not background_setting:
            logger.debug(
                "BACKGROUND_AUDIO_SKIPPED | room=%s | reason=NO_SETTING",
                ctx.room.name
            )
            return None

        ambient_config = _build_background_ambient_config(background_setting)
        if not ambient_config:
            # Check if this is a valid "off" setting or an invalid/unknown setting
            key = str(background_setting).strip().lower() if background_setting else ""
            if key in {"", "none", "off"}:
                # Valid "off" setting - log as debug, not warning
                logger.debug(
                    "BACKGROUND_AUDIO_SKIPPED | room=%s | reason=OFF_SETTING | setting=%s",
                    ctx.room.name,
                    background_setting
                )
            else:
                # Invalid/unknown setting - log as warning
                logger.warning(
                    "BACKGROUND_AUDIO_SKIPPED | room=%s | reason=INVALID_SETTING | setting=%s",
                    ctx.room.name,
                    background_setting
                )
            return None

        player = BackgroundAudioPlayer(ambient_sound=ambient_config)
        try:
            await player.start(room=ctx.room, agent_session=session)
            logger.info(
                "BACKGROUND_AUDIO_STARTED | room=%s | preset=%s",
                ctx.room.name,
                background_setting,
            )
        except Exception as e:
            logger.error(
                "BACKGROUND_AUDIO_START_FAILED | room=%s | preset=%s | error=%s",
                ctx.room.name,
                background_setting,
                str(e),
                exc_info=True
            )
            try:
                await player.aclose()
            except Exception:
                pass
            return None

        async def stop_player():
            try:
                await player.aclose()
                logger.info("BACKGROUND_AUDIO_STOPPED | room=%s", ctx.room.name)
            except Exception as close_error:
                logger.error("BACKGROUND_AUDIO_STOP_FAILED | error=%s", str(close_error))

        ctx.add_shutdown_callback(stop_player)
        return player

    async def handle_call(self, ctx: JobContext) -> None:
        """Handle incoming call with proper LiveKit patterns."""
        call_id = ctx.room.name  # Use room name as call ID
        profiler = LatencyProfiler(call_id, "call_processing")
        
        try:
            # Measure connection latency
            async with measure_latency_context("room_connection", call_id):
                await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
                # logger.info(f"CONNECTED | room={ctx.room.name}")

            profiler.checkpoint("connected")

            # Log job metadata for debugging
            # logger.info(f"JOB_METADATA | metadata={ctx.job.metadata}")

            # Measure call type determination and config resolution
            async with measure_latency_context("call_type_determination", call_id):
                call_type = self._determine_call_type(ctx)
                assistant_config = await self.config_resolver.resolve_assistant_config(ctx, call_type)

            profiler.checkpoint("config_resolved", {"call_type": call_type})

            if not assistant_config:
                # logger.error(f"NO_ASSISTANT_CONFIG | room={ctx.room.name}")
                profiler.finish(success=False, error="No assistant config found")
                return

            # Check minutes availability before starting call
            user_id = assistant_config.get("user_id")
            if user_id:
                db_client = get_database_client()
                if db_client:
                    minutes_check = await db_client.check_minutes_available(user_id)
                    if not minutes_check.get("available", True) and not minutes_check.get("unlimited", False):
                        remaining = minutes_check.get("remaining_minutes", 0)
                        logger.warning(f"MINUTES_INSUFFICIENT | user={user_id} | remaining={remaining} | call_rejected")
                        # Disconnect the call if no minutes available
                        await ctx.room.disconnect()
                        profiler.finish(success=False, error=f"Insufficient minutes: {remaining} remaining")
                        return
                    elif minutes_check.get("unlimited"):
                        logger.info(f"MINUTES_CHECK | user={user_id} | unlimited_plan")
                    else:
                        remaining = minutes_check.get("remaining_minutes", 0)
                        logger.info(f"MINUTES_CHECK | user={user_id} | remaining={remaining}")

            # Handle outbound calls
            if call_type == "outbound":
                async with measure_latency_context("outbound_call_handling", call_id):
                    await self._handle_outbound_call(ctx, assistant_config)
                profiler.checkpoint("outbound_handled")

            # Create session and agent BEFORE waiting for participant to start listening immediately
            async with measure_latency_context("session_creation", call_id):
                session = self._create_session(assistant_config)
                
                # Initialize agent factory with pre-warmed components
                agent_factory = AgentFactory(
                    self.supabase,
                    self._prewarmed_llms,
                    self._prewarmed_tts,
                    self._prewarmed_vad
                )
                
                agent = await agent_factory.create_agent(assistant_config)

            profiler.checkpoint("agent_created")

            # Register metrics collection event handler for latency monitoring
            session.on("metrics_collected", self._on_metrics_collected)
            
            # Register user state changed event handler for idle messages
            # Note: .on() requires a synchronous callback, so we use asyncio.create_task
            def handle_user_state_changed(event: UserStateChangedEvent):
                asyncio.create_task(self._on_user_state_changed(event, session, assistant_config, ctx))
            session.on("user_state_changed", handle_user_state_changed)

            # Start the session IMMEDIATELY to begin listening for speech
            async with measure_latency_context("session_start", call_id):
                # Store room name in agent for transfer operations
                if hasattr(agent, 'set_room_name'):
                    agent.set_room_name(ctx.room.name)
                
                await session.start(
                    agent=agent,
                    room=ctx.room,
                    room_input_options=RoomInputOptions(close_on_disconnect=True),
                    room_output_options=RoomOutputOptions(transcription_enabled=True)  # Enable transcription for better speech recognition
                )
            # logger.info(f"SESSION_STARTED | room={ctx.room.name} | listening for speech")
            profiler.checkpoint("session_started")

            # Start ambient audio if configured
            await self._maybe_start_background_audio(ctx, session, assistant_config)

            # Trigger first message if configured
            first_message = assistant_config.get("first_message", "")
            force_first = os.getenv("FORCE_FIRST_MESSAGE", "true").lower() != "false"
            if force_first and first_message:
                # logger.info(f"TRIGGERING_FIRST_MESSAGE | message='{first_message}'")
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

            # Wait for participant with configurable timeout
            participant_timeout = float(os.getenv("PARTICIPANT_TIMEOUT_SECONDS", "35.0"))
            try:
                async with measure_latency_context("participant_wait", call_id, {"timeout_seconds": participant_timeout}):
                    participant = await asyncio.wait_for(
                        ctx.wait_for_participant(),
                        timeout=participant_timeout
                    )
                # logger.info(f"PARTICIPANT_CONNECTED | phone={extract_phone_from_room(ctx.room.name)}")
                profiler.checkpoint("participant_connected")
            except asyncio.TimeoutError:
                phone_number = extract_phone_from_room(ctx.room.name)
                # logger.error(f"PARTICIPANT_TIMEOUT | phone={phone_number} | timeout={participant_timeout}s")
                profiler.finish(success=False, error="Participant timeout")
                return

            # Enforce maximum call duration if configured
            self._start_max_call_duration_timer(ctx, assistant_config, session)

            # Register shutdown callback to ensure proper cleanup and analysis
            start_time = datetime.datetime.now()
            session_id = id(session)
            async def save_call_on_shutdown():
                # Clean up idle message count for this session
                if session_id in self._idle_message_counts:
                    del self._idle_message_counts[session_id]
                
                end_time = datetime.datetime.now()
                call_duration = int((end_time - start_time).total_seconds())
                
                # Get session history for analysis
                session_history = []
                try:
                    # Try to get transcript from the authoritative source
                    if hasattr(session, 'transcript') and session.transcript:
                        transcript_dict = session.transcript.to_dict()
                        session_history = transcript_dict.get("items", [])
                        # logger.info(f"TRANSCRIPT_FROM_SESSION | items={len(session_history)}")
                    elif hasattr(session, 'history') and session.history:
                        history_dict = session.history.to_dict()
                        session_history = history_dict.get("items", [])
                        # logger.info(f"HISTORY_FROM_SESSION | items={len(session_history)}")
                    else:
                        # logger.warning("NO_SESSION_TRANSCRIPT_AVAILABLE")
                        pass
                except Exception as e:
                    # logger.error(f"SESSION_HISTORY_READ_FAILED | error={str(e)}")
                    session_history = []

                # Perform post-call analysis and save to database
                try:
                    analysis_results = await self._perform_post_call_analysis(assistant_config, session_history, agent, call_duration)
                    # logger.info(f"POST_CALL_ANALYSIS_RESULTS | summary={bool(analysis_results.get('call_summary'))} | success={analysis_results.get('call_success')} | data_fields={len(analysis_results.get('structured_data', {}))}")
                    
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
                    # logger.error(f"POST_CALL_ANALYSIS_FAILED | error={str(e)}")
                    pass

            # Register shutdown callback to ensure proper cleanup and analysis
            ctx.add_shutdown_callback(save_call_on_shutdown)

            # Wait for session completion
            await self._wait_for_session_completion(session, ctx)

            profiler.finish(success=True)
            # logger.info(f"CALL_COMPLETED | room={ctx.room.name}")

        except Exception as e:
            # logger.error(f"CALL_ERROR | room={ctx.room.name} | error={str(e)}", exc_info=True)
            profiler.finish(success=False, error=str(e))
            raise

    def _determine_call_type(self, ctx: JobContext) -> str:
        """Determine the type of call based on room name and metadata."""
        room_name = ctx.room.name.lower()
        
        # Check room metadata for call type
        if ctx.room.metadata:
            try:
                room_metadata = json.loads(ctx.room.metadata)
                if room_metadata.get("source") == "web":
                    return "web"
                if room_metadata.get("callType") == "web":
                    return "web"
                if room_metadata.get("source") == "outbound":
                    return "outbound"
            except (json.JSONDecodeError, KeyError):
                pass
        
        # Check job metadata
        if ctx.job.metadata:
            try:
                job_metadata = json.loads(ctx.job.metadata)
                if job_metadata.get("source") == "web":
                    return "web"
                if job_metadata.get("assistantId") or job_metadata.get("assistant_id"):
                    return "inbound_with_assistant"
            except (json.JSONDecodeError, KeyError):
                pass
        
        # Fall back to room name patterns
        if room_name.startswith("outbound"):
            return "outbound"
        elif room_name.startswith("inbound"):
            return "inbound"
        elif room_name.startswith("assistant") or room_name.startswith("web"):
            return "web"
        else:
            return "inbound"

    async def _handle_outbound_call(self, ctx: JobContext, assistant_config: Dict[str, Any]) -> None:
        """Handle outbound call specific logic."""
        try:
            # Extract call metadata
            metadata = json.loads(ctx.job.metadata) if ctx.job.metadata else {}
            call_sid = extract_call_sid_from_metadata(metadata)
            
            if call_sid:
                # logger.info(f"OUTBOUND_CALL_SID | call_sid={call_sid}")
                pass
            else:
                # logger.warning("OUTBOUND_NO_CALL_SID | no call_sid found in metadata")
                pass
                
        except Exception as e:
            # logger.error(f"OUTBOUND_HANDLING_ERROR | error={str(e)}")
            pass

    async def _wait_for_session_completion(self, session: AgentSession, ctx: JobContext) -> None:
        """Block until all remote participants disconnect."""
        try:
            await session.wait()
        except Exception as e:
            # logger.error(f"SESSION_WAIT_ERROR | error={str(e)}")
            pass

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
            
            # logger.info(f"POST_CALL_ANALYSIS_TRANSCRIPTION | items={len(transcription)} | duration={call_duration}s")
            
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
                # logger.info(f"AI_OUTCOME_ANALYSIS | outcome={outcome_analysis.outcome} | confidence={outcome_analysis.confidence}")
            else:
                # Check actual booking status from agent before fallback analysis
                actual_booking_status = None
                if hasattr(agent, '_booking_data') and hasattr(agent._booking_data, 'booked'):
                    actual_booking_status = agent._booking_data.booked
                    # logger.info(f"ACTUAL_BOOKING_STATUS | booked={actual_booking_status}")
                
                # Use actual booking status if available, otherwise fallback to heuristic
                if actual_booking_status is True:
                    analysis_results["call_outcome"] = "Booked Appointment"
                    analysis_results["outcome_confidence"] = 0.9  # High confidence for actual booking
                    analysis_results["outcome_reasoning"] = "Confirmed booking status from agent"
                    # logger.info(f"BOOKING_STATUS_CONFIRMED | outcome=Booked Appointment")
                else:
                    # Fallback to heuristic-based outcome determination
                    fallback_outcome = self.call_outcome_service.get_fallback_outcome(transcription, call_duration)
                    analysis_results["call_outcome"] = fallback_outcome
                    analysis_results["outcome_confidence"] = 0.3  # Low confidence for fallback
                    analysis_results["outcome_reasoning"] = "Fallback heuristic analysis (OpenAI unavailable)"
                    # logger.warning(f"FALLBACK_OUTCOME_ANALYSIS | outcome={fallback_outcome}")
            
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
            
            # logger.info(f"POST_CALL_ANALYSIS_COMPLETE | summary={bool(analysis_results['call_summary'])} | success={analysis_results['call_success']} | outcome={analysis_results['call_outcome']} | data_fields={len(analysis_results['structured_data'])}")

        except Exception as e:
            # logger.error(f"POST_CALL_ANALYSIS_ERROR | error={str(e)}")
            # Fallback to basic analysis
            try:
                if hasattr(agent, 'get_structured_data'):
                    analysis_results["structured_data"] = agent.get_structured_data()
                if hasattr(agent, 'get_call_summary'):
                    analysis_results["call_summary"] = agent.get_call_summary()
                if hasattr(agent, 'get_call_success'):
                    analysis_results["call_success"] = agent.get_call_success()
            except Exception as fallback_error:
                # logger.error(f"FALLBACK_ANALYSIS_ERROR | error={str(fallback_error)}")
                pass

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
                # logger.warning("Database client not available - skipping call history save")
                return
            
            # Generate call ID from room name
            call_id = ctx.room.name
            
            # Calculate call duration from provided start and end times
            call_duration = int((end_time - start_time).total_seconds())
            
            # Extract call_sid like in old implementation
            call_sid = self._extract_call_sid(ctx, participant)
            # logger.info(f"CALL_SID_EXTRACTED | call_sid={call_sid}")
            
            # Process transcription from session history
            transcription = []
            # logger.info(f"SESSION_HISTORY_DEBUG | items_count={len(session_history)}")
            
            for i, item in enumerate(session_history):
                # logger.info(f"SESSION_ITEM_{i} | type={type(item)} | content={str(item)[:100]}...")
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
                        # logger.info(f"TRANSCRIPTION_ADDED | role={item['role']} | content_length={len(content.strip())}")
            
            # logger.info(f"TRANSCRIPTION_PREPARED | session_items={len(session_history)} | transcription_items={len(transcription)}")
            
            # Determine call status from AI analysis results
            call_status = analysis_results.get("call_outcome", "Qualified")
            
            # Log the AI-determined call status
            # logger.info(f"AI_CALL_STATUS_DETERMINED | status={call_status} | confidence={analysis_results.get('outcome_confidence', 'N/A')}")
            
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
                # logger.info(f"CONTACT_NAME_EXTRACTED | from_analysis={contact_name} | structured_data_keys={list(structured_data.keys())}")
            
            # Use contact name if available, otherwise fall back to participant identity or phone number
            participant_identity = (
                contact_name or 
                (participant.identity if participant else None) or 
                extract_phone_from_room(ctx.room.name)
            )
            
            # logger.info(f"PARTICIPANT_IDENTITY_DETERMINED | phone={extract_phone_from_room(ctx.room.name)}")

            # Prepare call data
            call_data = {
                "call_id": call_id,
                "assistant_id": assistant_config.get("id"),
                "phone_number": extract_phone_from_room(ctx.room.name),
                "participant_identity": extract_phone_from_room(ctx.room.name),
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
            # logger.info(f"CALL_DATA_TO_SAVE | call_sid={call_data.get('call_sid')} | call_id={call_data.get('call_id')} | status={call_data.get('call_status')}")
            
            # Save to database with timeout protection (old approach)
            result = await self._safe_db_insert("call_history", call_data, timeout=6)
            
            if result.data:
                # logger.info(f"CALL_HISTORY_SAVED | call_id={call_id} | duration={call_duration}s | ai_status={call_status} | confidence={analysis_results.get('outcome_confidence', 'N/A')} | transcription_items={len(transcription)}")
                if transcription:
                    sample_transcript = transcription[0] if len(transcription) > 0 else {}
                    # logger.info(f"TRANSCRIPTION_SAMPLE | first_entry={sample_transcript}")
                
                # Deduct minutes from user account after call completes
                user_id = assistant_config.get("user_id")
                if user_id and call_duration > 0:
                    db_client = get_database_client()
                    if db_client:
                        # Convert seconds to minutes (round up)
                        minutes_used = call_duration / 60.0
                        deduction_result = await db_client.deduct_minutes(user_id, minutes_used)
                        if deduction_result.get("success"):
                            remaining = deduction_result.get("remaining_minutes", 0)
                            exceeded = deduction_result.get("exceeded_limit", False)
                            logger.info(f"MINUTES_DEDUCTED | user={user_id} | minutes={minutes_used:.2f} | remaining={remaining} | exceeded={exceeded}")
                            if exceeded:
                                logger.warning(f"MINUTES_LIMIT_EXCEEDED | user={user_id} | used={deduction_result.get('minutes_used')} | limit={deduction_result.get('minutes_limit')}")
                        else:
                            logger.error(f"MINUTES_DEDUCTION_FAILED | user={user_id} | error={deduction_result.get('error')}")
            else:
                # logger.error(f"CALL_HISTORY_SAVE_FAILED | call_id={call_id}")
                pass
                
        except Exception as e:
            # logger.error(f"CALL_HISTORY_SAVE_ERROR | error={str(e)}")
            pass

    def _extract_call_sid(self, ctx: JobContext, participant) -> Optional[str]:
        """Extract call_sid from various sources like in old implementation."""
        call_sid = None
        
        try:
            # Try to get call_sid from participant attributes
            if hasattr(participant, 'attributes') and participant.attributes:
                if hasattr(participant.attributes, 'get'):
                    call_sid = participant.attributes.get('sip.twilio.callSid')
                    if call_sid:
                        # logger.info(f"CALL_SID_FROM_PARTICIPANT_ATTRIBUTES | call_sid={call_sid}")
                        pass
                
                # Try SIP attributes if not found
                if not call_sid and hasattr(participant.attributes, 'sip'):
                    sip_attrs = participant.attributes.sip
                    if hasattr(sip_attrs, 'twilio') and hasattr(sip_attrs.twilio, 'callSid'):
                        call_sid = sip_attrs.twilio.callSid
                        if call_sid:
                            # logger.info(f"CALL_SID_FROM_SIP_ATTRIBUTES | call_sid={call_sid}")
                            pass
        except Exception as e:
            # logger.warning(f"Failed to get call_sid from participant attributes: {str(e)}")
            pass

        # Try room metadata if not found
        if not call_sid and hasattr(ctx.room, 'metadata') and ctx.room.metadata:
            try:
                room_meta = json.loads(ctx.room.metadata) if isinstance(ctx.room.metadata, str) else ctx.room.metadata
                call_sid = room_meta.get('call_sid') or room_meta.get('CallSid') or room_meta.get('provider_id')
                if call_sid:
                    # logger.info(f"CALL_SID_FROM_ROOM_METADATA | call_sid={call_sid}")
                    pass
            except Exception as e:
                # logger.warning(f"Failed to parse room metadata for call_sid: {str(e)}")
                pass

        # Try participant metadata if not found
        if not call_sid and hasattr(participant, 'metadata') and participant.metadata:
            try:
                participant_meta = json.loads(participant.metadata) if isinstance(participant.metadata, str) else participant.metadata
                call_sid = participant_meta.get('call_sid') or participant_meta.get('CallSid') or participant_meta.get('provider_id')
                if call_sid:
                    # logger.info(f"CALL_SID_FROM_PARTICIPANT_METADATA | call_sid={call_sid}")
                    pass
            except Exception as e:
                # logger.warning(f"Failed to parse participant metadata for call_sid: {str(e)}")
                pass

        if not call_sid:
            # logger.warning("CALL_SID_NOT_FOUND | no call_sid available from any source")
            pass
        
        return call_sid

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
            # logger.info(f"PROCESS_CALL_ANALYSIS_START | assistant_id={assistant_id} | transcription_items={len(transcription)}")
            
            # Generate call summary if configured
            call_summary_prompt = assistant_config.get("analysis_summary_prompt")
            if call_summary_prompt:
                try:
                    analysis_data["call_summary"] = await self._generate_call_summary_with_llm(
                        transcription=transcription,
                        prompt=call_summary_prompt,
                        timeout=assistant_config.get("analysis_summary_timeout", 30)
                    )
                    # logger.info(f"CALL_SUMMARY_GENERATED | assistant_id={assistant_id} | length={len(analysis_data['call_summary']) if analysis_data['call_summary'] else 0}")
                except Exception as e:
                    # logger.warning(f"CALL_SUMMARY_FAILED | assistant_id={assistant_id} | error={str(e)}")
                    pass
            
            # Evaluate call success if configured
            success_prompt = assistant_config.get("analysis_evaluation_prompt")
            if success_prompt:
                try:
                    analysis_data["call_success"] = await self._evaluate_call_success_with_llm(
                        transcription=transcription,
                        prompt=success_prompt,
                        timeout=assistant_config.get("analysis_evaluation_timeout", 15)
                    )
                    # logger.info(f"CALL_SUCCESS_EVALUATED | assistant_id={assistant_id} | success={analysis_data['call_success']}")
                except Exception as e:
                    # logger.warning(f"CALL_SUCCESS_EVALUATION_FAILED | assistant_id={assistant_id} | error={str(e)}")
                    pass
            
            # Process structured data extraction
            structured_data_fields = assistant_config.get("structured_data_fields", [])
            # logger.info(f"STRUCTURED_DATA_CONFIG_CHECK | assistant_id={assistant_id} | fields_count={len(structured_data_fields)}")
            
            # Always try to get data directly from agent
            agent_structured_data = {}
            if agent and hasattr(agent, 'get_structured_data'):
                agent_structured_data = agent.get_structured_data()
                # logger.info(f"AGENT_STRUCTURED_DATA_RETRIEVED | assistant_id={assistant_id} | fields_count={len(agent_structured_data)}")
            
            # Extract names from call summary if no structured name data exists
            if analysis_data.get("call_summary") and not agent_structured_data.get("Customer Name"):
                extracted_name = extract_name_from_summary(analysis_data["call_summary"])
                if extracted_name:
                    agent_structured_data["Customer Name"] = {
                        "value": extracted_name,
                        "type": "string",
                        "timestamp": datetime.datetime.now().isoformat(),
                        "collection_method": "summary_extraction"
                    }
                    # logger.info(f"NAME_EXTRACTED_FROM_SUMMARY | assistant_id={assistant_id} | name={extracted_name}")
            
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
                    # logger.info(f"STRUCTURED_DATA_EXTRACTED_WITH_AI | assistant_id={assistant_id} | ai_fields={len(ai_structured_data)} | agent_fields={len(agent_structured_data)} | final_fields={len(final_structured_data)}")
                except Exception as e:
                    # logger.error(f"AI_STRUCTURED_DATA_EXTRACTION_FAILED | assistant_id={assistant_id} | error={str(e)} | fields_count={len(structured_data_fields)} | transcription_items={len(transcription)}")
                    # logger.error(f"AI_EXTRACTION_FALLBACK | assistant_id={assistant_id} | falling_back_to_agent_data_only | agent_fields={len(agent_structured_data)}")
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
                # logger.info(f"STRUCTURED_DATA_EXTRACTED_AGENT_ONLY | assistant_id={assistant_id} | fields_count={len(agent_structured_data)}")
            
        except Exception as e:
            # logger.error(f"ANALYSIS_PROCESSING_ERROR | assistant_id={assistant_id} | error={str(e)}")
            # Fallback to basic agent data
            if agent and hasattr(agent, 'get_structured_data'):
                try:
                    fallback_data = agent.get_structured_data()
                    analysis_data["structured_data"] = fallback_data
                    # logger.info(f"STRUCTURED_DATA_FALLBACK_SUCCESS | assistant_id={assistant_id} | fields_count={len(fallback_data)}")
                except Exception as fallback_error:
                    # logger.warning(f"STRUCTURED_DATA_FALLBACK_FAILED | assistant_id={assistant_id} | error={str(fallback_error)}")
                    pass
        
        return analysis_data

    async def _generate_call_summary_with_llm(self, transcription: list, prompt: str, timeout: int = 30) -> str:
        """Generate call summary using LLM like the old code."""
        try:
            # logger.info(f"CALL_SUMMARY_DEBUG | transcription_items={len(transcription)}")
            
            # Prepare transcription text
            transcript_text = ""
            for item in transcription:
                if isinstance(item, dict) and "content" in item:
                    role = item.get("role", "unknown")
                    content = item["content"]
                    if isinstance(content, str):
                        transcript_text += f"{role}: {content}\n"
                        # logger.info(f"TRANSCRIPT_ITEM | role={role} | content_length={len(content)}")
            
            # logger.info(f"TRANSCRIPT_TEXT_LENGTH | length={len(transcript_text)}")
            
            if not transcript_text.strip():
                # logger.warning("EMPTY_TRANSCRIPT_TEXT | returning default message")
                return "No conversation content available for summary."

            # Use OpenAI API for summary generation
            openai_api_key = os.getenv("OPENAI_API_KEY")
            if not openai_api_key:
                # logger.warning("OPENAI_API_KEY not configured for call summary")
                return "Summary generation not available - API key not configured."

            # Use shared OpenAI client
            client = AsyncOpenAI(api_key=openai_api_key)
            
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
            # logger.warning(f"CALL_SUMMARY_TIMEOUT | timeout={timeout}s")
            return "Summary generation timed out."
        except Exception as e:
            # logger.warning(f"CALL_SUMMARY_ERROR | error={str(e)}")
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
            openai_api_key = os.getenv("OPENAI_API_KEY")
            if not openai_api_key:
                # logger.warning("OPENAI_API_KEY not configured for success evaluation")
                return False

            # Use shared OpenAI client
            client = AsyncOpenAI(api_key=openai_api_key)
            
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
            # logger.warning(f"CALL_SUCCESS_EVALUATION_TIMEOUT | timeout={timeout}s")
            return False
        except Exception as e:
            # logger.warning(f"CALL_SUCCESS_EVALUATION_ERROR | error={str(e)}")
            return False

    async def _extract_structured_data_with_ai(
        self, 
        transcription: list, 
        fields: list, 
        prompt: str = None, 
        properties: dict = None, 
        timeout: int = 20,
        agent = None
    ) -> Dict[str, Any]:
        """Extract structured data using AI like the old code."""
        try:
            # logger.info(f"AI_STRUCTURED_DATA_EXTRACTION_START | fields_count={len(fields)}")
            
            # Prepare transcription text
            transcript_text = ""
            for item in transcription:
                if isinstance(item, dict) and "content" in item:
                    role = item.get("role", "unknown")
                    content = item["content"]
                    if isinstance(content, str):
                        transcript_text += f"{role}: {content}\n"
            
            if not transcript_text.strip():
                # logger.warning("EMPTY_TRANSCRIPT_FOR_AI_EXTRACTION")
                return {}

            # Use OpenAI API for structured data extraction
            openai_api_key = os.getenv("OPENAI_API_KEY")
            if not openai_api_key:
                # logger.warning("OPENAI_API_KEY not configured for structured data extraction")
                return {}

            # Use shared OpenAI client
            client = AsyncOpenAI(api_key=openai_api_key)
            
            # Build the extraction prompt
            extraction_prompt = prompt or "Extract the following information from the call transcript:"
            field_descriptions = []
            for field in fields:
                field_descriptions.append(f"- {field}")
            
            system_prompt = f"{extraction_prompt}\n\n{chr(10).join(field_descriptions)}\n\nReturn the data as a JSON object with the field names as keys."
            
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Please extract the requested information from this call:\n\n{transcript_text}"}
                    ],
                    max_tokens=1000,
                    temperature=0.1
                ),
                timeout=min(max(timeout, 15), 60),
            )

            # Parse the response
            result_text = response.choices[0].message.content.strip()
            try:
                import json
                extracted_data = json.loads(result_text)
                # logger.info(f"AI_STRUCTURED_DATA_EXTRACTED | fields={list(extracted_data.keys())}")
                return extracted_data
            except json.JSONDecodeError:
                # logger.warning(f"AI_EXTRACTION_JSON_PARSE_ERROR | response={result_text[:200]}...")
                return {}

        except asyncio.TimeoutError:
            # logger.warning(f"AI_STRUCTURED_DATA_EXTRACTION_TIMEOUT | timeout={timeout}s")
            return {}
        except Exception as e:
            # logger.warning(f"AI_STRUCTURED_DATA_EXTRACTION_ERROR | error={str(e)}")
            return {}

    def _create_session(self, config: Dict[str, Any]) -> AgentSession:
        """Create agent session using assistant's database settings."""
        # Validate and fix model names to prevent API errors
        from config.settings import validate_model_names
        config = validate_model_names(config)
        
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

        # Debug logging for TTS provider selection
        logger.info(f"TTS_PROVIDER_SELECTED | provider={voice_provider} | model={voice_model} | voice={voice_name}")

        # Create LLM based on provider
        llm = self._create_llm(llm_provider, llm_model, temperature, max_tokens, config)

        # Create TTS based on provider
        tts = self._create_tts(voice_provider, voice_model, voice_name, config)

        # Create STT - prefer Deepgram streaming for better latency, fallback to OpenAI Whisper
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
        
        # Try Deepgram STT first if available and API key is set
        stt = None
        deepgram_api_key = os.getenv("DEEPGRAM_API_KEY")
        
        if DEEPGRAM_AVAILABLE and deepgram_api_key:
            try:
                stt = lk_deepgram.STT(
                    model="nova-3",
                    language=deepgram_language
                )
                logger.info(f"DEEPGRAM_STT_CONFIGURED | model=nova-3 | language={deepgram_language}")
            except Exception as e:
                logger.warning(f"DEEPGRAM_STT_FAILED | error={str(e)} | falling back to OpenAI Whisper")
                stt = None
        
        # Fallback to OpenAI Whisper STT if Deepgram is not available or failed
        whisper_language = None
        if stt is None:
            # Map language codes for OpenAI Whisper
            whisper_language_mapping = {
                "en": "en", "es": "es", "pt": "pt", "fr": "fr", 
                "de": "de", "nl": "nl", "no": "no", "ar": "ar",
                "en-es": "en"  # Default to English for combined
            }
            whisper_language = whisper_language_mapping.get(language_setting, "en")
            
            stt = openai.STT(
                model="whisper-1",
                language=whisper_language
            )
            logger.info(
                "OPENAI_STT_CONFIGURED | model=whisper-1 | language=%s | reason=%s",
                whisper_language,
                'DEEPGRAM_NOT_AVAILABLE' if not DEEPGRAM_AVAILABLE else 'DEEPGRAM_FAILED' if deepgram_api_key else 'DEEPGRAM_API_KEY_NOT_SET'
            )
        else:
            logger.info("OPENAI_STT_SKIPPED | reason=DEEPGRAM_CONFIGURED")

        # Get call management settings from assistant config
        max_call_duration_minutes = config.get("max_call_duration", 30)  # From DB (in seconds, convert to minutes)
        silence_timeout_seconds = config.get("silence_timeout", 20)       # From DB
        
        # Convert max call duration from seconds to minutes for session timeout
        max_call_duration_seconds = max_call_duration_minutes

        # Get voice timing settings from assistant config
        voice_on_punctuation_seconds = config.get("voice_on_punctuation_seconds", 0.1)      # From DB
        voice_on_no_punctuation_seconds = config.get("voice_on_no_punctuation_seconds", 1.5)  # From DB
        voice_on_number_seconds = config.get("voice_on_number_seconds", 0.5)               # From DB
        voice_backoff_seconds = config.get("voice_backoff_seconds", 1)                      # From DB

        # Get interruption threshold settings from assistant config
        min_interruption_words = config.get("num_words_to_interrupt_assistant", 3)  # From DB, default to 3 words
        min_interruption_duration = 0.5  # Require at least 0.5 seconds of speech
        false_interruption_timeout = 2.0  # Wait 2 seconds before signaling false interruption

        return AgentSession(
            vad=vad,
            stt=stt,
            llm=llm,
            tts=tts,
            allow_interruptions=True,
            preemptive_generation=True,  # Enable preemptive generation for reduced latency
            min_endpointing_delay=voice_on_punctuation_seconds,   # From assistant DB
            max_endpointing_delay=voice_on_no_punctuation_seconds, # From assistant DB
            user_away_timeout=silence_timeout_seconds,       # Align user-away timer with idle message timeout
            min_interruption_words=min_interruption_words,    # Require N words before interrupting
            min_interruption_duration=min_interruption_duration,  # Require minimum speech duration
            false_interruption_timeout=false_interruption_timeout,  # Timeout for false interruptions
        )

    # Keep the original LLM and TTS creation methods for pre-warming
    def _create_llm(self, provider: str, model: str, temperature: float, max_tokens: int, config: Dict[str, Any]):
        """Create LLM using assistant config + environment API keys."""
        
        if provider == "Groq" and GROQ_AVAILABLE:
            # Use assistant's Groq settings from database
            groq_model = config.get("groq_model", "llama3-8b-8192")  # From DB
            groq_temperature = config.get("groq_temperature", 0.10)  # From DB  
            groq_max_tokens = config.get("groq_max_tokens", 250)    # From DB
            
            # Get API key from environment (centralized)
            groq_api_key = os.getenv("GROQ_API_KEY")
            
            if groq_api_key:
                # Handle model mapping for decommissioned models
                model_mapping = {
                    "llama3-8b-8192": "llama-3.1-8b-instant",
                    "llama3-70b-8192": "llama-3.3-70b-versatile"
                }
                mapped_model = model_mapping.get(groq_model, groq_model)
                
                llm = lk_groq.LLM(
                    model=mapped_model,
                    api_key=groq_api_key,  # From environment
                    temperature=groq_temperature,  # From assistant DB
                    parallel_tool_calls=False,  # Disabled to prevent parallel function call errors
                    tool_choice="auto",
                )
                logger.info(f"GROQ_LLM_CONFIGURED | model={mapped_model} | temp={groq_temperature} | tokens={groq_max_tokens}")
                return llm
            else:
                logger.warning("GROQ_API_KEY_NOT_SET | falling back to OpenAI LLM")

        elif provider == "Cerebras" and CEREBRAS_AVAILABLE:
            # Use assistant's Cerebras settings from database
            cerebras_model = config.get("llm_model_setting", "gpt-oss-120b")  # From DB
            cerebras_temperature = config.get("temperature_setting", 0.3)  # From DB
            cerebras_max_tokens = config.get("max_token_setting", 250)     # From DB
            
            # Get API key from environment (centralized)
            cerebras_api_key = os.getenv("CEREBRAS_API_KEY")
            
            if cerebras_api_key:
                llm = openai.LLM(
                    model=cerebras_model,
                    api_key=cerebras_api_key,  # From environment
                    base_url="https://api.cerebras.ai/v1",
                    temperature=cerebras_temperature,  # From assistant DB
                    parallel_tool_calls=False,  # Disabled to prevent parallel function call errors
                    tool_choice="auto",
                )
                logger.info(f"CEREBRAS_LLM_CONFIGURED | model={cerebras_model} | temp={cerebras_temperature} | tokens={cerebras_max_tokens}")
                return llm
            else:
                logger.warning("CEREBRAS_API_KEY_NOT_SET | falling back to OpenAI LLM")

        # Default to OpenAI with assistant's settings
        openai_model = config.get("llm_model_setting", "GPT-4o Mini")  # From DB
        openai_temperature = config.get("temperature_setting", 1)       # From DB
        openai_max_tokens = config.get("max_token_setting", 250)       # From DB
        
        # Map OpenAI model names
        model_mapping = {
            "GPT-4o": "gpt-4o",
            "GPT-4o Mini": "gpt-4o-mini",
            "GPT-4.1": "gpt-4.1",
            "GPT-4.1 Mini": "gpt-4.1-mini",
            "gpt-4.1": "gpt-4.1",
            "gpt-4.1-mini": "gpt-4.1-mini"
        }
        mapped_model = model_mapping.get(openai_model, "gpt-4o-mini")
        
        # Get API key from environment (centralized)
        openai_api_key = os.getenv("OPENAI_API_KEY")
        
        llm = openai.LLM(
            model=mapped_model,
            api_key=openai_api_key,  # From environment
            temperature=float(openai_temperature),  # From assistant DB
            parallel_tool_calls=False,  # Disabled to prevent parallel function call errors
            tool_choice="auto",
        )
        logger.info(f"OPENAI_LLM_CONFIGURED | model={mapped_model} | temp={openai_temperature} | tokens={openai_max_tokens}")
        return llm

    def _create_tts(self, provider: str, model: str, voice_name: str, config: Dict[str, Any]):
        """Create TTS using assistant config + environment API keys.
        
        Supported providers:
        - ElevenLabs: Uses ELEVENLABS_API_KEY from environment, supports eleven_turbo_v2 model
        - Rime: Uses RIME_API_KEY from environment, supports mistv2 model with rainforest speaker
        - Hume: Uses HUME_API_KEY from environment, supports VoiceByName with description
        - Deepgram: Uses DEEPGRAM_API_KEY from environment, supports Aura voices
        - Cartesia: Uses CARTESIA_API_KEY from environment, supports sonic-3 model
        - OpenAI: Default fallback TTS provider
        """
        # Debug logging for TTS provider check
        logger.info(f"TTS_PROVIDER_CHECK | provider={provider} | CARTESIA_AVAILABLE={CARTESIA_AVAILABLE}")
        
        if provider == "Rime" and RIME_AVAILABLE:
            # Use assistant's Rime settings from database
            rime_model = config.get("voice_model_setting", "mistv2")  # From DB
            rime_speaker = config.get("voice_name_setting", "rainforest")  # From DB
            rime_speed_alpha = config.get("speed_alpha", 0.9)  # From DB
            rime_reduce_latency = config.get("reduce_latency", True)  # From DB
            
            # Get API key from environment (centralized)
            rime_api_key = os.getenv("RIME_API_KEY")
            
            if rime_api_key:
                # Use arcana model when specified
                if rime_model == "arcana":
                    tts = lk_rime.TTS(
                        model="arcana",
                        speaker=rime_speaker,
                        speed_alpha=rime_speed_alpha,
                        reduce_latency=rime_reduce_latency,
                        api_key=rime_api_key,  # From environment
                    )
                    logger.info(f"RIME_TTS_CONFIGURED | model=arcana | speaker={rime_speaker} | speed={rime_speed_alpha}")
                else:
                    # Use mist-v2 with hyphen for compatibility
                    model_name = "mist-v2" if rime_model == "mistv2" else rime_model
                    tts = lk_rime.TTS(
                        model=model_name,
                        speaker=rime_speaker,
                        speed_alpha=rime_speed_alpha,
                        reduce_latency=rime_reduce_latency,
                        api_key=rime_api_key,  # From environment
                    )
                    logger.info(f"RIME_TTS_CONFIGURED | model={model_name} | speaker={rime_speaker} | speed={rime_speed_alpha}")
                return tts
            else:
                logger.warning("RIME_API_KEY_NOT_SET | falling back to Deepgram TTS")
        
        if provider == "Hume" and HUME_AVAILABLE:
            # Use assistant's Hume settings from database
            hume_model = config.get("voice_model_setting", "hume_default")  # From DB
            hume_voice_name = config.get("voice_name_setting", "Colton Rivers")  # From DB
            hume_description = config.get("voice_description", "The voice exudes calm, serene, and peaceful qualities, like a gentle stream flowing through a quiet forest.")  # From DB
            hume_speed = config.get("speed", 1.0)  # From DB
            hume_instant_mode = config.get("instant_mode", True)  # From DB
            
            # Get API key from environment (centralized)
            hume_api_key = os.getenv("HUME_API_KEY")
            openai_api_key = os.getenv("OPENAI_API_KEY")
            
            if hume_api_key:
                try:
                    # DISABLE Octave-2 for now - use default Hume voices only
                    # This prevents 400 errors and reduces latency
                    
                    # Always use VoiceByName with default Hume voices
                    hume_voice = lk_hume.VoiceByName(
                        name=hume_voice_name, 
                        provider=lk_hume.VoiceProvider.hume
                    )
                    
                    hume_tts = lk_hume.TTS(
                        voice=hume_voice,
                        description=hume_description,
                        speed=hume_speed,
                        instant_mode=hume_instant_mode,
                        model_version="1",  # Default model version
                        api_key=hume_api_key,
                    )
                    logger.info(f"HUME_TTS_CONFIGURED_DEFAULT | voice={hume_voice_name} | speed={hume_speed} | instant_mode={hume_instant_mode} | model_version=1")
                    
                    # Safety check: ensure hume_tts was created
                    if hume_tts is None:
                        raise ValueError("Hume TTS creation failed - hume_tts is None")
                    
                    # Wrap Hume TTS with fallback to OpenAI if OpenAI is available
                    if openai_api_key:
                        # Create OpenAI fallback with mapped voice
                        voice_mapping = {
                            "rachel": "nova", "domi": "shimmer", "bella": "nova", "antoni": "echo",
                            "elli": "nova", "josh": "echo", "arnold": "fable", "alloy": "alloy",
                            "nova": "nova", "shimmer": "shimmer", "echo": "echo", "fable": "fable", "onyx": "onyx",
                            "colton rivers": "echo", "sarah chen": "nova", "david mitchell": "echo", "emma williams": "shimmer",
                            "charming cowgirl": "shimmer", "soft male conversationalist": "echo",
                            "scottish guy": "onyx", "conversational english guy": "echo",
                            "english casual conversationalist": "echo"
                        }
                        mapped_voice = voice_mapping.get(hume_voice_name.lower(), "alloy")
                        
                        openai_tts = openai.TTS(
                            model="tts-1",
                            voice=mapped_voice,
                            api_key=openai_api_key,
                        )
                        
                        # Wrap with FallbackAdapter: primary Hume, fallback OpenAI
                        tts = FallbackAdapter([hume_tts, openai_tts])
                        logger.info(f"HUME_TTS_WITH_FALLBACK | primary=Hume | fallback=OpenAI | voice={mapped_voice}")
                    else:
                        # No fallback available, use Hume only
                        tts = hume_tts
                        logger.info(f"HUME_TTS_NO_FALLBACK | using Hume TTS only")
                    
                    return tts
                except Exception as e:
                    logger.error(f"HUME_TTS_CONFIG_FAILED | error={str(e)} | falling back to OpenAI")
                    # Fall through to OpenAI TTS below
            else:
                logger.warning("HUME_API_KEY_NOT_SET | falling back to OpenAI TTS")
        
        # ElevenLabs TTS implementation
        if provider == "ElevenLabs" and ELEVENLABS_AVAILABLE:
            # Use assistant's ElevenLabs settings from database
            elevenlabs_model = config.get("voice_model_setting", "eleven_turbo_v2")  # From DB
            elevenlabs_voice = config.get("voice_name_setting", "Rachel")             # From DB
            
            # Get API key from environment (centralized)
            elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY")
            
            if elevenlabs_api_key:
                tts = lk_elevenlabs.TTS(
                    model=elevenlabs_model,
                    voice_id=elevenlabs_voice,
                    api_key=elevenlabs_api_key,  # From environment
                )
                logger.info(f"ELEVENLABS_TTS_CONFIGURED | model={elevenlabs_model} | voice={elevenlabs_voice}")
                return tts
            else:
                logger.warning("ELEVENLABS_API_KEY_NOT_SET | falling back to OpenAI TTS")
        
        # Deepgram TTS implementation
        if provider == "Deepgram" and DEEPGRAM_AVAILABLE:
            # Use assistant's Deepgram settings from database
            deepgram_model = config.get("voice_model_setting", "aura-asteria-en")  # From DB
            
            # Get API key from environment (centralized)
            deepgram_api_key = os.getenv("DEEPGRAM_API_KEY")
            
            if deepgram_api_key:
                tts = lk_deepgram.TTS(
                    model=deepgram_model,
                    api_key=deepgram_api_key,
                )
                logger.info(f"DEEPGRAM_TTS_CONFIGURED | model={deepgram_model}")
                return tts
            else:
                logger.warning("DEEPGRAM_API_KEY_NOT_SET | falling back to OpenAI TTS")
        
        # Cartesia TTS implementation
        if provider == "Cartesia" and CARTESIA_AVAILABLE:
            logger.info("CARTESIA_PROVIDER_MATCHED | checking API key and config")
            # Use assistant's Cartesia settings from database
            cartesia_model = config.get("voice_model_setting", "sonic-3")  # From DB
            # Default to first Sonic 3 voice if not set
            cartesia_voice = config.get("voice_name_setting", "f9836c6e-a0bd-460e-9d3c-f7299fa60f94")  # From DB (default Sonic 3 voice)
            cartesia_language = config.get("language_setting", "en")  # From DB
            cartesia_speed = config.get("speed", 1.0)  # From DB
            cartesia_volume = config.get("volume", 1.0)  # From DB (if available)
            cartesia_emotion = config.get("emotion")  # From DB (optional)
            
            # Get API key from environment (centralized)
            cartesia_api_key = os.getenv("CARTESIA_API_KEY")
            logger.info(f"CARTESIA_CONFIG | model={cartesia_model} | voice={cartesia_voice} | api_key_set={bool(cartesia_api_key)}")
            
            if cartesia_api_key:
                # Build TTS parameters
                tts_params = {
                    "model": cartesia_model,
                    "voice": cartesia_voice,
                    "language": cartesia_language,
                    "speed": float(cartesia_speed),
                    "volume": float(cartesia_volume),
                }
                
                # Add optional emotion parameter if provided
                if cartesia_emotion:
                    tts_params["emotion"] = cartesia_emotion
                
                tts = lk_cartesia.TTS(
                    **tts_params
                )
                logger.info(f"CARTESIA_TTS_CONFIGURED | model={cartesia_model} | voice={cartesia_voice} | speed={cartesia_speed} | language={cartesia_language}")
                return tts
            else:
                logger.warning("CARTESIA_API_KEY_NOT_SET | falling back to OpenAI TTS")
        elif provider == "Cartesia" and not CARTESIA_AVAILABLE:
            logger.warning(f"CARTESIA_NOT_AVAILABLE | provider={provider} | CARTESIA_AVAILABLE={CARTESIA_AVAILABLE} | falling back to OpenAI TTS")
        elif provider != "Cartesia":
            logger.debug(f"PROVIDER_NOT_CARTESIA | provider={provider} | skipping Cartesia check")
        
        # Default to OpenAI TTS with assistant's settings
        openai_voice = config.get("voice_name_setting", "Rachel")  # From DB
        
        # Map ElevenLabs voices to OpenAI voices
        voice_mapping = {
            "rachel": "nova",
            "domi": "shimmer", 
            "bella": "nova",
            "antoni": "echo",
            "elli": "nova",
            "josh": "echo",
            "arnold": "fable",
            "alloy": "alloy",
            "nova": "nova",
            "shimmer": "shimmer",
            "echo": "echo",
            "fable": "fable",
            "onyx": "onyx"
        }
        mapped_voice = voice_mapping.get(voice_name.lower(), "alloy")
        
        # Get API key from environment (centralized)
        openai_api_key = os.getenv("OPENAI_API_KEY")
        
        tts = openai.TTS(
            model="tts-1",
            voice=mapped_voice,
            api_key=openai_api_key,
        )
        logger.info(f"OPENAI_TTS_CONFIGURED | voice={mapped_voice}")
        return tts

    async def _safe_db_insert(self, table: str, payload: dict, timeout: int = 5):
        """Safely insert data into database with timeout protection."""
        try:
            return await asyncio.wait_for(
                asyncio.to_thread(lambda: self.supabase.client.table(table).insert(payload).execute()),
                timeout=timeout
            )
        except asyncio.TimeoutError:
            # logger.error(f"DATABASE_INSERT_TIMEOUT | table={table} | timeout={timeout}s")
            raise
        except Exception as e:
            # logger.error(f"DATABASE_INSERT_ERROR | table={table} | error={str(e)}")
            raise


def prewarm(proc: agents.JobProcess):
    """Pre-warm the system before handling calls."""
    # logger.info("PREWARM_FUNCTION | system pre-warming started")
    # Pre-warming is now handled in CallHandler.__init__


async def entrypoint(ctx: JobContext):
    """Main entry point for LiveKit agent."""
    logger.info(f"🎯 AGENT_ENTRYPOINT_CALLED | room={ctx.room.name}")
    logger.info(f"📋 Job metadata: {ctx.job.metadata}")
    logger.info(f"📋 Room metadata: {ctx.room.metadata}")
    
    # Create call handler and process the call
    handler = CallHandler()
    await handler.handle_call(ctx)
    
    logger.info(f"✅ AGENT_ENTRYPOINT_COMPLETE | room={ctx.room.name}")


if __name__ == "__main__":
    # Get agent name from environment variable
    agent_name = os.getenv("LK_AGENT_NAME", "ai")
    # logger.info(f"🤖 Agent name: {agent_name}")
    
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        prewarm_fnc=prewarm,
        agent_name=agent_name,
    ))
