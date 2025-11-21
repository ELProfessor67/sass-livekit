"""
Agent factory for creating and configuring LiveKit agents.
"""

import os
import json
import asyncio
import datetime
import logging
from typing import Dict, Any, Optional
from zoneinfo import ZoneInfo

from livekit.agents import Agent
from services.unified_agent import UnifiedAgent
from integrations.calendar_api import CalComCalendar
from config.settings import validate_model_names
from utils.instruction_builder import build_analysis_instructions, build_call_management_instructions

logger = logging.getLogger(__name__)

# Global OpenAI client for field classification
_OPENAI_CLIENT = None

def get_openai_client():
    """Get or create OpenAI client for field classification."""
    global _OPENAI_CLIENT
    if _OPENAI_CLIENT is None:
        from openai import AsyncOpenAI
        _OPENAI_CLIENT = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _OPENAI_CLIENT


class AgentFactory:
    """Factory for creating and configuring agents."""
    
    def __init__(self, supabase_client, prewarmed_llms=None, prewarmed_tts=None, prewarmed_vad=None):
        self.supabase = supabase_client
        self._prewarmed_llms = prewarmed_llms or {}
        self._prewarmed_tts = prewarmed_tts or {}
        self._prewarmed_vad = prewarmed_vad
    
    async def create_agent(self, config: Dict[str, Any]) -> Agent:
        """Create appropriate agent based on configuration."""
        # Validate model names first
        config = validate_model_names(config)
        
        instructions = config.get("prompt", "You are a helpful assistant.")

        # Add date context only if calendar is configured
        cal_api_key = config.get('cal_api_key')
        cal_event_type_id = config.get('cal_event_type_id')
        if cal_api_key and cal_event_type_id:
            tz_name = (config.get("cal_timezone") or "Asia/Karachi")
            try:
                now_local = datetime.datetime.now(ZoneInfo(tz_name))
            except Exception as e:
                logger.warning(f"Invalid timezone '{tz_name}': {str(e)}, falling back to UTC")
                tz_name = "UTC"
                now_local = datetime.datetime.now(ZoneInfo(tz_name))
            instructions += (
                f"\n\nCONTEXT:\n"
                f"- Current local time: {now_local.isoformat()}\n"
                f"- Timezone: {tz_name}\n"
                f"- When the user says a date like '7th October', always interpret it as the next FUTURE occurrence in {tz_name}. "
                f"Never call tools with past dates; if a parsed date is in the past year, bump it to the next year."
            )

        # Add call management settings to instructions
        call_management_config = build_call_management_instructions(config)
        if call_management_config:
            instructions += "\n\n" + call_management_config

        # Add analysis instructions for structured data collection
        analysis_instructions = await build_analysis_instructions(config, self._classify_data_fields_with_llm)
        if analysis_instructions:
            instructions += "\n\n" + analysis_instructions
            logger.info(f"ANALYSIS_INSTRUCTIONS_ADDED | length={len(analysis_instructions)}")

        # Add first message handling
        first_message = config.get("first_message", "")
        force_first = os.getenv("FORCE_FIRST_MESSAGE", "true").lower() != "false"
        if force_first and first_message:
            instructions += f' IMPORTANT: Start the conversation by saying exactly: "{first_message}" Do not repeat or modify this greeting.'
            logger.info(f"FIRST_MESSAGE_SET | first_message={first_message}")

        # Log final instructions for debugging
        # logger.info(f"FINAL_INSTRUCTIONS_LENGTH | length={len(instructions)}")
        # logger.info(f"FINAL_INSTRUCTIONS_PREVIEW | preview={instructions}...")

        # Create unified agent that combines RAG and booking capabilities
        knowledge_base_id = config.get("knowledge_base_id")
        logger.info(f"UNIFIED_AGENT_CONFIG | knowledge_base_id={knowledge_base_id}")
        
        # Initialize calendar if credentials are available
        calendar = await self._initialize_calendar(config)

        # Add RAG tools to instructions if knowledge base is available
        if knowledge_base_id:
            instructions += "\n\nKNOWLEDGE BASE ACCESS:\nYou have access to a knowledge base with information about the company. You can use the following tools when needed:\n- query_knowledge_base: Search for specific information\n- get_detailed_information: Get comprehensive details about a topic\n\nIMPORTANT: Only use the knowledge base tools when explicitly instructed to do so in your system prompt or when the user specifically requests information that requires knowledge base lookup. Do not automatically search the knowledge base unless instructed.\n\nWhen you do use the knowledge base, provide complete, well-formatted responses with proper context and source information when available."
            logger.info("RAG_TOOLS | Knowledge base tools added to instructions (conditional usage)")

        # Add booking instructions only if calendar is available
        if calendar:
            instructions += "\n\nBOOKING CAPABILITIES:\nYou can help users book appointments. You have access to the following booking tools:\n- list_slots_on_day: Show available appointment slots for a specific day (shows 10 slots by default - use max_options=20 to show more)\n- choose_slot: Select a time slot for the appointment (can use time like '7:00pm' or slot number from list)\n- set_name: Set the customer's name\n- set_email: Set the customer's email\n- set_phone: Set the customer's phone number\n- finalize_booking: Complete the booking when ALL information is collected (time slot, name, email, phone)\n\nCRITICAL BOOKING RULES:\n- ONLY start booking if the user explicitly requests it (e.g., 'I want to book', 'schedule an appointment', 'book a time')\n- Do NOT automatically start booking just because you have contact information (phone, email, name)\n- Do NOT call list_slots_on_day or any booking tools unless the user explicitly asks to book or schedule an appointment\n- Do NOT call finalize_booking or confirm_details until you have: 1) selected time slot, 2) customer name, 3) email, and 4) phone number. Only call ONE of these functions, not both."
            logger.info("BOOKING_TOOLS | Calendar booking tools added to instructions")

        # Create unified agent with both RAG and booking capabilities
        # Use pre-warmed components if available
        llm_provider = config.get("llm_provider_setting", "OpenAI")
        llm_model = config.get("llm_model_setting", "gpt-4o-mini")
        config_key = f"{llm_provider}_{llm_model}"
        
        prewarmed_llm = self._prewarmed_llms.get(config_key)
        prewarmed_tts = self._prewarmed_tts.get("openai_nova")
        prewarmed_vad = self._prewarmed_vad
        
        agent = UnifiedAgent(
            instructions=instructions,
            calendar=calendar,
            knowledge_base_id=knowledge_base_id,
            company_id=config.get("company_id"),
            supabase=self.supabase,
            prewarmed_llm=prewarmed_llm,
            prewarmed_tts=prewarmed_tts,
            prewarmed_vad=prewarmed_vad
        )
        
        logger.info("UNIFIED_AGENT_CREATED | rag_enabled=%s | calendar_enabled=%s", 
                   bool(knowledge_base_id), bool(calendar))
        
        # Set analysis fields if configured
        analysis_fields = config.get("structured_data_fields", [])
        # Handle case where structured_data_fields is None
        if analysis_fields is None:
            analysis_fields = []
        logger.info(f"ANALYSIS_FIELDS_DEBUG | raw_config={config.get('structured_data_fields')} | processed_fields={analysis_fields}")
        if analysis_fields:
            agent.set_analysis_fields(analysis_fields)
            logger.info(f"ANALYSIS_FIELDS_SET | count={len(analysis_fields)} | fields={[f.get('name', 'unnamed') for f in analysis_fields]}")
        else:
            logger.warning("NO_ANALYSIS_FIELDS_CONFIGURED | assistant has no structured_data_fields")
        
        # Set transfer configuration if enabled
        transfer_enabled = config.get("transfer_enabled", False)
        if transfer_enabled:
            transfer_config = {
                "transfer_enabled": transfer_enabled,
                "transfer_phone_number": config.get("transfer_phone_number"),
                "transfer_country_code": config.get("transfer_country_code", "+1"),
                "transfer_sentence": config.get("transfer_sentence"),
                "transfer_condition": config.get("transfer_condition")
            }
            agent.set_transfer_config(transfer_config)
            logger.info(f"TRANSFER_CONFIG_SET | enabled={transfer_enabled} | phone={transfer_config.get('transfer_phone_number')}")

        return agent

    async def _initialize_calendar(self, config: Dict[str, Any]) -> Optional[CalComCalendar]:
        """Initialize calendar if credentials are available."""
        # Debug logging for calendar configuration
        cal_api_key = config.get('cal_api_key')
        cal_event_type_id = config.get('cal_event_type_id')
        logger.info(f"CALENDAR_DEBUG | cal_api_key present: {bool(cal_api_key)} | cal_event_type_id present: {bool(cal_event_type_id)}")
        logger.info(f"CALENDAR_DEBUG | cal_api_key value: {cal_api_key[:10] if cal_api_key else 'NOT_FOUND'}... | cal_event_type_id value: {cal_event_type_id or 'NOT_FOUND'}")
        logger.info(f"CALENDAR_DEBUG | cal_timezone: {config.get('cal_timezone', 'NOT_FOUND')}")
        
        if config.get("cal_api_key") and config.get("cal_event_type_id"):
            # Validate and convert event_type_id to proper format
            event_type_id = config.get("cal_event_type_id")
            try:
                # Convert to string first, then validate it's a valid number
                if isinstance(event_type_id, str):
                    # Remove any non-numeric characters except for the event type format
                    cleaned_id = event_type_id.strip()
                    # Handle Cal.com event type format like "cal_1759650430507_boxv695kh"
                    if cleaned_id.startswith("cal_"):
                        # Extract the numeric part
                        parts = cleaned_id.split("_")
                        if len(parts) >= 2:
                            numeric_part = parts[1]
                            if numeric_part.isdigit():
                                event_type_id = int(numeric_part)
                            else:
                                logger.error(f"INVALID_EVENT_TYPE_ID | cannot extract number from {cleaned_id}")
                                event_type_id = None
                        else:
                            logger.error(f"INVALID_EVENT_TYPE_ID | malformed cal.com ID {cleaned_id}")
                            event_type_id = None
                    elif cleaned_id.isdigit():
                        event_type_id = int(cleaned_id)
                    else:
                        logger.error(f"INVALID_EVENT_TYPE_ID | not a valid number {cleaned_id}")
                        event_type_id = None
                elif isinstance(event_type_id, (int, float)):
                    event_type_id = int(event_type_id)
                else:
                    logger.error(f"INVALID_EVENT_TYPE_ID | unexpected type {type(event_type_id)}: {event_type_id}")
                    event_type_id = None
            except (ValueError, TypeError) as e:
                logger.error(f"EVENT_TYPE_ID_CONVERSION_ERROR | error={str(e)} | value={event_type_id}")
                event_type_id = None
            
            if event_type_id:
                # Get timezone from config, default to Asia/Karachi for Pakistan
                cal_timezone = config.get("cal_timezone") or "Asia/Karachi"
                logger.info(f"CALENDAR_CONFIG | api_key={'*' * 10} | event_type_id={event_type_id} | timezone={cal_timezone}")
                calendar = CalComCalendar(
                    api_key=config.get("cal_api_key"),
                    event_type_id=event_type_id,
                    timezone=cal_timezone
                )
                # Initialize the calendar
                try:
                    await calendar.initialize()
                    logger.info("CALENDAR_INITIALIZED | calendar setup successful")
                    return calendar
                except Exception as e:
                    logger.error(f"CALENDAR_INIT_FAILED | error={str(e)}")
                    return None
            else:
                logger.error("CALENDAR_CONFIG_FAILED | invalid event_type_id")
                return None
        else:
            logger.warning("CALENDAR_NOT_CONFIGURED | missing cal_api_key or cal_event_type_id")
            return None

    async def _classify_data_fields_with_llm(self, structured_data: list) -> Dict[str, list]:
        """Use LLM to classify which fields should be asked vs extracted."""
        try:
            openai_api_key = os.getenv("OPENAI_API_KEY")
            if not openai_api_key:
                logger.warning("OPENAI_API_KEY not configured for field classification")
                return {"ask_user": [], "extract_from_conversation": []}

            client = get_openai_client()
            
            # Prepare field descriptions
            fields_json = json.dumps([
                {
                    "name": field.get("name", ""),
                    "description": field.get("description", ""),
                    "type": field.get("type", "string")
                }
                for field in structured_data
            ], indent=2)
            
            classification_prompt = f"""You are analyzing data fields for a voice conversation system. For each field, decide whether it should be:
1. "ask_user" - Information that should be directly asked from the user during the conversation
2. "extract_from_conversation" - Information that should be extracted/inferred from the conversation after it ends

Fields to classify:
{fields_json}

Guidelines:
- Ask user for: contact details, preferences, specific choices, personal information, scheduling details
- Extract from conversation: summaries, outcomes, sentiment, quality metrics, call analysis, key points discussed

Return a JSON object with two arrays. You must respond with valid JSON format only:
{{
  "ask_user": ["field_name1", "field_name2"],
  "extract_from_conversation": ["field_name3", "field_name4"]
}}"""

            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": classification_prompt}],
                    temperature=0.1,
                    max_tokens=1000
                ),
                timeout=10.0
            )
            
            content = response.choices[0].message.content.strip()
            logger.info(f"FIELD_CLASSIFICATION_RESPONSE | response={content}")
            
            # Parse JSON response
            try:
                classification = json.loads(content)
                logger.info(f"FIELD_CLASSIFICATION_SUCCESS | ask_user={len(classification.get('ask_user', []))} | extract={len(classification.get('extract_from_conversation', []))}")
                return classification
            except json.JSONDecodeError as e:
                logger.error(f"FIELD_CLASSIFICATION_JSON_ERROR | error={str(e)} | content={content}")
                # Fallback to asking user for all fields
                return {
                    "ask_user": [field.get("name", "") for field in structured_data],
                    "extract_from_conversation": []
                }
                
        except Exception as e:
            logger.error(f"FIELD_CLASSIFICATION_ERROR | error={str(e)}")
            # Fallback to asking user for all fields
            return {
                "ask_user": [field.get("name", "") for field in structured_data],
                "extract_from_conversation": []
            }
