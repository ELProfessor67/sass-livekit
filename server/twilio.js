import { createClient } from '@supabase/supabase-js';
const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ...

twilioRouter.post('/incoming', async (req, res) => {
    try {
        const raw = process.env.LIVEKIT_SIP_URI;
        if (!raw) return res.status(500).send('LIVEKIT_SIP_URI not set');

        const called = (req.body?.To || '').trim();  // E.164
        // 1) fetch phone -> assistant mapping
        const { data: mapping, error: mapErr } = await supa
            .from('phone_number')
            .select('inbound_assistant_id, label')
            .eq('number', called)
            .single();

        if (mapErr || !mapping?.inbound_assistant_id) {
            console.warn('No assistant mapping for number', called, mapErr);
            return res.type('text/xml').send(
                new twiml.VoiceResponse()
                    .say({ voice: 'alice' }, 'This number is not configured with an assistant yet.')
                    .toString()
            );
        }

        // 2) fetch assistant record
        const { data: assistant, error: aErr } = await supa
            .from('assistant')
            .select('id, name, prompt, first_message, cal_api_key, cal_event_type_id, cal_timezone')
            .eq('id', mapping.inbound_assistant_id)
            .single();

        if (aErr || !assistant) {
            console.error('Assistant lookup failed', aErr);
            return res.type('text/xml').send(
                new twiml.VoiceResponse()
                    .say({ voice: 'alice' }, 'Assistant configuration error.')
                    .toString()
            );
        }

        const meta = {
            assistant: {
                id: assistant.id,
                name: assistant.name || 'Voice Assistant',
                prompt: assistant.prompt || 'You are a helpful voice assistant.',
                firstMessage: assistant.first_message || '',
            },
            prompt: assistant.prompt || undefined,
            instructions: assistant.prompt || undefined,
            first_message: assistant.first_message || undefined,
            assistant_name: assistant.name || undefined,
            cal_api_key: assistant.cal_api_key || undefined,
            cal_event_type_id: assistant.cal_event_type_id || undefined,
            cal_timezone: assistant.cal_timezone || undefined,
            called_number: called,
        };
        const b64 = Buffer.from(JSON.stringify(meta)).toString('base64');

        const base = `https://${req.get('host')}`;
        const r = new twiml.VoiceResponse();
        const dial = r.dial({
            answerOnBridge: true,
            timeout: 45,
            statusCallback: `${base}/twilio/status`,
            statusCallbackMethod: 'POST',
            statusCallbackEvent: 'initiated ringing answered completed',
        });

        // enforce TLS and attach metadata header
        let targetSipUri = raw.startsWith('sip:') ? 'sips:' + raw.slice(4) : raw;
        if (!/;transport=tls/i.test(targetSipUri)) targetSipUri += ';transport=tls';
        targetSipUri += `;X-Livekit-Metadata=${encodeURIComponent(b64)}`;

        console.log('Dialing SIP URI:', targetSipUri);
        dial.sip(targetSipUri);

        res.type('text/xml').send(r.toString());
    } catch (e) {
        console.error('Twilio webhook error:', e);
        res.status(500).send('Server error');
    }
});
