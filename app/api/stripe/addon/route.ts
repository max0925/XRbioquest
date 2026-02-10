import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';
import { PRICES } from '@/lib/stripe/prices';
import { createClient } from '@/lib/supabase/server';

// POST /api/stripe/addon — Create a Stripe Checkout Session for one-time add-on packs
export async function POST(req: NextRequest) {
  try {
    const { addon } = await req.json();

    // Map addon type to Stripe price ID
    const addonMap: Record<string, { priceId: string; type: string }> = {
      ENV_PACK: { priceId: PRICES.ADDON_ENV_PACK, type: 'ENV_PACK' },
      MODEL_PACK: { priceId: PRICES.ADDON_MODEL_PACK, type: 'MODEL_PACK' },
      SEASONAL_PACK: { priceId: PRICES.ADDON_SEASONAL_PACK, type: 'SEASONAL_PACK' },
    };

    const addonConfig = addonMap[addon];
    if (!addonConfig) {
      return NextResponse.json({ error: 'Invalid addon type' }, { status: 400 });
    }

    let stripe;
    try {
      stripe = getStripe();
    } catch {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY.' },
        { status: 503 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Please log in to purchase add-ons', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Check if user has an active subscription (required for add-ons)
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, subscription_status')
      .eq('id', user.id)
      .single();

    if (!profile?.subscription_status || profile.subscription_status !== 'active') {
      return NextResponse.json(
        { error: 'Active subscription required to purchase add-ons' },
        { status: 403 }
      );
    }

    let customerId = profile?.stripe_customer_id;

    // Create Stripe customer if needed (shouldn't happen for subscribers, but just in case)
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Create Stripe-hosted Checkout Session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{ price: addonConfig.priceId, quantity: 1 }],
      success_url: `${req.nextUrl.origin}/environment-design?addon=success&type=${addon}`,
      cancel_url: `${req.nextUrl.origin}/environment-design?addon=cancelled`,
      metadata: {
        supabase_user_id: user.id,
        addon_type: addonConfig.type,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('[stripe/addon]', err.message);
    return NextResponse.json(
      { error: err.message || 'Failed to create addon checkout session' },
      { status: 500 }
    );
  }
}
