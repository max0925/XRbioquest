import { createClient } from '@supabase/supabase-js';
import type { CatalogAsset } from './asset-catalog';

/** Public RLS reads only; never expose service-role credentials. No persistent cache. */
export async function loadAssetCatalog(): Promise<CatalogAsset[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Asset catalog is not configured');
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });
  const rows: CatalogAsset[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from('ngss_assets')
      .select('id,name,keywords,model_url').order('id').range(offset, offset + 499);
    if (error) throw new Error('Asset catalog could not be loaded');
    for (const row of data ?? []) {
      if (typeof row.model_url === 'string' && /^https:\/\//i.test(row.model_url)) rows.push(row as CatalogAsset);
    }
    if (!data || data.length < 500) break;
  }
  return rows;
}
