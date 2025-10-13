# Support Access System

A comprehensive, secure, and auditable support access system that allows administrators to temporarily access user accounts for support purposes while maintaining strict security controls and complete audit trails.

## 🎯 Overview

The Support Access System implements the following workflow:

1. **Admin clicks "Support Access"** on an agency or subaccount → fills reason → chooses duration (e.g., 30–60 mins)
2. **Backend creates support_sessions row** and mints a scoped token limited to that tenant/subaccount
3. **UI switches to bannered view**: "Viewing as Agency A → Subaccount A2. Ends in 43:12."
4. **All reads/writes use the scoped token**; every action goes to audit_log
5. **On expiry or manual exit**, the token is revoked; banner disappears

## 🏗️ Architecture

### Database Schema

#### `support_sessions` Table
- Tracks active support access sessions
- Stores admin, target user, reason, duration, and expiration
- Links to scoped tokens for access control

#### `scoped_tokens` Table
- Stores hashed versions of temporary access tokens
- Includes permissions, expiration, and usage tracking
- Automatically revoked when sessions end

#### `audit_log` Table
- Comprehensive logging of all support access actions
- Tracks every read/write operation during support sessions
- Includes IP addresses, user agents, and detailed action metadata

### Backend Components

#### Support Access Service (`src/lib/supportAccessService.ts`)
- Core service for managing support sessions
- Token generation and validation
- Session lifecycle management
- Audit logging integration

#### API Routes (`server/routes/supportAccess.js`)
- RESTful endpoints for support access operations
- Admin authentication middleware
- Scoped token validation
- Session management endpoints

#### Audit Logging (`src/lib/auditLogging.ts`)
- Middleware for automatic audit logging
- Token revocation service
- Cleanup job for expired sessions
- Express and Next.js compatible

### Frontend Components

#### Support Access Dialog (`src/components/admin/SupportAccessDialog.tsx`)
- Modal for creating support access sessions
- Reason input and duration selection
- Security warnings and confirmations

#### Support Access Banner (`src/components/admin/SupportAccessBanner.tsx`)
- Real-time countdown display
- Session status indicators
- Manual session termination controls

#### Active Sessions Manager (`src/components/admin/ActiveSupportSessions.tsx`)
- Overview of all active support sessions
- Session management and monitoring
- Quick access to session details

## 🔐 Security Features

### Token Security
- **Scoped Tokens**: Limited to specific user accounts
- **Time-Limited**: Automatic expiration (15-120 minutes)
- **Hashed Storage**: Tokens stored as SHA-256 hashes
- **Immediate Revocation**: Tokens revoked on session end

### Access Control
- **Admin-Only**: Only users with admin role can create sessions
- **No Admin Impersonation**: Cannot create sessions for other admins
- **Single Active Session**: One session per admin-user pair
- **Automatic Cleanup**: Expired sessions cleaned up automatically

### Audit Trail
- **Complete Logging**: Every action logged with timestamps
- **IP Tracking**: Source IP addresses recorded
- **User Agent Logging**: Browser/client information captured
- **Detailed Metadata**: Request duration, resource types, etc.

## 🚀 Usage

### For Administrators

1. **Create Support Session**:
   - Navigate to Admin Panel → Users
   - Click "Support Access" on any user (except admins)
   - Fill in reason and select duration
   - Click "Grant Support Access"

2. **Monitor Active Sessions**:
   - View all active sessions in the Admin Panel
   - See time remaining and session details
   - End sessions manually if needed

3. **During Support Access**:
   - Banner shows current session info and countdown
   - All actions are automatically logged
   - Can end session or exit impersonation at any time

### For Developers

#### Creating Support Sessions
```typescript
import { SupportAccessService } from '@/lib/supportAccessService';

const service = SupportAccessService.getInstance();
const result = await service.createSupportSession(
  adminUserId,
  targetUserId,
  'Customer billing issue',
  30 // minutes
);
```

#### Validating Scoped Tokens
```typescript
const validation = await service.validateScopedToken(token);
if (validation.is_valid) {
  // Token is valid and not expired
  const sessionId = validation.session_id;
  const targetUserId = validation.target_user_id;
}
```

#### Logging Audit Events
```typescript
import { logCustomAuditEvent } from '@/lib/auditLogging';

await logCustomAuditEvent(
  sessionId,
  adminUserId,
  'user_edited',
  { field: 'email', oldValue: 'old@email.com', newValue: 'new@email.com' },
  targetUserId,
  'user',
  userId
);
```

## 📊 Monitoring & Maintenance

### Automatic Cleanup
- **Expired Sessions**: Cleaned up every 5 minutes
- **Revoked Tokens**: Automatically marked as revoked
- **Database Cleanup**: Old audit logs can be archived

### Health Checks
- **Token Validation**: Regular validation of active tokens
- **Session Monitoring**: Track session durations and usage
- **Audit Log Analysis**: Monitor for unusual patterns

### Performance Considerations
- **Token Caching**: Frequently used tokens cached in memory
- **Database Indexing**: Optimized queries for session lookups
- **Cleanup Scheduling**: Background cleanup to avoid blocking operations

## 🔧 Configuration

### Environment Variables
```bash
# Required for support access system
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional cleanup configuration
SUPPORT_ACCESS_CLEANUP_INTERVAL=5 # minutes
SUPPORT_ACCESS_MAX_DURATION=120 # minutes
```

### Database Setup
1. Run the migration: `supabase/migrations/20250131000004_create_support_access_system.sql`
2. Ensure RLS policies are active
3. Verify cleanup functions are created

## 🧪 Testing

### Unit Tests
- Token generation and validation
- Session lifecycle management
- Audit logging functionality
- Cleanup job operations

### Integration Tests
- End-to-end support access workflow
- API endpoint testing
- Database operations
- Frontend component testing

### Security Tests
- Token security validation
- Access control enforcement
- Audit trail completeness
- Session expiration handling

## 📈 Analytics & Reporting

### Session Metrics
- Total sessions created
- Average session duration
- Most common support reasons
- Admin usage patterns

### Audit Reports
- Action frequency by type
- Resource access patterns
- Geographic distribution (IP-based)
- Session success/failure rates

## 🚨 Troubleshooting

### Common Issues

1. **Token Validation Fails**
   - Check token expiration
   - Verify session status
   - Ensure token hasn't been revoked

2. **Session Not Ending**
   - Check cleanup job status
   - Verify database connectivity
   - Review error logs

3. **Audit Logging Missing**
   - Verify middleware configuration
   - Check database permissions
   - Review service role key

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG=support-access:*
```

## 🔮 Future Enhancements

### Planned Features
- **Bulk Operations**: Support multiple users simultaneously
- **Advanced Permissions**: Granular permission controls
- **Session Templates**: Predefined session configurations
- **Real-time Notifications**: Live session monitoring
- **Advanced Analytics**: Detailed usage reports
- **API Rate Limiting**: Prevent abuse of support access

### Integration Opportunities
- **Slack Notifications**: Alert team of support sessions
- **Jira Integration**: Link sessions to support tickets
- **Customer Success Tools**: Enhanced customer context
- **Compliance Reporting**: Automated audit reports

## 📚 API Reference

### Endpoints

#### Create Support Session
```http
POST /api/v1/support-access/support-sessions
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "targetUserId": "uuid",
  "reason": "Customer billing issue",
  "durationMinutes": 30
}
```

#### Validate Scoped Token
```http
POST /api/v1/support-access/validate-token
Content-Type: application/json

{
  "token": "scoped_token_string"
}
```

#### End Support Session
```http
POST /api/v1/support-access/support-sessions/{sessionId}/end
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "completed"
}
```

#### Get Active Sessions
```http
GET /api/v1/support-access/support-sessions/active
Authorization: Bearer <admin_token>
```

#### Get Audit Logs
```http
GET /api/v1/support-access/support-sessions/{sessionId}/audit-logs
Authorization: Bearer <admin_token>
```

## 🤝 Contributing

1. Follow the existing code style and patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure security best practices are followed
5. Test with various user roles and permissions

## 📄 License

This Support Access System is part of the main project and follows the same licensing terms.
