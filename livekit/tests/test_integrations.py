"""
Tests for integration modules.
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from integrations.n8n_integration import N8NPayloadBuilder, N8NIntegration
from utils.call_analysis import CallAnalyzer, determine_call_status


class TestN8NPayloadBuilder:
    """Test cases for N8N payload builder."""
    
    def test_build_payload_basic(self):
        """Test basic payload building."""
        builder = N8NPayloadBuilder()
        
        assistant_config = {
            "id": "test-assistant-123",
            "name": "Test Assistant",
            "n8n_webhook_url": "https://example.com/webhook"
        }
        
        call_data = {
            "call_id": "test-call-123",
            "from_number": "+1234567890",
            "to_number": "inbound",
            "call_duration": 120,
            "call_direction": "inbound",
            "call_status": "completed"
        }
        
        session_history = [
            {"role": "assistant", "content": "Hello, how can I help you?"},
            {"role": "user", "content": "I need help with booking"}
        ]
        
        payload = builder.build_payload(assistant_config, call_data, session_history)
        
        assert payload is not None
        assert "assistant" in payload
        assert "call" in payload
        assert "n8n_config" in payload
        assert "conversation_summary" in payload
        assert "transcript" in payload
        assert "timestamp" in payload
        
        assert payload["assistant"]["id"] == "test-assistant-123"
        assert payload["call"]["call_id"] == "test-call-123"
    
    def test_build_payload_with_collected_data(self):
        """Test payload building with collected user data."""
        builder = N8NPayloadBuilder()
        
        assistant_config = {
            "id": "test-assistant-123",
            "name": "Test Assistant",
            "n8n_webhook_url": "https://example.com/webhook"
        }
        
        call_data = {
            "call_id": "test-call-123",
            "from_number": "+1234567890",
            "to_number": "inbound",
            "call_duration": 120,
            "call_direction": "inbound",
            "call_status": "completed"
        }
        
        session_history = []
        collected_data = {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "555-123-4567"
        }
        
        payload = builder.build_payload(assistant_config, call_data, session_history, collected_data)
        
        assert "contact_info" in payload
        assert payload["contact_info"]["name"] == "John Doe"
        assert payload["contact_info"]["email"] == "john@example.com"
        assert payload["contact_info"]["phone"] == "555-123-4567"
    
    def test_build_conversation_summary(self):
        """Test conversation summary building."""
        builder = N8NPayloadBuilder()
        
        session_history = [
            {"role": "assistant", "content": "Hello, how can I help you?"},
            {"role": "user", "content": "I need help with booking"},
            {"role": "assistant", "content": "I can help you with that."},
            {"role": "user", "content": "Great, let's schedule something"}
        ]
        
        summary = builder._build_conversation_summary(session_history)
        
        assert "I need help with booking" in summary
        assert "Great, let's schedule something" in summary
        assert "Hello, how can I help you?" not in summary  # Should only include user messages


class TestCallAnalyzer:
    """Test cases for call analysis."""
    
    def test_analyze_call_basic(self):
        """Test basic call analysis."""
        analyzer = CallAnalyzer()
        
        duration = 120
        transcription = [
            {"role": "assistant", "content": "Hello, how can I help you?"},
            {"role": "user", "content": "I need to book an appointment"},
            {"role": "assistant", "content": "I can help you with that."},
            {"role": "user", "content": "Great, my name is John"}
        ]
        
        metrics = analyzer.analyze_call(duration, transcription)
        
        assert metrics.duration == 120
        assert metrics.message_count == 4
        assert metrics.user_message_count == 2
        assert metrics.assistant_message_count == 2
        assert metrics.has_booking_intent is True
        assert metrics.has_contact_info is True
        assert metrics.spam_score == 0.0
        assert metrics.success_score > 0.0
    
    def test_determine_call_status(self):
        """Test call status determination."""
        analyzer = CallAnalyzer()
        
        # Test completed call
        metrics = Mock()
        metrics.duration = 120
        metrics.message_count = 4
        metrics.user_message_count = 2
        metrics.spam_score = 0.0
        metrics.success_score = 0.3
        metrics.has_booking_intent = True
        
        status = analyzer.determine_call_status(metrics)
        assert status == "completed"
        
        # Test dropped call
        metrics.duration = 3
        metrics.message_count = 1
        status = analyzer.determine_call_status(metrics)
        assert status == "dropped"
        
        # Test spam call
        metrics.duration = 60
        metrics.message_count = 3
        metrics.spam_score = 0.5
        status = analyzer.determine_call_status(metrics)
        assert status == "spam"
    
    def test_legacy_determine_call_status(self):
        """Test legacy call status determination function."""
        duration = 120
        transcription = [
            {"role": "assistant", "content": "Hello, how can I help you?"},
            {"role": "user", "content": "I need to book an appointment"},
            {"role": "assistant", "content": "I can help you with that."},
            {"role": "user", "content": "Great, my name is John"}
        ]
        
        status = determine_call_status(duration, transcription)
        assert status == "completed"


if __name__ == "__main__":
    pytest.main([__file__])
