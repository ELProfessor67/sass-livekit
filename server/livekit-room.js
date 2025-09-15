// server/livekit-room.js
import express from 'express';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
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
    const { assistantId, phoneNumber, campaignId, campaignPrompt, contactInfo } = req.body;

    console.log('Creating LiveKit room for outbound call:', {
      roomName,
      assistantId,
      phoneNumber,
      campaignId,
      hasCampaignPrompt: !!campaignPrompt,
      contactInfo
    });

    // Get assistant details
    let assistant = null;
    if (assistantId) {
      const { data: assistantData, error: assistantError } = await supabase
        .from('assistant')
        .select('*')
        .eq('id', assistantId)
        .single();

      if (assistantError) {
        console.error('Error fetching assistant:', assistantError);
      } else {
        assistant = assistantData;
      }
    }

    // Create LiveKit access token
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return res.status(500).json({
        success: false,
        message: 'LiveKit credentials not configured'
      });
    }

    // Create room with agent dispatch using LiveKit API
    const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
    
    try {
      // Create room with metadata
      await roomService.createRoom({
        name: roomName,
        metadata: JSON.stringify({
          assistantId,
          phoneNumber,
          campaignId,
          campaignPrompt: campaignPrompt || '',
          contactInfo: contactInfo || {},
          source: 'outbound',
          callType: 'campaign'
        })
      });
      
      console.log(`Created LiveKit room ${roomName}`);
    } catch (error) {
      console.error('Error creating LiveKit room:', error);
      // Continue anyway - room might already exist
    }

    const grant = {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    };

    // Prepare enhanced metadata with campaign information
    const participantMetadata = {
      assistantId,
      phoneNumber,
      campaignId,
      campaignPrompt: campaignPrompt || '',
      contactInfo: contactInfo || {},
      source: 'outbound',
      callType: 'campaign'
    };

    const at = new AccessToken(apiKey, apiSecret, {
      identity: `outbound-${phoneNumber}`,
      metadata: JSON.stringify(participantMetadata),
    });
    at.addGrant(grant);
    const jwt = await at.toJwt();

    // Return TwiML for Twilio to connect to LiveKit room
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Room participantIdentity="outbound-${phoneNumber}" roomName="${roomName}">
      <Parameter name="assistantId" value="${assistantId || ''}"/>
      <Parameter name="phoneNumber" value="${phoneNumber}"/>
      <Parameter name="campaignId" value="${campaignId || ''}"/>
      <Parameter name="campaignPrompt" value="${(campaignPrompt || '').replace(/"/g, '&quot;')}"/>
      <Parameter name="contactInfo" value="${JSON.stringify(contactInfo || {}).replace(/"/g, '&quot;')}"/>
      <Parameter name="source" value="outbound"/>
      <Parameter name="callType" value="campaign"/>
    </Room>
  </Connect>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(twiml);

  } catch (error) {
    console.error('Error creating LiveKit room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create LiveKit room',
      error: error.message
    });
  }
});

/**
 * Get room status
 * GET /api/v1/livekit/room/:roomName/status
 */
livekitRoomRouter.get('/room/:roomName/status', async (req, res) => {
  try {
    const { roomName } = req.params;

    // This would typically check with LiveKit API for room status
    // For now, just return a basic response
    res.json({
      success: true,
      roomName,
      status: 'active'
    });

  } catch (error) {
    console.error('Error getting room status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get room status'
    });
  }
});
