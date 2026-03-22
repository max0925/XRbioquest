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
        { error: 'No subscription found' },
        { status: 400 }
      );
    }

    if (profile.subscription_status !== 'canceling') {
      return NextResponse.json(
        { error: 'Subscription is not pending cancellation' },
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

    // Reactivate subscription by removing cancel_at_period_end
    const subscription = await stripe.subscriptions.update(
      profile.subscription_id,
      { cancel_at_period_end: false }
    );

    // Optimistically update database (webhook will be source of truth)
    await supabase
      .from('profiles')
      .update({ subscription_status: 'active' })
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      status: subscription.status,
      current_period_end: subscription.current_period_end,
    });
  } catch (err: any) {
    console.error('[subscription/reactivate]', err.message);
    return NextResponse.json(
      { error: err.message || 'Failed to reactivate subscription' },
      { status: 500 }
    );
  }
}
