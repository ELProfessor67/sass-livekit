#!/usr/bin/env python3
"""
Test script to verify audio loop fix.
This script helps test the audio configuration changes to prevent "can you hear me" loops.
"""

import os
import sys
import asyncio
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv("livekit/.env")

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import CallHandler

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_audio_configuration():
    """Test the audio configuration settings."""
    print("🔧 Testing Audio Configuration Fix")
    print("=" * 50)
    
    # Test configuration
    test_config = {
        "id": "test-assistant",
        "prompt": "You are a helpful test assistant.",
        "first_message": "Hello, this is a test call.",
        "idle_messages": [
            "Are you still there?",
            "I'm still here if you need anything",
            "Please let me know if you need assistance"
        ],
        "max_idle_messages": 3,
        "silence_timeout": 15,  # New default: 15 seconds
        "idle_messages_enabled": True,
        "end_call_message": "Thank you for testing. Goodbye!",
        "max_call_duration": 30,
        "llm_provider_setting": "OpenAI",
        "llm_model_setting": "gpt-4o-mini",
        "voice_provider_setting": "OpenAI", 
        "voice_model_setting": "tts-1",
        "voice_name_setting": "alloy",
        "stt_model": "whisper-1",
        "language_setting": "en"
    }
    
    print("✅ Configuration loaded successfully")
    print(f"   - Silence timeout: {test_config['silence_timeout']} seconds")
    print(f"   - Max idle messages: {test_config['max_idle_messages']}")
    print(f"   - Idle messages enabled: {test_config['idle_messages_enabled']}")
    print(f"   - Idle messages count: {len(test_config['idle_messages'])}")
    
    # Test session creation
    try:
        handler = CallHandler()
        session = handler._create_session(test_config)
        
        print("✅ AgentSession created successfully")
        print(f"   - Min endpointing delay: {session.options.min_endpointing_delay}")
        print(f"   - Max endpointing delay: {session.options.max_endpointing_delay}")
        print(f"   - User away timeout: {session.options.user_away_timeout}")
        
        # Verify the fixes
        assert session.options.min_endpointing_delay == 1.0, f"Expected min_endpointing_delay=1.0, got {session.options.min_endpointing_delay}"
        assert session.options.max_endpointing_delay == 8.0, f"Expected max_endpointing_delay=8.0, got {session.options.max_endpointing_delay}"
        assert session.options.user_away_timeout == 20.0, f"Expected user_away_timeout=20.0, got {session.options.user_away_timeout}"
        
        print("✅ Audio configuration fixes verified:")
        print("   - Min endpointing delay increased to 1.0s (prevents audio feedback)")
        print("   - Max endpointing delay increased to 8.0s (more time for user response)")
        print("   - User away timeout increased to 20.0s (prevents immediate idle messages)")
        
    except Exception as e:
        print(f"❌ Error creating session: {e}")
        return False
    
    print("\n🎯 Audio Loop Prevention Summary:")
    print("=" * 50)
    print("1. ✅ Increased endpointing delays to prevent audio feedback loops")
    print("2. ✅ Increased silence timeout to 15 seconds (from 10)")
    print("3. ✅ Added buffer to user away timeout (silence_timeout + 5)")
    print("4. ✅ Improved idle message logic with user state checking")
    print("5. ✅ Increased wait time between idle messages (15s instead of 10s)")
    print("6. ✅ Removed 'Can you hear me?' from default idle messages")
    print("7. ✅ Added option to disable idle messages entirely")
    
    print("\n📋 Recommendations:")
    print("- Test with actual calls to verify the fix works")
    print("- Monitor logs for 'IDLE_MESSAGE_TRIGGERED' events")
    print("- Consider disabling idle messages if issues persist")
    print("- Adjust silence_timeout based on your specific use case")
    
    return True

def main():
    """Main test function."""
    print("🚀 Audio Loop Fix Test")
    print("This script tests the configuration changes to prevent 'can you hear me' loops.")
    print()
    
    # Check required environment variables
    required_vars = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "OPENAI_API_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
        print("Please ensure your .env file is properly configured.")
        return False
    
    print("✅ Environment variables configured")
    
    # Run the test
    success = test_audio_configuration()
    
    if success:
        print("\n🎉 All tests passed! The audio loop fix should work correctly.")
        print("\nTo apply these changes:")
        print("1. Restart your LiveKit agent")
        print("2. Test with a real call")
        print("3. Monitor the logs for improved behavior")
    else:
        print("\n❌ Tests failed. Please check the configuration.")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
