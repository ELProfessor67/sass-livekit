# Timeout Configuration Guide

This document explains the timeout configurations available in the LiveKit voice agent system and how to tune them for optimal performance.

## Participant Connection Timeout

### Environment Variable
- **Variable**: `PARTICIPANT_TIMEOUT_SECONDS`
- **Default**: `35.0` seconds
- **Description**: Maximum time to wait for a participant to connect to the room before timing out

### Configuration
Add to your `.env` file:
```bash
# Participant connection timeout (in seconds)
PARTICIPANT_TIMEOUT_SECONDS=35.0
```

### Recommended Values
- **Development**: `15.0` - Faster feedback during testing
- **Production**: `35.0` - Allows for network delays and slower connections
- **High-latency networks**: `60.0` - For regions with poor connectivity

## Timeout Behavior

When a participant fails to connect within the timeout period:

1. **Error Logging**: Detailed error information is logged including:
   - Room name and phone number
   - Call type (inbound/outbound)
   - Assistant ID
   - Room creation time
   - Participant count

2. **Call Outcome Tracking**: The timeout is logged to the `call_outcomes` table for analytics

3. **Room Cleanup**: The room is automatically deleted to prevent resource leaks

4. **Graceful Degradation**: The system continues processing other calls without crashing

## Error Logging Format

### Timeout Error
```
PARTICIPANT_TIMEOUT | room=assistant-_+12017656193_atv3CHDkHnmM | phone=+12017656193 | call_type=inbound | timeout=35.0s | assistant_id=booking_agent | room_created=2025-01-17T22:30:33Z | participants_count=0
```

### General Participant Wait Error
```
PARTICIPANT_WAIT_ERROR | room=assistant-_+12017656193_atv3CHDkHnmM | phone=+12017656193 | call_type=inbound | error=Connection failed | error_type=ConnectionError
```

## Monitoring and Analytics

### Database Tracking
Failed connections are tracked in the `call_outcomes` table with:
- `outcome`: "timeout" or "error"
- `reason`: Detailed description of the failure
- `duration_seconds`: 0 (no duration for failed connections)
- `timestamp`: When the failure occurred

### Latency Metrics
The system tracks latency for:
- `participant_wait`: Time spent waiting for participant connection
- `call_processing`: Overall call processing time
- `room_connection`: Time to establish room connection

## Troubleshooting

### Common Issues

1. **Frequent Timeouts**
   - Check network connectivity
   - Verify SIP trunk configuration
   - Consider increasing timeout value
   - Check for firewall issues

2. **Very Long Timeouts**
   - Reduce timeout value for faster failure detection
   - Check for hanging connections
   - Verify participant is actually attempting to connect

3. **Inconsistent Behavior**
   - Check logs for error patterns
   - Verify environment variable is set correctly
   - Check for race conditions in room creation

### Debug Commands

Check current timeout configuration:
```bash
echo $PARTICIPANT_TIMEOUT_SECONDS
```

Monitor timeout events:
```bash
grep "PARTICIPANT_TIMEOUT" livekit.log
```

Check call outcomes:
```sql
SELECT * FROM call_outcomes WHERE outcome = 'timeout' ORDER BY timestamp DESC LIMIT 10;
```

## Performance Impact

- **Lower timeouts**: Faster failure detection, better resource utilization
- **Higher timeouts**: More tolerance for slow connections, potential resource waste
- **Recommended**: Start with default (35s) and adjust based on your network conditions

## Integration Notes

This timeout configuration works with:
- LiveKit room management
- SIP trunk connections
- Call outcome analytics
- Latency monitoring system
- Graceful error handling

The system automatically handles cleanup and logging, so no additional configuration is required beyond setting the environment variable.
