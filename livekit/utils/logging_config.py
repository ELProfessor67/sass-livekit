"""
Centralized logging configuration for the LiveKit voice agent system.
"""

import logging
import sys
from typing import Optional
from datetime import datetime


def setup_logging(level: str = "INFO", format_string: Optional[str] = None) -> None:
    """
    Set up logging configuration.
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        format_string: Custom format string for log messages
    """
    if format_string is None:
        format_string = (
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    # Configure root logger
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format=format_string,
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Set specific loggers
    logging.getLogger("livekit").setLevel(logging.INFO)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the specified name.
    
    Args:
        name: Logger name
        
    Returns:
        Logger instance
    """
    return logging.getLogger(name)


class CallLogger:
    """Specialized logger for call-related events."""
    
    def __init__(self, call_id: str):
        self.call_id = call_id
        self.logger = get_logger(f"call.{call_id}")
    
    def log_call_start(self, assistant_id: str, room_name: str):
        """Log call start event."""
        self.logger.info(
            f"CALL_START | call_id={self.call_id} | assistant_id={assistant_id} | room={room_name}"
        )
    
    def log_call_end(self, duration: int, status: str):
        """Log call end event."""
        self.logger.info(
            f"CALL_END | call_id={self.call_id} | duration={duration}s | status={status}"
        )
    
    def log_assistant_response(self, response: str):
        """Log assistant response."""
        self.logger.debug(
            f"ASSISTANT_RESPONSE | call_id={self.call_id} | response={response[:100]}..."
        )
    
    def log_user_input(self, input_text: str):
        """Log user input."""
        self.logger.debug(
            f"USER_INPUT | call_id={self.call_id} | input={input_text[:100]}..."
        )
    
    def log_error(self, error: str, exception: Optional[Exception] = None):
        """Log error event."""
        if exception:
            self.logger.error(
                f"ERROR | call_id={self.call_id} | error={error} | exception={str(exception)}",
                exc_info=True
            )
        else:
            self.logger.error(f"ERROR | call_id={self.call_id} | error={error}")
    
    def log_data_collection(self, field: str, value: str):
        """Log data collection event."""
        self.logger.info(
            f"DATA_COLLECTED | call_id={self.call_id} | field={field} | value={value[:50]}..."
        )
    
    def log_n8n_webhook(self, webhook_url: str, success: bool, response_size: int = 0):
        """Log N8N webhook event."""
        status = "SUCCESS" if success else "FAILED"
        self.logger.info(
            f"N8N_WEBHOOK_{status} | call_id={self.call_id} | url={webhook_url} | size={response_size}"
        )
