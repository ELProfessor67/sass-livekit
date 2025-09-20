#!/usr/bin/env python3
"""
Test script for RAG integration with LiveKit agents
"""

import asyncio
import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from services.rag_service import rag_service

async def test_rag_service():
    """Test the RAG service functionality"""
    print("🧪 Testing RAG Service Integration")
    print("=" * 50)
    
    # Test knowledge base info retrieval
    test_kb_id = "test-knowledge-base-id"
    print(f"📚 Testing knowledge base info retrieval for: {test_kb_id}")
    
    kb_info = await rag_service.get_knowledge_base_info(test_kb_id)
    if kb_info:
        print(f"✅ Knowledge base info retrieved: {kb_info.get('name', 'Unknown')}")
    else:
        print("❌ Knowledge base info not found (expected for test ID)")
    
    # Test context retrieval (will fail without real KB, but tests the flow)
    test_query = "What is artificial intelligence?"
    print(f"\n🔍 Testing context retrieval for query: '{test_query}'")
    
    context = await rag_service.get_enhanced_context(
        knowledge_base_id=test_kb_id,
        query=test_query,
        max_context_length=1000
    )
    
    if context:
        print(f"✅ Context retrieved: {len(context)} characters")
        print(f"Preview: {context[:200]}...")
    else:
        print("❌ No context retrieved (expected for test KB)")
    
    # Test multiple queries
    print(f"\n🔍 Testing multiple queries")
    queries = ["AI", "machine learning", "neural networks"]
    
    multi_context = await rag_service.search_multiple_queries(
        knowledge_base_id=test_kb_id,
        queries=queries,
        max_context_length=1000
    )
    
    if multi_context:
        print(f"✅ Multi-query context retrieved: {len(multi_context)} characters")
    else:
        print("❌ No multi-query context retrieved (expected for test KB)")
    
    print("\n🎯 RAG Service test completed!")
    print("Note: Tests will show 'not found' errors for test KB ID, which is expected.")

async def test_rag_assistant():
    """Test the RAG assistant functionality"""
    print("\n🤖 Testing RAG Assistant Integration")
    print("=" * 50)
    
    from services.rag_assistant import RAGAssistant
    
    # Create a test RAG assistant
    test_instructions = "You are a helpful AI assistant with access to a knowledge base."
    test_kb_id = "test-knowledge-base-id"
    test_company_id = "test-company-id"
    
    assistant = RAGAssistant(
        instructions=test_instructions,
        knowledge_base_id=test_kb_id,
        company_id=test_company_id
    )
    
    print(f"✅ RAG Assistant created with KB: {test_kb_id}")
    print(f"✅ RAG enabled: {assistant.rag_enabled}")
    print(f"✅ Max context length: {assistant.max_context_length}")
    
    # Test RAG lookup decision logic
    test_queries = [
        "What is AI?",  # Should trigger RAG
        "Book an appointment",  # Should not trigger RAG (booking)
        "Hi there",  # Should not trigger RAG (greeting)
        "Tell me about machine learning algorithms"  # Should trigger RAG
    ]
    
    print(f"\n🧠 Testing RAG lookup decision logic:")
    for query in test_queries:
        should_rag = assistant._should_perform_rag_lookup(query)
        print(f"  '{query}' -> RAG: {should_rag}")
    
    print("\n🎯 RAG Assistant test completed!")

async def main():
    """Main test function"""
    print("🚀 Starting RAG Integration Tests")
    print("=" * 60)
    
    # Check environment variables
    required_vars = [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY", 
        "PINECONE_API_KEY"
    ]
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        print(f"⚠️  Missing environment variables: {', '.join(missing_vars)}")
        print("Some tests may not work properly without these variables.")
    else:
        print("✅ All required environment variables are set")
    
    # Run tests
    await test_rag_service()
    await test_rag_assistant()
    
    print("\n🎉 All tests completed!")
    print("\nTo use RAG integration in production:")
    print("1. Ensure assistant has knowledge_base_id and company_id set")
    print("2. Ensure knowledge base is properly configured in Pinecone")
    print("3. The agent will automatically use RAG when knowledge base is available")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
