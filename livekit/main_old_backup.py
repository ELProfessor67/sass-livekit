



from __future__ import annotations

import json
import urllib.request
import urllib.parse
import logging
import datetime
import asyncio
import sys
from typing import Optional, Tuple, Iterable
import base64
import os
import re
import hashlib
import uuid

from dotenv import load_dotenv

# Load environment variables FIRST before any other imports
try:
    load_dotenv()
except Exception as e:
    print(f"Warning: Could not load .env file: {e}")
    # Continue without .env file

# Set REST API environment variable if not already set (move to initialization)
def _initialize_rest_api_setting():
    if not os.getenv("USE_REST_API"):
        os.environ["USE_REST_API"] = "true"
        print("REST_API_ENABLED | Set USE_REST_API=true as fallback")

# Initialize REST API setting
_initialize_rest_api_setting()

from zoneinfo import ZoneInfo

from livekit import agents, api
from livekit.agents import AgentSession, Agent, RunContext, function_tool, AutoSubscribe, RoomInputOptions, RoomOutputOptions

# Import ElevenLabs at top level to avoid main thread registration issues
try:
    import livekit.plugins.elevenlabs as lk_elevenlabs
    ELEVENLABS_AVAILABLE = True
except ImportError:
    lk_elevenlabs = None
    ELEVENLABS_AVAILABLE = False

# ⬇️ OpenAI + VAD plugins
from livekit.plugins import openai as lk_openai  # LLM, STT, TTS
from livekit.plugins import silero              # VAD

# ⬇️ Groq plugin
try:
    from livekit.plugins import groq as lk_groq  # Groq LLM
except ImportError:
    lk_groq = None

# ⬇️ REST LLM Service
from services.rest_llm_service import create_rest_llm
from config.rest_api_config import get_rest_config, is_rest_model

# ⬇️ Cerebras plugin (using OpenAI-compatible API)
try:
    import openai as cerebras_client
    CEREBRAS_AVAILABLE = True
except ImportError:
    CEREBRAS_AVAILABLE = False

try:
    from supabase import create_client, Client  # type: ignore
except Exception:  # pragma: no cover
    create_client = None  # type: ignore
    Client = object  # type: ignore

# Calendar integration (your module)
from integrations.calendar_api import Calendar, CalComCalendar, AvailableSlot, SlotUnavailableError

# Assistant service (used for INBOUND only)
from services.assistant import Assistant
from services.rag_assistant import RAGAssistant

# Recording service
from services.recording_service import recording_service
logging.basicConfig(level=logging.INFO)

# ===================== Utilities =====================

def sha256_text(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def preview(s: str, n: int = 160) -> str:
    return s[:n] + ("…" if len(s) > n else "")

def determine_call_status(call_duration: int, transcription: list) -> str:
    """Determine call status based on duration and transcription content"""
    if call_duration < 5:
        return "dropped"
    if call_duration < 15:
        if not transcription or len(transcription) < 2:
            return "dropped"
    if transcription:
        all_content = ""
        for item in transcription:
            if isinstance(item, dict) and "content" in item:
                content = item["content"]
                if isinstance(content, str):
                    all_content += content.lower() + " "
        spam_keywords = [
            "robocall", "telemarketing", "scam", "fraud", "suspicious",
            "unwanted", "spam", "junk", "harassment", "threat"
        ]
        if any(keyword in all_content for keyword in spam_keywords):
            return "spam"
        if len(transcription) <= 1:
            return "no_response"
        if len(transcription) == 2:
            first_message = transcription[0].get("content", "").lower() if transcription[0] else ""
            if "hi" in first_message or "hello" in first_message or "thanks for calling" in first_message:
                return "dropped"
    if transcription and len(transcription) >= 4:
        all_content = ""
        for item in transcription:
            if isinstance(item, dict) and "content" in item:
                content = item["content"]
                if isinstance(content, str):
                    all_content += content.lower() + " "
        success_keywords = [
            "appointment", "book", "schedule", "confirm", "details",
            "name", "email", "phone", "thank you", "goodbye"
        ]
        if any(keyword in all_content for keyword in success_keywords):
            return "completed"
    if call_duration >= 15 and transcription and len(transcription) >= 3:
        return "completed"
    if transcription and len(transcription) >= 2:
        return "completed"
    return "dropped"

async def save_campaign_call_to_supabase(
    call_sid: str,
    campaign_id: str,
    phone_number: str,
    contact_name: str,
    start_time: datetime.datetime,
    end_time: datetime.datetime,
    session_history: list,
    participant_identity: str = None,
    recording_sid: str = None,
    assistant_id: str = None
) -> bool:
    """Save outbound campaign call data to campaign_calls table"""
    try:
        if not create_client:
            logging.warning("Supabase client not available, skipping campaign call save")
            return False

        supabase_url = os.getenv("SUPABASE_URL", "").strip()
        supabase_key = (
            os.getenv("SUPABASE_SERVICE_ROLE", "").strip()
            or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        )

        if not supabase_url or not supabase_key:
            logging.warning("Supabase credentials not configured, skipping campaign call save")
            return False

        sb: Client = create_client(supabase_url, supabase_key)

        # Calculate call duration
        call_duration = int((end_time - start_time).total_seconds())

        # Prepare transcription
        transcription = []
        for item in session_history:
            if isinstance(item, dict) and "role" in item and "content" in item:
                content = item["content"]
                # Handle different content formats
                if isinstance(content, list):
                    # If content is a list, join the elements and filter out empty strings
                    content_parts = []
                    for c in content:
                        if c and str(c).strip():
                            content_parts.append(str(c).strip())
                    content = " ".join(content_parts)
                elif not isinstance(content, str):
                    content = str(content)
                
                # Only add non-empty content
                if content and content.strip():
                    transcription.append({
                        "role": item["role"],
                        "content": content.strip()
                    })
        
        logging.info("TRANSCRIPTION_PREPARED | session_history_items=%d | transcription_entries=%d", 
                     len(session_history), len(transcription))
        
        # Log sample transcription for debugging
        if transcription:
            sample_transcript = transcription[0] if len(transcription) > 0 else {}
            logging.info("TRANSCRIPTION_SAMPLE | first_entry=%s", sample_transcript)
        else:
            logging.warning("NO_TRANSCRIPTION_DATA | session_history_sample=%s", 
                           session_history[:2] if session_history else "Empty")

        # Determine call status and outcome
        call_status = determine_call_status(call_duration, transcription)
        
        # Determine if appointment was booked
        appointment_booked = False
        outcome = "voicemail"  # Default to voicemail instead of no_answer
        
        if call_status == "completed":
            # Check if appointment booking keywords were used
            all_content = ""
            for item in transcription:
                if isinstance(item, dict) and "content" in item:
                    content = item["content"]
                    if isinstance(content, str):
                        all_content += content.lower() + " "
            
            booking_keywords = ["appointment", "book", "schedule", "confirm", "details"]
            if any(keyword in all_content for keyword in booking_keywords):
                appointment_booked = True
                outcome = "interested"
            else:
                outcome = "not_interested"  # Changed from "answered" to valid outcome
        elif call_status == "spam":
            outcome = "do_not_call"
        elif call_duration < 10:
            outcome = "voicemail"
        else:
            outcome = "voicemail"  # Changed from "no_answer" to valid outcome

        # Map call_status to valid database status
        if call_status == "completed":
            db_status = "completed"
        elif call_status == "spam":
            db_status = "completed"  # Mark as completed but with do_not_call outcome
        elif call_duration < 10:
            db_status = "completed"  # Short calls are completed but likely voicemail
        else:
            db_status = "completed"  # All calls end as completed
        
        # Update campaign_calls table
        call_data = {
            "call_sid": call_sid,
            "status": db_status,
            "call_duration": call_duration,
            "outcome": outcome,
            "transcription": transcription if transcription else [],  # Store empty array instead of None
            "completed_at": end_time.isoformat(),
            "notes": f"Appointment booked: {appointment_booked}"
        }

        # Find the campaign call by call_sid and update it
        logging.info("UPDATING_CAMPAIGN_CALL | call_sid=%s | call_data_keys=%s | transcription_count=%d", 
                     call_sid, list(call_data.keys()), len(transcription))
        
        try:
            # Use UPSERT instead of UPDATE to handle cases where record doesn't exist
            # First try to find existing record by call_sid
            existing_call = sb.table("campaign_calls").select("id, call_sid, status").eq("call_sid", call_sid).execute()
            
            if existing_call.data:
                # Record exists, update it
                logging.info("CAMPAIGN_CALL_UPDATE_EXISTING | call_sid=%s | existing_status=%s | call_data=%s", 
                           call_sid, existing_call.data[0].get('status'), call_data)
                result = sb.table("campaign_calls").update(call_data).eq("call_sid", call_sid).execute()
            else:
                # Record doesn't exist, create it with campaign_id
                logging.info("CAMPAIGN_CALL_CREATE_NEW | call_sid=%s | campaign_id=%s | call_data=%s", 
                           call_sid, campaign_id, call_data)
                call_data["campaign_id"] = campaign_id
                call_data["phone_number"] = phone_number
                call_data["contact_name"] = contact_name
                call_data["created_at"] = start_time.isoformat()
                result = sb.table("campaign_calls").insert(call_data).execute()
            
            # Log the result
            logging.info("CAMPAIGN_CALL_UPSERT_RESULT | call_sid=%s | result_data=%s | result_count=%s", 
                        call_sid, result.data, result.count if hasattr(result, 'count') else 'unknown')
                        
        except Exception as e:
            logging.error("CAMPAIGN_CALL_UPSERT_ERROR | call_sid=%s | error=%s | error_type=%s", 
                         call_sid, str(e), type(e).__name__)
            return False

        if result.data:
            logging.info("CAMPAIGN_CALL_UPDATED | call_sid=%s | duration=%ds | status=%s | outcome=%s | appointment_booked=%s | transcription_items=%d",
                         call_sid, call_duration, call_status, outcome, appointment_booked, len(transcription))
            
            # Update campaign metrics based on outcome
            campaign_updates = {}
            if outcome == "interested" and appointment_booked:
                campaign_updates["interested"] = 1
            elif outcome == "answered":
                campaign_updates["pickups"] = 1
                campaign_updates["total_calls_answered"] = 1
            elif outcome == "do_not_call":
                campaign_updates["do_not_call"] = 1
            
            if campaign_updates:
                try:
                    # Get current campaign data first
                    campaign_result = sb.table("campaigns").select("id, interested, pickups, total_calls_answered, do_not_call").eq("id", campaign_id).single().execute()
                    if campaign_result.data:
                        campaign = campaign_result.data
                        for key, increment in campaign_updates.items():
                            current_value = campaign.get(key, 0) or 0
                            campaign_updates[key] = current_value + increment
                        
                        # Update campaign metrics
                        result = sb.table("campaigns").update(campaign_updates).eq("id", campaign_id).execute()
                        if result.data:
                            logging.info("CAMPAIGN_METRICS_UPDATED | campaign_id=%s | updates=%s", campaign_id, campaign_updates)
                        else:
                            logging.warning("CAMPAIGN_METRICS_UPDATE_NO_DATA | campaign_id=%s | updates=%s", campaign_id, campaign_updates)
                    else:
                        logging.warning("CAMPAIGN_NOT_FOUND | campaign_id=%s", campaign_id)
                except Exception as e:
                    logging.error("CAMPAIGN_METRICS_UPDATE_FAILED | campaign_id=%s | error=%s", campaign_id, str(e))
            
            return True
        else:
            logging.error("CAMPAIGN_CALL_UPDATE_FAILED | call_sid=%s", call_sid)
            return False

    except Exception as e:
        logging.exception("CAMPAIGN_CALL_UPDATE_ERROR | call_sid=%s | error=%s", call_sid, str(e))
        return False

async def process_call_analysis(assistant_id: str, transcription: list, call_duration: int, agent) -> dict:
    """Process call analysis based on assistant configuration"""
    try:
        if not create_client:
            return {}

        supabase_url = os.getenv("SUPABASE_URL", "").strip()
        supabase_key = (
            os.getenv("SUPABASE_SERVICE_ROLE", "").strip()
            or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        )

        if not supabase_url or not supabase_key:
            return {}

        sb: Client = create_client(supabase_url, supabase_key)

        # Get assistant analysis configuration
        assistant_result = sb.table("assistant").select(
            "analysis_summary_prompt",
            "analysis_evaluation_prompt", 
            "analysis_structured_data_prompt",
            "analysis_structured_data_properties",
            "structured_data_fields",
            "analysis_summary_timeout",
            "analysis_evaluation_timeout",
            "analysis_structured_data_timeout"
        ).eq("id", assistant_id).execute()

        if not assistant_result.data:
            logging.warning("ASSISTANT_NOT_FOUND | assistant_id=%s", assistant_id)
            return {}

        assistant_config = assistant_result.data[0]
        analysis_data = {}

        # Process call summary if configured
        if assistant_config.get("analysis_summary_prompt"):
            try:
                summary = await generate_call_summary(
                    transcription=transcription,
                    prompt=assistant_config["analysis_summary_prompt"],
                    timeout=assistant_config.get("analysis_summary_timeout", 30)
                )
                analysis_data["call_summary"] = summary
                logging.info("CALL_SUMMARY_GENERATED | assistant_id=%s | summary_length=%d", 
                           assistant_id, len(summary) if summary else 0)
            except Exception as e:
                logging.warning("CALL_SUMMARY_FAILED | assistant_id=%s | error=%s", assistant_id, str(e))

        # Process success evaluation if configured
        if assistant_config.get("analysis_evaluation_prompt"):
            try:
                success_evaluation = await evaluate_call_success(
                    transcription=transcription,
                    prompt=assistant_config["analysis_evaluation_prompt"],
                    timeout=assistant_config.get("analysis_evaluation_timeout", 15)
                )
                analysis_data["success_evaluation"] = success_evaluation
                logging.info("SUCCESS_EVALUATION_COMPLETED | assistant_id=%s | result=%s", 
                           assistant_id, success_evaluation)
            except Exception as e:
                logging.warning("SUCCESS_EVALUATION_FAILED | assistant_id=%s | error=%s", assistant_id, str(e))

        # Process structured data extraction - always try to get data from agent
        structured_data_fields = assistant_config.get("structured_data_fields", [])
        logging.info("STRUCTURED_DATA_CONFIG_CHECK | assistant_id=%s | fields_count=%d | fields=%s", 
                   assistant_id, len(structured_data_fields), structured_data_fields)
        
        # Always try to extract structured data from agent, even if no fields are configured
        try:
            logging.info("STRUCTURED_DATA_EXTRACTION_START | assistant_id=%s | transcription_items=%d", 
                       assistant_id, len(transcription))
            
            # First, try to get data directly from agent
            agent_structured_data = {}
            if agent and hasattr(agent, 'get_structured_data'):
                agent_structured_data = agent.get_structured_data()
                logging.info("AGENT_STRUCTURED_DATA_RETRIEVED | assistant_id=%s | fields_count=%d | data=%s", 
                           assistant_id, len(agent_structured_data), agent_structured_data)
            
            # If we have configured fields, also try AI extraction
            if structured_data_fields and len(structured_data_fields) > 0:
                ai_structured_data = await extract_structured_data(
                    transcription=transcription,
                    fields=structured_data_fields,
                    prompt=assistant_config.get("analysis_structured_data_prompt"),
                    properties=assistant_config.get("analysis_structured_data_properties", {}),
                    timeout=assistant_config.get("analysis_structured_data_timeout", 20),
                    agent=agent
                )
                # Merge AI extracted data with agent data (agent data takes precedence)
                final_structured_data = {**ai_structured_data, **agent_structured_data}
                logging.info("STRUCTURED_DATA_EXTRACTED_WITH_AI | assistant_id=%s | ai_fields=%d | agent_fields=%d | final_fields=%d | data=%s", 
                           assistant_id, len(ai_structured_data), len(agent_structured_data), len(final_structured_data), final_structured_data)
            else:
                # No configured fields, just use agent data
                final_structured_data = agent_structured_data
                logging.info("STRUCTURED_DATA_EXTRACTED_AGENT_ONLY | assistant_id=%s | fields_count=%d | data=%s", 
                           assistant_id, len(final_structured_data), final_structured_data)
            
            analysis_data["structured_data"] = final_structured_data
            
        except Exception as e:
            logging.warning("STRUCTURED_DATA_FAILED | assistant_id=%s | error=%s", assistant_id, str(e))
            # Still try to get agent data as fallback
            if agent and hasattr(agent, 'get_structured_data'):
                try:
                    fallback_data = agent.get_structured_data()
                    analysis_data["structured_data"] = fallback_data
                    logging.info("STRUCTURED_DATA_FALLBACK_SUCCESS | assistant_id=%s | fields_count=%d", 
                               assistant_id, len(fallback_data))
                except Exception as fallback_error:
                    logging.warning("STRUCTURED_DATA_FALLBACK_FAILED | assistant_id=%s | error=%s", assistant_id, str(fallback_error))

        return analysis_data

    except Exception as e:
        logging.exception("ANALYSIS_PROCESSING_ERROR | assistant_id=%s | error=%s", assistant_id, str(e))
        return {}

async def generate_call_summary(transcription: list, prompt: str, timeout: int = 30) -> str:
    """Generate call summary using LLM"""
    try:
        # Prepare transcription text
        transcript_text = ""
        for item in transcription:
            if isinstance(item, dict) and "content" in item:
                role = item.get("role", "unknown")
                content = item["content"]
                if isinstance(content, str):
                    transcript_text += f"{role}: {content}\n"
        
        if not transcript_text.strip():
            return "No conversation content available for summary."

        # Use OpenAI API for summary generation
        import openai
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            logging.warning("OPENAI_API_KEY not configured for call summary")
            return "Summary generation not available - API key not configured."

        # Use async OpenAI client instead of run_in_executor
        client = openai.AsyncOpenAI(api_key=openai_api_key)
        
        response = await asyncio.wait_for(
            client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"Please summarize this call:\n\n{transcript_text}"}
                ],
                max_tokens=500,
                temperature=0.3
            ),
            timeout=timeout
        )

        return response.choices[0].message.content.strip()

    except asyncio.TimeoutError:
        logging.warning("CALL_SUMMARY_TIMEOUT | timeout=%ds", timeout)
        return "Summary generation timed out."
    except Exception as e:
        logging.warning("CALL_SUMMARY_ERROR | error=%s", str(e))
        return f"Summary generation failed: {str(e)}"

async def evaluate_call_success(transcription: list, prompt: str, timeout: int = 15) -> str:
    """Evaluate call success using LLM"""
    try:
        # Prepare transcription text
        transcript_text = ""
        for item in transcription:
            if isinstance(item, dict) and "content" in item:
                role = item.get("role", "unknown")
                content = item["content"]
                if isinstance(content, str):
                    transcript_text += f"{role}: {content}\n"
        
        if not transcript_text.strip():
            return "No conversation content available for evaluation."

        # Use OpenAI API for success evaluation
        import openai
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            logging.warning("OPENAI_API_KEY not configured for success evaluation")
            return "Success evaluation not available - API key not configured."

        client = openai.OpenAI(api_key=openai_api_key)
        
        # Run the synchronous OpenAI call in a thread pool to make it async-compatible
        loop = asyncio.get_event_loop()
        response = await asyncio.wait_for(
            loop.run_in_executor(
                None,
                lambda: client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": f"Please evaluate this call:\n\n{transcript_text}"}
                    ],
                    max_tokens=200,
                    temperature=0.1
                )
            ),
            timeout=timeout
        )

        return response.choices[0].message.content.strip()

    except asyncio.TimeoutError:
        logging.warning("SUCCESS_EVALUATION_TIMEOUT | timeout=%ds", timeout)
        return "Success evaluation timed out."
    except Exception as e:
        logging.warning("SUCCESS_EVALUATION_ERROR | error=%s", str(e))
        return f"Success evaluation failed: {str(e)}"

async def extract_structured_data(transcription: list, fields: list, prompt: str = None, 
                                 properties: dict = None, timeout: int = 20, agent = None) -> dict:
    """Extract structured data from call transcription"""
    try:
        logging.info("EXTRACT_STRUCTURED_DATA_START | fields_count=%d | transcription_items=%d", 
                   len(fields), len(transcription))
        
        # Prepare transcription text
        transcript_text = ""
        for item in transcription:
            if isinstance(item, dict) and "content" in item:
                role = item.get("role", "unknown")
                content = item["content"]
                if isinstance(content, str):
                    transcript_text += f"{role}: {content}\n"
        
        logging.info("TRANSCRIPT_PREPARED | length=%d | preview=%s", 
                   len(transcript_text), transcript_text[:200] + "..." if len(transcript_text) > 200 else transcript_text)
        
        if not transcript_text.strip():
            logging.warning("EXTRACT_STRUCTURED_DATA_EMPTY_TRANSCRIPT")
            return {}

        # Get structured data from agent if available
        agent_data = {}
        if agent and hasattr(agent, 'get_webhook_data'):
            agent_data = agent.get_webhook_data()
            logging.info("AGENT_DATA_RETRIEVED | fields_count=%d", len(agent_data))
        
        # Also get structured analysis data from agent
        agent_analysis_data = {}
        if agent and hasattr(agent, 'get_structured_data'):
            agent_analysis_data = agent.get_structured_data()
            logging.info("AGENT_ANALYSIS_DATA_RETRIEVED | fields_count=%d", len(agent_analysis_data))

        # Generate prompt if not provided
        if not prompt:
            field_descriptions = []
            for field in fields:
                if isinstance(field, dict):
                    name = field.get("name", "unknown")
                    description = field.get("description", "No description")
                    field_type = field.get("type", "string")
                    field_descriptions.append(f"- {name}: {description} (type: {field_type})")
            
            prompt = f"Extract the following structured data from the conversation:\n\n" + "\n".join(field_descriptions) + "\n\nFor each field, provide the most relevant information mentioned during the call. If a field is not mentioned or not applicable, use null. Return the data as a JSON object."

        # Use OpenAI API for structured data extraction
        import openai
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            logging.warning("OPENAI_API_KEY not configured for structured data extraction")
            return agent_data  # Return agent data as fallback

        client = openai.OpenAI(api_key=openai_api_key)
        
        # Run the synchronous OpenAI call in a thread pool to make it async-compatible
        loop = asyncio.get_event_loop()
        response = await asyncio.wait_for(
            loop.run_in_executor(
                None,
                lambda: client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": f"Please extract structured data from this call and return it as JSON:\n\n{transcript_text}"}
                    ],
                    max_tokens=1000,
                    temperature=0.1,
                    response_format={"type": "json_object"}
                )
            ),
            timeout=timeout
        )

        # Parse JSON response
        import json
        extracted_data = json.loads(response.choices[0].message.content)
        
        # Merge with agent data (agent data takes precedence)
        # Convert agent analysis data to simple key-value format
        simple_agent_analysis = {}
        for key, value in agent_analysis_data.items():
            if isinstance(value, dict) and "value" in value:
                simple_agent_analysis[key] = value["value"]
            else:
                simple_agent_analysis[key] = str(value)
        
        final_data = {**extracted_data, **agent_data, **simple_agent_analysis}
        
        logging.info("EXTRACT_STRUCTURED_DATA_SUCCESS | extracted_count=%d | agent_data_count=%d | final_count=%d | data=%s", 
                   len(extracted_data), len(agent_data), len(final_data), final_data)
        
        return final_data

    except asyncio.TimeoutError:
        logging.warning("STRUCTURED_DATA_TIMEOUT | timeout=%ds", timeout)
        # Return combined agent data as fallback
        fallback_data = {}
        if agent and hasattr(agent, 'get_webhook_data'):
            fallback_data.update(agent.get_webhook_data())
        if agent and hasattr(agent, 'get_structured_data'):
            analysis_data = agent.get_structured_data()
            for key, value in analysis_data.items():
                if isinstance(value, dict) and "value" in value:
                    fallback_data[key] = value["value"]
                else:
                    fallback_data[key] = str(value)
        return fallback_data
    except Exception as e:
        logging.warning("STRUCTURED_DATA_ERROR | error=%s", str(e))
        # Return combined agent data as fallback
        fallback_data = {}
        if agent and hasattr(agent, 'get_webhook_data'):
            fallback_data.update(agent.get_webhook_data())
        if agent and hasattr(agent, 'get_structured_data'):
            analysis_data = agent.get_structured_data()
            for key, value in analysis_data.items():
                if isinstance(value, dict) and "value" in value:
                    fallback_data[key] = value["value"]
                else:
                    fallback_data[key] = str(value)
        return fallback_data

async def load_analysis_fields(assistant_id: str) -> list:
    """Load analysis fields configuration for an assistant"""
    try:
        logging.info("LOAD_ANALYSIS_FIELDS_START | assistant_id=%s", assistant_id)
        
        if not create_client:
            logging.warning("LOAD_ANALYSIS_FIELDS_FAILED | reason=no_client")
            return []

        supabase_url = os.getenv("SUPABASE_URL", "").strip()
        supabase_key = (
            os.getenv("SUPABASE_SERVICE_ROLE", "").strip()
            or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        )

        if not supabase_url or not supabase_key:
            logging.warning("LOAD_ANALYSIS_FIELDS_FAILED | reason=no_credentials")
            return []

        sb: Client = create_client(supabase_url, supabase_key)

        # Get structured data fields configuration
        logging.info("LOAD_ANALYSIS_FIELDS_QUERY | assistant_id=%s", assistant_id)
        result = sb.table("assistant").select("structured_data_fields").eq("id", assistant_id).execute()
        
        logging.info("LOAD_ANALYSIS_FIELDS_RESULT | assistant_id=%s | result_data=%s", assistant_id, result.data)
        
        if result.data and len(result.data) > 0:
            fields = result.data[0].get("structured_data_fields", [])
            logging.info("ANALYSIS_FIELDS_RETRIEVED | assistant_id=%s | fields_count=%d | fields=%s", assistant_id, len(fields), fields)
            return fields if isinstance(fields, list) else []
        
        logging.warning("ANALYSIS_FIELDS_NOT_FOUND | assistant_id=%s", assistant_id)
        return []

    except Exception as e:
        logging.warning("ANALYSIS_FIELDS_LOAD_ERROR | assistant_id=%s | error=%s", assistant_id, str(e))
        return []

async def save_call_history_to_supabase(
    call_id: str,
    assistant_id: str,
    called_did: str,
    start_time: datetime.datetime,
    end_time: datetime.datetime,
    session_history: list,
    participant_identity: str = None,
    recording_sid: str = None,
    call_sid: str = None,
    agent = None
) -> bool:
    """Save call history to Supabase with enhanced status detection"""
    try:
        if not create_client:
            logging.warning("Supabase client not available, skipping call history save")
            return False

        supabase_url = os.getenv("SUPABASE_URL", "").strip()
        supabase_key = (
            os.getenv("SUPABASE_SERVICE_ROLE", "").strip()
            or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        )

        if not supabase_url or not supabase_key:
            logging.warning("Supabase credentials not configured, skipping call history save")
            return False

        sb: Client = create_client(supabase_url, supabase_key)

        transcription = []
        for item in session_history:
            if isinstance(item, dict) and "role" in item and "content" in item:
                content = item["content"]
                # Handle different content formats
                if isinstance(content, list):
                    # If content is a list, join the elements and filter out empty strings
                    content_parts = []
                    for c in content:
                        if c and str(c).strip():
                            content_parts.append(str(c).strip())
                    content = " ".join(content_parts)
                elif not isinstance(content, str):
                    content = str(content)
                
                # Only add non-empty content
                if content and content.strip():
                    transcription.append({
                        "role": item["role"],
                        "content": content.strip()
                    })

        logging.info("TRANSCRIPTION_PREPARED | items_count=%d | transcription_entries=%d",
                     len(session_history), len(transcription))

        call_duration = int((end_time - start_time).total_seconds())
        call_status = determine_call_status(call_duration, transcription)

        # Process analysis data if agent is provided
        analysis_data = {}
        if agent:
            try:
                analysis_data = await process_call_analysis(
                    assistant_id=assistant_id,
                    transcription=transcription,
                    call_duration=call_duration,
                    agent=agent
                )
                logging.info("ANALYSIS_DATA_PROCESSED | call_id=%s | fields_count=%d", 
                           call_id, len(analysis_data.get('structured_data', {})))
            except Exception as e:
                logging.warning("ANALYSIS_PROCESSING_FAILED | call_id=%s | error=%s", call_id, str(e))

        call_data = {
            "call_id": call_id,
            "assistant_id": assistant_id,
            "phone_number": called_did,
            "participant_identity": participant_identity,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "call_duration": call_duration,
            "call_status": call_status,
            "transcription": transcription if transcription else [],  # Store empty array instead of None
            "recording_sid": recording_sid,
            "call_sid": call_sid,
            "created_at": datetime.datetime.now().isoformat()
        }

        # Add analysis data to call_data
        if analysis_data:
            call_data.update(analysis_data)

        result = sb.table("call_history").insert(call_data).execute()

        if result.data:
            logging.info("CALL_HISTORY_SAVED | call_id=%s | duration=%ds | status=%s | transcription_items=%d",
                         call_id, call_duration, call_status, len(transcription))
            if transcription:
                sample_transcript = transcription[0] if len(transcription) > 0 else {}
                logging.info("TRANSCRIPTION_SAMPLE | first_entry=%s", sample_transcript)
            return True
        else:
            logging.error("CALL_HISTORY_SAVE_FAILED | call_id=%s", call_id)
            return False

    except Exception as e:
        logging.exception("CALL_HISTORY_SAVE_ERROR | call_id=%s | error=%s", call_id, str(e))
        return False

def extract_called_did(room_name: str) -> str | None:
    """Find the first +E.164 sequence anywhere in the room name."""
    m = re.search(r'\+\d{7,}', room_name)
    return m.group(0) if m else None

async def fetch_assistant_n8n_config(assistant_id: str) -> dict | None:
    """Fetch assistant n8n configuration from database"""
    try:
        if not create_client:
            logging.warning("Supabase client not available, skipping n8n config fetch")
            return None

        supabase_url = os.getenv("SUPABASE_URL", "").strip()
        supabase_key = (
            os.getenv("SUPABASE_SERVICE_ROLE", "").strip()
            or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        )

        if not supabase_url or not supabase_key:
            logging.warning("Supabase credentials not configured, skipping n8n config fetch")
            return None

        sb: Client = create_client(supabase_url, supabase_key)

        # Fetch assistant n8n webhook configuration
        result = sb.table("assistant").select(
            "id, name, n8n_webhooks, n8n_webhook_url, n8n_webhook_fields"
        ).eq("id", assistant_id).execute()

        logging.info("🔍 N8N_CONFIG_FETCH | assistant_id=%s | result_count=%d", assistant_id, len(result.data) if result.data else 0)

        if result.data and len(result.data) > 0:
            assistant = result.data[0]
            logging.info("📋 N8N_ASSISTANT_DATA | id=%s | name=%s | webhooks_present=%s | webhook_url_present=%s | webhook_fields_present=%s", 
                       assistant.get("id"), assistant.get("name"), 
                       bool(assistant.get("n8n_webhooks")), 
                       bool(assistant.get("n8n_webhook_url")), 
                       bool(assistant.get("n8n_webhook_fields")))
            
            webhooks = assistant.get("n8n_webhooks", [])
            webhook_url = assistant.get("n8n_webhook_url")
            webhook_fields = assistant.get("n8n_webhook_fields", [])
            
            logging.info("🔗 N8N_WEBHOOK_DETAILS | webhooks_count=%d | webhook_url=%s | webhook_fields_count=%d", 
                       len(webhooks), webhook_url, len(webhook_fields))
            
            if webhook_fields:
                logging.info("📊 N8N_WEBHOOK_FIELDS | fields=%s", webhook_fields)
            
            if webhooks and len(webhooks) > 0:
                logging.info("✅ N8N_WEBHOOKS_FETCHED | assistant_id=%s | webhooks_count=%d", 
                           assistant_id, len(webhooks))
                return {
                    "assistant_id": assistant_id,
                    "assistant_name": assistant.get("name"),
                    "webhooks": webhooks,
                    "webhook_url": webhook_url,
                    "webhook_fields": webhook_fields
                }
            else:
                logging.info("⚠️ N8N_WEBHOOKS_EMPTY | assistant_id=%s", assistant_id)
                return None
        else:
            logging.warning("❌ N8N_CONFIG_NOT_FOUND | assistant_id=%s", assistant_id)
            return None

    except Exception as e:
        logging.error("N8N_CONFIG_FETCH_ERROR | assistant_id=%s | error=%s", assistant_id, str(e))
        return None

def generate_dynamic_collection_instructions(webhook_fields: list) -> str:
    """Generate dynamic LLM-driven data collection instructions based on webhook fields"""
    if not webhook_fields:
        return ""
    
    field_descriptions = []
    for field in webhook_fields:
        name = field.get("name", "")
        description = field.get("description", "")
        field_descriptions.append(f"- {name}: {description}")
    
    return f"""
🚨 DATA COLLECTION REQUIRED 🚨
You need to collect the following information during the call:
{chr(10).join(field_descriptions)}

ANALYSIS APPROACH:
For each field, determine the best collection method based on the description:
1. ASK the user directly (for personal info like name, email, company)
2. ANALYZE from conversation context (for derived info like mood, intent, summary)
3. OBSERVE from call behavior (for technical info like call quality, satisfaction)

COLLECTION RULES:
- Use collect_webhook_data(field_name, value, collection_method) to store any collected data
- You can collect data at any point during the conversation
- For analysis-based fields, observe the conversation and make intelligent inferences
- For user-provided fields, ask naturally in context
- Collection methods: "user_provided", "analyzed", "observed"

EXAMPLES:
- "company_name" → Ask: "What company do you work for?" → collect_webhook_data("company_name", "Acme Corp", "user_provided")
- "call_summary" → Analyze conversation → collect_webhook_data("call_summary", "Discussed pricing for enterprise plan", "analyzed")
- "caller_mood" → Observe tone → collect_webhook_data("caller_mood", "Frustrated initially, became positive", "observed")

You have full autonomy to decide how to collect each piece of data based on the field descriptions.
"""

def _classify_field(field: dict) -> str:
    """
    Classify how to collect a field:
      - "ask": data we must explicitly ask the caller (required=True OR looks like direct-contact info)
      - "infer": data we can infer/analyze from conversation
      - "observe": data about call behavior/quality/mood (if hinted in description/name)
    """
    name = (field.get("name") or "").strip().lower()
    desc = (field.get("description") or "").strip().lower()
    required = bool(field.get("required"))

    # Heuristics
    direct_keys = ["name", "email", "e-mail", "phone", "phone number", "mobile", "company", "org", "organization"]
    analysis_keys = ["outcome", "key information", "summary", "intent", "sentiment", "follow up", "follow-up", "priority"]
    observe_keys  = ["call quality", "mood", "tone", "latency", "noise", "silence"]

    def any_in(keys: list[str]) -> bool:
        return any(k in name or k in desc for k in keys)

    if required or any_in(direct_keys):
        return "ask"
    if any_in(observe_keys):
        return "observe"
    if any_in(analysis_keys):
        return "infer"
    # default: prefer inference for non-required fields
    return "infer"


def generate_analysis_field_collection_instructions(analysis_fields: list) -> str:
    """
    Build natural collection guidance from dynamic fields.
    - Never forces immediate interrogation
    - Clearly separates ASK vs INFER/OBSERVE
    - Emphasizes short confirmations so TTS never goes silent after tool calls
    """
    if not analysis_fields:
        return ""

    ask_fields, infer_fields, observe_fields = [], [], []
    for f in analysis_fields:
        mode = _classify_field(f)
        if mode == "ask":
            ask_fields.append(f)
        elif mode == "observe":
            observe_fields.append(f)
        else:
            infer_fields.append(f)

    def fmt(items: list[dict]) -> str:
        return "\n".join([f"- {i.get('name','')} — {i.get('description','')}" for i in items]) or "- (none)"

    return f"""
📊 ANALYSIS DATA (dynamic)
Collect the following during the conversation. Be natural—greet first, then weave questions in context.

ASK (politely, only when relevant or when booking/identification is needed):
{fmt(ask_fields)}

INFER (from what the caller says; do NOT ask unless they seem unclear):
{fmt(infer_fields)}

OBSERVE (from behavior/tone; never ask):
{fmt(observe_fields)}

RULES
- Use collect_analysis_data(name, value, field_type) silently whenever you have a value - this tool completes without requiring a response.
- Continue natural conversation flow - do NOT repeat yourself or say the same thing twice.
- Do NOT rapid-fire questions. Warmth > speed. Keep answers 1–2 sentences per turn.
- Only start the booking flow if the caller clearly indicates they want to book/schedule.
"""


def build_n8n_payload(assistant_config: dict, call_data: dict, session_history: list, webhook_configs: list, agent=None) -> dict:
    """Build JSON payload for n8n webhook with collected user details"""
    try:
        # Extract assistant info
        assistant_info = {
            "id": assistant_config.get("assistant_id"),
            "name": assistant_config.get("assistant_name"),
        }

        # Extract call info
        call_info = {
            "id": call_data.get("call_id"),
            "from": call_data.get("from_number"),
            "to": call_data.get("to_number"),
            "duration": call_data.get("call_duration"),
            "transcript_url": call_data.get("transcript_url"),
            "recording_url": call_data.get("recording_url"),
            "direction": call_data.get("call_direction"),
            "status": call_data.get("call_status"),
            "start_time": call_data.get("start_time"),
            "end_time": call_data.get("end_time"),
            "participant_identity": call_data.get("participant_identity")
        }

        # Get collected details from agent (LLM-collected data only)
        collected_details = {}
        if hasattr(agent, 'get_webhook_data'):
            webhook_data = agent.get_webhook_data()
            # Extract just the values for backward compatibility
            for field_name, field_data in webhook_data.items():
                if isinstance(field_data, dict) and "value" in field_data:
                    collected_details[field_name] = field_data["value"]
                else:
                    # Handle legacy format
                    collected_details[field_name] = str(field_data)

        # Build conversation summary
        conversation_summary = ""
        if session_history:
            user_messages = []
            for item in session_history:
                if isinstance(item, dict) and item.get("role") == "user" and item.get("content"):
                    content = item["content"]
                    if isinstance(content, list):
                        content = " ".join([str(c) for c in content if c])
                    user_messages.append(str(content).strip())
            
            if user_messages:
                conversation_summary = " ".join(user_messages)

        # Build the complete payload
        payload = {
            "assistant": assistant_info,
            "call": call_info,
            "webhook_configs": webhook_configs,
            "collected_details": collected_details,
            "timestamp": datetime.datetime.now().isoformat()
        }

        logging.info("N8N_PAYLOAD_BUILT | assistant_id=%s | call_id=%s | details_collected=%s", 
                   assistant_info.get("id"), call_info.get("id"), list(collected_details.keys()))
        
        return payload

    except Exception as e:
        logging.error("N8N_PAYLOAD_BUILD_ERROR | error=%s", str(e))
        return {}

async def send_n8n_webhook(webhook_url: str, payload: dict) -> dict | None:
    """Send data to n8n webhook and return response"""
    try:
        import aiohttp
        
        # Convert payload to JSON
        json_data = json.dumps(payload, default=str)
        
        logging.info("N8N_WEBHOOK_SENDING | url=%s | payload_size=%d", webhook_url, len(json_data))
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                webhook_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                response_text = await response.text()
                
                if response.status == 200:
                    logging.info("N8N_WEBHOOK_SUCCESS | status=%d | response_size=%d", 
                               response.status, len(response_text))
                    
                    # Try to parse response as JSON
                    try:
                        response_data = json.loads(response_text)
                        return response_data
                    except json.JSONDecodeError:
                        logging.warning("N8N_WEBHOOK_RESPONSE_NOT_JSON | response=%s", response_text)
                        return {"success": True, "message": response_text}
                else:
                    logging.error("N8N_WEBHOOK_ERROR | status=%d | response=%s", 
                                response.status, response_text)
                    return None

    except Exception as e:
        logging.error("N8N_WEBHOOK_SEND_ERROR | url=%s | error=%s", webhook_url, str(e))
        return None


def _parse_json_or_b64(raw: str) -> tuple[dict, str]:
    """Try JSON; if that fails, base64(JSON). Return (dict, source_kind)."""
    try:
        d = json.loads(raw)
        return (d if isinstance(d, dict) else {}), "json"
    except Exception:
        try:
            decoded = base64.b64decode(raw).decode()
            d = json.loads(decoded)
            return (d if isinstance(d, dict) else {}), "base64_json"
        except Exception:
            return {}, "invalid"

def _from_env_json(*env_keys: str) -> tuple[dict, str]:
    """First non-empty env var parsed as JSON. Return (dict, 'env:KEY:kind') or ({}, 'env:none')."""
    for k in env_keys:
        raw = os.getenv(k, "")
        if raw.strip():
            d, kind = _parse_json_or_b64(raw)
            return d, f"env:{k}:{kind}"
    return {}, "env:none"

def choose_from_sources(
    sources: Iterable[tuple[str, dict]],
    *paths: Tuple[str, ...],
    default: Optional[str] = None,
) -> tuple[Optional[str], str]:
    """First non-empty string across sources/paths. Return (value, 'label.path') or (default,'default')."""
    for label, d in sources:
        for path in paths:
            cur = d
            ok = True
            for k in path:
                if not isinstance(cur, dict) or k not in cur:
                    ok = False
                    break
                cur = cur[k]
            if ok and isinstance(cur, str) and cur.strip():
                return cur, f"{label}:" + ".".join(path)
    return default, "default"

def _http_get_json(url: str, timeout: int = 5) -> dict | None:
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "assistant-resolver/1.0"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            logging.warning("resolver GET failed (try %d/3): %s (%s)", attempt + 1, url, getattr(e, "reason", e))
            if attempt < 2:
                asyncio.run(asyncio.sleep(0.2 * (attempt + 1)))
    return None

# ===================== Campaign Outbound Helper =====================

def build_campaign_outbound_instructions(contact_name: str | None, campaign_prompt: str | None) -> str:
    name = (contact_name or "there").strip() or "there"
    script = (campaign_prompt or "").strip()
    return f"""
You are a concise, friendly **campaign dialer** (NOT the full assistant). Rules:
- Wait for the callee to speak first; if silence for ~2–3 seconds, give one polite greeting.
- Personalize by name when possible: use "{name}".
- Follow the campaign script briefly; keep turns short (1–2 sentences).
- If not interested / wrong number: apologize and end gracefully.
- Do NOT use any tools or calendars. No side effects.

If they don't speak: say once, "Hi {name}, "

CAMPAIGN SCRIPT (use naturally, don’t read verbatim if awkward):
{(script if script else "(no campaign script provided)")}
""".strip()

# ===================== Entrypoint (Single-Assistant) =====================

# Global counter for debugging
dispatch_count = 0

async def entrypoint(ctx: agents.JobContext):
    global dispatch_count
    dispatch_count += 1
    logging.info("🎯 DISPATCH_RECEIVED | count=%d | room=%s | job_metadata=%s", dispatch_count, ctx.room.name, ctx.job.metadata)
    logging.info("🚀 AGENT_ENTRYPOINT_START | room=%s | job_metadata=%s", ctx.room.name, ctx.job.metadata)
    
    # Log REST API configuration
    get_rest_config().log_config()

    # Initialize connection with auto-subscribe to audio only (crucial for SIP)
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    logging.info("✅ AGENT_CONNECTED | room=%s", ctx.room.name)

    # --- Check if this is an outbound call --------------------------
    phone_number = None
    assistant_id_from_job = None
    try:
        dial_info = json.loads(ctx.job.metadata)
        phone_number = dial_info.get("phone_number")
        assistant_id_from_job = dial_info.get("agentId")
        logging.info("OUTBOUND_CHECK | phone_number=%s | metadata=%s", phone_number, ctx.job.metadata)
    except Exception as e:
        logging.warning("Failed to parse job metadata for outbound call: %s", str(e))

    # --- Room / DID context -----------------------------------------
    room_name = getattr(ctx.room, "name", "") or ""
    prefix = os.getenv("DISPATCH_ROOM_PREFIX", "did-")
    called_did = extract_called_did(room_name) or (room_name[len(prefix):] if room_name.startswith(prefix) else None)
    logging.info("🎯 AGENT_TRIGGERED | room=%s | called_did=%s | room_type=%s | is_outbound=%s",
                 room_name, called_did, type(ctx.room).__name__, phone_number is not None)

    # --- Handle outbound calling (create SIP participant) -----------
    if phone_number is not None:
        logging.info("🔥 OUTBOUND_CALL_DETECTED | phone_number=%s", phone_number)
        try:
            # Get trunk ID from job metadata (passed by campaign execution engine)
            sip_trunk_id = None
            try:
                # Parse job metadata to get campaign info and outbound trunk ID
                job_metadata = json.loads(ctx.job.metadata) if isinstance(ctx.job.metadata, str) else ctx.job.metadata
                campaign_id = job_metadata.get('campaignId')
                assistant_id = job_metadata.get('agentId')
                sip_trunk_id = job_metadata.get('outbound_trunk_id')
                
                logging.info("🔍 JOB_METADATA | campaign_id=%s | assistant_id=%s | outbound_trunk_id=%s", campaign_id, assistant_id, sip_trunk_id)
                
                if not sip_trunk_id:
                    logging.error("❌ No outbound_trunk_id found in job metadata")
                    
            except Exception as metadata_error:
                logging.error("❌ Metadata parsing failed: %s", str(metadata_error))
            
            # Fallback to environment variable if metadata lookup failed
            if not sip_trunk_id:
                sip_trunk_id = os.getenv("SIP_TRUNK_ID")
                logging.info("🔄 FALLBACK_TO_ENV | sip_trunk_id=%s", sip_trunk_id)
            
            logging.info("🔍 SIP_TRUNK_ID_CHECK | sip_trunk_id=%s", sip_trunk_id)
            if not sip_trunk_id:
                logging.error("❌ SIP_TRUNK_ID not configured - cannot make outbound call")
                await ctx.api.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))
                return

            logging.info("📞 OUTBOUND_CALL_START | phone_number=%s | trunk_id=%s | room=%s", phone_number, sip_trunk_id, ctx.room.name)
            sip_request = api.CreateSIPParticipantRequest(
                room_name=ctx.room.name,
                sip_trunk_id=sip_trunk_id,
                sip_call_to=phone_number,
                participant_identity=phone_number,
                wait_until_answered=True,
            )
            logging.info("📞 SIP_REQUEST_CREATED | request=%s", sip_request)
            result = await ctx.api.sip.create_sip_participant(sip_request)
            logging.info("✅ OUTBOUND_CALL_CONNECTED | phone_number=%s | result=%s", phone_number, result)
        except api.TwirpError as e:
            logging.error("❌ OUTBOUND_CALL_FAILED | phone_number=%s | error=%s | sip_status=%s | metadata=%s",
                          phone_number, e.message, e.metadata.get('sip_status_code'), e.metadata)
            try:
                await ctx.api.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))
            except Exception as cleanup_error:
                logging.error("❌ ROOM_CLEANUP_FAILED | error=%s", str(cleanup_error))
            return
        except Exception as e:
            logging.error("❌ OUTBOUND_CALL_ERROR | phone_number=%s | error=%s | type=%s", phone_number, str(e), type(e).__name__)
            try:
                await ctx.api.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))
            except Exception as cleanup_error:
                logging.error("❌ ROOM_CLEANUP_FAILED | error=%s", str(cleanup_error))
            return
    else:
        logging.info("📞 INBOUND_CALL_DETECTED | phone_number=None")

    # Wait for participant with timeout (crucial for SIP participants)
    try:
        participant = await asyncio.wait_for(
            ctx.wait_for_participant(),
            timeout=35.0  # PSTN can ring long, be generous
        )
        logging.info("PARTICIPANT_CONNECTED | identity=%s | type=%s | metadata=%s",
                     participant.identity, type(participant).__name__, participant.metadata)
        if hasattr(participant, 'attributes') and participant.attributes:
            logging.info("SIP_PARTICIPANT_ATTRIBUTES | attributes=%s", participant.attributes)
    except asyncio.TimeoutError:
        logging.error("PARTICIPANT_CONNECTION_TIMEOUT | room=%s", room_name)
        try:
            await ctx.api.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))
        except Exception as cleanup_error:
            logging.error("❌ ROOM_CLEANUP_FAILED | error=%s", str(cleanup_error))
        return

    # --- Campaign metadata extraction (room metadata) ----------------
    campaign_prompt = ""
    contact_info = {}
    contact_name = None
    if hasattr(ctx.room, 'metadata') and ctx.room.metadata:
        try:
            room_meta = json.loads(ctx.room.metadata) if isinstance(ctx.room.metadata, str) else ctx.room.metadata
            campaign_prompt = room_meta.get('campaignPrompt', '') or ''
            contact_info = room_meta.get('contactInfo', {}) or {}
            contact_name = contact_info.get('name') or room_meta.get('contactName')
            logging.info("CAMPAIGN_METADATA | has_prompt=%s | contact_name=%s | contact_phone=%s | room_meta_keys=%s",
                         bool(campaign_prompt),
                         contact_name or 'Unknown',
                         contact_info.get('phone', 'Unknown'),
                         list(room_meta.keys()) if room_meta else [])
        except Exception as e:
            logging.warning("Failed to parse room metadata for campaign info: %s", str(e))
    else:
        logging.info("NO_ROOM_METADATA | has_metadata_attr=%s | metadata_exists=%s",
                     hasattr(ctx.room, 'metadata'), bool(getattr(ctx.room, 'metadata', None)))

    # --- Call tracking setup ----------------------------------------
    start_time = datetime.datetime.now()
    call_id = str(uuid.uuid4())
    logging.info("CALL_START | call_id=%s | start_time=%s", call_id, start_time.isoformat())

    # --- Recording setup (Twilio SID discovery) ---------------------
    recording_sid = None
    call_sid = None
    try:
        logging.info("PARTICIPANT_DEBUG | participant_type=%s | has_attributes=%s",
                     type(participant).__name__, hasattr(participant, 'attributes'))
        if hasattr(participant, 'attributes') and participant.attributes:
            logging.info("PARTICIPANT_ATTRIBUTES_DEBUG | attributes=%s", participant.attributes)
            if hasattr(participant.attributes, 'get'):
                call_sid = participant.attributes.get('sip.twilio.callSid')
                if call_sid:
                    logging.info("CALL_SID_FROM_PARTICIPANT_ATTRIBUTES | call_sid=%s", call_sid)
            if not call_sid and hasattr(participant.attributes, 'sip'):
                sip_attrs = participant.attributes.sip
                if hasattr(sip_attrs, 'twilio') and hasattr(sip_attrs.twilio, 'callSid'):
                    call_sid = sip_attrs.twilio.callSid
                    if call_sid:
                        logging.info("CALL_SID_FROM_SIP_ATTRIBUTES | call_sid=%s", call_sid)
        else:
            logging.info("NO_PARTICIPANT_ATTRIBUTES | has_attributes=%s", hasattr(participant, 'attributes'))
    except Exception as e:
        logging.warning("Failed to get call_sid from participant attributes: %s", str(e))

    if not call_sid and hasattr(ctx.room, 'metadata') and ctx.room.metadata:
        try:
            room_meta = json.loads(ctx.room.metadata) if isinstance(ctx.room.metadata, str) else ctx.room.metadata
            call_sid = room_meta.get('call_sid') or room_meta.get('CallSid') or room_meta.get('provider_id')
            if call_sid:
                logging.info("CALL_SID_FROM_ROOM_METADATA | call_sid=%s", call_sid)
        except Exception as e:
            logging.warning("Failed to parse room metadata for call_sid: %s", str(e))

    if not call_sid and hasattr(participant, 'metadata') and participant.metadata:
        try:
            participant_meta = json.loads(participant.metadata) if isinstance(participant.metadata, str) else participant.metadata
            call_sid = participant_meta.get('call_sid') or participant_meta.get('CallSid') or participant_meta.get('provider_id')
            if call_sid:
                logging.info("CALL_SID_FROM_PARTICIPANT_METADATA | call_sid=%s", call_sid)
        except Exception as e:
            logging.warning("Failed to parse participant metadata for call_sid: %s", str(e))

    if call_sid and recording_service.is_enabled():
        try:
            logging.info("STARTING_RECORDING_IMMEDIATELY | call_sid=%s", call_sid)
            recording_result = await recording_service.start_recording(
                call_sid=call_sid,
                recording_options={
                    "RecordingChannels": "dual",
                    "RecordingTrack": "both",
                    "PlayBeep": True,
                    "Trim": "do-not-trim",
                    "Transcribe": True,
                }
            )
            if recording_result:
                recording_sid = recording_result.get("sid")
                logging.info("RECORDING_STARTED | call_sid=%s | recording_sid=%s", call_sid, recording_sid)
            else:
                logging.warning("RECORDING_START_FAILED | call_sid=%s", call_sid)
        except Exception as e:
            logging.exception("RECORDING_ERROR | call_sid=%s | error=%s", call_sid, str(e))
    else:
        if not call_sid:
            logging.warning("RECORDING_SKIPPED | no_call_sid_found")
        if not recording_service.is_enabled():
            logging.warning("RECORDING_SKIPPED | service_disabled")

    # ----------------------------------------------------------------
    # From this point, BRANCH:
    #   - OUTBOUND (campaign dialer): NO Assistant resolution, NO calendar; use lightweight Agent.
    #   - INBOUND: resolve Assistant & calendar and use services.assistant.Assistant.
    # ----------------------------------------------------------------

    # --- OpenAI + VAD configuration (shared) ------------------------
    openai_api_key = os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_API")
    if not openai_api_key:
        logging.warning("OPENAI_API_KEY/OPENAI_API not set; OpenAI plugins will fail to auth.")

    # Fail fast if provider requires a key that is missing
    if (assistant_id_from_job is None) and (not openai_api_key):
        logging.error("OPENAI_API_KEY missing for inbound path; aborting session to avoid silent failures.")
        try:
            await ctx.api.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))
        except Exception:
            pass
        return

    stt_model = os.getenv("OPENAI_STT_MODEL", "gpt-4o-transcribe")
    tts_model = os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
    tts_voice = os.getenv("OPENAI_TTS_VOICE", "alloy")

    # VAD
    vad = ctx.proc.userdata.get("vad") if hasattr(ctx, "proc") else None
    if vad is None:
        vad = silero.VAD.load()

    # ===================== OUTBOUND PATH ============================
    if phone_number is not None:
        # Build campaign-only instructions (no assistant, no calendar)
        outbound_instructions = build_campaign_outbound_instructions(
            contact_name=contact_name,
            campaign_prompt=campaign_prompt
        )
        logging.info("PROMPT_TRACE_FINAL (OUTBOUND) | sha256=%s | len=%d | preview=%s",
                     sha256_text(outbound_instructions), len(outbound_instructions), preview(outbound_instructions))

        # LLM config for outbound: use env/defaults, not per-assistant
        llm_model = os.getenv("OPENAI_LLM_MODEL", "gpt-4o-mini")
        temperature = float(os.getenv("OPENAI_TEMPERATURE", "0.3"))
        max_tokens = int(os.getenv("OPENAI_MAX_TOKENS", "250"))

        # Voice config for outbound: use env/defaults
        outbound_voice_provider = os.getenv("VOICE_PROVIDER", "OpenAI")
        outbound_voice_model = os.getenv("VOICE_MODEL", tts_model)
        outbound_voice_name = os.getenv("VOICE_NAME", tts_voice)
        
        # Configure TTS for outbound
        if outbound_voice_provider == "ElevenLabs":
            elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY")
            if elevenlabs_api_key and ELEVENLABS_AVAILABLE:
                try:
                    outbound_tts = lk_elevenlabs.TTS(
                        voice_id=outbound_voice_name,
                        api_key=elevenlabs_api_key,
                        model=outbound_voice_model,
                        streaming_latency=int(os.getenv("VOICE_OPTIMIZE_STREAMING", "2")),
                        inactivity_timeout=300,  # 5 minutes timeout
                        auto_mode=True  # Reduces latency and improves stability
                    )
                    logging.info("OUTBOUND_ELEVENLABS_TTS_CONFIGURED | voice_id=%s", outbound_voice_name)
                except Exception as e:
                    logging.error("ELEVENLABS_TTS_ERROR | error=%s | falling back to OpenAI TTS for outbound", str(e))
                    # Map ElevenLabs voice to OpenAI voice for fallback
                    openai_voice = "alloy"  # Default OpenAI voice
                    openai_tts_model = "tts-1" if outbound_voice_model.startswith("eleven_") else outbound_voice_model
                    outbound_tts = lk_openai.TTS(model=openai_tts_model, voice=openai_voice, api_key=openai_api_key)
            else:
                if not ELEVENLABS_AVAILABLE:
                    logging.warning("ELEVENLABS_NOT_AVAILABLE | falling back to OpenAI TTS for outbound")
                else:
                    logging.warning("ELEVENLABS_API_KEY_NOT_SET | falling back to OpenAI TTS for outbound")
                # Map ElevenLabs voice to OpenAI voice for fallback
                openai_voice = "alloy"  # Default OpenAI voice
                openai_tts_model = "tts-1" if outbound_voice_model.startswith("eleven_") else outbound_voice_model
                outbound_tts = lk_openai.TTS(model=openai_tts_model, voice=openai_voice, api_key=openai_api_key)
        else:
            outbound_tts = lk_openai.TTS(model=outbound_voice_model, voice=outbound_voice_name, api_key=openai_api_key)
            logging.info("OUTBOUND_OPENAI_TTS_CONFIGURED | model=%s | voice=%s", outbound_voice_model, outbound_voice_name)

        # Configure LLM for outbound - Check if we should use REST API
        if is_rest_model(llm_model):
            logging.info("OUTBOUND_REST_LLM_CONFIGURED | model=%s | using REST API", llm_model)
            outbound_llm = create_rest_llm(
                model=llm_model,
                api_key=openai_api_key,
                base_url=get_rest_config().rest_api_base_url
            )
        else:
            outbound_llm = lk_openai.LLM(
                model=llm_model,
                api_key=openai_api_key,
                temperature=temperature,
                tool_choice="none",  # outbound
            )
            logging.info("OUTBOUND_OPENAI_LLM_CONFIGURED | model=%s | temperature=%s", llm_model, temperature)

        session = AgentSession(
            turn_detection="vad",
            vad=vad,
            stt=lk_openai.STT(model=stt_model, api_key=openai_api_key),
            llm=outbound_llm,
            tts=outbound_tts,
        )

        logging.info("STARTING_SESSION (OUTBOUND) | instructions_length=%d | has_calendar=%s",
                     len(outbound_instructions), False)

        agent_outbound = Agent(instructions=outbound_instructions)
        await session.start(
            room=ctx.room,
            agent=agent_outbound,
        )
        logging.info("SESSION_STARTED (OUTBOUND) | session_active=%s", session is not None)

        async def save_call_on_shutdown_outbound():
            end_time = datetime.datetime.now()
            logging.info("CALL_END | call_id=%s | end_time=%s", call_id, end_time.isoformat())
            session_history = []
            try:
                if hasattr(session, 'history') and session.history:
                    history_dict = session.history.to_dict()
                    if "items" in history_dict:
                        session_history = history_dict["items"]
                        logging.info("SESSION_HISTORY_RETRIEVED | items_count=%d", len(session_history))
                    else:
                        logging.warning("SESSION_HISTORY_NO_ITEMS | history_dict_keys=%s",
                                        list(history_dict.keys()) if history_dict else "None")
                else:
                    logging.warning("SESSION_HISTORY_NOT_AVAILABLE | has_history_attr=%s | history_exists=%s",
                                    hasattr(session, 'history'), bool(getattr(session, 'history', None)))
            except Exception as e:
                logging.warning("Failed to get session history: %s", str(e))

            # Extract campaign_id from job metadata
            campaign_id = None
            contact_name = "Unknown"
            try:
                dial_info = json.loads(ctx.job.metadata)
                campaign_id = dial_info.get("campaignId")
                contact_name = dial_info.get("contactName", "Unknown")
                logging.info("CAMPAIGN_METADATA | campaign_id=%s | contact_name=%s", campaign_id, contact_name)
            except Exception as e:
                logging.warning("Failed to parse campaign metadata: %s", str(e))

            # Save to campaign_calls table if we have campaign_id
            if campaign_id and call_sid:
                await save_campaign_call_to_supabase(
                    call_sid=call_sid,
                    campaign_id=campaign_id,
                    phone_number=phone_number or "unknown",
                    contact_name=contact_name,
                    start_time=start_time,
                    end_time=end_time,
                    session_history=session_history,
                    participant_identity=participant.identity if participant else None,
                    recording_sid=recording_sid,
                    assistant_id=assistant_id_from_job
                )
            else:
                logging.warning("CAMPAIGN_CALL_SKIPPED | campaign_id=%s | call_sid=%s", campaign_id, call_sid)

            # Also save to call_history for general tracking
            assistant_id = assistant_id_from_job or "campaign"
            await save_call_history_to_supabase(
                call_id=call_id,
                assistant_id=assistant_id,
                called_did=called_did or "unknown",
                start_time=start_time,
                end_time=end_time,
                session_history=session_history,
                participant_identity=participant.identity if participant else None,
                recording_sid=recording_sid,
                call_sid=call_sid,
                agent=agent
            )

            # Send n8n webhook if assistant has n8n config
            if assistant_id and assistant_id != "campaign":
                try:
                    # Fetch assistant n8n configuration
                    n8n_config = await fetch_assistant_n8n_config(assistant_id)
                    if n8n_config:
                        # Build call data for n8n payload
                        call_data = {
                            "call_id": call_id,
                            "from_number": phone_number or "unknown",
                            "to_number": called_did or "unknown",
                            "call_duration": int((end_time - start_time).total_seconds()),
                            "transcript_url": None,  # Can be added if available
                            "recording_url": None,   # Can be added if available
                            "call_direction": "outbound",
                            "call_status": "completed",
                            "start_time": start_time.isoformat(),
                            "end_time": end_time.isoformat(),
                            "participant_identity": participant.identity if participant else None
                        }

                        # Build and send n8n payload
                        webhook_configs = n8n_config.get("webhooks", [])
                        payload = build_n8n_payload(n8n_config, call_data, session_history, webhook_configs, agent)
                        if payload and webhook_configs:
                            # Send to each configured webhook
                            for webhook_config in webhook_configs:
                                webhook_url = webhook_config.get("param")  # This should contain the actual URL
                                if webhook_url:
                                    response = await send_n8n_webhook(webhook_url, payload)
                                    
                                    if response:
                                        logging.info("N8N_WEBHOOK_COMPLETED | assistant_id=%s | call_id=%s | webhook_name=%s", 
                                                   assistant_id, call_id, webhook_config.get("name", "Unknown"))
                                    else:
                                        logging.warning("N8N_WEBHOOK_FAILED | assistant_id=%s | call_id=%s | webhook_name=%s", 
                                                      assistant_id, call_id, webhook_config.get("name", "Unknown"))
                    else:
                        logging.info("N8N_CONFIG_NOT_FOUND | assistant_id=%s | skipping webhook", assistant_id)
                except Exception as e:
                    logging.error("N8N_WEBHOOK_ERROR | assistant_id=%s | call_id=%s | error=%s", 
                                 assistant_id, call_id, str(e))

        ctx.add_shutdown_callback(save_call_on_shutdown_outbound)

        logging.info("STARTING_SESSION_RUN (OUTBOUND) | user_input=empty")
        await session.run(user_input="")
        logging.info("SESSION_RUN_COMPLETED (OUTBOUND)")
        return  # ✅ stop here; do not fall through to inbound logic

    # ===================== INBOUND PATH =============================
    # --- Resolve assistantId (INBOUND ONLY) -------------------------
    resolver_meta: dict = {}
    resolver_label: str = "none"

    p_meta, p_kind = ({}, "none")
    if participant.metadata:
        p_meta, p_kind = _parse_json_or_b64(participant.metadata)

    r_meta_raw = getattr(ctx.room, "metadata", "") or ""
    r_meta, r_kind = ({}, "none")
    if r_meta_raw:
        r_meta, r_kind = _parse_json_or_b64(r_meta_raw)

    id_sources: list[tuple[str, dict]] = [
        (f"participant.{p_kind}", p_meta),
        (f"room.{r_kind}", r_meta),
    ]

    assistant_id, id_src = choose_from_sources(
        id_sources,
        ("assistantId",),
        ("assistant", "id"),
        default=None,
    )

    backend_url = os.getenv("BACKEND_URL", "http://localhost:4000").rstrip("/")
    resolver_path = os.getenv("ASSISTANT_RESOLVER_PATH", "/api/v1/livekit/assistant").lstrip("/")
    base_resolver = f"{backend_url}/{resolver_path}".rstrip("/")

    if not assistant_id and called_did:
        q = urllib.parse.urlencode({"number": called_did})
        for path in ("by-number", ""):
            url = f"{base_resolver}/{path}?{q}" if path else f"{base_resolver}?{q}"
            data = _http_get_json(url)
            if data and data.get("success") and isinstance(data.get("assistant"), dict):
                assistant_id = data["assistant"].get("id") or None
                if assistant_id:
                    resolver_meta = {
                        "assistant": {
                            "id": assistant_id,
                            "name": data["assistant"].get("name"),
                            "prompt": data["assistant"].get("prompt"),
                            "firstMessage": data["assistant"].get("firstMessage"),
                        },
                        "cal_api_key": data.get("cal_api_key"),
                        "cal_event_type_id": (
                            str(data.get("cal_event_type_id"))
                            if data.get("cal_event_type_id") is not None else None
                        ),
                        "cal_timezone": data.get("cal_timezone"),
                    }
                    resolver_label = "resolver.by_number"
                    id_src = f"{resolver_label}.assistant.id"
                    break

    if assistant_id:
        supabase_url = os.getenv("SUPABASE_URL", "").strip()
        supabase_key = (
            os.getenv("SUPABASE_SERVICE_ROLE", "").strip()
            or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        )
        logging.info("SUPABASE_CHECK | url_present=%s | key_present=%s | create_client=%s",
                     bool(supabase_url), bool(supabase_key), create_client is not None)
        used_supabase = False
        if create_client and supabase_url and supabase_key:
            try:
                sb: Client = create_client(supabase_url, supabase_key)  # type: ignore
                resp = sb.table("assistant").select(
                    "id, name, prompt, first_message, calendar, cal_api_key, cal_event_type_id, cal_event_type_slug, cal_timezone, llm_provider_setting, llm_model_setting, temperature_setting, max_token_setting, knowledge_base_id, "
                    "voice_provider_setting, voice_model_setting, voice_name_setting, background_sound_setting, input_min_characters, voice_stability, voice_clarity_similarity, voice_speed, "
                    "use_speaker_boost, voice_optimize_streaming_latency, voice_seconds, voice_backoff_seconds, silence_timeout, maximum_duration, smart_endpointing, "
                    "n8n_webhook_url, n8n_webhook_fields, groq_model, groq_temperature, groq_max_tokens, cerebras_model, cerebras_temperature, cerebras_max_tokens"
                ).eq("id", assistant_id).single().execute()
                row = resp.data
                print("🔍 ASSISTANT_DATABASE_FETCH | assistant_id=%s | row_keys=%s", assistant_id, list(row.keys()) if row else "None")
                logging.info("🔍 ASSISTANT_DATABASE_FETCH | assistant_id=%s | row_keys=%s", assistant_id, list(row.keys()) if row else "None")
                
                # Log all assistant configuration details
                if row:
                    logging.info("📋 ASSISTANT_BASIC_INFO | id=%s | name=%s | prompt_length=%d | first_message_length=%d", 
                               row.get("id"), row.get("name"), len(row.get("prompt", "")), len(row.get("first_message", "")))
                    
                    logging.info("🤖 ASSISTANT_LLM_CONFIG | provider=%s | model=%s | temperature=%s | max_tokens=%s", 
                               row.get("llm_provider_setting"), row.get("llm_model_setting"), row.get("temperature_setting"), row.get("max_token_setting"))
                    
                    logging.info("🎤 ASSISTANT_VOICE_CONFIG | provider=%s | model=%s | voice=%s | speed=%s | stability=%s", 
                               row.get("voice_provider_setting"), row.get("voice_model_setting"), row.get("voice_name_setting"), 
                               row.get("voice_speed"), row.get("voice_stability"))
                    
                    logging.info("📅 ASSISTANT_CALENDAR_CONFIG | calendar_id=%s | cal_api_key_present=%s | event_type_id=%s | timezone=%s", 
                               row.get("calendar"), bool(row.get("cal_api_key")), row.get("cal_event_type_id"), row.get("cal_timezone"))
                    
                    logging.info("🔗 ASSISTANT_N8N_CONFIG | webhook_url_present=%s | webhook_fields_count=%d", 
                               bool(row.get("n8n_webhook_url")), len(row.get("n8n_webhook_fields", [])))
                    
                    if row.get("n8n_webhook_fields"):
                        logging.info("📊 ASSISTANT_N8N_FIELDS | fields=%s", row.get("n8n_webhook_fields"))
                    
                    logging.info("📚 ASSISTANT_KNOWLEDGE_BASE | knowledge_base_id=%s", row.get("knowledge_base_id"))
                    
                    logging.info("⚙️ ASSISTANT_ADVANCED_CONFIG | silence_timeout=%s | max_duration=%s | smart_endpointing=%s", 
                               row.get("silence_timeout"), row.get("maximum_duration"), row.get("smart_endpointing"))
                else:
                    logging.error("❌ ASSISTANT_NOT_FOUND | assistant_id=%s", assistant_id)
                if row:
                    resolver_meta = {
                        "assistant": {
                            "id": row.get("id") or assistant_id,
                            "name": row.get("name") or "Assistant",
                            "prompt": row.get("prompt") or "",
                            "firstMessage": row.get("first_message") or "",
                            "llm_provider": row.get("llm_provider_setting") or "OpenAI",
                            "llm_model": row.get("llm_model_setting") or "gpt-4o-mini",
                            "temperature": row.get("temperature_setting") or 0.1,
                            "max_tokens": row.get("max_token_setting") or 250,
                        },
                        "voice": {
                            "provider": row.get("voice_provider_setting") or "OpenAI",
                            "model": row.get("voice_model_setting") or "gpt-4o-mini-tts",
                            "voice": row.get("voice_name_setting") or "alloy",
                            "background_sound": row.get("background_sound_setting") or "none",
                            "input_min_characters": row.get("input_min_characters") or 10,
                            "stability": row.get("voice_stability") or 0.71,
                            "clarity": row.get("voice_clarity_similarity") or 0.75,
                            "speed": row.get("voice_speed") or 1.0,
                            "use_speaker_boost": row.get("use_speaker_boost") or True,
                            "optimize_streaming": row.get("voice_optimize_streaming_latency") or 2,
                            "voice_seconds": row.get("voice_seconds") or 0.2,
                            "backoff_seconds": row.get("voice_backoff_seconds") or 1,
                            "silence_timeout": row.get("silence_timeout") or 30,
                            "max_duration": row.get("maximum_duration") or 1800,
                            "smart_endpointing": row.get("smart_endpointing") or True,
                        },
                        "calendar_integration_id": row.get("calendar"),
                        "knowledge_base_id": row.get("knowledge_base_id"),
                        # N8N webhook configuration
                        "n8n_webhook_url": row.get("n8n_webhook_url"),
                        "n8n_webhook_fields": row.get("n8n_webhook_fields", []),
                        # Calendar credentials (stored directly in assistant)
                        "cal_api_key": row.get("cal_api_key"),
                        "cal_event_type_id": row.get("cal_event_type_id"),
                        "cal_event_type_slug": row.get("cal_event_type_slug"),
                        "cal_timezone": row.get("cal_timezone") or "UTC",
                    }
                    resolver_label = "resolver.supabase"
                    used_supabase = True
            except Exception:
                logging.exception("SUPABASE_ERROR | assistant fetch failed")

        if not used_supabase:
            url = f"{base_resolver}/{assistant_id}"
            data = _http_get_json(url)
            if data and data.get("success") and isinstance(data.get("assistant"), dict):
                a = data["assistant"]
                resolver_meta = {
                    "assistant": {
                        "id": a.get("id") or assistant_id,
                        "name": a.get("name"),
                        "prompt": a.get("prompt"),
                        "firstMessage": a.get("firstMessage"),
                        "llm_provider": a.get("llm_provider_setting") or "OpenAI",
                        "llm_model": a.get("llm_model_setting") or "gpt-4o-mini",
                        "temperature": a.get("temperature_setting") or 0.1,
                        "max_tokens": a.get("max_token_setting") or 250,
                    },
                    "voice": {
                        "provider": a.get("voice_provider_setting") or "OpenAI",
                        "model": a.get("voice_model_setting") or "gpt-4o-mini-tts",
                        "voice": a.get("voice_name_setting") or "alloy",
                        "background_sound": a.get("background_sound_setting") or "none",
                        "input_min_characters": a.get("input_min_characters") or 10,
                        "stability": a.get("voice_stability") or 0.71,
                        "clarity": a.get("voice_clarity_similarity") or 0.75,
                        "speed": a.get("voice_speed") or 1.0,
                        "use_speaker_boost": a.get("use_speaker_boost") or True,
                        "optimize_streaming": a.get("voice_optimize_streaming_latency") or 2,
                        "voice_seconds": a.get("voice_seconds") or 0.2,
                        "backoff_seconds": a.get("voice_backoff_seconds") or 1,
                        "silence_timeout": a.get("silence_timeout") or 30,
                        "max_duration": a.get("maximum_duration") or 1800,
                        "smart_endpointing": a.get("smart_endpointing") or True,
                    },
                    "calendar_integration_id": data.get("calendar"),
                    "cal_api_key": data.get("cal_api_key"),
                    "cal_event_type_id": data.get("cal_event_type_id"),
                    "cal_event_type_slug": data.get("cal_event_type_slug"),
                    "cal_timezone": data.get("cal_timezone") or "UTC",
                }
                resolver_label = "resolver.id_http"
            else:
                resolver_label = "resolver.error"

    logging.info("ASSISTANT_ID | value=%s | source=%s | resolver=%s", assistant_id or "<none>", id_src, resolver_label)

    if not assistant_id or not resolver_meta.get("assistant"):
        logging.error("NO_ASSISTANT_FOUND | assistant_id=%s | resolver_meta_present=%s",
                      assistant_id or "<none>", bool(resolver_meta.get("assistant")))
        logging.warning("Using minimal defaults - assistant data not found")
        resolver_meta = {
            "assistant": {
                "id": assistant_id or "unknown",
                "name": "Assistant",
                "prompt": "You are a helpful voice assistant.",
                "firstMessage": "",
                "llm_provider": "OpenAI",
                "llm_model": "gpt-4o-mini",
                "temperature": 0.1,
                "max_tokens": 250,
            },
            "voice": {
                "provider": "OpenAI",
                "model": "gpt-4o-mini-tts",
                "voice": "alloy",
                "background_sound": "none",
                "input_min_characters": 10,
                "stability": 0.71,
                "clarity": 0.75,
                "speed": 1.0,
                "use_speaker_boost": True,
                "optimize_streaming": 2,
                "voice_seconds": 0.2,
                "backoff_seconds": 1,
                "silence_timeout": 30,
                "max_duration": 1800,
                "smart_endpointing": True,
            }
        }

    # --- Build INBOUND instructions (assistant + optional campaign info) ----
    assistant_name = (resolver_meta.get("assistant") or {}).get("name") or "Assistant"
    base_prompt = (resolver_meta.get("assistant") or {}).get("prompt") or "You are a helpful voice assistant."
    first_message = (resolver_meta.get("assistant") or {}).get("firstMessage") or ""

    if campaign_prompt and contact_info:
        enhanced_prompt = campaign_prompt.replace('{name}', contact_info.get('name', 'there'))
        enhanced_prompt = enhanced_prompt.replace('{email}', contact_info.get('email', 'your email'))
        enhanced_prompt = enhanced_prompt.replace('{phone}', contact_info.get('phone', 'your phone number'))
        prompt = f"""{base_prompt}

CAMPAIGN CONTEXT:
You are handling an inbound call. If relevant, follow this script:
{enhanced_prompt}

CONTACT INFORMATION:
- Name: {contact_info.get('name', 'Unknown')}
- Email: {contact_info.get('email', 'Not provided')}
- Phone: {contact_info.get('phone', 'Not provided')}
"""
        logging.info("ENHANCED_PROMPT | campaign_prompt_length=%d | contact_name=%s | enhanced_prompt=%s",
                     len(enhanced_prompt), contact_info.get('name', 'Unknown'), enhanced_prompt)
    else:
        logging.info("NO_CAMPAIGN_CONTEXT | campaign_prompt=%s | contact_info=%s", campaign_prompt, contact_info)
        prompt = base_prompt

    # Check N8N webhook configuration for data collection requirements
    n8n_config = None
    print(f"DEBUG: N8N_CONFIG_CHECK | webhook_url={resolver_meta.get('n8n_webhook_url') if resolver_meta else None} | webhook_fields={resolver_meta.get('n8n_webhook_fields') if resolver_meta else None}")
    logging.info("N8N_CONFIG_CHECK | webhook_url=%s | webhook_fields=%s", 
                resolver_meta.get("n8n_webhook_url") if resolver_meta else None,
                resolver_meta.get("n8n_webhook_fields") if resolver_meta else None)
    
    if resolver_meta and resolver_meta.get("n8n_webhook_url") and resolver_meta.get("n8n_webhook_fields"):
        webhook_url = resolver_meta.get("n8n_webhook_url")
        webhook_fields = resolver_meta.get("n8n_webhook_fields", [])
        if webhook_url and webhook_fields and len(webhook_fields) > 0:
            n8n_config = {
                "assistant_id": assistant_id,
                "assistant_name": resolver_meta.get("assistant", {}).get("name", "Assistant"),
                "webhook_url": webhook_url,
                "webhook_fields": webhook_fields
            }
            print(f"DEBUG: N8N_CONFIG_CREATED | webhook_url={webhook_url} | fields_count={len(webhook_fields)}")
            logging.info("N8N_CONFIG_CREATED | webhook_url=%s | fields_count=%d", webhook_url, len(webhook_fields))
    
    # Build data collection instructions based on N8N webhook settings
    data_collection_instructions = ""
    if n8n_config and n8n_config.get("webhook_fields"):
        # Extract webhook field names and descriptions to understand what data to collect
        webhook_fields = n8n_config.get("webhook_fields", [])
        field_descriptions = [field.get("description", "") for field in webhook_fields if field.get("description")]
        field_names = [field.get("name", "") for field in webhook_fields if field.get("name")]
        
        logging.info("N8N_FIELDS_PROCESSING | field_names=%s | field_descriptions=%s", field_names, field_descriptions)
        
        if field_descriptions and field_names:
            # Use the new dynamic instruction generation
            data_collection_instructions = generate_dynamic_collection_instructions(webhook_fields)
            print(f"DEBUG: N8N_DATA_COLLECTION_INSTRUCTIONS_CREATED | length={len(data_collection_instructions)}")
            logging.info("N8N_DATA_COLLECTION_INSTRUCTIONS_CREATED | length=%d", len(data_collection_instructions))

    flow_instructions = """
GUIDED CALL POLICY (natural > rigid):
- Greet first. Keep turns short (1–2 sentences). No long monologues.
- Prefer one tool call per caller turn. Parallel tool calls are disabled.
- Continue natural conversation flow - avoid robotic repetition.
- Only start booking tools if the caller clearly wants to book/schedule/reserve.

BOOKING FLOW (only when they ask to book):
  1) Ask for the reason → set_notes(reason)
  2) Ask for a day → list_slots_on_day(date). Read 3–6 numbered options.
  3) Caller picks → choose_slot(<number from the list you read>)
  4) Collect name → email → phone (one by one)
  5) Read back summary. If yes → confirm_details_yes(); if no → confirm_details_no() and fix, then repeat.

AVAILABILITY
- If they ask "Do you have anything on <DATE>?", call list_slots_on_day(<DATE>).
- When offering slots, present them as a short numbered list with local time.
- choose_slot expects the NUMBER you read back, not free text time.

DATA COLLECTION (dynamic, see ANALYSIS DATA section below)
- Ask only for data that should be asked (contact/required).
- Infer outcome/follow-up/key info from context; do NOT interrogate.
- Use collect_analysis_data silently, but always also say something to the caller.
""".strip()

    # Load analysis fields and add collection instructions if available
    analysis_fields = []
    logging.info("ANALYSIS_FIELDS_LOAD_START | assistant_id=%s", assistant_id)
    if assistant_id and assistant_id != "unknown":
        try:
            analysis_fields = await load_analysis_fields(assistant_id)
            logging.info("ANALYSIS_FIELDS_RETRIEVED | assistant_id=%s | fields_count=%d | fields=%s", 
                       assistant_id, len(analysis_fields), analysis_fields)
        except Exception as e:
            logging.warning("ANALYSIS_FIELDS_LOAD_FAILED | assistant_id=%s | error=%s", assistant_id, str(e))
    else:
        logging.warning("ANALYSIS_FIELDS_SKIPPED | assistant_id=%s | reason=invalid_id", assistant_id)
    
    # Add analysis field collection instructions if fields are available
    if analysis_fields and len(analysis_fields) > 0:
        logging.info("📊 ANALYSIS_FIELDS_PROCESSING | fields_count=%d | fields=%s", len(analysis_fields), analysis_fields)
        
        analysis_collection_instructions = generate_analysis_field_collection_instructions(analysis_fields)
        flow_instructions += "\n\n" + analysis_collection_instructions
        
        # Add immediate data collection instruction to the main prompt
        immediate_collection_instruction = f"""
🚨 CRITICAL: You MUST collect customer information during this call 🚨

IMMEDIATE REQUIREMENTS:
1. After greeting, ask for their name and collect it
2. Ask for their phone number and collect it  
3. Ask for their email address and collect it
4. Throughout the call, collect any other relevant information

EXAMPLE CONVERSATION:
You: "Hello, I am from Pizza Hut. How are you?"
Caller: "I am good, how are you?"
You: "I'm doing great! Before we continue, I need to collect some information. What's your name?"
Caller: "My name is John Smith"
You: "Thank you John! What's your phone number?"
Caller: "555-123-4567"  
You: "Perfect! And what's your email address?"
Caller: "john@email.com"
You: "Great! Now, how can I help you today?"

IMPORTANT: You must use the collect_analysis_data function to store this information. Do not mention the function name to the customer - just use it silently in the background.

REQUIRED DATA TO COLLECT:
{chr(10).join([f"- {field.get('name', '')}: {field.get('description', '')}" for field in analysis_fields])}

You MUST collect this data naturally during the conversation!
"""
        flow_instructions += "\n\n" + immediate_collection_instruction
        
        logging.info("📝 ANALYSIS_INSTRUCTIONS_ADDED | fields_count=%d | instruction_length=%d", len(analysis_fields), len(immediate_collection_instruction))
        print(f"DEBUG: ANALYSIS_INSTRUCTIONS_ADDED | fields_count={len(analysis_fields)}")
        logging.info("ANALYSIS_INSTRUCTIONS_ADDED | fields_count=%d", len(analysis_fields))
    else:
        logging.info("⚠️ NO_ANALYSIS_FIELDS | fields_count=%d | skipping data collection instructions", len(analysis_fields) if analysis_fields else 0)

    # Add system-level instruction for data collection if analysis fields exist
    system_instruction = ""
    if analysis_fields and len(analysis_fields) > 0:
        system_instruction = f"""
SYSTEM INSTRUCTION: You have access to a collect_analysis_data() function tool. You should collect the following data naturally during the conversation:
{chr(10).join([f"- {field.get('name', '')}: {field.get('description', '')}" for field in analysis_fields])}

IMPORTANT CONVERSATION FLOW:
1. Have a natural conversation with the customer first
2. Collect analysis data organically as it comes up in conversation (names, contact info, etc.)
3. ONLY use booking tools (provide_name, choose_slot, etc.) when the customer explicitly says they want to book/reserve/make an appointment
4. After using any tool, continue the conversation naturally - do NOT repeat yourself or say the same thing twice
5. Keep responses natural and conversational - avoid robotic repetition
6. NEVER repeat words or phrases - speak each word only once (e.g., say "Hello" not "HelloHello")

DATA COLLECTION RULES:
- Collect data naturally during conversation, not immediately when mentioned
- If someone introduces themselves (e.g., "My name is Jenna"), acknowledge them and continue the conversation naturally
- Only collect "Customer Name" when they're actually booking or providing contact details for booking purposes
- Use collect_analysis_data silently in the background - this tool completes without requiring a response
- DO NOT treat every name mention as a booking request
- AVOID repeating words or phrases - speak naturally and avoid robotic repetition
- NEVER say words twice in a row (e.g., "I'mI'm" should be "I'm")

BOOKING TOOLS USAGE:
- Only use provide_name, provide_email, provide_phone, choose_slot, etc. when customer says "I want to book" or similar
- If customer just introduces themselves, continue normal conversation
- Wait for explicit booking intent before starting booking flow

"""
    
    instructions = system_instruction + prompt + "\n\n" + flow_instructions
    
    # Debug: Print the final instructions to see what the agent is getting
    print(f"DEBUG: FINAL_INSTRUCTIONS_LENGTH | length={len(instructions)}")
    print(f"DEBUG: FINAL_INSTRUCTIONS_PREVIEW | preview={instructions[:500]}...")
    logging.info("FINAL_INSTRUCTIONS_LENGTH | length=%d", len(instructions))

    # Calendar (INBOUND ONLY) - using centralized calendar credentials
    cal_api_key = resolver_meta.get("cal_api_key")
    cal_event_type_id = resolver_meta.get("cal_event_type_id")
    cal_timezone = resolver_meta.get("cal_timezone") or "UTC"
    cal_provider = resolver_meta.get("cal_provider", "calcom")

    calendar: Calendar | None = None
    if cal_api_key and cal_event_type_id:
        try:
            if cal_provider == "calcom":
                logging.info("CALENDAR_INIT_START | cal_event_type_id=%s | type=%s", cal_event_type_id, type(cal_event_type_id))
                
                # Handle both string and integer event type IDs
                event_type_id = None
                if isinstance(cal_event_type_id, str):
                    # Try to extract numeric ID from string format like 'cal_1759650430507_boxv695kh'
                    if cal_event_type_id.startswith('cal_'):
                        # Extract the numeric part
                        numeric_part = cal_event_type_id.split('_')[1] if '_' in cal_event_type_id else cal_event_type_id
                        try:
                            event_type_id = int(numeric_part)
                            logging.info("CALENDAR_EVENT_TYPE_ID_PARSED | original=%s | parsed=%s", cal_event_type_id, event_type_id)
                        except ValueError:
                            logging.warning("CALENDAR_EVENT_TYPE_ID_PARSE_FAILED | could not parse numeric ID from: %s", cal_event_type_id)
                            # Use the string as-is for Cal.com API
                            event_type_id = cal_event_type_id
                            logging.info("CALENDAR_EVENT_TYPE_ID_USING_STRING | using original string: %s", event_type_id)
                    else:
                        try:
                            event_type_id = int(cal_event_type_id)
                            logging.info("CALENDAR_EVENT_TYPE_ID_CONVERTED | original=%s | converted=%s", cal_event_type_id, event_type_id)
                        except ValueError:
                            event_type_id = cal_event_type_id
                            logging.info("CALENDAR_EVENT_TYPE_ID_USING_STRING | using original string: %s", event_type_id)
                else:
                    event_type_id = int(cal_event_type_id)
                    logging.info("CALENDAR_EVENT_TYPE_ID_INTEGER | using integer: %s", event_type_id)
                
                calendar = CalComCalendar(
                    api_key=str(cal_api_key),
                    timezone=str(cal_timezone or "UTC"),
                    event_type_id=event_type_id,
                )
                await calendar.initialize()
                instructions += " Tools available: confirm_wants_to_book_yes, set_notes, list_slots_on_day, choose_slot, provide_name, provide_email, provide_phone, confirm_details_yes, confirm_details_no, finalize_booking."
                instructions += " When users ask about availability, call list_slots_on_day(<DATE>) and read a short numbered list. Only call choose_slot after they pick a number."
                logging.info("CALENDAR_READY | provider=%s | event_type_id=%s | tz=%s", cal_provider, event_type_id, cal_timezone)
            else:
                logging.warning("CALENDAR_PROVIDER_NOT_SUPPORTED | provider=%s", cal_provider)
        except Exception:
            logging.exception("Failed to initialize calendar integration")
    
    # Add data collection tools if N8N is configured
    if n8n_config and n8n_config.get("webhook_fields"):
        instructions += " Additional tools for data collection: collect_webhook_data(field_name, field_value) - use this to store each piece of information you collect from the caller."
        instructions += " Use collect_webhook_data opportunistically (when information naturally appears). Do not block the conversation or rush questions."
        print(f"DEBUG: N8N_TOOLS_ADDED | webhook_tools_added=true")
        logging.info("N8N_TOOLS_ADDED | webhook_tools_added=true")
    else:
        print(f"DEBUG: N8N_TOOLS_ADDED | webhook_tools_added=false")
        logging.info("N8N_TOOLS_ADDED | webhook_tools_added=false")

    # Add RAG tools if knowledge base is available
    knowledge_base_id = resolver_meta.get("knowledge_base_id")
    if knowledge_base_id:
        instructions += " Additional tools available: search_knowledge, get_detailed_info (for knowledge base queries)."
        logging.info("RAG_TOOLS | Knowledge base tools added to instructions")
    

    # Add webhook data collection instructions LAST (highest priority)
    if data_collection_instructions:
        instructions += "\n\n" + data_collection_instructions
        print(f"DEBUG: N8N_INSTRUCTIONS_ADDED | data_collection_added=true")
        logging.info("N8N_INSTRUCTIONS_ADDED | data_collection_added=true")
    else:
        print(f"DEBUG: N8N_INSTRUCTIONS_ADDED | data_collection_added=false")
        logging.info("N8N_INSTRUCTIONS_ADDED | data_collection_added=false")
    
    # Debug: Print the final instructions with webhook data collection
    print(f"DEBUG: FINAL_INSTRUCTIONS_WITH_WEBHOOK | length={len(instructions)}")
    print(f"DEBUG: FINAL_INSTRUCTIONS_END | end={instructions[-500:]}")
    logging.info("FINAL_INSTRUCTIONS_WITH_WEBHOOK | length=%d", len(instructions))

    # First message (INBOUND greets)
    force_first = (os.getenv("FORCE_FIRST_MESSAGE", "true").lower() != "false")
    if force_first and first_message:
        instructions += f' IMPORTANT: Start the conversation by saying exactly: "{first_message}" Do not repeat or modify this greeting.'
        logging.info("INBOUND_FIRST_MESSAGE_SET | first_message=%s", first_message)

    logging.info("PROMPT_TRACE_FINAL (INBOUND) | sha256=%s | len=%d | preview=%s",
                 sha256_text(instructions), len(instructions), preview(instructions))

    # INBOUND model config comes from assistant data
    assistant_data = resolver_meta.get("assistant", {})
    llm_provider = assistant_data.get("llm_provider", "OpenAI")
    llm_model = assistant_data.get("llm_model", os.getenv("OPENAI_LLM_MODEL", "gpt-4o-mini"))
    original_model = llm_model
    
    # Map model names to API format based on provider
    if llm_provider == "OpenAI":
        if llm_model == "GPT-4o Mini":
            llm_model = "gpt-4o-mini"
        elif llm_model == "GPT-4o":
            llm_model = "gpt-4o"
        elif llm_model == "GPT-4":
            llm_model = "gpt-4"
    elif llm_provider == "Groq":
        # Groq models are already in correct format
        pass
    elif llm_provider == "Anthropic":
        if llm_model == "Claude 3.5 Sonnet":
            llm_model = "claude-3-5-sonnet-20241022"
        elif llm_model == "Claude 3 Opus":
            llm_model = "claude-3-opus-20240229"
        elif llm_model == "Claude 3 Haiku":
            llm_model = "claude-3-haiku-20240307"
    elif llm_provider == "Google":
        if llm_model == "Gemini Pro":
            llm_model = "gemini-pro"
        elif llm_model == "Gemini Pro Vision":
            llm_model = "gemini-pro-vision"
    elif llm_provider == "Cerebras":
        # Cerebras models are already in correct format
        pass
    
    if original_model != llm_model:
        logging.info("MODEL_NAME_FIXED | provider=%s | original=%s | fixed=%s", llm_provider, original_model, llm_model)

    temperature = assistant_data.get("temperature", 0.1)
    max_tokens = assistant_data.get("max_tokens", 250)

    # Voice configuration from database
    voice_data = resolver_meta.get("voice", {})
    voice_provider = voice_data.get("provider", "OpenAI")
    voice_model = voice_data.get("model", "gpt-4o-mini-tts")
    voice_name = voice_data.get("voice", "alloy")
    
    # Map voice names to ElevenLabs voice IDs if using ElevenLabs
    elevenlabs_voice_map = {
        "rachel": "21m00Tcm4TlvDq8ikWAM",
        "domi": "AZnzlk1XvdvUeBnXmlld", 
        "bella": "EXAVITQu4vr4xnSDxMaL",
        "antoni": "ErXwobaYiN019PkySvjV",
        "elli": "MF3mGyEYCl7XYWbV9V6O",
        "josh": "TxGEqnHWrfWFTfGW9XjX",
        "arnold": "VR6AewLTigWG4xSOukaG"
    }
    
    if voice_provider == "ElevenLabs" and voice_name.lower() in elevenlabs_voice_map:
        voice_id = elevenlabs_voice_map[voice_name.lower()]
        logging.info("VOICE_MAPPED | provider=%s | voice_name=%s | voice_id=%s", voice_provider, voice_name, voice_id)
    else:
        voice_id = voice_name
        logging.info("VOICE_USED | provider=%s | voice_name=%s", voice_provider, voice_name)

    # Configure TTS based on voice provider
    if voice_provider == "ElevenLabs":
        # Use ElevenLabs TTS
        elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY")
        force_openai_tts = os.getenv("FORCE_OPENAI_TTS", "false").lower() == "true"
        
        if force_openai_tts:
            logging.warning("FORCE_OPENAI_TTS_ENABLED | skipping ElevenLabs, using OpenAI TTS")
            openai_voice = "alloy"  # Default OpenAI voice
            openai_tts_model = "tts-1" if voice_model.startswith("eleven_") else voice_model
            tts = lk_openai.TTS(model=openai_tts_model, voice=openai_voice, api_key=openai_api_key)
            logging.info("FORCED_OPENAI_TTS | voice=%s | model=%s", openai_voice, openai_tts_model)
        elif elevenlabs_api_key and ELEVENLABS_AVAILABLE:
            try:
                # Test ElevenLabs API connectivity first
                logging.info("TESTING_ELEVENLABS_CONNECTIVITY | voice_id=%s | api_key_length=%d", voice_id, len(elevenlabs_api_key))
                
                # Enhanced ElevenLabs configuration with better error handling
                tts = lk_elevenlabs.TTS(
                    voice_id=voice_id,
                    api_key=elevenlabs_api_key,
                    model=voice_model,
                    streaming_latency=voice_data.get("optimize_streaming", 2),
                    inactivity_timeout=30,  # Further reduced timeout
                    auto_mode=True,  # Reduces latency and improves stability
                    timeout=15,  # Shorter timeout for faster fallback
                    retry_attempts=2,  # Fewer retry attempts for faster fallback
                    retry_delay=0.5  # Shorter retry delay
                )
                logging.info("ELEVENLABS_TTS_CONFIGURED | voice_id=%s | model=%s | streaming_latency=%s", 
                           voice_id, voice_model, voice_data.get("optimize_streaming", 2))
            except Exception as e:
                logging.error("ELEVENLABS_TTS_ERROR | error=%s | falling back to OpenAI TTS", str(e))
                # Map ElevenLabs voice to OpenAI voice for fallback
                openai_voice = "alloy"  # Default OpenAI voice
                openai_tts_model = "tts-1" if voice_model.startswith("eleven_") else voice_model
                tts = lk_openai.TTS(model=openai_tts_model, voice=openai_voice, api_key=openai_api_key)
                logging.info("FALLBACK_TO_OPENAI_TTS | voice=%s | model=%s", openai_voice, openai_tts_model)
        else:
            if not ELEVENLABS_AVAILABLE:
                logging.warning("ELEVENLABS_NOT_AVAILABLE | falling back to OpenAI TTS")
            else:
                logging.warning("ELEVENLABS_API_KEY_NOT_SET | falling back to OpenAI TTS")
            # Map ElevenLabs voice to OpenAI voice for fallback
            openai_voice = "alloy"  # Default OpenAI voice
            openai_tts_model = "tts-1" if voice_model.startswith("eleven_") else voice_model
            tts = lk_openai.TTS(model=openai_tts_model, voice=openai_voice, api_key=openai_api_key)
            logging.info("FALLBACK_TO_OPENAI_TTS | voice=%s | model=%s", openai_voice, openai_tts_model)
    else:
        # Use OpenAI TTS
        tts = lk_openai.TTS(model=voice_model, voice=voice_id, api_key=openai_api_key)
        logging.info("OPENAI_TTS_CONFIGURED | model=%s | voice=%s", voice_model, voice_id)

    # Configure LLM based on provider
    if llm_provider == "Groq" and lk_groq:
        # Use global GROQ_API_KEY from environment
        groq_api_key = os.getenv("GROQ_API_KEY")
        groq_model = assistant_data.get("groq_model") or llm_model
        
        # Handle decommissioned models - map old models to new ones
        model_mapping = {
            "llama3-8b-8192": "llama-3.1-8b-instant",
            "llama3-70b-8192": "llama-3.3-70b-versatile",
            "mixtral-8x7b-32768": "llama-3.1-8b-instant",
            "gemma2-9b-it": "llama-3.1-8b-instant"  # Map deprecated Gemma to Llama
        }
        original_model = groq_model
        groq_model = model_mapping.get(groq_model, groq_model)
        if original_model != groq_model:
            logging.info("GROQ_MODEL_MAPPED | old_model=%s | new_model=%s", original_model, groq_model)
        
        groq_temperature = assistant_data.get("groq_temperature") or temperature
        groq_max_tokens = assistant_data.get("groq_max_tokens") or max_tokens
        
        if groq_api_key:
            llm = lk_groq.LLM(
                model=groq_model,
                api_key=groq_api_key,
                temperature=groq_temperature,
                parallel_tool_calls=False,
                tool_choice="auto",
            )
            logging.info("GROQ_LLM_CONFIGURED | model=%s | temperature=%s | max_tokens=%s", 
                        groq_model, groq_temperature, groq_max_tokens)
        else:
            logging.warning("GROQ_API_KEY_NOT_SET | falling back to OpenAI LLM")
            llm = lk_openai.LLM(
                model=llm_model,
                api_key=openai_api_key,
                temperature=temperature,
                parallel_tool_calls=False,
                tool_choice="auto",
            )
    elif llm_provider == "Cerebras" and CEREBRAS_AVAILABLE:
        # Use global CEREBRAS_API_KEY from environment
        cerebras_api_key = os.getenv("CEREBRAS_API_KEY")
        cerebras_model = assistant_data.get("cerebras_model") or llm_model
        cerebras_temperature = assistant_data.get("cerebras_temperature") or temperature
        cerebras_max_tokens = assistant_data.get("cerebras_max_tokens") or max_tokens
        
        if cerebras_api_key:
            # Create OpenAI-compatible client for Cerebras
            cerebras_openai_client = cerebras_client.OpenAI(
                api_key=cerebras_api_key,
                base_url="https://api.cerebras.ai/v1"
            )
            llm = lk_openai.LLM(
                model=cerebras_model,
                api_key=cerebras_api_key,
                base_url="https://api.cerebras.ai/v1",
                temperature=cerebras_temperature,
                parallel_tool_calls=False,
                tool_choice="auto",
            )
            logging.info("CEREBRAS_LLM_CONFIGURED | model=%s | temperature=%s | max_tokens=%s", 
                        cerebras_model, cerebras_temperature, cerebras_max_tokens)
        else:
            logging.warning("CEREBRAS_API_KEY_NOT_SET | falling back to OpenAI LLM")
            llm = lk_openai.LLM(
                model=llm_model,
                api_key=openai_api_key,
                temperature=temperature,
                parallel_tool_calls=False,
                tool_choice="auto",
            )
    else:
        # Default to OpenAI LLM - Check if we should use REST API
        if is_rest_model(llm_model):
            logging.info("REST_LLM_CONFIGURED | model=%s | using REST API", llm_model)
            llm = create_rest_llm(
                model=llm_model,
                api_key=openai_api_key,
                base_url=get_rest_config().rest_api_base_url
            )
        else:
            llm = lk_openai.LLM(
                model=llm_model,
                api_key=openai_api_key,
                temperature=temperature,
                parallel_tool_calls=False,
                tool_choice="auto",
            )
            logging.info("OPENAI_LLM_CONFIGURED | model=%s | temperature=%s", llm_model, temperature)

    session = AgentSession(
        turn_detection="vad",
        vad=vad,
        stt=lk_openai.STT(model=stt_model, api_key=openai_api_key),
        llm=llm,
        tts=tts,
    )

    logging.info("STARTING_SESSION (INBOUND) | instructions_length=%d | has_calendar=%s",
                 len(instructions), calendar is not None)

    # Choose between RAG-enabled assistant or regular assistant
    knowledge_base_id = resolver_meta.get("knowledge_base_id")
    

    if knowledge_base_id:
        logging.info(f"🤖 RAG_ASSISTANT | Using RAG-enabled assistant with KB: {knowledge_base_id}")
        # company_id will be retrieved from knowledge base in RAG service
        agent = RAGAssistant(
            instructions=instructions, 
            calendar=calendar,
            knowledge_base_id=knowledge_base_id,
            company_id=None  # Will be retrieved from knowledge base
        )
    else:
        logging.info("🤖 REGULAR_ASSISTANT | Using regular assistant (no knowledge base)")
        agent = Assistant(instructions=instructions, calendar=calendar)
    
    # Log the final instructions that were given to the assistant
    logging.info("📝 ASSISTANT_INSTRUCTIONS | instruction_length=%d | has_calendar=%s | has_knowledge_base=%s", 
               len(instructions), calendar is not None, knowledge_base_id is not None)
    
    # Log a sample of the instructions for debugging
    instruction_sample = instructions[:500] + "..." if len(instructions) > 500 else instructions
    logging.info("📝 ASSISTANT_INSTRUCTIONS_SAMPLE | sample=%s", instruction_sample)
    
    # Set analysis fields on the assistant after creation (for internal tracking)
    if analysis_fields and len(analysis_fields) > 0 and hasattr(agent, 'set_analysis_fields'):
        agent.set_analysis_fields(analysis_fields)
        logging.info("📊 ANALYSIS_FIELDS_LOADED | assistant_id=%s | fields_count=%d", 
                   assistant_id, len(analysis_fields))
    else:
        logging.info("⚠️ ANALYSIS_FIELDS_NOT_LOADED | fields_count=%d | has_method=%s", 
                   len(analysis_fields) if analysis_fields else 0, hasattr(agent, 'set_analysis_fields'))
    
    await session.start(
        room=ctx.room,
        agent=agent,
        room_input_options=RoomInputOptions(
            audio_enabled=True,
            text_enabled=True,
        ),
        room_output_options=RoomOutputOptions(
            audio_enabled=True,
            transcription_enabled=True,
            sync_transcription=True,
        ),
    )

    logging.info("SESSION_STARTED (INBOUND) | session_active=%s", session is not None)

    async def save_call_on_shutdown_inbound():
        end_time = datetime.datetime.now()
        logging.info("CALL_END | call_id=%s | end_time=%s", call_id, end_time.isoformat())

        session_history = []
        try:
            if hasattr(session, 'history') and session.history:
                history_dict = session.history.to_dict()
                if "items" in history_dict:
                    session_history = history_dict["items"]
                    logging.info("SESSION_HISTORY_RETRIEVED | items_count=%d", len(session_history))
                else:
                    logging.warning("SESSION_HISTORY_NO_ITEMS | history_dict_keys=%s",
                                    list(history_dict.keys()) if history_dict else "None")
            else:
                logging.warning("SESSION_HISTORY_NOT_AVAILABLE | has_history_attr=%s | history_exists=%s",
                                hasattr(session, 'history'), bool(getattr(session, 'history', None)))
        except Exception as e:
            logging.warning("Failed to get session history: %s", str(e))

        await save_call_history_to_supabase(
            call_id=call_id,
            assistant_id=assistant_id or "unknown",
            called_did=called_did or "unknown",
            start_time=start_time,
            end_time=end_time,
            session_history=session_history,
            participant_identity=participant.identity if participant else None,
            recording_sid=recording_sid,
            call_sid=call_sid,
            agent=None  # outbound has no full Assistant agent
        )

        # Send n8n webhook if assistant has n8n config
        if assistant_id and assistant_id != "unknown" and n8n_config:
            try:
                # Build call data for n8n payload
                call_data = {
                    "call_id": call_id,
                    "from_number": called_did or "unknown",
                    "to_number": "inbound",  # Inbound calls don't have a specific "to" number
                    "call_duration": int((end_time - start_time).total_seconds()),
                    "transcript_url": None,  # Can be added if available
                    "recording_url": None,   # Can be added if available
                    "call_direction": "inbound",
                    "call_status": "completed",
                    "start_time": start_time.isoformat(),
                    "end_time": end_time.isoformat(),
                    "participant_identity": participant.identity if participant else None
                }

                # Get collected webhook data from agent
                webhook_data = {}
                if hasattr(agent, 'get_webhook_data'):
                    webhook_data = agent.get_webhook_data()
                    logging.info("WEBHOOK_DATA_RETRIEVED | data=%s", webhook_data)

                # Build and send n8n payload using the new system
                webhook_url = n8n_config.get("webhook_url")
                webhook_fields = n8n_config.get("webhook_fields", [])
                
                if webhook_url and webhook_data:
                    payload = build_n8n_payload(n8n_config, call_data, session_history, webhook_fields, agent)
                    
                    response = await send_n8n_webhook(webhook_url, payload)
                    
                    if response:
                        logging.info("N8N_WEBHOOK_COMPLETED | assistant_id=%s | call_id=%s | webhook_url=%s", 
                                   assistant_id, call_id, webhook_url)
                    else:
                        logging.warning("N8N_WEBHOOK_FAILED | assistant_id=%s | call_id=%s | webhook_url=%s", 
                                      assistant_id, call_id, webhook_url)
                else:
                    logging.info("N8N_WEBHOOK_SKIPPED | webhook_url=%s | webhook_data=%s", webhook_url, webhook_data)
            except Exception as e:
                logging.error("N8N_WEBHOOK_ERROR | assistant_id=%s | call_id=%s | error=%s", 
                             assistant_id, call_id, str(e))
        else:
            logging.info("N8N_CONFIG_NOT_FOUND | assistant_id=%s | skipping webhook", assistant_id)

    ctx.add_shutdown_callback(save_call_on_shutdown_inbound)

    logging.info("STARTING_SESSION_RUN (INBOUND) | user_input=empty")
    await session.run(user_input="")
    logging.info("SESSION_RUN_COMPLETED (INBOUND)")

def prewarm(proc: agents.JobProcess):
    """Preload VAD so it’s instantly available for sessions."""
    try:
        proc.userdata["vad"] = silero.VAD.load()
    except Exception:
        logging.exception("Failed to prewarm Silero VAD")

if __name__ == "__main__":
    # Check required environment variables
    required_vars = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]

    if missing_vars:
        logging.error("❌ Missing required environment variables: %s", ", ".join(missing_vars))
        logging.error("Please set these variables in your .env file or environment")
        sys.exit(1)

    # Log configuration
    livekit_url = os.getenv("LIVEKIT_URL")
    agent_name = os.getenv("LK_AGENT_NAME", "ai")
    sip_trunk_id = os.getenv("SIP_TRUNK_ID")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    logging.info("🚀 Starting LiveKit agent")
    logging.info("📡 LiveKit URL: %s", livekit_url)
    logging.info("🤖 Agent name: %s", agent_name)
    logging.info("📞 SIP_TRUNK_ID (fallback): %s", sip_trunk_id)
    logging.info("📋 Metadata-driven trunk selection: ENABLED")
    logging.info("🔍 Environment check: LIVEKIT_URL=%s, LIVEKIT_API_KEY=%s, LIVEKIT_API_SECRET=%s",
                 bool(os.getenv("LIVEKIT_URL")), bool(os.getenv("LIVEKIT_API_KEY")), bool(os.getenv("LIVEKIT_API_SECRET")))

    logging.info("🔧 WorkerOptions: agent_name=%s, entrypoint_fnc=%s", agent_name, entrypoint.__name__)
    logging.info("🎯 Agent is ready to receive dispatches!")

    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,  # ✅ ensures VAD is ready
            agent_name=agent_name,
        )
    )
