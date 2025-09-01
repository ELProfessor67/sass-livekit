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

from dotenv import load_dotenv
from zoneinfo import ZoneInfo

from livekit import agents
from livekit.agents import AgentSession, Agent, RunContext, function_tool
from livekit.plugins import groq
from livekit.plugins import deepgram

# Calendar integration (your module)
from cal_calendar_api import Calendar, CalComCalendar, AvailableSlot, SlotUnavailableError

load_dotenv()
logging.basicConfig(level=logging.INFO)

# ===================== Utilities =====================

def sha256_text(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def preview(s: str, n: int = 160) -> str:
    return s[:n] + ("…" if len(s) > n else "")

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

# ===================== Agent =====================

class Assistant(Agent):
    def __init__(self, instructions: str, calendar: Calendar | None = None) -> None:
        super().__init__(instructions=instructions)
        self.calendar = calendar
        self._slots_map: dict[str, AvailableSlot] = {}

    @function_tool
    async def list_available_slots(self, ctx: RunContext, range_days: int = 7) -> str:
        logging.info("tool:list_available_slots called")
        if not self.calendar:
            return "Calendar isn’t configured for this agent."

        now = datetime.datetime.now(ZoneInfo("UTC"))
        end_time = now + datetime.timedelta(days=range_days)

        try:
            slots = await self.calendar.list_available_slots(start_time=now, end_time=end_time)
            if not slots:
                return "No appointment slots are available in the next few days. Please try a different date range."

            self._slots_map.clear()
            top = slots[:5]

            lines = ["Here are the available appointment times:"]
            for i, slot in enumerate(top, 1):
                local = slot.start_time.astimezone(self.calendar.tz)
                now_local = datetime.datetime.now(self.calendar.tz)

                days = (local.date() - now_local.date()).days
                if days == 0:
                    rel = "today"
                elif days == 1:
                    rel = "tomorrow"
                elif days < 7:
                    rel = f"in {days} days"
                else:
                    rel = f"in {days // 7} weeks"

                lines.append(
                    f"Option {i}: {local.strftime('%A, %B %d, %Y')} at "
                    f"{local.strftime('%I:%M %p')} ({rel})"
                )

                # indexable keys
                self._slots_map[slot.unique_hash] = slot
                self._slots_map[f"option_{i}"] = slot
                self._slots_map[f"option {i}"] = slot
                self._slots_map[str(i)] = slot

            lines.append("\nWhich option would you like to book? Say the option number (e.g., 'Option 1' or just '1').")
            return "\n".join(lines)

        except Exception:
            logging.exception("Error listing available slots")
            return "Sorry, I hit an error while checking available slots. Please try again."

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
        logging.info("tool:schedule_appointment called")
        if not self.calendar:
            return "Calendar isn’t configured for this agent."
        if not self._slots_map:
            return "I need to check available times first. Let me show you what’s available."

        key = slot_id.strip()
        slot = (
            self._slots_map.get(key)
            or self._slots_map.get(f"option_{key}")
            or self._slots_map.get(f"option {key}")
            or (self._slots_map.get(key.replace("option", "").strip()) if key.lower().startswith("option") else None)
        )

        if not slot:
            return f"I couldn’t find “{slot_id}” in the presented options. I’ll show you the available times again."

        try:
            await self.calendar.schedule_appointment(
                start_time=slot.start_time,
                attendee_name=attendee_name,
                attendee_email=attendee_email,
                attendee_phone=attendee_phone or "",
                notes=notes or "",
            )
            local = slot.start_time.astimezone(self.calendar.tz)
            return (
                f"Booked! Your appointment is on "
                f"{local.strftime('%A, %B %d, %Y at %I:%M %p %Z')}. "
                f"A confirmation will be sent to {attendee_email}."
            )

        except SlotUnavailableError:
            return "That time was just taken. I’ll fetch the latest available times for you."
        except Exception:
            logging.exception("Error scheduling appointment")
            return "I hit an error while scheduling. Please try again or choose a different time."

# ===================== Entrypoint =====================

async def entrypoint(ctx: agents.JobContext):
    await ctx.connect()

    # --- Room / DID context -------------------------------------------------
    room_name = getattr(ctx.room, "name", "") or ""
    prefix = os.getenv("DISPATCH_ROOM_PREFIX", "did-")
    called_did = extract_called_did(room_name) or (room_name[len(prefix):] if room_name.startswith(prefix) else None)
    logging.info("DID ROUTE | room=%s | called_did=%s", room_name, called_did)
    # -----------------------------------------------------------------------

    participant = await ctx.wait_for_participant()

    # --- Collect metadata (participant → room → env) ------------------------
    p_meta_raw = participant.metadata or ""
    print(f"participant.metadata: {p_meta_raw}")
    p_meta, p_kind = ({}, "none")
    if p_meta_raw:
        p_meta, p_kind = _parse_json_or_b64(p_meta_raw)

    r_meta_raw = getattr(ctx.room, "metadata", "") or ""
    r_meta, r_kind = ({}, "none")
    if r_meta_raw:
        r_meta, r_kind = _parse_json_or_b64(r_meta_raw)

    e_meta, e_label = _from_env_json("ASSISTANT_JSON", "DEFAULT_ASSISTANT_JSON")

    preliminary_sources: list[tuple[str, dict]] = [
        (f"participant.{p_kind}", p_meta),
        (f"room.{r_kind}", r_meta),
        (e_label, e_meta),
    ]
    # -----------------------------------------------------------------------

    # --- Resolve assistantId (ID → fetch full assistant) --------------------
    # 1) Try direct assistantId from metadata/env
    assistant_id, id_src = choose_from_sources(
        preliminary_sources,
        ("assistantId",),
        ("assistant", "id"),
        default=None,
    )

    resolver_label = "resolver:none"
    resolver_meta: dict = {}

    # 2) If not present, try env ASSISTANT_ID
    if not assistant_id:
        env_assistant_id = os.getenv("ASSISTANT_ID", "").strip() or None
        if env_assistant_id:
            assistant_id = env_assistant_id
            id_src = "env:ASSISTANT_ID"
    
    # 3) If still missing, try number-based resolution on your backend
    #    Accept both: /assistant/by-number?number=E164 or /assistant?number=E164
    base_resolver = os.getenv("ASSISTANT_RESOLVER_URL", "http://localhost:4000/api/v1/livekit/assistant").rstrip("/")
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

    # 4) If we have an assistant_id, fetch full assistant as TOP PRECEDENCE
    if assistant_id:
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
            resolver_label = "resolver.ok"
        else:
            resolver_label = "resolver.error"

    # Final precedence: resolver (if any) → participant → room → env
    sources: list[tuple[str, dict]] = []
    if resolver_meta:
        sources.append((resolver_label, resolver_meta))
    sources.extend(preliminary_sources)

    logging.info(
        "METADATA_SOURCES | resolver=%s | participant=%s | room=%s | env=%s",
        resolver_label, p_kind, r_kind, e_label
    )
    logging.info("ASSISTANT_ID | value=%s | source=%s", assistant_id or "<none>", id_src)
    # -----------------------------------------------------------------------

    # --- Multi-agent knobs --------------------------------------------------
    worker_agent_name = os.getenv("LK_AGENT_NAME", "ai")

    declared_agent_name, agent_src = choose_from_sources(
        sources, ("agentName",), ("assistant", "agentName"),
        default=worker_agent_name,
    )

    assistant_name, name_src = choose_from_sources(
        sources, ("assistantName",), ("assistant", "name"),
        default=os.getenv("DEFAULT_ASSISTANT_NAME", "Assistant"),
    )

    prompt, prompt_src = choose_from_sources(
        sources, ("assistant", "prompt"), ("prompt",), ("instructions",),
        default=os.getenv("DEFAULT_INSTRUCTIONS", "You are a helpful voice assistant."),
    )

    first_message, fm_src = choose_from_sources(
        sources, ("assistant", "firstMessage"), ("firstMessage",), ("first_message",),
        default=None,
    )

    force_first_raw, ff_src = choose_from_sources(sources, ("forceFirstMessage",), default="true")
    force_first = str(force_first_raw).strip().lower() != "false"

    llm_model, llm_src = choose_from_sources(
        sources, ("llm_model",), ("assistant", "llm_model"),
        default=os.getenv("LLM_MODEL", "llama-3.3-70b-versatile"),
    )
    stt_model, stt_src = choose_from_sources(
        sources, ("stt_model",), ("assistant", "stt_model"),
        default=os.getenv("STT_MODEL", "nova-3"),
    )
    tts_model, tts_src = choose_from_sources(
        sources, ("tts_model",), ("assistant", "tts_model"),
        default=os.getenv("TTS_MODEL", "aura-asteria-en"),
    )

    cal_api_key, cal_key_src = choose_from_sources(sources, ("cal_api_key",), default=None)
    cal_event_type_id_str, cal_evt_src = choose_from_sources(sources, ("cal_event_type_id",), default=None)
    cal_timezone, cal_tz_src = choose_from_sources(sources, ("cal_timezone",), default="UTC")
    # -----------------------------------------------------------------------

    # --- PROMPT AUDIT -------------------------------------------------------
    prompt_digest = sha256_text(prompt)
    logging.info(
        "PROMPT_TRACE | agent_worker=%s | agent_declared=%s (%s) | assistant=%s (%s) "
        "| did=%s | prompt_source=%s | prompt_len=%d | prompt_sha256=%s | preview=%s",
        worker_agent_name, declared_agent_name, agent_src, assistant_name, name_src,
        called_did, prompt_src, len(prompt), prompt_digest, preview(prompt)
    )
    if first_message:
        logging.info("PROMPT_TRACE_FIRST_MESSAGE | source=%s | len=%d | preview=%s",
                     fm_src, len(first_message), preview(first_message))
    else:
        logging.info("PROMPT_TRACE_FIRST_MESSAGE | source=%s | value=<none>", fm_src)
    # -----------------------------------------------------------------------

    # --- Build instructions & optional calendar -----------------------------
    instructions = prompt

    calendar: Calendar | None = None
    if cal_api_key and cal_event_type_id_str:
        try:
            calendar = CalComCalendar(
                api_key=str(cal_api_key),
                timezone=str(cal_timezone or "UTC"),
                event_type_id=int(cal_event_type_id_str),
            )
            await calendar.initialize()
            instructions += (
                " You have two tools available: list_available_slots and schedule_appointment. "
                "Use them when the caller wants to book."
            )
            logging.info("CALENDAR_READY | event_type_id=%s (%s) | tz=%s (%s)",
                         cal_event_type_id_str, cal_evt_src, cal_timezone, cal_tz_src)
        except Exception:
            logging.exception("Failed to initialize Cal.com calendar")
            instructions += " Calendar integration is currently unavailable."

    if force_first:
        if not first_message:
            first_message = (
                f"Hi! You’ve reached {assistant_name}. Thanks for calling. How can I help you today?"
                if called_did else
                f"Hi! You’ve reached {assistant_name}. How can I help you today?"
            )
        instructions += f' IMPORTANT: Begin the call by saying exactly this (do not paraphrase): "{first_message}"'

    logging.info("PROMPT_TRACE_FINAL | sha256=%s | len=%d | preview=%s",
                 sha256_text(instructions), len(instructions), preview(instructions))
    # -----------------------------------------------------------------------

    # --- Start agent session ------------------------------------------------
    session = AgentSession(
        stt=deepgram.STT(model=stt_model),
        llm=groq.LLM(model=llm_model, temperature=0.1),
        tts=deepgram.TTS(model=tts_model),
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(instructions=instructions, calendar=calendar),
    )

    await session.run(user_input="")
    # -----------------------------------------------------------------------

if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name=os.getenv("LK_AGENT_NAME", "ai"),
        )
    )
