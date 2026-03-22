import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Please log in to manage your subscription', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Get user's subscription ID from Supabase
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_id, subscription_status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (!profile.subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Initialize Stripe
    let stripe;
    try {
      stripe = getStripe();
    } catch {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 503 }
      );
    }

    // Cancel at period end (user retains access until billing cycle ends)
    const subscription = await stripe.subscriptions.update(
      profile.subscription_id,
      { cancel_at_period_end: true }
    );

    // Optimistically update database (webhook will be source of truth)
    await supabase
      .from('profiles')
      .update({ subscription_status: 'canceling' })
      .eq('id', user.id);

    // Optional: Store cancellation reason
    const body = await req.json();
    if (body.reason) {
      await supabase.from('cancellation_reasons').insert({
        user_id: user.id,
        subscription_id: profile.subscription_id,
        reason: body.reason,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      cancel_at: subscription.cancel_at,
      current_period_end: subscription.current_period_end,
    });
  } catch (err: any) {
    console.error('[subscription/cancel]', err.message);
    return NextResponse.json(
      { error: err.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
