#!/usr/bin/env python3
"""
Quick fix script to disable ElevenLabs TTS and use OpenAI only.
Run this script to immediately switch to OpenAI TTS.
"""

import os
import sys
from pathlib import Path

def disable_elevenlabs():
    """Disable ElevenLabs TTS by setting environment variable."""
    
    # Find the .env file
    env_file = Path(".env")
    if not env_file.exists():
        print("❌ Could not find .env file")
        return False
    
    print("🔧 Disabling ElevenLabs TTS...")
    
    # Read current .env file
    with open(env_file, 'r') as f:
        lines = f.readlines()
    
    # Check if DISABLE_ELEVENLABS already exists
    disable_found = False
    failure_count_found = False
    
    for i, line in enumerate(lines):
        if line.startswith('DISABLE_ELEVENLABS='):
            lines[i] = 'DISABLE_ELEVENLABS=true\n'
            disable_found = True
        elif line.startswith('ELEVENLABS_FAILURE_COUNT='):
            lines[i] = 'ELEVENLABS_FAILURE_COUNT=1\n'  # Mark as failed
            failure_count_found = True
    
    # Add the settings if not found
    if not disable_found:
        lines.append('DISABLE_ELEVENLABS=true\n')
    if not failure_count_found:
        lines.append('ELEVENLABS_FAILURE_COUNT=1\n')
    
    # Write back to .env file
    with open(env_file, 'w') as f:
        f.writelines(lines)
    
    print("✅ ElevenLabs TTS disabled")
    print("📋 Next steps:")
    print("   1. Restart your LiveKit worker")
    print("   2. The system will now use OpenAI TTS only")
    print("   3. Check logs for 'ELEVENLABS_DISABLED' message")
    
    return True

def reset_failures():
    """Reset ElevenLabs failure count to try again."""
    
    env_file = Path("livekit/.env")
    if not env_file.exists():
        print("❌ Could not find livekit/.env file")
        return False
    
    print("🔄 Resetting ElevenLabs failure count...")
    
    # Read current .env file
    with open(env_file, 'r') as f:
        lines = f.readlines()
    
    # Reset failure count and disable flag
    for i, line in enumerate(lines):
        if line.startswith('DISABLE_ELEVENLABS='):
            lines[i] = 'DISABLE_ELEVENLABS=false\n'
        elif line.startswith('ELEVENLABS_FAILURE_COUNT='):
            lines[i] = 'ELEVENLABS_FAILURE_COUNT=0\n'
    
    # Write back to .env file
    with open(env_file, 'w') as f:
        f.writelines(lines)
    
    print("✅ ElevenLabs failure count reset")
    print("📋 Next steps:")
    print("   1. Restart your LiveKit worker")
    print("   2. The system will try ElevenLabs again")
    print("   3. If it fails, it will permanently switch to OpenAI")
    
    return True

def enable_elevenlabs():
    """Re-enable ElevenLabs TTS."""
    
    env_file = Path("livekit/.env")
    if not env_file.exists():
        print("❌ Could not find livekit/.env file")
        return False
    
    print("🔧 Re-enabling ElevenLabs TTS...")
    
    # Read current .env file
    with open(env_file, 'r') as f:
        lines = f.readlines()
    
    # Update or remove DISABLE_ELEVENLABS
    for i, line in enumerate(lines):
        if line.startswith('DISABLE_ELEVENLABS='):
            lines[i] = 'DISABLE_ELEVENLABS=false\n'
            break
    
    # Write back to .env file
    with open(env_file, 'w') as f:
        f.writelines(lines)
    
    print("✅ ElevenLabs TTS re-enabled")
    print("📋 Next steps:")
    print("   1. Restart your LiveKit worker")
    print("   2. The system will try ElevenLabs first, fallback to OpenAI")
    
    return True

def check_status():
    """Check current TTS configuration."""
    
    env_file = Path("livekit/.env")
    if not env_file.exists():
        print("❌ Could not find livekit/.env file")
        return
    
    print("📊 Current TTS Configuration:")
    
    with open(env_file, 'r') as f:
        content = f.read()
    
    # Check environment variables
    disable_elevenlabs = 'DISABLE_ELEVENLABS=true' in content
    has_openai_key = 'OPENAI_API_KEY=' in content and 'OPENAI_API_KEY=\n' not in content
    has_elevenlabs_key = 'ELEVENLABS_API_KEY=' in content and 'ELEVENLABS_API_KEY=\n' not in content
    
    print(f"   - ElevenLabs Disabled: {'✅ Yes' if disable_elevenlabs else '❌ No'}")
    print(f"   - OpenAI API Key: {'✅ Set' if has_openai_key else '❌ Not set'}")
    print(f"   - ElevenLabs API Key: {'✅ Set' if has_elevenlabs_key else '❌ Not set'}")
    
    if disable_elevenlabs:
        print("\n🎯 Current Mode: OpenAI Only")
    elif has_elevenlabs_key and has_openai_key:
        print("\n🎯 Current Mode: ElevenLabs + OpenAI Fallback")
    elif has_openai_key:
        print("\n🎯 Current Mode: OpenAI Only (ElevenLabs not configured)")
    else:
        print("\n❌ Error: No TTS configured!")

def main():
    """Main function."""
    if len(sys.argv) < 2:
        print("🔧 TTS Configuration Tool")
        print("\nUsage:")
        print("  python fix_tts.py disable    # Disable ElevenLabs, use OpenAI only")
        print("  python fix_tts.py enable     # Re-enable ElevenLabs with fallback")
        print("  python fix_tts.py reset      # Reset failure count, try ElevenLabs again")
        print("  python fix_tts.py status     # Check current configuration")
        return
    
    command = sys.argv[1].lower()
    
    if command == "disable":
        disable_elevenlabs()
    elif command == "enable":
        enable_elevenlabs()
    elif command == "reset":
        reset_failures()
    elif command == "status":
        check_status()
    else:
        print(f"❌ Unknown command: {command}")
        print("Available commands: disable, enable, reset, status")

if __name__ == "__main__":
    main()
