"""
Tests for assistant implementations.
"""

import pytest
from unittest.mock import Mock, AsyncMock
from services.assistant import Assistant
from services.rag_assistant import RAGAssistant


class TestAssistant:
    """Test cases for basic Assistant class."""
    
    def test_assistant_initialization(self):
        """Test assistant initialization."""
        instructions = "You are a helpful assistant."
        assistant = Assistant(instructions=instructions)
        
        assert assistant is not None
        assert assistant._booking_intent is False
        assert assistant._name is None
        assert assistant._email is None
        assert assistant._phone is None
    
    def test_turn_gate(self):
        """Test turn gating mechanism."""
        instructions = "You are a helpful assistant."
        assistant = Assistant(instructions=instructions)
        
        # Mock context
        ctx = Mock()
        ctx.speech_id = "test_speech_1"
        
        # First call should pass
        result = assistant._turn_gate(ctx)
        assert result is None
        
        # Second call should be gated
        result = assistant._turn_gate(ctx)
        assert result == "I'll pause here for your reply."
    
    def test_email_validation(self):
        """Test email validation."""
        instructions = "You are a helpful assistant."
        assistant = Assistant(instructions=instructions)
        
        # Valid emails
        assert assistant._email_ok("test@example.com") is True
        assert assistant._email_ok("user.name@domain.co.uk") is True
        
        # Invalid emails
        assert assistant._email_ok("invalid-email") is False
        assert assistant._email_ok("@example.com") is False
        assert assistant._email_ok("") is False
    
    def test_phone_validation(self):
        """Test phone validation."""
        instructions = "You are a helpful assistant."
        assistant = Assistant(instructions=instructions)
        
        # Valid phones
        assert assistant._phone_ok("1234567890") is True
        assert assistant._phone_ok("+1-234-567-8900") is True
        assert assistant._phone_ok("(555) 123-4567") is True
        
        # Invalid phones
        assert assistant._phone_ok("123") is False
        assert assistant._phone_ok("") is False
        assert assistant._phone_ok("abc-def-ghij") is False


class TestRAGAssistant:
    """Test cases for RAGAssistant class."""
    
    def test_rag_assistant_initialization(self):
        """Test RAG assistant initialization."""
        instructions = "You are a helpful assistant."
        knowledge_base_id = "test-kb-123"
        
        assistant = RAGAssistant(
            instructions=instructions,
            knowledge_base_id=knowledge_base_id
        )
        
        assert assistant is not None
        assert assistant.knowledge_base_id == knowledge_base_id
        assert assistant.rag_enabled is True
        assert assistant._collected_data == {}
    
    def test_data_collection_state(self):
        """Test data collection state management."""
        instructions = "You are a helpful assistant."
        assistant = RAGAssistant(instructions=instructions)
        
        # Initial state
        assert assistant._data_collection_intent is False
        assert assistant._data_collection_step == "none"
        assert assistant._collected_data == {}
        
        # Start data collection
        assistant._data_collection_intent = True
        assistant._data_collection_step = "name"
        
        assert assistant._data_collection_intent is True
        assert assistant._data_collection_step == "name"
    
    def test_get_collected_data(self):
        """Test getting collected data."""
        instructions = "You are a helpful assistant."
        assistant = RAGAssistant(instructions=instructions)
        
        # Add some collected data
        assistant._collected_data = {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "555-123-4567"
        }
        
        collected = assistant.get_collected_data()
        
        assert collected["name"] == "John Doe"
        assert collected["email"] == "john@example.com"
        assert collected["phone"] == "555-123-4567"
        
        # Ensure it returns a copy
        collected["name"] = "Jane Doe"
        assert assistant._collected_data["name"] == "John Doe"


if __name__ == "__main__":
    pytest.main([__file__])
