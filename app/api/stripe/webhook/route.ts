import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { PRICES } from '@/lib/stripe/prices';
import {
  upsertSubscription,
  cancelSubscription,
  addCredits,
  type SubscriptionStatus,
} from '@/lib/stripe/subscriptions';

// Disable body parsing — Stripe needs the raw body for signature verification
export const dynamic = 'force-dynamic';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// ═══════════════════════════════════════════════════════════════════════════
// STRIPE WEBHOOK - Handles subscription lifecycle + one-time add-on payments
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('[stripe/webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ── Subscription created or renewed ──────────────────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id;

        await upsertSubscription({
          stripeCustomerId: customerId,
          subscriptionId: subscription.id,
          priceId,
          status: mapStripeStatus(subscription.status),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        });
        break;
      }

      // ── Subscription cancelled or expired ────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        await cancelSubscription(customerId);
        break;
      }

      // ── One-time payment completed (add-on packs) ───────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Only process one-time payments (add-ons), not subscription checkouts
        if (session.mode !== 'payment') break;

        const userId = session.metadata?.supabase_user_id;
        const addonPriceId = session.metadata?.addon_price_id;

        if (!userId || !addonPriceId) break;

        // Determine credits based on price
        let envCredits = 0;
        let modelCredits = 0;

        if (addonPriceId === PRICES.ADDON_ENV_PACK) {
          envCredits = 30;
        } else if (addonPriceId === PRICES.ADDON_MODEL_PACK) {
          modelCredits = 20;
        }

        await addCredits({
          userId,
          sessionId: session.id,
          priceId: addonPriceId,
          envCredits,
          modelCredits,
        });
        break;
      }

      default:
        // Unhandled event type — acknowledge receipt
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[stripe/webhook] Processing error:', err.message);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Map Stripe subscription statuses to our simplified set
function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'canceled';
    default:
      return 'free';
  }
}
