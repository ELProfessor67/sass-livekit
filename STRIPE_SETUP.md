# Stripe Payment Integration Setup

## Environment Variables Required

Add these environment variables to your `.env` file:

```bash
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_TEST_KEY=sk_test_your_stripe_secret_key_here
```

## How to Get Your Stripe Keys

1. **Sign up for Stripe**: Go to [stripe.com](https://stripe.com) and create an account
2. **Get Test Keys**: 
   - Go to your Stripe Dashboard
   - Click on "Developers" → "API keys"
   - Copy the "Publishable key" (starts with `pk_test_`)
   - Copy the "Secret key" (starts with `sk_test_`)

## Testing the Integration

1. **Install dependencies**: `npm install`
2. **Set environment variables** in your `.env` file
3. **Start the development server**: `npm run dev`
4. **Go to onboarding**: Navigate to `/onboarding`
5. **Select a plan** and proceed to the payment step
6. **Test with Stripe test cards**:
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`
   - **Requires authentication**: `4000 0025 0000 3155`

## Test Card Details

Use these test details for any card:
- **Expiry**: Any future date (e.g., 12/25)
- **CVC**: Any 3 digits (e.g., 123)
- **ZIP**: Any 5 digits (e.g., 12345)

## Features

✅ **Card Element**: Secure card input with glass theme styling
✅ **Payment Method Creation**: Saves payment method for future use
✅ **No Backend Required**: Works without server-side setup
✅ **Glass Theme**: Matches your app's dark glass aesthetic
✅ **Error Handling**: User-friendly error messages
✅ **Loading States**: Processing indicators
✅ **Success Animation**: Confirmation before proceeding
✅ **Responsive Design**: Works on all devices

## Troubleshooting

### Card Element Not Loading
- Check that `VITE_STRIPE_PUBLISHABLE_KEY` is set correctly
- Ensure the key starts with `pk_test_` or `pk_live_`
- Check browser console for errors

### Payment Fails
- Use valid test card numbers (see above)
- Check that all required fields are filled
- Ensure Stripe keys are valid and active

### Environment Variables Not Loading
- Restart the development server after adding env vars
- Ensure `.env` file is in the project root
- Check that variable names start with `VITE_` for client-side access
