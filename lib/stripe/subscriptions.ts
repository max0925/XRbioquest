import { createClient as createServerClient } from '@/lib/supabase/server';

// ═══════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION HELPERS - Read/write subscription state in Supabase
// ═══════════════════════════════════════════════════════════════════════════

export type SubscriptionStatus = 'free' | 'active' | 'past_due' | 'canceled';

// Default credit limits per plan
const PLAN_CREDITS = {
  free: { environments: 3, models: 3 },
  pro: { environments: 30, models: 20 },
} as const;

// Called from webhook when subscription is created or updated
export async function upsertSubscription(params: {
  stripeCustomerId: string;
  subscriptionId: string;
  priceId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: Date;
}) {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_id: params.subscriptionId,
      price_id: params.priceId,
      subscription_status: params.status,
      current_period_end: params.currentPeriodEnd.toISOString(),
      // Reset monthly credits on subscription change
      env_credits: PLAN_CREDITS.pro.environments,
      model_credits: PLAN_CREDITS.pro.models,
    })
    .eq('stripe_customer_id', params.stripeCustomerId);

  if (error) {
    console.error('[upsertSubscription]', error.message);
    throw error;
  }
}

// Called from webhook when subscription is deleted/cancelled
export async function cancelSubscription(stripeCustomerId: string) {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'canceled',
      subscription_id: null,
      price_id: null,
      env_credits: PLAN_CREDITS.free.environments,
      model_credits: PLAN_CREDITS.free.models,
    })
    .eq('stripe_customer_id', stripeCustomerId);

  if (error) {
    console.error('[cancelSubscription]', error.message);
    throw error;
  }
}

// Called from webhook on add-on pack purchase
export async function addCredits(params: {
  userId: string;
  sessionId: string;
  priceId: string;
  envCredits: number;
  modelCredits: number;
}) {
  const supabase = await createServerClient();

  // Record the purchase
  await supabase.from('credit_purchases').insert({
    user_id: params.userId,
    stripe_session_id: params.sessionId,
    price_id: params.priceId,
    env_credits: params.envCredits,
    model_credits: params.modelCredits,
  });

  // Increment credits on profile using raw SQL via RPC
  // Fallback: read-then-write since Supabase JS doesn't support atomic increment
  const { data: profile } = await supabase
    .from('profiles')
    .select('env_credits, model_credits')
    .eq('id', params.userId)
    .single();

  if (profile) {
    await supabase
      .from('profiles')
      .update({
        env_credits: (profile.env_credits ?? 0) + params.envCredits,
        model_credits: (profile.model_credits ?? 0) + params.modelCredits,
      })
      .eq('id', params.userId);
  }
}
