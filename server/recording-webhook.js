// server/recording-webhook.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';

export const recordingWebhookRouter = express.Router();

// Supabase client for updating recording status
const supa = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Twilio Recording Status Callback
 * POST /api/v1/recording/status
 * 
 * This endpoint receives recording status updates from Twilio
 * and updates the call_history table with recording information
 */
recordingWebhookRouter.post('/status', async (req, res) => {
  try {
    const {
      AccountSid,
      CallSid,
      RecordingSid,
      RecordingUrl,
      RecordingStatus,
      RecordingDuration,
      RecordingChannels,
      RecordingStartTime,
      RecordingSource,
      RecordingTrack
    } = req.body;

    console.log('RECORDING_STATUS_CALLBACK', {
      AccountSid,
      CallSid,
      RecordingSid,
      RecordingStatus,
      RecordingDuration,
      RecordingUrl: RecordingUrl ? 'present' : 'missing'
    });

    // Validate required fields
    if (!CallSid || !RecordingSid || !RecordingStatus) {
      console.error('Missing required fields in recording callback', req.body);
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: CallSid, RecordingSid, RecordingStatus' 
      });
    }

    // Prepare recording data for database update (include call_sid for backfill)
    const recordingData = {
      recording_sid: RecordingSid,
      recording_url: RecordingUrl || null,
      recording_status: RecordingStatus,
      recording_duration: RecordingDuration ? parseInt(RecordingDuration) : null,
      recording_channels: RecordingChannels ? parseInt(RecordingChannels) : null,
      recording_start_time: RecordingStartTime || null,
      recording_source: RecordingSource || null,
      recording_track: RecordingTrack || null,
      updated_at: new Date().toISOString()
    };

    // 1) Update row that already has this call_sid
    let { data, error } = await supa
      .from('call_history')
      .update(recordingData)
      .eq('call_sid', CallSid)
      .select();

    if (error) {
      console.error('Failed to update call history with recording data:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update call history'
      });
    }

    // 2) Backfill: if no row had call_sid, the agent may have saved without it (e.g. inbound before LiveKit had Twilio SID).
    //    Attach this CallSid and recording to the most recent call_history row with call_sid null (recent window).
    if (!data || data.length === 0) {
      const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // last 15 min
      const { data: recentNullSid, error: findError } = await supa
        .from('call_history')
        .select('id')
        .is('call_sid', null)
        .gte('start_time', cutoff)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!findError && recentNullSid?.id) {
        const { data: backfillData, error: backfillError } = await supa
          .from('call_history')
          .update({ ...recordingData, call_sid: CallSid })
          .eq('id', recentNullSid.id)
          .select();

        if (!backfillError && backfillData?.length) {
          data = backfillData;
          console.log('RECORDING_BACKFILL_CALL_SID', { CallSid, rowId: recentNullSid.id, RecordingSid });
        }
      }

      if (!data || data.length === 0) {
        console.warn('No call history found for CallSid (and no recent row to backfill):', CallSid);
        return res.status(404).json({
          success: false,
          message: 'Call not found'
        });
      }
    }

    console.log('RECORDING_STATUS_UPDATED', {
      CallSid,
      RecordingSid,
      RecordingStatus,
      updatedRows: data.length
    });

    res.json({ 
      success: true, 
      message: 'Recording status updated successfully',
      callSid: CallSid,
      recordingSid: RecordingSid,
      status: RecordingStatus
    });

  } catch (error) {
    console.error('Recording status callback error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

/**
 * Get recording information for a call
 * GET /api/v1/recording/:callSid
 */
recordingWebhookRouter.get('/:callSid', async (req, res) => {
  try {
    const { callSid } = req.params;

    const { data, error } = await supa
      .from('call_history')
      .select('recording_sid, recording_url, recording_status, recording_duration, recording_start_time')
      .eq('call_sid', callSid)
      .single();

    if (error) {
      console.error('Failed to fetch recording info:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch recording information' 
      });
    }

    if (!data) {
      return res.status(404).json({ 
        success: false, 
        message: 'Call not found' 
      });
    }

    res.json({ 
      success: true, 
      recording: data
    });

  } catch (error) {
    console.error('Get recording info error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

/**
 * Health check endpoint
 * GET /api/v1/recording/health
 */
recordingWebhookRouter.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Recording webhook service is running',
    timestamp: new Date().toISOString()
  });
});
