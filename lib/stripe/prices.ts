// ═══════════════════════════════════════════════════════════════════════════
// STRIPE PRICE IDS - Map to Stripe Dashboard products
// Create these products in Stripe Dashboard, then paste the price IDs here.
// ═══════════════════════════════════════════════════════════════════════════

export const PRICES = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY!,       // $29/month
  PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY!,         // $290/year
  SCHOOL_YEARLY: process.env.STRIPE_PRICE_SCHOOL_YEARLY!,   // $550/teacher/year
  ADDON_ENV_PACK: process.env.STRIPE_PRICE_ADDON_ENV!,      // $19.99 one-time (+15 env generations)
  ADDON_MODEL_PACK: process.env.STRIPE_PRICE_ADDON_MODEL!,  // $9.99 one-time (+10 3D models)
} as const;

// Human-readable metadata attached to Checkout Sessions
export const PRODUCT_META = {
  [PRICES.PRO_MONTHLY]: { name: 'Pro Monthly', type: 'subscription' as const, credits: { env: 15, model: 15 } },
  [PRICES.PRO_YEARLY]: { name: 'Pro Yearly', type: 'subscription' as const, credits: { env: 15, model: 15 } },
  [PRICES.SCHOOL_YEARLY]: { name: 'School Yearly', type: 'subscription' as const, credits: { env: 20, model: 20 } },
  [PRICES.ADDON_ENV_PACK]: { name: 'Environment Pack', type: 'addon' as const, credits: { env: 15, model: 0 } },
  [PRICES.ADDON_MODEL_PACK]: { name: '3D Model Pack', type: 'addon' as const, credits: { env: 0, model: 10 } },
} as const;
