from __future__ import annotations

import datetime
import logging
from dataclasses import dataclass
from typing import Protocol, Optional
from zoneinfo import ZoneInfo

from livekit.agents.utils import http_context

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
    ) -> list[AvailableSlot]: ...


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
        event_type_id: Optional[int] = None,
        username: Optional[str] = None,
        event_type_slug: Optional[str] = None,
        org_slug: Optional[str] = None,
    ) -> None:
        self.tz = ZoneInfo(timezone)
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

        self._log = logging.getLogger("cal.com")

    # -------- headers

    def _headers_v1(self) -> dict[str, str]:
        # v1 uses apiKey as a query param, no bearer header needed
        return {"Content-Type": "application/json"}

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
        async with self._http.get(url, headers=self._headers_v2(CAL_EVENT_TYPES_VERSION)) as resp:
            txt = await resp.text()
            if not resp.ok:
                self._log.warning(f"Cal.com: could not fetch event type ({resp.status}) {txt}")
                return
            try:
                data = await resp.json()
            except Exception:
                self._log.warning("Cal.com: event type response not JSON: %s", txt)
                return

            self._log.info("Cal.com: Event type data received: %s", data)
            length = (data.get("data") or {}).get("lengthInMinutes")
            if isinstance(length, int) and length > 0:
                self._event_length = length
                self._log.info("Cal.com: event length set to %d minutes", self._event_length)

    # -------- availability: v1 /slots

    async def list_available_slots(
        self, *, start_time: datetime.datetime, end_time: datetime.datetime
    ) -> list[AvailableSlot]:
        """
        Use v1 /slots with ISO 8601 DATETIME params (NOT date-only).
        """
        if not self._event_type_id and not (self._username or self._event_type_slug):
            self._log.warning("Cal.com: event_type_id or (username/slug) required for slots; returning empty.")
            return []

        # Cal v1 requires string<date-time> for startTime/endTime. Send local-tz ISO with seconds.
        # Make endTime inclusive by pushing to 23:59:59 of the local end day.
        start_local = start_time.astimezone(self.tz)
        end_local = end_time.astimezone(self.tz).replace(hour=23, minute=59, second=59, microsecond=0)

        start_param = start_local.isoformat(timespec="seconds")
        end_param = end_local.isoformat(timespec="seconds")

        params: dict[str, str | int | bool] = {
            "apiKey": self._api_key,
            "startTime": start_param,
            "endTime": end_param,
            "timeZone": str(self.tz),
        }

        # Prefer eventTypeId if provided; otherwise fall back to username/slug mode
        if self._event_type_id:
            params["eventTypeId"] = str(self._event_type_id)
        else:
            if self._username:
                params["usernameList"] = self._username  # server accepts CSV or array
            if self._event_type_slug:
                params["eventTypeSlug"] = self._event_type_slug
            if self._org_slug:
                params["orgSlug"] = self._org_slug

        url = f"{BASE_URL_V1}slots"
        self._log.info("Cal.com: Requesting slots %s params=%s", url, params)

        async with self._http.get(url, headers=self._headers_v1(), params=params) as resp:
            txt = await resp.text()
            if not resp.ok:
                self._log.error("Cal.com V1 /slots error %s: %s", resp.status, txt)
                return []

            try:
                payload = await resp.json()
            except Exception:
                self._log.error("Cal.com V1 /slots non-JSON response: %s", txt)
                return []

            self._log.info("Cal.com: V1 Slots response: %s", payload)

            slots_map = payload.get("slots", {}) or {}
            slots: list[AvailableSlot] = []

            # Response shape:
            # { "slots": { "YYYY-MM-DD": [ { "time": "2024-04-13T11:00:00+04:00" }, ... ] } }
            for _date, day_slots in slots_map.items():
                if not isinstance(day_slots, list):
                    continue
                for item in day_slots:
                    time_iso = item.get("time")
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
            body["eventTypeId"] = int(self._event_type_id)
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
                if "not available" in txt.lower():
                    raise SlotUnavailableError(txt)
                raise Exception(f"Cal.com API error {resp.status}: {txt}")

            self._log.info("Cal.com booking success: %s", txt)

    async def close(self) -> None:
        if getattr(self, "_http", None):
            await self._http.close()
