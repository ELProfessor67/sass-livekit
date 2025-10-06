"""
Outbound call handler for processing campaign calls.
"""

import logging
from typing import Optional, Dict, Any
from livekit.agents import JobContext, Agent

from config.settings import Settings
from integrations.supabase_client import SupabaseClient
from integrations.n8n_integration import N8NIntegration


class OutboundCallHandler:
    """Handles outbound call processing."""
    
    def __init__(self, settings: Settings, supabase: SupabaseClient, n8n: N8NIntegration):
        self.settings = settings
        self.supabase = supabase
        self.n8n = n8n
        self.logger = logging.getLogger(__name__)
    
    async def handle_call(self, ctx: JobContext) -> None:
        """
        Handle an outbound call.
        
        Args:
            ctx: LiveKit job context
        """
        try:
            self.logger.info(f"OUTBOUND_CALL_START | room={ctx.room.name}")
            
            # Extract campaign info from job metadata
            campaign_info = self._extract_campaign_info(ctx)
            if not campaign_info:
                self.logger.error("OUTBOUND_CALL_NO_CAMPAIGN_INFO | room=%s", ctx.room.name)
                return
            
            # Create lightweight agent for outbound calls
            await self._run_outbound_agent(ctx, campaign_info)
            
            self.logger.info(f"OUTBOUND_CALL_COMPLETE | room={ctx.room.name}")
            
        except Exception as e:
            self.logger.error(f"OUTBOUND_CALL_ERROR | room={ctx.room.name} | error={str(e)}", exc_info=True)
            raise
    
    def _extract_campaign_info(self, ctx: JobContext) -> Optional[Dict[str, Any]]:
        """Extract campaign information from job context."""
        try:
            if not ctx.job.metadata:
                return None
            
            import json
            metadata = json.loads(ctx.job.metadata)
            
            campaign_info = {
                "phone_number": metadata.get("phone_number"),
                "agent_id": metadata.get("agentId"),
                "campaign_id": metadata.get("campaignId"),
                "contact_name": metadata.get("contact_name"),
                "campaign_prompt": metadata.get("campaign_prompt", ""),
                "contact_info": metadata.get("contact_info", {})
            }
            
            self.logger.info(f"CAMPAIGN_INFO_EXTRACTED | phone={campaign_info['phone_number']} | campaign={campaign_info['campaign_id']}")
            return campaign_info
            
        except Exception as e:
            self.logger.error(f"CAMPAIGN_INFO_EXTRACTION_ERROR | error={str(e)}")
            return None
    
    async def _run_outbound_agent(self, ctx: JobContext, campaign_info: Dict[str, Any]) -> None:
        """Run the outbound agent for the campaign call."""
        try:
            # Build campaign-specific instructions
            instructions = self._build_campaign_instructions(campaign_info)
            
            # Create lightweight agent for outbound calls
            agent = Agent(instructions=instructions)
            
            # Run the agent
            await agent.start(ctx)
            
        except Exception as e:
            self.logger.error(f"OUTBOUND_AGENT_RUN_ERROR | error={str(e)}")
            raise
    
    def _build_campaign_instructions(self, campaign_info: Dict[str, Any]) -> str:
        """Build instructions for the campaign agent."""
        contact_name = campaign_info.get("contact_name", "there")
        campaign_prompt = campaign_info.get("campaign_prompt", "")
        
        instructions = f"""You are making an outbound call for a campaign. 
        
Contact: {contact_name}
Campaign Script: {campaign_prompt}

Be professional, friendly, and follow the campaign script. Keep the conversation focused and efficient."""
        
        return instructions
