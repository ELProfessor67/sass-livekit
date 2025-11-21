from __future__ import annotations

import asyncio
import datetime
import logging
import os
import re
from dataclasses import dataclass
from typing import Optional
from zoneinfo import ZoneInfo

from livekit import api
from livekit.agents import Agent, RunContext, function_tool, metrics, MetricsCollectedEvent
from livekit.agents.llm import ChatContext, ChatMessage
from livekit.protocol.sip import TransferSIPParticipantRequest

from services.call_outcome_service import CallOutcomeService
from services.rag_service import get_rag_service
from integrations.calendar_api import Calendar, SlotUnavailableError
from integrations.supabase_client import SupabaseClient
from utils.latency_logger import measure_latency_context


@dataclass
class BookingData:
    """Data structure for booking information."""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    selected_slot: Optional[object] = None
    notes: Optional[str] = None
    confirmed: bool = False
    booked: bool = False
    appointment_id: Optional[str] = None


class UnifiedAgent(Agent):
    """
    Unified agent that combines RAG (knowledge base) and booking capabilities.
    This agent can both answer questions using a knowledge base and book appointments.
    """
     
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
            "mon": 0, "monday": 0, "tue": 1, "tues": 1, "tuesday": 1,
            "wed": 2, "wednesday": 2, "thu": 3, "thur": 3, "thurs": 3, "thursday": 3,
            "fri": 4, "friday": 4, "sat": 5, "saturday": 5, "sun": 6, "sunday": 6
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
            for (d, mo) in [(a, b), (b, a)]:
                try:
                    parsed = datetime.date(today.year, mo, d)
                    if parsed < today:
                        parsed = datetime.date(today.year + 1, mo, d)
                    return parsed
                except Exception:
                    pass

        months = {m.lower(): i for i, m in enumerate(
            ["January","February","March","April","May","June","July","August","September","October","November","December"], 1)}
        short = {k[:3]: v for k, v in months.items()}

        def clean_day(day_str: str) -> str:
            return re.sub(r'(\d+)(st|nd|rd|th)', r'\1', day_str)

        toks = re.split(r"\s+", q)
        if len(toks) == 2:
            a, b = toks
            # "<day> <month>"
            try:
                day = int(clean_day(a))
                mo = months.get(b.lower()) or short.get(b[:3].lower())
                if mo:
                    parsed = datetime.date(today.year, mo, day)
                    if parsed < today:
                        parsed = datetime.date(today.year + 1, mo, day)
                    return parsed
            except Exception:
                pass
            # "<month> <day>"
            try:
                mo = months.get(a.lower()) or short.get(a[:3].lower())
                day = int(clean_day(b))
                if mo:
                    parsed = datetime.date(today.year, mo, day)
                    if parsed < today:
                        parsed = datetime.date(today.year + 1, mo, day)
                    return parsed
            except Exception:
                pass

        return None

    def _find_slot_by_time_string(self, time_str: str) -> Optional[object]:
        """Find a slot by parsing a time string like '8am', '3:30pm', etc."""
        import re
        
        # Parse time string like "8am", "8:30am", "3pm", "10:00am", "12:00pm"
        # Also handle variations like "8 am", "3 PM", "8:30 AM"
        time_str = time_str.strip().lower().replace(" ", "")
        
        # Match patterns: 8am, 8:30am, 3:00pm, 10:15am
        match = re.match(r"(\d{1,2})(?::(\d{2}))?(am|pm)", time_str)
        if not match:
            return None
        
        hour = int(match.group(1))
        minute = int(match.group(2) or "0")
        period = match.group(3)
        
        # Convert to 24-hour format
        if period == "am":
            if hour == 12:
                hour_24 = 0
            else:
                hour_24 = hour
        else:  # pm
            if hour == 12:
                hour_24 = 12
            else:
                hour_24 = hour + 12
        
        # Create target time
        target_time = datetime.time(hour_24, minute)
        
        # Find matching slot in _slots_map
        tz = self._tz()
        for key, slot in self._slots_map.items():
            # Get the local time of the slot
            slot_local_time = slot.start_time.astimezone(tz).time()
            
            # Check if times match (within same hour/minute)
            if slot_local_time.hour == target_time.hour and slot_local_time.minute == target_time.minute:
                logging.info("SLOT_FOUND_BY_TIME | time_str=%s | matched_time=%s", 
                           time_str, slot_local_time.strftime('%I:%M %p'))
                return slot
        
        logging.info("SLOT_NOT_FOUND_BY_TIME | time_str=%s | total_slots=%d", time_str, len(self._slots_map))
        return None

    def __init__(
        self, 
        instructions: str, 
        calendar: Optional[Calendar] = None,
        knowledge_base_id: Optional[str] = None,
        company_id: Optional[str] = None,
        supabase: Optional[SupabaseClient] = None,
        prewarmed_llm: Optional[object] = None,
        prewarmed_tts: Optional[object] = None,
        prewarmed_vad: Optional[object] = None
    ) -> None:
        # Use pre-warmed components if available, otherwise use defaults
        if prewarmed_llm and prewarmed_vad and prewarmed_tts:
            super().__init__(instructions=instructions, llm=prewarmed_llm, vad=prewarmed_vad, tts=prewarmed_tts)
        elif prewarmed_llm and prewarmed_vad:
            super().__init__(instructions=instructions, llm=prewarmed_llm, vad=prewarmed_vad)
        elif prewarmed_llm and prewarmed_tts:
            super().__init__(instructions=instructions, llm=prewarmed_llm, tts=prewarmed_tts)
        elif prewarmed_vad and prewarmed_tts:
            super().__init__(instructions=instructions, vad=prewarmed_vad, tts=prewarmed_tts)
        elif prewarmed_llm:
            super().__init__(instructions=instructions, llm=prewarmed_llm)
        elif prewarmed_vad:
            super().__init__(instructions=instructions, vad=prewarmed_vad)
        elif prewarmed_tts:
            super().__init__(instructions=instructions, tts=prewarmed_tts)
        else:
            super().__init__(instructions=instructions)
        
        self.calendar = calendar
        self.knowledge_base_id = knowledge_base_id
        self.company_id = company_id
        self.supabase = supabase
        
        # Initialize services (singleton; no double init; Supabase is optional for read)
        self.rag_service = get_rag_service() if knowledge_base_id else None
            
        self.call_outcome_service = CallOutcomeService()
        
        # Booking state - will be reset per conversation
        self._booking_data = BookingData()
        self._slots_map: dict[str, object] = {}
        self._webhook_data: dict[str, dict] = {}
        
        # Analysis data collection
        self._analysis_data: dict[str, str] = {}
        
        # Concurrency guard for booking
        self._booking_inflight = False
        
        # Transfer configuration (will be set via set_transfer_config)
        self._transfer_config = {
            "enabled": False,
            "phone_number": None,
            "country_code": "+1",
            "sentence": None,
            "condition": None
        }
        self._transfer_requested = False
        self._room_name = None  # Store room name for transfer operations
        
        # Pre-compiled regexes for performance
        self._email_regex = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", re.I)
        self._phone_clean_regex = re.compile(r'[^\d+]')
        self._phone_plus_regex = re.compile(r'\++')
        self._html_tag_regex = re.compile(r"<[^>]+>")
        
        # Latency monitoring variables
        self.end_of_utterance_delay = 0
        self.llm_latency = 0
        self.tts_latency = 0
        
        logging.info("UNIFIED_AGENT_INITIALIZED | rag_enabled=%s | calendar_enabled=%s", 
                    bool(self.rag_service), bool(self.calendar))

    def set_transfer_config(self, config: dict):
        """Set transfer configuration for this agent."""
        self._transfer_config = {
            "enabled": config.get("transfer_enabled", False),
            "phone_number": config.get("transfer_phone_number"),
            "country_code": config.get("transfer_country_code", "+1"),
            "sentence": config.get("transfer_sentence"),
            "condition": config.get("transfer_condition")
        }
        logging.info(f"TRANSFER_CONFIG_SET | enabled={self._transfer_config['enabled']} | phone={self._transfer_config['phone_number']}")
    
    def set_room_name(self, room_name: str):
        """Set room name for transfer operations."""
        self._room_name = room_name
        logging.debug(f"ROOM_NAME_SET | room={room_name}")
    
    def _reset_state(self):
        """Reset all state for a new conversation/run."""
        self._booking_data = BookingData()
        self._slots_map.clear()
        self._analysis_data.clear()
        self._webhook_data.clear()
        self._transfer_requested = False
        self._booking_inflight = False
        logging.info("STATE_RESET | All conversation state cleared")

    def _on_metrics_collected(self, event: MetricsCollectedEvent):
        """Handle metrics collection events for latency monitoring."""
        try:
            if event.type != "metrics_collected":
                return

            # Update latency variables based on metric type
            if event.metrics.type == "eou_metrics":
                self.end_of_utterance_delay = event.metrics.end_of_utterance_delay
                logging.info(f"LATENCY_EOU | end_of_utterance_delay={self.end_of_utterance_delay}s")

            elif event.metrics.type == "llm_metrics":
                self.llm_latency = event.metrics.ttft
                logging.info(f"LATENCY_LLM | ttft={self.llm_latency}s")

            elif event.metrics.type == "tts_metrics":
                self.tts_latency = event.metrics.ttfb
                # Calculate and log total latency when TTS completes
                total_latency = self.end_of_utterance_delay + self.llm_latency + self.tts_latency
                logging.info(f"LATENCY_TTS | ttfb={self.tts_latency}s")
                logging.info(f"LATENCY_TOTAL | transcription_delay={self.end_of_utterance_delay}s | llm={self.llm_latency}s | tts={self.tts_latency}s | total={total_latency}s")

        except Exception as e:
            logging.error(f"METRICS_COLLECTION_ERROR | error={str(e)}")

    def _tz(self) -> ZoneInfo:
        """Get timezone from calendar or default to UTC."""
        return getattr(self.calendar, "tz", None) or ZoneInfo("UTC")

    def _require_calendar(self) -> Optional[str]:
        """Check if calendar is available for booking."""
        if not self.calendar:
            logging.info("_require_calendar FAILED | calendar is None")
            return "I can't take bookings right now."
        logging.info("_require_calendar SUCCESS | calendar type=%s", type(self.calendar).__name__)
        return None

    def _email_ok(self, e: str) -> bool:
        """Validate email format."""
        return bool(self._email_regex.match(e.strip()))

    def _phone_ok(self, p: str) -> bool:
        """Validate phone format for international numbers."""
        if not p:
            return False
        
        # Remove all non-digit characters except + at the beginning
        cleaned = self._phone_clean_regex.sub('', p)
        
        # Must start with + for international format
        if not cleaned.startswith('+'):
            return False
        
        # Extract digits only (excluding the +)
        digits = cleaned[1:]
        
        # International phone numbers: 7-15 digits (ITU-T E.164 standard)
        return 7 <= len(digits) <= 15

    def _mask_email(self, e: str) -> str:
        """Mask email for logging to protect PII."""
        try:
            u, d = e.split('@', 1)
            return (u[:1] + '***') + '@' + (d[:1] + '***')
        except Exception:
            return '***'

    def _mask_phone(self, p: str) -> str:
        """Mask phone for logging to protect PII."""
        return p[:3] + '***' + p[-3:] if len(p) >= 7 else '***'

    def _format_email(self, email: str) -> str:
        """Format and clean email address from speech recognition."""
        if not email:
            return email
        
        # Convert common speech-to-text errors
        email = email.lower().strip()
        
        # Replace common speech recognition errors
        replacements = {
            ' at ': '@',
            ' at': '@',
            'at ': '@',
            ' at the rate ': '@',
            ' at the rate': '@',
            'at the rate ': '@',
            'at the rate': '@',
            ' dot ': '.',
            ' dot': '.',
            'dot ': '.',
            'dot': '.',
            ' gmail ': 'gmail',
            ' gmail': 'gmail',
            'gmail ': 'gmail',
            ' yahoo ': 'yahoo',
            ' yahoo': 'yahoo',
            'yahoo ': 'yahoo',
            ' hotmail ': 'hotmail',
            ' hotmail': 'hotmail',
            'hotmail ': 'hotmail',
            ' outlook ': 'outlook',
            ' outlook': 'outlook',
            'outlook ': 'outlook',
        }
        
        for old, new in replacements.items():
            email = email.replace(old, new)
        
        # If no @ symbol but has gmail/yahoo/etc, try to fix it
        if '@' not in email:
            # Look for common patterns like "usernamegmail.com" or "username@gmail.com"
            if 'gmail.com' in email:
                # Handle cases like "lily.gmail.com" -> "lily@gmail.com"
                email = email.replace('.gmail.com', '@gmail.com')
                if '@' not in email:  # If still no @, add it before gmail.com
                    email = email.replace('gmail.com', '@gmail.com')
            elif 'yahoo.com' in email:
                email = email.replace('.yahoo.com', '@yahoo.com')
                if '@' not in email:
                    email = email.replace('yahoo.com', '@yahoo.com')
            elif 'hotmail.com' in email:
                email = email.replace('.hotmail.com', '@hotmail.com')
                if '@' not in email:
                    email = email.replace('hotmail.com', '@hotmail.com')
            elif 'outlook.com' in email:
                email = email.replace('.outlook.com', '@outlook.com')
                if '@' not in email:
                    email = email.replace('outlook.com', '@outlook.com')
        
        # Clean up any double @ symbols
        email = email.replace('@@', '@')
        
        return email.strip()

    def _format_phone(self, phone: str) -> str:
        """Format and clean phone number from speech recognition."""
        if not phone:
            return phone
        
        # Remove all non-digit characters except + at the beginning
        cleaned = self._phone_clean_regex.sub('', phone)
        
        # Collapse multiple pluses into one
        cleaned = self._phone_plus_regex.sub('+', cleaned).strip()
        
        # Avoid bare '+' 
        if cleaned == '+':
            return ""
        
        # If it starts with +, keep it, otherwise add + for international format
        if cleaned.startswith('+'):
            return cleaned
        else:
            # Add + for international format
            return '+' + cleaned
    
    def _sanitize_and_cap(self, text: str, cap: int = 600) -> str:
        """Strip markdown fences and HTML tags, then cap length."""
        if not text:
            return ""
        t = re.sub(r"```[\s\S]*?```", "", text)
        t = self._html_tag_regex.sub("", t)  # strip html tags using pre-compiled regex
        t = t.strip()
        return (t[:cap] + ("…" if len(t) > cap else ""))

    # ========== RAG TOOLS ==========
    
    @function_tool(name="query_knowledge_base")
    async def query_knowledge_base(self, ctx: RunContext, query: str) -> str:
        """Search the knowledge base for information related to the query with parallel processing."""
        if not self.rag_service or not self.knowledge_base_id:
            return "Knowledge base is not available."
        
        notice = "Please wait let me check our knowledgebase.\n\n"

        try:
            # Use parallel processing with timeout for faster response
            rag_task = asyncio.create_task(
                self.rag_service.search_knowledge_base(self.knowledge_base_id, query)
            )
            
            results = await asyncio.wait_for(rag_task, timeout=8.0)  # Increased timeout for better results
            
            if results and results.snippets:
                # Format the results with better structure and more content
                formatted_results = []
                for i, snippet in enumerate(results.snippets[:5], 1):  # Increased to top 5 results
                    content = snippet.get('content', '').strip()
                    if content:
                        # Add source information if available
                        ref = snippet.get('reference', {})
                        file_info = ref.get('file', {}) if isinstance(ref, dict) else {}
                        source = file_info.get('name', '') if file_info else ''
                        
                        if source:
                            formatted_results.append(f"{content} (Source: {source})")
                        else:
                            formatted_results.append(content)
                
                if formatted_results:
                    # Join with proper spacing and return more content
                    full_response = '\n\n'.join(formatted_results)
                    # Increase character limit for more detailed responses
                    return notice + (self._sanitize_and_cap(full_response, cap=2000) or "No specific info found.")
                else:
                    return notice + "No specific info found."

            else:
                return notice + "I couldn't find specific information about that in our knowledge base."
        except asyncio.TimeoutError:
            return notice + "The knowledge base search is taking longer than expected. Please try again."
        except Exception as e:
            logging.error(f"RAG_SEARCH_ERROR | query={query} | error={str(e)}")
            return notice + "I encountered an issue searching our knowledge base."

    @function_tool(name="get_detailed_information")
    async def get_detailed_information(self, ctx: RunContext, topic: str) -> str:
        """Get detailed information about a specific topic from the knowledge base."""
        if not self.rag_service or not self.knowledge_base_id:
            return "Knowledge base is not available."

        notice = "Please wait let me check our knowledgebase.\n\n"

        try:
            queries = [
                topic,
                f"what is {topic}",
                f"information about {topic}",
                f"details on {topic}",
                f"explanation of {topic}",
            ]
            # Use longer timeout and more context for detailed information
            context = await asyncio.wait_for(
                self.rag_service.search_multiple_queries(
                    knowledge_base_id=self.knowledge_base_id,
                    queries=queries,
                    max_context_length=6000,  # Increased for more detailed responses
                ),
                timeout=10.0  # Increased timeout for comprehensive results
            )
            if not context:
                return notice + f"I couldn't find detailed information about {topic} in our knowledge base."
            # Allow more content for detailed information
            return notice + (self._sanitize_and_cap(context, cap=3000) or f"No detailed info on {topic}.")
        except asyncio.TimeoutError:
            logging.warning(f"RAG_DETAILED_INFO_TIMEOUT | topic={topic}")
            return notice + f"I found some information about {topic}, but let me give you a quick summary."
        except Exception as e:
            logging.error(f"RAG_DETAILED_INFO_ERROR | topic={topic} | error={str(e)}")
            return notice + "I encountered an issue retrieving detailed information."

    # ========== BOOKING TOOLS ==========
    
    @function_tool(name="list_slots_on_day")
    async def list_slots_on_day(self, ctx: RunContext, day: str, max_options: int = 10) -> str:
        """List available appointment slots for a specific day. Shows up to 10 slots by default, or use max_options to show more."""
        msg = self._require_calendar()
        if msg:
            return msg
        
        logging.info("list_slots_on_day START | day=%s | calendar=%s", day, self.calendar is not None)
        
        call_id = f"calendar_{ctx.room.name if hasattr(ctx, 'room') else 'unknown'}"
        
        async with measure_latency_context("calendar_list_slots", call_id, {
            "day": day,
            "max_options": max_options
        }):
            try:
                # Parse the day
                parsed_date = self._parse_day(day)
                if not parsed_date:
                   return "Please say the day like 'today', 'tomorrow', 'Friday', or '2025-09-05'."
                start_time = datetime.datetime.combine(parsed_date, datetime.time(0,0,tzinfo=self._tz()))

                # Get slots for the day with timeout
                end_time = start_time + datetime.timedelta(days=1)
                result = await asyncio.wait_for(
                    self.calendar.list_available_slots(start_time=start_time, end_time=end_time),
                    timeout=2.5  # 2.5 second timeout for calendar operations
                )
                
                if not result.is_success:
                    if result.is_calendar_unavailable:
                        return "Calendar service is temporarily unavailable."
                    elif result.is_no_slots:
                        return f"No available slots for {day}."
                    else:
                        return "I couldn't retrieve available slots at the moment."
                
                all_slots = result.slots
                if not all_slots:
                    return f"No available slots for {day}."
                
                # Clear previous slots and use stable keys
                # IMPORTANT: Store ALL slots in _slots_map for availability checking
                self._slots_map.clear()
                for slot in all_slots:
                    key = slot.start_time.isoformat()  # Stable key based on ISO time
                    self._slots_map[key] = slot
                
                # Only show first max_options to user for brevity, but let them know if there are more
                display_slots = all_slots[:max_options]
                lines = []
                for i, slot in enumerate(display_slots, 1):
                    local_time = slot.start_time.astimezone(self._tz())
                    formatted_time = local_time.strftime('%I:%M %p')
                    lines.append(f"{i}. {formatted_time}")
                
                # Build response with total count information
                response_parts = [f"Available slots for {day}:\n" + "\n".join(lines)]
                
                # Inform user if there are more slots available
                if len(all_slots) > max_options:
                    response_parts.append(f"\nI'm showing you {len(display_slots)} of {len(all_slots)} total available slots. You can choose any time slot from the list above, or ask me to show more options.")
                
                logging.info("SLOTS_LISTED | total=%d | displayed=%d | day=%s", len(all_slots), len(display_slots), day)
                return "".join(response_parts)
                
            except asyncio.TimeoutError:
                logging.warning(f"list_slots_on_day TIMEOUT | day={day}")
                return "I'm having trouble connecting to the calendar. Please try again in a moment."
            except Exception as e:
                logging.error(f"list_slots_on_day ERROR | day={day} | error={str(e)}")
                return "I encountered an issue retrieving available slots."

    @function_tool(name="choose_slot")
    async def choose_slot(self, ctx: RunContext, option_id: str) -> str:
        """Select a time slot for the appointment."""
        # Allow either index from last list or iso key
        slot = None
        if option_id in self._slots_map:
            slot = self._slots_map[option_id]
        else:
            # try resolving index seen last render
            if option_id.isdigit():
                idx = int(option_id) - 1
                keys = list(self._slots_map.keys())
                if 0 <= idx < len(keys):
                    slot = self._slots_map[keys[idx]]
            else:
                # Try parsing as time string (e.g., "8am", "3:30pm", "10:00am")
                # Match against all available slots
                slot = self._find_slot_by_time_string(option_id)
        
        if not slot:
            return f"Option {option_id} isn't available. Say 'list slots' to refresh."
        
        self._booking_data.selected_slot = slot
        logging.info("SLOT_SELECTED | option_id=%s", option_id)

        local_time = self._booking_data.selected_slot.start_time.astimezone(self._tz())
        formatted_time = local_time.strftime('%A, %B %d at %I:%M %p')

        missing_fields = []
        if not self._booking_data.name:  missing_fields.append("name")
        if not self._booking_data.email: missing_fields.append("email")
        if not self._booking_data.phone: missing_fields.append("phone")

        if missing_fields:
            return f"Great—{formatted_time}. I still need your {', '.join(missing_fields)}."
        # auto-book now to remove an extra LLM turn
        logging.info("AUTO_BOOKING_TRIGGERED | all fields available")
        return await self._do_schedule()


    @function_tool(name="auto_book_appointment")
    async def auto_book_appointment(self, ctx: RunContext, confirm: bool = True) -> str:
        """Automatically book the appointment when all information is available.

        Args:
            confirm: Optional flag allowing the LLM to explicitly signal confirmation.
        """
        # Check if we have all required information
        if not (self._booking_data.selected_slot and self._booking_data.name and 
                self._booking_data.email and self._booking_data.phone):
            missing_fields = []
            if not self._booking_data.selected_slot:
                missing_fields.append("time slot")
            if not self._booking_data.name:
                missing_fields.append("name")
            if not self._booking_data.email:
                missing_fields.append("email")
            if not self._booking_data.phone:
                missing_fields.append("phone")
            
            return f"I need to collect some information first: {', '.join(missing_fields)}."
        
        # All information is available, proceed to book
        logging.info("AUTO_BOOKING_INITIATED | all fields available")
        return await self._do_schedule()

    @function_tool(name="collect_missing_info")
    async def collect_missing_info(self, ctx: RunContext, dummy: Optional[str] = None) -> str:
        """Collect any missing information needed for booking.
        
        Args:
            dummy: Optional parameter (not used, required for schema compatibility).
        """
        missing_fields = []
        if not self._booking_data.name:
            missing_fields.append("name")
        if not self._booking_data.email:
            missing_fields.append("email")
        if not self._booking_data.phone:
            missing_fields.append("phone")
        if not self._booking_data.selected_slot:
            missing_fields.append("time slot")
        
        if missing_fields:
            # Ask for all missing fields in one go to avoid ping-pong
            return f"I need: {', '.join(missing_fields)}. Please say them in one go like: 'I'm Alex, email alex@example.com, phone plus nine two...'"
        else:
            return "Great! I have all the information I need. Let me confirm your appointment details."
    
    @function_tool(name="set_name")
    async def set_name(self, ctx: RunContext, name: str) -> str:
        """Set the customer's name for the appointment."""
        if not name or len(name.strip()) < 2:
            return "Please provide a valid name."
        
        self._booking_data.name = name.strip()
        logging.info("NAME_SET | name=%s", name[:3] + "***" if len(name) > 3 else "***")
        return f"Name set to {name}."

    @function_tool(name="set_email")
    async def set_email(self, ctx: RunContext, email: str) -> str:
        """Set the customer's email for the appointment."""
        formatted_email = self._format_email(email)
        if not self._email_ok(formatted_email):
            return "Please provide a valid email address."
        
        self._booking_data.email = formatted_email
        logging.info("EMAIL_SET | %s", self._mask_email(formatted_email))
        return f"Email set to {formatted_email}."

    @function_tool(name="set_phone")
    async def set_phone(self, ctx: RunContext, phone: str) -> str:
        """Set the customer's phone number for the appointment."""
        formatted_phone = self._format_phone(phone)
        if not self._phone_ok(formatted_phone):
            return "Please provide a valid phone number."
        
        self._booking_data.phone = formatted_phone
        logging.info("PHONE_SET | %s", self._mask_phone(formatted_phone))
        return f"Phone number set to {formatted_phone}."

    @function_tool(name="set_notes")
    async def set_notes(self, ctx: RunContext, notes: str) -> str:
        """Set notes for the appointment."""
        self._booking_data.notes = notes.strip()
        logging.info("NOTES_SET | notes=%s", notes)
        return f"Notes set: {notes}"

    @function_tool(name="confirm_details")
    async def confirm_details(self, ctx: RunContext, dummy: Optional[str] = None) -> str:
        """Confirm the appointment details and book it. Only call this when ALL required information is collected.
        
        Args:
            dummy: Optional parameter (not used, required for schema compatibility).
        """
        # Prevent infinite loops by checking if already confirmed
        if self._booking_data.confirmed:
            if self._booking_data.booked:
                return "Your appointment has already been successfully booked! Is there anything else I can help you with?"
            else:
                return "I'm already processing your booking confirmation. Please wait a moment."
        
        if not (self._booking_data.selected_slot and self._booking_data.name and 
                self._booking_data.email and self._booking_data.phone):
            return "We're not ready to confirm yet. Please provide all required details."
        
        self._booking_data.confirmed = True
        msg = self._require_calendar()
        if msg:
            return msg
        
        return await self._do_schedule()

    @function_tool(name="confirm_details_yes")
    async def confirm_details_yes(self, ctx: RunContext, dummy: Optional[str] = None) -> str:
        """Confirm the appointment details (yes response).
        
        Args:
            dummy: Optional parameter (not used, required for schema compatibility).
        """
        return await self.confirm_details(ctx)

    @function_tool(name="confirm_details_no")
    async def confirm_details_no(self, ctx: RunContext, dummy: Optional[str] = None) -> str:
        """User wants to change appointment details.
        
        Args:
            dummy: Optional parameter (not used, required for schema compatibility).
        """
        self._booking_data.confirmed = False
        return "No problem. What would you like to change—name, email, phone, or time?"

    @function_tool(name="finalize_booking")
    async def finalize_booking(self, ctx: RunContext, dummy: Optional[str] = None) -> str:
        """Finalize and complete the booking process. Only call this when ALL required information is collected (time slot, name, email, phone).
        
        Args:
            dummy: Optional parameter (not used, required for schema compatibility).
        """
        # Check if booking is already completed
        if self._booking_data.booked:
            return "Your appointment has already been successfully booked! Is there anything else I can help you with?"
        
        # Log current booking data for debugging
        logging.info("FINALIZE_BOOKING_VALIDATION | slot=%s | name=%s | email=%s | phone=%s", 
                    self._booking_data.selected_slot is not None,
                    self._booking_data.name,
                    self._booking_data.email, 
                    self._booking_data.phone)
        
        if not (self._booking_data.selected_slot and self._booking_data.name and 
                self._booking_data.email and self._booking_data.phone):
            missing_fields = []
            if not self._booking_data.selected_slot:
                missing_fields.append("time slot")
            if not self._booking_data.name:
                missing_fields.append("name")
            if not self._booking_data.email:
                missing_fields.append("email")
            if not self._booking_data.phone:
                missing_fields.append("phone")
            
            logging.warning("FINALIZE_BOOKING_MISSING_FIELDS | missing=%s", missing_fields)
            return f"We need to collect all the details first. We're missing: {', '.join(missing_fields)}. Let me help you with that."
        
        self._booking_data.confirmed = True
        msg = self._require_calendar()
        if msg:
            return msg
        
        logging.info("FINALIZE_BOOKING_CALLED | attempting to book appointment")
        return await self._do_schedule()

    @function_tool(name="transfer_required")
    async def transfer_required(self, ctx: RunContext, reason: Optional[str] = None) -> str:
        """Signal that a call transfer is required based on the transfer condition being met.
        
        This function should be called when the conversation matches the transfer condition
        configured for this assistant. The system will handle the cold transfer to the
        configured phone number using LiveKit SIP REFER.
        
        Args:
            reason: Optional reason for the transfer (for logging purposes).
        """
        if not self._transfer_config.get("enabled", False):
            logging.warning("TRANSFER_REQUESTED_BUT_DISABLED | transfer is not enabled for this assistant")
            return "Transfer is not configured for this assistant."
        
        if self._transfer_requested:
            logging.info("TRANSFER_ALREADY_REQUESTED | transfer already in progress")
            return "Transfer is already being processed."
        
        phone_number = self._transfer_config.get("phone_number")
        country_code = self._transfer_config.get("country_code", "+1")
        transfer_sentence = self._transfer_config.get("sentence", "")
        
        if not phone_number:
            logging.error("TRANSFER_NO_PHONE | transfer requested but no phone number configured")
            return "Transfer phone number is not configured."
        
        # Build full phone number in tel: format
        full_phone = phone_number.strip()
        if not full_phone.startswith("+"):
            full_phone = f"{country_code}{full_phone}"
        
        # Format as tel: URI for LiveKit
        transfer_to = f"tel:{full_phone}"
        
        # Get room name from multiple possible sources
        room_name = None
        room_obj = None
        
        # Try to get from context first
        if hasattr(ctx, 'room') and ctx.room:
            room_obj = ctx.room
            room_name = ctx.room.name
            logging.info(f"TRANSFER_ROOM_FROM_CTX | room={room_name}")
        
        # Try to get from stored room name
        if not room_name and self._room_name:
            room_name = self._room_name
            logging.info(f"TRANSFER_ROOM_FROM_STORED | room={room_name}")
        
        # Try to get from agent's session if available
        if not room_name:
            try:
                # Agent base class might have session access
                if hasattr(self, '_session') and self._session:
                    if hasattr(self._session, 'room') and self._session.room:
                        room_obj = self._session.room
                        room_name = self._session.room.name
                        logging.info(f"TRANSFER_ROOM_FROM_SESSION | room={room_name}")
            except Exception as e:
                logging.debug(f"TRANSFER_ROOM_SESSION_CHECK | error={str(e)}")
        
        # Try to get from agent's internal state
        if not room_name:
            try:
                # Check if agent has room reference
                if hasattr(self, 'room') and self.room:
                    room_obj = self.room
                    room_name = self.room.name
                    logging.info(f"TRANSFER_ROOM_FROM_AGENT | room={room_name}")
            except Exception as e:
                logging.debug(f"TRANSFER_ROOM_AGENT_CHECK | error={str(e)}")
        
        if not room_name:
            logging.error("TRANSFER_NO_ROOM | room not available from any source")
            return "Unable to transfer: room information not available. Transfer is only available for phone calls (SIP), not web calls."
        
        # Store room name for future use
        self._room_name = room_name
        logging.info(f"TRANSFER_INITIATING | room={room_name} | target={transfer_to} | reason={reason or 'transfer condition met'}")
        
        # Get participant identity (the caller/SIP participant)
        # The SIP participant is typically the remote participant that's not the agent
        participant_identity = None
        try:
            # Try to get from room object if available
            if room_obj:
                # Try to get from remote participants first (most common case)
                if hasattr(room_obj, 'remote_participants'):
                    for sid, participant in room_obj.remote_participants.items():
                        # Skip agent participants - look for SIP/caller participants
                        identity = getattr(participant, 'identity', None)
                        if identity and not identity.startswith('agent') and not identity.startswith('AI'):
                            participant_identity = identity
                            logging.info(f"TRANSFER_PARTICIPANT_FOUND | identity={identity} | sid={sid}")
                            break
                
                # Fallback: try all participants
                if not participant_identity and hasattr(room_obj, 'participants'):
                    for sid, participant in room_obj.participants.items():
                        identity = getattr(participant, 'identity', None)
                        if identity and not identity.startswith('agent') and not identity.startswith('AI'):
                            participant_identity = identity
                            logging.info(f"TRANSFER_PARTICIPANT_FOUND_FALLBACK | identity={identity} | sid={sid}")
                            break
            
            # Last resort: try to extract from room name (for SIP calls, identity is usually sip_+phone)
            if not participant_identity:
                # Room names for SIP calls often contain phone numbers
                # Extract potential phone number from room name and add sip_ prefix
                phone_match = re.search(r'\+?\d{10,}', room_name)
                if phone_match:
                    phone_number = phone_match.group()
                    # SIP participant identity format is typically "sip_+phone"
                    participant_identity = f"sip_{phone_number}"
                    logging.info(f"TRANSFER_PARTICIPANT_FROM_ROOM_NAME | extracted_phone={phone_number} | identity={participant_identity}")
                    
        except Exception as e:
            logging.warning(f"TRANSFER_PARTICIPANT_DETECTION_ERROR | error={str(e)}", exc_info=True)
        
        if not participant_identity:
            logging.error("TRANSFER_NO_PARTICIPANT | could not find participant identity")
            return "Unable to transfer: participant information not available. Transfer requires a SIP participant."
        
        # Say transfer sentence if configured
        response = ""
        if transfer_sentence:
            response = transfer_sentence
            logging.info(f"TRANSFER_SENTENCE | sentence='{transfer_sentence}'")
        else:
            response = "I'm transferring you now. Please hold."
        
        # Mark transfer as requested before initiating
        self._transfer_requested = True
        
        # Perform the actual LiveKit transfer
        try:
            # Get LiveKit credentials from environment
            livekit_url = os.getenv("LIVEKIT_URL")
            livekit_api_key = os.getenv("LIVEKIT_API_KEY")
            livekit_api_secret = os.getenv("LIVEKIT_API_SECRET")
            
            if not all([livekit_url, livekit_api_key, livekit_api_secret]):
                logging.error("TRANSFER_MISSING_CREDENTIALS | LiveKit credentials not configured")
                return "Transfer failed: LiveKit credentials not configured."
            
            # Create transfer request
            transfer_request = TransferSIPParticipantRequest(
                participant_identity=participant_identity,
                room_name=room_name,
                transfer_to=transfer_to,
                play_dialtone=False  # Cold transfer - no dialtone
            )
            
            logging.info(f"TRANSFER_REQUEST_CREATED | participant={participant_identity} | room={room_name} | to={transfer_to}")
            
            # Execute transfer using LiveKit API
            async with api.LiveKitAPI(
                url=livekit_url,
                api_key=livekit_api_key,
                api_secret=livekit_api_secret
            ) as livekit_api:
                await livekit_api.sip.transfer_sip_participant(transfer_request)
                logging.info(f"TRANSFER_SUCCESS | participant={participant_identity} | room={room_name} | to={transfer_to} | cold_transfer=true")
                return response
                
        except Exception as e:
            logging.error(f"TRANSFER_ERROR | error={str(e)} | participant={participant_identity} | room={room_name} | to={transfer_to}", exc_info=True)
            self._transfer_requested = False  # Reset on error so user can try again
            return f"I encountered an error while transferring your call. Please try again or contact support."

    async def _do_schedule(self) -> str:
        """Actually schedule the appointment."""
        if getattr(self, "_booking_inflight", False):
            return "I'm processing your booking…"
        
        # Check if already booked to prevent duplicate attempts
        if self._booking_data.booked:
            logging.info("BOOKING_ALREADY_COMPLETED | preventing duplicate booking attempt")
            return "Your appointment is already booked! Is there anything else I can help you with?"
        
        self._booking_inflight = True
        call_id = f"booking_{self._booking_data.name or 'unknown'}"
        
        async with measure_latency_context("calendar_schedule_appointment", call_id, {
            "attendee_name": self._booking_data.name,
            "has_email": bool(self._booking_data.email),
            "has_phone": bool(self._booking_data.phone),
            "has_notes": bool(self._booking_data.notes)
        }):
            try:
                logging.info("BOOKING_ATTEMPT | start=%s | name=%s | email=%s | phone=%s",
                             self._booking_data.selected_slot.start_time if self._booking_data.selected_slot else None,
                             self._booking_data.name, self._mask_email(self._booking_data.email or ""), 
                             self._mask_phone(self._booking_data.phone or ""))
                
                # Retry logic with exponential backoff for API failures
                max_retries = 3
                base_delay = 1.0
                
                for attempt in range(max_retries):
                    try:
                        # Increased timeout to 15 seconds to handle Cal.com API delays
                        resp = await asyncio.wait_for(
                            self.calendar.schedule_appointment(
                                start_time=self._booking_data.selected_slot.start_time,
                                attendee_name=self._booking_data.name or "",
                                attendee_email=self._booking_data.email or "",
                                attendee_phone=self._booking_data.phone or "",
                                notes=self._booking_data.notes or "",
                            ),
                            timeout=15.0  # Increased from 3 to 15 seconds
                        )
                        break  # Success, exit retry loop
                    except Exception as e:
                        if attempt == max_retries - 1:
                            # Last attempt failed, re-raise the exception
                            raise e
                        
                        # Check if this is a retryable error
                        error_msg = str(e).lower()
                        if any(keyword in error_msg for keyword in ['rate limited', 'server error', 'timeout', 'connection']):
                            delay = base_delay * (2 ** attempt)  # Exponential backoff
                            logging.warning("BOOKING_RETRY | attempt=%d/%d | delay=%.1fs | error=%s", 
                                          attempt + 1, max_retries, delay, str(e))
                            await asyncio.sleep(delay)
                            continue
                        else:
                            # Non-retryable error, re-raise immediately
                            raise e
                logging.info("BOOKING_SUCCESS | appointment scheduled successfully")
                
                # Format confirmation message with details
                tz = self._tz()
                local_time = self._booking_data.selected_slot.start_time.astimezone(tz)
                formatted_time = local_time.strftime('%A, %B %d at %I:%M %p')
                
                self._booking_data.booked = True
                # Reset state after successful booking to allow follow-on bookings
                prev_email = self._booking_data.email
                self._reset_state()
                return f"Perfect! Booked for {formatted_time}. A confirmation will go to {prev_email}. Need another time?"
            
            except asyncio.TimeoutError:
                logging.error("BOOKING_TIMEOUT | calendar operation timed out after 15 seconds")
                # Don't reset booking state on timeout - the booking might have succeeded
                # Return a message that allows verification
                return "The booking is taking longer than expected. I can verify if it went through - just say 'verify booking' or I can try booking again."
            except SlotUnavailableError as e:
                logging.error("SLOT_UNAVAILABLE | error=%s", str(e))
                self._booking_data.selected_slot = None
                self._booking_data.confirmed = False
                return "That time was just taken. Let's pick another option."
            except Exception as e:
                logging.error("BOOKING_ERROR | error=%s | error_type=%s", str(e), type(e).__name__)
                logging.exception("Full booking error traceback")
                self._booking_data.confirmed = False
                return f"I ran into a problem booking that: {str(e)}. Let's try a different time."
            finally:
                self._booking_inflight = False

    @function_tool(name="verify_booking")
    async def verify_booking(self, ctx: RunContext, dummy: Optional[str] = None) -> str:
        """Verify if a booking was successful after a timeout or error.
        
        Args:
            dummy: Optional parameter (not used, required for schema compatibility).
        """
        if not self._booking_data.selected_slot:
            return "I don't have a booking to verify. Let's start over with a new appointment."
        
        if self._booking_data.booked:
            tz = self._tz()
            local_time = self._booking_data.selected_slot.start_time.astimezone(tz)
            formatted_time = local_time.strftime('%A, %B %d at %I:%M %p')
            return f"Your booking is confirmed for {formatted_time}. You should receive a confirmation email shortly."
        
        # Try to check if the slot is still available
        try:
            # If the slot is no longer available, the booking likely succeeded
            slots = await self.calendar.list_available_slots(
                start_time=self._booking_data.selected_slot.start_time,
                end_time=self._booking_data.selected_slot.start_time + datetime.timedelta(minutes=30)
            )
            
            # If we can't find the slot in available slots, it's likely booked
            slot_found = any(
                slot.start_time == self._booking_data.selected_slot.start_time 
                for slot in slots.slots
            )
            
            if not slot_found:
                # Slot is no longer available - booking likely succeeded
                self._booking_data.booked = True
                tz = self._tz()
                local_time = self._booking_data.selected_slot.start_time.astimezone(tz)
                formatted_time = local_time.strftime('%A, %B %d at %I:%M %p')
                return f"Good news! Your booking is confirmed for {formatted_time}. The slot is no longer available, which means it was successfully booked."
            else:
                return "The slot is still available, so the booking didn't go through. Would you like me to try booking it again?"
                
        except Exception as e:
            logging.error("BOOKING_VERIFICATION_ERROR | error=%s", str(e))
            return "I'm having trouble verifying the booking status. Would you like me to try booking again or pick a different time?"

    # ========== ANALYSIS TOOLS ==========
    
    @function_tool(name="collect_analysis_data")
    async def collect_analysis_data(self, ctx: RunContext, field_name: str, field_value: str, field_type: str = "string") -> str:
        """Collect structured data for analysis during conversation"""
        logging.info("COLLECT_ANALYSIS_DATA_CALLED | field_name=%s | field_value=%s | type=%s", 
                    field_name, field_value, field_type)
        
        if not field_name or not field_value:
            return "I need both the field name and value to collect this information."

        # Format and store the analysis data
        # Format email addresses before storing in analysis data
        formatted_email = None
        if field_name == "Email Address" and field_value:
            formatted_email = self._format_email(field_value.strip())
            self._analysis_data[field_name.strip()] = formatted_email
        else:
            self._analysis_data[field_name.strip()] = field_value.strip()
        
        # Also populate booking data if it's a booking-related field
        if field_name == "Customer Name" and field_value:
            self._booking_data.name = field_value.strip()
            logging.info("BOOKING_NAME_SET | name=%s", field_value)
        elif field_name == "Email Address" and field_value:
            # Use the already formatted email from above
            if formatted_email and self._email_ok(formatted_email):
                self._booking_data.email = formatted_email
                logging.info("BOOKING_EMAIL_SET | original=%s | formatted=%s", field_value, formatted_email)
        elif field_name == "Phone Number" and field_value:
            formatted_phone = self._format_phone(field_value.strip())
            if self._phone_ok(formatted_phone):
                self._booking_data.phone = formatted_phone
                logging.info("BOOKING_PHONE_SET | original=%s | formatted=%s", field_value, formatted_phone)
        
        logging.info("ANALYSIS_DATA_COLLECTED | field=%s | type=%s | total_fields=%d", 
                    field_name, field_type, len(self._analysis_data))
        
        return f"okay"

    def get_analysis_data(self) -> dict[str, str]:
        """Get collected analysis data."""
        return self._analysis_data.copy()

    def get_booking_status(self) -> dict:
        """Get current booking status for debugging."""
        return {
            "has_calendar": self.calendar is not None,
            "booking_intent": bool(self._booking_data.selected_slot),
            "selected_slot": bool(self._booking_data.selected_slot),
            "has_name": bool(self._booking_data.name),
            "has_email": bool(self._booking_data.email),
            "has_phone": bool(self._booking_data.phone),
            "confirmed": self._booking_data.confirmed,
            "booked": self._booking_data.booked
        }

    def set_analysis_fields(self, fields: list) -> None:
        """Set analysis fields for structured data collection."""
        self._analysis_fields = fields
        logging.info("ANALYSIS_FIELDS_SET | count=%d | fields=%s", 
                    len(fields), [f.get('name', 'unnamed') for f in fields])

    @function_tool(name="start_new_booking")
    async def start_new_booking(self, ctx: RunContext, dummy: Optional[str] = None) -> str:
        """Start a new booking process, clearing previous state.
        
        Args:
            dummy: Optional parameter (not used, required for schema compatibility).
        """
        self._reset_state()
        return "Great! Let's start fresh. What day would you like to book an appointment?"
