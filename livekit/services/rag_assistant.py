"""
LiveKit Agent implementation with RAG (Retrieval-Augmented Generation) capabilities.
Converts the existing RAGAssistant class to follow LiveKit Agents framework patterns.
"""

from __future__ import annotations

import json
import logging
import datetime
import re
from typing import Optional, Dict, Any

from livekit.agents import Agent, RunContext, function_tool, ChatContext, ChatMessage
from integrations.calendar_api import Calendar, AvailableSlot, SlotUnavailableError, CalendarResult, CalendarError
from .rag_service import rag_service, RAGContext


class RAGAgent(Agent):
    """LiveKit Agent with RAG capabilities for knowledge base integration"""
    
    def __init__(
        self, 
        instructions: str, 
        calendar: Calendar | None = None,
        knowledge_base_id: Optional[str] = None,
        company_id: Optional[str] = None,
        supabase=None
    ) -> None:
        super().__init__(instructions=instructions)
        self.calendar = calendar
        self.knowledge_base_id = knowledge_base_id
        self.company_id = company_id
        self.supabase = supabase
        
        # RAG configuration
        self.rag_enabled = bool(knowledge_base_id)
        self.max_context_length = 8000
        self.rag_threshold = 0.3
        
        # Booking state (FSM) - inherited from original Assistant
        self._booking_intent: bool = False
        self._notes: str = ""
        self._preferred_day: Optional[datetime.date] = None
        self._slots_map: dict[str, AvailableSlot] = {}
        self._selected_slot: Optional[AvailableSlot] = None

        # General contact information (for all calls, not just booking)
        self._name: Optional[str] = None
        self._email: Optional[str] = None
        self._phone: Optional[str] = None
        self._confirmed: bool = False

        # Webhook data collection
        self._webhook_data: dict[str, str] = {}
        
        # Analysis data collection
        self._structured_data: dict[str, any] = {}
        self._analysis_fields: list = []
        
        # Data collection state
        self._data_collection_intent: bool = False
        self._data_collection_step: str = "none"
        
        # Collected data for N8N integration
        self._collected_data: Dict[str, Any] = {}
        
        # RAG state (simplified for LLM-triggered approach)
        self._rag_cache: Dict[str, str] = {}

    async def on_enter(self):
        """Called when the agent is added to the session."""
        # Generate initial greeting
        self.session.generate_reply()

    async def on_user_turn_completed(
        self, 
        turn_ctx: ChatContext, 
        new_message: ChatMessage,
    ) -> None:
        """
        No automatic RAG processing - RAG is now LLM-triggered through function tools
        """
        # RAG processing is now handled through function tools when the LLM determines it needs context
        pass
    
    # Removed _should_perform_rag_lookup - RAG is now LLM-triggered through function tools
    
    async def _get_rag_context(self, query: str) -> Optional[str]:
        """
        Get RAG context from knowledge base
        """
        try:
            # Check cache first
            cache_key = query.strip().lower()
            if cache_key in self._rag_cache:
                logging.info("RAG_ASSISTANT | Using cached context")
                return self._rag_cache[cache_key]
            
            # Get context from knowledge base
            logging.info(f"RAG_ASSISTANT | Requesting context for query: '{query}'")
            context = await rag_service.get_enhanced_context(
                knowledge_base_id=self.knowledge_base_id,
                query=query,
                max_context_length=self.max_context_length
            )
            
            if context:
                logging.info(f"RAG_ASSISTANT | Received context: {len(context)} characters")
                # Cache the result
                self._rag_cache[cache_key] = context
                
                # Limit cache size
                if len(self._rag_cache) > 10:
                    # Remove oldest entry
                    oldest_key = next(iter(self._rag_cache))
                    del self._rag_cache[oldest_key]
            else:
                logging.warning(f"RAG_ASSISTANT | No context returned for query: '{query}'")
            
            return context
            
        except Exception as e:
            logging.error(f"RAG_ASSISTANT | Error getting RAG context: {e}")
            return None

    # ---------- LLM-triggered RAG function tools (like agents-main) ----------
    @function_tool(name="query_knowledge_base")
    async def query_knowledge_base(self, ctx: RunContext, query: str) -> str:
        """
        Query the knowledge base for information related to the user's question.
        Use this when you need additional context to answer the user's question.
        """
        if not self.rag_enabled or not self.knowledge_base_id:
            return "I don't have access to a knowledge base right now."
        
        try:
            logging.info(f"RAG_FUNCTION_CALLED | query='{query}'")
            
            # Get context from knowledge base using the existing RAG service
            context = await self._get_rag_context(query)
            if context:
                logging.info(f"RAG_CONTEXT_RETRIEVED | length={len(context)}")
                return f"Based on our knowledge base: {context}"
            else:
                logging.info("RAG_NO_CONTEXT_FOUND")
                return "I couldn't find specific information about that in our knowledge base. Is there anything else I can help you with?"
                
        except Exception as e:
            logging.error(f"RAG_FUNCTION_ERROR | error={e}")
            return "I had trouble searching our knowledge base. Let me try to help you in another way."

    @function_tool(name="get_detailed_information")
    async def get_detailed_information(self, ctx: RunContext, topic: str) -> str:
        """
        Get comprehensive information about a specific topic from the knowledge base.
        Use this when the user asks for detailed explanations or comprehensive information.
        """
        if not self.rag_enabled or not self.knowledge_base_id:
            return "I don't have access to detailed information right now."
        
        try:
            logging.info(f"RAG_DETAILED_INFO_REQUESTED | topic='{topic}'")
            
            # Use multiple related queries for better coverage
            queries = [
                topic,
                f"what is {topic}",
                f"information about {topic}",
                f"details on {topic}",
                f"explanation of {topic}"
            ]
            
            # Search with multiple queries using the existing RAG service
            context = await rag_service.search_multiple_queries(
                knowledge_base_id=self.knowledge_base_id,
                queries=queries,
                max_context_length=self.max_context_length
            )
            
            if context:
                logging.info(f"RAG_DETAILED_CONTEXT_RETRIEVED | length={len(context)}")
                return f"Here's detailed information about {topic}: {context}"
            else:
                logging.info("RAG_DETAILED_NO_CONTEXT_FOUND")
                return f"I couldn't find detailed information about {topic} in our knowledge base. Would you like me to help you with something else?"
                
        except Exception as e:
            logging.error(f"RAG_DETAILED_FUNCTION_ERROR | error={e}")
            return "I had trouble retrieving detailed information. Let me try to help you in another way."

    # ---------- Inherited helper methods from BookingAgent ----------
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
            try:
                day = int(a); mo = tom(b)
                if mo: return datetime.date(today.year, mo, day)
            except Exception:
                pass
            try:
                mo = tom(a); day = int(b)
                if mo: return datetime.date(today.year, mo, day)
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

    def _looks_like_prompt(self, text: str) -> bool:
        t = (text or "").strip().lower()
        return (not t) or ("?" in t) or ("what is your" in t) or ("your name" in t) or ("your email" in t) or ("your phone" in t)

    # ---------- Inherited booking functions from BookingAgent ----------
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
            result = await self.calendar.list_available_slots(start_time=start_utc, end_time=end_utc)

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
        self._phone = phone.strip()
        
        # Automatically collect analysis data for phone if analysis fields are configured
        if self._analysis_fields:
            for field in self._analysis_fields:
                field_name = field.get('name', '').lower()
                if 'phone' in field_name or 'number' in field_name:
                    self._structured_data[field.get('name', 'Phone Number')] = {
                        "value": phone.strip(),
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

    async def _do_schedule(self) -> str:
        """Actually schedule the appointment."""
        try:
            await self.calendar.schedule_appointment(
                start_time=self._selected_slot.start_time,
                attendee_name=self._name or "",
                attendee_email=self._email or "",
                attendee_phone=self._phone or "",
                notes=self._notes or "",
            )
            return "Your appointment is booked."
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