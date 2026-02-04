import { NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════
// STRIPE WEBHOOK - Temporarily disabled while Stripe integration is WIP
// ═══════════════════════════════════════════════════════════════════════════

export async function POST() {
  return NextResponse.json({ received: true, disabled: true });
}
