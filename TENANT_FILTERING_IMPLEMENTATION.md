# Tenant Filtering Implementation Guide

## ✅ What's Been Done

1. **SQL Migration Created**: `SUPABASE_ADD_TENANT_COLUMNS.sql`
   - Adds `tenant` column to: assistant, call_history, campaigns, campaign_calls, call_queue
   - Creates indexes for performance
   - Sets default to 'main' for existing records

2. **Helper Functions Created**:
   - `server/utils/tenantFilter.js` - Main tenant filtering utilities
   - `server/utils/applyTenantFilterToQuery.js` - Simple query wrapper

3. **Frontend Updated**:
   - `src/lib/api/assistants/fetchAssistants.ts` - Now filters by tenant

4. **Backend Partially Updated**:
   - `server/livekit-sip.js` - Assistant queries filtered
   - `server/campaign-management.js` - Some campaign queries filtered

## 🔧 How to Apply Tenant Filtering

### Pattern 1: Using Helper Function (Recommended)

```javascript
import { applyTenantFilterFromRequest } from './utils/applyTenantFilterToQuery.js';

// Before:
const { data, error } = await supabase
  .from('campaigns')
  .select('*')
  .eq('id', id)
  .single();

// After:
let query = supabase
  .from('campaigns')
  .select('*')
  .eq('id', id);

query = applyTenantFilterFromRequest(req, query);
const { data, error } = await query.single();
```

### Pattern 2: Manual Filtering

```javascript
const tenant = req.tenant || 'main';

let query = supabase
  .from('assistant')
  .select('*')
  .eq('user_id', userId);

// Add tenant filter
if (tenant === 'main') {
  query = query.or('tenant.eq.main,tenant.is.null');
} else {
  query = query.eq('tenant', tenant);
}

const { data, error } = await query;
```

## 📋 Files That Need Updates

### High Priority (User-Facing Data)

1. ✅ `server/campaign-management.js` - PARTIALLY DONE
   - Need to add tenant filter to ALL campaign queries
   - Lines: 250, 264, 423, 458, 480

2. ⚠️ `server/campaign-execution-engine.js` - NEEDS UPDATE
   - All campaign queries need tenant filtering
   - This runs in background, needs tenant context

3. ⚠️ `server/outbound-calls.js` - NEEDS UPDATE
   - Campaign and call queries need filtering

4. ⚠️ `server/recording-webhook.js` - NEEDS UPDATE
   - Call history queries need filtering

5. ⚠️ `server/utils/livekit-room-helper.js` - NEEDS UPDATE
   - Assistant queries need filtering

6. ⚠️ `server/services/sms-database-service.js` - NEEDS UPDATE
   - Assistant queries need filtering

### Medium Priority

7. ⚠️ `server/csv-management.js` - NEEDS UPDATE
   - Campaign queries need filtering

8. ⚠️ `server/livekit-room.js` - NEEDS UPDATE
   - Assistant queries need filtering

### Frontend Files

9. ⚠️ `src/lib/api/campaigns/fetchCampaigns.ts` - NEEDS UPDATE
10. ⚠️ `src/lib/api/campaigns/saveCampaign.ts` - NEEDS UPDATE
11. ⚠️ `src/lib/api/conversations/fetchConversations.ts` - NEEDS UPDATE
12. ⚠️ `src/lib/api/knowledgeBase.ts` - NEEDS UPDATE (if knowledge bases have tenant)

## 🚨 Special Cases

### 1. Background Jobs (campaign-execution-engine.js)

Background jobs don't have `req.tenant`. Need to:
- Get tenant from campaign record
- Or pass tenant as parameter
- Or filter by user_id and then check tenant

### 2. Webhooks (recording-webhook.js)

Webhooks might not have tenant in request. Need to:
- Get tenant from call_history record
- Or from assistant record
- Or from user record

### 3. INSERT/UPDATE Operations

When creating new records, set tenant:

```javascript
const tenant = req.tenant || 'main';

await supabase
  .from('campaigns')
  .insert({
    ...campaignData,
    tenant: tenant  // Always set tenant on insert
  });
```

### 4. User-Scoped Queries

If query already filters by `user_id`, still add tenant filter for security:

```javascript
let query = supabase
  .from('assistant')
  .select('*')
  .eq('user_id', userId);  // User filter

query = applyTenantFilterFromRequest(req, query);  // Tenant filter
```

## ✅ Testing Checklist

After implementing:

1. ✅ Sign up as user in tenant "main"
2. ✅ Create assistant - should have tenant = 'main'
3. ✅ Sign up as white label user with slug "testco"
4. ✅ Create assistant - should have tenant = 'testco'
5. ✅ Login as main user - should only see main tenant assistants
6. ✅ Login as testco user - should only see testco tenant assistants
7. ✅ Try to access testco assistant from main user - should fail
8. ✅ Create campaign in testco - should have tenant = 'testco'
9. ✅ Main user should not see testco campaigns

## 📝 Quick Reference

### Import Statement
```javascript
import { applyTenantFilterFromRequest } from './utils/applyTenantFilterToQuery.js';
```

### For SELECT queries
```javascript
let query = supabase.from('table').select('*').eq('id', id);
query = applyTenantFilterFromRequest(req, query);
const { data } = await query;
```

### For INSERT queries
```javascript
const tenant = req.tenant || 'main';
await supabase.from('table').insert({ ...data, tenant });
```

### For UPDATE queries
```javascript
let query = supabase.from('table').update(data).eq('id', id);
query = applyTenantFilterFromRequest(req, query);
await query;
```

### For DELETE queries
```javascript
let query = supabase.from('table').delete().eq('id', id);
query = applyTenantFilterFromRequest(req, query);
await query;
```

## 🎯 Priority Order

1. **First**: Run `SUPABASE_ADD_TENANT_COLUMNS.sql` in Supabase SQL Editor
2. **Second**: Update all SELECT queries in user-facing routes
3. **Third**: Update INSERT queries to set tenant
4. **Fourth**: Update UPDATE/DELETE queries
5. **Fifth**: Handle special cases (webhooks, background jobs)



