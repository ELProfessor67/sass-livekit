// server/campaign-execution-engine.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
        console.log('No campaigns ready to execute');
        return;
      }

      console.log(`Found ${campaigns.length} campaigns ready to execute`);

      for (const campaign of campaigns) {
        try {
          await this.executeCampaign(campaign);
        } catch (campaignError) {
          console.error(`Error executing campaign ${campaign.id}:`, campaignError);
          // Mark campaign as error status
          await supabase
            .from('campaigns')
            .update({
              execution_status: 'error',
              updated_at: new Date().toISOString()
            })
            .eq('id', campaign.id);
        }
      }

    } catch (error) {
      console.error('Error in executeCampaigns:', error);
    }
  }

  /**
   * Execute a single campaign - processes all calls immediately and continuously
   */
  async executeCampaign(campaign) {
    try {
      console.log(`Executing campaign: ${campaign.name} (${campaign.id})`);

      // Check if campaign should be paused or stopped
      if (!this.shouldExecuteCampaign(campaign)) {
        await this.pauseCampaign(campaign.id, 'Daily cap reached or outside calling hours');
        return;
      }

      // Process all calls immediately and continuously (like urban-new system)
      await this.processAllCalls(campaign);

    } catch (error) {
      console.error(`Error executing campaign ${campaign.id}:`, error);
      await this.pauseCampaign(campaign.id, `Execution error: ${error.message}`);
    }
  }

  /**
   * Process all calls with proper queue management and rate limiting
   */
  async processAllCalls(campaign) {
    console.log(`🔄 Starting queue-based processing for campaign: ${campaign.name}`);
    
    // First, queue all contacts for this campaign
    await this.queueCampaignCalls(campaign);
    
    // Process calls from the queue with proper rate limiting
    await this.processCallQueue(campaign);
  }

  /**
   * Queue all contacts for a campaign
   */
  async queueCampaignCalls(campaign) {
    const contacts = await this.getCampaignContacts(campaign);
    if (!contacts || contacts.length === 0) {
      console.log(`No contacts found for campaign: ${campaign.name}`);
      await this.completeCampaign(campaign.id);
      return;
    }

    console.log(`📞 Queuing ${contacts.length} contacts for campaign: ${campaign.name}`);

    for (const contact of contacts) {
      try {
        // Check if campaign call already exists for this contact in this campaign
        const { data: existingCall, error: checkError } = await supabase
          .from('campaign_calls')
          .select('id, status')
          .eq('campaign_id', campaign.id)
          .eq('phone_number', contact.phone_number)
          .eq('contact_name', contact.name)
          .single();

        let campaignCall;

        if (existingCall) {
          // Update existing call if it's not already completed
          if (existingCall.status === 'completed' || existingCall.status === 'failed') {
            console.log(`⏭️ Skipping contact ${contact.name} - already completed/failed`);
            continue;
          }

          // Update existing call to pending
          const { data: updatedCall, error: updateError } = await supabase
            .from('campaign_calls')
            .update({
              status: 'pending',
              scheduled_at: new Date().toISOString()
            })
            .eq('id', existingCall.id)
            .select()
            .single();

          if (updateError) {
            console.error(`Failed to update existing campaign call:`, updateError);
            continue;
          }

          campaignCall = updatedCall;
          console.log(`🔄 Updated existing call for ${contact.name}`);
        } else {
          // Create new campaign call record
          const { data: newCall, error: callError } = await supabase
            .from('campaign_calls')
            .insert({
              campaign_id: campaign.id,
              contact_id: campaign.contact_source === 'contact_list' ? contact.id : null,
              phone_number: contact.phone_number,
              contact_name: contact.name,
              status: 'pending',
              tenant: campaign.tenant || 'main',  // CRITICAL: Set tenant for data isolation
              scheduled_at: new Date().toISOString()
            })
            .select()
            .single();

          if (callError) {
            console.error(`Failed to create campaign call record:`, callError);
            continue;
          }

          campaignCall = newCall;
          console.log(`➕ Created new call for ${contact.name}`);
        }

        // Check if queue item already exists
        const { data: existingQueue, error: queueCheckError } = await supabase
          .from('call_queue')
          .select('id, status')
          .eq('campaign_id', campaign.id)
          .eq('campaign_call_id', campaignCall.id)
          .single();

        if (existingQueue) {
          // Update existing queue item if it's not already completed
          if (existingQueue.status === 'completed' || existingQueue.status === 'failed') {
            console.log(`⏭️ Skipping queue item for ${contact.name} - already completed/failed`);
            continue;
          }

          const { error: queueUpdateError } = await supabase
            .from('call_queue')
            .update({
              status: 'queued',
              scheduled_for: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingQueue.id);

          if (queueUpdateError) {
            console.error(`Failed to update existing queue item:`, queueUpdateError);
          } else {
            console.log(`🔄 Updated existing queue item for ${contact.name}`);
          }
        } else {
          // Add new item to call queue
          const { error: queueError } = await supabase
            .from('call_queue')
            .insert({
              campaign_id: campaign.id,
              campaign_call_id: campaignCall.id,
              phone_number: contact.phone_number,
              scheduled_for: new Date().toISOString(),
              status: 'queued',
              tenant: campaign.tenant || 'main',  // CRITICAL: Set tenant for data isolation
              priority: 0
            });

          if (queueError) {
            console.error(`Failed to add to call queue:`, queueError);
          } else {
            console.log(`➕ Added new queue item for ${contact.name}`);
          }
        }
      } catch (error) {
        console.error(`Error queuing contact ${contact.name}:`, error);
      }
    }
  }

  /**
   * Process calls from the queue with proper rate limiting
   */
  async processCallQueue(campaign) {
    const batchSize = 5; // Process 5 calls at a time
    let processedCount = 0;
    const maxCallsPerExecution = campaign.daily_cap - campaign.current_daily_calls;

    console.log(`🔄 Processing call queue for campaign: ${campaign.name}, max calls: ${maxCallsPerExecution}`);

    while (processedCount < maxCallsPerExecution) {
      // Check if campaign should continue
      if (!this.shouldExecuteCampaign(campaign)) {
        console.log(`Campaign ${campaign.name} reached daily cap or outside calling hours, pausing`);
        await this.pauseCampaign(campaign.id, 'Daily cap reached or outside calling hours');
        return;
      }

      // Check if campaign is still running
      const { data: currentCampaign } = await supabase
        .from('campaigns')
        .select('execution_status')
        .eq('id', campaign.id)
        .single();

      if (!currentCampaign || currentCampaign.execution_status !== 'running') {
        console.log(`Campaign ${campaign.name} is no longer running, stopping`);
        return;
      }

      // Get next batch of queued calls
      const { data: queueItems, error } = await supabase
        .from('call_queue')
        .select(`
          *,
          campaign_calls(*)
        `)
        .eq('campaign_id', campaign.id)
        .eq('status', 'queued')
        .order('scheduled_for', { ascending: true })
        .limit(batchSize);

      if (error) {
        console.error('Error fetching queue items:', error);
        break;
      }

      if (!queueItems || queueItems.length === 0) {
        console.log(`No more queued calls for campaign: ${campaign.name}`);
        await this.completeCampaign(campaign.id);
        return;
      }

      // Process batch
      for (const queueItem of queueItems) {
        try {
          console.log(`📞 Processing call ${processedCount + 1}/${maxCallsPerExecution}: ${queueItem.phone_number}`);
          
          await this.executeCall(campaign, queueItem);
          processedCount++;

          // Update campaign metrics (only daily calls and execution time - dials updated in outbound-calls.js)
          await supabase
            .from('campaigns')
            .update({
              current_daily_calls: campaign.current_daily_calls + 1,
              last_execution_at: new Date().toISOString()
            })
            .eq('id', campaign.id);

          // Update campaign object for next iteration
          campaign.current_daily_calls = campaign.current_daily_calls + 1;

          console.log(`✅ Call ${processedCount} completed for campaign: ${campaign.name}`);

        } catch (callError) {
          console.error(`❌ Call failed for campaign ${campaign.name}:`, callError);
          
          // Mark call as failed
          await supabase
            .from('campaign_calls')
            .update({ 
              status: 'failed',
              completed_at: new Date().toISOString(),
              notes: callError.message
            })
            .eq('id', queueItem.campaign_call_id);

          // Mark queue item as failed
          await supabase
            .from('call_queue')
            .update({ 
              status: 'failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', queueItem.id);
        }

        // Add delay between calls
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
      }
    }

    console.log(`🎉 Completed processing ${processedCount} calls for campaign: ${campaign.name}`);
  }

  /**
   * Get all contacts for a campaign (like urban-new system)
   */
  async getCampaignContacts(campaign) {
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
      const { data: csvContacts, error } = await supabase
        .from('csv_contacts')
        .select('*')
        .eq('csv_file_id', campaign.csv_file_id)
        .eq('do_not_call', false);

      if (csvContacts) {
        contacts = csvContacts;
      }
    }

    // Format contacts consistently
    return contacts.map(contact => {
      let phoneNumber = contact.phone_number || contact.phone;
      const contactName = contact.name || contact.first_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown';

      // Fix phone number formatting
      if (phoneNumber && typeof phoneNumber === 'number') {
        phoneNumber = phoneNumber.toString();
      }

      // Ensure phone number has proper format
      if (phoneNumber && !phoneNumber.startsWith('+')) {
        if (phoneNumber.startsWith('44')) {
          phoneNumber = '+' + phoneNumber;
        } else if (phoneNumber.startsWith('0')) {
          phoneNumber = '+44' + phoneNumber.substring(1);
        } else if (phoneNumber.length === 10 && phoneNumber.startsWith('4')) {
          phoneNumber = '+44' + phoneNumber;
        }
      }

      return {
        id: contact.id,
        name: contactName,
        phone_number: phoneNumber,
        email: contact.email || contact.email_address || ''
      };
    }).filter(contact => contact.phone_number && contact.phone_number.length >= 7);
  }



  /**
   * Create failed call record
   */
  async createFailedCallRecord(campaign, contact, errorMessage) {
    // Get tenant from campaign to ensure data isolation
    const tenant = campaign.tenant || 'main';
    
    await supabase
      .from('campaign_calls')
      .insert({
        campaign_id: campaign.id,
        contact_id: campaign.contact_source === 'contact_list' ? contact.id : null,
        phone_number: contact.phone_number,
        contact_name: contact.name,
        status: 'failed',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        notes: errorMessage,
        tenant: tenant  // CRITICAL: Set tenant for data isolation
      });
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
      const baseUrl = process.env.NGROK_URL || process.env.BACKEND_URL || 'http://localhost:8080';
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
      if (baseUrl && baseUrl.startsWith('http')) {
        try {
          const metadataUrl = `${baseUrl}/api/v1/campaigns/metadata/${roomName}`;
          await fetch(metadataUrl, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(campaignMetadata),
            timeout: 5000 // 5 second timeout
          });
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

      const agentName = process.env.LK_AGENT_NAME || 'ai';
      console.log('🔍 Agent configuration:', { 
        LK_AGENT_NAME: process.env.LK_AGENT_NAME, 
        agentName, 
        fallback: 'ai' 
      });
      
      // Simplified dispatch body
      const dispatchBody = {
        agent_name: agentName,
        room: roomName,
        metadata: JSON.stringify({
          phone_number: toNumber,
          agentId: campaign.assistant_id,
          callType: 'campaign',
          campaignId: campaign.id,
          contactName: campaignCall.contact_name || 'Unknown',
          campaignPrompt: campaign.campaign_prompt || '',
          outbound_trunk_id: outboundTrunkId,
        }),
      };
      
      console.log('🔍 Dispatch configuration:', dispatchBody);

      // Use the AgentDispatchClient method
      console.log('🤖 Dispatching agent via AgentDispatchClient:', {
        agent_name: agentName,
        room: roomName,
        metadata: dispatchBody.metadata
      });
      
      const dispatchResult = await agentDispatchClient.createDispatch(roomName, agentName, {
        metadata: dispatchBody.metadata,
      });
      
      console.log('✅ Agent dispatch successful:', dispatchResult);

      console.log('✅ Agent dispatched successfully - Python agent will handle outbound calling');

      // 10) bookkeeping
      await supabase.from('campaign_calls').update({ call_sid: callId, room_name: roomName }).eq('id', campaignCall.id);
      await supabase.from('campaigns').update({
        // dials: campaign.dials + 1, // Removed - dials are updated in outbound-calls.js
        current_daily_calls: campaign.current_daily_calls + 1,
        total_calls_made: campaign.total_calls_made + 1,
        last_execution_at: new Date().toISOString(),
      }).eq('id', campaign.id);
      await supabase.from('call_queue').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', queueItem.id);

      console.log(`🎉 LiveKit SIP call initiated for ${campaign.name}: ${campaignCall.phone_number}`);
    } catch (error) {
      console.error(`Error executing call for campaign ${campaign.id}:`, error);

      // Mark call as failed
      await supabase
        .from('campaign_calls')
        .update({ 
          status: 'failed',
          completed_at: new Date().toISOString(),
          notes: error.message
        })
        .eq('id', queueItem.campaign_calls.id);

      // Mark queue item as failed
      await supabase
        .from('call_queue')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', queueItem.id);

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
        status: 'paused',
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
        status: 'completed',
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

      // Check if campaign is already running
      if (campaign.execution_status === 'running') {
        console.log(`Campaign ${campaignId} is already running`);
        return;
      }

      // Update campaign status to running
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({
          execution_status: 'running',
          status: 'active',
          next_call_at: new Date().toISOString(),
          current_daily_calls: 0,
          last_execution_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      if (updateError) {
        console.error('Error updating campaign status:', updateError);
        throw updateError;
      }

      console.log(`✅ Campaign ${campaignId} started with status: running, next_call_at: ${new Date().toISOString()}`);

    } catch (error) {
      console.error(`Error starting campaign ${campaignId}:`, error);
      throw error;
    }
  }


}

// Export singleton instance
export const campaignEngine = new CampaignExecutionEngine();
