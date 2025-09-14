const { SipClient } = require('livekit-server-sdk');

async function getOutboundTrunkId() {
  const lk = new SipClient(
    process.env.LIVEKIT_HOST,
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET
  );

  try {
    console.log('🔍 Getting outbound trunks...');
    const outboundTrunks = await lk.listSipOutboundTrunk();
    
    console.log('📞 Outbound Trunks:');
    outboundTrunks.forEach((trunk, index) => {
      console.log(`  ${index + 1}. ${trunk.name} (${trunk.sip_trunk_id})`);
      console.log(`     Address: ${trunk.address}`);
      console.log(`     Numbers: ${trunk.numbers?.join(', ') || 'None'}`);
    });

    // Find the trunk for the hospital manager assistant
    const hospitalTrunk = outboundTrunks.find(trunk => 
      trunk.name.includes('hospital-manager') || 
      trunk.name.includes('ast-outbound')
    );

    if (hospitalTrunk) {
      console.log(`\n🎯 Found hospital manager trunk:`);
      console.log(`   Name: ${hospitalTrunk.name}`);
      console.log(`   ID: ${hospitalTrunk.sip_trunk_id}`);
      console.log(`   Address: ${hospitalTrunk.address}`);
      console.log(`\n✅ Use this SIP_TRUNK_ID: ${hospitalTrunk.sip_trunk_id}`);
    } else {
      console.log('\n❌ No hospital manager trunk found');
    }

  } catch (error) {
    console.error('❌ Error getting outbound trunks:', error.message);
  }
}

getOutboundTrunkId();
