"""
Twilio Recording Service
Handles starting, stopping, and managing call recordings via Twilio API
"""

import os
import logging
import asyncio
from typing import Optional, Dict, Any
import aiohttp
from datetime import datetime

class TwilioRecordingService:
    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.base_url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}"
        self.recording_status_callback_url = os.getenv("RECORDING_STATUS_CALLBACK_URL")
        
        # Check if recording is enabled via environment variable
        self.enabled = os.getenv("ENABLE_CALL_RECORDING", "true").lower() == "true"
        
        if not self.account_sid or not self.auth_token:
            logging.warning("Twilio credentials not configured - recording will be disabled")
            self.enabled = False
        elif not self.enabled:
            logging.info("Call recording is disabled via ENABLE_CALL_RECORDING environment variable")
        else:
            logging.info("Call recording is enabled")

    async def start_recording(
        self, 
        call_sid: str, 
        recording_options: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Start recording a Twilio call
        
        Args:
            call_sid: The SID of the call to record
            recording_options: Optional recording configuration
            
        Returns:
            Recording information if successful, None if failed
        """
        if not self.enabled:
            logging.warning("Recording service disabled - skipping recording start")
            return None
            
        if not call_sid:
            logging.error("Call SID is required to start recording")
            return None

        # Default recording options
        default_options = {
            "RecordingChannels": "dual",  # Record both inbound and outbound audio
            "RecordingTrack": "both",     # Record both tracks
            "PlayBeep": True,             # Play beep when recording starts
            "Trim": "do-not-trim",        # Don't trim silence
            "Transcribe": True,           # Enable transcription
        }
        
        # Merge with provided options
        if recording_options:
            default_options.update(recording_options)
            
        # Status callback disabled - no notifications needed
        # if self.recording_status_callback_url:
        #     default_options["RecordingStatusCallback"] = self.recording_status_callback_url
        #     default_options["RecordingStatusCallbackEvent"] = ["in-progress", "completed", "failed"]
        #     default_options["RecordingStatusCallbackMethod"] = "POST"

        # Prepare the request
        url = f"{self.base_url}/Calls/{call_sid}/Recordings.json"
        
        # Basic auth for Twilio API
        auth = aiohttp.BasicAuth(self.account_sid, self.auth_token)
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, data=default_options, auth=auth) as response:
                    if response.status == 201:
                        recording_data = await response.json()
                        logging.info(
                            "RECORDING_STARTED | call_sid=%s | recording_sid=%s | status=%s",
                            call_sid, 
                            recording_data.get("sid"),
                            recording_data.get("status")
                        )
                        return recording_data
                    else:
                        error_text = await response.text()
                        logging.error(
                            "RECORDING_START_FAILED | call_sid=%s | status=%d | error=%s",
                            call_sid, response.status, error_text
                        )
                        return None
                        
        except Exception as e:
            logging.exception("RECORDING_START_ERROR | call_sid=%s | error=%s", call_sid, str(e))
            return None

    async def stop_recording(self, recording_sid: str) -> bool:
        """
        Stop a recording by its SID
        
        Args:
            recording_sid: The SID of the recording to stop
            
        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            logging.warning("Recording service disabled - skipping recording stop")
            return False
            
        if not recording_sid:
            logging.error("Recording SID is required to stop recording")
            return False

        url = f"{self.base_url}/Recordings/{recording_sid}.json"
        auth = aiohttp.BasicAuth(self.account_sid, self.auth_token)
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, data={"Status": "stopped"}, auth=auth) as response:
                    if response.status == 200:
                        logging.info("RECORDING_STOPPED | recording_sid=%s", recording_sid)
                        return True
                    else:
                        error_text = await response.text()
                        logging.error(
                            "RECORDING_STOP_FAILED | recording_sid=%s | status=%d | error=%s",
                            recording_sid, response.status, error_text
                        )
                        return False
                        
        except Exception as e:
            logging.exception("RECORDING_STOP_ERROR | recording_sid=%s | error=%s", recording_sid, str(e))
            return False

    async def get_recording(self, recording_sid: str) -> Optional[Dict[str, Any]]:
        """
        Get recording information by SID
        
        Args:
            recording_sid: The SID of the recording
            
        Returns:
            Recording information if found, None otherwise
        """
        if not self.enabled:
            return None
            
        if not recording_sid:
            return None

        url = f"{self.base_url}/Recordings/{recording_sid}.json"
        auth = aiohttp.BasicAuth(self.account_sid, self.auth_token)
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, auth=auth) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        logging.error(
                            "RECORDING_FETCH_FAILED | recording_sid=%s | status=%d",
                            recording_sid, response.status
                        )
                        return None
                        
        except Exception as e:
            logging.exception("RECORDING_FETCH_ERROR | recording_sid=%s | error=%s", recording_sid, str(e))
            return None

    def is_enabled(self) -> bool:
        """Check if recording service is enabled"""
        return self.enabled

# Global instance
recording_service = TwilioRecordingService()
