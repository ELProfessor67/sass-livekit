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
            # Use assistant timezone if available, otherwise fallback to UTC
            tz_name = (config.get("cal_timezone") or config.get("timezone") or "UTC")
            try:
                now_local = datetime.datetime.now(ZoneInfo(tz_name))
            except Exception as e:
                logger.warning(f"Invalid timezone '{tz_name}': {str(e)}, falling back to UTC")
                tz_name = "UTC"
                now_local = datetime.datetime.now(ZoneInfo(tz_name))
            
            instructions += (
                f"\n\nCONTEXT:\n"
                f"- Current local time: {now_local.strftime('%Y-%m-%d %H:%M:%S')} ({tz_name})\n"
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
        language_setting = config.get("language_setting", "en")
        
        # Backend-level localization for default greetings if user hasn't customized them
        default_greetings = {
            "hi": "नमस्ते! मैं {name} बोल रही हूँ। मैं आज आपकी कैसे मदद कर सकती हूँ?",
            "es": "¡Hola! Soy {name}. ¿En qué puedo ayudarle hoy?",
            "pt": "Olá! Aqui é {name}. Como posso ajudar você hoje?",
            "fr": "Bonjour! C'est {name}. Comment puis-je vous aider aujourd'hui?",
            "de": "Hallo! Hier ist {name}. Wie kann ich Ihnen heute helfen?",
            "nl": "Hallo! Met {name}. Waarmee kan ik u vandaag helpen?",
            "it": "Ciao! Sono {name}. Come posso aiutarla oggi?",
            "zh": "您好！我是 {name}。请问今天有什么可以帮您的吗？",
            "en-es": "Hi! This is {name}. ¡Hola! Habla con {name}. How can I help you? ¿En qué puedo ayudarle?"
        }
        
        known_english_defaults = [
            "Hi! This is Helen from Dental Care. How may I help you today?",
            "Hi! This is [Your Name] from [Your Company]. How may I help you today?",
            "Hello, how can I help you today?",
            "Hi, how are you today?",
            "I'm still here if you need anything",
            "Are you still there?",
            "Did you have any other questions?",
            ""
        ]

        # Robust English detection: if non-English language and message is pure ASCII with greeting keywords
        is_english_looking = False
        if first_message and all(ord(c) < 128 for c in first_message):
            greeting_keywords = ["hi", "hello", "hey", "help you", "how are you", "this is"]
            if any(keyword in first_message.lower() for keyword in greeting_keywords):
                is_english_looking = True

        # If language is not English and first_message is English-looking, translate it
        if language_setting != "en" and (first_message in known_english_defaults or is_english_looking):
            # Try to extract name/company if it's "this is X from Y" or "this is X"
            name_part = "your assistant"
            import re
            name_match = re.search(r"(?:this is|i'm|i am)\s+([^.!?]+)", first_message, re.IGNORECASE)
            if name_match:
                name_part = name_match.group(1).strip()
            
            template = default_greetings.get(language_setting, "नमस्ते! मैं आपकी मदद कैसे कर सकता हूँ?")
            # For Hindi specifically, if we can't find a template, use a generic Hindi one
            if "{name}" in template:
                translated_message = template.replace("{name}", name_part)
            else:
                translated_message = template
                
            first_message = translated_message
            # CRITICAL: Update the config dict so main.py sees the translated message
            config["first_message"] = first_message
            logger.info(f"FIRST_MESSAGE_LOCALIZED_BACKEND | language={language_setting} | original={config.get('first_message', '')[:20]} | localized={first_message[:30]}...")

        force_first = os.getenv("FORCE_FIRST_MESSAGE", "true").lower() != "false"
        if force_first and first_message:
            instructions += f' IMPORTANT: Start the conversation by saying exactly: "{first_message}" Do not repeat or modify this greeting.'
            logger.info(f"FIRST_MESSAGE_SET | first_message={first_message}")

        # Add language constraints to ensure the LLM responds in the correct language
        language_names = {
            "en": "English",
            "es": "Spanish",
            "pt": "Portuguese",
            "fr": "French",
            "de": "German",
            "nl": "Dutch",
            "it": "Italian",
            "hi": "Hindi",
            "zh": "Chinese",
            "en-es": "English or Spanish as appropriate for the user's input"
        }
        lang_name = language_names.get(language_setting, "English")
        instructions += f"\n\nLANGUAGE:\n- You MUST respond in {lang_name} at all times. "
        if language_setting == "en-es":
            instructions += "If the user speaks English, respond in English. If they speak Spanish, respond in Spanish."
        else:
            instructions += f"Even if the user speaks another language, you must stay in {lang_name}."
        
        logger.info(f"LANGUAGE_INSTRUCTIONS_ADDED | language={language_setting} | name={lang_name}")

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
            instructions += (
                "\n\nBOOKING CAPABILITIES:\n"
                "You can help users book appointments using the following tools:\n"
                "- set_call_timezone: Set the caller's time zone (REQUIRED before listing slots or scheduling).\n"
                "- list_slots_on_day: Show available slots for a specific day. Requires caller timezone to be set first.\n"
                "- choose_slot: Select a time slot.\n"
                "- set_name: Set the customer's name.\n"
                "- set_email: Set the customer's email.\n"
                "- set_phone: Set the customer's phone number.\n"
                "- finalize_booking: Complete the booking when ALL info is collected.\n\n"
                "CONVERSATIONAL GUIDELINES:\n"
                "1. COLLECT INFO FIRST: Before asking for availability or timezone, you MUST collect the customer's name, email, and phone number. This is your first priority.\n"
                "2. ASK FOR TIMEZONE AFTER INFO: Once you have the contact details, ask for their time zone before listing availability.\n"
                "3. ASK FOR DAY THEN TIME: After getting the timezone, ask what day works best. Then offer specific times.\n"
                "4. OFFER EXACTLY 3 OPTIONS: When presenting availability, offer exactly 3 slots in ONE casual sentence. Always say the day before the time (e.g., 'I’ve got Wednesday at 2, Thursday at 1:30, or Friday at 3 — any of those work?'). Do not list more than 3, do not use numbers, and do not use multiple sentences.\n"
                "5. MANDATORY TOOL CALL: You MUST call `finalize_booking` or `auto_book_appointment` before confirming ANY appointment. Never say 'You're all set' or similar before the tool confirms success.\n"
                "6. WAIT FOR TOOL: The tool will provide the final confirmation message. Do not make it up.\n\n"
                "CRITICAL BOOKING RULES:\n"
                "- INFO PRIORITY: Never list slots or ask for timezone until you have Name, Email, and Phone.\n"
                "- TIMEZONE: You MUST resolve timezone before listing slots. Ask: 'What time zone are you in?' if not set. Do NOT assume UTC.\n"
                "- ONLY start booking if the user explicitly requests it.\n"
                "- Do NOT call finalize_booking until you have: timezone, slot, name, email, and phone."
            )
            logger.info("BOOKING_TOOLS | Calendar booking tools and guidelines added to instructions")

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
            assistant_id=config.get("id"),
            user_id=config.get("user_id"),
            phone_number=config.get("phone_number"),
            prewarmed_llm=prewarmed_llm,
            prewarmed_tts=prewarmed_tts,
            prewarmed_vad=prewarmed_vad,
            language_setting=language_setting
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
                # Use assistant timezone if available, otherwise fallback to UTC
                cal_timezone = config.get("cal_timezone") or config.get("timezone") or "UTC"
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
        """A fast, deterministic classification of fields to avoid slow LLM calls."""
        ask_user = []
        extract = []
        
        # Keywords that suggest we should ask the user
        ASK_KEYWORDS = {
            "name", "email", "phone", "number", "date", "time", "slot", "appointment", 
            "booking", "location", "address", "company", "budget", "interest"
        }
        
        for field in structured_data:
            name = field.get("name", "").lower()
            desc = field.get("description", "").lower()
            
            # If the name or description contains any ask-keywords, assume we ask the user
            should_ask = any(kw in name or kw in desc for kw in ASK_KEYWORDS)
            
            if should_ask:
                ask_user.append(field.get("name"))
            else:
                extract.append(field.get("name"))
        
        logger.info(f"DETERMINISTIC_FIELD_CLASSIFICATION | ask_user={len(ask_user)} | extract={len(extract)}")
        return {
            "ask_user": ask_user,
            "extract_from_conversation": extract
        }
