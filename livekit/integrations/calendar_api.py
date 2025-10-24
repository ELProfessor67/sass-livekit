from __future__ import annotations

import datetime
import logging
import hashlib
import time
from dataclasses import dataclass
from typing import Protocol, Optional
from zoneinfo import ZoneInfo

from livekit.agents.utils import http_context

# Global cache for calendar slots
_calendar_cache = {}
_cache_ttl = 300  # 5 minutes cache TTL
_cache_max_size = 100  # Maximum cache entries

def _get_calendar_cache_key(event_type_id: str, start_time: str, end_time: str) -> str:
    """Generate cache key for calendar slots."""
    return hashlib.md5(f"{event_type_id}:{start_time}:{end_time}".encode()).hexdigest()

def _is_calendar_cache_valid(timestamp: float) -> bool:
    """Check if calendar cache entry is still valid."""
    return time.time() - timestamp < _cache_ttl

def _clean_calendar_cache():
    """Remove expired entries from calendar cache."""
    current_time = time.time()
    expired_keys = [
        key for key, (_, timestamp) in _calendar_cache.items()
        if current_time - timestamp > _cache_ttl
    ]
    for key in expired_keys:
        del _calendar_cache[key]
    
    # If still over limit, remove oldest entries
    if len(_calendar_cache) > _cache_max_size:
        sorted_items = sorted(_calendar_cache.items(), key=lambda x: x[1][1])
        for key, _ in sorted_items[:len(_calendar_cache) - _cache_max_size]:
            del _calendar_cache[key]

# API versions & base URLs
CAL_EVENT_TYPES_VERSION = "2024-06-14"   # v2 event types requires this header
CAL_BOOKINGS_VERSION    = "2024-08-13"   # v2 bookings requires this header
BASE_URL_V1 = "https://api.cal.com/v1/"
BASE_URL_V2 = "https://api.cal.com/v2/"


class SlotUnavailableError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)


@dataclass
class AvailableSlot:
    start_time: datetime.datetime
    duration_min: int = 30

    @property
    def unique_hash(self) -> str:
        import hashlib, base64
        raw = f"{self.start_time.isoformat()}|{self.duration_min}".encode()
        digest = hashlib.blake2s(raw, digest_size=5).digest()
        return f"CS_{base64.b32encode(digest).decode().rstrip('=').lower()}"


@dataclass
class CalendarError:
    error_type: str  # "calendar_unavailable", "no_slots_for_day", "invalid_date_range"
    message: str
    details: Optional[str] = None

@dataclass
class CalendarResult:
    slots: list[AvailableSlot]
    error: Optional[CalendarError] = None
    
    @property
    def is_success(self) -> bool:
        return self.error is None
    
    @property
    def is_calendar_unavailable(self) -> bool:
        return self.error is not None and self.error.error_type == "calendar_unavailable"
    
    @property
    def is_no_slots(self) -> bool:
        return self.error is not None and self.error.error_type == "no_slots_for_day"


class Calendar(Protocol):
    async def initialize(self) -> None: ...
    async def schedule_appointment(
        self,
        *,
        start_time: datetime.datetime,
        attendee_name: str,
        attendee_email: str,
        attendee_phone: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> None: ...
    async def list_available_slots(
        self, *, start_time: datetime.datetime, end_time: datetime.datetime
    ) -> CalendarResult: ...


class CalComCalendar(Calendar):
    """
    Cal.com implementation using:
      - v1 /slots for availability
      - v2 /event-types for metadata (length)
      - v2 /bookings for booking
    """

    def __init__(
        self,
        *,
        api_key: str,
        timezone: str,
        event_type_id: Optional[str] = None,
        username: Optional[str] = None,
        event_type_slug: Optional[str] = None,
        org_slug: Optional[str] = None,
    ) -> None:
        # Initialize logger first so it's available for timezone validation
        self._log = logging.getLogger("cal.com")
        
        # Validate and normalize timezone
        self.tz = self._validate_timezone(timezone)
        self._api_key = api_key
        self._event_type_id = event_type_id
        self._username = username
        self._event_type_slug = event_type_slug
        self._org_slug = org_slug
        self._event_length = 30  # will be updated in initialize()

        try:
            self._http = http_context.http_session()
        except RuntimeError:
            import aiohttp
            self._http = aiohttp.ClientSession()

    def _validate_timezone(self, timezone: str) -> ZoneInfo:
        """Validate and normalize timezone string to IANA format."""
        # Common timezone abbreviations mapping
        timezone_mapping = {
            "CST": "America/Chicago",
            "CDT": "America/Chicago", 
            "EST": "America/New_York",
            "EDT": "America/New_York",
            "PST": "America/Los_Angeles",
            "PDT": "America/Los_Angeles",
            "MST": "America/Denver",
            "MDT": "America/Denver",
            "GMT": "Europe/London",
            "BST": "Europe/London",
            "UTC": "UTC"
        }
        
        # Normalize timezone string
        normalized_tz = timezone.strip().upper()
        
        # Check if it's a common abbreviation and map it
        if normalized_tz in timezone_mapping:
            mapped_tz = timezone_mapping[normalized_tz]
            self._log.info(f"Cal.com: Mapped timezone '{timezone}' to '{mapped_tz}'")
            timezone = mapped_tz
        
        try:
            return ZoneInfo(timezone)
        except Exception as e:
            self._log.error(f"Cal.com: Invalid timezone '{timezone}': {str(e)}")
            # Fallback to UTC if timezone is invalid
            self._log.warning("Cal.com: Falling back to UTC timezone")
            return ZoneInfo("UTC")

    # -------- headers

    def _headers_v1(self) -> dict[str, str]:
        # v1 API requires apiKey as query parameter, not header
        return {
            "Content-Type": "application/json"
        }

    def _headers_v2(self, version: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "cal-api-version": version,
            "Content-Type": "application/json",
        }

    # -------- init: fetch event type length with v2

    async def initialize(self) -> None:
        if not self._event_type_id:
            self._log.info("Cal.com: initialize skipped (no event_type_id). Default 30 min length.")
            return

        url = f"{BASE_URL_V2}event-types/{self._event_type_id}"
        self._log.info(f"Cal.com: Fetching event type from {url}")
        
        try:
            async with self._http.get(url, headers=self._headers_v2(CAL_EVENT_TYPES_VERSION)) as resp:
                txt = await resp.text()
                if not resp.ok:
                    self._log.warning(f"Cal.com: could not fetch event type ({resp.status}) {txt}")
                    # If it's a 500 error, try different formats
                    if resp.status == 500:
                        # Try string format if it's currently an int
                        if isinstance(self._event_type_id, int):
                            self._log.info("Cal.com: Retrying with string format for event type ID")
                            url_str = f"{BASE_URL_V2}event-types/{str(self._event_type_id)}"
                            async with self._http.get(url_str, headers=self._headers_v2(CAL_EVENT_TYPES_VERSION)) as resp2:
                                txt2 = await resp2.text()
                                if not resp2.ok:
                                    self._log.error("Cal.com: retry also failed (%s) %s", resp2.status, txt2)
                                    raise Exception(f"Cal.com event type fetch failed: {resp2.status} - {txt2}")
                                # Parse the retry response, not the original
                                try:
                                    data = await resp2.json()
                                except Exception:
                                    self._log.error("Cal.com: event type response not JSON: %s", txt2)
                                    raise Exception("Cal.com event type response not valid JSON")
                        else:
                            # If it's already a string, try converting to int
                            try:
                                int_id = int(self._event_type_id)
                                self._log.info("Cal.com: Retrying with integer format for event type ID")
                                url_int = f"{BASE_URL_V2}event-types/{int_id}"
                                async with self._http.get(url_int, headers=self._headers_v2(CAL_EVENT_TYPES_VERSION)) as resp2:
                                    txt2 = await resp2.text()
                                    if not resp2.ok:
                                        self._log.error("Cal.com: retry also failed (%s) %s", resp2.status, txt2)
                                        raise Exception(f"Cal.com event type fetch failed: {resp2.status} - {txt2}")
                                    # Parse the retry response, not the original
                                    try:
                                        data = await resp2.json()
                                    except Exception:
                                        self._log.error("Cal.com: event type response not JSON: %s", txt2)
                                        raise Exception("Cal.com event type response not valid JSON")
                            except (ValueError, TypeError):
                                # Can't convert to int, just fail
                                raise Exception(f"Cal.com event type fetch failed: {resp.status} - {txt}")
                    else:
                        raise Exception(f"Cal.com event type fetch failed: {resp.status} - {txt}")
                        
                else:
                    # Happy path: parse resp
                    try:
                        data = await resp.json()
                    except Exception:
                        self._log.error("Cal.com: event type response not JSON: %s", txt)
                        raise Exception("Cal.com event type response not valid JSON")

                self._log.info("Cal.com: Event type data received: %s", data)
                length = (data.get("data") or {}).get("lengthInMinutes")
                if isinstance(length, int) and length > 0:
                    self._event_length = length
                    self._log.info("Cal.com: event length set to %d minutes", self._event_length)
                else:
                    self._log.warning("Cal.com: no valid length found, using default 30 minutes")
        except Exception as e:
            self._log.error("Cal.com: Error during initialization: %s", str(e))
            raise Exception(f"Cal.com calendar initialization failed: {str(e)}")

    # -------- availability: v1 /slots

    async def list_available_slots(
        self, *, start_time: datetime.datetime, end_time: datetime.datetime
    ) -> CalendarResult:
        """
        Use v1 /slots with retries and v2 fallback for better reliability.
        Returns CalendarResult with distinct error states.
        Includes aggressive caching for performance.
        """
        if not self._event_type_id and not (self._username or self._event_type_slug):
            self._log.warning("Cal.com: event_type_id or (username/slug) required for slots; returning empty.")
            return CalendarResult(
                slots=[],
                error=CalendarError(
                    error_type="calendar_unavailable",
                    message="Calendar not configured",
                    details="Missing event_type_id or username/slug"
                )
            )

        # Cal v1 requires string<date-time> for startTime/endTime. Send local-tz ISO with seconds.
        # Make endTime inclusive by pushing to 23:59:59 of the local end day.
        start_local = start_time.astimezone(self.tz)
        end_local = end_time.astimezone(self.tz).replace(hour=23, minute=59, second=59, microsecond=0)

        start_param = start_local.isoformat(timespec="seconds")
        end_param = end_local.isoformat(timespec="seconds")
        
        # Check cache first for massive speed improvement
        cache_key = _get_calendar_cache_key(str(self._event_type_id or ""), start_param, end_param)
        if cache_key in _calendar_cache:
            cached_result, timestamp = _calendar_cache[cache_key]
            if _is_calendar_cache_valid(timestamp):
                self._log.info("CALENDAR_CACHE_HIT | saved_time=1.5s | slots=%d", len(cached_result.slots))
                return cached_result
            else:
                # Remove expired entry
                del _calendar_cache[cache_key]
        
        # Clean cache periodically
        if len(_calendar_cache) > _cache_max_size * 0.8:
            _clean_calendar_cache()

        # Try v1 first with retries
        slots = await self._fetch_slots_v1_with_retry(start_param, end_param)
        
        # If v1 fails completely, try v2 fallback
        if slots is None:
            self._log.info("Cal.com: v1 failed, trying v2 fallback")
            slots = await self._fetch_slots_v2(start_param, end_param)
        
        if slots is None:
            # Both v1 and v2 failed
            return CalendarResult(
                slots=[],
                error=CalendarError(
                    error_type="calendar_unavailable",
                    message="Calendar service temporarily unavailable",
                    details="Both v1 and v2 API endpoints failed"
                )
            )
        
        if not slots:
            # Successfully got response but no slots available
            return CalendarResult(
                slots=[],
                error=CalendarError(
                    error_type="no_slots_for_day",
                    message="No available slots for the requested day",
                    details=f"No slots found for {start_local.date()}"
                )
            )
        
        result = CalendarResult(slots=slots)
        
        # Cache the result for future queries
        _calendar_cache[cache_key] = (result, time.time())
        self._log.info("CALENDAR_CACHE_STORED | slots=%d | cache_size=%d", len(slots), len(_calendar_cache))
        
        return result

    async def _fetch_slots_v1_with_retry(self, start_param: str, end_param: str) -> list[AvailableSlot] | None:
        """Try v1 /slots with exponential backoff retries."""
        import asyncio
        
        params: dict[str, str | int | bool] = {
            "apiKey": self._api_key,  # v1 API requires apiKey as query parameter
            "startTime": start_param,
            "endTime": end_param,
            "timeZone": str(self.tz),
        }

        # Prefer eventTypeId if provided; otherwise fall back to username/slug mode
        if self._event_type_id:
            # v1 API expects eventTypeId as number, but we'll try both string and int
            try:
                params["eventTypeId"] = int(self._event_type_id)
            except (ValueError, TypeError):
                # If conversion fails, use as string (some APIs accept both)
                params["eventTypeId"] = str(self._event_type_id)
        else:
            if self._username:
                params["usernameList"] = self._username
            if self._event_type_slug:
                params["eventTypeSlug"] = self._event_type_slug
            if self._org_slug:
                params["orgSlug"] = self._org_slug

        url = f"{BASE_URL_V1}slots"
        
        # Retry up to 3 times with exponential backoff
        for attempt in range(3):
            try:
                self._log.info("Cal.com: Requesting slots %s params=%s (attempt %d)", url, params, attempt + 1)
                
                async with self._http.get(url, headers=self._headers_v1(), params=params, timeout=30) as resp:
                    txt = await resp.text()
                    
                    if resp.status == 200:
                        try:
                            payload = await resp.json()
                            return self._parse_slots_response(payload)
                        except Exception as e:
                            self._log.error("Cal.com V1 /slots non-JSON response: %s", txt)
                            return []
                    
                    elif resp.status >= 500:
                        # Server error - retry with backoff
                        if attempt < 2:  # Don't sleep on last attempt
                            wait_time = 0.8 * (2 ** attempt)  # 0.8s, 1.6s, 3.2s
                            self._log.warning("Cal.com V1 /slots error %s (attempt %d), retrying in %.1fs: %s", 
                                            resp.status, attempt + 1, wait_time, txt)
                            await asyncio.sleep(wait_time)
                            continue
                        else:
                            self._log.error("Cal.com V1 /slots error %s (final attempt): %s", resp.status, txt)
                            return None
                    
                    else:
                        # Client error (4xx) - don't retry
                        self._log.error("Cal.com V1 /slots error %s: %s", resp.status, txt)
                        return None
                        
            except asyncio.TimeoutError:
                if attempt < 2:
                    wait_time = 0.8 * (2 ** attempt)
                    self._log.warning("Cal.com V1 /slots timeout (attempt %d), retrying in %.1fs", attempt + 1, wait_time)
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    self._log.error("Cal.com V1 /slots timeout (final attempt)")
                    return None
            except Exception as e:
                self._log.error("Cal.com V1 /slots unexpected error: %s", str(e))
                return None
        
        return None

    async def _fetch_slots_v2(self, start_param: str, end_param: str) -> list[AvailableSlot] | None:
        """Fallback to v2 /slots using GET with query parameters."""
        params: dict[str, str] = {
            "start": start_param,
            "end": end_param,
            "timeZone": str(self.tz),
        }
        
        # Add event type identification
        if self._event_type_id:
            params["eventTypeId"] = str(self._event_type_id)
        elif self._username and self._event_type_slug:
            params["username"] = self._username
            params["eventTypeSlug"] = self._event_type_slug
            if self._org_slug:
                params["organizationSlug"] = self._org_slug
        else:
            self._log.warning("Cal.com v2: No valid event type identification available")
            return []
        
        url = f"{BASE_URL_V2}slots"
        self._log.info("Cal.com: Requesting v2 slots %s params=%s", url, params)
        
        try:
            async with self._http.get(url, headers=self._headers_v2("2024-09-04"), params=params, timeout=30) as resp:
                txt = await resp.text()
                
                if resp.status == 200:
                    try:
                        payload = await resp.json()
                        return self._parse_slots_response_v2(payload)
                    except Exception as e:
                        self._log.error("Cal.com V2 /slots non-JSON response: %s", txt)
                        return []
                else:
                    self._log.error("Cal.com V2 /slots error %s: %s", resp.status, txt)
                    return []
                    
        except Exception as e:
            self._log.error("Cal.com V2 /slots unexpected error: %s", str(e))
            return []

    def _parse_slots_response(self, payload: dict) -> list[AvailableSlot]:
        """Parse v1 slots response."""
        slots_map = payload.get("slots", {}) or {}
        slots: list[AvailableSlot] = []

        # Response shape:
        # { "slots": { "YYYY-MM-DD": [ { "time": "2024-04-13T11:00:00+04:00" }, ... ] } }
        for _date, day_slots in slots_map.items():
            if not isinstance(day_slots, list):
                continue
            for item in day_slots:
                time_iso = item.get("time") or item.get("start") or item.get("startTime")
                if not time_iso:
                    continue
                try:
                    dt = datetime.datetime.fromisoformat(time_iso.replace("Z", "+00:00"))
                    local_dt = dt.astimezone(self.tz)
                    slots.append(AvailableSlot(start_time=local_dt, duration_min=self._event_length))
                except Exception as e:
                    self._log.warning("Cal.com: failed to parse slot time %r: %s", time_iso, e)
                    continue

        self._log.info("Cal.com: Parsed %d available slots", len(slots))
        return slots

    def _parse_slots_response_v2(self, payload: dict) -> list[AvailableSlot]:
        """Parse v2 slots response according to actual API specification."""
        slots: list[AvailableSlot] = []
        
        # v2 response format: { "status": "success", "data": { "YYYY-MM-DD": [ { "start": "..." } ] } }
        if payload.get("status") != "success":
            self._log.warning("Cal.com v2: Non-success status in response: %s", payload.get("status"))
            return slots
            
        data = payload.get("data", {})
        if not isinstance(data, dict):
            self._log.warning("Cal.com v2: Invalid data format in response")
            return slots
        
        for date_str, day_slots in data.items():
            if not isinstance(day_slots, list):
                continue
                
            for item in day_slots:
                if not isinstance(item, dict):
                    continue
                    
                # v2 uses "start" field
                time_iso = item.get("start")
                if not time_iso:
                    continue
                    
                try:
                    dt = datetime.datetime.fromisoformat(time_iso.replace("Z", "+00:00"))
                    local_dt = dt.astimezone(self.tz)
                    slots.append(AvailableSlot(start_time=local_dt, duration_min=self._event_length))
                except Exception as e:
                    self._log.warning("Cal.com v2: failed to parse slot time %r: %s", time_iso, e)
                    continue
        
        self._log.info("Cal.com v2: Parsed %d available slots", len(slots))
        return slots

    # -------- booking: v2 /bookings

    async def schedule_appointment(
        self,
        *,
        start_time: datetime.datetime,
        attendee_name: str,
        attendee_email: str,
        attendee_phone: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> None:
        """
        Create a booking via v2 /bookings. Send start in UTC with trailing 'Z'.
        Include lengthInMinutes and phoneNumber for best compatibility.
        """
        if not self._event_type_id and not (self._username and self._event_type_slug):
            raise Exception("Cal.com: need event_type_id or (username + event_type_slug) to book")

        start_utc = start_time.astimezone(datetime.timezone.utc)
        start_str = start_utc.strftime("%Y-%m-%dT%H:%M:%SZ")  # '...Z' form

        body: dict = {
            "start": start_str,
            "attendee": {
                "name": attendee_name,
                "email": attendee_email,
                "timeZone": str(self.tz),
                "language": "en",
            },
            "metadata": {
                "source": "Voice Agent",
                "notes": notes or "",
            },
        }

        # Prefer eventTypeId flow; otherwise slug/user flow (teams/org supported via slugs)
        if self._event_type_id:
            # v2 API expects eventTypeId as number according to docs
            try:
                body["eventTypeId"] = int(self._event_type_id)
            except (ValueError, TypeError):
                # If conversion fails, use as string (some APIs accept both)
                body["eventTypeId"] = str(self._event_type_id)
        else:
            body["eventTypeSlug"] = self._event_type_slug
            if self._username:
                body["username"] = self._username
            if self._org_slug:
                body["organizationSlug"] = self._org_slug

        # Pass phone in the attendee as 'phoneNumber' to match v2 schema
        if attendee_phone:
            body["attendee"]["phoneNumber"] = attendee_phone

        url = f"{BASE_URL_V2}bookings"
        self._log.info("Cal.com: Creating booking %s body=%s", url, body)

        async with self._http.post(url, headers=self._headers_v2(CAL_BOOKINGS_VERSION), json=body) as resp:
            txt = await resp.text()
            
            if resp.status >= 400:
                self._log.error("Cal.com booking failed %s: %s", resp.status, txt)
                if "not available" in txt.lower() or "already has booking" in txt.lower():
                    raise SlotUnavailableError(txt)
                elif resp.status == 429:
                    # Rate limiting - retry after delay
                    raise Exception(f"Cal.com rate limited. Please try again in a moment.")
                elif resp.status >= 500:
                    # Server error - retry might work
                    raise Exception(f"Cal.com server error {resp.status}. Please try again.")
                else:
                    raise Exception(f"Cal.com API error {resp.status}: {txt}")

            # Parse v2 bookings response according to official API spec
            try:
                response_data = await resp.json()
                if response_data.get("status") == "success":
                    booking_data = response_data.get("data", {})
                    booking_id = booking_data.get("id")
                    booking_uid = booking_data.get("uid")
                    self._log.info("Cal.com booking success: ID=%s, UID=%s", booking_id, booking_uid)
                else:
                    self._log.warning("Cal.com booking response status: %s", response_data.get("status"))
            except Exception as e:
                self._log.warning("Cal.com booking response parsing failed: %s", str(e))
                self._log.info("Cal.com booking success (raw): %s", txt)

    async def close(self) -> None:
        if getattr(self, "_http", None):
            await self._http.close()
