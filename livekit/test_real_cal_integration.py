#!/usr/bin/env python3
"""
Test script for real Cal.com integration
This script tests the CalComCalendar class directly to ensure it works
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from cal_calendar_api import CalComCalendar
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure cal_calendar_api.py is in the same directory")
    sys.exit(1)

async def test_cal_integration():
    """Test the Cal.com integration"""
    
    # Get credentials from environment
    api_key = os.getenv('CAL_API_KEY')
    event_type_slug = os.getenv('CAL_EVENT_TYPE_SLUG')
    timezone = os.getenv('CAL_TIMEZONE', 'UTC')
    
    if not api_key:
        print("❌ CAL_API_KEY not found in environment variables")
        print("Please create a .env file with your Cal.com credentials")
        return False
    
    if not event_type_slug:
        print("❌ CAL_EVENT_TYPE_SLUG not found in environment variables")
        print("Please create a .env file with your Cal.com credentials")
        return False
    
    print(f"🔑 Testing with API Key: {api_key[:10]}...")
    print(f"📅 Event Type: {event_type_slug}")
    print(f"🌍 Timezone: {timezone}")
    print()
    
    try:
        # Initialize calendar
        print("🔄 Initializing calendar...")
        calendar = CalComCalendar(
            api_key=api_key,
            event_type_slug=event_type_slug,
            timezone=timezone
        )
        
        await calendar.initialize()
        print("✅ Calendar initialized successfully")
        
        # Set date range (next week)
        start_time = datetime.now() + timedelta(days=1)
        end_time = start_time + timedelta(days=7)
        
        print(f"📅 Fetching slots from {start_time.strftime('%Y-%m-%d')} to {end_time.strftime('%Y-%m-%d')}")
        
        # Get available slots
        slots = await calendar.list_available_slots(
            start_time=start_time,
            end_time=end_time
        )
        
        print(f"✅ Found {len(slots)} available slots")
        
        if slots:
            print("\n📋 Available slots:")
            for i, slot in enumerate(slots[:5], 1):  # Show first 5 slots
                print(f"  {i}. {slot.start_time.strftime('%a, %b %d at %I:%M %p')} ({slot.duration_min} min)")
            
            if len(slots) > 5:
                print(f"  ... and {len(slots) - 5} more slots")
        else:
            print("ℹ️  No available slots found for the specified date range")
            print("   This might be normal if no availability is set in Cal.com")
        
        # Properly close the session
        await calendar.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        return False

async def main():
    """Main function"""
    print("🚀 Testing Cal.com Integration")
    print("=" * 40)
    
    success = await test_cal_integration()
    
    print("\n" + "=" * 40)
    if success:
        print("✅ Cal.com integration test completed successfully!")
        print("   You can now use real calendar slots in your application")
    else:
        print("❌ Cal.com integration test failed")
        print("   Check the error messages above and fix any issues")
    
    return success

if __name__ == "__main__":
    asyncio.run(main())
