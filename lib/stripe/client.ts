import Stripe from 'stripe';

// Lazy singleton — avoids crash at import time when STRIPE_SECRET_KEY is not yet set
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    _stripe = new Stripe(key, { typescript: true });
  }
  return _stripe;
}
