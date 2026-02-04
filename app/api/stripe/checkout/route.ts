import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { PRICES } from '@/lib/stripe/prices';
import { createClient } from '@/lib/supabase/server';

// POST /api/stripe/checkout — Create a Stripe Checkout Session for Pro plans
export async function POST(req: NextRequest) {
  try {
    const { priceId } = await req.json();

    // Map client-safe plan key to actual Stripe price ID
    const priceMap: Record<string, string> = {
      PRO_MONTHLY: PRICES.PRO_MONTHLY,
      PRO_YEARLY: PRICES.PRO_YEARLY,
    };

    const resolvedPriceId = priceMap[priceId];
    if (!resolvedPriceId) {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user already has a Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    // Create Stripe customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Store customer ID in Supabase
      await supabase
        .from('profiles')
        .upsert({ id: user.id, stripe_customer_id: customerId });
    }

    // Create Checkout Session using Stripe-hosted checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: resolvedPriceId, quantity: 1 }],
      success_url: `${req.nextUrl.origin}/environment-design?checkout=success`,
      cancel_url: `${req.nextUrl.origin}/pricing?checkout=cancelled`,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
      metadata: { supabase_user_id: user.id },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('[stripe/checkout]', err.message);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
