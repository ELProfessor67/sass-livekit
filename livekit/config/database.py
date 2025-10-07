"""
Database configuration and connection utilities.
"""

import os
import logging
from typing import Optional, Dict, Any
from dataclasses import dataclass

try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = object


@dataclass
class DatabaseConfig:
    """Database configuration settings."""
    url: str
    service_role_key: str
    enabled: bool = True
    
    @classmethod
    def from_env(cls) -> "DatabaseConfig":
        return cls(
            url=os.getenv("SUPABASE_URL", ""),
            service_role_key=os.getenv("SUPABASE_SERVICE_ROLE", "") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
            enabled=bool(os.getenv("SUPABASE_URL") and (os.getenv("SUPABASE_SERVICE_ROLE") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")))
        )


class DatabaseClient:
    """Supabase database client wrapper."""
    
    def __init__(self, config: DatabaseConfig):
        self.config = config
        self._client: Optional[Client] = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize the Supabase client."""
        if not self.config.enabled:
            logging.warning("Database client disabled - no Supabase configuration")
            return
        
        if not create_client:
            logging.warning("Supabase client not available - install supabase-py")
            return
        
        if not self.config.url or not self.config.service_role_key:
            logging.warning("Supabase credentials not configured")
            return
        
        try:
            self._client = create_client(self.config.url, self.config.service_role_key)
            logging.info("Database client initialized successfully")
        except Exception as e:
            logging.error(f"Failed to initialize database client: {e}")
            self._client = None
    
    @property
    def client(self) -> Optional[Client]:
        """Get the Supabase client instance."""
        return self._client
    
    def is_available(self) -> bool:
        """Check if database client is available."""
        return self._client is not None
    
    async def fetch_assistant(self, assistant_id: str) -> Optional[Dict[str, Any]]:
        """Fetch assistant configuration from database."""
        if not self.is_available():
            logging.warning("Database client not available")
            return None
        
        try:
            result = self._client.table("assistant").select(
                "id, name, prompt, first_message, calendar, cal_api_key, cal_event_type_id, cal_event_type_slug, cal_timezone, "
                "llm_provider_setting, llm_model_setting, temperature_setting, max_token_setting, "
                "knowledge_base_id, n8n_webhook_url, n8n_auto_create_sheet, n8n_drive_folder_id, "
                "n8n_spreadsheet_name_template, n8n_sheet_tab_template, n8n_spreadsheet_id, "
                "n8n_sheet_tab, n8n_save_name, n8n_save_email, n8n_save_phone, n8n_save_summary, "
                "n8n_save_sentiment, n8n_save_labels, n8n_save_recording_url, n8n_save_transcript_url, "
                "n8n_save_duration, n8n_save_call_direction, n8n_save_from_number, n8n_save_to_number, "
                "n8n_save_cost, n8n_custom_fields, groq_model, groq_temperature, groq_max_tokens, "
                "cerebras_model, cerebras_temperature, cerebras_max_tokens, structured_data_fields, "
                "analysis_summary_prompt, analysis_evaluation_prompt, analysis_structured_data_prompt, "
                "analysis_structured_data_properties, analysis_summary_timeout, analysis_evaluation_timeout, "
                "analysis_structured_data_timeout, end_call_message, idle_messages, max_idle_messages, "
                "silence_timeout, max_call_duration"
            ).eq("id", assistant_id).single().execute()
            
            if result.data:
                logging.info(f"Assistant fetched from database: {assistant_id}")
                return result.data
            else:
                logging.warning(f"Assistant not found in database: {assistant_id}")
                return None
                
        except Exception as e:
            logging.error(f"Error fetching assistant from database: {e}")
            return None
    
    async def save_call_history(
        self,
        call_id: str,
        assistant_id: str,
        called_did: str,
        call_duration: int,
        call_status: str,
        transcription: list,
        participant_identity: Optional[str] = None,
        recording_sid: Optional[str] = None,
        call_sid: Optional[str] = None
    ) -> bool:
        """Save call history to database."""
        if not self.is_available():
            logging.warning("Database client not available")
            return False
        
        try:
            call_data = {
                "call_id": call_id,
                "assistant_id": assistant_id,
                "called_did": called_did,
                "call_duration": call_duration,
                "call_status": call_status,
                "transcription": transcription,
                "participant_identity": participant_identity,
                "recording_sid": recording_sid,
                "call_sid": call_sid,
                "created_at": "now()"
            }
            
            result = self._client.table("call_history").insert(call_data).execute()
            
            if result.data:
                logging.info(f"Call history saved: {call_id}")
                return True
            else:
                logging.error(f"Failed to save call history: {call_id}")
                return False
                
        except Exception as e:
            logging.error(f"Error saving call history: {e}")
            return False


# Global database client instance
_db_client: Optional[DatabaseClient] = None


def get_database_client() -> Optional[DatabaseClient]:
    """Get the global database client instance."""
    global _db_client
    if _db_client is None:
        config = DatabaseConfig.from_env()
        _db_client = DatabaseClient(config)
    return _db_client


def get_database_config() -> DatabaseConfig:
    """Get database configuration."""
    return DatabaseConfig.from_env()
