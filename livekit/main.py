from __future__ import annotations

import json
import urllib.request
import urllib.parse
import logging
import datetime
from typing import Optional, Tuple, Iterable
import base64
import os
import re
import hashlib
import uuid

from dotenv import load_dotenv
from zoneinfo import ZoneInfo

from livekit import agents
from livekit.agents import AgentSession, Agent, RunContext, function_tool

# ⬇️ OpenAI + VAD plugins
from livekit.plugins import openai as lk_openai  # LLM, STT, TTS
from livekit.plugins import silero              # VAD

try:
    from supabase import create_client, Client  # type: ignore
except Exception:  # pragma: no cover
    create_client = None  # type: ignore
    Client = object  # type: ignore

# Calendar integration (your module)
from cal_calendar_api import Calendar, CalComCalendar, AvailableSlot, SlotUnavailableError

# Assistant service
from services.assistant import Assistant

load_dotenv()
logging.basicConfig(level=logging.INFO)

# ===================== Utilities =====================

def sha256_text(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def preview(s: str, n: int = 160) -> str:
    return s[:n] + ("…" if len(s) > n else "")

def determine_call_status(call_duration: int, transcription: list) -> str:
    """Determine call status based on duration and transcription content"""
    
    # Very short calls (less than 5 seconds) are likely dropped
    if call_duration < 5:
        return "dropped"
    
    # Short calls (less than 15 seconds) with no meaningful conversation
    if call_duration < 15:
        if not transcription or len(transcription) < 2:
            return "dropped"
    
    # Check transcription for spam indicators
    if transcription:
        # Combine all transcription content for analysis
        all_content = ""
        for item in transcription:
            if isinstance(item, dict) and "content" in item:
                content = item["content"]
                if isinstance(content, str):
                    all_content += content.lower() + " "
        
        # Spam detection keywords
        spam_keywords = [
            "robocall", "telemarketing", "scam", "fraud", "suspicious",
            "unwanted", "spam", "junk", "harassment", "threat"
        ]
        
        if any(keyword in all_content for keyword in spam_keywords):
            return "spam"
        
        # Check for no response patterns
        if len(transcription) <= 1:
            return "no_response"
        
        # Check if caller hung up immediately after greeting
        if len(transcription) == 2:
            first_message = transcription[0].get("content", "").lower() if transcription[0] else ""
            if "hi" in first_message or "hello" in first_message or "thanks for calling" in first_message:
                return "dropped"
    
    # Check for successful conversation indicators
    if transcription and len(transcription) >= 4:
        # Look for booking-related keywords (successful calls)
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
    
    # Default to completed for calls with reasonable duration and conversation
    if call_duration >= 15 and transcription and len(transcription) >= 3:
        return "completed"
    
    # If we have some conversation but it's unclear, mark as completed
    if transcription and len(transcription) >= 2:
        return "completed"
    
    # Default fallback
    return "dropped"

async def save_call_history_to_supabase(
    call_id: str,
    assistant_id: str,
    called_did: str,
    start_time: datetime.datetime,
    end_time: datetime.datetime,
    session_history: list,
    participant_identity: str = None
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
        
        # Prepare transcription data
        transcription = []
        for item in session_history:
            if isinstance(item, dict) and "role" in item and "content" in item:
                transcription.append({
                    "role": item["role"],
                    "content": item["content"]
                })
        
        # Calculate call duration
        call_duration = int((end_time - start_time).total_seconds())
        
        # Determine call status based on duration and transcription
        call_status = determine_call_status(call_duration, transcription)
        
        # Prepare call history data
        call_data = {
            "call_id": call_id,
            "assistant_id": assistant_id,
            "phone_number": called_did,
            "participant_identity": participant_identity,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "call_duration": call_duration,
            "call_status": call_status,
            "transcription": transcription,
            "created_at": datetime.datetime.now().isoformat()
        }
        
        # Insert into call_history table
        result = sb.table("call_history").insert(call_data).execute()
        
        if result.data:
            logging.info("CALL_HISTORY_SAVED | call_id=%s | duration=%ds | status=%s | transcription_items=%d", 
                        call_id, call_duration, call_status, len(transcription))
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

# ===================== Agent (FSM-Guarded) =====================
# Assistant class moved to services/assistant.py

# ===================== Entrypoint (Single-Assistant) =====================

async def entrypoint(ctx: agents.JobContext):
    await ctx.connect()

    # --- Room / DID context -----------------------------------------
    room_name = getattr(ctx.room, "name", "") or ""
    prefix = os.getenv("DISPATCH_ROOM_PREFIX", "did-")
    called_did = extract_called_did(room_name) or (room_name[len(prefix):] if room_name.startswith(prefix) else None)
    logging.info("DID ROUTE | room=%s | called_did=%s", room_name, called_did)

    participant = await ctx.wait_for_participant()
    
    # --- Call tracking setup ----------------------------------------
    start_time = datetime.datetime.now()
    call_id = str(uuid.uuid4())
    logging.info("CALL_START | call_id=%s | start_time=%s", call_id, start_time.isoformat())
    # ----------------------------------------------------------------

    # --- Resolve assistantId (same as before) -----------------------
    resolver_meta: dict = {}
    resolver_label: str = "none"

    p_meta, p_kind = ({}, "none")
    if participant.metadata:
        p_meta, p_kind = _parse_json_or_b64(participant.metadata)

    r_meta_raw = getattr(ctx.room, "metadata", "") or ""
    r_meta, r_kind = ({}, "none")
    if r_meta_raw:
        r_meta, r_kind = _parse_json_or_b64(r_meta_raw)

    e_meta, e_label = _from_env_json("ASSISTANT_JSON", "DEFAULT_ASSISTANT_JSON")

    id_sources: list[tuple[str, dict]] = [
        (f"participant.{p_kind}", p_meta),
        (f"room.{r_kind}", r_meta),
        (e_label, e_meta),
    ]

    assistant_id, id_src = choose_from_sources(
        id_sources,
        ("assistantId",),
        ("assistant", "id"),
        default=None,
    )

    if not assistant_id:
        env_assistant_id = os.getenv("ASSISTANT_ID", "").strip() or None
        if env_assistant_id:
            assistant_id = env_assistant_id
            id_src = "env:ASSISTANT_ID"

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
                    "id, name, prompt, first_message, cal_api_key, cal_event_type_id, cal_timezone"
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
                        },
                        "cal_api_key": row.get("cal_api_key"),
                        "cal_event_type_id": row.get("cal_event_type_id"),
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

    # --- Build instructions strictly from RESOLVED ASSISTANT ONLY ----------
    assistant_name = (resolver_meta.get("assistant") or {}).get("name") or os.getenv("DEFAULT_ASSISTANT_NAME", "Assistant")
    prompt = (resolver_meta.get("assistant") or {}).get("prompt") or os.getenv("DEFAULT_INSTRUCTIONS", "You are a helpful voice assistant.")
    first_message = (resolver_meta.get("assistant") or {}).get("firstMessage") or ""

    # Calendar (from resolver only)
    cal_api_key = resolver_meta.get("cal_api_key")
    cal_event_type_id = resolver_meta.get("cal_event_type_id")
    cal_timezone = resolver_meta.get("cal_timezone") or "UTC"

    # First line
    force_first = (os.getenv("FORCE_FIRST_MESSAGE", "true").lower() != "false")
    if force_first and not first_message:
        first_message = (
            f"Hi! You’ve reached {assistant_name}. Thanks for calling. How can I help you today?"
            if called_did else
            f"Hi! You’ve reached {assistant_name}. How can I help you today?"
        )

    # Softer flow policy
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
  5) Read back summary. If yes -> confirm_details(); if no -> confirm_details_no() and fix it, then repeat.
"""

    instructions = prompt + "\n\n" + flow_instructions
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

    if force_first and first_message:
        instructions += f' IMPORTANT: Begin the call by saying: "{first_message}"'

    logging.info("PROMPT_TRACE_FINAL | sha256=%s | len=%d | preview=%s",
                 sha256_text(instructions), len(instructions), preview(instructions))
    # -----------------------------------------------------------------------

    # --- OpenAI + VAD configuration ----------------------------------------
    # Use OPENAI_API_KEY primarily; fall back to OPENAI_API if that's what you set.
    openai_api_key = os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_API")
    if not openai_api_key:
        logging.warning("OPENAI_API_KEY/OPENAI_API not set; OpenAI plugins will fail to auth.")  # plugin reads env too

    llm_model = os.getenv("OPENAI_LLM_MODEL", "gpt-4o-mini")
    stt_model = os.getenv("OPENAI_STT_MODEL", "gpt-4o-transcribe")
    tts_model = os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
    tts_voice = os.getenv("OPENAI_TTS_VOICE", "alloy")

    # Load / reuse VAD (required because OpenAI STT is non-streaming; VAD gates turns)
    vad = ctx.proc.userdata.get("vad") if hasattr(ctx, "proc") else None
    if vad is None:
        # Fallback if prewarm didn't run
        vad = silero.VAD.load()

    session = AgentSession(
        # 👇 VAD fixes the “STT does not support streaming” error
        turn_detection="vad",
        vad=vad,

        # OpenAI STT / LLM / TTS
        stt=lk_openai.STT(model=stt_model, api_key=openai_api_key),
        llm=lk_openai.LLM(
            model=llm_model,
            api_key=openai_api_key,
            temperature=0.1,
            parallel_tool_calls=False,  # align with our FSM guard
            tool_choice="auto",
        ),
        tts=lk_openai.TTS(model=tts_model, voice=tts_voice, api_key=openai_api_key),
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(instructions=instructions, calendar=calendar),
    )

    # Add shutdown callback to save call history
    async def save_call_on_shutdown():
        end_time = datetime.datetime.now()
        logging.info("CALL_END | call_id=%s | end_time=%s", call_id, end_time.isoformat())
        
        # Get session history
        session_history = []
        try:
            if hasattr(session, 'history') and session.history:
                # Convert session history to list format
                history_dict = session.history.to_dict()
                if "items" in history_dict:
                    session_history = history_dict["items"]
        except Exception as e:
            logging.warning("Failed to get session history: %s", str(e))
        
        # Save to Supabase
        await save_call_history_to_supabase(
            call_id=call_id,
            assistant_id=assistant_id or "unknown",
            called_did=called_did or "unknown",
            start_time=start_time,
            end_time=end_time,
            session_history=session_history,
            participant_identity=participant.identity if participant else None
        )
    
    ctx.add_shutdown_callback(save_call_on_shutdown)

    # Kick off with empty user_input; greeting comes from instructions
    await session.run(user_input="")
    # -----------------------------------------------------------------------

def prewarm(proc: agents.JobProcess):
    """Preload VAD so it’s instantly available for sessions."""
    try:
        proc.userdata["vad"] = silero.VAD.load()
    except Exception:
        logging.exception("Failed to prewarm Silero VAD")

if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,  # ✅ ensures VAD is ready
            agent_name=os.getenv("LK_AGENT_NAME", "ai"),
        )
    )
