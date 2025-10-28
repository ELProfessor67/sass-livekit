"""Quick test to check if Hume voice exists"""
import os
import httpx
from dotenv import load_dotenv

# Load from parent directory
load_dotenv(".env")

api_key = os.getenv("HUME_API_KEY")
voice_id = "3f636d17-44c7-4872-93d1-0c8f51c916a3"

if not api_key:
    print("HUME_API_KEY not found in environment")
    exit(1)

print(f"Checking voice: {voice_id}")

try:
    with httpx.Client(
        base_url="https://api.hume.ai",
        headers={"X-Hume-Api-Key": api_key},
        timeout=10.0
    ) as client:
        response = client.get(f"/v0/voices/{voice_id}")
        print(f"\nStatus: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\nVoice Details:")
            print(f"  Name: {data.get('name')}")
            print(f"  Model Version: {data.get('model_version')}")
            print(f"  Status: {data.get('status')}")
except Exception as e:
    print(f"Error: {e}")

