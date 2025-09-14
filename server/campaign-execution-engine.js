// server/campaign-execution-engine.js
import { createClient } from '@supabase/supabase-js';
import Twilio from 'twilio';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const twilio = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

class CampaignExecutionEngine {
  constructor() {
    this.isRunning = false;
    this.executionInterval = null;
    this.checkInterval = 30000; // Check every 30 seconds
  }

  /**
   * Start the campaign execution engine
   */
  start() {
    if (this.isRunning) {
      console.log('Campaign execution engine is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting campaign execution engine...');

    // Check for campaigns to execute immediately
    this.executeCampaigns();

    // Set up interval for regular checks
    this.executionInterval = setInterval(() => {
      this.executeCampaigns();
    }, this.checkInterval);
  }

  /**
   * Stop the campaign execution engine
   */
  stop() {
    if (this.executionInterval) {
      clearInterval(this.executionInterval);
      this.executionInterval = null;
    }
    this.isRunning = false;
    console.log('Campaign execution engine stopped');
  }

  /**
   * Execute campaigns that are ready to run
   */
  async executeCampaigns() {
    try {
      // Get active campaigns that are ready to execute
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('execution_status', 'running')
        .lte('next_call_at', new Date().toISOString())
        .order('next_call_at', { ascending: true });

      if (error) {
        console.error('Error fetching campaigns:', error);
        return;
      }

      if (!campaigns || campaigns.length === 0) {
        return;
      }

      console.log(`Found ${campaigns.length} campaigns ready to execute`);

      for (const campaign of campaigns) {
        await this.executeCampaign(campaign);
      }

    } catch (error) {
      console.error('Error in executeCampaigns:', error);
    }
  }

  /**
   * Execute a single campaign
   */
  async executeCampaign(campaign) {
    try {
      console.log(`Executing campaign: ${campaign.name} (${campaign.id})`);

      // Check if campaign should be paused or stopped
      if (!this.shouldExecuteCampaign(campaign)) {
        await this.pauseCampaign(campaign.id, 'Daily cap reached or outside calling hours');
        return;
      }

      // Get next call from queue
      const nextCall = await this.getNextCallFromQueue(campaign.id);
      if (!nextCall) {
        console.log(`No more calls in queue for campaign: ${campaign.name}`);
        await this.completeCampaign(campaign.id);
        return;
      }

      // Execute the call
      await this.executeCall(campaign, nextCall);

      // Update next call time based on campaign settings
      await this.updateNextCallTime(campaign);

    } catch (error) {
      console.error(`Error executing campaign ${campaign.id}:`, error);
      await this.pauseCampaign(campaign.id, `Execution error: ${error.message}`);
    }
  }

  /**
   * Check if campaign should continue executing
   */
  shouldExecuteCampaign(campaign) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(); // 'monday', 'tuesday', etc.

    console.log(`🔍 Debugging campaign ${campaign.name}:`);
    console.log(`  Current time: ${now.toISOString()}`);
    console.log(`  Current hour: ${currentHour}`);
    console.log(`  Current day: ${currentDay}`);
    console.log(`  Campaign start hour: ${campaign.start_hour}`);
    console.log(`  Campaign end hour: ${campaign.end_hour}`);
    console.log(`  Campaign calling days: ${JSON.stringify(campaign.calling_days)}`);
    console.log(`  Current daily calls: ${campaign.current_daily_calls}`);
    console.log(`  Daily cap: ${campaign.daily_cap}`);

    // Check if we're within calling hours
    let withinHours = false;

    // Special case: if both start and end are 0, it means 24/7 (all day)
    if (campaign.start_hour === 0 && campaign.end_hour === 0) {
      withinHours = true;
      console.log(`  ✅ 24/7 calling hours enabled`);
    } else if (campaign.start_hour <= campaign.end_hour) {
      // Normal case: start and end on same day (e.g., 9 AM to 5 PM)
      withinHours = currentHour >= campaign.start_hour && currentHour < campaign.end_hour;
    } else {
      // Cross-midnight case: start before midnight, end after midnight (e.g., 10 PM to 2 AM)
      withinHours = currentHour >= campaign.start_hour || currentHour < campaign.end_hour;
    }

    if (!withinHours) {
      console.log(`  ❌ Outside calling hours: ${currentHour} not between ${campaign.start_hour}-${campaign.end_hour}`);
      return false;
    }

    // Check if today is a calling day
    if (!campaign.calling_days.includes(currentDay)) {
      console.log(`  ❌ Not a calling day: ${currentDay} not in ${JSON.stringify(campaign.calling_days)}`);
      return false;
    }

    // Check daily cap
    if (campaign.current_daily_calls >= campaign.daily_cap) {
      console.log(`  ❌ Daily cap reached: ${campaign.current_daily_calls}/${campaign.daily_cap}`);
      return false;
    }

    console.log(`  ✅ Campaign should execute!`);
    return true;
  }

  /**
   * Get next call from queue for a campaign
   */
  async getNextCallFromQueue(campaignId) {
    console.log(`🔍 Looking for calls in queue for campaign ${campaignId}`);

    // First, get all queued items for this campaign
    const { data: queueItems, error: queueError } = await supabase
      .from('call_queue')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'queued')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('scheduled_for', { ascending: true });

    if (queueError) {
      console.log(`  ❌ Error fetching queue: ${queueError.message}`);
      return null;
    }

    if (!queueItems || queueItems.length === 0) {
      console.log(`  ❌ No calls found in queue`);

      // Let's check what's actually in the queue
      const { data: allQueueItems } = await supabase
        .from('call_queue')
        .select('*')
        .eq('campaign_id', campaignId);

      console.log(`  📊 Total queue items for this campaign: ${allQueueItems?.length || 0}`);
      if (allQueueItems && allQueueItems.length > 0) {
        console.log(`  📋 Queue items:`, allQueueItems.map(item => ({
          id: item.id,
          status: item.status,
          scheduled_for: item.scheduled_for
        })));
      }

      return null;
    }

    // Get the first item and its associated campaign call
    const queueItem = queueItems[0];
    const { data: campaignCall, error: callError } = await supabase
      .from('campaign_calls')
      .select('*')
      .eq('id', queueItem.campaign_call_id)
      .single();

    if (callError) {
      console.log(`  ❌ Error fetching campaign call: ${callError.message}`);
      return null;
    }

    console.log(`  ✅ Found call in queue: ${queueItem.id}`);
    return { ...queueItem, campaign_calls: campaignCall };
  }

  /**
   * Execute a single call using LiveKit SIP participant
   */
  // async executeCall(campaign, queueItem) {
  //   try {
  //     const campaignCall = queueItem.campaign_calls;

  //     // Update queue item status
  //     await supabase
  //       .from('call_queue')
  //       .update({ status: 'processing' })
  //       .eq('id', queueItem.id);

  //     // Update campaign call status
  //     await supabase
  //       .from('campaign_calls')
  //       .update({ 
  //         status: 'calling',
  //         started_at: new Date().toISOString()
  //       })
  //       .eq('id', campaignCall.id);

  //     // Room name will be generated in the SIP participant creation (using working pattern)

  //     // Get outbound trunk for the assistant
  //     let outboundTrunkId = null;
  //     let fromNumber = null;

  //     if (campaign.assistant_id) {
  //       const { data: assistantPhone, error: phoneError } = await supabase
  //         .from('phone_number')
  //         .select('outbound_trunk_id, number')
  //         .eq('inbound_assistant_id', campaign.assistant_id)
  //         .eq('status', 'active')
  //         .single();

  //       if (!phoneError && assistantPhone) {
  //         outboundTrunkId = assistantPhone.outbound_trunk_id;
  //         fromNumber = assistantPhone.number;
  //         console.log(`Using outbound trunk ${outboundTrunkId} and phone number ${fromNumber} for assistant ${campaign.assistant_id}`);
  //       } else {
  //         console.log(`No outbound trunk found for assistant ${campaign.assistant_id}:`, phoneError);
  //       }
  //     }

  //     if (!outboundTrunkId) {
  //       throw new Error('No outbound trunk configured for this assistant. Please assign a phone number to the assistant first.');
  //     }

  //     // Create LiveKit room URL with campaign metadata
  //     const baseUrl = process.env.NGROK_URL || process.env.BACKEND_URL;

  //     // Prepare campaign metadata for LiveKit
  //     const campaignMetadata = {
  //       assistantId: campaign.assistant_id,
  //       campaignId: campaign.id,
  //       campaignPrompt: campaign.campaign_prompt || '',
  //       contactInfo: {
  //         name: campaignCall.contact_name || 'Unknown',
  //         email: campaignCall.email || '',
  //         phone: campaignCall.phone_number
  //       },
  //       source: 'outbound',
  //       callType: 'campaign'
  //     };

  //     // Generate unique call ID and room name first
  //     const callId = `campaign-${campaign.id}-${campaignCall.id}-${Date.now()}`;

  //     // Ensure phone number is in E.164 format for room name
  //     const toNumber = campaignCall.phone_number.startsWith('+') 
  //       ? campaignCall.phone_number 
  //       : `+${campaignCall.phone_number}`;

  //     const roomName = `call-${toNumber}-${Date.now()}`;

  //     // Store campaign metadata for webhook access
  //     const metadataUrl = `${baseUrl}/api/v1/campaigns/metadata/${roomName}`;
  //     await fetch(metadataUrl, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json'
  //       },
  //       body: JSON.stringify(campaignMetadata)
  //     });

  //     // Create SIP participant using the exact pattern from your working project
  //     console.log(`Creating SIP participant using working pattern:`, {
  //       outboundTrunkId,
  //       phoneNumber: toNumber,
  //       roomName
  //     });

  //     // Import LiveKit SDK for direct API call
  //     const { SipClient, RoomServiceClient } = await import('livekit-server-sdk');
  //     const sipClient = new SipClient(
  //       process.env.LIVEKIT_HOST,
  //       process.env.LIVEKIT_API_KEY,
  //       process.env.LIVEKIT_API_SECRET,
  //     );

  //     // Create room service client to ensure room exists
  //     const roomClient = new RoomServiceClient(
  //       process.env.LIVEKIT_HOST,
  //       process.env.LIVEKIT_API_KEY,
  //       process.env.LIVEKIT_API_SECRET,
  //     );

  //     // Create metadata exactly like your working project
  //     const metadata = {
  //       agentId: campaign.assistant_id,
  //       callType: "telephone",
  //       callId: callId,
  //       dir: "outbound",
  //       customer_name: campaignCall.contact_name || 'Unknown',
  //       context: campaign.campaign_prompt || '',
  //       phone_number: fromNumber,
  //       isWebCall: false,
  //       to_phone_number: toNumber,
  //       isGoogleSheet: false,
  //       campaignId: campaign.id,
  //       source: 'campaign'
  //     };

  //     // Use the exact same sipParticipantOptions structure
  //     const sipParticipantOptions = {
  //       participantIdentity: `identity-${Date.now()}`,
  //       participantName: JSON.stringify(metadata),
  //       krispEnabled: true
  //     };

  //     console.log("🔍 SIP Participant Creation Details:", {
  //       outboundTrunkId,
  //       toNumber: campaignCall.phone_number,
  //       roomName,
  //       sipParticipantOptions,
  //       metadata
  //     });

  //     // Ensure room exists before creating SIP participant
  //     try {
  //       console.log("🏠 Ensuring room exists:", roomName);
  //       await roomClient.createRoom({
  //         name: roomName,
  //         metadata: JSON.stringify({
  //           campaignId: campaign.id,
  //           assistantId: campaign.assistant_id,
  //           phoneNumber: toNumber,
  //           contactName: campaignCall.contact_name || 'Unknown',
  //           campaignPrompt: campaign.campaign_prompt || '',
  //           contactInfo: {
  //             name: campaignCall.contact_name || 'Unknown',
  //             email: campaignCall.email || '',
  //             phone: campaignCall.phone_number
  //           },
  //           createdAt: new Date().toISOString()
  //         })
  //       });
  //       console.log("✅ Room created/verified:", roomName);
  //     } catch (roomError) {
  //       console.log("⚠️ Room creation warning (may already exist):", roomError.message);
  //     }

  //     try {
  //       const participant = await sipClient.createSipParticipant(
  //         outboundTrunkId,
  //         toNumber,
  //         roomName,
  //         sipParticipantOptions
  //       );

  //       console.log("✅ SIP Participant Created Successfully:", participant);

  //       // Additional debugging for SIP call status
  //       console.log("🔍 SIP Call Details:", {
  //         sipCallId: participant.sipCallId,
  //         participantId: participant.participantId,
  //         roomName: participant.roomName,
  //         participantIdentity: participant.participantIdentity
  //       });

  //       // Dispatch agent to the room using LiveKit Agent Dispatch API
  //       console.log("🤖 Dispatching agent to room:", roomName);
  //       try {
  //         // Create a proper LiveKit access token for agent dispatch
  //         const { AccessToken } = await import('livekit-server-sdk');
  //         const at = new AccessToken(
  //           process.env.LIVEKIT_API_KEY,
  //           process.env.LIVEKIT_API_SECRET,
  //           {
  //             identity: `agent-dispatcher-${Date.now()}`,
  //             metadata: JSON.stringify({
  //               agentId: campaign.assistant_id,
  //               callType: 'campaign',
  //               campaignId: campaign.id,
  //               phoneNumber: toNumber,
  //               contactName: campaignCall.contact_name || 'Unknown'
  //             })
  //           }
  //         );

  //         const grant = {
  //           room: roomName,
  //           roomJoin: true,
  //           canPublish: true,
  //           canSubscribe: true,
  //         };
  //         at.addGrant(grant);
  //         const jwt = await at.toJwt();

  //         // Use the correct LiveKit Agent Dispatch API endpoint
  //         const dispatchUrl = `${process.env.LIVEKIT_HOST.replace('wss://', 'https://').replace('ws://', 'http://')}/twirp/livekit.AgentService/CreateAgentDispatch`;
  //         const dispatchBody = JSON.stringify({
  //           agent_name: process.env.LK_AGENT_NAME || "ai",
  //           room: roomName,
  //           metadata: JSON.stringify({
  //             agentId: campaign.assistant_id,
  //             callType: 'campaign',
  //             campaignId: campaign.id,
  //             phoneNumber: toNumber,
  //             contactName: campaignCall.contact_name || 'Unknown'
  //           })
  //         });

  //         console.log("🔍 Dispatch request details:", {
  //           url: dispatchUrl,
  //           agent_name: process.env.LK_AGENT_NAME || "ai",
  //           room: roomName,
  //           jwt_length: jwt.length
  //         });

  //         const dispatchResponse = await fetch(dispatchUrl, {
  //           method: 'POST',
  //           headers: {
  //             'Content-Type': 'application/json',
  //             'Authorization': `Bearer ${jwt}`
  //           },
  //           body: dispatchBody
  //         });

  //         console.log("🔍 Dispatch response status:", dispatchResponse.status);

  //         if (dispatchResponse.ok) {
  //           // Try to get response as text first to avoid body consumption issues
  //           const responseText = await dispatchResponse.text();
  //           console.log("✅ Agent dispatched successfully:", responseText);
  //         } else {
  //           const errorText = await dispatchResponse.text();
  //           console.log("⚠️ Agent dispatch failed:", dispatchResponse.status, errorText);
  //         }
  //       } catch (dispatchError) {
  //         console.log("⚠️ Agent dispatch error:", dispatchError.message);
  //       }
  //     } catch (sipError) {
  //       console.error("❌ SIP Participant Creation Failed:", sipError);
  //       throw new Error(`Failed to create SIP participant: ${sipError.message}`);
  //     }

  //     // Update campaign call with participant info and room name
  //     await supabase
  //       .from('campaign_calls')
  //       .update({
  //         call_sid: callId, // Store call ID as call_sid for compatibility
  //         room_name: roomName
  //       })
  //       .eq('id', campaignCall.id);

  //     // Update campaign metrics
  //     await supabase
  //       .from('campaigns')
  //       .update({
  //         dials: campaign.dials + 1,
  //         current_daily_calls: campaign.current_daily_calls + 1,
  //         total_calls_made: campaign.total_calls_made + 1,
  //         last_execution_at: new Date().toISOString()
  //       })
  //       .eq('id', campaign.id);

  //     // Mark queue item as completed
  //     await supabase
  //       .from('call_queue')
  //       .update({ 
  //         status: 'completed',
  //         updated_at: new Date().toISOString()
  //       })
  //       .eq('id', queueItem.id);

  //     console.log(`LiveKit SIP call initiated for campaign ${campaign.name}: ${campaignCall.phone_number}`);

  //   } catch (error) {
  //     console.error(`Error executing call for campaign ${campaign.id}:`, error);

  //     // Mark call as failed
  //     await supabase
  //       .from('campaign_calls')
  //       .update({ 
  //         status: 'failed',
  //         completed_at: new Date().toISOString(),
  //         notes: error.message
  //       })
  //       .eq('id', queueItem.campaign_calls.id);

  //     // Mark queue item as failed
  //     await supabase
  //       .from('call_queue')
  //       .update({ 
  //         status: 'failed',
  //         updated_at: new Date().toISOString()
  //       })
  //       .eq('id', queueItem.id);

  //     throw error;
  //   }
  // }


  // at top of file, add this helper once

  // ... inside class CampaignExecutionEngine

  async executeCall(campaign, queueItem) {
    try {
      const campaignCall = queueItem.campaign_calls;

      // 1) mark processing
      await supabase.from('call_queue').update({ status: 'processing' }).eq('id', queueItem.id);
      await supabase.from('campaign_calls').update({ status: 'calling', started_at: new Date().toISOString() })
        .eq('id', campaignCall.id);

      // 2) resolve outbound trunk + caller id
      let outboundTrunkId = null, fromNumber = null;
      if (campaign.assistant_id) {
        const { data: assistantPhone, error: phoneError } = await supabase
          .from('phone_number')
          .select('outbound_trunk_id, number')
          .eq('inbound_assistant_id', campaign.assistant_id)
          .eq('status', 'active')
          .single();

        if (!phoneError && assistantPhone) {
          outboundTrunkId = assistantPhone.outbound_trunk_id;
          fromNumber = assistantPhone.number;
        }
      }
      if (!outboundTrunkId) throw new Error('No outbound trunk configured for this assistant.');

      // 3) build room & metadata
      const baseUrl = process.env.NGROK_URL || process.env.BACKEND_URL || '';
      const callId = `campaign-${campaign.id}-${campaignCall.id}-${Date.now()}`;
      const toNumber = campaignCall.phone_number.startsWith('+')
        ? campaignCall.phone_number
        : `+${campaignCall.phone_number}`;
      const roomName = `call-${toNumber}-${Date.now()}`;

      const campaignMetadata = {
        assistantId: campaign.assistant_id,
        campaignId: campaign.id,
        campaignPrompt: campaign.campaign_prompt || '',
        contactInfo: {
          name: campaignCall.contact_name || 'Unknown',
          email: campaignCall.email || '',
          phone: campaignCall.phone_number,
        },
        source: 'outbound',
        callType: 'campaign',
      };

      // persist metadata for your webhooks (non-blocking)
      if (baseUrl) {
        try {
          const metadataUrl = `${baseUrl}/api/v1/campaigns/metadata/${roomName}`;
          await fetch(metadataUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(campaignMetadata) });
        } catch (e) {
          console.log('⚠️ metadata post failed:', e?.message);
        }
      }

      // 4) LiveKit HTTP base for server SDKs
      const LK_HTTP_URL = process.env.LIVEKIT_HOST;
      if (!LK_HTTP_URL.startsWith('http')) {
        throw new Error(`LIVEKIT_URL/HOST must be https/http for server SDKs. Got: ${process.env.LIVEKIT_HOST}`);
      }

      const { SipClient, RoomServiceClient, AccessToken, AgentDispatchClient } = await import('livekit-server-sdk');
      const roomClient = new RoomServiceClient(LK_HTTP_URL, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
      const sipClient = new SipClient(LK_HTTP_URL, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
      const agentDispatchClient = new AgentDispatchClient(LK_HTTP_URL, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);

      // 5) ensure room exists
      try {
        console.log('🏠 Creating/verifying room', roomName);
        await roomClient.createRoom({
          name: roomName,
          metadata: JSON.stringify({
            ...campaignMetadata,
            createdAt: new Date().toISOString(),
          }),
        });
        console.log('✅ Room ok:', roomName);
      } catch (e) {
        console.log('⚠️ Room create warning (may exist):', e?.message);
      }

      // 6) DISPATCH AGENT FIRST
      const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
        identity: `agent-dispatcher-${Date.now()}`,
        metadata: JSON.stringify({ campaignId: campaign.id }),
      });
      at.addGrant({ room: roomName, roomJoin: true, canPublish: true, canSubscribe: true });
      const jwt = await at.toJwt();

      // Try different dispatch URL formats
      const dispatchUrl = `${LK_HTTP_URL}/twirp/livekit.AgentService/CreateAgentDispatch`;
      const alternativeUrl = `${LK_HTTP_URL}/twirp/livekit.AgentService/CreateAgentDispatchRequest`;
      
      console.log('🔍 Dispatch URL check:', {
        LK_HTTP_URL,
        dispatchUrl,
        alternativeUrl,
        expectedFormat: 'https://your-livekit-host/twirp/livekit.AgentService/CreateAgentDispatch'
      });
      const agentName = process.env.LK_AGENT_NAME || 'ai';
      console.log('🔍 Agent name check:', { 
        LK_AGENT_NAME: process.env.LK_AGENT_NAME, 
        agentName, 
        fallback: 'ai' 
      });
      
      // Try different dispatch body formats
      const dispatchBody = {
        agent_name: agentName,
        room: roomName,
        metadata: JSON.stringify({
          phone_number: toNumber,  // Add phone number for outbound calling
          agentId: campaign.assistant_id,
          callType: 'campaign',
          campaignId: campaign.id,
          contactName: campaignCall.contact_name || 'Unknown',
          campaignPrompt: campaign.campaign_prompt || '',  // Add campaign prompt
        }),
      };
      
      // Alternative format that might work
      const alternativeBody = {
        agentName: agentName,
        roomName: roomName,
        metadata: JSON.stringify({
          phone_number: toNumber,
          agentId: campaign.assistant_id,
          callType: 'campaign',
          campaignId: campaign.id,
          contactName: campaignCall.contact_name || 'Unknown',
          campaignPrompt: campaign.campaign_prompt || '',  // Add campaign prompt
        }),
      };
      
      console.log('🔍 Dispatch body formats:', {
        primary: dispatchBody,
        alternative: alternativeBody
      });

      // Use the correct AgentDispatchClient method
      try {
        console.log('🤖 Dispatching agent via AgentDispatchClient:', {
          agent_name: agentName,
          room: roomName,
          metadata: dispatchBody.metadata
        });
        
        const dispatchResult = await agentDispatchClient.createDispatch(roomName, agentName, {
          metadata: dispatchBody.metadata,
        });
        
        console.log('✅ Agent dispatch successful via AgentDispatchClient:', dispatchResult);
      } catch (sdkError) {
        console.log('⚠️ AgentDispatchClient failed, trying HTTP method:', sdkError.message);
        
        // Fallback to HTTP method
        console.log('🤖 Dispatching agent via HTTP:', {
          url: dispatchUrl,
          agent_name: dispatchBody.agent_name,
          room: roomName,
          jwt_len: jwt.length,
          dispatchBody: dispatchBody,
        });
        
        const dispatchRes = await fetch(dispatchUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
          body: JSON.stringify(dispatchBody),
        });
        const dispatchTxt = await dispatchRes.text();
        console.log(`🤖 HTTP Dispatch response: ${dispatchRes.status} ${dispatchTxt}`);

        if (!dispatchRes.ok) {
          throw new Error(`Agent dispatch failed: ${dispatchRes.status} ${dispatchTxt}`);
        }
      }

      console.log('✅ Agent dispatched successfully - Python agent will handle outbound calling');

      // 10) bookkeeping
      await supabase.from('campaign_calls').update({ call_sid: callId, room_name: roomName }).eq('id', campaignCall.id);
      await supabase.from('campaigns').update({
        dials: campaign.dials + 1,
        current_daily_calls: campaign.current_daily_calls + 1,
        total_calls_made: campaign.total_calls_made + 1,
        last_execution_at: new Date().toISOString(),
      }).eq('id', campaign.id);
      await supabase.from('call_queue').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', queueItem.id);

      console.log(`🎉 LiveKit SIP call initiated for ${campaign.name}: ${campaignCall.phone_number}`);
    } catch (error) {
      console.error(`❌ Error executing call for campaign ${campaign.id}:`, error);
      await supabase.from('campaign_calls').update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        notes: error.message,
      }).eq('id', queueItem.campaign_calls.id);
      await supabase.from('call_queue').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', queueItem.id);
      throw error;
    }
  }



  async updateNextCallTime(campaign) {
    const now = new Date();
    const nextCallTime = new Date(now.getTime() + (30 * 1000)); // 30 seconds between calls

    await supabase
      .from('campaigns')
      .update({
        next_call_at: nextCallTime.toISOString()
      })
      .eq('id', campaign.id);
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(campaignId, reason) {
    await supabase
      .from('campaigns')
      .update({
        execution_status: 'paused',
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    console.log(`Campaign ${campaignId} paused: ${reason}`);
  }

  async completeCampaign(campaignId) {
    await supabase
      .from('campaigns')
      .update({
        execution_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    console.log(`Campaign ${campaignId} completed`);
  }


  async startCampaign(campaignId) {
    try {
      // Get campaign details
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error || !campaign) {
        throw new Error('Campaign not found');
      }

      // Create call queue from contacts
      await this.createCallQueue(campaign);

      // Update campaign status
      await supabase
        .from('campaigns')
        .update({
          execution_status: 'running',
          next_call_at: new Date().toISOString(),
          current_daily_calls: 0
        })
        .eq('id', campaignId);

      console.log(`Campaign ${campaignId} started`);

    } catch (error) {
      console.error(`Error starting campaign ${campaignId}:`, error);
      throw error;
    }
  }


  async createCallQueue(campaign) {
    try {
      console.log(`  🔍 Creating call queue for campaign:`, {
        id: campaign.id,
        name: campaign.name,
        contact_source: campaign.contact_source,
        contact_list_id: campaign.contact_list_id,
        csv_file_id: campaign.csv_file_id
      });

      let contacts = [];

      // Get contacts based on campaign source
      if (campaign.contact_source === 'contact_list' && campaign.contact_list_id) {
        const { data: contactList, error } = await supabase
          .from('contact_lists')
          .select(`
            contacts(*)
          `)
          .eq('id', campaign.contact_list_id)
          .single();

        if (contactList && contactList.contacts) {
          contacts = contactList.contacts;
        }
      } else if (campaign.contact_source === 'csv_file' && campaign.csv_file_id) {
        // Get CSV contacts from csv_contacts table
        const { data: csvContacts, error } = await supabase
          .from('csv_contacts')
          .select('*')
          .eq('csv_file_id', campaign.csv_file_id)
          .eq('do_not_call', false);

        if (csvContacts) {
          contacts = csvContacts;
          console.log(`  📊 Found ${csvContacts.length} CSV contacts`);
          console.log(`  📋 CSV contacts:`, csvContacts.map(c => ({
            id: c.id,
            name: c.first_name,
            phone: c.phone,
            status: c.status,
            do_not_call: c.do_not_call
          })));
        } else {
          console.log(`  ❌ No CSV contacts found for file ${campaign.csv_file_id}`);
        }
      }

      if (contacts.length === 0) {
        throw new Error('No contacts found for campaign');
      }

      console.log(`  📊 Processing ${contacts.length} contacts for campaign ${campaign.id}`);

      // Create campaign calls and queue items
      const campaignCalls = [];
      const queueItems = [];

      for (const contact of contacts) {
        let phoneNumber = contact.phone_number || contact.phone;
        const contactName = contact.name || contact.first_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown';

        // Fix phone number formatting (handle scientific notation)
        if (phoneNumber && typeof phoneNumber === 'number') {
          phoneNumber = phoneNumber.toString();
        }

        // Ensure phone number has proper format
        if (phoneNumber && !phoneNumber.startsWith('+')) {
          // If it's a UK number without country code, add it
          if (phoneNumber.startsWith('44')) {
            phoneNumber = '+' + phoneNumber;
          } else if (phoneNumber.startsWith('0')) {
            phoneNumber = '+44' + phoneNumber.substring(1);
          } else if (phoneNumber.length === 10 && phoneNumber.startsWith('4')) {
            phoneNumber = '+44' + phoneNumber;
          }
        }

        if (!phoneNumber || phoneNumber.length < 10) {
          console.warn(`Skipping contact without valid phone number: ${contactName} (${phoneNumber})`);
          continue;
        }

        console.log(`  📞 Processing contact: ${contactName} - ${phoneNumber}`);

        // Create campaign call
        const { data: campaignCall, error: callError } = await supabase
          .from('campaign_calls')
          .insert({
            campaign_id: campaign.id,
            contact_id: campaign.contact_source === 'contact_list' ? contact.id : null,
            phone_number: phoneNumber,
            contact_name: contactName,
            status: 'pending'
          })
          .select()
          .single();

        if (callError) {
          console.error('Error creating campaign call:', callError);
          continue;
        }

        // Create queue item
        queueItems.push({
          campaign_id: campaign.id,
          campaign_call_id: campaignCall.id,
          phone_number: phoneNumber,
          priority: 0,
          scheduled_for: new Date().toISOString(),
          status: 'queued'
        });
      }

      // Insert queue items
      if (queueItems.length > 0) {
        const { error: queueError } = await supabase
          .from('call_queue')
          .insert(queueItems);

        if (queueError) {
          throw queueError;
        }
      }

      console.log(`Created ${queueItems.length} calls in queue for campaign ${campaign.id}`);

    } catch (error) {
      console.error('Error creating call queue:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const campaignEngine = new CampaignExecutionEngine();
