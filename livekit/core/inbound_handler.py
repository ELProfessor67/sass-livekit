"""
Inbound call handler for processing incoming calls.
"""

import logging
from typing import Optional, Dict, Any
from livekit.agents import JobContext, Agent

from config.settings import Settings
from integrations.supabase_client import SupabaseClient
from integrations.n8n_integration import N8NIntegration
from services.unified_agent import UnifiedAgent


class InboundCallHandler:
    """Handles inbound call processing."""
    
    def __init__(self, settings: Settings, supabase: SupabaseClient, n8n: N8NIntegration):
        self.settings = settings
        self.supabase = supabase
        self.n8n = n8n
        self.logger = logging.getLogger(__name__)
    
    async def handle_call(self, ctx: JobContext) -> None:
        """
        Handle an inbound call.
        
        Args:
            ctx: LiveKit job context
        """
        try:
            self.logger.info(f"INBOUND_CALL_START | room={ctx.room.name}")
            
            # Extract DID from room name
            called_did = self._extract_called_did(ctx.room.name)
            if not called_did:
                self.logger.error("INBOUND_CALL_NO_DID | room=%s", ctx.room.name)
                return
            
            # Resolve assistant for this DID
            assistant_config = await self._resolve_assistant_for_did(called_did)
            if not assistant_config:
                self.logger.error("INBOUND_CALL_NO_ASSISTANT | did=%s", called_did)
                return
            
            # Create and run assistant
            await self._run_assistant(ctx, assistant_config)
            
            self.logger.info(f"INBOUND_CALL_COMPLETE | room={ctx.room.name}")
            
        except Exception as e:
            self.logger.error(f"INBOUND_CALL_ERROR | room={ctx.room.name} | error={str(e)}", exc_info=True)
            raise
    
    def _extract_called_did(self, room_name: str) -> Optional[str]:
        """Extract DID from room name."""
        try:
            # Extract DID from room name patterns like "did-1234567890"
            prefix = "did-"
            if room_name.startswith(prefix):
                return room_name[len(prefix):]
            
            # Try other patterns
            if "-" in room_name:
                parts = room_name.split("-")
                if len(parts) >= 2:
                    return parts[-1]  # Take last part as DID
            
            return None
        except Exception as e:
            self.logger.warning(f"Failed to extract DID from room name: {room_name}, error: {e}")
            return None
    
    async def _resolve_assistant_for_did(self, called_did: str) -> Optional[Dict[str, Any]]:
        """Resolve assistant configuration for a given DID."""
        try:
            # Query database for assistant associated with this DID
            result = await self.supabase.client.table("assistants").select("*").eq("phone_number", called_did).execute()
            
            if result.data and len(result.data) > 0:
                assistant_data = result.data[0]
                self.logger.info(f"ASSISTANT_RESOLVED | did={called_did} | assistant_id={assistant_data.get('id')}")
                return assistant_data
            
            self.logger.warning(f"NO_ASSISTANT_FOUND | did={called_did}")
            return None
            
        except Exception as e:
            self.logger.error(f"ASSISTANT_RESOLUTION_ERROR | did={called_did} | error={str(e)}")
            return None
    
    async def _run_assistant(self, ctx: JobContext, assistant_config: Dict[str, Any]) -> None:
        """Run the assistant for the call."""
        try:
            assistant_id = assistant_config.get("id")
            instructions = assistant_config.get("instructions", "")
            knowledge_base_id = assistant_config.get("knowledge_base_id")
            company_id = assistant_config.get("company_id")
            
            # Create unified agent that handles both RAG and booking capabilities
            assistant = UnifiedAgent(
                instructions=instructions,
                knowledge_base_id=knowledge_base_id,
                company_id=company_id,
                supabase=self.supabase
            )
            
            # Reset state for new conversation
            assistant._reset_state()
            
            # Run the assistant
            await assistant.start(ctx)
            
        except Exception as e:
            self.logger.error(f"ASSISTANT_RUN_ERROR | assistant_id={assistant_config.get('id')} | error={str(e)}")
            raise
