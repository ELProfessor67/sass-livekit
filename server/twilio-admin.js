// server/twilio-admin.js
import express from 'express';
import Twilio from 'twilio';
// Supabase is optional. Remove if unused.
import { createClient } from '@supabase/supabase-js';

export const twilioAdminRouter = express.Router();

const twilio = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Optional Supabase client (safe to remove if you don't persist mappings)
const supa =
    process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_SERVICE_ROLE
        ? createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE)
        : null;

/** Build our public base URL (works locally & behind tunnels) */
function getBase(req) {
    if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/+$/, '');
    const proto = req.protocol || 'http';
    return `${proto}://${req.get('host')}`;
}

/** Twilio demo URL helper (ignore it when deciding "used") */
function isTwilioDemoUrl(url = '') {
    const u = String(url).trim().toLowerCase();
    return u.startsWith('https://demo.twilio.com') || u.startsWith('http://demo.twilio.com');
}

/** PV configured? (treat demo URL as NOT configured) */
function hasProgrammableVoice(n) {
    const hasApp = Boolean(n.voiceApplicationSid);
    const hasRealUrl = Boolean(n.voiceUrl && n.voiceUrl.trim()) && !isTwilioDemoUrl(n.voiceUrl);
    return hasApp || hasRealUrl;
}

/** Is the number unused by our webhook/app? (demo URL is "not ours") */
function isUnusedForOurWebhook(n, base) {
    const ours =
        !!n.voiceUrl &&
        (n.voiceUrl.startsWith(`${base}/twilio/`) || n.voiceUrl.startsWith(`${base}/api/`));
    return !ours;
}

/** Strict = truly unused: no PV (ignoring demo URL) AND not on a trunk */
function isStrictlyUnused(n) {
    const onTrunk = Boolean(n.trunkSid);
    return !hasProgrammableVoice(n) && !onTrunk;
}

/** Classify usage for UI badges */
function classifyUsage(n, base) {
    if (n.trunkSid) return 'trunk';
    if (n.voiceApplicationSid) return 'app';
    if (n.voiceUrl) {
        if (isTwilioDemoUrl(n.voiceUrl)) return 'demo';
        const ours =
            n.voiceUrl.startsWith(`${base}/twilio/`) || n.voiceUrl.startsWith(`${base}/api/`);
        return ours ? 'ours' : 'foreign';
    }
    return 'unused';
}

twilioAdminRouter.get('/__ping', (_req, res) => {
    res.json({ ok: true, where: 'twilio-admin router' });
});

/**
 * GET /api/v1/twilio/phone-numbers
 * GET /api/v1/twilio/phone-numbers?unused=1
 * GET /api/v1/twilio/phone-numbers?unused=1&strict=1
 */
twilioAdminRouter.get('/phone-numbers', async (req, res) => {
    try {
        const base = getBase(req);
        const unusedOnly = req.query.unused === '1';
        const strict = req.query.strict === '1';

        // Optional: numbers you've mapped in your DB
        let mappedSet = new Set();
        if (supa) {
            try {
                const { data } = await supa.from('phone_number').select('number');
                mappedSet = new Set((data || []).map((m) => m.number));
            } catch {
                // ignore if table doesn't exist
            }
        }

        const all = await twilio.incomingPhoneNumbers.list({ limit: 1000 });

        const rows = all.map((n) => {
            const row = {
                sid: n.sid,
                phoneNumber: n.phoneNumber,
                friendlyName: n.friendlyName || '',
                voiceUrl: n.voiceUrl || '',
                voiceApplicationSid: n.voiceApplicationSid || '',
                trunkSid: n.trunkSid || null,
                mapped: mappedSet.has(n.phoneNumber),
            };
            return { ...row, usage: classifyUsage(row, base) }; // 'unused' | 'demo' | 'ours' | 'foreign' | 'app' | 'trunk'
        });

        const filtered = unusedOnly
            ? rows.filter((n) => (strict ? isStrictlyUnused(n) : isUnusedForOurWebhook(n, base)) && !n.mapped)
            : rows;

        res.json({ success: true, numbers: filtered });
    } catch (e) {
        console.error('twilio/phone-numbers error', {
            code: e?.code,
            status: e?.status,
            message: e?.message,
        });
        res.status(500).json({ success: false, message: 'Failed to fetch numbers' });
    }
});

/**
 * OPTION A (Webhook mode): assign number to your webhook + save mapping
 * POST /api/v1/twilio/assign
 * body: { phoneSid, assistantId, label? }
 */
twilioAdminRouter.post('/assign', async (req, res) => {
    try {
        const { phoneSid, assistantId, label } = req.body || {};
        if (!phoneSid || !assistantId) {
            return res.status(400).json({ success: false, message: 'phoneSid and assistantId are required' });
        }

        const base = getBase(req);
        const num = await twilio.incomingPhoneNumbers(phoneSid).fetch();

        await twilio.incomingPhoneNumbers(phoneSid).update({
            voiceUrl: `${base}/twilio/incoming`,
            voiceMethod: 'POST',
        });

        if (supa) {
            try {
                await supa.from('phone_number').upsert(
                    {
                        phone_sid: num.sid,
                        number: num.phoneNumber,
                        label: label || num.friendlyName || null,
                        inbound_assistant_id: assistantId,
                        webhook_status: 'configured',
                        status: 'active',
                    },
                    { onConflict: 'phone_sid' },
                );
            } catch (error) {
                console.warn('Failed to save phone number mapping (phone_number table may not exist yet):', error.message);
                // Continue execution - the assignment will still work via LiveKit dispatch rules
            }
        }

        res.json({ success: true, number: { sid: num.sid, phoneNumber: num.phoneNumber } });
    } catch (e) {
        console.error('twilio/assign error', e);
        res.status(500).json({ success: false, message: 'Assign failed' });
    }
});

/** List trunks (Option B) */
twilioAdminRouter.get('/trunks', async (_req, res) => {
    try {
        const trunks = await twilio.trunking.v1.trunks.list({ limit: 100 });
        res.json({
            success: true,
            trunks: trunks.map((t) => ({
                sid: t.sid,
                name: t.friendlyName,
                domainName: t.domainName,
            })),
        });
    } catch (e) {
        console.error('twilio/trunks error', e);
        res.status(500).json({ success: false, message: 'Failed to list trunks' });
    }
});

/**
 * Attach DID to a trunk (Option B)
 * POST /api/v1/twilio/trunk/attach
 * body: { phoneSid: "PNxxx", trunkSid?: "TRxxx" }
 */
twilioAdminRouter.post('/trunk/attach', async (req, res) => {
    try {
        const phoneSid = req.body?.phoneSid;
        const trunkSid = req.body?.trunkSid || process.env.TWILIO_TRUNK_SID;

        if (!phoneSid) return res.status(400).json({ success: false, message: 'phoneSid is required' });
        if (!trunkSid)
            return res
                .status(400)
                .json({ success: false, message: 'trunkSid missing (set TWILIO_TRUNK_SID or send in body)' });

        const result = await twilio.trunking.v1.trunks(trunkSid).phoneNumbers.create({ phoneNumberSid: phoneSid });

        res.json({ success: true, attached: { trunkSid, phoneSid, sid: result?.sid || null } });
    } catch (e) {
        console.error('twilio/trunk/attach error', e);
        res.status(500).json({ success: false, message: e?.message || 'Attach failed' });
    }
});



// ⬇️ add to server/twilio-admin.js (near the other routes)

// POST /api/v1/twilio/map
// body: { phoneSid?: "PNxxx", phoneNumber?: "+19862108561", assistantId: "..." , label? }
twilioAdminRouter.post('/map', async (req, res) => {
    try {
        const { phoneSid, phoneNumber, assistantId, label } = req.body || {};
        if (!assistantId || (!phoneSid && !phoneNumber)) {
            return res.status(400).json({ success: false, message: 'assistantId and phoneSid or phoneNumber are required' });
        }

        // normalize number (fetch from Twilio if only PN SID provided)
        let e164 = phoneNumber;
        if (!e164 && phoneSid) {
            const num = await twilio.incomingPhoneNumbers(phoneSid).fetch();
            e164 = num.phoneNumber;
        }
        if (!e164) return res.status(400).json({ success: false, message: 'Could not resolve phone number' });

        // optional persistence (safe no-op if you removed Supabase)
        if (supa) {
            await supa.from('phone_number').upsert(
                {
                    phone_sid: phoneSid || null,
                    number: e164,
                    label: label || null,
                    inbound_assistant_id: assistantId,
                    webhook_status: 'configured',
                    status: 'active',
                },
                { onConflict: 'number' },
            );
        }

        res.json({ success: true, mapped: { phoneSid: phoneSid || null, number: e164, assistantId } });
    } catch (e) {
        console.error('twilio/map error', e);
        res.status(500).json({ success: false, message: 'Map failed' });
    }
});
