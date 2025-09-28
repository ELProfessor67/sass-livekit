#!/usr/bin/env python3
"""
Test script for REST API LLM service
This script tests the REST API implementation without requiring a full LiveKit setup
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

# Add the livekit directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

from services.rest_llm_service import RestLLMService
from config.rest_api_config import get_rest_config

async def test_rest_llm():
    """Test the REST LLM service"""
    
    # Get API key from environment
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY not found in environment variables")
        return
    
    print("🧪 Testing REST LLM Service")
    print(f"📋 Configuration: {get_rest_config().__dict__}")
    
    # Create REST LLM service
    llm_service = RestLLMService(
        model="gpt-4o-mini",
        api_key=api_key,
        base_url="https://api.openai.com/v1"
    )
    
    # Set system prompt
    llm_service.set_system_prompt("You are a helpful assistant. Keep responses concise.")
    
    # Test message
    test_message = "Hello! Can you tell me what 2+2 equals?"
    
    print(f"💬 Sending message: {test_message}")
    print("🔄 Streaming response:")
    print("-" * 50)
    
    try:
        # Stream the response
        response_text = ""
        async for chunk in llm_service.generate_response(test_message):
            print(chunk, end="", flush=True)
            response_text += chunk
        
        print("\n" + "-" * 50)
        print(f"✅ Complete response: {response_text}")
        
        # Test conversation history
        print(f"📚 Conversation history: {len(llm_service.get_history())} messages")
        
        # Test follow-up message
        follow_up = "What about 3+3?"
        print(f"\n💬 Follow-up message: {follow_up}")
        print("🔄 Streaming response:")
        print("-" * 50)
        
        response_text2 = ""
        async for chunk in llm_service.generate_response(follow_up):
            print(chunk, end="", flush=True)
            response_text2 += chunk
        
        print("\n" + "-" * 50)
        print(f"✅ Complete response: {response_text2}")
        print(f"📚 Final conversation history: {len(llm_service.get_history())} messages")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

async def test_config():
    """Test the configuration system"""
    print("🧪 Testing Configuration System")
    
    config = get_rest_config()
    print(f"📋 REST Config: {config.__dict__}")
    
    # Test model detection
    test_models = ["gpt-4o-mini", "gpt-4", "gpt-3.5-turbo", "unknown-model"]
    for model in test_models:
        should_use_rest = config.should_use_rest_api(model)
        print(f"🤖 Model '{model}': {'✅ REST API' if should_use_rest else '❌ WebSocket'}")

if __name__ == "__main__":
    print("🚀 Starting REST API LLM Tests")
    print("=" * 60)
    
    # Test configuration first
    asyncio.run(test_config())
    
    print("\n" + "=" * 60)
    
    # Test REST LLM service
    asyncio.run(test_rest_llm())
    
    print("\n" + "=" * 60)
    print("✅ Tests completed!")
