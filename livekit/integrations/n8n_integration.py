"""
N8N integration for webhook handling and data collection.
"""

import json
import logging
import datetime
from typing import Dict, Any, Optional, List
import aiohttp


class N8NPayloadBuilder:
    """Builds N8N webhook payloads."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def build_payload(
        self,
        assistant_config: Dict[str, Any],
        call_data: Dict[str, Any],
        session_history: List[Dict[str, Any]],
        collected_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Build N8N webhook payload.
        
        Args:
            assistant_config: Assistant configuration data
            call_data: Call information
            session_history: Call transcription history
            collected_data: Collected user data (name, email, phone)
            
        Returns:
            N8N webhook payload dictionary
        """
        try:
            # Extract assistant info
            assistant_info = {
                "id": assistant_config.get("id"),
                "name": assistant_config.get("name"),
                "custom_data": {}
            }
            
            # Extract call info
            call_info = {
                "id": call_data.get("call_id"),
                "from": call_data.get("from_number"),
                "to": call_data.get("to_number"),
                "duration": call_data.get("call_duration"),
                "transcript_url": call_data.get("transcript_url"),
                "recording_url": call_data.get("recording_url"),
                "direction": call_data.get("call_direction"),
                "status": call_data.get("call_status"),
                "start_time": call_data.get("start_time"),
                "end_time": call_data.get("end_time"),
                "participant_identity": call_data.get("participant_identity")
            }
            
            # Extract N8N config
            n8n_config = {
                "webhook_url": assistant_config.get("n8n_webhook_url"),
                "auto_create_sheet": assistant_config.get("n8n_auto_create_sheet", False),
                "drive_folder_id": assistant_config.get("n8n_drive_folder_id"),
                "spreadsheet_name_template": assistant_config.get("n8n_spreadsheet_name_template"),
                "sheet_tab_template": assistant_config.get("n8n_sheet_tab_template"),
                "spreadsheet_id": assistant_config.get("n8n_spreadsheet_id"),
                "sheet_tab": assistant_config.get("n8n_sheet_tab"),
                "save_fields": {
                    "name": assistant_config.get("n8n_save_name", False),
                    "email": assistant_config.get("n8n_save_email", False),
                    "phone": assistant_config.get("n8n_save_phone", False),
                    "summary": assistant_config.get("n8n_save_summary", False),
                    "sentiment": assistant_config.get("n8n_save_sentiment", False),
                    "labels": assistant_config.get("n8n_save_labels", False),
                    "recording_url": assistant_config.get("n8n_save_recording_url", False),
                    "transcript_url": assistant_config.get("n8n_save_transcript_url", False),
                    "duration": assistant_config.get("n8n_save_duration", False),
                    "call_direction": assistant_config.get("n8n_save_call_direction", False),
                    "from_number": assistant_config.get("n8n_save_from_number", False),
                    "to_number": assistant_config.get("n8n_save_to_number", False),
                    "cost": assistant_config.get("n8n_save_cost", False)
                },
                "custom_fields": assistant_config.get("n8n_custom_fields", [])
            }
            
            # Build conversation summary
            conversation_summary = self._build_conversation_summary(session_history)
            
            # Add collected contact information
            contact_info = {}
            if collected_data:
                contact_info = {
                    "name": collected_data.get("name"),
                    "email": collected_data.get("email"),
                    "phone": collected_data.get("phone")
                }
            
            # Build the complete payload
            payload = {
                "assistant": assistant_info,
                "call": call_info,
                "n8n_config": n8n_config,
                "conversation_summary": conversation_summary,
                "transcript": session_history,
                "contact_info": contact_info,
                "timestamp": datetime.datetime.now().isoformat()
            }
            
            self.logger.info(
                f"N8N_PAYLOAD_BUILT | assistant_id={assistant_info.get('id')} | "
                f"call_id={call_info.get('id')} | payload_keys={list(payload.keys())}"
            )
            
            return payload
            
        except Exception as e:
            self.logger.error(f"N8N_PAYLOAD_BUILD_ERROR | error={str(e)}")
            return {}
    
    def _build_conversation_summary(self, session_history: List[Dict[str, Any]]) -> str:
        """Build conversation summary from session history."""
        if not session_history:
            return ""
        
        # Extract user messages for summary
        user_messages = []
        for item in session_history:
            if isinstance(item, dict) and item.get("role") == "user" and item.get("content"):
                content = item["content"]
                if isinstance(content, list):
                    content = " ".join([str(c) for c in content if c])
                user_messages.append(str(content).strip())
        
        if user_messages:
            return " ".join(user_messages)
        
        return ""


class N8NIntegration:
    """Handles N8N webhook integration."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.payload_builder = N8NPayloadBuilder()
    
    async def send_webhook(
        self,
        webhook_url: str,
        payload: Dict[str, Any],
        timeout: int = 30
    ) -> Optional[Dict[str, Any]]:
        """
        Send data to N8N webhook.
        
        Args:
            webhook_url: N8N webhook URL
            payload: Data payload to send
            timeout: Request timeout in seconds
            
        Returns:
            Response data or None if failed
        """
        try:
            # Convert payload to JSON
            json_data = json.dumps(payload, default=str)
            
            self.logger.info(
                f"N8N_WEBHOOK_SENDING | url={webhook_url} | payload_size={len(json_data)}"
            )
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    webhook_url,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=timeout),
                    headers={
                        "Content-Type": "application/json",
                        "User-Agent": "LiveKit-Voice-Agent/1.0"
                    }
                ) as response:
                    response_data = await response.json()
                    
                    if response.status == 200:
                        self.logger.info(
                            f"N8N_WEBHOOK_SUCCESS | status={response.status} | "
                            f"response_size={len(str(response_data))}"
                        )
                        return response_data
                    else:
                        self.logger.warning(
                            f"N8N_WEBHOOK_ERROR | status={response.status} | "
                            f"response={response_data}"
                        )
                        return None
                        
        except asyncio.TimeoutError:
            self.logger.error(f"N8N_WEBHOOK_TIMEOUT | url={webhook_url}")
            return None
        except Exception as e:
            self.logger.error(f"N8N_WEBHOOK_ERROR | url={webhook_url} | error={str(e)}")
            return None
    
    async def process_call_completion(
        self,
        assistant_config: Dict[str, Any],
        call_data: Dict[str, Any],
        session_history: List[Dict[str, Any]],
        collected_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Process call completion and send to N8N.
        
        Args:
            assistant_config: Assistant configuration
            call_data: Call data
            session_history: Call transcription
            collected_data: Collected user data
            
        Returns:
            True if successful, False otherwise
        """
        webhook_url = assistant_config.get("n8n_webhook_url")
        if not webhook_url:
            self.logger.info("N8N_WEBHOOK_SKIPPED | no webhook URL configured")
            return False
        
        # Build payload
        payload = self.payload_builder.build_payload(
            assistant_config, call_data, session_history, collected_data
        )
        
        if not payload:
            self.logger.error("N8N_PAYLOAD_BUILD_FAILED")
            return False
        
        # Send webhook
        response = await self.send_webhook(webhook_url, payload)
        
        if response:
            # Check if N8N returned a new spreadsheet ID
            if response.get("spreadsheet_id"):
                self.logger.info(
                    f"N8N_SPREADSHEET_CREATED | spreadsheet_id={response['spreadsheet_id']}"
                )
            
            self.logger.info("N8N_WEBHOOK_COMPLETED")
            return True
        else:
            self.logger.warning("N8N_WEBHOOK_FAILED")
            return False
