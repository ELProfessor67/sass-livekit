"""
Logging hardening utilities to prevent sensitive data leakage.
"""

import logging
import re
from typing import Optional

# Sensitive keys that should be redacted from logs
SENSITIVE_KEYS = (
    "authorization", "apikey", "x-api-key", "api_key", "token", 
    "secret", "bearer", "password", "passwd", "pwd", "credential"
)

class RedactHeaders(logging.Filter):
    """Filter to redact sensitive information from log messages."""
    
    def __init__(self):
        super().__init__()
        # Compile regex patterns for efficient matching
        self._key_pattern = re.compile(
            r"(?i)(" + "|".join(map(re.escape, SENSITIVE_KEYS)) + r")"
        )
        self._value_pattern = re.compile(
            r"(?i)(" + "|".join(map(re.escape, SENSITIVE_KEYS)) + r")\s*[:=]\s*([^,)\s]+)"
        )

    def filter(self, record: logging.LogRecord) -> bool:
        """Filter and redact sensitive information from log records."""
        msg = str(record.getMessage())
        
        # Redact tokens that appear as header tuples or key=value pairs
        def redact_value(match):
            key = match.group(1)
            return f"{key}=<redacted>"
        
        # Apply redaction
        msg = self._value_pattern.sub(redact_value, msg)
        
        # Update the record
        record.msg = msg
        record.args = ()
        return True

def harden_logging() -> None:
    """
    Harden logging configuration to prevent sensitive data leakage.
    
    This function:
    1. Sets noisy protocol loggers to WARNING level
    2. Adds redaction filter to prevent sensitive data exposure
    3. Maintains useful logging while protecting secrets
    """
    # Drop chatty protocol debugs entirely
    noisy_loggers = ("hpack", "h2", "httpx", "urllib3", "httpcore")
    for logger_name in noisy_loggers:
        logger = logging.getLogger(logger_name)
        logger.setLevel(logging.WARNING)
        logger.propagate = True  # Ensure messages still propagate
    
    # Attach redaction filter to root logger
    root_logger = logging.getLogger()
    if not any(isinstance(f, RedactHeaders) for f in root_logger.filters):
        root_logger.addFilter(RedactHeaders())
    
    # Also attach to common HTTP loggers
    http_loggers = ("httpx", "httpcore", "urllib3")
    for logger_name in http_loggers:
        logger = logging.getLogger(logger_name)
        if not any(isinstance(f, RedactHeaders) for f in logger.filters):
            logger.addFilter(RedactHeaders())

def configure_safe_logging(level: int = logging.INFO) -> None:
    """
    Configure logging with security hardening applied.
    
    Args:
        level: Logging level to use (default: INFO)
    """
    # Configure basic logging
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Apply hardening
    harden_logging()
    
    # Log the configuration
    logger = logging.getLogger(__name__)
    logger.info("Logging configured with security hardening applied")
