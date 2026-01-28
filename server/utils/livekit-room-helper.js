// server/utils/livekit-room-helper.js
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Create LiveKit room and return TwiML directly
 * This avoids making internal HTTP requests
 */
export async function createLiveKitRoomTwiml({
  roomName,
  assistantId,
  phoneNumber,
  campaignId,
  campaignPrompt,
  contactInfo
}) {
  try {
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
      throw new Error('LiveKit credentials not configured');
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
    const sipDomain = process.env.LIVEKIT_SIP_URI ? process.env.LIVEKIT_SIP_URI.replace('sip:', '') : '';
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Sip>sip:${roomName}@${sipDomain}</Sip>
  </Dial>
</Response>`;

    return twiml;

  } catch (error) {
    console.error('Error creating LiveKit room:', error);
    throw error;
  }
}
