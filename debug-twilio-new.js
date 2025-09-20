// Debug script to test with new Twilio API instance
import twilio from 'twilio';

console.log('🔍 Testing Twilio API with new instance...\n');

// Test with the exact credentials from your logs
const accountSid = 'ACca68721198802e95508b953dfb5768a4';
const authToken = '767010135ac211043b4cdeb41504a65e';

console.log('📋 Credentials being tested:');
console.log('Account SID:', accountSid);
console.log('Auth Token length:', authToken.length);
console.log('Auth Token preview:', authToken.substring(0, 4) + '...' + authToken.substring(28, 32));
console.log('');

// Test 1: Create new Twilio client instance
console.log('--- Test 1: Creating new Twilio client ---');
try {
  const client = twilio(accountSid, authToken);
  console.log('✅ Twilio client created successfully');
  
  // Test 2: Try to get account information
  console.log('\n--- Test 2: Fetching account information ---');
  client.api.accounts(accountSid).fetch()
    .then(account => {
      console.log('✅ Account info retrieved successfully');
      console.log('Account SID:', account.sid);
      console.log('Account Name:', account.friendlyName);
      console.log('Account Status:', account.status);
      console.log('Account Type:', account.type);
      console.log('Account Subresource URIs:', account.subresourceUris);
    })
    .catch(error => {
      console.log('❌ Error fetching account info:');
      console.log('Error message:', error.message);
      console.log('Error code:', error.code);
      console.log('Error status:', error.status);
      console.log('Error moreInfo:', error.moreInfo);
      console.log('Full error object:', JSON.stringify(error, null, 2));
    });
    
  // Test 3: Try to list incoming phone numbers
  console.log('\n--- Test 3: Listing incoming phone numbers ---');
  client.incomingPhoneNumbers.list({ limit: 5 })
    .then(numbers => {
      console.log('✅ Phone numbers retrieved successfully');
      console.log('Number of phone numbers found:', numbers.length);
      numbers.forEach((number, index) => {
        console.log(`Phone ${index + 1}:`, {
          sid: number.sid,
          phoneNumber: number.phoneNumber,
          friendlyName: number.friendlyName,
          capabilities: number.capabilities
        });
      });
    })
    .catch(error => {
      console.log('❌ Error listing phone numbers:');
      console.log('Error message:', error.message);
      console.log('Error code:', error.code);
      console.log('Error status:', error.status);
      console.log('Full error object:', JSON.stringify(error, null, 2));
    });
    
  // Test 4: Try to get account balance
  console.log('\n--- Test 4: Checking account balance ---');
  client.api.balance.fetch()
    .then(balance => {
      console.log('✅ Account balance retrieved successfully');
      console.log('Balance:', balance.balance);
      console.log('Currency:', balance.currency);
    })
    .catch(error => {
      console.log('❌ Error fetching account balance:');
      console.log('Error message:', error.message);
      console.log('Error code:', error.code);
      console.log('Error status:', error.status);
      console.log('Full error object:', JSON.stringify(error, null, 2));
    });
    
  // Test 5: Try to send a test SMS (commented out to avoid charges)
  console.log('\n--- Test 5: SMS sending test (commented out) ---');
  console.log('⚠️  SMS sending test is commented out to avoid charges');
  console.log('To test SMS sending, uncomment the code below and provide a valid phone number');
  console.log('From number from your logs: +13024371972');
  console.log('To test, uncomment the following code:');
  console.log(`
  client.messages.create({
    body: 'Test message from debug script',
    from: '+13024371972',
    to: '+1234567890' // Replace with a valid test number
  })
  .then(message => {
    console.log('✅ SMS sent successfully:', message.sid);
  })
  .catch(error => {
    console.log('❌ Error sending SMS:', error.message);
    console.log('Error code:', error.code);
  });
  `);
  
} catch (error) {
  console.log('❌ Error creating Twilio client:');
  console.log('Error message:', error.message);
  console.log('Error code:', error.code);
  console.log('Full error object:', JSON.stringify(error, null, 2));
}

// Test 6: Try with different Twilio client initialization methods
console.log('\n--- Test 6: Alternative Twilio client initialization ---');
try {
  // Method 1: Using Twilio constructor directly
  const client1 = new twilio.Twilio(accountSid, authToken);
  console.log('✅ Method 1: new Twilio.Twilio() - Success');
  
  // Method 2: Using twilio() function
  const client2 = twilio(accountSid, authToken);
  console.log('✅ Method 2: twilio() function - Success');
  
  // Method 3: Using twilio.Twilio constructor
  const client3 = twilio.Twilio(accountSid, authToken);
  console.log('✅ Method 3: twilio.Twilio() - Success');
  
} catch (error) {
  console.log('❌ Error with alternative initialization methods:');
  console.log('Error message:', error.message);
  console.log('Full error object:', JSON.stringify(error, null, 2));
}

console.log('\n🔍 Debug test completed');

