#!/usr/bin/env python3
"""
LiveKit Agent Setup Script
This script helps set up the LiveKit agent with proper environment variables.
"""

import os
import sys
from pathlib import Path

def create_env_file():
    """Create a .env file with required environment variables."""
    env_content = """# LiveKit Configuration
LIVEKIT_URL=wss://wave-runner-digital-u7hzbsf1.livekit.cloud
LIVEKIT_HOST=wss://wave-runner-digital-u7hzbsf1.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here

# Agent Configuration
LK_AGENT_NAME=ai

# Backend Configuration
BACKEND_URL=http://localhost:4000
ASSISTANT_RESOLVER_PATH=/api/v1/livekit/assistant

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SUPABASE_SERVICE_ROLE=your_supabase_service_role_key_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_LLM_MODEL=gpt-4o-mini
OPENAI_STT_MODEL=gpt-4o-transcribe
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
SIP_PROVIDER_ADDRESS=pstn.twilio.com
SIP_DESTINATION_COUNTRY=US

# Frontend Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_BACKEND_URL=http://localhost:4000
VITE_LIVEKIT_URL=wss://wave-runner-digital-u7hzbsf1.livekit.cloud

# Stripe Configuration (if using payments)
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_TEST_KEY=your_stripe_secret_key_here

# Other Configuration
FORCE_FIRST_MESSAGE=true
DISPATCH_ROOM_PREFIX=call-
"""
    
    env_file = Path('.env')
    if env_file.exists():
        print("⚠️  .env file already exists. Backing up to .env.backup")
        env_file.rename('.env.backup')
    
    with open('.env', 'w') as f:
        f.write(env_content)
    
    print("✅ Created .env file with template values")
    print("📝 Please edit .env file with your actual credentials")

def check_dependencies():
    """Check if required Python packages are installed."""
    required_packages = [
        'livekit',
        'livekit-agents',
        'livekit-plugins-openai',
        'livekit-plugins-silero',
        'supabase',
        'python-dotenv'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("❌ Missing required packages:")
        for package in missing_packages:
            print(f"   - {package}")
        print("\n📦 Install them with:")
        print(f"   pip install {' '.join(missing_packages)}")
        return False
    
    print("✅ All required packages are installed")
    return True

def test_livekit_connection():
    """Test LiveKit connection."""
    try:
        from livekit import agents
        print("✅ LiveKit agents module imported successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to import LiveKit agents: {e}")
        return False

def main():
    """Main setup function."""
    print("🚀 LiveKit Agent Setup")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not Path('livekit/main.py').exists():
        print("❌ Please run this script from the project root directory")
        sys.exit(1)
    
    # Check dependencies
    if not check_dependencies():
        print("\n❌ Please install missing dependencies first")
        sys.exit(1)
    
    # Test LiveKit connection
    if not test_livekit_connection():
        print("\n❌ LiveKit connection test failed")
        sys.exit(1)
    
    # Create .env file
    create_env_file()
    
    print("\n🎉 Setup complete!")
    print("\n📋 Next steps:")
    print("1. Edit .env file with your actual credentials")
    print("2. Start the backend server: npm start")
    print("3. Start the LiveKit agent: python livekit/main.py")
    print("\n🔧 Troubleshooting:")
    print("- Make sure your LiveKit credentials are correct")
    print("- Check that your network can reach wave-runner-digital-u7hzbsf1.livekit.cloud")
    print("- Verify that your OpenAI API key is valid")

if __name__ == "__main__":
    main()
