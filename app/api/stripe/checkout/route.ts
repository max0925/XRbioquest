import { NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════
// STRIPE CHECKOUT - Temporarily disabled while Stripe integration is WIP
// ═══════════════════════════════════════════════════════════════════════════

export async function POST() {
  return NextResponse.json(
    { error: 'Stripe checkout is not yet configured. Coming soon!' },
    { status: 503 }
  );
}
