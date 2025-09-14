// Debug script to check SIP trunk configuration and test calls
import { SipClient } from 'livekit-server-sdk';
import dotenv from 'dotenv';

dotenv.config();

const sipClient = new SipClient(
  process.env.LIVEKIT_HOST,
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET,
);

async function debugSipConfiguration() {
  console.log('🔍 Debugging SIP Configuration...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('LIVEKIT_HOST:', process.env.LIVEKIT_HOST);
  console.log('LIVEKIT_API_KEY:', process.env.LIVEKIT_API_KEY ? 'SET' : 'MISSING');
  console.log('LIVEKIT_API_SECRET:', process.env.LIVEKIT_API_SECRET ? 'SET' : 'MISSING');
  console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'MISSING');
  console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'MISSING');
  console.log('SIP_PROVIDER_ADDRESS:', process.env.SIP_PROVIDER_ADDRESS || 'pstn.twilio.com');
  console.log('SIP_DESTINATION_COUNTRY:', process.env.SIP_DESTINATION_COUNTRY || 'US');
  console.log('');

  try {
    // List all outbound trunks
    console.log('📞 Outbound Trunks:');
    const outboundTrunks = await sipClient.listSipOutboundTrunk();
    console.log(`Found ${outboundTrunks.length} outbound trunks:`);
    
    outboundTrunks.forEach((trunk, index) => {
      console.log(`  ${index + 1}. ${trunk.name} (${trunk.sipTrunkId})`);
      console.log(`     Address: ${trunk.address}`);
      console.log(`     Numbers: ${trunk.numbers?.join(', ') || 'None'}`);
      console.log(`     Status: ${trunk.status || 'N/A'}`);
      console.log(`     Auth Username: ${trunk.authUsername ? 'SET' : 'NOT SET'}`);
      console.log(`     Auth Password: ${trunk.authPassword ? 'SET' : 'NOT SET'}`);
      console.log(`     Destination Country: ${trunk.destinationCountry || 'N/A'}`);
      console.log('');
    });

    // List all inbound trunks
    console.log('📥 Inbound Trunks:');
    const inboundTrunks = await sipClient.listSipInboundTrunk();
    console.log(`Found ${inboundTrunks.length} inbound trunks:`);
    
    inboundTrunks.forEach((trunk, index) => {
      console.log(`  ${index + 1}. ${trunk.name} (${trunk.sipTrunkId})`);
      console.log(`     Numbers: ${trunk.numbers?.join(', ') || 'None'}`);
      console.log(`     Status: ${trunk.status || 'N/A'}`);
      console.log('');
    });

    // List SIP dispatch rules
    console.log('🎯 SIP Dispatch Rules:');
    const dispatchRules = await sipClient.listSipDispatchRule();
    console.log(`Found ${dispatchRules.length} dispatch rules:`);
    
    dispatchRules.forEach((rule, index) => {
      console.log(`  ${index + 1}. ${rule.name} (${rule.sipDispatchRuleId})`);
      console.log(`     Type: ${rule.rule?.dispatchRuleIndividual ? 'individual' : 'N/A'}`);
      console.log(`     Trunk IDs: ${rule.trunkIds?.join(', ') || 'None'}`);
      console.log(`     Room Prefix: ${rule.rule?.dispatchRuleIndividual?.roomPrefix || 'None'}`);
      console.log(`     Agents: ${rule.roomConfig?.agents?.map(a => a.agentName).join(', ') || 'None'}`);
      console.log('');
    });

    // Test a simple SIP participant creation (without actually calling)
    console.log('🧪 Testing SIP Participant Creation...');
    const testRoomName = `test-room-${Date.now()}`;
    const testPhoneNumber = '+12017656193'; // Use the same number from your logs
    
    try {
      // Find the first outbound trunk
      const firstOutboundTrunk = outboundTrunks[0];
      if (!firstOutboundTrunk) {
        console.log('❌ No outbound trunks found!');
        return;
      }

      console.log(`Using outbound trunk: ${firstOutboundTrunk.name} (${firstOutboundTrunk.sipTrunkId})`);
      
      // Create a test SIP participant
      const testParticipant = await sipClient.createSipParticipant(
        firstOutboundTrunk.sipTrunkId,
        testPhoneNumber,
        testRoomName,
        {
          participantIdentity: `test-identity-${Date.now()}`,
          participantName: 'Test Call',
          krispEnabled: true,
          metadata: JSON.stringify({
            test: true,
            source: 'debug-script'
          })
        }
      );

      console.log('✅ Test SIP participant created successfully:');
      console.log(`   Participant ID: ${testParticipant.participantId}`);
      console.log(`   Room Name: ${testParticipant.roomName}`);
      console.log(`   SIP Call ID: ${testParticipant.sipCallId}`);
      console.log(`   Status: ${testParticipant.status}`);

      // Clean up the test participant
      console.log('🧹 Cleaning up test participant...');
      await sipClient.deleteSipParticipant(testParticipant.sipCallId);
      console.log('✅ Test participant cleaned up');

    } catch (testError) {
      console.log('❌ Test SIP participant creation failed:');
      console.log(`   Error: ${testError.message}`);
      console.log(`   Details: ${JSON.stringify(testError, null, 2)}`);
    }

  } catch (error) {
    console.error('❌ Error debugging SIP configuration:', error);
  }
}

// Run the debug function
debugSipConfiguration().catch(console.error);
