"""
Timezone resolution for booking flow.
- Normalize caller input to IANA timezone.
- Do not guess ambiguous abbreviations; ask for clarification.
- Never assume UTC or persist caller timezone on the assistant.
"""
from __future__ import annotations

import logging
from typing import Tuple, Optional
from zoneinfo import ZoneInfo

_log = logging.getLogger("timezone_utils")

# Unambiguous: single IANA mapping (US-style abbreviations and common names).
UNAMBIGUOUS_MAP = {
    "EST": "America/New_York",
    "EDT": "America/New_York",
    "CET": "Europe/Paris",
    "CEST": "Europe/Paris",
    "PST": "America/Los_Angeles",
    "PDT": "America/Los_Angeles",
    "MST": "America/Denver",
    "MDT": "America/Denver",
    "GMT": "Europe/London",
    "UTC": "UTC",
    "AEST": "Australia/Sydney",
    "AEDT": "Australia/Sydney",
    "PKT": "Asia/Karachi",
    "JST": "Asia/Tokyo",
    "KST": "Asia/Seoul",
    "PHT": "Asia/Manila",
    "SGT": "Asia/Singapore",
    "WAT": "Africa/Lagos",
    "EAT": "Africa/Nairobi",
    "SAST": "Africa/Johannesburg",
    "BET": "America/Sao_Paulo",
    "EET": "Europe/Athens",
    "EEST": "Europe/Athens",
    "WET": "Europe/London",
    "WEST": "Europe/London",
    "Eastern": "America/New_York",
    "Central": "America/Chicago",
    "Mountain": "America/Denver",
    "Pacific": "America/Los_Angeles",
    "Eastern time": "America/New_York",
    "Central time": "America/Chicago",
    "Mountain time": "America/Denver",
    "Pacific time": "America/Los_Angeles",
    "New York": "America/New_York",
    "Chicago": "America/Chicago",
    "Los Angeles": "America/Los_Angeles",
    "Denver": "America/Denver",
    "London": "Europe/London",
    "Paris": "Europe/Paris",
    "Berlin": "Europe/Berlin",
    "Dubai": "Asia/Dubai",
    "Mumbai": "Asia/Kolkata",
    "Karachi": "Asia/Karachi",
    "Singapore": "Asia/Singapore",
    "Sydney": "Australia/Sydney",
    "Toronto": "America/Toronto",
    "Vancouver": "America/Vancouver",
}

# Ambiguous abbreviations: require clarification. Value = (options description for prompt).
AMBIGUOUS = {
    "CST": (
        "CST can mean Central Standard Time (US: America/Chicago) or China Standard Time (Asia/Shanghai). "
        "Which do you mean—US Central time or China?"
    ),
    "IST": (
        "IST can mean India Standard Time (Asia/Kolkata) or Irish Standard Time (Europe/Dublin). "
        "Which do you mean—India or Ireland?"
    ),
    "AST": (
        "AST can mean Atlantic Standard Time (e.g. America/Halifax) or Arabia Standard Time (e.g. Asia/Riyadh). "
        "Which do you mean—Atlantic or Arabia?"
    ),
    "BST": (
        "BST can mean British Summer Time (Europe/London) or Bangladesh Standard Time (Asia/Dhaka). "
        "Which do you mean—UK or Bangladesh?"
    ),
    "ACT": (
        "ACT can mean Australian Central Time (Australia/Darwin) or Acre Time (America/Rio_Branco). "
        "Which do you mean?"
    ),
}


def normalize_caller_timezone(user_input: str) -> Tuple[Optional[ZoneInfo], Optional[str]]:
    """
    Parse caller timezone input and normalize to IANA ZoneInfo.
    - Returns (ZoneInfo, None) if resolved.
    - Returns (None, clarification_message) if input is ambiguous; do not proceed.
    - Returns (None, error_message) if invalid; ask again.
    Caller timezone is never persisted on the assistant; use only for this call/session.
    """
    if not user_input or not user_input.strip():
        return (None, "I need your time zone to show available times. What time zone are you in? You can say a city (e.g. New York), a region (e.g. Eastern time), or an IANA timezone (e.g. America/New_York).")

    raw = user_input.strip()
    normalized = raw.upper().replace(" ", "_")
    # Check ambiguous first (exact match on abbreviation)
    for abbr, clarification in AMBIGUOUS.items():
        if normalized == abbr:
            _log.info("TIMEZONE_AMBIGUOUS | input=%s | abbr=%s", raw, abbr)
            return (None, clarification)

    # Try unambiguous map (case-insensitive key)
    key_upper = raw.upper().strip()
    for k, iana in UNAMBIGUOUS_MAP.items():
        if k.upper() == key_upper or k.replace(" ", "_").upper() == key_upper:
            try:
                z = ZoneInfo(iana)
                _log.info("TIMEZONE_RESOLVED | input=%s | iana=%s", raw, iana)
                return (z, None)
            except Exception as e:
                _log.warning("TIMEZONE_MAP_INVALID | iana=%s | error=%s", iana, e)
                return (None, "I couldn't use that timezone. Please try a city (e.g. New York) or IANA timezone (e.g. America/New_York).")

    # Try as IANA identifier (e.g. America/New_York, Asia/Karachi)
    try:
        # Restore slashes if user said "America New York"
        candidate = raw.replace(" ", "/")
        z = ZoneInfo(candidate)
        _log.info("TIMEZONE_RESOLVED_IANA | input=%s | iana=%s", raw, candidate)
        return (z, None)
    except Exception:
        pass

    # Try without replacing space (exact IANA)
    try:
        z = ZoneInfo(raw)
        _log.info("TIMEZONE_RESOLVED_IANA | input=%s", raw)
        return (z, None)
    except Exception:
        pass

    _log.info("TIMEZONE_INVALID | input=%s", raw)
    return (
        None,
        "I couldn't recognize that timezone. Please say a city (e.g. New York), a region (e.g. Eastern time), or an IANA timezone (e.g. America/New_York)."
    )


def call_timezone_iana_string(zone: Optional[ZoneInfo]) -> Optional[str]:
    """Return IANA string for a ZoneInfo, for storage in call_data only (not persisted on assistant)."""
    if zone is None:
        return None
    return zone.key
