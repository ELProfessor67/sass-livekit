/**
 * Test script to verify knowledge base creation with Pinecone integration
 * Run this to test the complete flow
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4000/api/v1';

async function testKnowledgeBaseCreation() {
  console.log('🧪 Testing Knowledge Base Creation with Pinecone Integration\n');

  try {
    // Test data
    const testData = {
      companyId: 'test-company-123',
      name: 'Test Knowledge Base',
      description: 'A test knowledge base to verify Pinecone integration'
    };

    console.log('📝 Creating knowledge base...');
    console.log('Test data:', testData);

    // Create knowledge base
    const response = await fetch(`${BASE_URL}/knowledge-base/knowledge-bases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': 'test-user-123' // Simulate user ID
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ Knowledge base created successfully!');
      console.log('📊 Knowledge Base Info:');
      console.log(`  - ID: ${result.knowledgeBase.id}`);
      console.log(`  - Name: ${result.knowledgeBase.name}`);
      console.log(`  - Company ID: ${result.knowledgeBase.company_id}`);
      console.log(`  - Created: ${result.knowledgeBase.created_at}`);

      if (result.pineconeIndex) {
        console.log('\n🔍 Pinecone Index Info:');
        console.log(`  - Name: ${result.pineconeIndex.name}`);
        console.log(`  - Host: ${result.pineconeIndex.host}`);
        console.log(`  - Status: ${result.pineconeIndex.status?.state || result.pineconeIndex.status}`);
        console.log(`  - Dimension: ${result.pineconeIndex.dimension}`);
        console.log(`  - Metric: ${result.pineconeIndex.metric}`);
      } else {
        console.log('\n⚠️  No Pinecone index information returned');
      }

      if (result.pineconeNamespace) {
        console.log('\n📁 Pinecone Namespace Info:');
        console.log(`  - Name: ${result.pineconeNamespace.name}`);
        console.log(`  - Record Count: ${result.pineconeNamespace.recordCount}`);
        console.log(`  - Exists: ${result.pineconeNamespace.exists}`);
      } else {
        console.log('\n⚠️  No Pinecone namespace information returned');
      }

      if (result.pineconeAssistant) {
        console.log('\n🤖 Pinecone Assistant Info:');
        console.log(`  - ID: ${result.pineconeAssistant.id}`);
        console.log(`  - Name: ${result.pineconeAssistant.name}`);
        console.log(`  - Instructions: ${result.pineconeAssistant.instructions?.substring(0, 100)}...`);
        console.log(`  - Region: ${result.pineconeAssistant.region}`);
        console.log(`  - Created: ${result.pineconeAssistant.created_at}`);
        console.log(`  - Knowledge Base ID: ${result.pineconeAssistant.knowledge_base_id}`);
        console.log(`  - User ID: ${result.pineconeAssistant.user_id}`);
      } else {
        console.log('\n⚠️  No Pinecone assistant information returned');
      }

      // Test checking if index exists
      console.log('\n🔍 Checking if Pinecone index exists...');
      const existsResponse = await fetch(`${BASE_URL}/pinecone/index/${testData.companyId}/exists`);
      const existsResult = await existsResponse.json();

      if (existsResult.success) {
        console.log(`✅ Index exists: ${existsResult.exists}`);
        if (existsResult.exists) {
          console.log(`📝 Index name: ${existsResult.indexName}`);
        }
      } else {
        console.log('❌ Failed to check index existence');
      }

      // Test getting index info
      console.log('\n📋 Getting index information...');
      const infoResponse = await fetch(`${BASE_URL}/pinecone/index/${testData.companyId}`);
      const infoResult = await infoResponse.json();

      if (infoResult.success) {
        console.log('✅ Index information retrieved:');
        console.log(`  - Name: ${infoResult.index.name}`);
        console.log(`  - Status: ${infoResult.index.status?.state || infoResult.index.status}`);
        console.log(`  - Dimension: ${infoResult.index.dimension}`);
        console.log(`  - Metric: ${infoResult.index.metric}`);
      } else {
        console.log('❌ Failed to get index information');
      }

      // Test namespace operations
      console.log('\n=== Testing Namespace Operations ===');
      
      // List namespaces for the company
      const namespacesResponse = await fetch(`${BASE_URL}/pinecone/index/${testData.companyId}/namespaces`);
      const namespacesResult = await namespacesResponse.json();
      console.log('Namespaces for company:', namespacesResult);

      // Get specific namespace info
      if (result.knowledgeBase && result.knowledgeBase.id) {
        const namespaceInfoResponse = await fetch(`${BASE_URL}/pinecone/index/${testData.companyId}/namespace/${result.knowledgeBase.id}`);
        const namespaceInfoResult = await namespaceInfoResponse.json();
        console.log('Specific namespace info:', namespaceInfoResult);
      }

      // Test assistant operations
      console.log('\n=== Testing Assistant Operations ===');
      
      // List all assistants
      const assistantsResponse = await fetch(`${BASE_URL}/pinecone/index/assistants`);
      const assistantsResult = await assistantsResponse.json();
      console.log('All assistants:', assistantsResult);

      // Get specific assistant info
      if (result.pineconeAssistant && result.pineconeAssistant.id) {
        const assistantInfoResponse = await fetch(`${BASE_URL}/pinecone/index/assistants/${result.pineconeAssistant.id}`);
        const assistantInfoResult = await assistantInfoResponse.json();
        console.log('Specific assistant info:', assistantInfoResult);
      }

    } else {
      console.log('❌ Failed to create knowledge base');
      console.log('Error:', result.error || result.message);
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }
}

async function testExistingIndex() {
  console.log('\n🔄 Testing with existing index...\n');

  try {
    const testData = {
      companyId: 'test-company-123', // Same company ID as before
      name: 'Another Test Knowledge Base',
      description: 'Testing with existing Pinecone index'
    };

    console.log('📝 Creating another knowledge base for same company...');
    console.log('Test data:', testData);

    const response = await fetch(`${BASE_URL}/knowledge-base/knowledge-bases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': 'test-user-123'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ Second knowledge base created successfully!');
      console.log('📊 Knowledge Base Info:');
      console.log(`  - ID: ${result.knowledgeBase.id}`);
      console.log(`  - Name: ${result.knowledgeBase.name}`);

      if (result.pineconeIndex) {
        console.log('\n🔍 Pinecone Index Info (should be same as before):');
        console.log(`  - Name: ${result.pineconeIndex.name}`);
        console.log(`  - Status: ${result.pineconeIndex.status?.state || result.pineconeIndex.status}`);
      }
    } else {
      console.log('❌ Failed to create second knowledge base');
      console.log('Error:', result.error || result.message);
    }

  } catch (error) {
    console.error('💥 Second test failed with error:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Knowledge Base + Pinecone Integration Tests\n');
  console.log('Make sure your server is running on http://localhost:4000');
  console.log('Make sure PINECONE_API_KEY is set in your environment\n');

  await testKnowledgeBaseCreation();
  await testExistingIndex();

  console.log('\n✨ Tests completed!');
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { testKnowledgeBaseCreation, testExistingIndex, runTests };
