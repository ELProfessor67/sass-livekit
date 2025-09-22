"""
General utility functions for the LiveKit voice agent system.
"""

import hashlib
import re
from typing import Optional


def sha256_text(s: str) -> str:
    """Generate SHA256 hash of text string."""
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def preview(s: str, n: int = 160) -> str:
    """Create a preview of text with ellipsis if truncated."""
    return s[:n] + ("…" if len(s) > n else "")


def extract_called_did(room_name: str) -> Optional[str]:
    """
    Extract called DID (phone number) from room name.
    
    Args:
        room_name: The LiveKit room name
        
    Returns:
        Extracted phone number or None if not found
    """
    if not room_name:
        return None
    
    # Look for phone number pattern in room name
    m = re.search(r'\+\d{7,}', room_name)
    return m.group(0) if m else None


def validate_phone_number(phone: str) -> bool:
    """
    Validate phone number format.
    
    Args:
        phone: Phone number to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not phone:
        return False
    
    # Remove all non-digit characters
    digits = re.sub(r'\D', '', phone)
    
    # Check if it's a valid length (7-15 digits)
    return 7 <= len(digits) <= 15


def validate_email(email: str) -> bool:
    """
    Validate email format.
    
    Args:
        email: Email to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not email:
        return False
    
    # Basic email regex pattern
    pattern = r'^[^@\s]+@[^@\s]+\.[^@\s]+$'
    return bool(re.match(pattern, email.strip(), re.IGNORECASE))


def sanitize_text(text: str) -> str:
    """
    Sanitize text by removing potentially harmful characters.
    
    Args:
        text: Text to sanitize
        
    Returns:
        Sanitized text
    """
    if not text:
        return ""
    
    # Remove control characters and normalize whitespace
    sanitized = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
    sanitized = re.sub(r'\s+', ' ', sanitized).strip()
    
    return sanitized


def format_duration(seconds: int) -> str:
    """
    Format duration in seconds to human-readable string.
    
    Args:
        seconds: Duration in seconds
        
    Returns:
        Formatted duration string (e.g., "2m 30s")
    """
    if seconds < 60:
        return f"{seconds}s"
    
    minutes = seconds // 60
    remaining_seconds = seconds % 60
    
    if minutes < 60:
        if remaining_seconds == 0:
            return f"{minutes}m"
        return f"{minutes}m {remaining_seconds}s"
    
    hours = minutes // 60
    remaining_minutes = minutes % 60
    
    if remaining_minutes == 0:
        return f"{hours}h"
    return f"{hours}h {remaining_minutes}m"


def truncate_text(text: str, max_length: int = 1000) -> str:
    """
    Truncate text to maximum length with ellipsis.
    
    Args:
        text: Text to truncate
        max_length: Maximum length
        
    Returns:
        Truncated text
    """
    if not text or len(text) <= max_length:
        return text
    
    return text[:max_length - 3] + "..."
