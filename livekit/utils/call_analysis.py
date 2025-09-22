"""
Call analysis and status determination utilities.
"""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class CallMetrics:
    """Call analysis metrics."""
    duration: int
    message_count: int
    user_message_count: int
    assistant_message_count: int
    has_booking_intent: bool
    has_contact_info: bool
    spam_score: float
    success_score: float


class CallAnalyzer:
    """Analyzes call content and determines status."""
    
    def __init__(self):
        self.spam_keywords = [
            "robocall", "telemarketing", "scam", "fraud", "suspicious",
            "unwanted", "spam", "junk", "harassment", "threat"
        ]
        
        self.success_keywords = [
            "appointment", "book", "schedule", "confirm", "details",
            "name", "email", "phone", "thank you", "goodbye"
        ]
        
        self.booking_keywords = [
            "appointment", "book", "schedule", "meeting", "consultation",
            "reservation", "slot", "time", "date", "calendar"
        ]
    
    def analyze_call(self, duration: int, transcription: List[Dict[str, Any]]) -> CallMetrics:
        """
        Analyze call content and return metrics.
        
        Args:
            duration: Call duration in seconds
            transcription: Call transcription data
            
        Returns:
            CallMetrics object with analysis results
        """
        message_count = len(transcription) if transcription else 0
        user_messages = [item for item in transcription if item.get("role") == "user"] if transcription else []
        assistant_messages = [item for item in transcription if item.get("role") == "assistant"] if transcription else []
        
        user_message_count = len(user_messages)
        assistant_message_count = len(assistant_messages)
        
        # Analyze content
        all_content = self._extract_all_content(transcription)
        has_booking_intent = self._has_booking_intent(all_content)
        has_contact_info = self._has_contact_info(all_content)
        spam_score = self._calculate_spam_score(all_content)
        success_score = self._calculate_success_score(all_content)
        
        return CallMetrics(
            duration=duration,
            message_count=message_count,
            user_message_count=user_message_count,
            assistant_message_count=assistant_message_count,
            has_booking_intent=has_booking_intent,
            has_contact_info=has_contact_info,
            spam_score=spam_score,
            success_score=success_score
        )
    
    def _extract_all_content(self, transcription: List[Dict[str, Any]]) -> str:
        """Extract all text content from transcription."""
        if not transcription:
            return ""
        
        all_content = ""
        for item in transcription:
            if isinstance(item, dict) and "content" in item:
                content = item["content"]
                if isinstance(content, str):
                    all_content += content.lower() + " "
                elif isinstance(content, list):
                    for part in content:
                        if isinstance(part, str):
                            all_content += part.lower() + " "
        
        return all_content.strip()
    
    def _has_booking_intent(self, content: str) -> bool:
        """Check if call has booking intent."""
        if not content:
            return False
        
        return any(keyword in content for keyword in self.booking_keywords)
    
    def _has_contact_info(self, content: str) -> bool:
        """Check if call contains contact information."""
        if not content:
            return False
        
        contact_indicators = [
            "my name is", "i'm", "call me", "email", "phone", "number",
            "contact", "reach me", "get in touch"
        ]
        
        return any(indicator in content for indicator in contact_indicators)
    
    def _calculate_spam_score(self, content: str) -> float:
        """Calculate spam likelihood score (0.0 to 1.0)."""
        if not content:
            return 0.0
        
        spam_matches = sum(1 for keyword in self.spam_keywords if keyword in content)
        total_keywords = len(self.spam_keywords)
        
        return min(spam_matches / total_keywords, 1.0)
    
    def _calculate_success_score(self, content: str) -> float:
        """Calculate success likelihood score (0.0 to 1.0)."""
        if not content:
            return 0.0
        
        success_matches = sum(1 for keyword in self.success_keywords if keyword in content)
        total_keywords = len(self.success_keywords)
        
        return min(success_matches / total_keywords, 1.0)
    
    def determine_call_status(self, metrics: CallMetrics) -> str:
        """
        Determine call status based on metrics.
        
        Args:
            metrics: Call analysis metrics
            
        Returns:
            Call status string
        """
        # Very short calls
        if metrics.duration < 5:
            return "dropped"
        
        # Short calls with minimal interaction
        if metrics.duration < 15:
            if metrics.message_count < 2:
                return "dropped"
        
        # Spam detection
        if metrics.spam_score > 0.3:
            return "spam"
        
        # No response detection
        if metrics.user_message_count <= 1:
            return "no_response"
        
        # Very short interaction
        if metrics.message_count == 2:
            return "dropped"
        
        # Success criteria
        if (metrics.duration >= 15 and 
            metrics.message_count >= 3 and 
            (metrics.success_score > 0.2 or metrics.has_booking_intent)):
            return "completed"
        
        # Default to completed for longer calls with interaction
        if metrics.duration >= 15 and metrics.message_count >= 3:
            return "completed"
        
        return "incomplete"


def determine_call_status(call_duration: int, transcription: List[Dict[str, Any]]) -> str:
    """
    Determine call status based on duration and transcription content.
    
    This is a simplified version for backward compatibility.
    
    Args:
        call_duration: Call duration in seconds
        transcription: Call transcription data
        
    Returns:
        Call status string: 'dropped', 'spam', 'no_response', 'completed', 'incomplete'
    """
    analyzer = CallAnalyzer()
    metrics = analyzer.analyze_call(call_duration, transcription)
    return analyzer.determine_call_status(metrics)
