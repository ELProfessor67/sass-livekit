# Billing System Comparison: Current vs. New Wallet-Based Model

## Executive Summary

This document compares the current **quota-based minutes system** with the proposed **prepaid wallet-based billing system**. The new system addresses fraud prevention, eliminates credit risk, and provides a foundation for white label reseller operations.

---

## 🔍 Current System Analysis

### Current Architecture

#### 1. **Minutes Tracking Model**
- **Storage**: `users.minutes_limit` and `users.minutes_used` columns in Supabase
- **Model**: Quota-based (limit vs. used)
- **Calculation**: `remaining = minutes_limit - minutes_used`
- **Unlimited Plans**: `minutes_limit = 0` means unlimited

**Files:**
- `supabase/migrations/20250201000001_add_minutes_quota_to_users.sql`
- `server/routes/minutes.js`
- `livekit/config/database.py` (Python service)

#### 2. **Minutes Deduction Flow**
- **Trigger**: After call completes (post-call deduction)
- **Location**: `livekit/main.py` → `_save_call_history_to_database()`
- **Method**: `db_client.deduct_minutes(user_id, minutes_used)`
- **Behavior**: 
  - Allows calls even if minutes exceed limit (can go negative)
  - Updates `minutes_used` incrementally
  - No real-time blocking before call starts

#### 3. **Minutes Check Logic**
- **Pre-call Check**: `check_minutes_available()` in `database.py`
- **Behavior**:
  - Returns `available: true` if `minutes_limit = 0` (unlimited)
  - Returns `available: true` if `remaining > 0`
  - **Fails open**: On error, allows call to proceed
  - **No hard blocking**: System doesn't prevent calls at 0 balance

#### 4. **White Label / Reseller Logic**
- **Current Implementation**: Partial
- **Validation**: `validateMinutesDistribution()` in `server/routes/minutes.js`
- **Rules**:
  - ✅ Prevents allocating more minutes than parent has
  - ✅ Validates sum of subaccount minutes ≤ parent minutes
  - ❌ **No wallet concept**: Minutes are allocated, not purchased
  - ❌ **No prepaid requirement**: Resellers can assign minutes they don't own

**Files:**
- `server/routes/minutes.js` (lines 120-206, 213-370)
- `server/routes/admin.js` (lines 24-100, 596-693)

#### 5. **Payment Integration**
- **Current State**: **NOT IMPLEMENTED**
- **Stripe Setup**: Only UI components exist (`PaymentStep.tsx`)
- **No Backend**: No Stripe Checkout sessions, no webhook handlers
- **No Purchase Flow**: Users cannot buy minutes
- **Plan Upgrades**: Manual admin assignment or plan-based allocation

**Files:**
- `src/components/onboarding/steps/PaymentStep.tsx` (UI only, no backend)
- `src/pages/Billing.tsx` (displays usage, no purchase capability)

#### 6. **Billing UI**
- **Current Features**:
  - Displays `minutes_limit`, `minutes_used`, `remainingMinutes`
  - Shows usage percentage
  - Displays plan information
  - **Missing**: Purchase minutes button, wallet balance display, refill options

**Files:**
- `src/pages/Billing.tsx`
- `src/hooks/useAccountMinutes.ts`

---

## 🆕 New Wallet-Based System Requirements

### Core Differences

| Aspect | Current System | New Wallet System |
|--------|---------------|-------------------|
| **Model** | Quota (limit - used) | Wallet balance (prepaid credit) |
| **Payment** | None | Stripe Checkout required |
| **Pre-purchase** | No | Yes (must buy before use) |
| **Negative Balance** | Allowed (can exceed limit) | Blocked (0 = no calls) |
| **Reseller Safety** | Can oversell | Cannot oversell (wallet enforced) |
| **Auto-refill** | N/A | Optional feature |
| **Stripe Connect** | Not implemented | Required for white label |

---

## 📊 Detailed Feature Comparison

### 1. **Wallet Balance System**

#### Current System ❌
- No wallet concept
- Minutes are allocated via `minutes_limit`
- No purchase mechanism
- Minutes can be assigned without payment

#### New System ✅ Required
- **Database Schema**: New `wallet_balance` column (or separate `minute_wallets` table)
- **Purchase Flow**: User selects bundle → Stripe Checkout → Minutes added to wallet
- **Balance Display**: Show current balance, not just remaining quota
- **Zero Balance Block**: Calls blocked when `wallet_balance = 0`

**Implementation Needed:**
```sql
-- New migration needed
ALTER TABLE users ADD COLUMN wallet_balance INTEGER DEFAULT 0;
-- Or create separate minute_wallets table for better tracking
```

### 2. **Prepaid Purchase Flow**

#### Current System ❌
- No purchase endpoints
- No Stripe integration
- Plan-based allocation only

#### New System ✅ Required
- **Stripe Checkout Session**: Create session for minute bundles
- **Webhook Handler**: Process `checkout.session.completed` event
- **Bundle Configuration**: Define minute bundles (500, 1,000, 5,000, etc.)
- **Minimum Buy-in**: Configurable per tier

**Implementation Needed:**
- New route: `POST /api/v1/minutes/purchase`
- Stripe webhook: `POST /api/v1/webhooks/stripe`
- Bundle configuration table or config file

### 3. **Real-Time Deduction & Blocking**

#### Current System ⚠️ Partial
- Deduction happens **after** call
- Pre-call check exists but fails open
- Can exceed limit

#### New System ✅ Required
- **Pre-call Check**: Block if `wallet_balance < estimated_call_duration`
- **Real-time Deduction**: Deduct during/after call
- **Hard Block**: No calls if balance = 0 (unless auto-refill enabled)
- **Update Logic**: `wallet_balance -= minutes_used` (not `minutes_used += minutes`)

**Changes Needed:**
- `livekit/config/database.py`: Update `check_minutes_available()` to check wallet
- `livekit/config/database.py`: Update `deduct_minutes()` to deduct from wallet
- `livekit/main.py`: Add pre-call wallet check before allowing call

### 4. **White Label / Reseller Logic**

#### Current System ⚠️ Partial
- ✅ Validation prevents overselling (sum check)
- ❌ No wallet enforcement
- ❌ Resellers can assign minutes they don't own
- ❌ No purchase requirement for resellers

#### New System ✅ Required
- **Parent Wallet**: Reseller must purchase minutes first
- **Allocation Logic**: 
  - Reseller wallet: `wallet_balance` (master balance)
  - Subaccount allocation: Deduct from parent wallet when assigned
  - Subaccount usage: Deduct from parent wallet (not subaccount wallet)
- **Anti-Abuse**: Cannot allocate more than parent wallet balance
- **Stripe Connect**: Resellers charge their customers via Connect

**Implementation Needed:**
- Update `validateMinutesDistribution()` to check parent wallet balance
- New allocation logic: `parent.wallet_balance -= allocated_minutes`
- Subaccount usage deducts from parent wallet
- Stripe Connect integration for reseller billing

### 5. **Auto-Refill System**

#### Current System ❌
- Not implemented

#### New System ✅ Optional (Phase 2)
- **Threshold**: Configurable (e.g., < 100 minutes)
- **Auto-charge**: Charge saved payment method
- **Top-up Amount**: Configurable per user
- **Notifications**: Low balance alerts

**Implementation Needed:**
- New column: `auto_refill_enabled`, `auto_refill_threshold`, `auto_refill_amount`
- Background job to check balances
- Stripe Payment Intents for auto-charge

### 6. **Stripe Integration**

#### Current System ❌
- Only UI components (CardElement)
- No backend integration
- No webhooks
- No checkout sessions

#### New System ✅ Required
- **Stripe Checkout**: For minute bundle purchases
- **Stripe Connect**: For white label resellers
- **Webhooks**: 
  - `checkout.session.completed` → Add minutes to wallet
  - `payment_intent.succeeded` → Confirm auto-refill
  - `payment_intent.payment_failed` → Handle failures
- **Customer Management**: Store `stripe_customer_id` (already exists in schema)

**Implementation Needed:**
- Install `stripe` npm package (if not already)
- Create webhook handler route
- Create checkout session endpoint
- Stripe Connect onboarding flow

---

## 🚨 Critical Gaps & Issues

### 1. **No Payment System**
- **Impact**: Cannot monetize minutes
- **Risk**: Users get free minutes indefinitely
- **Fix**: Implement Stripe Checkout + webhooks

### 2. **No Wallet Balance**
- **Impact**: Cannot enforce prepaid model
- **Risk**: Users can use minutes without payment
- **Fix**: Add `wallet_balance` column and purchase flow

### 3. **Post-Call Deduction Only**
- **Impact**: Users can exceed limits
- **Risk**: Negative balances, unpaid usage
- **Fix**: Pre-call wallet check + real-time blocking

### 4. **Reseller Overselling Risk**
- **Impact**: Resellers can assign minutes they don't own
- **Risk**: Platform liability for unpaid minutes
- **Fix**: Wallet-based allocation (parent wallet must have balance)

### 5. **No Auto-Refill**
- **Impact**: Manual intervention required
- **Risk**: User experience friction
- **Fix**: Optional auto-refill with saved payment methods

### 6. **No Stripe Connect**
- **Impact**: White label resellers cannot bill their customers
- **Risk**: Limited reseller functionality
- **Fix**: Implement Stripe Connect onboarding and charge flow

---

## 📋 Implementation Checklist

### Phase 1: MVP (Core Wallet System)

#### Database Schema
- [ ] Add `wallet_balance` column to `users` table
- [ ] Create `minute_purchases` table (optional, for audit trail)
- [ ] Create `minute_bundles` table or config (bundle definitions)

#### Backend API
- [ ] `POST /api/v1/minutes/purchase` - Create Stripe Checkout session
- [ ] `POST /api/v1/webhooks/stripe` - Handle Stripe webhooks
- [ ] `GET /api/v1/minutes/wallet` - Get wallet balance
- [ ] Update `POST /api/v1/minutes/deduct` - Deduct from wallet (not just increment used)

#### LiveKit Service (Python)
- [ ] Update `check_minutes_available()` - Check `wallet_balance` instead of `minutes_limit - minutes_used`
- [ ] Update `deduct_minutes()` - Deduct from `wallet_balance`
- [ ] Add pre-call blocking when `wallet_balance = 0`
- [ ] Remove "fail open" behavior (hard block on 0 balance)

#### Frontend
- [ ] Update `Billing.tsx` - Show wallet balance
- [ ] Add "Add Minutes" button with bundle selection
- [ ] Create purchase flow UI
- [ ] Update `useAccountMinutes` hook - Fetch wallet balance

#### Stripe Integration
- [ ] Install Stripe SDK
- [ ] Configure Stripe keys (env vars)
- [ ] Create checkout session endpoint
- [ ] Create webhook handler
- [ ] Test payment flow

### Phase 2: White Label Enhancements

#### Reseller Wallet Logic
- [ ] Update `validateMinutesDistribution()` - Check parent wallet balance
- [ ] Modify allocation logic - Deduct from parent wallet when assigning
- [ ] Update subaccount usage - Deduct from parent wallet
- [ ] Add parent wallet balance display for resellers

#### Stripe Connect
- [ ] Create Connect onboarding flow
- [ ] Store `stripe_connect_account_id` for resellers
- [ ] Implement Connect charge flow for subaccount billing
- [ ] Handle Connect webhooks

#### Auto-Refill (Optional)
- [ ] Add auto-refill columns to `users` table
- [ ] Create background job to check balances
- [ ] Implement auto-charge logic
- [ ] Add UI toggles for auto-refill settings
- [ ] Create low balance notifications

### Phase 3: Advanced Features

#### Notifications
- [ ] Low balance alerts (email/push)
- [ ] Out of minutes notifications
- [ ] Purchase confirmation emails

#### Analytics & Reporting
- [ ] Wallet transaction history
- [ ] Purchase analytics
- [ ] Reseller margin tracking

#### Admin Tools
- [ ] Manual wallet top-up (admin override)
- [ ] Wallet balance adjustments
- [ ] Purchase audit logs

---

## 🔄 Migration Strategy

### Data Migration
1. **Existing Users**: 
   - Set `wallet_balance = minutes_limit - minutes_used` (remaining minutes)
   - Or set `wallet_balance = 0` (force purchase) - **Recommended for fraud prevention**

2. **Resellers**:
   - Calculate total allocated minutes
   - Set parent `wallet_balance = sum(allocated_minutes)` if they've paid
   - Or set to 0 and require purchase

3. **Historical Data**:
   - Keep `minutes_limit` and `minutes_used` for reporting
   - Add `wallet_balance` as new primary field

### Backward Compatibility
- Keep `minutes_limit` and `minutes_used` columns (for reporting)
- Gradually migrate logic to use `wallet_balance`
- Support both systems during transition period

---

## 🎯 Key Benefits of New System

### For Platform Owner
- ✅ **Zero credit risk** - All usage pre-paid
- ✅ **No fraud** - Cannot use without payment
- ✅ **Predictable revenue** - Cash flow upfront
- ✅ **No collections** - No chasing unpaid bills
- ✅ **Reseller safety** - Cannot oversell

### For Resellers
- ✅ **Guaranteed margins** - Can only sell what they own
- ✅ **No surprise bills** - Prepaid model
- ✅ **Stripe Connect** - Bill their customers directly
- ✅ **Fixed-price plans** - Create predictable pricing

### For End Users
- ✅ **Transparent usage** - Clear wallet balance
- ✅ **No hidden charges** - Prepaid = no overages
- ✅ **Control** - Know exactly what they're spending

---

## 📝 Notes

1. **Current system allows negative balances** - This is a critical issue that the new system fixes
2. **No payment integration exists** - This is the biggest gap to address
3. **Reseller validation exists but isn't wallet-enforced** - Needs wallet-based allocation
4. **Stripe UI components exist but no backend** - Need to implement full payment flow
5. **Minutes deduction happens post-call** - Should be pre-call check + real-time deduction

---

## 🚀 Next Steps

1. **Review this comparison** with stakeholders
2. **Prioritize Phase 1 features** (MVP wallet system)
3. **Design database schema** for wallet system
4. **Set up Stripe account** and get API keys
5. **Begin implementation** starting with database migration
6. **Test payment flow** in Stripe test mode
7. **Deploy to staging** for testing
8. **Migrate existing users** to wallet system
9. **Launch Phase 1** (MVP)
10. **Plan Phase 2** (White label enhancements)

