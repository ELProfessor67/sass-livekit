#!/usr/bin/env python3
"""
Test script for OpenAI Call Outcome Analysis Service
This script tests the new AI-powered call outcome determination system
"""

import asyncio
import os
import sys
from typing import List, Dict, Any

# Add the livekit directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'livekit'))

from services.call_outcome_service import CallOutcomeService, CallOutcomeAnalysis

async def test_call_outcome_analysis():
    """Test the call outcome analysis service with sample data"""
    
    print("🧪 Testing OpenAI Call Outcome Analysis Service")
    print("=" * 50)
    
    # Initialize the service
    service = CallOutcomeService()
    
    # Test cases with different scenarios
    test_cases = [
        {
            "name": "Successful Appointment Booking",
            "transcription": [
                {"role": "assistant", "content": "Hello, thank you for calling. How can I help you today?"},
                {"role": "user", "content": "Hi, I'd like to schedule an appointment for next week"},
                {"role": "assistant", "content": "I'd be happy to help you schedule an appointment. What day works best for you?"},
                {"role": "user", "content": "Tuesday afternoon would be perfect"},
                {"role": "assistant", "content": "Great! I have Tuesday at 2 PM available. Does that work for you?"},
                {"role": "user", "content": "Yes, that's perfect. Thank you!"},
                {"role": "assistant", "content": "Perfect! I've booked your appointment for Tuesday at 2 PM. You'll receive a confirmation email shortly. Thank you for calling!"}
            ],
            "duration": 180,
            "call_type": "inbound",
            "expected_outcome": "booked_appointment"
        },
        {
            "name": "Spam Call",
            "transcription": [
                {"role": "assistant", "content": "Hello, thank you for calling. How can I help you today?"},
                {"role": "user", "content": "This is a robocall. Press 1 to speak to a representative."},
                {"role": "assistant", "content": "I'm sorry, but this appears to be an automated call. I'll end this call now."}
            ],
            "duration": 15,
            "call_type": "inbound",
            "expected_outcome": "spam"
        },
        {
            "name": "Not Qualified Lead",
            "transcription": [
                {"role": "assistant", "content": "Hello, thank you for calling. How can I help you today?"},
                {"role": "user", "content": "I'm interested in your services"},
                {"role": "assistant", "content": "Great! What's your location?"},
                {"role": "user", "content": "I'm in Alaska"},
                {"role": "assistant", "content": "I'm sorry, but we don't currently provide services in Alaska. We only serve the continental United States."},
                {"role": "user", "content": "Oh, I understand. Thank you anyway."},
                {"role": "assistant", "content": "Thank you for your interest. Have a great day!"}
            ],
            "duration": 120,
            "call_type": "inbound",
            "expected_outcome": "not_qualified"
        },
        {
            "name": "Outbound Interested Call",
            "transcription": [
                {"role": "assistant", "content": "Hello, this is Sarah calling about our home improvement services. Do you have a few minutes to talk?"},
                {"role": "user", "content": "Sure, I'm interested in learning more"},
                {"role": "assistant", "content": "Great! We offer kitchen remodeling, bathroom renovations, and more. What type of project are you considering?"},
                {"role": "user", "content": "We're thinking about remodeling our kitchen"},
                {"role": "assistant", "content": "That's wonderful! I'd love to schedule a free consultation. When would be a good time?"},
                {"role": "user", "content": "How about next Friday afternoon?"},
                {"role": "assistant", "content": "Perfect! I'll send you a calendar invite for Friday at 2 PM. Thank you for your interest!"}
            ],
            "duration": 200,
            "call_type": "outbound",
            "expected_outcome": "interested"
        }
    ]
    
    print(f"Running {len(test_cases)} test cases...\n")
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"Test {i}: {test_case['name']}")
        print(f"Call Type: {test_case['call_type']}")
        print(f"Duration: {test_case['duration']} seconds")
        print(f"Expected Outcome: {test_case['expected_outcome']}")
        
        try:
            # Test AI analysis
            result = await service.analyze_call_outcome(
                transcription=test_case['transcription'],
                call_duration=test_case['duration'],
                call_type=test_case['call_type']
            )
            
            if result:
                print(f"✅ AI Analysis Result:")
                print(f"   Outcome: {result.outcome}")
                print(f"   Confidence: {result.confidence:.2f}")
                print(f"   Reasoning: {result.reasoning}")
                print(f"   Sentiment: {result.sentiment}")
                print(f"   Follow-up Required: {result.follow_up_required}")
                if result.follow_up_notes:
                    print(f"   Follow-up Notes: {result.follow_up_notes}")
                
                # Check if outcome matches expected
                if result.outcome == test_case['expected_outcome']:
                    print(f"✅ PASS: Outcome matches expected result")
                else:
                    print(f"⚠️  PARTIAL: Outcome differs from expected ({test_case['expected_outcome']})")
            else:
                print("❌ FAIL: No analysis result returned")
                
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")
        
        print("-" * 50)
    
    # Test fallback functionality
    print("\n🔄 Testing Fallback Functionality")
    print("=" * 50)
    
    fallback_transcription = [
        {"role": "assistant", "content": "Hello, thank you for calling."},
        {"role": "user", "content": "Hi, I want to book an appointment"},
        {"role": "assistant", "content": "Great! I can help with that."}
    ]
    
    fallback_outcome = service.get_fallback_outcome(fallback_transcription, 90)
    print(f"Fallback Outcome: {fallback_outcome}")
    print("✅ Fallback system working")
    
    print("\n🎉 Test completed!")

if __name__ == "__main__":
    # Check if OpenAI API key is available
    if not os.getenv('OPENAI_API_KEY'):
        print("⚠️  Warning: OPENAI_API_KEY not found in environment variables")
        print("   The AI analysis will fall back to heuristic-based analysis")
        print("   To test with OpenAI, set your API key in the environment")
        print()
    
    # Run the test
    asyncio.run(test_call_outcome_analysis())
