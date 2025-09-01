// server/livekit-sip.js
import express from 'express';
import crypto from 'crypto';
import { SipClient } from 'livekit-server-sdk';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const livekitSipRouter = express.Router();

const lk = new SipClient(
  process.env.LIVEKIT_HOST,
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET,
);

// Optional Supabase client for dynamic assistant resolution (multi-assistant setups)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supa = (supabaseUrl && supabaseKey)
  ? createSupabaseClient(supabaseUrl, supabaseKey)
  : null;

// --- helpers ---------------------------------------------------------------

const toE164 = (n) => {
  if (!n) return n;
  const cleaned = String(n).replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('00')) return `+${cleaned.slice(2)}`;
  return `+${cleaned}`;
};

function readId(obj, ...keys) {
  for (const k of keys) if (obj && obj[k] != null) return obj[k];
  return undefined;
}

function sha256(s) {
  return crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
}

function preview(s, n = 80) {
  const str = String(s || '');
  return str.length > n ? `${str.slice(0, n)}…` : str;
}

async function resolveInboundTrunkId({ trunkId, trunkName }) {
  if (trunkId) return trunkId;
  if (process.env.LIVEKIT_INBOUND_TRUNK_ID) return process.env.LIVEKIT_INBOUND_TRUNK_ID;

  const trunks = await lk.listSipInboundTrunk();
  const desiredName = trunkName || process.env.LIVEKIT_INBOUND_TRUNK_NAME;

  if (desiredName) {
    const found = trunks.find(
      (t) =>
        readId(t, 'name') === desiredName ||
        readId(t, 'sip_trunk_id', 'sipTrunkId', 'id') === desiredName
    );
    if (found) return readId(found, 'sip_trunk_id', 'sipTrunkId', 'id');

    const created = await lk.createSipInboundTrunk({ name: desiredName, numbers: [] });
    return readId(created, 'sip_trunk_id', 'sipTrunkId', 'id');
  }

  if (trunks.length === 1) return readId(trunks[0], 'sip_trunk_id', 'sipTrunkId', 'id');

  throw new Error('Cannot resolve inbound trunk: pass trunkId or set LIVEKIT_INBOUND_TRUNK_ID (or provide LIVEKIT_INBOUND_TRUNK_NAME).');
}

// For Option B we do NOT need to mutate inbound trunk numbers.
async function ensureNumberOnInboundTrunk({ trunkId, phoneNumber }) {
  return toE164(phoneNumber);
}

async function deleteRulesForNumber({ phoneNumber }) {
  const all = await lk.listSipDispatchRule();
  const target = toE164(phoneNumber);
  const getNums = (r) => r?.inbound_numbers || r?.inboundNumbers || [];
  for (const r of all) {
    const nums = getNums(r);
    if (nums.includes(target)) {
      const id = readId(r, 'sip_dispatch_rule_id', 'sipDispatchRuleId', 'id');
      if (id) await lk.deleteSipDispatchRule({ sipDispatchRuleId: id });
    }
  }
}

// Extra: delete a catch-all rule that covers this trunk (DANGEROUS: affects all DIDs on trunk)
async function deleteCatchAllRuleForTrunk(trunkId) {
  const rules = await lk.listSipDispatchRule();
  for (const r of rules) {
    const trunks = r?.trunk_ids ?? r?.trunkIds ?? [];
    const nums = r?.inbound_numbers ?? r?.inboundNumbers ?? [];
    if ((trunks.length === 0 || trunks.includes(trunkId)) && nums.length === 0) {
      const id = readId(r, 'sip_dispatch_rule_id', 'sipDispatchRuleId', 'id');
      if (id) await lk.deleteSipDispatchRule({ sipDispatchRuleId: id });
      return id || null;
    }
  }
  return null;
}

// ---------- detect an existing rule that already covers this DID -------------
function getTrunkIds(r) { return r?.trunk_ids ?? r?.trunkIds ?? []; }
function getInboundNums(r) { return r?.inbound_numbers ?? r?.inboundNumbers ?? []; }
function getAgents(r) { return r?.roomConfig?.agents ?? []; }

async function findRuleCoveringTrunkAndNumber(trunkId, numE164) {
  const rules = await lk.listSipDispatchRule();
  return rules.find((r) => {
    const trunks = getTrunkIds(r);
    const nums = getInboundNums(r);
    const trunkMatches = trunks.length === 0 || trunks.includes(trunkId); // empty => all trunks
    const numberMatches = nums.length === 0 || nums.includes(numE164);     // empty => all numbers (catch-all)
    return trunkMatches && numberMatches;
  }) || null;
}

// ---------- NEW: resolve assistantId only (by body or phone -> mapping) -----
async function resolveAssistantId({ phoneNumber, assistantId }) {
  if (assistantId) return assistantId;
  if (!supa || !phoneNumber) return null;
  try {
    const { data: mapping, error } = await supa
      .from('phone_number')
      .select('inbound_assistant_id')
      .eq('number', toE164(phoneNumber))
      .single();
    if (error) throw error;
    return mapping?.inbound_assistant_id || null;
  } catch (e) {
    console.warn('assistantId resolution failed', e?.message || e);
    return null;
  }
}

// ---------- helper to build the *minimal* agent/room metadata ---------------
function buildAgentMetadataJson({
  agentName,
  assistantId,
  forceFirstMessage = true,
  llm_model,
  stt_model,
  tts_model,
}) {
  // Only include assistantId and knobs the worker may want.
  const meta = { agentName, assistantId, forceFirstMessage };
  if (llm_model) meta.llm_model = llm_model;
  if (stt_model) meta.stt_model = stt_model;
  if (tts_model) meta.tts_model = tts_model;
  return JSON.stringify(meta);
}

// create a rule for this DID → dispatch your agent, including MINIMAL METADATA
async function createRuleForNumber({
  trunkId,
  phoneNumber,
  agentName,
  metadata,
  roomPrefix = 'did-',
  agentMetadataJson = '',
}) {
  const num = toE164(phoneNumber);
  const name = `auto:${agentName}:${num}`;
  const meta = typeof metadata === 'string'
    ? metadata
    : JSON.stringify(metadata || { phoneNumber: num, agentName });

  // JS SDK signature: createSipDispatchRule(rule, options)
  const rule = { type: 'individual', roomPrefix };
  const options = {
    name,
    trunkIds: [trunkId],
    inboundNumbers: [num], // scope rule to this DID
    roomConfig: {
      agents: [{ agentName, metadata: agentMetadataJson || '' }],
      metadata: agentMetadataJson || '', // room-level mirror
    },
    metadata: meta, // rule metadata
  };

  console.log('createRuleForNumber', options);

  // Will throw if a conflicting rule already exists
  return await lk.createSipDispatchRule(rule, options);
}

// --- routes ----------------------------------------------------------------

livekitSipRouter.get('/sip/inbound-trunks', async (_req, res) => {
  try {
    const trunks = await lk.listSipInboundTrunk();
    res.json({ success: true, trunks });
  } catch (e) {
    console.error('list inbound trunks', e);
    res.status(500).json({ success: false, message: e?.message || 'Failed' });
  }
});

livekitSipRouter.get('/sip/dispatch-rules', async (_req, res) => {
  try {
    const rules = await lk.listSipDispatchRule();
    res.json({ success: true, rules });
  } catch (e) {
    console.error('list dispatch rules', e);
    res.status(500).json({ success: false, message: e?.message || 'Failed' });
  }
});

/**
 * POST /api/v1/livekit/auto-assign
 * body: {
 *   phoneNumber: "+19862108561",
 *   agentName?: "ai",               // or set LK_AGENT_NAME env
 *   assistantId?: "uuid-...",
 *   llm_model?: "llama-3.3-70b-versatile",
 *   stt_model?: "nova-3",
 *   tts_model?: "aura-asteria-en",
 *   replaceCatchAll?: false,        // delete catch-all to allow per-DID rule
 *   forceReplace?: false,           // remove number-specific rules before create
 *   trunkId?: "ST_xxx" | trunkName?: "livekitInbound",
 *   roomPrefix?: "did-",
 *   extraMetadata?: { ... }         // copied into rule.metadata (diagnostic)
 * }
 */
livekitSipRouter.post('/auto-assign', async (req, res) => {
  try {
    const {
      phoneNumber,
      agentName: bodyAgentName,
      assistantId,              // <- we accept it directly
      llm_model,
      stt_model,
      tts_model,
      replaceCatchAll = false,
      forceReplace = false,
      trunkId,
      trunkName,
      roomPrefix = 'did-',
      extraMetadata = {},
    } = req.body || {};

    const agentName = bodyAgentName || process.env.LK_AGENT_NAME;
    if (!phoneNumber || !agentName) {
      return res.status(400).json({
        success: false,
        message: 'phoneNumber and agentName are required (set LK_AGENT_NAME env or send in body)',
      });
    }

    const inboundTrunkId = await resolveInboundTrunkId({ trunkId, trunkName });
    const e164 = await ensureNumberOnInboundTrunk({ trunkId: inboundTrunkId, phoneNumber });

    // Resolve assistantId if not provided (via Supabase phone -> assistant mapping)
    const assistantIdFinal = await resolveAssistantId({ phoneNumber: e164, assistantId });

    // Build MINIMAL agent/room metadata (only assistantId + knobs)
    const agentMetadataJson = buildAgentMetadataJson({
      agentName,
      assistantId: assistantIdFinal || null,
      forceFirstMessage: true,
      llm_model, stt_model, tts_model,
    });

    console.log(agentMetadataJson,"agentMetadataJson")

    // Optional debug
    const promptHash = assistantIdFinal ? sha256(assistantIdFinal) : ''; // just to have a stable debug token

    // Check if something already covers this trunk+number
    const existing = await findRuleCoveringTrunkAndNumber(inboundTrunkId, e164);
    const existingId = readId(existing, 'sip_dispatch_rule_id', 'sipDispatchRuleId', 'id');
    const existingIsCatchAll = existing ? (getInboundNums(existing).length === 0) : false;
    const existingHasAgentMeta = !!(getAgents(existing)[0]?.metadata);

    if (existing) {
      if (existingIsCatchAll && replaceCatchAll) {
        await lk.deleteSipDispatchRule({ sipDispatchRuleId: existingId });
      } else if (forceReplace) {
        await deleteRulesForNumber({ phoneNumber: e164 });
      } else {
        // Reuse as-is
        return res.json({
          success: true,
          reused: true,
          trunkId: inboundTrunkId,
          phoneNumber: e164,
          sipDispatchRuleId: existingId,
          rule: existing,
          debug: {
            reusedCatchAll: existingIsCatchAll,
            existingHasAgentMeta,
            assistantId: assistantIdFinal || null,
            note: existingIsCatchAll && !existingHasAgentMeta
              ? 'Reused a catch-all rule; worker will fall back to its defaults unless it reads assistantId from elsewhere.'
              : 'Reused existing rule.',
          },
        });
      }
    }

    // Create a new per-DID rule with MINIMAL metadata
    const ruleMeta = {
      phoneNumber: e164,
      agentName,
      assistantId: assistantIdFinal || null,
      ...extraMetadata,
    };

    const rule = await createRuleForNumber({
      trunkId: inboundTrunkId,
      phoneNumber: e164,
      agentName,
      metadata: ruleMeta,
      roomPrefix,
      agentMetadataJson,
    });

    res.json({
      success: true,
      reused: false,
      trunkId: inboundTrunkId,
      phoneNumber: e164,
      sipDispatchRuleId: readId(rule, 'sip_dispatch_rule_id', 'sipDispatchRuleId', 'id'),
      rule,
      debug: {
        assistantId: assistantIdFinal || null,
        agentMetadataBytes: agentMetadataJson.length,
        metaPreview: preview(agentMetadataJson, 120),
        tokenSha256: promptHash,
        note: 'Created per-DID rule carrying only assistantId; worker should fetch full prompt via /assistant/:id.',
      },
    });
  } catch (e) {
    console.error('auto-assign error', e);
    res.status(500).json({ success: false, message: e?.message || 'Auto-assign failed' });
  }
});

// Resolve assistant by id (for workers to fetch full metadata by assistantId only)
livekitSipRouter.get('/assistant/:id', async (req, res) => {
  if (!supa) return res.status(500).json({ success: false, message: 'Supabase not configured' });
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'assistant id required' });

    const { data: assistant, error } = await supa
      .from('assistant')
      .select('id, name, prompt, first_message, cal_api_key, cal_event_type_id, cal_timezone')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (!assistant) return res.status(404).json({ success: false, message: 'assistant not found' });

    const payload = {
      success: true,
      assistant: {
        id: assistant.id,
        name: assistant.name || 'Assistant',
        prompt: assistant.prompt || '',
        firstMessage: assistant.first_message || '',
      },
      cal_api_key: assistant.cal_api_key || undefined,
      cal_event_type_id: assistant.cal_event_type_id || undefined,
      cal_timezone: assistant.cal_timezone || undefined,
    };
    return res.json(payload);
  } catch (e) {
    console.error('assistant resolve error', e);
    return res.status(500).json({ success: false, message: e?.message || 'resolve failed' });
  }
});
