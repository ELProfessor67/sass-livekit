// server/livekit-room.js
import express from 'express';
import { AccessToken, RoomServiceClient, AgentDispatchClient } from 'livekit-server-sdk';
import { createClient } from '@supabase/supabase-js';

export const livekitRoomRouter = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Create LiveKit room for outbound call
 * POST /api/v1/livekit/room/:roomName
 */
livekitRoomRouter.post('/room/:roomName', async (req, res) => {
  try {
    const { roomName } = req.params;

    // Handle both body (manual/api) and query (Twilio callback) parameters
    const assistantId = req.query.assistantId || req.body.assistantId;
    const phoneNumber = req.query.phoneNumber || req.body.phoneNumber;
    const campaignId = req.query.campaignId || req.body.campaignId;
    const campaignPrompt = req.query.campaignPrompt || req.body.campaignPrompt;
    const contactInfoString = req.query.contactInfo || req.body.contactInfo;

    let contactInfo = {};
    if (contactInfoString) {
      try {
        contactInfo = typeof contactInfoString === 'string' ? JSON.parse(contactInfoString) : contactInfoString;
      } catch (e) {
        console.warn('Failed to parse contactInfo:', contactInfoString);
      }
    }

    console.log('[LiveKitRoom] TwiML requested by Twilio:', {
      roomName,
      assistantId,
      phoneNumber,
      campaignId,
      query: req.query,
      body: req.body
    });

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL || process.env.LIVEKIT_HOST;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return res.status(500).json({
        success: false,
        message: 'LiveKit credentials not configured'
      });
    }

    // Return TwiML
    // We assume the room and agent dispatch were already handled by outbound-calls.js /initiate
    const callType = campaignId ? 'campaign' : 'lead';
    const source = 'outbound';

    const sipDomain = process.env.LIVEKIT_SIP_URI ? process.env.LIVEKIT_SIP_URI.replace('sip:', '') : '';
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Sip>sip:${phoneNumber || 'agent'}@${sipDomain}?X-LiveKit-Room=${roomName}</Sip>
  </Dial>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(twiml);

  } catch (error) {
    console.error('Error in livekit-room route:', error);
    res.status(500).send('Internal server error');
  }
});

livekitRoomRouter.get('/room/:roomName/status', async (req, res) => {
  res.json({ ok: true });
});
