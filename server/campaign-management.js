// server/campaign-management.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { campaignEngine } from './campaign-execution-engine.js';

export const campaignManagementRouter = express.Router();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Store campaign metadata temporarily for webhook access
const campaignMetadataStore = new Map();

/**
 * Start a campaign
 * POST /api/v1/campaigns/:id/start
 */
campaignManagementRouter.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;

    // Get campaign details
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Check if campaign is already running
    if (campaign.execution_status === 'running') {
      return res.status(400).json({
        success: false,
        message: 'Campaign is already running'
      });
    }

    // Start the campaign
    await campaignEngine.startCampaign(id);

    res.json({
      success: true,
      message: 'Campaign started successfully'
    });

  } catch (error) {
    console.error('Error starting campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start campaign',
      error: error.message
    });
  }
});

/**
 * Pause a campaign
 * POST /api/v1/campaigns/:id/pause
 */
campaignManagementRouter.post('/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;

    // Update campaign status
    const { error } = await supabase
      .from('campaigns')
      .update({
        execution_status: 'paused',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Campaign paused successfully'
    });

  } catch (error) {
    console.error('Error pausing campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pause campaign'
    });
  }
});

/**
 * Resume a campaign
 * POST /api/v1/campaigns/:id/resume
 */
campaignManagementRouter.post('/:id/resume', async (req, res) => {
  try {
    const { id } = req.params;

    // Update campaign status
    const { error } = await supabase
      .from('campaigns')
      .update({
        execution_status: 'running',
        next_call_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Campaign resumed successfully'
    });

  } catch (error) {
    console.error('Error resuming campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resume campaign'
    });
  }
});

/**
 * Stop a campaign
 * POST /api/v1/campaigns/:id/stop
 */
campaignManagementRouter.post('/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;

    // Update campaign status
    const { error } = await supabase
      .from('campaigns')
      .update({
        execution_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw error;
    }

    // Cancel pending calls in queue
    await supabase
      .from('call_queue')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('campaign_id', id)
      .eq('status', 'queued');

    res.json({
      success: true,
      message: 'Campaign stopped successfully'
    });

  } catch (error) {
    console.error('Error stopping campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop campaign'
    });
  }
});

/**
 * Get campaign status and metrics
 * GET /api/v1/campaigns/:id/status
 */
campaignManagementRouter.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;

    // Get campaign details
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Get call statistics
    const { data: callStats, error: statsError } = await supabase
      .from('campaign_calls')
      .select('status, outcome')
      .eq('campaign_id', id);

    if (statsError) {
      console.error('Error fetching call stats:', statsError);
    }

    // Calculate statistics
    const stats = {
      total: callStats?.length || 0,
      pending: callStats?.filter(c => c.status === 'pending').length || 0,
      calling: callStats?.filter(c => c.status === 'calling').length || 0,
      completed: callStats?.filter(c => c.status === 'completed').length || 0,
      failed: callStats?.filter(c => c.status === 'failed').length || 0,
      answered: callStats?.filter(c => c.status === 'answered').length || 0,
      noAnswer: callStats?.filter(c => c.outcome === 'no_answer').length || 0,
      busy: callStats?.filter(c => c.outcome === 'busy').length || 0,
      interested: callStats?.filter(c => c.outcome === 'interested').length || 0,
      notInterested: callStats?.filter(c => c.outcome === 'not_interested').length || 0,
      callback: callStats?.filter(c => c.outcome === 'callback').length || 0,
      doNotCall: callStats?.filter(c => c.outcome === 'do_not_call').length || 0
    };

    // Get queue status
    const { data: queueStats, error: queueError } = await supabase
      .from('call_queue')
      .select('status')
      .eq('campaign_id', id);

    if (queueError) {
      console.error('Error fetching queue stats:', queueError);
    }

    const queueStatus = {
      queued: queueStats?.filter(q => q.status === 'queued').length || 0,
      processing: queueStats?.filter(q => q.status === 'processing').length || 0,
      completed: queueStats?.filter(q => q.status === 'completed').length || 0,
      failed: queueStats?.filter(q => q.status === 'failed').length || 0,
      cancelled: queueStats?.filter(q => q.status === 'cancelled').length || 0
    };

    res.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        execution_status: campaign.execution_status,
        daily_cap: campaign.daily_cap,
        current_daily_calls: campaign.current_daily_calls,
        total_calls_made: campaign.total_calls_made,
        total_calls_answered: campaign.total_calls_answered,
        last_execution_at: campaign.last_execution_at,
        next_call_at: campaign.next_call_at,
        calling_days: campaign.calling_days,
        start_hour: campaign.start_hour,
        end_hour: campaign.end_hour
      },
      stats,
      queueStatus
    });

  } catch (error) {
    console.error('Error fetching campaign status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign status'
    });
  }
});

/**
 * Get campaign calls with pagination
 * GET /api/v1/campaigns/:id/calls
 */
campaignManagementRouter.get('/:id/calls', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      status, 
      outcome, 
      limit = 50, 
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = supabase
      .from('campaign_calls')
      .select('*')
      .eq('campaign_id', id)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + parseInt(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (outcome) {
      query = query.eq('outcome', outcome);
    }

    const { data: calls, error } = await query;

    if (error) {
      throw error;
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('campaign_calls')
      .select('id', { count: 'exact' })
      .eq('campaign_id', id);

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    if (outcome) {
      countQuery = countQuery.eq('outcome', outcome);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error fetching call count:', countError);
    }

    res.json({
      success: true,
      calls: calls || [],
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
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
 * Reset campaign daily counters
 * POST /api/v1/campaigns/:id/reset-daily
 */
campaignManagementRouter.post('/:id/reset-daily', async (req, res) => {
  try {
    const { id } = req.params;

    // Reset daily counters
    const { error } = await supabase
      .from('campaigns')
      .update({
        current_daily_calls: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Daily counters reset successfully'
    });

  } catch (error) {
    console.error('Error resetting daily counters:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset daily counters'
    });
  }
});

/**
 * Get campaign execution engine status
 * GET /api/v1/campaigns/engine/status
 */
campaignManagementRouter.get('/engine/status', async (req, res) => {
  try {
    res.json({
      success: true,
      engine: {
        isRunning: campaignEngine.isRunning,
        checkInterval: campaignEngine.checkInterval
      }
    });
  } catch (error) {
    console.error('Error fetching engine status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch engine status'
    });
  }
});

/**
 * Store campaign metadata for webhook access
 * POST /api/v1/campaigns/metadata/:roomName
 */
campaignManagementRouter.post('/metadata/:roomName', async (req, res) => {
  try {
    const { roomName } = req.params;
    const metadata = req.body;

    // Store metadata temporarily (expires after 1 hour)
    campaignMetadataStore.set(roomName, {
      ...metadata,
      timestamp: Date.now()
    });

    // Clean up old entries (older than 1 hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [key, value] of campaignMetadataStore.entries()) {
      if (value.timestamp < oneHourAgo) {
        campaignMetadataStore.delete(key);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error storing campaign metadata:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to store campaign metadata'
    });
  }
});

/**
 * Webhook endpoint for Twilio to create LiveKit room with campaign metadata
 * POST /api/v1/campaigns/webhook/:roomName
 */
campaignManagementRouter.post('/webhook/:roomName', async (req, res) => {
  try {
    const { roomName } = req.params;
    
    // Get stored metadata
    const metadata = campaignMetadataStore.get(roomName);
    if (!metadata) {
      console.error('No metadata found for room:', roomName);
      return res.status(404).json({
        success: false,
        message: 'Campaign metadata not found'
      });
    }

    // Clean up metadata
    campaignMetadataStore.delete(roomName);

    // Redirect to LiveKit room creation with metadata
    const baseUrl = process.env.NGROK_URL || process.env.BACKEND_URL;
    const livekitRoomUrl = `${baseUrl}/api/v1/livekit/room/${roomName}`;

    // Make internal request to LiveKit room creation
    const response = await fetch(livekitRoomUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistantId: metadata.assistantId,
        phoneNumber: metadata.contactInfo.phone,
        campaignId: metadata.campaignId,
        campaignPrompt: metadata.campaignPrompt,
        contactInfo: metadata.contactInfo
      })
    });

    if (!response.ok) {
      throw new Error(`LiveKit room creation failed: ${response.status}`);
    }

    const twiml = await response.text();
    res.set('Content-Type', 'text/xml');
    res.send(twiml);

  } catch (error) {
    console.error('Error in campaign webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create LiveKit room'
    });
  }
});
