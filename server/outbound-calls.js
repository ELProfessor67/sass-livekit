// server/outbound-calls.js
import express from 'express';
import Twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

export const outboundCallsRouter = express.Router();

const twilio = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Initiate outbound call for campaign
 * POST /api/v1/outbound-calls/initiate
 */
outboundCallsRouter.post('/initiate', async (req, res) => {
  try {
    const {
      campaignId,
      phoneNumber,
      contactName,
      assistantId,
      fromNumber
    } = req.body;

    if (!campaignId || !phoneNumber || !assistantId) {
      return res.status(400).json({
        success: false,
        message: 'campaignId, phoneNumber, and assistantId are required'
      });
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
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
    const roomName = `outbound-${campaignId}-${Date.now()}`;

    // Create campaign call record
    const { data: campaignCall, error: callError } = await supabase
      .from('campaign_calls')
      .insert({
        campaign_id: campaignId,
        phone_number: phoneNumber,
        contact_name: contactName,
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

    // Get the phone number to call from (use assistant's assigned number or fallback)
    let fromPhoneNumber = fromNumber;
    
    if (!fromPhoneNumber) {
      // Try to get phone number from assistant
      if (assistantId) {
        const { data: assistantPhone, error: phoneError } = await supabase
          .from('phone_number')
          .select('number')
          .eq('inbound_assistant_id', assistantId)
          .eq('status', 'active')
          .single();
        
        if (!phoneError && assistantPhone) {
          fromPhoneNumber = assistantPhone.number;
        }
      }
      
      // Fallback to environment variable if no assistant phone found
      if (!fromPhoneNumber) {
        fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
      }
    }
    
    if (!fromPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'No phone number configured for outbound calls. Please assign a phone number to the assistant or set TWILIO_PHONE_NUMBER in your environment variables.'
      });
    }

    // Create LiveKit room URL for the call
    const baseUrl = process.env.NGROK_URL || process.env.BACKEND_URL;
    const livekitRoomUrl = `${baseUrl}/api/v1/livekit/room/${roomName}`;

    // Initiate Twilio call
    const call = await twilio.calls.create({
      to: phoneNumber,
      from: fromPhoneNumber,
      url: livekitRoomUrl,
      method: 'POST',
      statusCallback: `${baseUrl}/api/v1/outbound-calls/status-callback`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
      record: true,
      recordingChannels: 'dual',
      recordingTrack: 'both',
      recordingStatusCallback: `${baseUrl}/api/v1/recording/status`,
      recordingStatusCallbackMethod: 'POST'
    });

    // Update campaign call with Twilio call SID
    await supabase
      .from('campaign_calls')
      .update({
        call_sid: call.sid,
        started_at: new Date().toISOString()
      })
      .eq('id', campaignCall.id);

    // Update campaign metrics
    await supabase
      .from('campaigns')
      .update({
        dials: campaign.dials + 1,
        current_daily_calls: campaign.current_daily_calls + 1,
        total_calls_made: campaign.total_calls_made + 1,
        last_execution_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    res.json({
      success: true,
      callSid: call.sid,
      roomName: roomName,
      campaignCallId: campaignCall.id,
      status: call.status
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
      From,
      Direction
    } = req.body;

    console.log('Outbound call status callback:', {
      CallSid,
      CallStatus,
      CallDuration,
      To,
      From
    });

    // Find the campaign call by call SID
    const { data: campaignCall, error: callError } = await supabase
      .from('campaign_calls')
      .select('*, campaigns(*)')
      .eq('call_sid', CallSid)
      .single();

    if (callError || !campaignCall) {
      console.error('Campaign call not found for SID:', CallSid);
      return res.status(404).json({ success: false, message: 'Campaign call not found' });
    }

    const campaign = campaignCall.campaigns;
    let newStatus = campaignCall.status;
    let outcome = campaignCall.outcome;

    // Update status based on Twilio call status
    switch (CallStatus) {
      case 'ringing':
        newStatus = 'calling';
        break;
      case 'in-progress':
        newStatus = 'answered';
        break;
      case 'completed':
        newStatus = 'completed';
        // Determine outcome based on duration and other factors
        if (CallDuration && parseInt(CallDuration) < 10) {
          outcome = 'no_answer';
        } else if (CallDuration && parseInt(CallDuration) > 10) {
          outcome = 'answered';
        }
        break;
      case 'busy':
        newStatus = 'failed';
        outcome = 'busy';
        break;
      case 'no-answer':
        newStatus = 'failed';
        outcome = 'no_answer';
        break;
      case 'failed':
        newStatus = 'failed';
        break;
    }

    // Update campaign call
    const updateData = {
      status: newStatus,
      call_duration: CallDuration ? parseInt(CallDuration) : 0,
      completed_at: CallStatus === 'completed' ? new Date().toISOString() : null
    };

    if (outcome) {
      updateData.outcome = outcome;
    }

    await supabase
      .from('campaign_calls')
      .update(updateData)
      .eq('id', campaignCall.id);

    // Update campaign metrics
    if (newStatus === 'answered') {
      await supabase
        .from('campaigns')
        .update({
          pickups: campaign.pickups + 1,
          total_calls_answered: campaign.total_calls_answered + 1
        })
        .eq('id', campaign.id);
    }

    // Update outcome-specific metrics
    if (outcome) {
      const outcomeUpdates = {};
      switch (outcome) {
        case 'interested':
          outcomeUpdates.interested = campaign.interested + 1;
          break;
        case 'not_interested':
          outcomeUpdates.not_interested = campaign.not_interested + 1;
          break;
        case 'callback':
          outcomeUpdates.callback = campaign.callback + 1;
          break;
        case 'do_not_call':
          outcomeUpdates.do_not_call = campaign.do_not_call + 1;
          break;
      }

      if (Object.keys(outcomeUpdates).length > 0) {
        await supabase
          .from('campaigns')
          .update(outcomeUpdates)
          .eq('id', campaign.id);
      }
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

    if (status) {
      query = query.eq('status', status);
    }

    const { data: calls, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      calls: calls || []
    });

  } catch (error) {
    console.error('Error fetching campaign calls:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign calls'
    });
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

    if (!outcome) {
      return res.status(400).json({
        success: false,
        message: 'Outcome is required'
      });
    }

    const { data: call, error: callError } = await supabase
      .from('campaign_calls')
      .select('*, campaigns(*)')
      .eq('id', callId)
      .single();

    if (callError || !call) {
      return res.status(404).json({
        success: false,
        message: 'Campaign call not found'
      });
    }

    // Update call outcome
    const { error: updateError } = await supabase
      .from('campaign_calls')
      .update({
        outcome,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', callId);

    if (updateError) {
      throw updateError;
    }

    // Update campaign metrics
    const campaign = call.campaigns;
    const outcomeUpdates = {};
    
    // Remove old outcome count
    switch (call.outcome) {
      case 'interested':
        outcomeUpdates.interested = Math.max(0, campaign.interested - 1);
        break;
      case 'not_interested':
        outcomeUpdates.not_interested = Math.max(0, campaign.not_interested - 1);
        break;
      case 'callback':
        outcomeUpdates.callback = Math.max(0, campaign.callback - 1);
        break;
      case 'do_not_call':
        outcomeUpdates.do_not_call = Math.max(0, campaign.do_not_call - 1);
        break;
    }

    // Add new outcome count
    switch (outcome) {
      case 'interested':
        outcomeUpdates.interested = (outcomeUpdates.interested || campaign.interested) + 1;
        break;
      case 'not_interested':
        outcomeUpdates.not_interested = (outcomeUpdates.not_interested || campaign.not_interested) + 1;
        break;
      case 'callback':
        outcomeUpdates.callback = (outcomeUpdates.callback || campaign.callback) + 1;
        break;
      case 'do_not_call':
        outcomeUpdates.do_not_call = (outcomeUpdates.do_not_call || campaign.do_not_call) + 1;
        break;
    }

    if (Object.keys(outcomeUpdates).length > 0) {
      await supabase
        .from('campaigns')
        .update(outcomeUpdates)
        .eq('id', campaign.id);
    }

    res.json({
      success: true,
      message: 'Call outcome updated successfully'
    });

  } catch (error) {
    console.error('Error updating call outcome:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update call outcome'
    });
  }
});
