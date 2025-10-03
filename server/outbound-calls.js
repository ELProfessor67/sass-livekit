// server/outbound-calls.js
import express from 'express';
import Twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

export const outboundCallsRouter = express.Router();

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

    // Get user's active Twilio credentials
    const { data: credentials, error: credError } = await supabase
      .from('user_twilio_credentials')
      .select('*')
      .eq('user_id', campaign.user_id)
      .eq('is_active', true)
      .single();

    if (credError || !credentials) {
      return res.status(404).json({
        success: false,
        message: 'No Twilio credentials found for user'
      });
    }

    // Create Twilio client with user's credentials
    const userTwilio = Twilio(credentials.account_sid, credentials.auth_token);

    // Initiate Twilio call
    const call = await userTwilio.calls.create({
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

    // Update campaign metrics atomically to prevent race conditions
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        dials: campaign.dials + 1,
        current_daily_calls: campaign.current_daily_calls + 1,
        total_calls_made: campaign.total_calls_made + 1,
        last_execution_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    if (updateError) {
      console.error('Error updating campaign metrics:', updateError);
      // Don't fail the call initiation, just log the error
    }

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
        // Don't assume this is a human pickup - wait for LiveKit analysis
        newStatus = 'calling'; // Keep as calling until we know more
        break;
      case 'completed':
        newStatus = 'completed';
        // Determine outcome based on call duration and LiveKit analysis
        if (CallDuration && parseInt(CallDuration) > 0) {
          // Call was answered by something (human, voicemail, etc.)
          if (parseInt(CallDuration) < 10) {
            outcome = 'voicemail'; // Very short = likely voicemail
          } else if (parseInt(CallDuration) < 30) {
            outcome = 'voicemail'; // Short = likely voicemail or quick hangup
          } else {
            // Longer call - could be human, but we need LiveKit analysis
            outcome = 'answered'; // Tentative - will be updated by LiveKit
          }
        } else {
          // No duration = no answer
          outcome = 'no_answer';
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

    // Update campaign metrics atomically
    // Only count as pickup if it's a confirmed human answer (not voicemail)
    if (outcome === 'answered' && CallDuration && parseInt(CallDuration) >= 30) {
      const { error: pickupError } = await supabase
        .from('campaigns')
        .update({
          pickups: campaign.pickups + 1,
          total_calls_answered: campaign.total_calls_answered + 1
        })
        .eq('id', campaign.id);

      if (pickupError) {
        console.error('Error updating pickup metrics:', pickupError);
      } else {
        console.log(`📞 Human pickup recorded for campaign ${campaign.id}: ${campaignCall.phone_number} (${CallDuration}s)`);
      }
    } else if (outcome === 'voicemail') {
      console.log(`📞 Voicemail detected for campaign ${campaign.id}: ${campaignCall.phone_number} (${CallDuration}s) - not counted as pickup`);
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

    // Find the campaign call by call SID
    const { data: campaignCall, error: callError } = await supabase
      .from('campaign_calls')
      .select('*, campaigns(*)')
      .eq('call_sid', call_sid)
      .single();

    if (callError || !campaignCall) {
      console.error('Campaign call not found for SID:', call_sid);
      return res.status(404).json({ success: false, message: 'Campaign call not found' });
    }

    const campaign = campaignCall.campaigns;
    let newOutcome = campaignCall.outcome;
    let newStatus = campaignCall.status;

    // Analyze the conversation to determine if it was a human pickup
    if (conversation_analysis) {
      const { is_human, confidence, conversation_quality } = conversation_analysis;
      
      if (is_human && confidence > 0.7) {
        newOutcome = 'answered';
        newStatus = 'answered';
        
        // Update pickup count only for confirmed human conversations
        const { error: pickupError } = await supabase
          .from('campaigns')
          .update({
            pickups: campaign.pickups + 1,
            total_calls_answered: campaign.total_calls_answered + 1
          })
          .eq('id', campaign.id);

        if (pickupError) {
          console.error('Error updating pickup metrics:', pickupError);
        } else {
          console.log(`📞 LiveKit confirmed human pickup for campaign ${campaign.id}: ${campaignCall.phone_number}`);
        }
      } else if (is_human === false || confidence < 0.3) {
        newOutcome = 'voicemail';
        console.log(`📞 LiveKit confirmed voicemail for campaign ${campaign.id}: ${campaignCall.phone_number}`);
      }
    }

    // Update campaign call with LiveKit analysis
    const updateData = {
      status: newStatus,
      outcome: newOutcome,
      call_duration: call_duration || campaignCall.call_duration,
      transcription: transcription || campaignCall.transcription,
      completed_at: new Date().toISOString()
    };

    await supabase
      .from('campaign_calls')
      .update(updateData)
      .eq('id', campaignCall.id);

    res.json({ success: true });

  } catch (error) {
    console.error('Error processing LiveKit callback:', error);
    res.status(500).json({ success: false, message: 'Failed to process LiveKit callback' });
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
