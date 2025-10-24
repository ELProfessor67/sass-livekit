// server/twilio-trunk-service.js
import Twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

// Supabase client for user credentials
const supa = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


export async function createMainTrunkForUser({ accountSid, authToken, userId, label }) {
  if (!accountSid || !authToken || !userId) {
    throw new Error('accountSid, authToken, and userId are required');
  }

  // Create Twilio client
  const client = Twilio(accountSid, authToken);

  // Generate unique trunk name and domain
  const trunkName = `main-trunk-${userId.slice(0, 8)}-${Date.now()}`;
  const domainPrefix = `user-${userId.slice(0, 8)}-${Date.now()}`;
  const domainName = `${domainPrefix}.pstn.twilio.com`;

  console.log(`Creating main trunk for user ${userId}: ${trunkName}`);
  console.log(`Domain name: ${domainName}`);

  try {
    // 1. Create credential list using Programmable Voice SIP API
    const credentialListResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/SIP/CredentialLists.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `FriendlyName=SIP-Credentials-${userId.slice(0, 8)}-${Date.now()}-${Math.floor(Math.random() * 10000)}`
    });

    if (!credentialListResponse.ok) {
      const errorText = await credentialListResponse.text();
      throw new Error(`Failed to create credential list: ${credentialListResponse.statusText} - ${errorText}`);
    }

    const credentialList = await credentialListResponse.json();
    console.log(`Created credential list: ${credentialList.sid}`);

    // 2. Add credentials to the list using Programmable Voice SIP API
    const sipUsername = `sip-${userId.slice(0, 8)}`;
    const sipPassword = generateSecurePassword();

    const credentialResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/SIP/CredentialLists/${credentialList.sid}/Credentials.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `Username=${sipUsername}&Password=${sipPassword}`
    });

    if (!credentialResponse.ok) {
      const errorText = await credentialResponse.text();
      throw new Error(`Failed to create credentials: ${credentialResponse.statusText} - ${errorText}`);
    }

    const credential = await credentialResponse.json();
    console.log(`Created SIP credentials: ${credential.username}`);

    // 3. Create the main trunk with domain name using REST API
    const trunkResponse = await fetch('https://trunking.twilio.com/v1/Trunks', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `FriendlyName=${trunkName}&DomainName=${domainName}&TransferMode=enable-all`
    });

    if (!trunkResponse.ok) {
      throw new Error(`Failed to create trunk: ${trunkResponse.statusText}`);
    }

    const trunk = await trunkResponse.json();
    const trunkSid = trunk.sid;
    console.log(`Created main trunk: ${trunkSid}`);

    // 4. Associate credential list with trunk using REST API
    const associateResponse = await fetch(`https://trunking.twilio.com/v1/Trunks/${trunkSid}/CredentialLists`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `CredentialListSid=${credentialList.sid}`
    });

    if (!associateResponse.ok) {
      throw new Error(`Failed to associate credential list: ${associateResponse.statusText}`);
    }

    console.log(`Associated credential list with trunk`);

    // 5. Store SIP configuration in database
    console.log(`Storing SIP configuration in database for user ${userId}`);

    // First deactivate any existing active credentials for this user
    const { error: deactivateError } = await supa.from('user_twilio_credentials')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (deactivateError) {
      console.error('Error deactivating existing credentials:', deactivateError);
      throw new Error(`Failed to deactivate existing credentials: ${deactivateError.message}`);
    }

    // Then insert the new active configuration
    const { error: insertError } = await supa.from('user_twilio_credentials').insert({
      user_id: userId,
      account_sid: accountSid,
      auth_token: authToken,
      trunk_sid: trunkSid,
      label: label || 'default',
      domain_name: domainName,
      domain_prefix: domainPrefix,
      credential_list_sid: credentialList.sid,
      sip_username: sipUsername,
      sip_password: sipPassword,
      is_active: true,
      created_at: new Date().toISOString()
    });

    if (insertError) {
      console.error('Error inserting SIP configuration:', insertError);
      throw new Error(`Failed to insert SIP configuration: ${insertError.message}`);
    }

    console.log(`✅ Stored SIP configuration in database successfully`);

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

        // Check if origination URL already exists using REST API
        const existingUrlsResponse = await fetch(`https://trunking.twilio.com/v1/Trunks/${trunkSid}/OriginationUrls`, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
          }
        });

        if (existingUrlsResponse.ok) {
          const existingUrls = await existingUrlsResponse.json();
          const alreadyExists = existingUrls.origination_urls.some(url => url.sip_url === finalSipUrl);

          if (alreadyExists) {
            console.log(`✅ LiveKit origination URL already exists: ${finalSipUrl}`);
          } else {
            // Create origination URL for LiveKit using REST API
            const originationResponse = await fetch(`https://trunking.twilio.com/v1/Trunks/${trunkSid}/OriginationUrls`, {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: `SipUrl=${finalSipUrl}&Priority=1&Weight=10&Enabled=true&FriendlyName=livekit-${livekitSipUri.replace('sip:', '')}`
            });

            if (originationResponse.ok) {
              const originationUrl = await originationResponse.json();
              console.log(`✅ Successfully added LiveKit origination URL: ${originationUrl.sip_url}`);
              console.log(`Origination URL SID: ${originationUrl.sid}`);
            } else {
              throw new Error(`Failed to create origination URL: ${originationResponse.statusText}`);
            }
          }
        } else {
          throw new Error(`Failed to check existing origination URLs: ${existingUrlsResponse.statusText}`);
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
          const trunkInfoResponse = await fetch(`https://trunking.twilio.com/v1/Trunks/${trunkSid}`, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
            }
          });

          if (trunkInfoResponse.ok) {
            const trunkInfo = await trunkInfoResponse.json();
            console.log(`Trunk exists and is accessible: ${trunkInfo.friendly_name}`);
          } else {
            console.log(`Trunk check failed: ${trunkInfoResponse.statusText}`);
          }

          // Try to list existing origination URLs using REST API
          const existingUrlsResponse = await fetch(`https://trunking.twilio.com/v1/Trunks/${trunkSid}/OriginationUrls`, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
            }
          });

          if (existingUrlsResponse.ok) {
            const existingUrls = await existingUrlsResponse.json();
            console.log(`Existing origination URLs:`, existingUrls.origination_urls.map(url => url.sip_url));
          } else {
            console.log(`Failed to list origination URLs: ${existingUrlsResponse.statusText}`);
          }
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
      domainName,
      domainPrefix,
      credentialListSid: credentialList.sid,
      sipUsername,
      message: 'Main trunk created successfully with SIP configuration'
    };

  } catch (error) {
    console.error('Error creating main trunk:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userId,
      accountSid: accountSid ? `${accountSid.substring(0, 8)}...` : 'MISSING',
      authToken: authToken ? `${authToken.substring(0, 8)}...` : 'MISSING'
    });
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
  const { data: credentials, error: credentialsError } = await supa
    .from('user_twilio_credentials')
    .select('trunk_sid')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (credentialsError) {
    console.error('Error fetching user credentials:', credentialsError);
    throw new Error('No main trunk found for user. Please create Twilio credentials first.');
  }

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
 * Supports different formats, channels, and metadata-only requests
 */
export async function getCallRecordingInfo({ 
  accountSid, 
  authToken, 
  callSid, 
  format = 'wav', 
  channels = 2, 
  includeMetadata = true, 
  metadataOnly = false 
}) {
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

    const processedRecordings = recordings.map(rec => {
      const recordingData = {
        sid: rec.sid,
        status: rec.status,
        duration: rec.duration,
        channels: rec.channels,
        source: rec.source,
        startTime: rec.startTime,
        url: rec.uri
      };

      // Include additional metadata if requested
      if (includeMetadata) {
        recordingData.mediaUrl = rec.uri; // Twilio's media URL
        recordingData.encryptionDetails = rec.encryptionDetails;
        recordingData.price = rec.price;
        recordingData.priceUnit = rec.priceUnit;
        recordingData.errorCode = rec.errorCode;
        recordingData.apiVersion = rec.apiVersion;
        recordingData.dateCreated = rec.dateCreated;
        recordingData.dateUpdated = rec.dateUpdated;
      }

      // If not metadata-only, add format-specific URL
      if (!metadataOnly) {
        const baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${rec.sid}`;
        recordingData.audioUrl = `${baseUrl}.${format}`;
        
        // Add channel parameter for dual-channel support
        if (channels === 2) {
          recordingData.audioUrl += '?RequestedChannels=2';
        }
      }

      return recordingData;
    });

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
      recordings: processedRecordings,
      metadata: {
        format,
        channels,
        includeMetadata,
        metadataOnly,
        totalRecordings: recordings.length
      }
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

/**
 * Generate secure password for SIP credentials
 * Ensures password meets Twilio requirements: min 12 chars, at least one uppercase, lowercase, and number
 */
export function generateSecurePassword() {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  
  // Ensure at least one character from each required category
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  
  // Fill the rest with random characters (minimum 12 total, so 9 more)
  for (let i = 0; i < 9; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Shuffle the password to randomize the position of required characters
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Get user's Twilio SIP configuration
 */
export async function getUserTwilioConfig(userId) {
  const { data, error } = await supa
    .from('user_twilio_credentials')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error getting user Twilio config:', error);
    return null;
  }

  return data;
}

/**
 * Get SIP configuration for LiveKit outbound trunk
 */
export async function getSipConfigForLiveKit(userId) {
  console.log(`🔍 Getting SIP config for user: ${userId}`);

  const config = await getUserTwilioConfig(userId);
  console.log(`📊 Retrieved config:`, {
    hasConfig: !!config,
    domainName: config?.domain_name,
    sipUsername: config?.sip_username,
    hasPassword: !!config?.sip_password,
    trunkSid: config?.trunk_sid
  });

  if (!config) {
    throw new Error('No active Twilio configuration found for user');
  }

  // Check if SIP configuration is missing (old record)
  if (!config.domain_name || !config.sip_username || !config.sip_password) {
    console.log('⚠️ SIP configuration missing, creating dynamic configuration for existing user');

    // Create dynamic SIP configuration for existing user
    const trunkResult = await createMainTrunkForUser({
      accountSid: config.account_sid,
      authToken: config.auth_token,
      userId: config.user_id,
      label: config.label || 'updated'
    });

    if (!trunkResult.success) {
      throw new Error(`Failed to create SIP configuration: ${trunkResult.message}`);
    }

    // Return the updated configuration
    const updatedConfig = await getUserTwilioConfig(userId);
    console.log(`✅ Updated SIP config:`, {
      domainName: updatedConfig.domain_name,
      sipUsername: updatedConfig.sip_username,
      hasPassword: !!updatedConfig.sip_password,
      trunkSid: updatedConfig.trunk_sid
    });

    return {
      domainName: updatedConfig.domain_name,
      sipUsername: updatedConfig.sip_username,
      sipPassword: updatedConfig.sip_password,
      trunkSid: updatedConfig.trunk_sid,
      credentialListSid: updatedConfig.credential_list_sid
    };
  }

  console.log(`✅ Using existing SIP config:`, {
    domainName: config.domain_name,
    sipUsername: config.sip_username,
    hasPassword: !!config.sip_password,
    trunkSid: config.trunk_sid
  });

  return {
    domainName: config.domain_name,
    sipUsername: config.sip_username,
    sipPassword: config.sip_password,
    trunkSid: config.trunk_sid,
    credentialListSid: config.credential_list_sid
  };
}
