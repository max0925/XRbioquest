import { NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════
// STRIPE ADDON - Temporarily disabled while Stripe integration is WIP
// ═══════════════════════════════════════════════════════════════════════════

export async function POST() {
  return NextResponse.json(
    { error: 'Stripe add-ons are not yet configured. Coming soon!' },
    { status: 503 }
  );
}
