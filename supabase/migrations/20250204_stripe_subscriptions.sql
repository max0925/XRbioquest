-- ═══════════════════════════════════════════════════════════════════════════
-- STRIPE SUBSCRIPTIONS SCHEMA
-- Run this migration in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Add Stripe fields to existing profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS price_id TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS env_credits INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS model_credits INTEGER DEFAULT 3;

-- Index for fast Stripe customer lookups from webhooks
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON profiles(stripe_customer_id);

-- Index for querying active subscriptions
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status
  ON profiles(subscription_status);

-- Ledger table for credit purchases (add-on packs)
CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_session_id TEXT NOT NULL,
  price_id TEXT NOT NULL,
  env_credits INTEGER DEFAULT 0,
  model_credits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit purchases"
  ON credit_purchases FOR SELECT
  USING (auth.uid() = user_id);
