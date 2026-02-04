import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { PRICES } from '@/lib/stripe/prices';
import { createClient } from '@/lib/supabase/server';

// POST /api/stripe/addon — Create a one-time Checkout Session for add-on packs
export async function POST(req: NextRequest) {
  try {
    const { priceId } = await req.json();

    // Map client-safe key to actual Stripe price ID
    const addonMap: Record<string, string> = {
      ADDON_ENV_PACK: PRICES.ADDON_ENV_PACK,
      ADDON_MODEL_PACK: PRICES.ADDON_MODEL_PACK,
    };

    const resolvedPriceId = addonMap[priceId];
    if (!resolvedPriceId) {
      return NextResponse.json({ error: 'Invalid add-on price ID' }, { status: 400 });
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Fetch or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await supabase
        .from('profiles')
        .upsert({ id: user.id, stripe_customer_id: customerId });
    }

    // Create one-time payment Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{ price: resolvedPriceId, quantity: 1 }],
      success_url: `${req.nextUrl.origin}/environment-design?addon=success`,
      cancel_url: `${req.nextUrl.origin}/pricing?addon=cancelled`,
      metadata: {
        supabase_user_id: user.id,
        addon_price_id: resolvedPriceId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('[stripe/addon]', err.message);
    return NextResponse.json(
      { error: 'Failed to create addon checkout session' },
      { status: 500 }
    );
  }
}
