// Test file for knowledge base API integration
import { knowledgeBaseAPI } from './knowledgeBase';

// Test function to verify API connectivity
export async function testKnowledgeBaseAPI() {
  console.log('Testing Knowledge Base API Integration...');
  
  try {
    // Test 1: Check if we can get documents (should work even with empty result)
    console.log('1. Testing getDocuments...');
    const documents = await knowledgeBaseAPI.getDocuments();
    console.log('✅ getDocuments successful:', documents.documents.length, 'documents found');
    
    // Test 2: Check if we can get stats
    console.log('2. Testing getStats...');
    const stats = await knowledgeBaseAPI.getStats();
    console.log('✅ getStats successful:', stats);
    
    // Test 3: Check if we can get configurations
    console.log('3. Testing getChunkingConfig...');
    const chunkingConfig = await knowledgeBaseAPI.getChunkingConfig();
    console.log('✅ getChunkingConfig successful:', chunkingConfig);
    
    console.log('🎉 All API tests passed! Knowledge Base integration is working.');
    return true;
    
  } catch (error) {
    console.error('❌ API test failed:', error);
    return false;
  }
}

// Test search functionality
export async function testSearch(query: string = "test query") {
  try {
    console.log(`Testing search with query: "${query}"`);
    const results = await knowledgeBaseAPI.searchSimilarChunks(query);
    console.log('✅ Search successful:', results);
    return results;
  } catch (error) {
    console.error('❌ Search test failed:', error);
    throw error;
  }
}

// Export for use in browser console or other tests
if (typeof window !== 'undefined') {
  (window as any).testKnowledgeBaseAPI = testKnowledgeBaseAPI;
  (window as any).testSearch = testSearch;
}
