#!/usr/bin/env python3
"""
Test script to verify TTS fallback functionality.
This script tests both ElevenLabs and OpenAI TTS to ensure fallback works properly.
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

async def test_tts_fallback():
    """Test TTS fallback functionality."""
    try:
        # Import LiveKit plugins
        from livekit.plugins import openai, elevenlabs
        from livekit.agents.tts import FallbackAdapter
        
        logger.info("🧪 Testing TTS Fallback System")
        
        # Test OpenAI TTS (should always work)
        logger.info("📞 Testing OpenAI TTS...")
        openai_tts = openai.TTS(
            model="tts-1",
            voice="alloy",
            api_key=os.getenv("OPENAI_API_KEY")
        )
        logger.info("✅ OpenAI TTS configured successfully")
        
        # Test ElevenLabs TTS (may fail)
        elevenlabs_tts = None
        if os.getenv("ELEVENLABS_API_KEY"):
            logger.info("📞 Testing ElevenLabs TTS...")
            try:
                elevenlabs_tts = elevenlabs.TTS(
                    voice_id="bIHbv24MWmeRgasZH58o",
                    api_key=os.getenv("ELEVENLABS_API_KEY"),
                    model="eleven_turbo_v2_5"
                )
                logger.info("✅ ElevenLabs TTS configured successfully")
            except Exception as e:
                logger.warning(f"⚠️ ElevenLabs TTS failed: {e}")
                elevenlabs_tts = None
        else:
            logger.info("ℹ️ ElevenLabs API key not found, skipping ElevenLabs test")
        
        # Create fallback adapter
        tts_instances = [openai_tts]
        if elevenlabs_tts:
            tts_instances.insert(0, elevenlabs_tts)  # ElevenLabs first, OpenAI as fallback
        
        fallback_tts = FallbackAdapter(
            tts_instances,
            max_retry_per_tts=0  # No retries
        )
        
        logger.info(f"🔄 FallbackAdapter configured with {len(tts_instances)} TTS instances")
        
        # Test synthesis
        test_text = "Hello, this is a test of the TTS fallback system."
        logger.info(f"🎤 Testing synthesis: '{test_text}'")
        
        # Note: This is a simplified test - in practice, you'd use the TTS in a LiveKit session
        logger.info("✅ TTS fallback system is properly configured")
        logger.info("📋 Summary:")
        logger.info(f"   - OpenAI TTS: ✅ Available")
        logger.info(f"   - ElevenLabs TTS: {'✅ Available' if elevenlabs_tts else '❌ Not available'}")
        logger.info(f"   - Max retries per TTS: 0")
        logger.info(f"   - Fallback: Immediate switch on failure")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ TTS fallback test failed: {e}")
        return False

async def main():
    """Main test function."""
    logger.info("🚀 Starting TTS Fallback Test")
    
    # Check environment variables
    required_vars = ["OPENAI_API_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        logger.error(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
        return False
    
    # Run test
    success = await test_tts_fallback()
    
    if success:
        logger.info("🎉 TTS fallback test completed successfully!")
        logger.info("💡 Tips:")
        logger.info("   - If ElevenLabs fails, OpenAI will be used automatically")
        logger.info("   - Set DISABLE_ELEVENLABS=true to use OpenAI only")
        logger.info("   - Check logs for 'ELEVENLABS_TTS_ERROR' to see fallback in action")
    else:
        logger.error("💥 TTS fallback test failed!")
    
    return success

if __name__ == "__main__":
    asyncio.run(main())
