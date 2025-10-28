#!/usr/bin/env python3
"""
Quick diagnostic script to verify Hume voice IDs are valid and accessible.
Run this to check if a voice UUID exists in your Hume tenant account.

Usage:
    python check_hume_voice.py <voice_id>
    
Example:
    python check_hume_voice.py 3f636d17-44c7-4872-93d1-0c8f51c916a3
"""

import httpx
import os
import json
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv("livekit/.env")

def check_voice(voice_id: str):
    """Check if a Hume voice ID exists and is accessible."""
    api_key = os.getenv("HUME_API_KEY")
    
    if not api_key:
        print("ERROR: HUME_API_KEY not set in environment")
        print("   Set HUME_API_KEY in your .env file")
        return False
    
    print(f"Checking voice ID: {voice_id}")
    print(f"   API Key: {api_key[:10]}...{api_key[-4:]}")
    
    try:
        # Make direct API call to Hume
        with httpx.Client(
            base_url="https://api.hume.ai",
            headers={"X-Hume-Api-Key": api_key},
            timeout=10.0
        ) as client:
            response = client.get(f"/v0/voices/{voice_id}")
            
            print(f"\nResponse Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("[SUCCESS] Voice exists and is accessible!")
                print(f"\nVoice Details:")
                print(f"   ID: {data.get('id', 'N/A')}")
                print(f"   Name: {data.get('name', 'N/A')}")
                print(f"   Model Version: {data.get('model_version', 'N/A')}")
                print(f"   Status: {data.get('status', 'N/A')}")
                print(f"   Provider: {data.get('provider', 'N/A')}")
                
                # Check if it's Octave-2 compatible
                model_version = data.get('model_version')
                if model_version == 2 or model_version == "2":
                    print("\n[OK] This is an Octave-2 voice!")
                    print("   Configure with: model_version='2'")
                elif model_version == 1 or model_version == "1":
                    print("\n[WARNING] This is a v1 voice, not Octave-2")
                    print("   Configure with: model_version='1'")
                
                # Show full JSON for debugging
                print(f"\nFull Response JSON:")
                print(json.dumps(data, indent=2))
                return True
                
            elif response.status_code == 404:
                print(f"[ERROR] Voice not found (404)")
                print(f"   This UUID doesn't exist in your tenant account")
                print(f"\nPossible causes:")
                print(f"   - Voice ID copied from someone else's account")
                print(f"   - Your account doesn't have access to this voice")
                print(f"   - Voice may have been deleted")
                try:
                    print(f"\nResponse: {response.text}")
                except:
                    pass
                return False
                
            elif response.status_code == 401 or response.status_code == 403:
                print(f"[ERROR] Authentication failed ({response.status_code})")
                print(f"   Invalid or unauthorized API key")
                try:
                    print(f"\nResponse: {response.text}")
                except:
                    pass
                return False
                
            else:
                print(f"[ERROR] Unexpected status code: {response.status_code}")
                try:
                    print(f"\nResponse: {response.text}")
                except:
                    pass
                return False
                
    except httpx.TimeoutException:
        print("[ERROR] Request timed out")
        return False
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    if len(sys.argv) != 2:
        print("Usage: python check_hume_voice.py <voice_id>")
        print("\nExample:")
        print("  python check_hume_voice.py 3f636d17-44c7-4872-93d1-0c8f51c916a3")
        sys.exit(1)
    
    voice_id = sys.argv[1]
    success = check_voice(voice_id)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

