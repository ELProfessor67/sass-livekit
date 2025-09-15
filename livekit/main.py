# from __future__ import annotations

# import json
# import urllib.request
# import urllib.parse
# import logging
# import datetime
# import asyncio
# import sys
# from typing import Optional, Tuple, Iterable
# import base64
# import os
# import re
# import hashlib
# import uuid

# from dotenv import load_dotenv

# # Load environment variables FIRST before any other imports
# load_dotenv()

# from zoneinfo import ZoneInfo

# from livekit import agents, api
# from livekit.agents import AgentSession, Agent, RunContext, function_tool, AutoSubscribe

# # ⬇️ OpenAI + VAD plugins
# from livekit.plugins import openai as lk_openai  # LLM, STT, TTS
# from livekit.plugins import silero              # VAD

# try:
#     from supabase import create_client, Client  # type: ignore
# except Exception:  # pragma: no cover
#     create_client = None  # type: ignore
#     Client = object  # type: ignore

# # Calendar integration (your module)
# from cal_calendar_api import Calendar, CalComCalendar, AvailableSlot, SlotUnavailableError

# # Assistant service
# from services.assistant import Assistant

# # Recording service
# from services.recording_service import recording_service
# logging.basicConfig(level=logging.INFO)

# # ===================== Utilities =====================

# def sha256_text(s: str) -> str:
#     return hashlib.sha256(s.encode("utf-8")).hexdigest()

# def preview(s: str, n: int = 160) -> str:
#     return s[:n] + ("…" if len(s) > n else "")

# def determine_call_status(call_duration: int, transcription: list) -> str:
#     """Determine call status based on duration and transcription content"""
    
#     # Very short calls (less than 5 seconds) are likely dropped
#     if call_duration < 5:
#         return "dropped"
    
#     # Short calls (less than 15 seconds) with no meaningful conversation
#     if call_duration < 15:
#         if not transcription or len(transcription) < 2:
#             return "dropped"
    
#     # Check transcription for spam indicators
#     if transcription:
#         # Combine all transcription content for analysis
#         all_content = ""
#         for item in transcription:
#             if isinstance(item, dict) and "content" in item:
#                 content = item["content"]
#                 if isinstance(content, str):
#                     all_content += content.lower() + " "
        
#         # Spam detection keywords
#         spam_keywords = [
#             "robocall", "telemarketing", "scam", "fraud", "suspicious",
#             "unwanted", "spam", "junk", "harassment", "threat"
#         ]
        
#         if any(keyword in all_content for keyword in spam_keywords):
#             return "spam"
        
#         # Check for no response patterns
#         if len(transcription) <= 1:
#             return "no_response"
        
#         # Check if caller hung up immediately after greeting
#         if len(transcription) == 2:
#             first_message = transcription[0].get("content", "").lower() if transcription[0] else ""
#             if "hi" in first_message or "hello" in first_message or "thanks for calling" in first_message:
#                 return "dropped"
    
#     # Check for successful conversation indicators
#     if transcription and len(transcription) >= 4:
#         # Look for booking-related keywords (successful calls)
#         all_content = ""
#         for item in transcription:
#             if isinstance(item, dict) and "content" in item:
#                 content = item["content"]
#                 if isinstance(content, str):
#                     all_content += content.lower() + " "
        
#         success_keywords = [
#             "appointment", "book", "schedule", "confirm", "details",
#             "name", "email", "phone", "thank you", "goodbye"
#         ]
        
#         if any(keyword in all_content for keyword in success_keywords):
#             return "completed"
    
#     # Default to completed for calls with reasonable duration and conversation
#     if call_duration >= 15 and transcription and len(transcription) >= 3:
#         return "completed"
    
#     # If we have some conversation but it's unclear, mark as completed
#     if transcription and len(transcription) >= 2:
#         return "completed"
    
#     # Default fallback
#     return "dropped"

# async def save_call_history_to_supabase(
#     call_id: str,
#     assistant_id: str,
#     called_did: str,
#     start_time: datetime.datetime,
#     end_time: datetime.datetime,
#     session_history: list,
#     participant_identity: str = None,
#     recording_sid: str = None,
#     call_sid: str = None
# ) -> bool:
#     """Save call history to Supabase with enhanced status detection"""
#     try:
#         if not create_client:
#             logging.warning("Supabase client not available, skipping call history save")
#             return False
            
#         supabase_url = os.getenv("SUPABASE_URL", "").strip()
#         supabase_key = (
#             os.getenv("SUPABASE_SERVICE_ROLE", "").strip()
#             or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
#         )
        
#         if not supabase_url or not supabase_key:
#             logging.warning("Supabase credentials not configured, skipping call history save")
#             return False
            
#         sb: Client = create_client(supabase_url, supabase_key)
        
#         # Prepare transcription data
#         transcription = []
#         for item in session_history:
#             if isinstance(item, dict) and "role" in item and "content" in item:
#                 transcription.append({
#                     "role": item["role"],
#                     "content": item["content"]
#                 })
        
#         logging.info("TRANSCRIPTION_PREPARED | items_count=%d | transcription_entries=%d", 
#                     len(session_history), len(transcription))
        
#         # Calculate call duration
#         call_duration = int((end_time - start_time).total_seconds())
        
#         # Determine call status based on duration and transcription
#         call_status = determine_call_status(call_duration, transcription)
        
#         # Prepare call history data
#         call_data = {
#             "call_id": call_id,
#             "assistant_id": assistant_id,
#             "phone_number": called_did,
#             "participant_identity": participant_identity,
#             "start_time": start_time.isoformat(),
#             "end_time": end_time.isoformat(),
#             "call_duration": call_duration,
#             "call_status": call_status,
#             "transcription": transcription,
#             "recording_sid": recording_sid,
#             "call_sid": call_sid,
#             "created_at": datetime.datetime.now().isoformat()
#         }
        
#         # Insert into call_history table
#         result = sb.table("call_history").insert(call_data).execute()
        
#         if result.data:
#             logging.info("CALL_HISTORY_SAVED | call_id=%s | duration=%ds | status=%s | transcription_items=%d", 
#                         call_id, call_duration, call_status, len(transcription))
#             # Log a sample of the transcription for debugging
#             if transcription:
#                 sample_transcript = transcription[0] if len(transcription) > 0 else {}
#                 logging.info("TRANSCRIPTION_SAMPLE | first_entry=%s", sample_transcript)
#             return True
#         else:
#             logging.error("CALL_HISTORY_SAVE_FAILED | call_id=%s", call_id)
#             return False
            
#     except Exception as e:
#         logging.exception("CALL_HISTORY_SAVE_ERROR | call_id=%s | error=%s", call_id, str(e))
#         return False

# def extract_called_did(room_name: str) -> str | None:
#     """Find the first +E.164 sequence anywhere in the room name."""
#     m = re.search(r'\+\d{7,}', room_name)
#     return m.group(0) if m else None

# def _parse_json_or_b64(raw: str) -> tuple[dict, str]:
#     """Try JSON; if that fails, base64(JSON). Return (dict, source_kind)."""
#     try:
#         d = json.loads(raw)
#         return (d if isinstance(d, dict) else {}), "json"
#     except Exception:
#         try:
#             decoded = base64.b64decode(raw).decode()
#             d = json.loads(decoded)
#             return (d if isinstance(d, dict) else {}), "base64_json"
#         except Exception:
#             return {}, "invalid"

# def _from_env_json(*env_keys: str) -> tuple[dict, str]:
#     """First non-empty env var parsed as JSON. Return (dict, 'env:KEY:kind') or ({}, 'env:none')."""
#     for k in env_keys:
#         raw = os.getenv(k, "")
#         if raw.strip():
#             d, kind = _parse_json_or_b64(raw)
#             return d, f"env:{k}:{kind}"
#     return {}, "env:none"

# def choose_from_sources(
#     sources: Iterable[tuple[str, dict]],
#     *paths: Tuple[str, ...],
#     default: Optional[str] = None,
# ) -> tuple[Optional[str], str]:
#     """First non-empty string across sources/paths. Return (value, 'label.path') or (default,'default')."""
#     for label, d in sources:
#         for path in paths:
#             cur = d
#             ok = True
#             for k in path:
#                 if not isinstance(cur, dict) or k not in cur:
#                     ok = False
#                     break
#                 cur = cur[k]
#             if ok and isinstance(cur, str) and cur.strip():
#                 return cur, f"{label}:" + ".".join(path)
#     return default, "default"

# def _http_get_json(url: str, timeout: int = 5) -> dict | None:
#     try:
#         with urllib.request.urlopen(url, timeout=timeout) as resp:
#             return json.loads(resp.read().decode("utf-8"))
#     except Exception as e:
#         logging.warning("resolver GET failed: %s (%s)", url, getattr(e, "reason", e))
#         return None

# # ===================== Agent (FSM-Guarded) =====================
# # Assistant class moved to services/assistant.py

# # ===================== Entrypoint (Single-Assistant) =====================

# # Global counter for debugging
# dispatch_count = 0

# async def entrypoint(ctx: agents.JobContext):
#     global dispatch_count
#     dispatch_count += 1
#     logging.info("🎯 DISPATCH_RECEIVED | count=%d | room=%s | job_metadata=%s", dispatch_count, ctx.room.name, ctx.job.metadata)
#     logging.info("🚀 AGENT_ENTRYPOINT_START | room=%s | job_metadata=%s", ctx.room.name, ctx.job.metadata)
    
#     # Initialize connection with auto-subscribe to audio only (crucial for SIP)
#     await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
#     logging.info("✅ AGENT_CONNECTED | room=%s", ctx.room.name)

#     # --- Check if this is an outbound call --------------------------
#     phone_number = None
#     try:
#         dial_info = json.loads(ctx.job.metadata)
#         phone_number = dial_info.get("phone_number")
#         logging.info("OUTBOUND_CHECK | phone_number=%s | metadata=%s", phone_number, ctx.job.metadata)
#     except Exception as e:
#         logging.warning("Failed to parse job metadata for outbound call: %s", str(e))

#     # --- Room / DID context -----------------------------------------
#     room_name = getattr(ctx.room, "name", "") or ""
#     prefix = os.getenv("DISPATCH_ROOM_PREFIX", "did-")
#     called_did = extract_called_did(room_name) or (room_name[len(prefix):] if room_name.startswith(prefix) else None)
#     logging.info("🎯 AGENT_TRIGGERED | room=%s | called_did=%s | room_type=%s | is_outbound=%s", 
#                 room_name, called_did, type(ctx.room).__name__, phone_number is not None)

#     # --- Handle outbound calling -------------------------------------
#     if phone_number is not None:
#         logging.info("🔥 OUTBOUND_CALL_DETECTED | phone_number=%s", phone_number)
#         # This is an outbound call - create SIP participant to dial
#         try:
#             sip_trunk_id = os.getenv("SIP_TRUNK_ID")
#             logging.info("🔍 SIP_TRUNK_ID_CHECK | sip_trunk_id=%s", sip_trunk_id)
#             if not sip_trunk_id:
#                 logging.error("❌ SIP_TRUNK_ID not configured - cannot make outbound call")
#                 await ctx.api.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))
#                 return
            
#             logging.info("📞 OUTBOUND_CALL_START | phone_number=%s | trunk_id=%s | room=%s", phone_number, sip_trunk_id, ctx.room.name)
            
#             # Create SIP participant to dial the number
#             sip_request = api.CreateSIPParticipantRequest(
#                 room_name=ctx.room.name,
#                 sip_trunk_id=sip_trunk_id,
#                 sip_call_to=phone_number,
#                 participant_identity=phone_number,
#                 wait_until_answered=True,
#             )
#             logging.info("📞 SIP_REQUEST_CREATED | request=%s", sip_request)
            
#             result = await ctx.api.sip.create_sip_participant(sip_request)
#             logging.info("✅ OUTBOUND_CALL_CONNECTED | phone_number=%s | result=%s", phone_number, result)
            
#         except api.TwirpError as e:
#             logging.error("❌ OUTBOUND_CALL_FAILED | phone_number=%s | error=%s | sip_status=%s | metadata=%s", 
#                         phone_number, e.message, e.metadata.get('sip_status_code'), e.metadata)
#             await ctx.api.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))
#             return
#         except Exception as e:
#             logging.error("❌ OUTBOUND_CALL_ERROR | phone_number=%s | error=%s | type=%s", phone_number, str(e), type(e).__name__)
#             await ctx.api.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))
#             return
#     else:
#         logging.info("📞 INBOUND_CALL_DETECTED | phone_number=None")

#     # Wait for participant with timeout (crucial for SIP participants)
#     try:
#         participant = await asyncio.wait_for(
#             ctx.wait_for_participant(), 
#             timeout=10.0
#         )
#         logging.info("PARTICIPANT_CONNECTED | identity=%s | type=%s | metadata=%s", 
#                     participant.identity, type(participant).__name__, participant.metadata)
        
#         # Check if this is a SIP participant
#         if hasattr(participant, 'attributes') and participant.attributes:
#             logging.info("SIP_PARTICIPANT_ATTRIBUTES | attributes=%s", participant.attributes)
#     except asyncio.TimeoutError:
#         logging.error("PARTICIPANT_CONNECTION_TIMEOUT | room=%s", room_name)
#         await ctx.api.room.delete_room(api.DeleteRoomRequest(room=ctx.room.name))
#         return
    
#     # --- Campaign metadata extraction --------------------------------
#     campaign_prompt = ""
#     contact_info = {}
    
#     # First try to get campaign data from job metadata (dispatch body) - more efficient
#     try:
#         job_meta = json.loads(ctx.job.metadata) if isinstance(ctx.job.metadata, str) else ctx.job.metadata
#         campaign_prompt = job_meta.get('campaignPrompt', '')
#         contact_name = job_meta.get('contactName', '')
#         if campaign_prompt:
#             logging.info("CAMPAIGN_PROMPT_FROM_DISPATCH | prompt_length=%d | source=dispatch_metadata", len(campaign_prompt))
#         if contact_name:
#             contact_info['name'] = contact_name
#             logging.info("CONTACT_NAME_FROM_DISPATCH | name=%s | source=dispatch_metadata", contact_name)
#     except Exception as e:
#         logging.warning("Failed to parse job metadata for campaign data: %s", str(e))
    
#     # Fallback to room metadata if not found in dispatch
#     if not campaign_prompt and hasattr(ctx.room, 'metadata') and ctx.room.metadata:
#         try:
#             room_meta = json.loads(ctx.room.metadata) if isinstance(ctx.room.metadata, str) else ctx.room.metadata
#             campaign_prompt = room_meta.get('campaignPrompt', '')
#             contact_info = room_meta.get('contactInfo', {})
#             if campaign_prompt:
#                 logging.info("CAMPAIGN_PROMPT_FROM_ROOM | prompt_length=%d | source=room_metadata", len(campaign_prompt))
#         except Exception as e:
#             logging.warning("Failed to parse room metadata for campaign info: %s", str(e))
    
#     # Extract contact info from room metadata (still needed for other purposes)
#     if not contact_info and hasattr(ctx.room, 'metadata') and ctx.room.metadata:
#         try:
#             room_meta = json.loads(ctx.room.metadata) if isinstance(ctx.room.metadata, str) else ctx.room.metadata
#             contact_info = room_meta.get('contactInfo', {})
#         except Exception as e:
#             logging.warning("Failed to parse room metadata for contact info: %s", str(e))
    
#     logging.info("CAMPAIGN_METADATA | has_prompt=%s | contact_name=%s | contact_phone=%s | prompt_source=%s", 
#                 bool(campaign_prompt), 
#                 contact_info.get('name', 'Unknown'),
#                 contact_info.get('phone', 'Unknown'),
#                 'dispatch' if campaign_prompt and 'dispatch' in str(ctx.job.metadata) else 'room')
    
#     # --- Call tracking setup ----------------------------------------
#     start_time = datetime.datetime.now()
#     call_id = str(uuid.uuid4())
#     logging.info("CALL_START | call_id=%s | start_time=%s", call_id, start_time.isoformat())
    
#     # --- Recording setup --------------------------------------------
#     recording_sid = None
#     call_sid = None

#     # Extract Call SID from participant attributes
#     # The Call SID is available in participantAttributes as sip.twilio.callSid
#     try:
#         logging.info("PARTICIPANT_DEBUG | participant_type=%s | has_attributes=%s",
#                     type(participant).__name__, hasattr(participant, 'attributes'))

#         if hasattr(participant, 'attributes') and participant.attributes:
#             logging.info("PARTICIPANT_ATTRIBUTES_DEBUG | attributes=%s", participant.attributes)

#             # Check for sip.twilio.callSid in attributes
#             if hasattr(participant.attributes, 'get'):
#                 call_sid = participant.attributes.get('sip.twilio.callSid')
#                 if call_sid:
#                     logging.info("CALL_SID_FROM_PARTICIPANT_ATTRIBUTES | call_sid=%s", call_sid)

#             # Also try direct attribute access
#             if not call_sid and hasattr(participant.attributes, 'sip'):
#                 sip_attrs = participant.attributes.sip
#                 if hasattr(sip_attrs, 'twilio') and hasattr(sip_attrs.twilio, 'callSid'):
#                     call_sid = sip_attrs.twilio.callSid
#                     if call_sid:
#                         logging.info("CALL_SID_FROM_SIP_ATTRIBUTES | call_sid=%s", call_sid)
#         else:
#             logging.info("NO_PARTICIPANT_ATTRIBUTES | has_attributes=%s", hasattr(participant, 'attributes'))

#     except Exception as e:
#         logging.warning("Failed to get call_sid from participant attributes: %s", str(e))

#     # Fallback: Try to extract call SID from room metadata or participant metadata
#     if not call_sid and hasattr(ctx.room, 'metadata') and ctx.room.metadata:
#         try:
#             room_meta = json.loads(ctx.room.metadata) if isinstance(ctx.room.metadata, str) else ctx.room.metadata
#             call_sid = room_meta.get('call_sid') or room_meta.get('CallSid') or room_meta.get('provider_id')
#             if call_sid:
#                 logging.info("CALL_SID_FROM_ROOM_METADATA | call_sid=%s", call_sid)
#         except Exception as e:
#             logging.warning("Failed to parse room metadata for call_sid: %s", str(e))

#     if not call_sid and hasattr(participant, 'metadata') and participant.metadata:
#         try:
#             participant_meta = json.loads(participant.metadata) if isinstance(participant.metadata, str) else participant.metadata
#             call_sid = participant_meta.get('call_sid') or participant_meta.get('CallSid') or participant_meta.get('provider_id')
#             if call_sid:
#                 logging.info("CALL_SID_FROM_PARTICIPANT_METADATA | call_sid=%s", call_sid)
#         except Exception as e:
#             logging.warning("Failed to parse participant metadata for call_sid: %s", str(e))

#     # Start recording if we have a call SID and recording is enabled
#     if call_sid and recording_service.is_enabled():
#         try:
#             # Start recording immediately - no delay needed
#             # The call might be very short (6 seconds), so we need to act fast
#             logging.info("STARTING_RECORDING_IMMEDIATELY | call_sid=%s", call_sid)
            
#             recording_result = await recording_service.start_recording(
#                 call_sid=call_sid,
#                 recording_options={
#                     "RecordingChannels": "dual",
#                     "RecordingTrack": "both", 
#                     "PlayBeep": True,
#                     "Trim": "do-not-trim",
#                     "Transcribe": True,
#                 }
#             )
#             if recording_result:
#                 recording_sid = recording_result.get("sid")
#                 logging.info("RECORDING_STARTED | call_sid=%s | recording_sid=%s", call_sid, recording_sid)
#             else:
#                 logging.warning("RECORDING_START_FAILED | call_sid=%s", call_sid)
#         except Exception as e:
#             logging.exception("RECORDING_ERROR | call_sid=%s | error=%s", call_sid, str(e))
#     else:
#         if not call_sid:
#             logging.warning("RECORDING_SKIPPED | no_call_sid_found")
#         if not recording_service.is_enabled():
#             logging.warning("RECORDING_SKIPPED | service_disabled")
#     # ----------------------------------------------------------------

#     # --- Resolve assistantId (same as before) -----------------------
#     resolver_meta: dict = {}
#     resolver_label: str = "none"

#     p_meta, p_kind = ({}, "none")
#     if participant.metadata:
#         p_meta, p_kind = _parse_json_or_b64(participant.metadata)

#     r_meta_raw = getattr(ctx.room, "metadata", "") or ""
#     r_meta, r_kind = ({}, "none")
#     if r_meta_raw:
#         r_meta, r_kind = _parse_json_or_b64(r_meta_raw)

#     id_sources: list[tuple[str, dict]] = [
#         (f"participant.{p_kind}", p_meta),
#         (f"room.{r_kind}", r_meta),
#     ]

#     assistant_id, id_src = choose_from_sources(
#         id_sources,
#         ("assistantId",),
#         ("assistant", "id"),
#         default=None,
#     )

#     # No environment variable fallback for assistant_id - must be provided via participant/room metadata or resolver

#     backend_url = os.getenv("BACKEND_URL", "http://localhost:4000").rstrip("/")
#     resolver_path = os.getenv("ASSISTANT_RESOLVER_PATH", "/api/v1/livekit/assistant").lstrip("/")
#     base_resolver = f"{backend_url}/{resolver_path}".rstrip("/")

#     if not assistant_id and called_did:
#         q = urllib.parse.urlencode({"number": called_did})
#         for path in ("by-number", ""):
#             url = f"{base_resolver}/{path}?{q}" if path else f"{base_resolver}?{q}"
#             data = _http_get_json(url)
#             if data and data.get("success") and isinstance(data.get("assistant"), dict):
#                 assistant_id = data["assistant"].get("id") or None
#                 if assistant_id:
#                     resolver_meta = {
#                         "assistant": {
#                             "id": assistant_id,
#                             "name": data["assistant"].get("name"),
#                             "prompt": data["assistant"].get("prompt"),
#                             "firstMessage": data["assistant"].get("firstMessage"),
#                         },
#                         "cal_api_key": data.get("cal_api_key"),
#                         "cal_event_type_id": (
#                             str(data.get("cal_event_type_id"))
#                             if data.get("cal_event_type_id") is not None else None
#                         ),
#                         "cal_timezone": data.get("cal_timezone"),
#                     }
#                     resolver_label = "resolver.by_number"
#                     id_src = f"{resolver_label}.assistant.id"
#                     break

#     if assistant_id:
#         supabase_url = os.getenv("SUPABASE_URL", "").strip()
#         supabase_key = (
#             os.getenv("SUPABASE_SERVICE_ROLE", "").strip()
#             or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
#         )
#         logging.info("SUPABASE_CHECK | url_present=%s | key_present=%s | create_client=%s",
#                      bool(supabase_url), bool(supabase_key), create_client is not None)
#         used_supabase = False
#         if create_client and supabase_url and supabase_key:
#             try:
#                 sb: Client = create_client(supabase_url, supabase_key)  # type: ignore
#                 resp = sb.table("assistant").select(
#                     "id, name, prompt, first_message, cal_api_key, cal_event_type_id, cal_timezone, llm_provider_setting, llm_model_setting, temperature_setting, max_token_setting"
#                 ).eq("id", assistant_id).single().execute()
#                 row = resp.data
#                 print("row", row)
#                 if row:
#                     resolver_meta = {
#                         "assistant": {
#                             "id": row.get("id") or assistant_id,
#                             "name": row.get("name") or "Assistant",
#                             "prompt": row.get("prompt") or "",
#                             "firstMessage": row.get("first_message") or "",
#                             "llm_provider": row.get("llm_provider_setting") or "OpenAI",
#                             "llm_model": row.get("llm_model_setting") or "gpt-4o-mini",
#                             "temperature": row.get("temperature_setting") or 0.1,
#                             "max_tokens": row.get("max_token_setting") or 250,
#                         },
#                         "cal_api_key": row.get("cal_api_key"),
#                         "cal_event_type_id": row.get("cal_event_type_id"),
#                         "cal_timezone": row.get("cal_timezone") or "UTC",
#                     }
#                     resolver_label = "resolver.supabase"
#                     used_supabase = True
#             except Exception:
#                 logging.exception("SUPABASE_ERROR | assistant fetch failed")

#         if not used_supabase:
#             url = f"{base_resolver}/{assistant_id}"
#             data = _http_get_json(url)
#             if data and data.get("success") and isinstance(data.get("assistant"), dict):
#                 a = data["assistant"]
#                 resolver_meta = {
#                     "assistant": {
#                         "id": a.get("id") or assistant_id,
#                         "name": a.get("name"),
#                         "prompt": a.get("prompt"),
#                         "firstMessage": a.get("firstMessage"),
#                         "llm_provider": a.get("llm_provider_setting") or "OpenAI",
#                         "llm_model": a.get("llm_model_setting") or "gpt-4o-mini",
#                         "temperature": a.get("temperature_setting") or 0.1,
#                         "max_tokens": a.get("max_token_setting") or 250,
#                     },
#                     "cal_api_key": data.get("cal_api_key"),
#                     "cal_event_type_id": (
#                         str(data.get("cal_event_type_id"))
#                         if data.get("cal_event_type_id") is not None else None
#                     ),
#                     "cal_timezone": data.get("cal_timezone"),
#                 }
#                 resolver_label = "resolver.id_http"
#             else:
#                 resolver_label = "resolver.error"

#     logging.info("ASSISTANT_ID | value=%s | source=%s | resolver=%s", assistant_id or "<none>", id_src, resolver_label)

#     # Check if we have assistant data - if not, we can't proceed
#     if not assistant_id or not resolver_meta.get("assistant"):
#         logging.error("NO_ASSISTANT_FOUND | assistant_id=%s | resolver_meta_present=%s", 
#                      assistant_id or "<none>", bool(resolver_meta.get("assistant")))
#         # For now, we'll use minimal defaults, but in production you might want to fail the call
#         logging.warning("Using minimal defaults - assistant data not found")
#         resolver_meta = {
#             "assistant": {
#                 "id": assistant_id or "unknown",
#                 "name": "Assistant",
#                 "prompt": "You are a helpful voice assistant.",
#                 "firstMessage": "",
#                 "llm_provider": "OpenAI",
#                 "llm_model": "gpt-4o-mini",
#                 "temperature": 0.1,
#                 "max_tokens": 250,
#             }
#         }

#     # --- Build instructions strictly from RESOLVED ASSISTANT ONLY ----------
#     assistant_name = (resolver_meta.get("assistant") or {}).get("name") or "Assistant"
#     base_prompt = (resolver_meta.get("assistant") or {}).get("prompt") or "You are a helpful voice assistant."
#     first_message = (resolver_meta.get("assistant") or {}).get("firstMessage") or ""
    
#     # --- Enhance prompt with campaign information ---------------------
#     if campaign_prompt and contact_info:
#         # Replace placeholders in campaign prompt with actual contact information
#         enhanced_prompt = campaign_prompt.replace('{name}', contact_info.get('name', 'there'))
#         enhanced_prompt = enhanced_prompt.replace('{email}', contact_info.get('email', 'your email'))
#         enhanced_prompt = enhanced_prompt.replace('{phone}', contact_info.get('phone', 'your phone number'))
        
#         # Combine base prompt with campaign context
#         prompt = f"""{base_prompt}

# CAMPAIGN CONTEXT:
# You are making an outbound call as part of a campaign. Follow this script:
# {enhanced_prompt}

# CONTACT INFORMATION:
# - Name: {contact_info.get('name', 'Unknown')}
# - Email: {contact_info.get('email', 'Not provided')}
# - Phone: {contact_info.get('phone', 'Not provided')}

# Use this information to personalize your conversation and follow the campaign script."""
        
#         logging.info("ENHANCED_PROMPT | campaign_prompt_length=%d | contact_name=%s | enhanced_prompt=%s", 
#                     len(enhanced_prompt), contact_info.get('name', 'Unknown'), enhanced_prompt)
#     else:
#         logging.info("NO_CAMPAIGN_CONTEXT | campaign_prompt=%s | contact_info=%s", campaign_prompt, contact_info)
#         prompt = base_prompt

#     # Calendar (from resolver only)
#     cal_api_key = resolver_meta.get("cal_api_key")
#     cal_event_type_id = resolver_meta.get("cal_event_type_id")
#     cal_timezone = resolver_meta.get("cal_timezone") or "UTC"

#     # First line - only use the first message from the fetched assistant
#     force_first = (os.getenv("FORCE_FIRST_MESSAGE", "true").lower() != "false")
#     # No fallback first message generation - only use what's in the assistant data

#     # Softer flow policy
#     flow_instructions = """
# GUIDED CALL POLICY (be natural, not rigid):
# - Prefer one tool call per caller turn. (Parallel tool calls are disabled.)
# - Only pass values the caller actually said—no placeholders.
# - If they mention symptoms, be empathetic, then ask if they want to book.
# - If they want to book:
#   1) Ask for the reason -> set_notes(reason).
#   2) Ask for a day -> list_slots_on_day(day), read numbered options.
#   3) They pick -> choose_slot(option).
#   4) Collect name -> email -> phone (one by one).
#   5) Read back summary. If yes -> confirm_details(); if no -> confirm_details_no() and fix it, then repeat.
# """

#     instructions = prompt + "\n\n" + flow_instructions
#     calendar: Calendar | None = None
#     if cal_api_key and cal_event_type_id:
#         try:
#             calendar = CalComCalendar(
#                 api_key=str(cal_api_key),
#                 timezone=str(cal_timezone or "UTC"),
#                 event_type_id=int(cal_event_type_id),
#             )
#             await calendar.initialize()
#             instructions += " Tools available: confirm_wants_to_book_yes, set_notes, list_slots_on_day, choose_slot, provide_name, provide_email, provide_phone, confirm_details_yes, confirm_details_no, finalize_booking."
#             logging.info("CALENDAR_READY | event_type_id=%s | tz=%s", cal_event_type_id, cal_timezone)
#         except Exception:
#             logging.exception("Failed to initialize Cal.com calendar")

#     # Handle first message based on call type
#     if phone_number is not None:
#         # OUTBOUND CALL: Wait for user to speak first (customary for outbound calls)
#         if force_first and campaign_prompt and contact_info:
#             # Set up the campaign message but don't speak immediately
#             fallback_message = f"Hello {contact_info.get('name', 'there')}, this is an important call. {campaign_prompt.replace('{name}', contact_info.get('name', 'there'))}"
#             instructions += f' IMPORTANT: When the user speaks first, respond naturally and then say: "{fallback_message}"'
#             logging.info("OUTBOUND_FIRST_MESSAGE_SET | fallback_message=%s", fallback_message)
#         else:
#             instructions += ' IMPORTANT: Wait for the user to speak first, then respond naturally.'
#             logging.info("OUTBOUND_WAIT_FOR_USER | no_immediate_greeting")
#     else:
#         # INBOUND CALL: Greet immediately
#         if force_first and first_message:
#             instructions += f' IMPORTANT: Begin the call by saying: "{first_message}"'
#             logging.info("INBOUND_FIRST_MESSAGE_SET | first_message=%s", first_message)
#         elif force_first and campaign_prompt and contact_info:
#             # Fallback first message for campaign calls
#             fallback_message = f"Hello {contact_info.get('name', 'there')}, this is an important call. {campaign_prompt.replace('{name}', contact_info.get('name', 'there'))}"
#             instructions += f' IMPORTANT: Begin the call by saying: "{fallback_message}"'
#             logging.info("INBOUND_FALLBACK_FIRST_MESSAGE_SET | fallback_message=%s", fallback_message)
#         else:
#             logging.info("NO_FIRST_MESSAGE | force_first=%s | first_message=%s | campaign_prompt=%s", force_first, first_message, campaign_prompt)

#     logging.info("PROMPT_TRACE_FINAL | sha256=%s | len=%d | preview=%s",
#                  sha256_text(instructions), len(instructions), preview(instructions))
#     # -----------------------------------------------------------------------

#     # --- OpenAI + VAD configuration ----------------------------------------
#     # Use OPENAI_API_KEY primarily; fall back to OPENAI_API if that's what you set.
#     openai_api_key = os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_API")
#     if not openai_api_key:
#         logging.warning("OPENAI_API_KEY/OPENAI_API not set; OpenAI plugins will fail to auth.")  # plugin reads env too

#     # Get model configuration from assistant data
#     assistant_data = resolver_meta.get("assistant", {})
#     llm_model = assistant_data.get("llm_model", os.getenv("OPENAI_LLM_MODEL", "gpt-4o-mini"))
    
#     # Fix model name format - OpenAI expects lowercase with hyphens
#     original_model = llm_model
#     if llm_model == "GPT-4o Mini":
#         llm_model = "gpt-4o-mini"
#     elif llm_model == "GPT-4o":
#         llm_model = "gpt-4o"
#     elif llm_model == "GPT-4":
#         llm_model = "gpt-4"
    
#     if original_model != llm_model:
#         logging.info("MODEL_NAME_FIXED | original=%s | fixed=%s", original_model, llm_model)
    
#     temperature = assistant_data.get("temperature", 0.1)
#     max_tokens = assistant_data.get("max_tokens", 250)
    
#     # STT and TTS models still use environment variables as they're not configurable per assistant
#     stt_model = os.getenv("OPENAI_STT_MODEL", "gpt-4o-transcribe")
#     tts_model = os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
#     tts_voice = os.getenv("OPENAI_TTS_VOICE", "alloy")
    
#     logging.info("MODEL_CONFIG | llm_model=%s | temperature=%s | max_tokens=%s", llm_model, temperature, max_tokens)

#     # Load / reuse VAD (required because OpenAI STT is non-streaming; VAD gates turns)
#     vad = ctx.proc.userdata.get("vad") if hasattr(ctx, "proc") else None
#     if vad is None:
#         # Fallback if prewarm didn't run
#         vad = silero.VAD.load()

#     session = AgentSession(
#         # 👇 VAD fixes the “STT does not support streaming” error
#         turn_detection="vad",
#         vad=vad,

#         # OpenAI STT / LLM / TTS
#         stt=lk_openai.STT(model=stt_model, api_key=openai_api_key),
#         llm=lk_openai.LLM(
#             model=llm_model,
#             api_key=openai_api_key,
#             temperature=temperature,
#             parallel_tool_calls=False,  # align with our FSM guard
#             tool_choice="auto",
#         ),
#         tts=lk_openai.TTS(model=tts_model, voice=tts_voice, api_key=openai_api_key),
#     )

#     logging.info("STARTING_SESSION | instructions_length=%d | has_calendar=%s", 
#                 len(instructions), calendar is not None)
    
#     await session.start(
#         room=ctx.room,
#         agent=Assistant(instructions=instructions, calendar=calendar),
#     )
    
#     logging.info("SESSION_STARTED | session_active=%s", session is not None)

#     # Add shutdown callback to save call history
#     async def save_call_on_shutdown():
#         end_time = datetime.datetime.now()
#         logging.info("CALL_END | call_id=%s | end_time=%s", call_id, end_time.isoformat())
        
#         # Get session history
#         session_history = []
#         try:
#             if hasattr(session, 'history') and session.history:
#                 # Convert session history to list format
#                 history_dict = session.history.to_dict()
#                 if "items" in history_dict:
#                     session_history = history_dict["items"]
#                     logging.info("SESSION_HISTORY_RETRIEVED | items_count=%d", len(session_history))
#                 else:
#                     logging.warning("SESSION_HISTORY_NO_ITEMS | history_dict_keys=%s", list(history_dict.keys()) if history_dict else "None")
#             else:
#                 logging.warning("SESSION_HISTORY_NOT_AVAILABLE | has_history_attr=%s | history_exists=%s", 
#                                hasattr(session, 'history'), bool(getattr(session, 'history', None)))
#         except Exception as e:
#             logging.warning("Failed to get session history: %s", str(e))
        
#         # Save to Supabase
#         await save_call_history_to_supabase(
#             call_id=call_id,
#             assistant_id=assistant_id or "unknown",
#             called_did=called_did or "unknown",
#             start_time=start_time,
#             end_time=end_time,
#             session_history=session_history,
#             participant_identity=participant.identity if participant else None,
#             recording_sid=recording_sid,
#             call_sid=call_sid
#         )
    
#     ctx.add_shutdown_callback(save_call_on_shutdown)

#     # Kick off with empty user_input; greeting comes from instructions
#     logging.info("STARTING_SESSION_RUN | user_input=empty")
#     await session.run(user_input="")
#     logging.info("SESSION_RUN_COMPLETED")
#     # -----------------------------------------------------------------------

# def prewarm(proc: agents.JobProcess):
#     """Preload VAD so it’s instantly available for sessions."""
#     try:
#         proc.userdata["vad"] = silero.VAD.load()
#     except Exception:
#         logging.exception("Failed to prewarm Silero VAD")

# if __name__ == "__main__":
#     # Check required environment variables
#     required_vars = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"]
#     missing_vars = [var for var in required_vars if not os.getenv(var)]
    
#     if missing_vars:
#         logging.error("❌ Missing required environment variables: %s", ", ".join(missing_vars))
#         logging.error("Please set these variables in your .env file or environment")
#         sys.exit(1)
    
#     # Log configuration
#     livekit_url = os.getenv("LIVEKIT_URL")
#     agent_name = os.getenv("LK_AGENT_NAME", "ai")
#     sip_trunk_id = os.getenv("SIP_TRUNK_ID")
#     logging.info("🚀 Starting LiveKit agent")
#     logging.info("📡 LiveKit URL: %s", livekit_url)
#     logging.info("🤖 Agent name: %s", agent_name)
#     logging.info("📞 SIP_TRUNK_ID: %s", sip_trunk_id)
#     logging.info("🔍 Environment check: LIVEKIT_URL=%s, LIVEKIT_API_KEY=%s, LIVEKIT_API_SECRET=%s", 
#                 bool(os.getenv("LIVEKIT_URL")), bool(os.getenv("LIVEKIT_API_KEY")), bool(os.getenv("LIVEKIT_API_SECRET")))
    
#     logging.info("🔧 WorkerOptions: agent_name=%s, entrypoint_fnc=%s", agent_name, entrypoint.__name__)
#     logging.info("🎯 Agent is ready to receive dispatches!")
    
#     agents.cli.run_app(
#         agents.WorkerOptions(
#             entrypoint_fnc=entrypoint,
#             prewarm_fnc=prewarm,  # ✅ ensures VAD is ready
#             agent_name=agent_name,
#         )
#     )




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
from cal_calendar_api import Calendar, CalComCalendar, AvailableSlot, SlotUnavailableError

# Assistant service (used for INBOUND only)
from services.assistant import Assistant

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
                transcription.append({
                    "role": item["role"],
                    "content": item["content"]
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
            "transcription": transcription,
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
            except Exception as e:
                logging.warning("Failed to get session history: %s", str(e))

            # Use agentId from job if present; otherwise mark as "campaign"
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
                    "id, name, prompt, first_message, cal_api_key, cal_event_type_id, cal_timezone, llm_provider_setting, llm_model_setting, temperature_setting, max_token_setting"
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

    # First message (INBOUND greets)
    force_first = (os.getenv("FORCE_FIRST_MESSAGE", "true").lower() != "false")
    if force_first and first_message:
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

    await session.start(
        room=ctx.room,
        agent=Assistant(instructions=instructions, calendar=calendar),
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
