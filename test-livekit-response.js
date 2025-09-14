// Test script to see the actual LiveKit API response structure
import { SipClient } from 'livekit-server-sdk';
import dotenv from 'dotenv';

dotenv.config();

const sipClient = new SipClient(
  process.env.LIVEKIT_HOST,
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET,
);

async function testLiveKitResponse() {
  console.log('🔍 Testing LiveKit API Response Structure...\n');

  try {
    // List outbound trunks and examine the response structure
    console.log('📞 Outbound Trunks Response:');
    const outboundTrunks = await sipClient.listSipOutboundTrunk();
    console.log('Raw response structure:');
    console.log(JSON.stringify(outboundTrunks[0], null, 2));
    console.log('\nAvailable keys in first trunk:');
    console.log(Object.keys(outboundTrunks[0] || {}));
    
    // List inbound trunks and examine the response structure
    console.log('\n📥 Inbound Trunks Response:');
    const inboundTrunks = await sipClient.listSipInboundTrunk();
    console.log('Raw response structure:');
    console.log(JSON.stringify(inboundTrunks[0], null, 2));
    console.log('\nAvailable keys in first trunk:');
    console.log(Object.keys(inboundTrunks[0] || {}));
    
    // List dispatch rules and examine the response structure
    console.log('\n🎯 Dispatch Rules Response:');
    const dispatchRules = await sipClient.listSipDispatchRule();
    console.log('Raw response structure:');
    console.log(JSON.stringify(dispatchRules[0], null, 2));
    console.log('\nAvailable keys in first rule:');
    console.log(Object.keys(dispatchRules[0] || {}));

  } catch (error) {
    console.error('❌ Error testing LiveKit response:', error);
  }
}

// Run the test
testLiveKitResponse().catch(console.error);
