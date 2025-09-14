// Check SIP trunk configuration for debugging
import { SipClient } from 'livekit-server-sdk';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const sipClient = new SipClient(
  process.env.LIVEKIT_HOST,
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET,
);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSipTrunks() {
  console.log('🔍 Checking SIP Trunk Configuration...\n');

  try {
    // Check environment variables
    console.log('📋 Environment Variables:');
    console.log('LIVEKIT_HOST:', process.env.LIVEKIT_HOST);
    console.log('LIVEKIT_API_KEY:', process.env.LIVEKIT_API_KEY ? 'SET' : 'MISSING');
    console.log('LIVEKIT_API_SECRET:', process.env.LIVEKIT_API_SECRET ? 'SET' : 'MISSING');
    console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'MISSING');
    console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'MISSING');
    console.log('');

    // List outbound trunks
    console.log('📞 Outbound Trunks:');
    const outboundTrunks = await sipClient.listSipOutboundTrunk();
    console.log(`Found ${outboundTrunks.length} outbound trunks:`);
    
    outboundTrunks.forEach((trunk, index) => {
      console.log(`  ${index + 1}. ${trunk.name} (${trunk.sip_trunk_id})`);
      console.log(`     Address: ${trunk.address}`);
      console.log(`     Numbers: ${trunk.numbers?.join(', ') || 'None'}`);
      console.log(`     Status: ${trunk.status}`);
      console.log(`     Auth Username: ${trunk.auth_username ? 'SET' : 'NOT SET'}`);
      console.log(`     Auth Password: ${trunk.auth_password ? 'SET' : 'NOT SET'}`);
      console.log(`     Destination Country: ${trunk.destination_country}`);
      console.log('');
    });

    // List inbound trunks
    console.log('📥 Inbound Trunks:');
    const inboundTrunks = await sipClient.listSipInboundTrunk();
    console.log(`Found ${inboundTrunks.length} inbound trunks:`);
    
    inboundTrunks.forEach((trunk, index) => {
      console.log(`  ${index + 1}. ${trunk.name} (${trunk.sip_trunk_id})`);
      console.log(`     Numbers: ${trunk.numbers?.join(', ') || 'None'}`);
      console.log(`     Status: ${trunk.status}`);
      console.log('');
    });

    // Check database phone number assignments
    console.log('📱 Phone Number Assignments:');
    const { data: phoneNumbers, error } = await supabase
      .from('phone_number')
      .select('*')
      .eq('status', 'active');
    
    if (error) {
      console.log('❌ Error fetching phone numbers:', error.message);
    } else {
      console.log(`Found ${phoneNumbers.length} active phone numbers:`);
      phoneNumbers.forEach((phone, index) => {
        console.log(`  ${index + 1}. ${phone.number} (${phone.phone_sid})`);
        console.log(`     Assistant ID: ${phone.inbound_assistant_id || 'None'}`);
        console.log(`     Outbound Trunk ID: ${phone.outbound_trunk_id || 'None'}`);
        console.log(`     Outbound Trunk Name: ${phone.outbound_trunk_name || 'None'}`);
        console.log(`     Label: ${phone.label || 'None'}`);
        console.log('');
      });
    }

    // Check SIP dispatch rules
    console.log('🎯 SIP Dispatch Rules:');
    const dispatchRules = await sipClient.listSipDispatchRule();
    console.log(`Found ${dispatchRules.length} dispatch rules:`);
    
    dispatchRules.forEach((rule, index) => {
      console.log(`  ${index + 1}. ${rule.name} (${rule.sip_dispatch_rule_id})`);
      console.log(`     Type: ${rule.type}`);
      console.log(`     Trunk IDs: ${rule.trunk_ids?.join(', ') || 'None'}`);
      console.log(`     Room Prefix: ${rule.room_prefix || 'None'}`);
      console.log(`     Agents: ${rule.agents?.map(a => a.agent_name).join(', ') || 'None'}`);
      console.log('');
    });

    // Check for the specific assistant from your logs
    const assistantId = '375430e8-8ea9-483f-b08e-c2113719b776';
    console.log(`🔍 Checking Assistant ${assistantId}:`);
    
    const { data: assistantPhone } = await supabase
      .from('phone_number')
      .select('*')
      .eq('inbound_assistant_id', assistantId)
      .eq('status', 'active')
      .single();
    
    if (assistantPhone) {
      console.log(`✅ Assistant has phone number: ${assistantPhone.number}`);
      console.log(`   Outbound Trunk ID: ${assistantPhone.outbound_trunk_id}`);
      console.log(`   Outbound Trunk Name: ${assistantPhone.outbound_trunk_name}`);
      
      // Check if the outbound trunk exists
      const outboundTrunk = outboundTrunks.find(t => t.sip_trunk_id === assistantPhone.outbound_trunk_id);
      if (outboundTrunk) {
        console.log(`✅ Outbound trunk found: ${outboundTrunk.name}`);
        console.log(`   Address: ${outboundTrunk.address}`);
        console.log(`   Status: ${outboundTrunk.status}`);
        console.log(`   Auth Username: ${outboundTrunk.auth_username ? 'SET' : 'NOT SET'}`);
        console.log(`   Auth Password: ${outboundTrunk.auth_password ? 'SET' : 'NOT SET'}`);
      } else {
        console.log(`❌ Outbound trunk not found: ${assistantPhone.outbound_trunk_id}`);
      }
    } else {
      console.log(`❌ No phone number assigned to assistant ${assistantId}`);
    }

  } catch (error) {
    console.error('❌ Error checking SIP configuration:', error);
  }
}

// Run the check
checkSipTrunks().catch(console.error);
