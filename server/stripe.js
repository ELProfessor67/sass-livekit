import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET) {
  console.error('Missing STRIPE_SECRET env var for Stripe initialization');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET || '', {
  apiVersion: '2024-06-20',
});




