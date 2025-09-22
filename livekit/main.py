



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
load_dotenv()

from zoneinfo import ZoneInfo

from livekit import agents, api
from livekit.agents import AgentSession, Agent, RunContext, function_tool, AutoSubscribe

# ⬇️ OpenAI + VAD plugins
from livekit.plugins import openai as lk_openai  # LLM, STT, TTS
from livekit.plugins import silero              # VAD

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

async def save_call_history_to_supabase(
    call_id: str,
    assistant_id: str,
    called_did: str,
    start_time: datetime.datetime,
    end_time: datetime.datetime,
    session_history: list,
    participant_identity: str = None,
    recording_sid: str = None,
    call_sid: str = None
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
            "id, name, n8n_webhooks"
        ).eq("id", assistant_id).execute()

        if result.data and len(result.data) > 0:
            assistant = result.data[0]
            webhooks = assistant.get("n8n_webhooks", [])
            if webhooks and len(webhooks) > 0:
                logging.info("N8N_WEBHOOKS_FETCHED | assistant_id=%s | webhooks_count=%d", 
                           assistant_id, len(webhooks))
                return {
                    "assistant_id": assistant_id,
                    "assistant_name": assistant.get("name"),
                    "webhooks": webhooks
                }
            else:
                logging.info("N8N_WEBHOOKS_EMPTY | assistant_id=%s", assistant_id)
                return None
        else:
            logging.warning("N8N_CONFIG_NOT_FOUND | assistant_id=%s", assistant_id)
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
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        logging.warning("resolver GET failed: %s (%s)", url, getattr(e, "reason", e))
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
            await ctx.api.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))
            return
        except Exception as e:
            logging.error("❌ OUTBOUND_CALL_ERROR | phone_number=%s | error=%s | type=%s", phone_number, str(e), type(e).__name__)
            await ctx.api.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))
            return
    else:
        logging.info("📞 INBOUND_CALL_DETECTED | phone_number=None")

    # Wait for participant with timeout (crucial for SIP participants)
    try:
        participant = await asyncio.wait_for(
            ctx.wait_for_participant(),
            timeout=10.0
        )
        logging.info("PARTICIPANT_CONNECTED | identity=%s | type=%s | metadata=%s",
                     participant.identity, type(participant).__name__, participant.metadata)
        if hasattr(participant, 'attributes') and participant.attributes:
            logging.info("SIP_PARTICIPANT_ATTRIBUTES | attributes=%s", participant.attributes)
    except asyncio.TimeoutError:
        logging.error("PARTICIPANT_CONNECTION_TIMEOUT | room=%s", room_name)
        await ctx.api.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))
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

        session = AgentSession(
            turn_detection="vad",
            vad=vad,
            stt=lk_openai.STT(model=stt_model, api_key=openai_api_key),
            llm=lk_openai.LLM(
                model=llm_model,
                api_key=openai_api_key,
                temperature=temperature,
                tool_choice="none",  # outbound
            ),
            tts=lk_openai.TTS(model=tts_model, voice=tts_voice, api_key=openai_api_key),
        )

        logging.info("STARTING_SESSION (OUTBOUND) | instructions_length=%d | has_calendar=%s",
                     len(outbound_instructions), False)

        await session.start(
            room=ctx.room,
            agent=Agent(instructions=outbound_instructions),
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
                call_sid=call_sid
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
                    "id, name, prompt, first_message, cal_api_key, cal_event_type_id, cal_timezone, llm_provider_setting, llm_model_setting, temperature_setting, max_token_setting, knowledge_base_id, "
                    "n8n_webhook_url, n8n_webhook_fields"
                ).eq("id", assistant_id).single().execute()
                row = resp.data
                print("row", row)
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
                        "cal_api_key": row.get("cal_api_key"),
                        "cal_event_type_id": row.get("cal_event_type_id"),
                        "cal_timezone": row.get("cal_timezone") or "UTC",
                        "knowledge_base_id": row.get("knowledge_base_id"),
                        # N8N webhook configuration
                        "n8n_webhook_url": row.get("n8n_webhook_url"),
                        "n8n_webhook_fields": row.get("n8n_webhook_fields", []),
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
                    "cal_api_key": data.get("cal_api_key"),
                    "cal_event_type_id": (
                        str(data.get("cal_event_type_id"))
                        if data.get("cal_event_type_id") is not None else None
                    ),
                    "cal_timezone": data.get("cal_timezone"),
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
GUIDED CALL POLICY (be natural, not rigid):
- Prefer one tool call per caller turn. (Parallel tool calls are disabled.)
- Only pass values the caller actually said—no placeholders.
- If they mention symptoms, be empathetic, then ask if they want to book.
- If they want to book:
  1) Ask for the reason -> set_notes(reason).
  2) Ask for a day -> list_slots_on_day(day), read numbered options.
  3) They pick -> choose_slot(option).
  4) Collect name -> email -> phone (one by one).
  5) Read back summary. If yes -> confirm_details_yes(); if no -> confirm_details_no() and fix it, then repeat.
""".strip()

    instructions = prompt + "\n\n" + flow_instructions
    
    # Debug: Print the final instructions to see what the agent is getting
    print(f"DEBUG: FINAL_INSTRUCTIONS_LENGTH | length={len(instructions)}")
    print(f"DEBUG: FINAL_INSTRUCTIONS_PREVIEW | preview={instructions[:500]}...")
    logging.info("FINAL_INSTRUCTIONS_LENGTH | length=%d", len(instructions))

    # Calendar (INBOUND ONLY)
    cal_api_key = resolver_meta.get("cal_api_key")
    cal_event_type_id = resolver_meta.get("cal_event_type_id")
    cal_timezone = resolver_meta.get("cal_timezone") or "UTC"

    calendar: Calendar | None = None
    if cal_api_key and cal_event_type_id:
        try:
            calendar = CalComCalendar(
                api_key=str(cal_api_key),
                timezone=str(cal_timezone or "UTC"),
                event_type_id=int(cal_event_type_id),
            )
            await calendar.initialize()
            instructions += " Tools available: confirm_wants_to_book_yes, set_notes, list_slots_on_day, choose_slot, provide_name, provide_email, provide_phone, confirm_details_yes, confirm_details_no, finalize_booking."
            logging.info("CALENDAR_READY | event_type_id=%s | tz=%s", cal_event_type_id, cal_timezone)
        except Exception:
            logging.exception("Failed to initialize Cal.com calendar")
    
    # Add data collection tools if N8N is configured
    if n8n_config and n8n_config.get("webhook_fields"):
        instructions += " Additional tools for data collection: collect_webhook_data(field_name, field_value) - use this to store each piece of information you collect from the caller."
        instructions += " CRITICAL: You MUST ask for webhook data FIRST before doing any RAG searches or knowledge base queries!"
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
        # Add a final, very explicit instruction
        instructions += "\n\n🚨 FINAL REMINDER: After saying your first message, when the user responds, you MUST ask for their company name using collect_webhook_data tool! 🚨"
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
        if data_collection_instructions:
            # If webhook data collection is required, modify the first message instruction
            instructions += f' IMPORTANT: Begin the call by saying: "{first_message}" Then IMMEDIATELY ask for the webhook data as specified above.'
        else:
            instructions += f' IMPORTANT: Begin the call by saying: "{first_message}"'
        logging.info("INBOUND_FIRST_MESSAGE_SET | first_message=%s", first_message)

    logging.info("PROMPT_TRACE_FINAL (INBOUND) | sha256=%s | len=%d | preview=%s",
                 sha256_text(instructions), len(instructions), preview(instructions))

    # INBOUND model config comes from assistant data
    assistant_data = resolver_meta.get("assistant", {})
    llm_model = assistant_data.get("llm_model", os.getenv("OPENAI_LLM_MODEL", "gpt-4o-mini"))
    original_model = llm_model
    if llm_model == "GPT-4o Mini":
        llm_model = "gpt-4o-mini"
    elif llm_model == "GPT-4o":
        llm_model = "gpt-4o"
    elif llm_model == "GPT-4":
        llm_model = "gpt-4"
    if original_model != llm_model:
        logging.info("MODEL_NAME_FIXED | original=%s | fixed=%s", original_model, llm_model)

    temperature = assistant_data.get("temperature", 0.1)
    max_tokens = assistant_data.get("max_tokens", 250)

    session = AgentSession(
        turn_detection="vad",
        vad=vad,
        stt=lk_openai.STT(model=stt_model, api_key=openai_api_key),
        llm=lk_openai.LLM(
            model=llm_model,
            api_key=openai_api_key,
            temperature=temperature,
            parallel_tool_calls=False,
            tool_choice="auto",
        ),
        tts=lk_openai.TTS(model=tts_model, voice=tts_voice, api_key=openai_api_key),
    )

    logging.info("STARTING_SESSION (INBOUND) | instructions_length=%d | has_calendar=%s",
                 len(instructions), calendar is not None)

    # Choose between RAG-enabled assistant or regular assistant
    knowledge_base_id = resolver_meta.get("knowledge_base_id")
    
    if knowledge_base_id:
        logging.info(f"RAG_ASSISTANT | Using RAG-enabled assistant with KB: {knowledge_base_id}")
        # company_id will be retrieved from knowledge base in RAG service
        agent = RAGAssistant(
            instructions=instructions, 
            calendar=calendar,
            knowledge_base_id=knowledge_base_id,
            company_id=None  # Will be retrieved from knowledge base
        )
    else:
        logging.info("RAG_ASSISTANT | Using regular assistant (no knowledge base)")
        agent = Assistant(instructions=instructions, calendar=calendar)
    
    await session.start(
        room=ctx.room,
        agent=agent,
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
            call_sid=call_sid
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
