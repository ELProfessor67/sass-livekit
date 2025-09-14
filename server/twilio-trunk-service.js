// server/twilio-trunk-service.js
import Twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

// Supabase client for user credentials
const supa = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


export async function createMainTrunkForUser({ accountSid, authToken, userId, label }) {
  if (!accountSid || !authToken || !userId) {
    throw new Error('accountSid, authToken, and userId are required');
  }

  // Create Twilio client
  const client = Twilio(accountSid, authToken);

  // Generate unique trunk name
  const trunkName = `main-trunk-${userId.slice(0, 8)}-${Date.now()}`;

  console.log(`Creating main trunk for user ${userId}: ${trunkName}`);

  try {
    // Create the main trunk first
    const trunk = await client.trunking.v1.trunks.create({
      friendlyName: trunkName
      // Optional: secure: true for enhanced security
    });

    const trunkSid = trunk.sid;
    console.log(`Created main trunk: ${trunkSid}`);
    
    // Enable recording from ringing after trunk creation using direct API call
    try {
      // Wait for trunk to be fully created
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Use direct HTTP request to update recording settings
      const response = await fetch(`https://trunking.twilio.com/v1/Trunks/${trunkSid}/Recording`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'Mode=record-from-ringing&Trim=do-not-trim'
      });
      
      if (response.ok) {
        const recordingData = await response.json();
        console.log(`✅ Recording enabled: ${recordingData.mode}`);
      } else {
        const errorText = await response.text();
        console.error('Warning: Failed to enable recording from ringing:', errorText);
      }
    } catch (recordingError) {
      console.error('Warning: Failed to enable recording from ringing:', recordingError.message);
      // Don't fail the entire operation if recording setup fails
    }

    // Add LiveKit origination URL if LIVEKIT_SIP_URI is configured
    const livekitSipUri = process.env.LIVEKIT_SIP_URI;
    console.log(`LIVEKIT_SIP_URI from env: ${livekitSipUri}`);

    if (livekitSipUri) {
      // Wait longer for trunk to be fully created
      await new Promise(resolve => setTimeout(resolve, 5000));

      try {
        // Use the SIP URI directly if it already has sip: prefix, otherwise add it
        const finalSipUrl = livekitSipUri.startsWith('sip:') ? livekitSipUri : `sip:${livekitSipUri}`;

        console.log(`Final SIP URL: ${finalSipUrl}`);
        console.log(`Creating origination URL for trunk: ${trunkSid}`);

        // Check if origination URL already exists
        const existingUrls = await client.trunking.v1.trunks(trunkSid).originationUrls.list();
        const alreadyExists = existingUrls.some(url => url.sipUrl === finalSipUrl);

        if (alreadyExists) {
          console.log(`✅ LiveKit origination URL already exists: ${finalSipUrl}`);
        } else {
          // Create origination URL for LiveKit
          const originationUrl = await client.trunking.v1.trunks(trunkSid).originationUrls.create({
            sipUrl: finalSipUrl,
            priority: 1,
            weight: 10,
            enabled: true,
            friendlyName: `livekit-${livekitSipUri.replace('sip:', '')}`,
          });

          console.log(`✅ Successfully added LiveKit origination URL: ${originationUrl.sipUrl}`);
          console.log(`Origination URL SID: ${originationUrl.sid}`);
        }
      } catch (origError) {
        console.error(`❌ Failed to add LiveKit origination URL:`, origError);
        console.error(`Error details:`, {
          message: origError.message,
          status: origError.status,
          code: origError.code,
          moreInfo: origError.moreInfo
        });

        // Try alternative approach - check if trunk exists and is accessible
        try {
          const trunkInfo = await client.trunking.v1.trunks(trunkSid).fetch();
          console.log(`Trunk exists and is accessible: ${trunkInfo.friendlyName}`);

          // Try to list existing origination URLs
          const existingUrls = await client.trunking.v1.trunks(trunkSid).originationUrls.list();
          console.log(`Existing origination URLs:`, existingUrls.map(url => url.sipUrl));
        } catch (checkError) {
          console.error(`Failed to verify trunk:`, checkError.message);
        }

        // Don't fail the entire operation if origination URL fails
      }
    } else {
      console.warn('LIVEKIT_SIP_URI not configured - skipping origination URL setup');
    }

    return {
      success: true,
      trunkSid,
      trunkName,
      message: 'Main trunk created successfully'
    };

  } catch (error) {
    console.error('Error creating main trunk:', error);
    throw new Error(`Failed to create main trunk: ${error.message}`);
  }
}





export async function attachPhoneToMainTrunk({ twilio, phoneSid, e164Number, userId, label }) {
  if (!twilio) throw new Error('Twilio client required');
  if (!phoneSid && !e164Number) throw new Error('phoneSid or e164Number required');

  // 1) Resolve number if only SID provided
  let pn = { sid: phoneSid, phoneNumber: e164Number };
  if (!pn.phoneNumber) {
    pn = await twilio.incomingPhoneNumbers(phoneSid).fetch();
  }
  const e164 = pn.phoneNumber;

  // 2) Get the user's main trunk SID from credentials
  const { data: credentials } = await supa
    .from('user_twilio_credentials')
    .select('trunk_sid')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (!credentials?.trunk_sid) {
    throw new Error('No main trunk found for user. Please create Twilio credentials first.');
  }

  const trunkSid = credentials.trunk_sid;

  // 3) Verify the trunk exists
  try {
    await twilio.trunking.v1.trunks(trunkSid).fetch();
  } catch (error) {
    throw new Error(`Main trunk ${trunkSid} not found or inaccessible`);
  }

  // 4) Attach phone number to the main trunk (idempotent)
  const attachedList = await twilio.trunking.v1.trunks(trunkSid).phoneNumbers.list({ limit: 200 });
  const alreadyAttached = attachedList.some(p => p.phoneNumberSid === pn.sid);
  
  if (!alreadyAttached) {
    await twilio.trunking.v1.trunks(trunkSid).phoneNumbers.create({ phoneNumberSid: pn.sid });
    console.log(`Attached phone number ${e164} to main trunk ${trunkSid}`);
  } else {
    console.log(`Phone number ${e164} already attached to main trunk ${trunkSid}`);
  }

  // Note: SMS webhook configuration is handled when phone number is assigned to an assistant

  // 5) Persist phone number info in database
  await supa.from('phone_number').upsert(
    {
      phone_sid: pn.sid,
      number: e164,
      label: label || null,
      inbound_assistant_id: null,
      webhook_status: 'configured',
      status: 'active',
      trunk_sid: trunkSid,
    },
    { onConflict: 'number' }
  );

  return { trunkSid, phoneSid: pn.sid, e164 };
}


/**
 * Verify that a trunk exists and is accessible
 */
export async function verifyTrunkExists({ accountSid, authToken, trunkSid }) {
  if (!accountSid || !authToken || !trunkSid) {
    throw new Error('accountSid, authToken, and trunkSid are required');
  }

  try {
    const client = Twilio(accountSid, authToken);
    const trunk = await client.trunking.v1.trunks(trunkSid).fetch();
    return {
      success: true,
      exists: true,
      trunk: {
        sid: trunk.sid,
        friendlyName: trunk.friendlyName,
        dateCreated: trunk.dateCreated,
        dateUpdated: trunk.dateUpdated
      }
    };
  } catch (error) {
    if (error.status === 404) {
      return {
        success: true,
        exists: false,
        message: 'Trunk not found'
      };
    }
    throw error;
  }
}

/**
 * Add LiveKit origination URL to an existing trunk
 */
export async function addLiveKitOriginationToTrunk({ accountSid, authToken, trunkSid }) {
  if (!accountSid || !authToken || !trunkSid) {
    throw new Error('accountSid, authToken, and trunkSid are required');
  }

  const livekitSipUri = process.env.LIVEKIT_SIP_URI;
  if (!livekitSipUri) {
    throw new Error('LIVEKIT_SIP_URI not configured');
  }

  try {
    const client = Twilio(accountSid, authToken);

    // Use the SIP URI directly if it already has sip: prefix, otherwise add it
    const finalSipUrl = livekitSipUri.startsWith('sip:') ? livekitSipUri : `sip:${livekitSipUri}`;

    console.log(`Adding LiveKit origination URL to trunk ${trunkSid}: ${finalSipUrl}`);

    // Check if origination URL already exists
    const existingUrls = await client.trunking.v1.trunks(trunkSid).originationUrls.list();
    const alreadyExists = existingUrls.some(url => url.sipUrl === finalSipUrl);

    if (alreadyExists) {
      console.log(`Origination URL already exists: ${finalSipUrl}`);
      return {
        success: true,
        message: 'Origination URL already exists',
        sipUrl: finalSipUrl
      };
    }

    // Create origination URL
    const originationUrl = await client.trunking.v1.trunks(trunkSid).originationUrls.create({
      sipUrl: finalSipUrl,
      priority: 1,
      weight: 10,
      enabled: true,
      friendlyName: `livekit-${livekitSipUri.replace('sip:', '')}`,
    });

    console.log(`✅ Successfully added LiveKit origination URL: ${originationUrl.sipUrl}`);
    return {
      success: true,
      message: 'Origination URL added successfully',
      sipUrl: originationUrl.sipUrl,
      sid: originationUrl.sid
    };

  } catch (error) {
    console.error('Error adding LiveKit origination URL:', error);
    throw new Error(`Failed to add LiveKit origination URL: ${error.message}`);
  }
}

/**
 * Enable dual recording from ringing on an existing trunk
 */
export async function enableTrunkRecording({ accountSid, authToken, trunkSid }) {
  if (!accountSid || !authToken || !trunkSid) {
    throw new Error('accountSid, authToken, and trunkSid are required');
  }

  try {
    const client = Twilio(accountSid, authToken);

    // Update the trunk to enable dual recording from ringing
    const updatedTrunk = await client.trunking.v1.trunks(trunkSid).update({
      recording: 'dual-record-from-ringing'
    });

    console.log(`✅ Enabled dual recording from ringing on trunk: ${trunkSid}`);
    return {
      success: true,
      message: 'Dual recording from ringing enabled successfully',
      trunkSid: updatedTrunk.sid,
      recording: updatedTrunk.recording
    };
  } catch (error) {
    console.error('Error enabling trunk recording:', error);
    throw new Error(`Failed to enable trunk recording: ${error.message}`);
  }
}

/**
 * Get recording information for a call
 */
export async function getCallRecordingInfo({ accountSid, authToken, callSid }) {
  if (!accountSid || !authToken || !callSid) {
    throw new Error('accountSid, authToken, and callSid are required');
  }

  try {
    const client = Twilio(accountSid, authToken);

    // Get call details
    const call = await client.calls(callSid).fetch();

    // Get recordings for this call
    const recordings = await client.calls(callSid).recordings.list();

    console.log(`Found ${recordings.length} recordings for call ${callSid}`);

    return {
      success: true,
      call: {
        sid: call.sid,
        status: call.status,
        direction: call.direction,
        from: call.from,
        to: call.to,
        startTime: call.startTime,
        endTime: call.endTime,
        duration: call.duration
      },
      recordings: recordings.map(rec => ({
        sid: rec.sid,
        status: rec.status,
        duration: rec.duration,
        channels: rec.channels,
        source: rec.source,
        startTime: rec.startTime,
        url: rec.uri
      }))
    };
  } catch (error) {
    console.error('Error getting call recording info:', error);
    throw new Error(`Failed to get call recording info: ${error.message}`);
  }
}

/**
 * Delete a trunk (for cleanup purposes)
 */
export async function deleteMainTrunk({ accountSid, authToken, trunkSid }) {
  if (!accountSid || !authToken || !trunkSid) {
    throw new Error('accountSid, authToken, and trunkSid are required');
  }

  try {
    const client = Twilio(accountSid, authToken);
    await client.trunking.v1.trunks(trunkSid).remove();

    console.log(`Deleted trunk: ${trunkSid}`);
    return {
      success: true,
      message: 'Trunk deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting trunk:', error);
    throw new Error(`Failed to delete trunk: ${error.message}`);
  }
}
