// ═══════════════════════════════════════════════════════════════════════════
// STRIPE PRICE IDS - Map to Stripe Dashboard products
// Create these products in Stripe Dashboard, then paste the price IDs here.
// ═══════════════════════════════════════════════════════════════════════════

export const PRICES = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY!,   // $29/month
  PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY!,     // $290/year
  ADDON_ENV_PACK: process.env.STRIPE_PRICE_ADDON_ENV!,  // $10 one-time (+30 env generations)
  ADDON_MODEL_PACK: process.env.STRIPE_PRICE_ADDON_MODEL!, // $15 one-time (+20 3D model generations)
} as const;

// Human-readable metadata attached to Checkout Sessions
export const PRODUCT_META = {
  [PRICES.PRO_MONTHLY]: { name: 'Pro Monthly', type: 'subscription' as const },
  [PRICES.PRO_YEARLY]: { name: 'Pro Yearly', type: 'subscription' as const },
  [PRICES.ADDON_ENV_PACK]: { name: 'Environment Pack', type: 'addon' as const, credits: { environments: 30 } },
  [PRICES.ADDON_MODEL_PACK]: { name: '3D Model Pack', type: 'addon' as const, credits: { models: 20 } },
} as const;
