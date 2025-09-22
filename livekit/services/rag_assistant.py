"""
Enhanced Assistant class with RAG (Retrieval-Augmented Generation) capabilities
Integrates knowledge base context with voice agent functionality
"""

from __future__ import annotations

import json
import logging
import datetime
import re
from typing import Optional, Dict, Any

from livekit.agents import Agent, RunContext, function_tool, ChatContext, ChatMessage
from integrations.calendar_api import Calendar, AvailableSlot, SlotUnavailableError
from .rag_service import rag_service, RAGContext


class RAGAssistant(Agent):
    """Enhanced Assistant with RAG capabilities for knowledge base integration"""
    
    def __init__(
        self, 
        instructions: str, 
        calendar: Calendar | None = None,
        knowledge_base_id: Optional[str] = None,
        company_id: Optional[str] = None
    ) -> None:
        super().__init__(instructions=instructions)
        self.calendar = calendar
        self.knowledge_base_id = knowledge_base_id
        self.company_id = company_id
        
        # RAG configuration
        self.rag_enabled = bool(knowledge_base_id)
        self.max_context_length = 8000  # Increased to handle larger snippets
        self.rag_threshold = 0.3  # Minimum relevance score for context
        
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
        
        # Data collection state
        self._data_collection_intent: bool = False
        self._data_collection_step: str = "none"  # none, name, email, phone, complete
        
        # Collected data for N8N integration
        self._collected_data: Dict[str, Any] = {}

        # one-tool-per-utterance guard
        self._last_speech_id: Optional[str] = None
        self._calls_this_speech: int = 0
        
        # RAG state
        self._last_rag_query: Optional[str] = None
        self._last_rag_context: Optional[str] = None
        self._rag_cache: Dict[str, str] = {}

    async def on_user_turn_completed(
        self, 
        turn_ctx: ChatContext, 
        new_message: ChatMessage,
    ) -> None:
        """
        RAG integration: Retrieve relevant context from knowledge base
        when user completes a turn
        """
        if not self.rag_enabled or not self.knowledge_base_id:
            return
        
        try:
            # Extract text content from the message
            if hasattr(new_message, 'content'):
                if isinstance(new_message.content, list):
                    # If content is a list, join the elements
                    user_text = ' '.join(str(item) for item in new_message.content)
                else:
                    user_text = str(new_message.content)
            else:
                user_text = str(new_message)
            if not user_text or len(user_text.strip()) < 3:
                return
            
            # Check if we should perform RAG lookup
            if self._should_perform_rag_lookup(user_text):
                logging.info(f"RAG_ASSISTANT | Performing RAG lookup for query: '{user_text[:100]}...'")
                
                # Get context from knowledge base
                context = await self._get_rag_context(user_text)
                if context:
                    # Add context to the chat context
                    turn_ctx.add_message(
                        role="assistant",
                        content=f"Additional information relevant to your query: {context}"
                    )
                    logging.info(f"RAG_ASSISTANT | Added context to chat: {len(context)} characters")
                else:
                    logging.info("RAG_ASSISTANT | No relevant context found")
                    
        except Exception as e:
            logging.error(f"RAG_ASSISTANT | Error in on_user_turn_completed: {e}")
    
    def _should_perform_rag_lookup(self, user_text: str) -> bool:
        """
        Determine if we should perform RAG lookup based on user input
        """
        # Skip very short inputs
        if len(user_text.strip()) < 5:
            return False
        
        # Skip if it's the same query as last time (avoid redundant lookups)
        if user_text.strip().lower() == self._last_rag_query:
            return False
        
        # Skip booking-related queries (they don't need knowledge base context)
        booking_keywords = [
            "book", "schedule", "appointment", "time", "available", 
            "confirm", "name", "email", "phone", "details"
        ]
        user_lower = user_text.lower()
        if any(keyword in user_lower for keyword in booking_keywords):
            return False
        
        # Skip simple greetings
        greeting_patterns = [
            r"^(hi|hello|hey|good morning|good afternoon|good evening)",
            r"^(thanks?|thank you)",
            r"^(yes|no|ok|okay|sure|alright)"
        ]
        for pattern in greeting_patterns:
            if re.match(pattern, user_text.strip(), re.IGNORECASE):
                return False
        
        return True
    
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
                self._last_rag_query = query.strip().lower()
                self._last_rag_context = context
                
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
    
    async def search_knowledge_base(self, query: str) -> Optional[RAGContext]:
        """
        Search knowledge base and return structured context
        """
        if not self.rag_enabled or not self.knowledge_base_id:
            return None
        
        try:
            return await rag_service.search_knowledge_base(
                knowledge_base_id=self.knowledge_base_id,
                query=query
            )
        except Exception as e:
            logging.error(f"RAG_ASSISTANT | Error searching knowledge base: {e}")
            return None

    # ---------- Inherited helper methods from original Assistant ----------
    def _tz(self):
        from zoneinfo import ZoneInfo
        return self.calendar.tz if self.calendar else ZoneInfo("UTC")

    def _turn_gate(self, ctx: RunContext) -> Optional[str]:
        """Prefer at most one tool call per user utterance (speech_id)."""
        sid = getattr(ctx, "speech_id", None) or getattr(ctx, "speechId", None)
        if sid is None:
            if self._calls_this_speech >= 1:
                return "I'll pause here for your reply."
            self._calls_this_speech += 1
            return None
        if sid != self._last_speech_id:
            self._last_speech_id = sid
            self._calls_this_speech = 1
            return None
        self._calls_this_speech += 1
        if self._calls_this_speech > 1:
            return "I'll pause here for your reply."
        return None

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

    # ---------- RAG-specific tool functions ----------
    @function_tool
    async def search_knowledge(self, ctx: RunContext, query: str) -> str:
        """
        Search the knowledge base for information related to the query
        """
        gate = self._turn_gate(ctx)
        if gate: return gate
        
        if not self.rag_enabled:
            return "I don't have access to a knowledge base right now."
        
        # Check if webhook data has been collected first
        if hasattr(self, '_webhook_data') and self._webhook_data:
            webhook_fields_count = len(self._webhook_data)
            logging.info(f"RAG_ASSISTANT | Webhook data collected: {webhook_fields_count} fields")
        else:
            logging.info("RAG_ASSISTANT | No webhook data collected yet, proceeding with RAG search")
        
        try:
            logging.info(f"RAG_ASSISTANT | Knowledge search requested: '{query}'")
            
            # Get context from knowledge base
            context = await self._get_rag_context(query)
            if context:
                return f"Based on our knowledge base: {context}"
            else:
                return "I couldn't find specific information about that in our knowledge base. Is there anything else I can help you with?"
                
        except Exception as e:
            logging.error(f"RAG_ASSISTANT | Error in search_knowledge: {e}")
            return "I had trouble searching our knowledge base. Let me try to help you in another way."

    @function_tool
    async def get_detailed_info(self, ctx: RunContext, topic: str) -> str:
        """
        Get detailed information about a specific topic from the knowledge base
        """
        gate = self._turn_gate(ctx)
        if gate: return gate
        
        if not self.rag_enabled:
            return "I don't have access to detailed information right now."
        
        try:
            # Use multiple related queries for better coverage
            queries = [
                topic,
                f"what is {topic}",
                f"information about {topic}",
                f"details on {topic}"
            ]
            
            # Search with multiple queries
            context = await rag_service.search_multiple_queries(
                knowledge_base_id=self.knowledge_base_id,
                queries=queries,
                max_context_length=self.max_context_length
            )
            
            if context:
                return f"Here's detailed information about {topic}: {context}"
            else:
                return f"I couldn't find detailed information about {topic} in our knowledge base. Would you like me to help you with something else?"
                
        except Exception as e:
            logging.error(f"RAG_ASSISTANT | Error in get_detailed_info: {e}")
            return "I had trouble retrieving detailed information. Let me try to help you in another way."

    # ---------- Inherited booking functions from original Assistant ----------
    @function_tool
    async def confirm_wants_to_book_yes(self, ctx: RunContext) -> str:
        gate = self._turn_gate(ctx)
        if gate: return gate
        self._booking_intent = True
        self._confirmed = False
        self._preferred_day = None
        self._selected_slot = None
        self._name = self._email = self._phone = None
        self._notes = ""
        return "Great—what's the reason for the visit? I'll add it to the notes."

    @function_tool
    async def set_notes(self, ctx: RunContext, notes: str) -> str:
        gate = self._turn_gate(ctx)
        if gate: return gate
        if not self._booking_intent:
            return "If you'd like to book, please say so first."
        self._notes = (notes or "").strip()
        if not self._notes:
            return "Could you tell me the reason for the visit? I'll add it to the notes."
        return "Got it. Which day works for you—today, tomorrow, a weekday, or a date like 2025-09-05?"

    @function_tool
    async def list_slots_on_day(self, ctx: RunContext, day: str, max_options: int = 6) -> str:
        gate = self._turn_gate(ctx)
        if gate: return gate
        if not self._booking_intent:
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
            slots = await self.calendar.list_available_slots(start_time=start_utc, end_time=end_utc)

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

            if slots:
                label = f"on {start_local.strftime('%A, %B %d')}"
                return present(slots, label)

            # find next day with availability within 30 days
            search_end = start_utc + datetime.timedelta(days=30)
            future = await self.calendar.list_available_slots(start_time=end_utc, end_time=search_end)
            if not future:
                return "I don't see any open times soon. Would you like me to check a wider range?"
            by_day: dict[datetime.date, list[AvailableSlot]] = {}
            for s in future:
                by_day.setdefault(s.start_time.astimezone(tz).date(), []).append(s)
            nxt = min(by_day.keys())
            alt = by_day[nxt]
            alt_label = f"on {datetime.datetime.combine(nxt, datetime.time(0,0,tzinfo=tz)).strftime('%A, %B %d')}"
            return "Nothing is open that day. " + present(alt, alt_label)
        except Exception:
            logging.exception("Error listing slots")
            return "Sorry, I had trouble checking that day. Could we try a different day?"

    @function_tool
    async def choose_slot(self, ctx: RunContext, option_id: str) -> str:
        gate = self._turn_gate(ctx)
        if gate: return gate
        if not self._booking_intent or not self._slots_map:
            return "Let's pick a day first."
        key = (option_id or "").strip().lower()
        slot = self._slots_map.get(key) \
            or self._slots_map.get(f"option {key}") \
            or self._slots_map.get(f"option_{key}") \
            or (self._slots_map.get(key.replace("option","").strip()) if key.startswith("option") else None)
        if not slot:
            return "I couldn't find that option. Please say the option number again."
        self._selected_slot = slot
        return "Great. What's your full name?"

    @function_tool
    async def provide_name(self, ctx: RunContext, name: str) -> str:
        gate = self._turn_gate(ctx)
        if gate: return gate
        if not self._selected_slot:
            return "Please choose a time option first."
        if self._looks_like_prompt(name) or len(name.strip()) < 2:
            return "Please tell me your full name."
        self._name = name.strip()
        return "Thanks. What's your email?"

    @function_tool
    async def provide_email(self, ctx: RunContext, email: str) -> str:
        gate = self._turn_gate(ctx)
        if gate: return gate
        if not self._selected_slot or not self._name:
            return "We'll do email after we pick a time and your name."
        if self._looks_like_prompt(email) or not self._email_ok(email):
            return "That email doesn't look valid. Could you repeat it?"
        self._email = email.strip()
        return "And your phone number?"

    @function_tool
    async def provide_phone(self, ctx: RunContext, phone: str) -> str:
        gate = self._turn_gate(ctx)
        if gate: return gate
        if not self._selected_slot or not self._name or not self._email:
            return "We'll do phone after time, name, and email."
        if self._looks_like_prompt(phone) or not self._phone_ok(phone):
            return "That phone doesn't look right. Please say it with digits."
        self._phone = phone.strip()
        tz = self._tz()
        local = self._selected_slot.start_time.astimezone(tz)
        day_s = local.strftime('%A, %B %d at %I:%M %p')
        notes_s = self._notes or "—"
        return (f"Please confirm: {day_s}. Name {self._name}. Email {self._email}. "
                f"Phone {self._phone}. Reason: {notes_s}. Is everything correct?")

    @function_tool
    async def confirm_details(self, ctx: RunContext) -> str:
        gate = self._turn_gate(ctx)
        if gate: return gate
        if not (self._selected_slot and self._name and self._email and self._phone):
            return "We're not ready to confirm yet."
        self._confirmed = True
        msg = self._require_calendar()
        if msg: return msg
        return await self._do_schedule()

    @function_tool
    async def confirm_details_yes(self, ctx: RunContext) -> str:
        return await self.confirm_details(ctx)

    @function_tool
    async def confirm_details_no(self, ctx: RunContext) -> str:
        gate = self._turn_gate(ctx)
        if gate: return gate
        self._confirmed = False
        return "No problem. What would you like to change—name, email, phone, or time?"

    async def _do_schedule(self) -> str:
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

    @function_tool
    async def finalize_booking(self, ctx: RunContext) -> str:
        gate = self._turn_gate(ctx)
        if gate: return gate
        msg = self._require_calendar()
        if msg: return msg
        if not (self._booking_intent and self._selected_slot and self._name and self._email and self._phone and self._confirmed):
            return "We're not ready to finalize—let's confirm details first."
        return await self._do_schedule()

    # ---------- Legacy booking functions ----------
    @function_tool
    async def list_available_slots(self, ctx: RunContext, range_days: int = 7) -> str:
        return "Let's first pick a day; then I'll read out the available times."

    @function_tool
    async def schedule_appointment(
        self,
        ctx: RunContext,
        slot_id: str,
        attendee_name: str,
        attendee_email: str,
        attendee_phone: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> str:
        return "We'll confirm details, then I'll book it for you."

    # ---------- General Data Collection Tools (for N8N integration) ----------
    
    @function_tool
    async def start_data_collection(self, ctx: RunContext) -> str:
        """
        Start collecting contact information for N8N integration
        """
        gate = self._turn_gate(ctx)
        if gate: return gate
        
        self._data_collection_intent = True
        self._data_collection_step = "name"
        return "I'd like to get some contact information from you. What's your full name?"

    @function_tool
    async def collect_name(self, ctx: RunContext, name: str) -> str:
        """
        Collect the caller's name for N8N integration
        """
        gate = self._turn_gate(ctx)
        if gate: return gate
        
        if self._looks_like_prompt(name) or len(name.strip()) < 2:
            return "Please tell me your full name."
        
        self._name = name.strip()
        self._collected_data["name"] = self._name
        self._data_collection_step = "email"
        return "Thank you! What's your email address?"

    @function_tool
    async def collect_email(self, ctx: RunContext, email: str) -> str:
        """
        Collect the caller's email for N8N integration
        """
        gate = self._turn_gate(ctx)
        if gate: return gate
        
        if not self._name:
            return "Let me get your name first. What's your full name?"
        
        if self._looks_like_prompt(email) or not self._email_ok(email):
            return "That email doesn't look valid. Could you repeat it?"
        
        self._email = email.strip()
        self._collected_data["email"] = self._email
        self._data_collection_step = "phone"
        return "Great! And what's your phone number?"

    @function_tool
    async def collect_phone(self, ctx: RunContext, phone: str) -> str:
        """
        Collect the caller's phone number for N8N integration
        """
        gate = self._turn_gate(ctx)
        if gate: return gate
        
        if not self._name or not self._email:
            return "Let me get your name and email first."
        
        if self._looks_like_prompt(phone) or not self._phone_ok(phone):
            return "That phone number doesn't look right. Please say it with digits."
        
        self._phone = phone.strip()
        self._collected_data["phone"] = self._phone
        self._data_collection_step = "complete"
        return f"Perfect! I have your information: {self._name}, {self._email}, {self._phone}. Is there anything else I can help you with?"

    @function_tool
    async def skip_data_collection(self, ctx: RunContext) -> str:
        """
        Skip data collection if the caller doesn't want to provide information
        """
        gate = self._turn_gate(ctx)
        if gate: return gate
        
        self._data_collection_intent = False
        self._data_collection_step = "none"
        return "No problem! Is there anything else I can help you with?"

    def get_collected_data(self) -> Dict[str, Any]:
        """
        Get the collected contact information for N8N integration
        """
        return self._collected_data.copy()

    # ---------- Webhook data collection ----------
    @function_tool
    async def collect_webhook_data(self, ctx: RunContext, field_name: str, field_value: str, collection_method: str = "user_provided") -> str:
        """Collect webhook data with flexible collection methods for n8n integration"""
        print(f"DEBUG: collect_webhook_data CALLED | field_name={field_name} | field_value={field_value} | method={collection_method}")
        logging.info("DEBUG: collect_webhook_data CALLED | field_name=%s | field_value=%s | method=%s", field_name, field_value, collection_method)
        
        gate = self._turn_gate(ctx)
        if gate: return gate

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
