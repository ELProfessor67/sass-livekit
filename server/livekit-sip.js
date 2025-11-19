
import express from 'express';
import crypto from 'crypto';
import { SipClient } from 'livekit-server-sdk';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const livekitSipRouter = express.Router();

// ------------------- logging helpers -------------------
const START = Date.now();
const red = (s) => (s ? `${String(s).slice(0, 4)}…redacted` : 'not-set');
const ts = () => new Date().toISOString();
const rid = () => Math.random().toString(36).slice(2, 10);
function log(ctx, msg, extra = {}) {
  const base = { t: ts(), rid: ctx.rid, route: ctx.route, ...extra };
  console.log(`[LK-SIP] ${msg} ::`, JSON.stringify(base));
}
function logErr(ctx, msg, err) {
  const extra = { t: ts(), rid: ctx.rid, route: ctx.route, err: err?.message || String(err) };
  console.error(`[LK-SIP][ERR] ${msg} ::`, JSON.stringify(extra));
}

// ------------------- env & client init -----------------
const env = {
  LIVEKIT_HOST: process.env.LIVEKIT_HOST,
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
  LIVEKIT_INBOUND_TRUNK_ID: process.env.LIVEKIT_INBOUND_TRUNK_ID,
  LIVEKIT_INBOUND_TRUNK_NAME: process.env.LIVEKIT_INBOUND_TRUNK_NAME,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

console.log('[LK-SIP] boot', JSON.stringify({
  t: ts(),
  uptimeMs: Date.now() - START,
  host: env.LIVEKIT_HOST,
  lkApiKey: red(env.LIVEKIT_API_KEY),
  lkApiSecret: red(env.LIVEKIT_API_SECRET),
  trunkId: env.LIVEKIT_INBOUND_TRUNK_ID || null,
  trunkName: env.LIVEKIT_INBOUND_TRUNK_NAME || null,
  supaUrl: env.SUPABASE_URL || null,
  supaKey: red(env.SUPABASE_SERVICE_ROLE_KEY),
}));

const lk = new SipClient(env.LIVEKIT_HOST, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);

const supa = (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
  ? createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// ------------------- helpers ---------------------------
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

function sha256(s) { return crypto.createHash('sha256').update(String(s), 'utf8').digest('hex'); }
function preview(s, n = 80) { const str = String(s || ''); return str.length > n ? `${str.slice(0, n)}…` : str; }

async function resolveInboundTrunkId(ctx, { trunkId, trunkName }) {
  if (trunkId) { log(ctx, 'resolveInboundTrunkId: using body trunkId', { trunkId }); return trunkId; }
  if (process.env.LIVEKIT_INBOUND_TRUNK_ID) {
    log(ctx, 'resolveInboundTrunkId: using env trunkId', { trunkId: process.env.LIVEKIT_INBOUND_TRUNK_ID });
    return process.env.LIVEKIT_INBOUND_TRUNK_ID;
  }

  const trunks = await lk.listSipInboundTrunk();
  log(ctx, 'resolveInboundTrunkId: listed trunks', { count: trunks.length });

  const desiredName = trunkName || process.env.LIVEKIT_INBOUND_TRUNK_NAME;
  if (desiredName) {
    const found = trunks.find((t) =>
      readId(t, 'name') === desiredName || readId(t, 'sip_trunk_id', 'sipTrunkId', 'id') === desiredName
    );
    if (found) {
      const id = readId(found, 'sip_trunk_id', 'sipTrunkId', 'id');
      log(ctx, 'resolveInboundTrunkId: found by name', { desiredName, id });
      return id;
    }
    const created = await lk.createSipInboundTrunk({ name: desiredName, numbers: [] });
    const id = readId(created, 'sip_trunk_id', 'sipTrunkId', 'id');
    log(ctx, 'resolveInboundTrunkId: created trunk', { desiredName, id });
    return id;
  }

  if (trunks.length === 1) {
    const id = readId(trunks[0], 'sip_trunk_id', 'sipTrunkId', 'id');
    log(ctx, 'resolveInboundTrunkId: single trunk used', { id });
    return id;
  }

  logErr(ctx, 'resolveInboundTrunkId: cannot resolve', new Error('multiple trunks; need name or id'));
  throw new Error('Cannot resolve inbound trunk: pass trunkId or set LIVEKIT_INBOUND_TRUNK_ID (or provide LIVEKIT_INBOUND_TRUNK_NAME).');
}

async function ensureNumberOnInboundTrunk(ctx, { trunkId, phoneNumber }) {
  const e164 = toE164(phoneNumber);
  log(ctx, 'ensureNumberOnInboundTrunk: normalized', { input: phoneNumber, e164, trunkId });
  return e164; // no mutation needed in LK for Option B
}

// --- robust deletion helper (handles SDK variations) -----------------------
async function deleteDispatchRule(ctx, id) {
  // Try camelCase first (common)
  try {
    await lk.deleteSipDispatchRule({ sipDispatchRuleId: id });
    log(ctx, 'deleteSipDispatchRule OK (camelCase)', { id });
    return;
  } catch (e1) {
    logErr(ctx, 'delete camelCase failed, trying positional', e1);
  }
  // Try positional (some SDKs allow deleteSipDispatchRule(id))
  try {
    await lk.deleteSipDispatchRule(id);
    log(ctx, 'deleteSipDispatchRule OK (positional)', { id });
    return;
  } catch (e2) {
    logErr(ctx, 'delete positional failed, trying snake_case', e2);
  }
  // Fallback: snake_case (older or generated variants)
  try {
    await lk.deleteSipDispatchRule({ sip_dispatch_rule_id: id });
    log(ctx, 'deleteSipDispatchRule OK (snake_case)', { id });
  } catch (e3) {
    logErr(ctx, 'deleteSipDispatchRule failed after 3 attempts', e3);
    throw e3;
  }
}

async function deleteRulesForNumber(ctx, { phoneNumber }) {
  const all = await lk.listSipDispatchRule();
  const target = toE164(phoneNumber);
  const getNums = (r) => r?.inbound_numbers || r?.inboundNumbers || [];
  let deleted = 0;
  for (const r of all) {
    const nums = getNums(r);
    if (nums.includes(target)) {
      const id = readId(r, 'sip_dispatch_rule_id', 'sipDispatchRuleId', 'id');
      if (id) { await deleteDispatchRule(ctx, id); deleted++; }
    }
  }
  log(ctx, 'deleteRulesForNumber: done', { phoneNumber: target, deleted });
}

function getTrunkIds(r) { return r?.trunk_ids ?? r?.trunkIds ?? []; }
function getInboundNums(r) { return r?.inbound_numbers ?? r?.inboundNumbers ?? []; }
function getAgents(r) { return r?.roomConfig?.agents ?? []; }

async function findRuleCoveringTrunkAndNumber(ctx, trunkId, numE164) {
  const rules = await lk.listSipDispatchRule();
  log(ctx, 'findRuleCoveringTrunkAndNumber: rules listed', { count: rules.length, trunkId, numE164 });
  const hit = rules.find((r) => {
    const trunks = getTrunkIds(r);
    const nums = getInboundNums(r);
    const trunkMatches = trunks.length === 0 || trunks.includes(trunkId);
    const numberMatches = nums.length === 0 || nums.includes(numE164);
    return trunkMatches && numberMatches;
  }) || null;
  if (hit) {
    log(ctx, 'findRuleCoveringTrunkAndNumber: match', {
      ruleId: readId(hit, 'sip_dispatch_rule_id', 'sipDispatchRuleId', 'id'),
      trunks: getTrunkIds(hit),
      numbers: getInboundNums(hit),
      agents: getAgents(hit).length,
    });
  } else {
    log(ctx, 'findRuleCoveringTrunkAndNumber: no match');
  }
  return hit;
}

async function resolveAssistantId(ctx, { phoneNumber, assistantId }) {
  if (assistantId) { log(ctx, 'assistantId: provided', { assistantId }); return assistantId; }
  if (!supa || !phoneNumber) { log(ctx, 'assistantId: no supabase or phoneNumber'); return null; }
  try {
    const { data: mapping, error } = await supa
      .from('phone_number')
      .select('inbound_assistant_id')
      .eq('number', toE164(phoneNumber))
      .single();
    if (error) throw error;
    const id = mapping?.inbound_assistant_id || null;
    log(ctx, 'assistantId: resolved from supabase', { phoneNumber: toE164(phoneNumber), assistantId: id });
    return id;
  } catch (e) {
    logErr(ctx, 'assistantId resolution failed (phone_number table may not exist yet)', e);
    return null;
  }
}

function buildAgentMetadataJson({ agentName, assistantId, forceFirstMessage = true, llm_model, stt_model, tts_model, }) {
  const meta = { agentName, assistantId, forceFirstMessage };
  if (llm_model) meta.llm_model = llm_model;
  if (stt_model) meta.stt_model = stt_model;
  if (tts_model) meta.tts_model = tts_model;
  return JSON.stringify(meta);
}

async function createRuleForNumber(ctx, { trunkId, phoneNumber, agentName, metadata, roomPrefix = 'did-', agentMetadataJson = '', }) {
  const num = toE164(phoneNumber);
  const name = `auto:${agentName}:${num}`;
  const meta = typeof metadata === 'string' ? metadata : JSON.stringify(metadata || { phoneNumber: num, agentName });

  const rule = { type: 'individual', roomPrefix };
  const options = {
    name,
    trunkIds: [trunkId],
    inbound_numbers: [num], // Try snake_case for API compatibility
    inboundNumbers: [num], // Keep camelCase for fallback
    roomConfig: {
      agents: [{ agentName, metadata: agentMetadataJson || '' }],
      metadata: agentMetadataJson || '',
    },
    metadata: meta,
  };

  log(ctx, 'createRuleForNumber: creating', {
    name,
    trunkId,
    inbound_numbers: options.inbound_numbers,
    roomPrefix,
    agentName,
    agentMetaPreview: preview(agentMetadataJson, 120),
  });

  const out = await lk.createSipDispatchRule(rule, options);
  const id = readId(out, 'sip_dispatch_rule_id', 'sipDispatchRuleId', 'id');
  log(ctx, 'createRuleForNumber: created', { ruleId: id });
  return out;
}

// ------------------- routes ----------------------------

livekitSipRouter.get('/sip/inbound-trunks', async (req, res) => {
  const ctx = { route: 'GET /sip/inbound-trunks', rid: rid() };
  try {
    const trunks = await lk.listSipInboundTrunk();
    log(ctx, 'listed inbound trunks', { count: trunks.length });
    res.json({ success: true, trunks });
  } catch (e) {
    logErr(ctx, 'list inbound trunks', e);
    res.status(500).json({ success: false, message: e?.message || 'Failed' });
  }
});

livekitSipRouter.get('/sip/dispatch-rules', async (req, res) => {
  const ctx = { route: 'GET /sip/dispatch-rules', rid: rid() };
  try {
    const rules = await lk.listSipDispatchRule();
    log(ctx, 'listed dispatch rules', { count: rules.length });
    res.json({ success: true, rules });
  } catch (e) {
    logErr(ctx, 'list dispatch rules', e);
    res.status(500).json({ success: false, message: e?.message || 'Failed' });
  }
});

// Clean up dispatch rules that don't have inboundNumbers field
livekitSipRouter.post('/sip/cleanup-rules', async (req, res) => {
  const ctx = { route: 'POST /sip/cleanup-rules', rid: rid() };
  log(ctx, 'starting cleanup of dispatch rules');
  
  try {
    const rules = await lk.listSipDispatchRule();
    log(ctx, 'found rules to check', { count: rules.length });
    
    let deletedCount = 0;
    let keptCount = 0;
    const deletedRules = [];
    
    for (const rule of rules) {
      const ruleId = readId(rule, 'sip_dispatch_rule_id', 'sipDispatchRuleId', 'id');
      const ruleName = rule.name || 'unnamed';
      const inboundNums = getInboundNums(rule);
      
      log(ctx, 'checking rule', { ruleId, ruleName, inboundNumsCount: inboundNums.length });
      
      // Check if this rule has inboundNumbers field
      if (inboundNums.length === 0) {
        log(ctx, 'deleting catch-all rule', { ruleId, ruleName });
        try {
          await deleteDispatchRule(ctx, ruleId);
          deletedCount++;
          deletedRules.push({ id: ruleId, name: ruleName });
        } catch (error) {
          logErr(ctx, 'failed to delete rule', error);
        }
      } else {
        log(ctx, 'keeping rule with inboundNumbers', { ruleId, ruleName, inboundNums });
        keptCount++;
      }
    }
    
    log(ctx, 'cleanup complete', { deletedCount, keptCount });
    
    res.json({
      success: true,
      message: `Cleanup complete. Deleted ${deletedCount} rules, kept ${keptCount} rules.`,
      deletedCount,
      keptCount,
      deletedRules,
    });
    
  } catch (e) {
    logErr(ctx, 'cleanup failed', e);
    res.status(500).json({ success: false, message: e?.message || 'Cleanup failed' });
  }
});

livekitSipRouter.post('/auto-assign', async (req, res) => {
  const ctx = { route: 'POST /auto-assign', rid: rid() };
  log(ctx, 'incoming body', { bodyPreview: preview(JSON.stringify(req.body || {}), 220) });

  try {
    const {
      phoneNumber,
      agentName: bodyAgentName,
      assistantId,
      llm_model,
      stt_model,
      tts_model,
      // enforce per-DID by default
      replaceCatchAll = true,
      forceReplace = false,
      trunkId,
      trunkName,
      roomPrefix = 'did-',
      extraMetadata = {},
    } = req.body || {};

    const agentName = bodyAgentName || process.env.LK_AGENT_NAME;
    if (!phoneNumber || !agentName) {
      logErr(ctx, 'missing required fields', new Error('phoneNumber and agentName required'));
      return res.status(400).json({
        success: false,
        message: 'phoneNumber and agentName are required (set LK_AGENT_NAME env or send in body)',
      });
    }

    log(ctx, 'step: resolve trunk');
    const inboundTrunkId = await resolveInboundTrunkId(ctx, { trunkId, trunkName });

    log(ctx, 'step: normalize number');
    const e164 = await ensureNumberOnInboundTrunk(ctx, { trunkId: inboundTrunkId, phoneNumber });

    log(ctx, 'step: resolve assistantId');
    const assistantIdFinal = await resolveAssistantId(ctx, { phoneNumber: e164, assistantId });

    const agentMetadataJson = buildAgentMetadataJson({
      agentName,
      assistantId: assistantIdFinal || null,
      forceFirstMessage: true,
      llm_model, stt_model, tts_model,
    });

    const promptHash = assistantIdFinal ? sha256(assistantIdFinal) : '';

    log(ctx, 'step: check existing rule');
    const existing = await findRuleCoveringTrunkAndNumber(ctx, inboundTrunkId, e164);

    // If there is any rule covering this DID, clean up so we can create a fresh per-DID rule
    if (existing) {
      const exId = readId(existing, 'sip_dispatch_rule_id', 'sipDispatchRuleId', 'id');
      const nums = getInboundNums(existing);
      const isCatchAll = nums.length === 0;

      log(ctx, 'existing rule found (per-DID enforcement path)', {
        existingId: exId,
        isCatchAll,
        coversNumbers: nums,
      });

      if (forceReplace) {
        log(ctx, 'forceReplace=true -> deleting all rules for this DID');
        await deleteRulesForNumber(ctx, { phoneNumber: e164 });
      }

      if (isCatchAll && replaceCatchAll) {
        log(ctx, 'deleting catch-all rule before creating per-DID', { existingId: exId });
        await deleteDispatchRule(ctx, exId);
      }

      if (!isCatchAll && nums.includes(e164)) {
        log(ctx, 'deleting existing per-DID rule for this number to recreate', { existingId: exId, e164 });
        await deleteDispatchRule(ctx, exId);
      }

      // If it's an unrelated per-DID rule for another number, we leave it alone.
    }

    // Always create a per-DID rule for this number
    log(ctx, 'step: create rule');
    const ruleMeta = { phoneNumber: e164, agentName, assistantId: assistantIdFinal || null, ...extraMetadata };

    const rule = await createRuleForNumber(ctx, {
      trunkId: inboundTrunkId,
      phoneNumber: e164,
      agentName,
      metadata: ruleMeta,
      roomPrefix,
      agentMetadataJson,
    });

    const sipDispatchRuleId = readId(rule, 'sip_dispatch_rule_id', 'sipDispatchRuleId', 'id');
    log(ctx, 'done: created rule', { sipDispatchRuleId, e164, trunkId: inboundTrunkId, agentName });

    return res.json({
      success: true,
      reused: false,
      trunkId: inboundTrunkId,
      phoneNumber: e164,
      sipDispatchRuleId,
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
    logErr(ctx, 'auto-assign error', e);
    return res.status(500).json({ success: false, message: e?.message || 'Auto-assign failed' });
  }
});

livekitSipRouter.get('/assistant/:id', async (req, res) => {
  const ctx = { route: 'GET /assistant/:id', rid: rid() };
  if (!supa) {
    logErr(ctx, 'supabase not configured', new Error('no supabase env'));
    return res.status(500).json({ success: false, message: 'Supabase not configured' });
  }
  try {
    const id = String(req.params.id || '').trim();
    if (!id) {
      logErr(ctx, 'assistant id required', new Error('missing id'));
      return res.status(400).json({ success: false, message: 'assistant id required' });
    }

    // Get tenant from request
    const tenant = req.tenant || 'main';

    // Build query with tenant filter
    let query = supa
      .from('assistant')
      .select('id, name, prompt, first_message, calendar, cal_api_key, cal_event_type_id, cal_event_type_slug, cal_timezone, llm_provider_setting, llm_model_setting, temperature_setting, max_token_setting')
      .eq('id', id);

    // Add tenant filter
    if (tenant === 'main') {
      query = query.or('tenant.eq.main,tenant.is.null');
    } else {
      query = query.eq('tenant', tenant);
    }

    const { data: assistant, error } = await query.single();
    if (error) throw error;
    if (!assistant) {
      logErr(ctx, 'assistant not found', new Error(id));
      return res.status(404).json({ success: false, message: 'assistant not found' });
    }

    const payload = {
      success: true,
      assistant: {
        id: assistant.id,
        name: assistant.name || 'Assistant',
        prompt: assistant.prompt || '',
        firstMessage: assistant.first_message || '',
        llm_provider_setting: assistant.llm_provider_setting || 'OpenAI',
        llm_model_setting: assistant.llm_model_setting || 'gpt-4o-mini',
        temperature_setting: assistant.temperature_setting || 0.1,
        max_token_setting: assistant.max_token_setting || 250,
      },
      calendar_integration_id: assistant.calendar || undefined,
      cal_api_key: assistant.cal_api_key || undefined,
      cal_event_type_id: assistant.cal_event_type_id || undefined,
      cal_event_type_slug: assistant.cal_event_type_slug || undefined,
      cal_timezone: assistant.cal_timezone || undefined,
    };
    log(ctx, 'assistant resolved', { id, hasPrompt: !!assistant.prompt, hasFirst: !!assistant.first_message });
    return res.json(payload);
  } catch (e) {
    logErr(ctx, 'assistant resolve error', e);
    return res.status(500).json({ success: false, message: e?.message || 'resolve failed' });
  }
});
