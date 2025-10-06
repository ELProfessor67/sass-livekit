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
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

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
)

# Plugin imports
from livekit.plugins import openai, silero, deepgram

# Local imports
from services.booking_agent import BookingAgent
from services.rag_agent import RAGAgent
from integrations.supabase_client import SupabaseClient
from integrations.calendar_api import CalComCalendar

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CallHandler:
    """Simplified call handler following LiveKit patterns."""
    
    def __init__(self):
        self.supabase = SupabaseClient()
    
    async def handle_call(self, ctx: JobContext) -> None:
        """Handle incoming call with proper LiveKit patterns."""
        try:
            await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
            logger.info(f"CONNECTED | room={ctx.room.name}")
            
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
            logger.info(f"PARTICIPANT_CONNECTED | identity={participant.identity}")
            
            # Create appropriate agent
            agent = await self._create_agent(assistant_config)
            
            # Create session with proper configuration
            session = self._create_session(assistant_config)
            
            # Start the session
            await session.start(
                agent=agent,
                room=ctx.room,
                room_input_options=RoomInputOptions(),
                room_output_options=RoomOutputOptions(transcription_enabled=True)
            )
            
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
                if dial_info.get("phone_number") and dial_info.get("agentId"):
                    return "outbound"
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
            if call_type == "outbound":
                # Extract phone number from metadata
                metadata = ctx.job.metadata
                if metadata:
                    dial_info = json.loads(metadata)
                    phone_number = dial_info.get("phone_number")
                    if phone_number:
                        return await self._get_assistant_by_phone(phone_number)
            
            # For inbound calls, extract DID from room name
            called_did = self._extract_did_from_room(ctx.room.name)
            if called_did:
                return await self._get_assistant_by_phone(called_did)
            
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
            
            # Handle other patterns
            if "-" in room_name:
                parts = room_name.split("-")
                if len(parts) >= 2:
                    return parts[-1]
            
            return None
        except Exception:
            return None
    
    async def _get_assistant_by_phone(self, phone_number: str) -> Optional[Dict[str, Any]]:
        """Get assistant configuration by phone number."""
        try:
            result = await self.supabase.client.table("assistants").select("*").eq("phone_number", phone_number).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            
            return None
        except Exception as e:
            logger.error(f"DATABASE_ERROR | phone={phone_number} | error={str(e)}")
            return None
    
    async def _create_agent(self, config: Dict[str, Any]) -> Agent:
        """Create appropriate agent based on configuration."""
        instructions = config.get("prompt", "You are a helpful assistant.")
        
        # Check if RAG is enabled
        if config.get("use_rag") and config.get("knowledge_base_id"):
            return RAGAgent(
                instructions=instructions,
                knowledge_base_id=config.get("knowledge_base_id"),
                company_id=config.get("company_id"),
                supabase=self.supabase
            )
        else:
            # Create regular booking agent
            calendar = None
            if config.get("cal_api_key") and config.get("cal_event_type_id"):
                calendar = CalComCalendar(
                    api_key=config.get("cal_api_key"),
                    event_type_id=config.get("cal_event_type_id")
                )
            
            return BookingAgent(
                instructions=instructions,
                calendar=calendar
            )
    
    def _create_session(self, config: Dict[str, Any]) -> AgentSession:
        """Create agent session with proper configuration."""
        # Prewarm VAD for better performance
        vad = silero.VAD.load()
        
        return AgentSession(
            vad=vad,
            stt=openai.STT(model=config.get("stt_model", "gpt-4o-transcribe")),
            llm=openai.LLM(model=config.get("llm_model", "gpt-4o-mini")),
            tts=openai.TTS(voice=config.get("tts_voice", "alloy")),
            allow_interruptions=True,
            min_endpointing_delay=0.5,
            max_endpointing_delay=6.0,
        )


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
    logger.info("STARTING_LIVEKIT_AGENT")
    logger.info(f"LIVEKIT_URL={os.getenv('LIVEKIT_URL')}")
    logger.info(f"OPENAI_MODEL={os.getenv('OPENAI_LLM_MODEL', 'gpt-4o-mini')}")
    
    # Run the agent
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))
