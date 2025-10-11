# AI-Powered Call Outcome Analysis System

This document describes the new AI-powered call outcome determination system that replaces the previous hardcoded keyword matching approach.

## Overview

The system now uses OpenAI's GPT models to intelligently analyze call transcriptions and determine appropriate outcomes, providing more accurate and nuanced call classification.

## Key Features

- **AI-Powered Analysis**: Uses OpenAI GPT-4o-mini for intelligent outcome determination
- **Confidence Scoring**: Provides confidence levels (0.0-1.0) for each outcome determination
- **Detailed Reasoning**: Includes AI-generated explanations for outcome decisions
- **Sentiment Analysis**: Determines overall call sentiment (positive, neutral, negative)
- **Key Points Extraction**: Identifies important conversation points
- **Follow-up Management**: Determines if follow-up actions are required
- **Fallback System**: Graceful degradation to heuristic analysis when OpenAI is unavailable

## Architecture

### Components

1. **CallOutcomeService** (`livekit/services/call_outcome_service.py`)
   - Main service for AI-powered outcome analysis
   - Handles OpenAI API communication
   - Provides fallback heuristic analysis

2. **Database Schema** (`supabase/migrations/20250131000002_add_ai_outcome_analysis_fields.sql`)
   - New fields for AI analysis results
   - Proper indexing for analytics queries

3. **Frontend Integration** (`src/lib/api/conversations/fetchConversations.ts`)
   - Updated to prioritize AI-determined outcomes
   - Maintains backward compatibility

4. **Call Processing** (`livekit/main.py`)
   - Integrated AI analysis into post-call processing
   - Saves AI results to database

## Supported Outcomes

### Inbound Calls
- `booked_appointment` - Appointment successfully scheduled
- `completed` - Call completed successfully
- `not_qualified` - Caller doesn't meet service criteria
- `spam` - Unwanted or spam call
- `message_to_franchise` - Needs escalation to franchise
- `call_dropped` - Call ended unexpectedly
- `no_response` - No meaningful response from caller

### Outbound Calls
- `interested` - Caller shows interest
- `not_interested` - Caller not interested
- `callback` - Caller requests callback
- `do_not_call` - Caller requests not to be called again
- `voicemail` - Left voicemail
- `wrong_number` - Called wrong number
- `no_answer` - No answer
- `busy` - Line busy

## Database Schema

### New Fields Added to `call_history` Table

```sql
-- AI Analysis Fields
outcome_confidence DECIMAL(3,2) DEFAULT NULL,  -- 0.0 to 1.0
outcome_reasoning TEXT DEFAULT NULL,           -- AI explanation
outcome_key_points JSONB DEFAULT NULL,         -- Key conversation points
outcome_sentiment VARCHAR(20) DEFAULT NULL,    -- positive/neutral/negative
follow_up_required BOOLEAN DEFAULT FALSE,      -- Follow-up needed
follow_up_notes TEXT DEFAULT NULL              -- Follow-up instructions
```

## Configuration

### Environment Variables

```bash
# Required for AI analysis
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Model configuration (defaults shown)
OPENAI_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.1
OPENAI_MAX_TOKENS=500
```

### Service Initialization

```python
from services.call_outcome_service import CallOutcomeService

# Initialize the service
service = CallOutcomeService()

# Analyze a call
result = await service.analyze_call_outcome(
    transcription=transcription_data,
    call_duration=180,  # seconds
    call_type="inbound"  # or "outbound"
)
```

## Usage Examples

### Basic Analysis

```python
# Sample transcription
transcription = [
    {"role": "assistant", "content": "Hello, how can I help you?"},
    {"role": "user", "content": "I'd like to schedule an appointment"},
    {"role": "assistant", "content": "I'd be happy to help with that."}
]

# Analyze the call
result = await service.analyze_call_outcome(
    transcription=transcription,
    call_duration=120,
    call_type="inbound"
)

if result:
    print(f"Outcome: {result.outcome}")
    print(f"Confidence: {result.confidence}")
    print(f"Reasoning: {result.reasoning}")
```

### Fallback Analysis

```python
# When OpenAI is unavailable
fallback_outcome = service.get_fallback_outcome(
    transcription=transcription,
    call_duration=120
)
print(f"Fallback outcome: {fallback_outcome}")
```

## Testing

Run the test script to verify the system:

```bash
cd livekit
python test_call_outcome_analysis.py
```

The test script includes:
- Sample call scenarios
- AI analysis verification
- Fallback system testing
- Error handling validation

## Migration Guide

### From Hardcoded to AI-Powered

1. **Database Migration**: Run the migration script to add new fields
2. **Environment Setup**: Configure OpenAI API key
3. **Deployment**: Deploy updated code
4. **Verification**: Test with sample calls

### Backward Compatibility

The system maintains full backward compatibility:
- Existing calls continue to work
- Fallback analysis ensures outcomes are always determined
- Frontend gracefully handles both AI and heuristic outcomes

## Performance Considerations

### API Costs
- Uses GPT-4o-mini for cost efficiency
- Low temperature (0.1) for consistent results
- Limited token usage (500 max tokens)

### Response Times
- Typical analysis: 2-5 seconds
- Timeout: 30 seconds
- Fallback: < 1 second

### Caching
- No caching implemented (calls are unique)
- Consider implementing for high-volume scenarios

## Monitoring and Analytics

### Key Metrics to Track
- AI analysis success rate
- Confidence score distribution
- Outcome accuracy (manual verification)
- API response times
- Fallback usage frequency

### Logging

The system provides comprehensive logging:
```
AI_OUTCOME_ANALYSIS | outcome=booked_appointment | confidence=0.95
FALLBACK_OUTCOME_ANALYSIS | outcome=completed
OPENAI_API_ERROR | error=timeout
```

## Troubleshooting

### Common Issues

1. **No AI Analysis Results**
   - Check OpenAI API key configuration
   - Verify API quota and billing
   - Check network connectivity

2. **Low Confidence Scores**
   - Review transcription quality
   - Check for incomplete conversations
   - Verify call duration accuracy

3. **Unexpected Outcomes**
   - Review AI reasoning in logs
   - Check for transcription errors
   - Consider prompt adjustments

### Debug Mode

Enable detailed logging:
```python
import logging
logging.getLogger('services.call_outcome_service').setLevel(logging.DEBUG)
```

## Future Enhancements

### Planned Features
- Custom outcome categories per business
- Multi-language support
- Real-time analysis during calls
- Outcome confidence thresholds
- Manual override capabilities

### Integration Opportunities
- CRM system integration
- Automated follow-up workflows
- Analytics dashboard enhancements
- Machine learning model training

## Support

For issues or questions:
1. Check the logs for error details
2. Verify OpenAI API configuration
3. Test with the provided test script
4. Review this documentation

## Changelog

### Version 1.0.0 (2025-01-31)
- Initial release of AI-powered call outcome analysis
- OpenAI GPT-4o-mini integration
- Comprehensive fallback system
- Database schema updates
- Frontend integration
- Test suite implementation
