from __future__ import annotations

import datetime
import logging
import re
from dataclasses import dataclass
from typing import Optional
from zoneinfo import ZoneInfo

from livekit.agents import Agent, RunContext, function_tool
from livekit.agents.llm import ChatContext, ChatMessage

from services.call_outcome_service import CallOutcomeService
from services.rag_service import RAGService
from integrations.calendar_api import Calendar, SlotUnavailableError
from integrations.supabase_client import SupabaseClient


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
    
    def __init__(
        self, 
        instructions: str, 
        calendar: Optional[Calendar] = None,
        knowledge_base_id: Optional[str] = None,
        company_id: Optional[str] = None,
        supabase: Optional[SupabaseClient] = None
    ) -> None:
        super().__init__(instructions=instructions)
        
        self.calendar = calendar
        self.knowledge_base_id = knowledge_base_id
        self.company_id = company_id
        self.supabase = supabase
        
        # Initialize services
        self.rag_service = None
        if knowledge_base_id and supabase:
            self.rag_service = RAGService()
            
        self.call_outcome_service = CallOutcomeService()
        
        # Booking state
        self._booking_data = BookingData()
        self._slots_map: dict[str, object] = {}
        self._webhook_data: dict[str, dict] = {}
        
        # Analysis data collection
        self._analysis_data: dict[str, str] = {}
        
        logging.info("UNIFIED_AGENT_INITIALIZED | rag_enabled=%s | calendar_enabled=%s", 
                    bool(self.rag_service), bool(self.calendar))

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
        return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", e.strip(), re.I))

    def _phone_ok(self, p: str) -> bool:
        """Validate phone format."""
        digits = re.sub(r"\D", "", p)
        return len(digits) >= 10

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
        cleaned = re.sub(r'[^\d+]', '', phone)
        
        # If it starts with +, keep it, otherwise add + if it looks like an international number
        if cleaned.startswith('+'):
            return cleaned
        elif len(cleaned) >= 10:
            # If it's 10+ digits, assume it's international and add +
            return '+' + cleaned
        else:
            return cleaned

    # ========== RAG TOOLS ==========
    
    @function_tool(name="query_knowledge_base")
    async def query_knowledge_base(self, ctx: RunContext, query: str) -> str:
        """Search the knowledge base for information related to the query."""
        if not self.rag_service or not self.knowledge_base_id:
            return "Knowledge base is not available."
        
        try:
            results = await self.rag_service.search_knowledge_base(self.knowledge_base_id, query)
            if results and results.snippets:
                # Format the results
                formatted_results = []
                for snippet in results.snippets[:3]:  # Limit to top 3 results
                    formatted_results.append(snippet.get('content', ''))
                return f"Based on our knowledge base: {' '.join(formatted_results)}"
            else:
                return "I couldn't find specific information about that in our knowledge base."
        except Exception as e:
            logging.error(f"RAG_SEARCH_ERROR | query={query} | error={str(e)}")
            return "I encountered an issue searching our knowledge base."

    @function_tool(name="get_detailed_information")
    async def get_detailed_information(self, ctx: RunContext, topic: str) -> str:
        """Get detailed information about a specific topic from the knowledge base."""
        if not self.rag_service or not self.knowledge_base_id:
            return "Knowledge base is not available."
        
        try:
            results = await self.rag_service.get_detailed_information(self.knowledge_base_id, topic)
            if results and results.snippets:
                # Format the results
                formatted_results = []
                for snippet in results.snippets[:3]:  # Limit to top 3 results
                    formatted_results.append(snippet.get('content', ''))
                return f"Here's detailed information about {topic}: {' '.join(formatted_results)}"
            else:
                return f"I couldn't find detailed information about {topic} in our knowledge base."
        except Exception as e:
            logging.error(f"RAG_DETAILED_INFO_ERROR | topic={topic} | error={str(e)}")
            return "I encountered an issue retrieving detailed information."

    # ========== BOOKING TOOLS ==========
    
    @function_tool(name="list_slots_on_day")
    async def list_slots_on_day(self, ctx: RunContext, day: str, max_options: int = 5) -> str:
        """List available appointment slots for a specific day."""
        msg = self._require_calendar()
        if msg:
            return msg
        
        logging.info("list_slots_on_day START | day=%s | calendar=%s", day, self.calendar is not None)
        
        try:
            # Parse the day
            if day.lower() in ["today", "now"]:
                start_time = datetime.datetime.now(self._tz())
            else:
                # Try to parse date string
                try:
                    start_time = datetime.datetime.fromisoformat(day)
                    if start_time.tzinfo is None:
                        # Use replace instead of localize for ZoneInfo
                        start_time = start_time.replace(tzinfo=self._tz())
                except ValueError:
                    return f"I couldn't understand the date '{day}'. Please use format like '2025-01-15' or say 'today'."
            
            # Get slots for the day
            end_time = start_time + datetime.timedelta(days=1)
            result = await self.calendar.list_available_slots(start_time=start_time, end_time=end_time)
            
            if not result.is_success:
                if result.is_calendar_unavailable:
                    return "Calendar service is temporarily unavailable."
                elif result.is_no_slots:
                    return f"No available slots for {day}."
                else:
                    return "I couldn't retrieve available slots at the moment."
            
            slots = result.slots[:max_options]
            if not slots:
                return f"No available slots for {day}."
            
            # Format slots for display
            lines = []
            for i, slot in enumerate(slots, 1):
                local_time = slot.start_time.astimezone(self._tz())
                formatted_time = local_time.strftime('%I:%M %p')
                lines.append(f"{i}. {formatted_time}")
                self._slots_map[f"{i}"] = slot
            
            return f"Available slots for {day}:\n" + "\n".join(lines)
            
        except Exception as e:
            logging.error(f"list_slots_on_day ERROR | day={day} | error={str(e)}")
            return "I encountered an issue retrieving available slots."

    @function_tool(name="choose_slot")
    async def choose_slot(self, ctx: RunContext, option_id: str) -> str:
        """Select a time slot for the appointment."""
        if option_id not in self._slots_map:
            return f"Option {option_id} is not available. Please choose from the listed options."
        
        self._booking_data.selected_slot = self._slots_map[option_id]
        logging.info("SLOT_SELECTED | option_id=%s", option_id)
        
        local_time = self._booking_data.selected_slot.start_time.astimezone(self._tz())
        formatted_time = local_time.strftime('%A, %B %d at %I:%M %p')
        
        # Check if we have all required information to book automatically
        missing_fields = []
        if not self._booking_data.name:
            missing_fields.append("name")
        if not self._booking_data.email:
            missing_fields.append("email")
        if not self._booking_data.phone:
            missing_fields.append("phone")
        
        if missing_fields:
            return f"Great! I've selected {formatted_time} for your appointment. I still need your {', '.join(missing_fields)} to complete the booking."
        else:
            # We have all the information, automatically proceed to book
            logging.info("AUTO_BOOKING_TRIGGERED | all fields available")
            return f"Perfect! I've selected {formatted_time} for your appointment. Let me book that for you now."

    @function_tool(name="auto_book_appointment")
    async def auto_book_appointment(self, ctx: RunContext) -> str:
        """Automatically book the appointment when all information is available."""
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
    async def collect_missing_info(self, ctx: RunContext) -> str:
        """Collect any missing information needed for booking."""
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
            return f"I need to collect some information first: {', '.join(missing_fields)}. What's your name?"
        else:
            return "Great! I have all the information I need. Let me confirm your appointment details."
    
    @function_tool(name="set_name")
    async def set_name(self, ctx: RunContext, name: str) -> str:
        """Set the customer's name for the appointment."""
        if not name or len(name.strip()) < 2:
            return "Please provide a valid name."
        
        self._booking_data.name = name.strip()
        logging.info("NAME_SET | name=%s", name)
        return f"Name set to {name}."

    @function_tool(name="set_email")
    async def set_email(self, ctx: RunContext, email: str) -> str:
        """Set the customer's email for the appointment."""
        formatted_email = self._format_email(email)
        if not self._email_ok(formatted_email):
            return "Please provide a valid email address."
        
        self._booking_data.email = formatted_email
        logging.info("EMAIL_SET | original=%s | formatted=%s", email, formatted_email)
        return f"Email set to {formatted_email}."

    @function_tool(name="set_phone")
    async def set_phone(self, ctx: RunContext, phone: str) -> str:
        """Set the customer's phone number for the appointment."""
        formatted_phone = self._format_phone(phone)
        if not self._phone_ok(formatted_phone):
            return "Please provide a valid phone number."
        
        self._booking_data.phone = formatted_phone
        logging.info("PHONE_SET | original=%s | formatted=%s", phone, formatted_phone)
        return f"Phone number set to {formatted_phone}."

    @function_tool(name="set_notes")
    async def set_notes(self, ctx: RunContext, notes: str) -> str:
        """Set notes for the appointment."""
        self._booking_data.notes = notes.strip()
        logging.info("NOTES_SET | notes=%s", notes)
        return f"Notes set: {notes}"

    @function_tool(name="confirm_details")
    async def confirm_details(self, ctx: RunContext) -> str:
        """Confirm the appointment details and book it."""
        if not (self._booking_data.selected_slot and self._booking_data.name and 
                self._booking_data.email and self._booking_data.phone):
            return "We're not ready to confirm yet. Please provide all required details."
        
        self._booking_data.confirmed = True
        msg = self._require_calendar()
        if msg:
            return msg
        
        return await self._do_schedule()

    @function_tool(name="confirm_details_yes")
    async def confirm_details_yes(self, ctx: RunContext) -> str:
        """Confirm the appointment details (yes response)."""
        return await self.confirm_details(ctx)

    @function_tool(name="confirm_details_no")
    async def confirm_details_no(self, ctx: RunContext) -> str:
        """User wants to change appointment details."""
        self._booking_data.confirmed = False
        return "No problem. What would you like to change—name, email, phone, or time?"

    @function_tool(name="finalize_booking")
    async def finalize_booking(self, ctx: RunContext) -> str:
        """Finalize and complete the booking process."""
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

    async def _do_schedule(self) -> str:
        """Actually schedule the appointment."""
        logging.info("BOOKING_ATTEMPT | start=%s | name=%s | email=%s | phone=%s",
                     self._booking_data.selected_slot.start_time if self._booking_data.selected_slot else None,
                     self._booking_data.name, self._booking_data.email, self._booking_data.phone)
        
        try:
            resp = await self.calendar.schedule_appointment(
                start_time=self._booking_data.selected_slot.start_time,
                attendee_name=self._booking_data.name or "",
                attendee_email=self._booking_data.email or "",
                attendee_phone=self._booking_data.phone or "",
                notes=self._booking_data.notes or "",
            )
            logging.info("BOOKING_SUCCESS | appointment scheduled successfully")
            
            # Format confirmation message with details
            tz = self._tz()
            local_time = self._booking_data.selected_slot.start_time.astimezone(tz)
            formatted_time = local_time.strftime('%A, %B %d at %I:%M %p')
            
            self._booking_data.booked = True
            return f"Perfect! Your appointment has been successfully booked for {formatted_time}. You'll receive a confirmation email at {self._booking_data.email}. Thank you!"
            
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

    # ========== ANALYSIS TOOLS ==========
    
    @function_tool(name="collect_analysis_data")
    async def collect_analysis_data(self, ctx: RunContext, field_name: str, field_value: str, field_type: str = "string") -> str:
        """Collect structured data for analysis during conversation"""
        logging.info("COLLECT_ANALYSIS_DATA_CALLED | field_name=%s | field_value=%s | type=%s", 
                    field_name, field_value, field_type)
        
        if not field_name or not field_value:
            return "I need both the field name and value to collect this information."

        # Store the analysis data
        self._analysis_data[field_name.strip()] = field_value.strip()
        
        # Also populate booking data if it's a booking-related field
        if field_name == "Customer Name" and field_value:
            self._booking_data.name = field_value.strip()
            logging.info("BOOKING_NAME_SET | name=%s", field_value)
        elif field_name == "Email Address" and field_value:
            formatted_email = self._format_email(field_value.strip())
            if self._email_ok(formatted_email):
                self._booking_data.email = formatted_email
                logging.info("BOOKING_EMAIL_SET | original=%s | formatted=%s", field_value, formatted_email)
        elif field_name == "Phone Number" and field_value:
            formatted_phone = self._format_phone(field_value.strip())
            if self._phone_ok(formatted_phone):
                self._booking_data.phone = formatted_phone
                logging.info("BOOKING_PHONE_SET | original=%s | formatted=%s", field_value, formatted_phone)
        
        logging.info("ANALYSIS_DATA_COLLECTED | field=%s | type=%s | total_fields=%d", 
                    field_name, field_type, len(self._analysis_data))
        
        return f"Information collected: {field_name} = {field_value}"

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
