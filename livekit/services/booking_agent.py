"""
LiveKit Agent implementation for booking functionality.
Converts the existing Assistant class to follow LiveKit Agents framework patterns.
"""

from __future__ import annotations

import json
import logging
import datetime
import re
from typing import Optional

from livekit.agents import Agent, RunContext, function_tool
from integrations.calendar_api import Calendar, AvailableSlot, SlotUnavailableError, CalendarResult, CalendarError


class BookingAgent(Agent):
    """LiveKit Agent for handling booking appointments."""
    
    def __init__(self, instructions: str, calendar: Calendar | None = None) -> None:
        super().__init__(instructions=instructions)
        self.calendar = calendar

        # Booking state (FSM)
        self._booking_intent: bool = False
        self._notes: str = ""
        self._preferred_day: Optional[datetime.date] = None
        self._slots_map: dict[str, AvailableSlot] = {}
        self._selected_slot: Optional[AvailableSlot] = None

        self._name: Optional[str] = None
        self._email: Optional[str] = None
        self._phone: Optional[str] = None
        self._confirmed: bool = False

        # Webhook data collection
        self._webhook_data: dict[str, str] = {}
        
        # Analysis data collection
        self._structured_data: dict[str, any] = {}
        self._analysis_fields: list = []

    async def on_enter(self):
        """Called when the agent is added to the session."""
        # Generate initial greeting
        self.session.generate_reply()

    # ---------- Helper methods ----------
    def _tz(self):
        from zoneinfo import ZoneInfo
        return self.calendar.tz if self.calendar else ZoneInfo("UTC")

    def _parse_day(self, day_query: str) -> Optional[datetime.date]:
        if not day_query:
            return None
        q = day_query.strip().lower()
        tz = self._tz()
        today = datetime.datetime.now(tz).date()
        if q in {"today"}:
            return today
        if q in {"tomorrow", "tmrw", "tomorow", "tommorow"}:
            return today + datetime.timedelta(days=1)
        wk = {
            "mon":0,"monday":0,"tue":1,"tues":1,"tuesday":1,"wed":2,"wednesday":2,
            "thu":3,"thur":3,"thurs":3,"thursday":3,"fri":4,"friday":4,"sat":5,"saturday":5,"sun":6,"sunday":6
        }
        if q in wk:
            delta = (wk[q] - today.weekday()) % 7
            return today + datetime.timedelta(days=delta)
        try:
            return datetime.date.fromisoformat(q)  # YYYY-MM-DD
        except Exception:
            pass
        m = re.match(r"^\s*(\d{1,2})[\/\-\s](\d{1,2})\s*$", q)
        if m:
            a, b = int(m.group(1)), int(m.group(2))
            for (d, mo) in [(a,b),(b,a)]:
                try:
                    return datetime.date(today.year, mo, d)
                except Exception:
                    pass
        months = {m.lower(): i for i,m in enumerate(
            ["January","February","March","April","May","June","July","August","September","October","November","December"],1)}
        short = {k[:3]: v for k,v in months.items()}
        toks = re.split(r"\s+", q)
        if len(toks) == 2:
            a,b = toks
            def tom(s): return months.get(s.lower()) or short.get(s[:3].lower())
            # Remove ordinal suffixes (st, nd, rd, th) from day numbers
            def clean_day(day_str):
                return re.sub(r'(\d+)(st|nd|rd|th)', r'\1', day_str)
            try:
                day = int(clean_day(a)); mo = tom(b)
                if mo: 
                    parsed_date = datetime.date(today.year, mo, day)
                    # If the parsed date is in the past, assume next year
                    if parsed_date < today:
                        parsed_date = datetime.date(today.year + 1, mo, day)
                    return parsed_date
            except Exception:
                pass
            try:
                mo = tom(a); day = int(clean_day(b))
                if mo: 
                    parsed_date = datetime.date(today.year, mo, day)
                    # If the parsed date is in the past, assume next year
                    if parsed_date < today:
                        parsed_date = datetime.date(today.year + 1, mo, day)
                    return parsed_date
            except Exception:
                pass
        return None

    def _require_calendar(self) -> str | None:
        if not self.calendar:
            return "I can't take bookings right now."
        return None

    def _email_ok(self, e: str) -> bool:
        return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", e.strip(), re.I))

    def _phone_ok(self, p: str) -> bool:
        digits = re.sub(r"\D", "", p)
        return 7 <= len(digits) <= 15
    
    def _format_phone(self, p: str) -> str:
        """Format phone number to a standard format"""
        if not p:
            return ""
        
        # Remove all non-digit characters
        digits = re.sub(r"\D", "", p)
        
        # If it starts with country code, format it properly
        if len(digits) >= 10:
            if digits.startswith("1") and len(digits) == 11:
                # US/Canada format: +1 (XXX) XXX-XXXX
                return f"+1 ({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
            elif len(digits) == 10:
                # US format without country code: (XXX) XXX-XXXX
                return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
            elif len(digits) > 10:
                # International format: +XX XXX XXX XXXX
                country_code = digits[:-10] if len(digits) > 10 else ""
                remaining = digits[-10:]
                if country_code:
                    return f"+{country_code} {remaining[:3]} {remaining[3:6]} {remaining[6:]}"
                else:
                    return f"+{digits}"
        
        # Return original if can't format properly
        return p.strip()

    def _looks_like_prompt(self, text: str) -> bool:
        t = (text or "").strip().lower()
        return (not t) or ("?" in t) or ("what is your" in t) or ("your name" in t) or ("your email" in t) or ("your phone" in t)

    # ---------- Booking function tools ----------
    @function_tool(name="confirm_wants_to_book_yes")
    async def confirm_wants_to_book_yes(self, ctx: RunContext) -> str:
        """Called when user confirms they want to book an appointment."""
        self._booking_intent = True
        self._confirmed = False
        self._preferred_day = None
        self._selected_slot = None
        self._name = self._email = self._phone = None
        self._notes = ""
        return "Great—what's the reason for the visit? I'll add it to the notes."

    @function_tool(name="set_notes")
    async def set_notes(self, ctx: RunContext, notes: str) -> str:
        """Set the reason/notes for the appointment."""
        if not self._booking_intent:
            return "If you'd like to book, please say so first."
        self._notes = (notes or "").strip()
        if not self._notes:
            return "Could you tell me the reason for the visit? I'll add it to the notes."
        return "Got it. Which day works for you—today, tomorrow, a weekday, or a date like 2025-09-05?"

    @function_tool(name="list_slots_on_day")
    async def list_slots_on_day(self, ctx: RunContext, day: str, max_options: int = 6) -> str:
        """List available appointment slots for a specific day."""
        # Auto-detect booking intent if user is asking about availability
        if not self._booking_intent:
            day_lower = day.lower() if day else ""
            if any(keyword in day_lower for keyword in ["available", "free", "open", "book", "schedule", "appointment"]):
                self._booking_intent = True
                logging.info("BOOKING_INTENT_DETECTED | auto-detected from availability query")
            else:
                return "If you'd like to book, please say so first."
        
        msg = self._require_calendar()
        if msg: return msg

        d = self._parse_day(day)
        if not d:
            return "Please say the day like 'today', 'tomorrow', 'Friday', or '2025-09-05'."

        self._preferred_day = d
        tz = self._tz()
        start_local = datetime.datetime.combine(d, datetime.time(0,0,tzinfo=tz))
        end_local = start_local + datetime.timedelta(days=1)
        from zoneinfo import ZoneInfo
        start_utc = start_local.astimezone(ZoneInfo("UTC"))
        end_utc = end_local.astimezone(ZoneInfo("UTC"))

        try:
            logging.info(f"CALENDAR_SLOTS_REQUEST | day={d} | start_utc={start_utc} | end_utc={end_utc}")
            result = await self.calendar.list_available_slots(start_time=start_utc, end_time=end_utc)
            logging.info(f"CALENDAR_SLOTS_RESPONSE | slots_count={len(result.slots) if result.is_success else 0}")

            def present(slots_list: list[AvailableSlot], label: str) -> str:
                self._slots_map.clear()
                top = slots_list[:max_options]
                if not top:
                    return f"I don't see any open times {label}."
                lines = [f"Here are the available times {label}:"]
                for i, s in enumerate(top, 1):
                    local = s.start_time.astimezone(tz)
                    lines.append(f"Option {i}: {local.strftime('%I:%M %p')}")
                    self._slots_map[str(i)] = s
                    self._slots_map[f"option {i}"] = s
                    self._slots_map[f"option_{i}"] = s
                    self._slots_map[s.unique_hash] = s
                lines.append("Which option would you like to choose?")
                return "\n".join(lines)

            if result.is_success and result.slots:
                label = f"on {start_local.strftime('%A, %B %d')}"
                return present(result.slots, label)
            
            elif result.is_calendar_unavailable:
                return "I'm having trouble connecting to the calendar right now. Would you like me to try another day, or should I notify someone to help you?"

            elif result.is_no_slots:
                # find next day with availability within 30 days
                search_end = start_utc + datetime.timedelta(days=30)
                future_result = await self.calendar.list_available_slots(start_time=end_utc, end_time=search_end)
                
                if not future_result.is_success or not future_result.slots:
                    return "I don't see any open times soon. Would you like me to check a wider range?"
                
                by_day: dict[datetime.date, list[AvailableSlot]] = {}
                for s in future_result.slots:
                    by_day.setdefault(s.start_time.astimezone(tz).date(), []).append(s)
                nxt = min(by_day.keys())
                alt = by_day[nxt]
                alt_label = f"on {datetime.datetime.combine(nxt, datetime.time(0,0,tzinfo=tz)).strftime('%A, %B %d')}"
                return "Nothing is open that day. " + present(alt, alt_label)
            
            else:
                # Fallback for any other error state
                return "I'm having trouble checking that day. Could we try a different day?"
                
        except Exception:
            logging.exception("Error listing slots")
            return "Sorry, I had trouble checking that day. Could we try a different day?"

    @function_tool(name="choose_slot")
    async def choose_slot(self, ctx: RunContext, option_id: str) -> str:
        """Choose a specific time slot for the appointment."""
        # Auto-detect booking intent if user is selecting a time
        if not self._booking_intent:
            self._booking_intent = True
            logging.info("BOOKING_INTENT_DETECTED | auto-detected from time selection")
        
        if not self._slots_map:
            return "Let's pick a day first."
        key = (option_id or "").strip().lower()
        
        # Handle time-based selection (e.g., "3pm", "3:00", "15:00")
        if not key.isdigit() and not key.startswith("option"):
            # Try to parse as time
            time_match = re.search(r'(\d{1,2})(?::(\d{2}))?\s*(am|pm)?', key, re.IGNORECASE)
            if time_match:
                hour = int(time_match.group(1))
                minute = int(time_match.group(2) or 0)
                ampm = time_match.group(3)
                
                # Convert to 24-hour format
                if ampm and ampm.lower() == 'pm' and hour != 12:
                    hour += 12
                elif ampm and ampm.lower() == 'am' and hour == 12:
                    hour = 0
                
                # Find matching slot by time
                for slot_key, slot in self._slots_map.items():
                    slot_hour = slot.start_time.hour
                    slot_minute = slot.start_time.minute
                    if slot_hour == hour and slot_minute == minute:
                        self._selected_slot = slot
                        logging.info("SLOT_SELECTED_BY_TIME | time=%s | slot=%s", key, slot_key)
                        return "Great. What's your full name?"
        
        slot = self._slots_map.get(key) \
            or self._slots_map.get(f"option {key}") \
            or self._slots_map.get(f"option_{key}") \
            or (self._slots_map.get(key.replace("option","").strip()) if key.startswith("option") else None)
        if not slot:
            return "I couldn't find that option. Please say the option number again."
        self._selected_slot = slot
        logging.info("SLOT_SELECTED | option_id=%s | slot=%s", option_id, slot.start_time)
        return "Great. What's your full name?"

    @function_tool(name="provide_name")
    async def provide_name(self, ctx: RunContext, name: str) -> str:
        """Provide the customer's name for the appointment."""
        if not self._selected_slot:
            return "Please choose a time option first."
        if self._looks_like_prompt(name) or len(name.strip()) < 2:
            return "Please tell me your full name."
        self._name = name.strip()
        
        # Automatically collect analysis data for name if analysis fields are configured
        if self._analysis_fields:
            for field in self._analysis_fields:
                field_name = field.get('name', '').lower()
                if 'name' in field_name or 'customer' in field_name:
                    self._structured_data[field.get('name', 'Customer Name')] = {
                        "value": name.strip(),
                        "type": "string",
                        "timestamp": datetime.datetime.now().isoformat()
                    }
                    logging.info("ANALYSIS_DATA_COLLECTED_AUTO | field=%s | value=%s", field.get('name', 'Customer Name'), name.strip())
                    break
        
        return "Thanks. What's your email?"

    @function_tool(name="provide_email")
    async def provide_email(self, ctx: RunContext, email: str) -> str:
        """Provide the customer's email for the appointment."""
        if not self._selected_slot or not self._name:
            return "We'll do email after we pick a time and your name."
        if self._looks_like_prompt(email) or not self._email_ok(email):
            return "That email doesn't look valid. Could you repeat it?"
        self._email = email.strip()
        
        # Automatically collect analysis data for email if analysis fields are configured
        if self._analysis_fields:
            for field in self._analysis_fields:
                field_name = field.get('name', '').lower()
                if 'email' in field_name:
                    self._structured_data[field.get('name', 'Email Address')] = {
                        "value": email.strip(),
                        "type": "string",
                        "timestamp": datetime.datetime.now().isoformat()
                    }
                    logging.info("ANALYSIS_DATA_COLLECTED_AUTO | field=%s | value=%s", field.get('name', 'Email Address'), email.strip())
                    break
        
        return "And your phone number?"

    @function_tool(name="provide_phone")
    async def provide_phone(self, ctx: RunContext, phone: str) -> str:
        """Provide the customer's phone number for the appointment."""
        if not self._selected_slot or not self._name or not self._email:
            return "We'll do phone after time, name, and email."
        if self._looks_like_prompt(phone) or not self._phone_ok(phone):
            return "That phone doesn't look right. Please say it with digits."
        self._phone = self._format_phone(phone)
        
        # Automatically collect analysis data for phone if analysis fields are configured
        if self._analysis_fields:
            for field in self._analysis_fields:
                field_name = field.get('name', '').lower()
                if 'phone' in field_name or 'number' in field_name:
                    self._structured_data[field.get('name', 'Phone Number')] = {
                        "value": self._phone,
                        "type": "string",
                        "timestamp": datetime.datetime.now().isoformat()
                    }
                    logging.info("ANALYSIS_DATA_COLLECTED_AUTO | field=%s | value=%s", field.get('name', 'Phone Number'), phone.strip())
                    break
        
        tz = self._tz()
        local = self._selected_slot.start_time.astimezone(tz)
        day_s = local.strftime('%A, %B %d at %I:%M %p')
        notes_s = self._notes or "—"
        return (f"Please confirm: {day_s}. Name {self._name}. Email {self._email}. "
                f"Phone {self._phone}. Reason: {notes_s}. Is everything correct?")

    @function_tool(name="confirm_details")
    async def confirm_details(self, ctx: RunContext) -> str:
        """Confirm the appointment details and book it."""
        if not (self._selected_slot and self._name and self._email and self._phone):
            return "We're not ready to confirm yet."
        self._confirmed = True
        msg = self._require_calendar()
        if msg: return msg
        return await self._do_schedule()

    @function_tool(name="confirm_details_yes")
    async def confirm_details_yes(self, ctx: RunContext) -> str:
        """Confirm the appointment details (yes response)."""
        return await self.confirm_details(ctx)

    @function_tool(name="confirm_details_no")
    async def confirm_details_no(self, ctx: RunContext) -> str:
        """User wants to change appointment details."""
        self._confirmed = False
        return "No problem. What would you like to change—name, email, phone, or time?"

    @function_tool(name="finalize_booking")
    async def finalize_booking(self, ctx: RunContext) -> str:
        """Finalize and complete the booking process."""
        if not (self._selected_slot and self._name and self._email and self._phone):
            return "We need to collect all the details first. Let me help you with that."
        
        self._confirmed = True
        msg = self._require_calendar()
        if msg: 
            return msg
        
        logging.info("FINALIZE_BOOKING_CALLED | attempting to book appointment")
        return await self._do_schedule()

    @function_tool(name="schedule_appointment")
    async def schedule_appointment(self, ctx: RunContext, slot_id: str) -> str:
        """Schedule an appointment at the given slot ID (simplified booking flow)."""
        msg = self._require_calendar()
        if msg: 
            return msg
        
        # Find the slot by ID
        slot = None
        for slot_key, slot_obj in self._slots_map.items():
            if slot_key == slot_id or slot_obj.unique_hash == slot_id:
                slot = slot_obj
                break
        
        if not slot:
            return f"I couldn't find slot {slot_id}. Please choose from the available options."
        
        # Use collected data or ask for missing information
        if not self._name:
            return "I need your name to book the appointment. What's your full name?"
        if not self._email:
            return "I need your email address. What's your email?"
        if not self._phone:
            return "I need your phone number. What's your phone number?"
        
        # Book the appointment
        try:
            await self.calendar.schedule_appointment(
                start_time=slot.start_time,
                attendee_name=self._name,
                attendee_email=self._email,
                attendee_phone=self._phone,
                notes=self._notes or "",
            )
            
            logging.info("SCHEDULE_APPOINTMENT_SUCCESS | slot_id=%s", slot_id)
            
            # Format confirmation message
            tz = self._tz()
            local_time = slot.start_time.astimezone(tz)
            formatted_time = local_time.strftime('%A, %B %d at %I:%M %p')
            
            return f"Excellent! Your appointment has been successfully scheduled for {formatted_time}. You'll receive a confirmation email at {self._email}. Thank you!"
            
        except SlotUnavailableError:
            return "That time slot is no longer available. Let me show you other options."
        except Exception as e:
            logging.exception("Error in schedule_appointment")
            return "I encountered an issue booking that appointment. Let's try a different time."

    async def _do_schedule(self) -> str:
        """Actually schedule the appointment."""
        logging.info("BOOKING_ATTEMPT | start=%s | name=%s | email=%s",
                     self._selected_slot.start_time if self._selected_slot else None,
                     self._name, self._email)
        try:
            resp = await self.calendar.schedule_appointment(
                start_time=self._selected_slot.start_time,
                attendee_name=self._name or "",
                attendee_email=self._email or "",
                attendee_phone=self._phone or "",
                notes=self._notes or "",
            )
            logging.info("BOOKING_SUCCESS | appointment scheduled successfully")
            
            # Format confirmation message with details
            tz = self._tz()
            local_time = self._selected_slot.start_time.astimezone(tz)
            formatted_time = local_time.strftime('%A, %B %d at %I:%M %p')
            
            return f"Perfect! Your appointment has been successfully booked for {formatted_time}. You'll receive a confirmation email at {self._email}. Thank you!"
        except SlotUnavailableError:
            self._selected_slot = None
            self._confirmed = False
            return "That time was just taken. Let's pick another option."
        except Exception:
            logging.exception("Error scheduling appointment")
            self._confirmed = False
            return "I ran into a problem booking that. Let's try a different time."

    # ---------- Data collection tools ----------
    @function_tool(name="collect_webhook_data")
    async def collect_webhook_data(self, ctx: RunContext, field_name: str, field_value: str, collection_method: str = "user_provided") -> str:
        """Collect webhook data with flexible collection methods for n8n integration"""
        logging.info("collect_webhook_data CALLED | field_name=%s | field_value=%s | method=%s", field_name, field_value, collection_method)
        
        if not field_name or not field_value:
            return "I need both the field name and value to collect this information."

        # Validate collection method
        valid_methods = ["user_provided", "analyzed", "observed"]
        if collection_method not in valid_methods:
            collection_method = "user_provided"

        # Store the webhook data with metadata
        self._webhook_data[field_name.strip()] = {
            "value": field_value.strip(),
            "method": collection_method,
            "timestamp": datetime.datetime.now().isoformat()
        }

        logging.info("WEBHOOK_DATA_COLLECTED | field=%s | method=%s | total_fields=%d",
                    field_name, collection_method, len(self._webhook_data))

        return f"Collected {field_name} via {collection_method}. Thank you!"

    def get_webhook_data(self) -> dict:
        """Get all collected webhook data"""
        return self._webhook_data.copy()
    
    def get_structured_data(self) -> dict:
        """Get all collected structured data for analysis"""
        logging.info("GET_STRUCTURED_DATA_CALLED | fields_count=%d | data=%s", len(self._structured_data), self._structured_data)
        return self._structured_data.copy()
    
    def set_analysis_fields(self, fields: list) -> None:
        """Set the analysis fields configuration"""
        self._analysis_fields = fields

    def get_booking_status(self) -> dict:
        """Get current booking status for debugging"""
        return {
            "booking_intent": self._booking_intent,
            "has_calendar": self.calendar is not None,
            "selected_slot": self._selected_slot.start_time.isoformat() if self._selected_slot else None,
            "has_name": bool(self._name),
            "has_email": bool(self._email),
            "has_phone": bool(self._phone),
            "confirmed": self._confirmed,
            "notes": self._notes,
            "slots_available": len(self._slots_map)
        }

    @function_tool(name="check_booking_status")
    async def check_booking_status(self, ctx: RunContext) -> str:
        """Check the current booking status for debugging."""
        status = self.get_booking_status()
        logging.info("BOOKING_STATUS_CHECK | status=%s", status)
        
        if not status["has_calendar"]:
            return "Calendar is not configured. Cannot book appointments."
        
        if not status["booking_intent"]:
            return "No booking intent detected yet."
        
        if not status["selected_slot"]:
            return "No time slot selected yet."
        
        missing = []
        if not status["has_name"]:
            missing.append("name")
        if not status["has_email"]:
            missing.append("email")
        if not status["has_phone"]:
            missing.append("phone")
        
        if missing:
            return f"Still need to collect: {', '.join(missing)}"
        
        return "All details collected. Ready to book!"

    @function_tool(name="collect_analysis_data")
    async def collect_analysis_data(self, ctx: RunContext, field_name: str, field_value: str, field_type: str = "string") -> str:
        """Collect structured data for analysis during conversation"""
        logging.info("COLLECT_ANALYSIS_DATA_CALLED | field_name=%s | field_value=%s | type=%s", field_name, field_value, field_type)
        
        if not field_name or not field_value:
            return "I need both the field name and value to collect this information."

        # Validate field type
        valid_types = ["string", "number", "boolean", "date", "object", "array"]
        if field_type not in valid_types:
            field_type = "string"

        # Store the analysis data with metadata
        self._structured_data[field_name.strip()] = {
            "value": field_value.strip(),
            "type": field_type,
            "timestamp": datetime.datetime.now().isoformat(),
            "collection_method": "manual"
        }

        logging.info("ANALYSIS_DATA_COLLECTED | field=%s | type=%s | total_fields=%d",
                    field_name, field_type, len(self._structured_data))

        return f"Collected {field_name} ({field_type}). Thank you!"