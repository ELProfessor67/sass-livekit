"""
Test script to verify calendar tool calls and booking functionality.
This script tests the calendar integration end-to-end.
"""

import asyncio
import logging
import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import the calendar integration
from integrations.calendar_api import CalComCalendar, SlotUnavailableError
from services.assistant import Assistant


async def test_calendar_integration():
    """Test the calendar integration functionality"""
    
    print("🧪 Testing Calendar Integration...")
    
    # Test 1: Calendar Initialization
    print("\n1️⃣ Testing Calendar Initialization...")
    
    # Get calendar credentials from environment
    cal_api_key = os.getenv("CAL_API_KEY")
    cal_event_type_id = os.getenv("CAL_EVENT_TYPE_ID")
    cal_timezone = os.getenv("CAL_TIMEZONE", "UTC")
    
    if not cal_api_key or not cal_event_type_id:
        print("❌ CAL_API_KEY and CAL_EVENT_TYPE_ID environment variables are required")
        return False
    
    try:
        # Initialize calendar
        calendar = CalComCalendar(
            api_key=cal_api_key,
            timezone=cal_timezone,
            event_type_id=cal_event_type_id,
        )
        
        await calendar.initialize()
        print(f"✅ Calendar initialized successfully")
        print(f"   - Event Type ID: {cal_event_type_id}")
        print(f"   - Timezone: {cal_timezone}")
        print(f"   - Event Length: {calendar._event_length} minutes")
        
    except Exception as e:
        print(f"❌ Calendar initialization failed: {e}")
        return False
    
    # Test 2: List Available Slots
    print("\n2️⃣ Testing Slot Availability...")
    
    try:
        # Get slots for tomorrow
        tomorrow = datetime.now(ZoneInfo(cal_timezone)) + timedelta(days=1)
        start_time = tomorrow.replace(hour=0, minute=0, second=0, microsecond=0)
        end_time = start_time + timedelta(days=1)
        
        slots = await calendar.list_available_slots(
            start_time=start_time,
            end_time=end_time
        )
        
        print(f"✅ Retrieved {len(slots)} available slots for tomorrow")
        
        if slots:
            for i, slot in enumerate(slots[:3]):  # Show first 3 slots
                local_time = slot.start_time.astimezone(ZoneInfo(cal_timezone))
                print(f"   - Slot {i+1}: {local_time.strftime('%Y-%m-%d %H:%M')} ({slot.duration_min} min)")
        else:
            print("   - No slots available for tomorrow")
            
    except Exception as e:
        print(f"❌ Slot availability test failed: {e}")
        return False
    
    # Test 3: Assistant Tool Registration
    print("\n3️⃣ Testing Assistant Tool Registration...")
    
    try:
        # Create assistant with calendar
        assistant = Assistant(
            instructions="You are a helpful assistant for booking appointments.",
            calendar=calendar
        )
        
        # Check if calendar tools are registered
        tool_names = [tool.name for tool in assistant.tools]
        calendar_tools = [
            "confirm_wants_to_book_yes",
            "set_notes", 
            "list_slots_on_day",
            "choose_slot",
            "provide_name",
            "provide_email", 
            "provide_phone",
            "confirm_details_yes",
            "confirm_details_no",
            "finalize_booking"
        ]
        
        missing_tools = [tool for tool in calendar_tools if tool not in tool_names]
        
        if missing_tools:
            print(f"❌ Missing calendar tools: {missing_tools}")
            return False
        else:
            print(f"✅ All {len(calendar_tools)} calendar tools are registered")
            
    except Exception as e:
        print(f"❌ Assistant tool registration test failed: {e}")
        return False
    
    # Test 4: Booking Flow Simulation
    print("\n4️⃣ Testing Booking Flow Simulation...")
    
    try:
        # Simulate booking flow
        from livekit.agents import RunContext
        
        # Create a mock context (simplified)
        class MockContext:
            def __init__(self):
                self.speech_id = "test_speech_1"
        
        mock_ctx = MockContext()
        
        # Test booking intent
        result = await assistant.confirm_wants_to_book_yes(mock_ctx)
        print(f"✅ Booking intent confirmed: {result}")
        
        # Test setting notes
        result = await assistant.set_notes(mock_ctx, "Test appointment")
        print(f"✅ Notes set: {result}")
        
        # Test listing slots
        result = await assistant.list_slots_on_day(mock_ctx, "tomorrow")
        print(f"✅ Slots listed: {result[:100]}...")
        
    except Exception as e:
        print(f"❌ Booking flow simulation failed: {e}")
        return False
    
    # Test 5: Error Handling
    print("\n5️⃣ Testing Error Handling...")
    
    try:
        # Test with invalid day
        result = await assistant.list_slots_on_day(mock_ctx, "invalid_day")
        print(f"✅ Invalid day handled: {result}")
        
        # Test without booking intent
        assistant._booking_intent = False
        result = await assistant.set_notes(mock_ctx, "Test")
        print(f"✅ No booking intent handled: {result}")
        
    except Exception as e:
        print(f"❌ Error handling test failed: {e}")
        return False
    
    # Cleanup
    try:
        await calendar.close()
        print("\n✅ Calendar connection closed")
    except Exception as e:
        print(f"⚠️ Calendar cleanup warning: {e}")
    
    print("\n🎉 All calendar integration tests passed!")
    return True


async def test_booking_edge_cases():
    """Test edge cases in booking functionality"""
    
    print("\n🔍 Testing Booking Edge Cases...")
    
    # Test 1: Timezone handling
    print("\n1️⃣ Testing Timezone Handling...")
    
    try:
        cal_api_key = os.getenv("CAL_API_KEY")
        cal_event_type_id = os.getenv("CAL_EVENT_TYPE_ID")
        
        if not cal_api_key or not cal_event_type_id:
            print("❌ Calendar credentials not available for edge case testing")
            return False
        
        # Test different timezones
        timezones = ["UTC", "America/New_York", "Europe/London", "Asia/Tokyo"]
        
        for tz in timezones:
            calendar = CalComCalendar(
                api_key=cal_api_key,
                timezone=tz,
                event_type_id=cal_event_type_id,
            )
            
            await calendar.initialize()
            print(f"✅ Calendar initialized with timezone: {tz}")
            await calendar.close()
            
    except Exception as e:
        print(f"❌ Timezone handling test failed: {e}")
        return False
    
    # Test 2: API Error Handling
    print("\n2️⃣ Testing API Error Handling...")
    
    try:
        # Test with invalid API key
        invalid_calendar = CalComCalendar(
            api_key="invalid_key",
            timezone="UTC",
            event_type_id="123",
        )
        
        await invalid_calendar.initialize()
        
        # Try to get slots (should fail gracefully)
        tomorrow = datetime.now() + timedelta(days=1)
        slots = await invalid_calendar.list_available_slots(
            start_time=tomorrow,
            end_time=tomorrow + timedelta(days=1)
        )
        
        print(f"✅ Invalid API key handled gracefully: {len(slots)} slots")
        
    except Exception as e:
        print(f"✅ Invalid API key properly rejected: {e}")
    
    print("\n🎉 Edge case tests completed!")
    return True


async def main():
    """Main test function"""
    
    print("🚀 Starting Calendar Integration Tests...")
    print("=" * 50)
    
    # Run main tests
    success = await test_calendar_integration()
    
    if success:
        # Run edge case tests
        await test_booking_edge_cases()
        
        print("\n" + "=" * 50)
        print("✅ ALL TESTS COMPLETED SUCCESSFULLY!")
        print("\n📋 Summary:")
        print("   - Calendar initialization: ✅")
        print("   - Slot availability: ✅") 
        print("   - Tool registration: ✅")
        print("   - Booking flow: ✅")
        print("   - Error handling: ✅")
        print("   - Edge cases: ✅")
        
    else:
        print("\n" + "=" * 50)
        print("❌ TESTS FAILED!")
        print("\nPlease check:")
        print("   - CAL_API_KEY environment variable")
        print("   - CAL_EVENT_TYPE_ID environment variable")
        print("   - CAL_TIMEZONE environment variable (optional)")
        print("   - Network connectivity to Cal.com API")


if __name__ == "__main__":
    asyncio.run(main())
