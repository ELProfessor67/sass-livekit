/**
 * Example usage of Pinecone Index Service
 * This file demonstrates how to create and manage user-specific Pinecone indexes
 */

import PineconeIndexService from '../services/pinecone-index-service.js';

// Example usage
async function exampleUsage() {
  const pineconeService = new PineconeIndexService();

  try {
    // Example 1: Create an index for a user
    console.log('=== Creating Index for User ===');
    const userId = 'user-123';
    
    const createResult = await pineconeService.createUserIndex(userId, {
      dimension: 1536, // OpenAI text-embedding-3-small
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      },
      tags: {
        user_id: userId,
        environment: 'production',
        type: 'knowledge_base'
      }
    });

    console.log('Create result:', createResult);

    // Example 2: Check if index exists
    console.log('\n=== Checking Index Existence ===');
    const exists = await pineconeService.userIndexExists(userId);
    console.log(`Index exists for user ${userId}:`, exists);

    // Example 3: Get index information
    console.log('\n=== Getting Index Information ===');
    const indexInfo = await pineconeService.getUserIndex(userId);
    console.log('Index info:', indexInfo);

    // Example 4: Get index instance for operations
    console.log('\n=== Getting Index Instance ===');
    const indexInstance = await pineconeService.getUserIndexInstance(userId);
    if (indexInstance) {
      console.log('Index instance ready for operations');
      // You can now use indexInstance for upsert, query, etc.
    } else {
      console.log('Index not ready or not found');
    }

    // Example 5: List all indexes
    console.log('\n=== Listing All Indexes ===');
    const allIndexes = await pineconeService.listAllIndexes();
    console.log('All indexes:', allIndexes);

    // Example 6: Delete index (commented out to avoid accidental deletion)
    // console.log('\n=== Deleting Index ===');
    // const deleteResult = await pineconeService.deleteUserIndex(userId);
    // console.log('Delete result:', deleteResult);

  } catch (error) {
    console.error('Example error:', error);
  }
}

// Example API usage
async function exampleApiUsage() {
  const baseUrl = 'http://localhost:4000/api/v1/pinecone/index';
  
  try {
    // Create index via API
    console.log('=== Creating Index via API ===');
    const createResponse = await fetch(`${baseUrl}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: 'user-456',
        options: {
          dimension: 1536,
          metric: 'cosine',
          tags: {
            user_id: 'user-456',
            environment: 'development'
          }
        }
      })
    });

    const createResult = await createResponse.json();
    console.log('API Create result:', createResult);

    // Check if index exists via API
    console.log('\n=== Checking Index Existence via API ===');
    const existsResponse = await fetch(`${baseUrl}/user-456/exists`);
    const existsResult = await existsResponse.json();
    console.log('API Exists result:', existsResult);

    // Get index info via API
    console.log('\n=== Getting Index Info via API ===');
    const infoResponse = await fetch(`${baseUrl}/user-456`);
    const infoResult = await infoResponse.json();
    console.log('API Info result:', infoResult);

    // List all indexes via API
    console.log('\n=== Listing All Indexes via API ===');
    const listResponse = await fetch(`${baseUrl}/`);
    const listResult = await listResponse.json();
    console.log('API List result:', listResult);

  } catch (error) {
    console.error('API Example error:', error);
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running Pinecone Index Service Examples...\n');
  
  // Uncomment to run service examples
  // exampleUsage();
  
  // Uncomment to run API examples
  // exampleApiUsage();
}

export { exampleUsage, exampleApiUsage };
