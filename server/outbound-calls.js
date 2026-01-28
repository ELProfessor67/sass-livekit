// server/outbound-calls.js
import express from 'express';
import Twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';
import { RoomServiceClient, AgentDispatchClient, SipClient } from 'livekit-server-sdk';

export const outboundCallsRouter = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Initiate outbound call for campaign or workflow lead
 * POST /api/v1/outbound-calls/initiate
 */
outboundCallsRouter.post('/initiate', async (req, res) => {
  try {
    const {
      campaignId,
      userId,
      phoneNumber,
      contactName,
      assistantId,
      fromNumber
    } = req.body;

    if ((!campaignId && !userId) || !phoneNumber || !assistantId) {
      return res.status(400).json({
        success: false,
        message: 'phoneNumber, assistantId, and either campaignId or userId are required'
      });
    }

    let campaign = null;
    let targetUserId = userId;

    // If campaignId is provided, validate it
    if (campaignId && campaignId !== 'null' && campaignId !== 'undefined') {
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaignData) {
        // Only return 404 if campaignId was explicitly provided and not found
        if (campaignId.length > 10) { // check if it looks like a UUID
          return res.status(404).json({
            success: false,
            message: 'Campaign not found'
          });
        }
      } else {
        campaign = campaignData;
        targetUserId = campaign.user_id;
      }
    }

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'User ID could not be determined'
      });
    }

    // Get assistant details
    const { data: assistant, error: assistantError } = await supabase
      .from('assistant')
      .select('*')
      .eq('id', assistantId)
      .single();

    if (assistantError || !assistant) {
      return res.status(404).json({
        success: false,
        message: 'Assistant not found'
      });
    }

    // Generate unique room name
    // Using a clear format of phone_timestamp for identification.
    const roomName = `${phoneNumber}_${Date.now()}`;

    const callType = campaign ? 'campaign' : 'lead';
    // --- REDIRECT LEAD CALLS TO NEW SERVICE ---
    if (!campaign) {
      console.log('[OutboundCall] ↔️ Redirecting lead call to new LiveKit service');
      const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
      const response = await fetch(`${baseUrl}/api/v1/livekit/outbound-calls/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, contactName, assistantId, userId: targetUserId })
      });
      return res.json(await response.json());
    }

    let recordId = null;

    if (campaign) {
      // Create campaign call record
      const { data: campaignCall, error: callError } = await supabase
        .from('campaign_calls')
        .insert({
          campaign_id: campaignId,
          phone_number: phoneNumber,
          contact_name: contactName || '',
          room_name: roomName,
          status: 'calling',
          scheduled_at: new Date().toISOString()
        })
        .select()
        .single();

      if (callError) {
        console.error('Error creating campaign call:', callError);
        return res.status(500).json({
          success: false,
          message: 'Failed to create campaign call record'
        });
      }
      recordId = campaignCall.id;
    }

    // Get the phone number and trunk to call from (use assistant's assigned number or fallback)
    let fromPhoneNumber = fromNumber;
    let outboundTrunkId = null;

    if (assistantId) {
      const { data: assistantPhone, error: phoneError } = await supabase
        .from('phone_number')
        .select('number, outbound_trunk_id')
        .eq('inbound_assistant_id', assistantId)
        .eq('status', 'active')
        .single();

      if (!phoneError && assistantPhone) {
        if (!fromPhoneNumber) fromPhoneNumber = assistantPhone.number;
        outboundTrunkId = assistantPhone.outbound_trunk_id;
      }
    }

    if (!fromPhoneNumber) {
      // Last fallback: check if user has ANY active phone number
      const { data: userPhone } = await supabase
        .from('phone_number')
        .select('number, outbound_trunk_id')
        .eq('user_id', targetUserId)
        .eq('status', 'active')
        .limit(1);

      if (userPhone && userPhone.length > 0) {
        fromPhoneNumber = userPhone[0].number;
        if (!outboundTrunkId) outboundTrunkId = userPhone[0].outbound_trunk_id;
      }
    }

    if (!fromPhoneNumber) {
      console.error('[OutboundCall] ❌ No phone number configured for outbound calls. targetUserId:', targetUserId);
      return res.status(400).json({
        success: false,
        message: 'No phone number configured for outbound calls.'
      });
    }

    console.log('[OutboundCall] 📞 Initiating call:', {
      from: fromPhoneNumber,
      to: phoneNumber,
      assistantId,
      campaignId,
      outboundTrunkId
    });

    // Create LiveKit room URL for the call
    const baseUrl = process.env.NGROK_URL || process.env.BACKEND_URL;
    const queryParams = new URLSearchParams({
      assistantId: assistantId || '',
      phoneNumber: phoneNumber || '',
      contactName: contactName || '',
      campaignId: campaignId && campaignId !== 'null' ? campaignId : '',
      outboundTrunkId: outboundTrunkId || ''
    }).toString();
    const livekitRoomUrl = `${baseUrl}/api/v1/livekit/room/${roomName}?${queryParams}`;

    // Create LiveKit SIP client
    const sipClient = new SipClient(livekitUrl, apiKey, apiSecret);

    console.log('[OutboundCall] 📞 Initiating LiveKit SIP participant call:', {
      outboundTrunkId,
      phoneNumber,
      roomName,
      from: fromPhoneNumber
    });

    // Initiate call via LiveKit SIP Participant (Direct Outbound)
    const participant = await sipClient.createSipParticipant(
      outboundTrunkId,
      phoneNumber,
      roomName,
      {
        participantIdentity: `outbound-${phoneNumber}-${Date.now()}`,
        participantName: contactName || 'AI Assistant',
        metadata: JSON.stringify({
          assistantId,
          campaignId: campaignId || '',
          contactName: contactName || '',
          source: 'outbound',
          callType: campaign ? 'campaign' : 'lead',
          call_sid: callSid
        })
      }
    );

    const callSid = participant.sipCallId || `sip-${Date.now()}`;

    console.log('[OutboundCall] 🚀 LiveKit SIP call initiated successfully:', {
      participantIdentity: participant.participantIdentity,
      roomName: roomName,
      callSid: callSid
    });

    if (campaign) {
      // Update campaign call with SIP call ID
      await supabase
        .from('campaign_calls')
        .update({
          call_sid: callSid,
          started_at: new Date().toISOString()
        })
        .eq('id', recordId);

      // Update campaign metrics
      await supabase.rpc('increment_campaign_dials', {
        campaign_id_param: campaignId
      }).catch(err => console.error('Error updating metrics via RPC:', err));
    } else {
      // Record lead call in call_history
      const { error: historyError } = await supabase
        .from('call_history')
        .insert({
          call_id: callSid,
          call_sid: callSid,
          assistant_id: assistantId,
          phone_number: phoneNumber,
          contact_name: contactName || '',
          participant_identity: `outbound-${phoneNumber}`,
          start_time: new Date().toISOString(),
          call_status: 'calling'
        });

      if (historyError) {
        console.error('Error creating call history record for lead call:', historyError);
      }
    }

    res.json({
      success: true,
      callSid: callSid,
      roomName: roomName,
      campaignCallId: campaign ? recordId : null,
      status: 'initiated'
    });

  } catch (error) {
    console.error('Error initiating outbound call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate outbound call',
      error: error.message
    });
  }
});

/**
 * Twilio call status callback
 * POST /api/v1/outbound-calls/status-callback
 */
outboundCallsRouter.post('/status-callback', async (req, res) => {
  try {
    const {
      CallSid,
      CallStatus,
      CallDuration,
      To,
      From
    } = req.body;

    console.log('Outbound call status callback:', {
      CallSid,
      CallStatus,
      CallDuration,
      To,
      From
    });

    // Find the call - try campaign_calls first
    const { data: campaignCall, error: campaignError } = await supabase
      .from('campaign_calls')
      .select('*, campaigns(*)')
      .eq('call_sid', CallSid)
      .single();

    let callRecord = campaignCall;
    let isCampaign = true;

    if (campaignError || !campaignCall) {
      // Try call_history for lead calls
      const { data: leadCall, error: leadError } = await supabase
        .from('call_history')
        .select('*')
        .eq('call_sid', CallSid)
        .single();

      if (leadError || !leadCall) {
        console.warn('Call record not found for status update (might be arriving early):', CallSid);
        return res.json({ success: true }); // Return OK so Twilio doesn't retry
      }

      callRecord = leadCall;
      isCampaign = false;
    }

    const campaign = isCampaign ? callRecord.campaigns : null;
    let newStatus = isCampaign ? callRecord.status : callRecord.call_status;
    let outcome = callRecord.outcome;

    // Update status based on Twilio call status
    switch (CallStatus) {
      case 'ringing':
        newStatus = 'calling';
        break;
      case 'in-progress':
        newStatus = 'calling';
        break;
      case 'completed':
        newStatus = 'completed';
        if (CallDuration && parseInt(CallDuration) > 0) {
          outcome = outcome || 'answered';
        } else {
          outcome = outcome || 'no_answer';
        }
        break;
      case 'busy':
        newStatus = 'busy';
        outcome = 'busy';
        break;
      case 'no-answer':
        newStatus = 'no_answer';
        outcome = 'no_answer';
        break;
      case 'failed':
        newStatus = 'failed';
        outcome = 'failed';
        break;
    }

    // Update the record
    const updateData = isCampaign ? {
      status: newStatus,
      call_duration: CallDuration ? parseInt(CallDuration) : 0,
      completed_at: CallStatus === 'completed' ? new Date().toISOString() : null
    } : {
      call_status: newStatus,
      call_duration: CallDuration ? parseInt(CallDuration) : 0,
      end_time: CallStatus === 'completed' ? new Date().toISOString() : null
    };

    if (outcome) updateData.outcome = outcome;

    if (isCampaign) {
      await supabase.from('campaign_calls').update(updateData).eq('id', callRecord.id);

      // Update campaign pickups if answered
      if (outcome === 'answered' && CallStatus === 'completed' && CallDuration && parseInt(CallDuration) > 10) {
        await supabase.from('campaigns').update({
          pickups: (campaign.pickups || 0) + 1,
          total_calls_answered: (campaign.total_calls_answered || 0) + 1
        }).eq('id', campaign.id);
      }
    } else {
      await supabase.from('call_history').update(updateData).eq('id', callRecord.id);
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Error processing call status callback:', error);
    res.status(500).json({ success: false, message: 'Failed to process callback' });
  }
});

/**
 * Get campaign call details
 * GET /api/v1/outbound-calls/campaign/:campaignId
 */
outboundCallsRouter.get('/campaign/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('campaign_calls')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);

    const { data: calls, error } = await query;
    if (error) throw error;

    res.json({ success: true, calls: calls || [] });
  } catch (error) {
    console.error('Error fetching campaign calls:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch campaign calls' });
  }
});

/**
 * LiveKit webhook to update call outcome based on conversation analysis
 * POST /api/v1/outbound-calls/livekit-callback
 */
outboundCallsRouter.post('/livekit-callback', async (req, res) => {
  try {
    const {
      call_sid,
      call_status,
      call_duration,
      transcription,
      conversation_analysis
    } = req.body;

    console.log('LiveKit callback received:', {
      call_sid,
      call_status,
      call_duration,
      has_transcription: !!transcription,
      conversation_analysis
    });

    // Find the call - try campaign_calls first
    const { data: campaignCall, error: campaignError } = await supabase
      .from('campaign_calls')
      .select('*, campaigns(*)')
      .eq('call_sid', call_sid)
      .single();

    let callRecord = campaignCall;
    let isCampaign = true;

    if (campaignError || !campaignCall) {
      // Try call_history for lead calls
      const { data: leadCall, error: leadError } = await supabase
        .from('call_history')
        .select('*')
        .eq('call_sid', call_sid)
        .single();

      if (leadError || !leadCall) {
        console.error('Call not found for LiveKit analysis SID:', call_sid);
        return res.status(404).json({ success: false, message: 'Call not found' });
      }

      callRecord = leadCall;
      isCampaign = false;
    }

    const campaign = isCampaign ? callRecord.campaigns : null;
    let newOutcome = callRecord.outcome;
    let newStatus = isCampaign ? callRecord.status : callRecord.call_status;

    if (conversation_analysis) {
      const { is_human, confidence } = conversation_analysis;

      if (is_human && confidence > 0.7) {
        newOutcome = 'answered';
        newStatus = 'answered';

        if (isCampaign) {
          await supabase.from('campaigns').update({
            pickups: (campaign.pickups || 0) + 1,
            total_calls_answered: (campaign.total_calls_answered || 0) + 1
          }).eq('id', campaign.id);
        }
      } else if (is_human === false || confidence < 0.3) {
        newOutcome = 'voicemail';
      }
    }

    const updateData = isCampaign ? {
      status: newStatus,
      outcome: newOutcome,
      call_duration: call_duration || callRecord.call_duration,
      transcription: transcription || callRecord.transcription,
      completed_at: new Date().toISOString()
    } : {
      call_status: newStatus,
      outcome: newOutcome,
      call_duration: call_duration || callRecord.call_duration,
      transcription: transcription || callRecord.transcription,
      end_time: new Date().toISOString()
    };

    if (isCampaign) {
      await supabase.from('campaign_calls').update(updateData).eq('id', callRecord.id);
    } else {
      await supabase.from('call_history').update(updateData).eq('id', callRecord.id);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing LiveKit callback:', error);
    res.status(500).json({ success: false, message: 'Failed to process callback' });
  }
});

/**
 * Update call outcome
 * PUT /api/v1/outbound-calls/:callId/outcome
 */
outboundCallsRouter.put('/:callId/outcome', async (req, res) => {
  try {
    const { callId } = req.params;
    const { outcome, notes } = req.body;

    const { data: call, error: callError } = await supabase
      .from('campaign_calls')
      .select('*, campaigns(*)')
      .eq('id', callId)
      .single();

    if (callError || !call) {
      // Try call_history
      const { data: historyCall, error: historyError } = await supabase
        .from('call_history')
        .select('*')
        .eq('id', callId)
        .single();

      if (historyError || !historyCall) {
        return res.status(404).json({ success: false, message: 'Call not found' });
      }

      await supabase.from('call_history').update({ outcome, notes }).eq('id', callId);
      return res.json({ success: true, message: 'Lead call outcome updated' });
    }

    // Update campaign call
    await supabase.from('campaign_calls').update({ outcome, notes }).eq('id', callId);

    // Update campaign metrics (simple version)
    const campaign = call.campaigns;
    const updates = {};
    if (outcome === 'interested') updates.interested = (campaign.interested || 0) + 1;
    if (outcome === 'not_interested') updates.not_interested = (campaign.not_interested || 0) + 1;
    if (Object.keys(updates).length > 0) {
      await supabase.from('campaigns').update(updates).eq('id', campaign.id);
    }

    res.json({ success: true, message: 'Outcome updated' });
  } catch (error) {
    console.error('Error updating outcome:', error);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
});
