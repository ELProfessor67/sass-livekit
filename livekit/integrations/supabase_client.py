"""
Supabase client wrapper for database operations.
"""

import logging
from typing import Optional, Dict, Any, List
from config.database import DatabaseClient, get_database_client
from utils.latency_logger import measure_latency_context


class SupabaseClient:
    """Supabase client wrapper for LiveKit voice agent."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.db_client = get_database_client()
    
    @property
    def client(self):
        """Get the underlying Supabase client."""
        return self.db_client.client if self.db_client else None
    
    def is_available(self) -> bool:
        """Check if Supabase client is available."""
        return self.db_client is not None and self.db_client.is_available()
    
    async def fetch_assistant(self, assistant_id: str) -> Optional[Dict[str, Any]]:
        """Fetch assistant configuration from database."""
        if not self.is_available():
            self.logger.warning("Supabase client not available")
            return None
        
        call_id = f"supabase_fetch_{assistant_id}"
        
        async with measure_latency_context("supabase_fetch_assistant", call_id, {
            "assistant_id": assistant_id
        }):
            return await self.db_client.fetch_assistant(assistant_id)
    
    async def save_call_history(
        self,
        call_id: str,
        assistant_id: str,
        called_did: str,
        call_duration: int,
        call_status: str,
        transcription: List[Dict[str, Any]],
        participant_identity: Optional[str] = None,
        recording_sid: Optional[str] = None,
        call_sid: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None
    ) -> bool:
        """Save call history to database."""
        if not self.is_available():
            self.logger.warning("Supabase client not available")
            return False
        
        async with measure_latency_context("supabase_save_call_history", call_id, {
            "assistant_id": assistant_id,
            "call_duration": call_duration,
            "transcription_length": len(transcription),
            "has_recording": bool(recording_sid)
        }):
            return await self.db_client.save_call_history(
                call_id=call_id,
                assistant_id=assistant_id,
                called_did=called_did,
                call_duration=call_duration,
                call_status=call_status,
                transcription=transcription,
                participant_identity=participant_identity,
                recording_sid=recording_sid,
                call_sid=call_sid,
                start_time=start_time,
                end_time=end_time
            )
    
    async def save_n8n_spreadsheet_id(self, assistant_id: str, spreadsheet_id: str) -> bool:
        """Save N8N spreadsheet ID for assistant."""
        if not self.is_available():
            self.logger.warning("Supabase client not available")
            return False
        
        call_id = f"supabase_update_{assistant_id}"
        
        async with measure_latency_context("supabase_update_assistant", call_id, {
            "assistant_id": assistant_id,
            "operation": "save_n8n_spreadsheet_id"
        }):
            try:
                result = self.db_client.client.table("assistant").update({
                    "n8n_spreadsheet_id": spreadsheet_id
                }).eq("id", assistant_id).execute()
                
                if result.data:
                    self.logger.info(f"N8N_SPREADSHEET_SAVED | assistant_id={assistant_id} | spreadsheet_id={spreadsheet_id}")
                    return True
                else:
                    self.logger.error(f"Failed to save N8N spreadsheet ID: {assistant_id}")
                    return False
                    
            except Exception as e:
                self.logger.error(f"Error saving N8N spreadsheet ID: {e}")
                return False
