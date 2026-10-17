import { NextResponse } from 'next/server';
import { loadAssetCatalog } from '@/lib/asset-catalog-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ assets: await loadAssetCatalog() }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'Asset catalog unavailable' }, { status: 503 });
  }
}
