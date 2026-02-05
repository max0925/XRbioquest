import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/client';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('[webhook] Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // Verify signature
  let event: Stripe.Event;
  let stripe: Stripe;

  try {
    stripe = getStripe();
  } catch {
    console.error('[webhook] Stripe SDK not configured');
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('[webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log(`[webhook] Received event: ${event.type} (${event.id})`);

  // Cast to any to bypass missing generated types for admin client
  const supabase = getSupabaseAdmin() as any;

  try {
    switch (event.type) {
      // ── Checkout completed (subscription or one-time) ──────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('[webhook] checkout.session.completed', {
          sessionId: session.id,
          mode: session.mode,
          customerEmail: session.customer_details?.email,
          customerId: session.customer,
          subscriptionId: session.subscription,
        });

        if (session.mode === 'subscription') {
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;
          const email = session.customer_details?.email;
          const userId = session.metadata?.supabase_user_id;

          // Fetch subscription details to get price_id and period
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const subscriptionItem = subscription.items.data[0];
          const priceId = subscriptionItem?.price.id;
          // In latest Stripe SDK, current_period_end moved from Subscription to SubscriptionItem
          const periodEnd = new Date(subscriptionItem.current_period_end * 1000);

          console.log('[webhook] Subscription details:', {
            subscriptionId,
            priceId,
            status: subscription.status,
            periodEnd: periodEnd.toISOString(),
            userId,
          });

          if (userId) {
            // User ID from metadata — update by user ID
            const { error } = await supabase
              .from('profiles')
              .update({
                stripe_customer_id: customerId,
                subscription_id: subscriptionId,
                subscription_status: mapStatus(subscription.status),
                price_id: priceId,
                current_period_end: periodEnd.toISOString(),
                env_credits: 30,
                model_credits: 20,
              })
              .eq('id', userId);

            if (error) {
              console.error('[webhook] Supabase update by userId failed:', error.message);
            } else {
              console.log(`[webhook] ✓ Updated profile for user ${userId}`);
            }
          } else if (email) {
            // Fallback: find user by email
            console.log(`[webhook] No userId in metadata, looking up by email: ${email}`);
            const { data: users } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', email)
              .limit(1);

            if (users && users.length > 0) {
              const { error } = await supabase
                .from('profiles')
                .update({
                  stripe_customer_id: customerId,
                  subscription_id: subscriptionId,
                  subscription_status: mapStatus(subscription.status),
                  price_id: priceId,
                  current_period_end: periodEnd.toISOString(),
                  env_credits: 30,
                  model_credits: 20,
                })
                .eq('id', users[0].id);

              if (error) {
                console.error('[webhook] Supabase update by email failed:', error.message);
              } else {
                console.log(`[webhook] ✓ Updated profile for email ${email} (id: ${users[0].id})`);
              }
            } else {
              console.warn(`[webhook] No profile found for email ${email}`);
            }
          } else {
            console.warn('[webhook] No userId or email available, cannot update profile');
          }
        }

        // One-time payment (add-on packs)
        if (session.mode === 'payment') {
          const userId = session.metadata?.supabase_user_id;
          const addonPriceId = session.metadata?.addon_price_id;
          console.log('[webhook] One-time payment:', { userId, addonPriceId });

          if (userId && addonPriceId) {
            // Determine credits
            const envCredits = addonPriceId === process.env.STRIPE_PRICE_ADDON_ENV ? 30 : 0;
            const modelCredits = addonPriceId === process.env.STRIPE_PRICE_ADDON_MODEL ? 20 : 0;

            // Record purchase
            await supabase.from('credit_purchases').insert({
              user_id: userId,
              stripe_session_id: session.id,
              price_id: addonPriceId,
              env_credits: envCredits,
              model_credits: modelCredits,
            });

            // Increment credits
            const { data: profile } = await supabase
              .from('profiles')
              .select('env_credits, model_credits')
              .eq('id', userId)
              .single();

            if (profile) {
              await supabase
                .from('profiles')
                .update({
                  env_credits: (profile.env_credits ?? 0) + envCredits,
                  model_credits: (profile.model_credits ?? 0) + modelCredits,
                })
                .eq('id', userId);

              console.log(`[webhook] ✓ Added ${envCredits} env + ${modelCredits} model credits for user ${userId}`);
            }
          }
        }
        break;
      }

      // ── Subscription updated (plan change, renewal, payment issue) ─
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const subscriptionItem = subscription.items.data[0];
        const priceId = subscriptionItem?.price.id;
        const status = mapStatus(subscription.status);
        // In latest Stripe SDK, current_period_end moved from Subscription to SubscriptionItem
        const periodEnd = new Date(subscriptionItem.current_period_end * 1000);

        console.log('[webhook] customer.subscription.updated', {
          subscriptionId: subscription.id,
          customerId,
          priceId,
          status,
          periodEnd: periodEnd.toISOString(),
        });

        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_status: status,
            price_id: priceId,
            current_period_end: periodEnd.toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        if (error) {
          console.error('[webhook] Supabase update failed:', error.message);
        } else {
          console.log(`[webhook] ✓ Updated subscription status to "${status}" for customer ${customerId}`);
        }
        break;
      }

      // ── Subscription deleted (cancelled) ───────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log('[webhook] customer.subscription.deleted', {
          subscriptionId: subscription.id,
          customerId,
        });

        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'canceled',
            subscription_id: null,
            price_id: null,
            env_credits: 3,
            model_credits: 3,
          })
          .eq('stripe_customer_id', customerId);

        if (error) {
          console.error('[webhook] Supabase cancel failed:', error.message);
        } else {
          console.log(`[webhook] ✓ Cancelled subscription for customer ${customerId}, reset to free credits`);
        }
        break;
      }

      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[webhook] Processing error:', err.message);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

function mapStatus(status: Stripe.Subscription.Status): string {
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
