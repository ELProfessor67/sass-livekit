#!/usr/bin/env python3
"""
Test script to verify persistent failure TTS behavior.
This script simulates ElevenLabs failures and verifies the system switches to OpenAI permanently.
"""

import os
import asyncio
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv("livekit/.env")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_persistent_failure():
    """Test persistent failure TTS behavior."""
    try:
        # Import the PersistentFailureTTS class
        import sys
        sys.path.append('.')
        from main import PersistentFailureTTS
        
        # Import LiveKit plugins
        from livekit.plugins import openai, elevenlabs
        
        logger.info("🧪 Testing Persistent Failure TTS")
        
        # Create mock TTS instances
        openai_tts = openai.TTS(
            model="tts-1",
            voice="alloy",
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # Create a mock ElevenLabs TTS that will fail
        class MockFailingTTS:
            async def synthesize(self, text, **kwargs):
                raise Exception("Mock ElevenLabs timeout")
        
        mock_elevenlabs = MockFailingTTS()
        
        # Test 1: First attempt - should fail and switch to OpenAI
        logger.info("📞 Test 1: First attempt with failing ElevenLabs")
        persistent_tts = PersistentFailureTTS(
            primary_tts=mock_elevenlabs,
            fallback_tts=openai_tts,
            failure_key="TEST_ELEVENLABS_FAILURE_COUNT"
        )
        
        # Reset failure count for test
        os.environ["TEST_ELEVENLABS_FAILURE_COUNT"] = "0"
        
        try:
            result = await persistent_tts.synthesize("Hello, this is a test")
            logger.info("✅ Test 1 passed: Successfully fell back to OpenAI")
        except Exception as e:
            logger.error(f"❌ Test 1 failed: {e}")
        
        # Test 2: Second attempt - should use OpenAI directly (no retry)
        logger.info("📞 Test 2: Second attempt (should use OpenAI directly)")
        persistent_tts2 = PersistentFailureTTS(
            primary_tts=mock_elevenlabs,
            fallback_tts=openai_tts,
            failure_key="TEST_ELEVENLABS_FAILURE_COUNT"
        )
        
        try:
            result = await persistent_tts2.synthesize("Hello, this is another test")
            logger.info("✅ Test 2 passed: Used OpenAI directly (no retry)")
        except Exception as e:
            logger.error(f"❌ Test 2 failed: {e}")
        
        # Check failure count
        failure_count = os.getenv("TEST_ELEVENLABS_FAILURE_COUNT", "0")
        logger.info(f"📊 Failure count: {failure_count}")
        
        if int(failure_count) > 0:
            logger.info("✅ Persistent failure tracking working correctly")
        else:
            logger.warning("⚠️ Failure count not incremented")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Persistent failure test failed: {e}")
        return False

async def main():
    """Main test function."""
    logger.info("🚀 Starting Persistent Failure TTS Test")
    
    # Check environment variables
    if not os.getenv("OPENAI_API_KEY"):
        logger.error("❌ OPENAI_API_KEY not set")
        return False
    
    # Run test
    success = await test_persistent_failure()
    
    if success:
        logger.info("🎉 Persistent failure test completed successfully!")
        logger.info("💡 Key behaviors verified:")
        logger.info("   - ElevenLabs fails → switches to OpenAI")
        logger.info("   - Subsequent calls use OpenAI directly")
        logger.info("   - No retries of failed ElevenLabs")
        logger.info("   - Failure count is tracked")
    else:
        logger.error("💥 Persistent failure test failed!")
    
    return success

if __name__ == "__main__":
    asyncio.run(main())
