# Stripe Keys Setup Guide

## ⚠️ Error: "No such payment_intent"

This error means your **frontend and backend Stripe keys don't match**. They must be from the **same Stripe account/workspace**.

## ✅ How to Fix

### Step 1: Check Your Backend Key

In your backend `.env` file, you should have:
```bash
STRIPE_SECRET=sk_test_...  # or sk_live_...
```

**Note the first few characters** after `sk_test_` (e.g., `sk_test_51Abc...`).

### Step 2: Get Matching Frontend Key

1. Go to **Stripe Dashboard** → **Developers** → **API keys**
2. Make sure you're in the **same workspace/account** that has the secret key
3. Copy the **Publishable key** (starts with `pk_test_...` or `pk_live_...`)
4. The first characters after `pk_test_` should match your secret key
   - Example: If backend is `sk_test_51Abc...`, frontend should be `pk_test_51Abc...`

### Step 3: Update Frontend Key

In your frontend `.env` file (or environment variables), set:
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51Abc...  # Must match backend account!
```

### Step 4: Restart Both Servers

- **Backend**: Restart your Node.js server
- **Frontend**: Restart your dev server (or rebuild if production)

### Step 5: Test Again

Try purchasing minutes again. The error should be gone.

## 🔍 Quick Check

You can verify keys match by checking:
- Backend: `STRIPE_SECRET` starts with `sk_test_51XXX...` 
- Frontend: `VITE_STRIPE_PUBLISHABLE_KEY` starts with `pk_test_51XXX...`
- The `51XXX` part should be **identical**

## 📝 Important Notes

- **Both keys must be from the platform account** (not a connected account)
- **Both should be test keys** (`test`) or both live keys (`live`) - don't mix!
- The publishable key is **safe to expose** in frontend code
- The secret key is **NEVER** exposed to frontend

## 🆘 Still Having Issues?

1. Check browser console for the actual error message
2. Check backend logs to see if PaymentIntent was created successfully
3. Verify both `.env` files are loaded correctly
4. Make sure you're using the correct Stripe account (test vs live mode)


