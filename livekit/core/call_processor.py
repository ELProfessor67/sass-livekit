"""
Main call processing orchestration.
"""

import logging
from typing import Optional, Dict, Any
from livekit.agents import JobContext

from config.settings import get_settings
from integrations.supabase_client import SupabaseClient
from integrations.n8n_integration import N8NIntegration
from .inbound_handler import InboundCallHandler
from .outbound_handler import OutboundCallHandler


class CallProcessor:
    """Main call processing orchestrator."""
    
    def __init__(self):
        self.settings = get_settings()
        self.supabase = SupabaseClient()
        self.n8n = N8NIntegration()
        self.logger = logging.getLogger(__name__)
        
        # Initialize handlers
        self.inbound_handler = InboundCallHandler(self.settings, self.supabase, self.n8n)
        self.outbound_handler = OutboundCallHandler(self.settings, self.supabase, self.n8n)
    
    async def process_call(self, ctx: JobContext) -> None:
        """
        Process incoming call based on call type.
        
        Args:
            ctx: LiveKit job context
        """
        try:
            # Determine call type
            call_type = self._determine_call_type(ctx)
            
            self.logger.info(f"CALL_PROCESSING_START | type={call_type} | room={ctx.room.name}")
            
            if call_type == "outbound":
                await self.outbound_handler.handle_call(ctx)
            else:
                await self.inbound_handler.handle_call(ctx)
                
            self.logger.info(f"CALL_PROCESSING_COMPLETE | type={call_type}")
            
        except Exception as e:
            self.logger.error(f"CALL_PROCESSING_ERROR | error={str(e)}", exc_info=True)
            raise
    
    def _determine_call_type(self, ctx: JobContext) -> str:
        """
        Determine if this is an inbound or outbound call.
        
        Args:
            ctx: LiveKit job context
            
        Returns:
            Call type: 'inbound' or 'outbound'
        """
        try:
            # Check job metadata for outbound call indicators
            metadata = ctx.job.metadata
            if metadata:
                import json
                dial_info = json.loads(metadata)
                if dial_info.get("phone_number") and dial_info.get("agentId"):
                    self.logger.info(f"CALL_TYPE_DETERMINED | type=outbound | phone={dial_info.get('phone_number')}")
                    return "outbound"
        except Exception as e:
            self.logger.warning(f"Failed to parse job metadata for call type determination: {e}")
        
        # Default to inbound
        self.logger.info("CALL_TYPE_DETERMINED | type=inbound")
        return "inbound"
