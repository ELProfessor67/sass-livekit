"""
OpenAI Call Outcome Analysis Service
Analyzes call transcriptions using OpenAI to determine intelligent call outcomes
"""

import os
import json
import logging
from typing import Optional, Dict, List, Any
from dataclasses import dataclass

try:
    import openai
except ImportError:
    openai = None

logger = logging.getLogger(__name__)

@dataclass
class CallOutcomeAnalysis:
    """Result of call outcome analysis"""
    outcome: str
    confidence: float
    reasoning: str
    key_points: List[str]
    sentiment: str
    follow_up_required: bool
    follow_up_notes: Optional[str] = None

class CallOutcomeService:
    """Service for analyzing call transcriptions and determining outcomes using OpenAI"""
    
    def __init__(self):
        self.client = None
        if openai and os.getenv('OPENAI_API_KEY'):
            try:
                openai.api_key = os.getenv('OPENAI_API_KEY')
                self.client = openai
                logger.info("OPENAI_CLIENT_INITIALIZED | Call outcome analysis enabled")
            except Exception as e:
                logger.error(f"OPENAI_CLIENT_INIT_FAILED | error={str(e)}")
                self.client = None
        else:
            logger.warning("OPENAI_CLIENT_NOT_AVAILABLE | OPENAI_API_KEY not configured")
    
    async def analyze_call_outcome(
        self, 
        transcription: List[Dict[str, Any]], 
        call_duration: int,
        call_type: str = "inbound"
    ) -> Optional[CallOutcomeAnalysis]:
        """
        Analyze call transcription to determine outcome using OpenAI
        
        Args:
            transcription: List of conversation turns with role and content
            call_duration: Call duration in seconds
            call_type: Type of call (inbound/outbound)
            
        Returns:
            CallOutcomeAnalysis object or None if analysis fails
        """
        if not self.client:
            logger.warning("OPENAI_CLIENT_NOT_AVAILABLE | Skipping call outcome analysis")
            return None
        
        try:
            # Convert transcription to text format
            transcript_text = self._format_transcription_for_analysis(transcription)
            
            if not transcript_text.strip():
                logger.warning("EMPTY_TRANSCRIPTION | Cannot analyze empty transcription")
                return None
            
            # Create the analysis prompt
            prompt = self._create_analysis_prompt(transcript_text, call_duration, call_type)
            
            logger.info(f"CALL_OUTCOME_ANALYSIS_START | transcript_length={len(transcript_text)} | duration={call_duration}s | type={call_type}")
            
            # Call OpenAI API
            response = await self._call_openai_api(prompt)
            
            if not response:
                logger.error("OPENAI_API_CALL_FAILED | No response received")
                return None
            
            # Parse the response
            analysis = self._parse_openai_response(response)
            
            logger.info(f"CALL_OUTCOME_ANALYSIS_COMPLETE | outcome={analysis.outcome} | confidence={analysis.confidence}")
            
            return analysis
            
        except Exception as e:
            logger.error(f"CALL_OUTCOME_ANALYSIS_ERROR | error={str(e)}")
            return None
    
    def _format_transcription_for_analysis(self, transcription: List[Dict[str, Any]]) -> str:
        """Format transcription for OpenAI analysis"""
        formatted_lines = []
        
        for turn in transcription:
            role = turn.get('role', 'unknown')
            content = turn.get('content', '')
            
            # Handle different content formats
            if isinstance(content, list):
                content = ' '.join(str(item) for item in content if item)
            elif not isinstance(content, str):
                content = str(content)
            
            if content.strip():
                # Format as conversation
                speaker = "Assistant" if role == "assistant" else "Caller"
                formatted_lines.append(f"{speaker}: {content.strip()}")
        
        return '\n'.join(formatted_lines)
    
    def _create_analysis_prompt(self, transcript_text: str, call_duration: int, call_type: str) -> str:
        """Create the analysis prompt for OpenAI"""
        
        # Define valid outcomes based on call type
        if call_type == "outbound":
            valid_outcomes = [
                "Booked Appointment", "Qualified", "Not Qualified", "Spam", 
                "Escalated", "Call Dropped"
            ]
        else:  # inbound
            valid_outcomes = [
                "Booked Appointment", "Qualified", "Not Qualified", "Spam", 
                "Escalated", "Call Dropped"
            ]
        
        prompt = f"""
You are an expert call analyst. Analyze the following phone call transcription and determine the most appropriate outcome.

CALL DETAILS:
- Duration: {call_duration} seconds
- Type: {call_type}
- Valid outcomes: {', '.join(valid_outcomes)}

TRANSCRIPTION:
{transcript_text}

ANALYSIS REQUIREMENTS:
1. Determine the most appropriate outcome from the valid options above
2. Provide a confidence score (0.0 to 1.0)
3. Explain your reasoning
4. Extract key points from the conversation
5. Assess overall sentiment (positive, neutral, negative)
6. Determine if follow-up is required

RESPONSE FORMAT (JSON only):
{{
    "outcome": "selected_outcome",
    "confidence": 0.95,
    "reasoning": "Brief explanation of why this outcome was selected",
    "key_points": ["point1", "point2", "point3"],
    "sentiment": "positive|neutral|negative",
    "follow_up_required": true,
    "follow_up_notes": "Optional notes for follow-up if needed"
}}

OUTCOME GUIDELINES:
- "Booked Appointment": Appointment was successfully scheduled
- "Qualified": Caller meets service criteria and shows interest
- "Not Qualified": Caller doesn't meet service criteria
- "Spam": Unwanted or spam call
- "Escalated": Call needs escalation to franchise or manager
- "Call Dropped": Call ended unexpectedly or was disconnected

Respond with ONLY the JSON object, no additional text.
"""
        return prompt
    
    async def _call_openai_api(self, prompt: str) -> Optional[str]:
        """Call OpenAI API with the analysis prompt"""
        try:
            response = openai.chat.completions.create(
                model="gpt-4o-mini",  # Using cost-effective model
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert call analyst. Always respond with valid JSON only."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                temperature=0.1,  # Low temperature for consistent results
                max_tokens=500,
                timeout=30
            )
            
            if response and response.choices:
                return response.choices[0].message.content.strip()
            
            return None
            
        except Exception as e:
            logger.error(f"OPENAI_API_ERROR | error={str(e)}")
            return None
    
    def _parse_openai_response(self, response: str) -> CallOutcomeAnalysis:
        """Parse OpenAI response into CallOutcomeAnalysis object"""
        try:
            # Clean the response (remove any markdown formatting)
            cleaned_response = response.strip()
            if cleaned_response.startswith('```json'):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.endswith('```'):
                cleaned_response = cleaned_response[:-3]
            
            # Parse JSON
            data = json.loads(cleaned_response)
            
            return CallOutcomeAnalysis(
                outcome=data.get('outcome', 'Qualified'),
                confidence=float(data.get('confidence', 0.5)),
                reasoning=data.get('reasoning', 'No reasoning provided'),
                key_points=data.get('key_points', []),
                sentiment=data.get('sentiment', 'neutral'),
                follow_up_required=bool(data.get('follow_up_required', False)),
                follow_up_notes=data.get('follow_up_notes')
            )
            
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.error(f"OPENAI_RESPONSE_PARSE_ERROR | error={str(e)} | response={response[:200]}...")
            
            # Return fallback analysis
            return CallOutcomeAnalysis(
                outcome='Qualified',
                confidence=0.1,
                reasoning='Failed to parse OpenAI response',
                key_points=[],
                sentiment='neutral',
                follow_up_required=False
            )
    
    def get_fallback_outcome(self, transcription: List[Dict[str, Any]], call_duration: int) -> str:
        """
        Provide fallback outcome determination when OpenAI is not available
        Uses simple heuristics similar to the current hardcoded approach
        """
        if call_duration < 10:
            return "Call Dropped"
        
        # Extract content for analysis
        all_content = ""
        for turn in transcription:
            content = turn.get('content', '')
            if isinstance(content, list):
                content = ' '.join(str(item) for item in content if item)
            elif not isinstance(content, str):
                content = str(content)
            all_content += content.lower() + " "
        
        # Simple keyword matching with more sophisticated logic
        all_content_lower = all_content.lower()
        
        # Check for actual booking success indicators
        booking_success_keywords = [
            "appointment has been successfully booked",
            "appointment scheduled successfully", 
            "successfully booked",
            "appointment confirmed",
            "booking confirmed",
            "appointment is booked",
            "your appointment is scheduled",
            "perfect! your appointment has been successfully booked",
            "appointment scheduled successfully"
        ]
        
        booking_attempt_keywords = [
            "book an appointment",
            "schedule an appointment", 
            "make an appointment",
            "want to book",
            "book the appointment"
        ]
        
        booking_failure_keywords = [
            "booking failed",
            "couldn't book",
            "unable to book",
            "booking error",
            "appointment not booked",
            "booking unsuccessful"
        ]
        
        # Check for actual success first
        if any(keyword in all_content_lower for keyword in booking_success_keywords):
            return "Booked Appointment"
        # Check for failure indicators
        elif any(keyword in all_content_lower for keyword in booking_failure_keywords):
            return "Not Qualified"
        # Check for booking attempts but no clear success
        elif any(keyword in all_content_lower for keyword in booking_attempt_keywords):
            # If they tried to book but we don't see success, it's likely not booked
            return "Qualified"  # They showed interest but booking didn't complete
        elif any(keyword in all_content_lower for keyword in ["spam", "unwanted", "robocall"]):
            return "Spam"
        elif any(keyword in all_content_lower for keyword in ["not qualified", "not eligible", "outside service"]):
            return "Not Qualified"
        elif any(keyword in all_content_lower for keyword in ["message", "franchise", "escalate"]):
            return "Escalated"
        elif any(keyword in all_content_lower for keyword in ["thank you", "goodbye"]):
            return "Qualified"
        else:
            return "Qualified" if call_duration > 30 else "Call Dropped"
