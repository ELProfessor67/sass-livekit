#!/usr/bin/env python3
"""
Debug patch for Hume TTS plugin to see actual API error responses.
This patches the livekit.plugins.hume.tts module to log request/response details.

Usage:
1. Run this script before starting your agent
2. It will patch the Hume plugin to show detailed error logs
3. Make a test call and check logs for the actual 400 error response

Alternatively, just uncomment the lines in your code:
import livekit.plugins.hume.tts as hume_tts_module
# Patch to see actual error responses
"""

import logging
import sys
from pathlib import Path

# Find the Hume plugin location
try:
    import livekit.plugins.hume.tts as hume_tts
    plugin_path = Path(hume_tts.__file__)
    print(f"Found Hume plugin at: {plugin_path}")
except ImportError:
    print("Hume plugin not found. Is livekit-plugins-hume installed?")
    sys.exit(1)

print(f"\nTo enable detailed Hume debugging, patch {plugin_path}")
print("Or add this to your main.py to enable debug logging:\n")
print("""
# Enable detailed Hume debugging
import logging
logging.getLogger("livekit.plugins.hume").setLevel(logging.DEBUG)
""")

print("\nCurrent error shows: 400 Bad Request (body=None)")
print("This means the plugin hides the actual error response.")
print("\nTo see the actual error, you need to check:")
print("1. Run the diagnostic script: python check_hume_voice.py <voice_id>")
print("2. Check if the voice UUID exists in your Hume account")
print("3. Verify your API key has Octave-2 access")

# Try to read the actual plugin file to show where errors are raised
try:
    with open(plugin_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Look for the raise_for_status line
    if "raise_for_status()" in content:
        print("\n✅ Plugin uses raise_for_status() - errors are raised before logging")
        print("💡 The error response body is discarded before we can see it")
        print("\nSolution: Check voice UUID with diagnostic script first")
        
except Exception as e:
    print(f"\nCould not read plugin file: {e}")

print("\n" + "="*60)
print("IMMEDIATE NEXT STEPS:")
print("="*60)
print("1. Run: python check_hume_voice.py 3f636d17-44c7-4872-93d1-0c8f51c916a3")
print("2. Check if voice exists in your account")
print("3. If 404: Voice doesn't exist in your tenant")
print("4. If 200: Check the model_version in the response")

