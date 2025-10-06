"""
Test script for the new LiveKit Agents implementation.
This verifies that the refactored code follows LiveKit patterns correctly.
"""

import asyncio
import logging
from unittest.mock import Mock, AsyncMock

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_agent_creation():
    """Test that agents can be created properly."""
    try:
        from services.booking_agent import BookingAgent
        from services.rag_agent import RAGAgent
        
        # Test BookingAgent creation
        booking_agent = BookingAgent(
            instructions="You are a helpful booking assistant.",
            calendar=None
        )
        
        assert isinstance(booking_agent, BookingAgent)
        # In LiveKit Agents, session is set when agent is added to session
        # Check for other expected attributes instead
        assert hasattr(booking_agent, 'calendar')
        assert hasattr(booking_agent, '_booking_intent')
        assert hasattr(booking_agent, 'instructions')
        logger.info("✅ BookingAgent creation test passed")
        
        # Test RAGAgent creation
        rag_agent = RAGAgent(
            instructions="You are a helpful RAG assistant.",
            knowledge_base_id="test-kb-id",
            company_id="test-company-id"
        )
        
        assert isinstance(rag_agent, RAGAgent)
        assert hasattr(rag_agent, 'rag_enabled')
        assert hasattr(rag_agent, 'knowledge_base_id')
        assert rag_agent.rag_enabled == True
        assert rag_agent.knowledge_base_id == "test-kb-id"
        logger.info("✅ RAGAgent creation test passed")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Agent creation test failed: {e}")
        return False

def test_function_tools():
    """Test that function tools are properly defined."""
    try:
        from services.booking_agent import BookingAgent
        
        agent = BookingAgent(
            instructions="Test agent",
            calendar=None
        )
        
        # Check that function tools are available
        tools = agent.tools
        
        # In LiveKit Agents, tools are FunctionTool objects
        # Check that we have the expected number of tools
        expected_tool_count = 9  # Based on our implementation
        assert len(tools) >= expected_tool_count, f"Expected at least {expected_tool_count} tools, got {len(tools)}"
        
        # Check that tools have the expected structure
        tool_names = []
        for tool in tools:
            # Tools can be FunctionTool objects or bound methods
            if hasattr(tool, 'name'):
                # FunctionTool object
                assert tool.name is not None, f"Tool name is None"
                tool_names.append(tool.name)
            elif hasattr(tool, '__name__'):
                # Bound method
                tool_names.append(tool.__name__)
            else:
                # Check if it's a function with a name attribute
                if hasattr(tool, 'func') and hasattr(tool.func, '__name__'):
                    tool_names.append(tool.func.__name__)
                else:
                    logger.warning(f"Tool {tool} has unexpected structure")
        
        expected_tools = [
            "confirm_wants_to_book_yes",
            "set_notes", 
            "list_slots_on_day",
            "choose_slot",
            "provide_name",
            "provide_email",
            "provide_phone",
            "confirm_details",
            "collect_webhook_data"
        ]
        
        # Check that all expected tools are present
        for tool_name in expected_tools:
            assert tool_name in tool_names, f"Tool {tool_name} not found in {tool_names}"
        
        logger.info("✅ Function tools test passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Function tools test failed: {e}")
        return False

async def test_agent_methods():
    """Test that agent methods work correctly."""
    try:
        from services.booking_agent import BookingAgent
        
        agent = BookingAgent(
            instructions="Test agent",
            calendar=None
        )
        
        # Mock RunContext - don't access session property
        mock_ctx = Mock()
        
        # Test booking intent confirmation
        result = await agent.confirm_wants_to_book_yes(mock_ctx)
        assert "Great" in result
        assert agent._booking_intent == True
        
        # Test notes setting
        result = await agent.set_notes(mock_ctx, "Test appointment")
        assert "Got it" in result
        assert agent._notes == "Test appointment"
        
        # Test webhook data collection
        result = await agent.collect_webhook_data(mock_ctx, "test_field", "test_value")
        assert "Collected" in result
        assert "test_field" in agent._webhook_data
        
        logger.info("✅ Agent methods test passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Agent methods test failed: {e}")
        return False

def test_main_structure():
    """Test that the main file has the correct structure."""
    try:
        import sys
        import os
        
        # Add the livekit directory to the path
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        
        # Import the main module
        from main_new_livekit import CallHandler, entrypoint, prewarm
        
        # Test CallHandler creation
        handler = CallHandler()
        assert hasattr(handler, 'supabase')
        assert hasattr(handler, 'handle_call')
        
        logger.info("✅ Main structure test passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Main structure test failed: {e}")
        return False

async def run_all_tests():
    """Run all tests."""
    logger.info("🧪 Starting LiveKit Agents implementation tests...")
    
    tests = [
        ("Agent Creation", test_agent_creation),
        ("Function Tools", test_function_tools),
        ("Agent Methods", test_agent_methods),
        ("Main Structure", test_main_structure),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        logger.info(f"Running {test_name} test...")
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()
            
            if result:
                passed += 1
                logger.info(f"✅ {test_name} test PASSED")
            else:
                logger.error(f"❌ {test_name} test FAILED")
        except Exception as e:
            logger.error(f"❌ {test_name} test ERROR: {e}")
    
    logger.info(f"🏁 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        logger.info("🎉 All tests passed! The LiveKit implementation is working correctly.")
    else:
        logger.error("⚠️ Some tests failed. Please check the implementation.")
    
    return passed == total

if __name__ == "__main__":
    asyncio.run(run_all_tests())
