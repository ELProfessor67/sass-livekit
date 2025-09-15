// server/livekit-outbound-calls.js
// Service for making outbound calls using LiveKit SIP participants with outbound trunks

import express from 'express';
import { SipClient } from 'livekit-server-sdk';
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

export default livekitOutboundCallsRouter;
