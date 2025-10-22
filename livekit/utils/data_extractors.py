"""
Data extraction utilities for phone numbers, names, and other metadata.
"""

import re
from typing import Optional


def extract_phone_from_room(room_name: str) -> str:
    """Extract phone number from room name."""
    try:
        # Handle patterns like "assistant-_+12017656193_tVG5An7aEcnF"
        if room_name.startswith("assistant-"):
            parts = room_name.split("_")
            if len(parts) >= 2:
                phone_part = parts[1]
                if phone_part.startswith("+"):
                    return phone_part
        return "unknown"
    except Exception:
        return "unknown"


def extract_name_from_summary(summary: str) -> Optional[str]:
    """Extract customer name from call summary text."""
    if not summary:
        return None
    
    # Common patterns for names in summaries
    patterns = [
        r'greeting the user,?\s+([A-Z][a-z]+)',  # "greeting the user, Jane"
        r'customer\s+([A-Z][a-z]+)',  # "customer Jane"
        r'caller\s+([A-Z][a-z]+)',  # "caller Jane"
        r'user\s+([A-Z][a-z]+)',  # "user Jane"
        r'client\s+([A-Z][a-z]+)',  # "client Jane"
        r'([A-Z][a-z]+)\s+mentioned',  # "Jane mentioned"
        r'([A-Z][a-z]+)\s+requested',  # "Jane requested"
        r'([A-Z][a-z]+)\s+asked',  # "Jane asked"
        r'([A-Z][a-z]+)\s+provided',  # "Jane provided"
        r'([A-Z][a-z]+)\s+confirmed',  # "Jane confirmed"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, summary, re.IGNORECASE)
        if match:
            name = match.group(1).strip()
            # Basic validation - should be a proper name
            if len(name) >= 2 and name.isalpha() and name[0].isupper():
                return name
    
    return None


def extract_did_from_room(room_name: str) -> Optional[str]:
    """Extract DID (phone number) from room name for inbound calls."""
    try:
        # Handle patterns like "inbound-_+12017656193_tVG5An7aEcnF"
        if room_name.startswith("inbound-"):
            parts = room_name.split("_")
            if len(parts) >= 2:
                did_part = parts[1]
                if did_part.startswith("+"):
                    return did_part
        return None
    except Exception:
        return None


def extract_call_sid_from_metadata(ctx_metadata: dict) -> Optional[str]:
    """Extract call SID from job metadata."""
    call_sid = None
    
    # Try different metadata keys where call_sid might be stored
    metadata_keys = ["call_sid", "CallSid", "callSid", "twilio_call_sid"]
    
    for key in metadata_keys:
        if key in ctx_metadata:
            call_sid = ctx_metadata[key]
            break
    
    return call_sid
