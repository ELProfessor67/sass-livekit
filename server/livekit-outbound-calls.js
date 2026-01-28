// server/livekit-outbound-calls.js
// Service for making outbound calls using LiveKit SIP participants with outbound trunks

import express from 'express';
import { SipClient, RoomServiceClient, AgentDispatchClient } from 'livekit-server-sdk';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const livekitOutboundCallsRouter = express.Router();

const lk = new SipClient(
  process.env.LIVEKIT_HOST,
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET,
);

const supabase = createSupabaseClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Create a SIP participant for outbound calling
 * POST /api/v1/livekit/outbound-calls/create-participant
 */
livekitOutboundCallsRouter.post('/create-participant', async (req, res) => {
  try {
    const {
      outboundTrunkId,
      phoneNumber,
      roomName,
      participantIdentity,
      participantName,
      assistantId,
      campaignId,
      contactName,
      waitUntilAnswered = true,
      playDialtone = false,
      krispEnabled = true
    } = req.body;

    if (!outboundTrunkId || !phoneNumber || !roomName) {
      return res.status(400).json({
        success: false,
        message: 'outboundTrunkId, phoneNumber, and roomName are required'
      });
    }

    console.log(`Creating SIP participant for outbound call:`, {
      outboundTrunkId,
      phoneNumber,
      roomName,
      participantIdentity,
      assistantId,
      campaignId
    });

    // Create SIP participant using the working format from your other project
    const sipParticipantOptions = {
      participantIdentity: participantIdentity || `identity-${Date.now()}`,
      participantName: participantName || 'AI Assistant',
      krispEnabled: krispEnabled !== false, // Default to true
      waitUntilAnswered,
      playDialtone,
      metadata: JSON.stringify({
        assistantId,
        campaignId,
        contactName,
        callType: 'outbound',
        source: 'campaign'
      })
    };

    const participant = await lk.createSipParticipant(
      outboundTrunkId,
      phoneNumber,
      roomName,
      sipParticipantOptions
    );

    console.log(`SIP participant created successfully:`, {
      participantId: participant.participantIdentity,
      roomName: participant.roomName,
      status: participant.status
    });

    res.json({
      success: true,
      participant: {
        participantId: participant.participantIdentity,
        roomName: participant.roomName,
        status: participant.status,
        sipCallTo: participant.sipCallTo,
        sipNumber: participant.sipNumber
      }
    });

  } catch (error) {
    console.error('Error creating SIP participant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create SIP participant',
      error: error.message
    });
  }
});

/**
 * Get outbound trunk for an assistant
 * GET /api/v1/livekit/outbound-calls/trunk/:assistantId
 */
livekitOutboundCallsRouter.get('/trunk/:assistantId', async (req, res) => {
  try {
    const { assistantId } = req.params;

    // Get phone number assigned to this assistant
    const { data: phoneNumber, error: phoneError } = await supabase
      .from('phone_number')
      .select('outbound_trunk_id, outbound_trunk_name, number')
      .eq('inbound_assistant_id', assistantId)
      .eq('status', 'active')
      .single();

    if (phoneError || !phoneNumber) {
      return res.status(404).json({
        success: false,
        message: 'No outbound trunk found for this assistant'
      });
    }

    res.json({
      success: true,
      trunk: {
        outboundTrunkId: phoneNumber.outbound_trunk_id,
        outboundTrunkName: phoneNumber.outbound_trunk_name,
        phoneNumber: phoneNumber.number
      }
    });

  } catch (error) {
    console.error('Error getting outbound trunk:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get outbound trunk',
      error: error.message
    });
  }
});

/**
 * List all outbound trunks
 * GET /api/v1/livekit/outbound-calls/trunks
 */
livekitOutboundCallsRouter.get('/trunks', async (req, res) => {
  try {
    const trunks = await lk.listSipOutboundTrunk();

    res.json({
      success: true,
      trunks: trunks.map(trunk => ({
        trunkId: trunk.sipTrunkId || trunk.sip_trunk_id,
        name: trunk.name,
        address: trunk.address,
        numbers: trunk.numbers,
        metadata: trunk.metadata
      }))
    });

  } catch (error) {
    console.error('Error listing outbound trunks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list outbound trunks',
      error: error.message
    });
  }
});

/**
 * Initiate an outbound call from scratch (Room -> Agent -> SIP)
 * POST /api/v1/livekit/outbound-calls/initiate
 */
livekitOutboundCallsRouter.post('/initiate', async (req, res) => {
  try {
    const {
      phoneNumber,
      contactName,
      assistantId,
      userId,
      campaignId = null
    } = req.body;

    if (!phoneNumber || !assistantId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'phoneNumber, assistantId, and userId are required'
      });
    }

    // 1. Get assistant details
    const { data: assistant, error: assistantError } = await supabase
      .from('assistant')
      .select('*')
      .eq('id', assistantId)
      .single();

    if (assistantError || !assistant) {
      return res.status(404).json({ success: false, message: 'Assistant not found' });
    }

    // 2. Determine outbound number and trunk
    let fromPhoneNumber = null;
    let outboundTrunkId = null;

    const { data: assistantPhone, error: phoneError } = await supabase
      .from('phone_number')
      .select('number, outbound_trunk_id')
      .eq('inbound_assistant_id', assistantId)
      .eq('status', 'active')
      .single();

    if (!phoneError && assistantPhone) {
      fromPhoneNumber = assistantPhone.number;
      outboundTrunkId = assistantPhone.outbound_trunk_id;
    }

    if (!fromPhoneNumber) {
      const { data: userPhone } = await supabase
        .from('phone_number')
        .select('number, outbound_trunk_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1);

      if (userPhone && userPhone.length > 0) {
        fromPhoneNumber = userPhone[0].number;
        outboundTrunkId = userPhone[0].outbound_trunk_id;
      }
    }

    if (!outboundTrunkId) {
      return res.status(400).json({
        success: false,
        message: 'No outbound trunk configured for this user/assistant'
      });
    }

    // 3. Setup LiveKit Room and Agent
    const roomName = `call_${phoneNumber.replace(/\D/g, '')}_${Date.now()}`;
    const livekitUrl = process.env.LIVEKIT_URL || process.env.LIVEKIT_HOST;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    // Convert wss to https for room/agent clients
    let httpUrl = livekitUrl;
    if (livekitUrl.startsWith('wss://')) {
      httpUrl = livekitUrl.replace('wss://', 'https://');
    } else if (livekitUrl.startsWith('ws://')) {
      httpUrl = livekitUrl.replace('ws://', 'http://');
    }

    const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);
    const agentDispatchClient = new AgentDispatchClient(httpUrl, apiKey, apiSecret);

    const callType = campaignId ? 'campaign' : 'lead';
    const source = 'outbound-workflow';

    // Create Room
    await roomService.createRoom({
      name: roomName,
      metadata: JSON.stringify({
        assistantId,
        phoneNumber,
        contactInfo: { name: contactName || '' },
        source,
        callType
      })
    });

    // Dispatch Agent
    const agentName = process.env.LK_AGENT_NAME || 'ai';
    await agentDispatchClient.createDispatch(roomName, agentName, {
      metadata: JSON.stringify({
        assistantId,
        callType,
        roomName,
        source,
        phoneNumber
      })
    });

    // 4. Initiate SIP Participant
    const participantIdentity = `outbound-${phoneNumber}-${Date.now()}`;
    const participant = await lk.createSipParticipant(
      outboundTrunkId,
      phoneNumber,
      roomName,
      {
        participantIdentity,
        participantName: contactName || 'AI Assistant',
        metadata: JSON.stringify({
          assistantId,
          campaignId: campaignId || '',
          contactName: contactName || '',
          source,
          callType
        })
      }
    );

    const callSid = participant.sipCallId || `sip-${Date.now()}`;

    // 5. Record in Call History
    await supabase
      .from('call_history')
      .insert({
        call_id: callSid,
        call_sid: callSid,
        assistant_id: assistantId,
        phone_number: phoneNumber,
        contact_name: contactName || '',
        participant_identity: participantIdentity,
        start_time: new Date().toISOString(),
        call_status: 'calling',
        direction: 'outbound',
        room_name: roomName
      });

    console.log(`[LiveKit Outbound] ✅ Call initiated: ${callSid} in room ${roomName}`);

    res.json({
      success: true,
      callSid,
      roomName,
      status: 'initiated'
    });

  } catch (error) {
    console.error('[LiveKit Outbound] ❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate outbound call',
      error: error.message
    });
  }
});

export default livekitOutboundCallsRouter;
