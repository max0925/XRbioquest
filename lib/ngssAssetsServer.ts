import { createClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════
// SERVER-SIDE NGSS ASSET SEARCH
// For use in API routes where cookies context is not available
// Uses anon key (ngss_assets table has public read access via RLS)
// ═══════════════════════════════════════════════════════════════════════════

// Asset source types
export type AssetSource = 'internal' | 'ai_generated' | 'local';

// NGSS Asset from database
export interface NGSSAsset {
  id: string;
  name: string;
  description: string | null;
  model_url: string;
  thumbnail_url: string | null;
  category: string;
  subcategory: string | null;
  ngss_standards: string[];
  curriculum_tags: string[];
  has_animation: boolean;
  keywords: string[];
}

// Search result with source tracking
export interface AssetSearchResult {
  found: boolean;
  asset: NGSSAsset | null;
  source: AssetSource;
  matchType: 'exact' | 'keyword' | 'category' | 'fulltext' | 'name' | null;
  confidence: number;
}

// Search parameters
export interface AssetSearchParams {
  keywords: string[];
  category?: string;
  subcategory?: string;
  curriculum?: string;
  ngssStandard?: string;
}

// Lazy singleton for server-side Supabase client
let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      console.error('[NGSS SERVER] Supabase env vars missing');
      return null;
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

/**
 * Search NGSS assets database (server-side version for API routes)
 * Uses a tiered search strategy with detailed logging
 */
export async function searchNGSSAssetsServer(
  params: AssetSearchParams
): Promise<AssetSearchResult> {
  const supabase = getSupabase();

  if (!supabase) {
    console.error('[NGSS SERVER] Cannot search - Supabase not configured');
    return {
      found: false,
      asset: null,
      source: 'ai_generated',
      matchType: null,
      confidence: 0
    };
  }

  const { keywords, category, subcategory, curriculum, ngssStandard } = params;
  const normalizedKeywords = keywords.map(k => k.toLowerCase().trim()).filter(k => k.length > 0);

  console.log(`\n[NGSS SERVER] ═══════════════════════════════════════════════`);
  console.log(`[NGSS SERVER] Searching for: ${normalizedKeywords.join(', ')}`);
  console.log(`[NGSS SERVER] Category: ${category || 'any'} | Curriculum: ${curriculum || 'any'}`);
  console.log(`[NGSS SERVER] ═══════════════════════════════════════════════`);

  try {
    // Strategy 1: Exact keyword match in keywords array
    console.log(`[NGSS SERVER] Strategy 1: Exact keyword match...`);
    for (const keyword of normalizedKeywords) {
      const { data, error } = await supabase
        .from('ngss_assets')
        .select('*')
        .contains('keywords', [keyword])
        .limit(1);

      if (data && (data as any[]).length > 0 && !error) {
        const asset = (data as any[])[0];
        console.log(`[NGSS SERVER] ✅ FOUND via exact keyword: "${keyword}" → ${asset.name}`);
        console.log(`[NGSS SERVER]    Model URL: ${asset.model_url}`);
        console.log(`[NGSS SERVER]    Has Animation: ${asset.has_animation}`);
        return {
          found: true,
          asset: asset as NGSSAsset,
          source: 'internal',
          matchType: 'exact',
          confidence: 1.0
        };
      }
    }
    console.log(`[NGSS SERVER] Strategy 1: No exact keyword match`);

    // Strategy 2: Name contains keyword (partial match)
    console.log(`[NGSS SERVER] Strategy 2: Name contains keyword...`);
    for (const keyword of normalizedKeywords) {
      if (keyword.length < 3) continue; // Skip very short keywords

      const { data, error } = await supabase
        .from('ngss_assets')
        .select('*')
        .ilike('name', `%${keyword}%`)
        .limit(1);

      if (data && (data as any[]).length > 0 && !error) {
        const asset = (data as any[])[0];
        console.log(`[NGSS SERVER] ✅ FOUND via name match: "${keyword}" → ${asset.name}`);
        console.log(`[NGSS SERVER]    Model URL: ${asset.model_url}`);
        return {
          found: true,
          asset: asset as NGSSAsset,
          source: 'internal',
          matchType: 'name',
          confidence: 0.9
        };
      }
    }
    console.log(`[NGSS SERVER] Strategy 2: No name match`);

    // Strategy 3: Category + keyword combination
    if (category) {
      console.log(`[NGSS SERVER] Strategy 3: Category "${category}" + keywords...`);
      const { data: categoryMatches, error } = await supabase
        .from('ngss_assets')
        .select('*')
        .ilike('category', `%${category}%`)
        .limit(10);

      const matches = categoryMatches as any[] | null;
      if (matches && !error && matches.length > 0) {
        console.log(`[NGSS SERVER] Found ${matches.length} assets in category`);

        const scoredMatches = matches.map((asset: any) => {
          const assetKeywords = (asset.keywords || []).map((k: string) => k.toLowerCase());
          const assetName = asset.name.toLowerCase();

          let score = 0;
          for (const kw of normalizedKeywords) {
            if (assetKeywords.some((ak: string) => ak.includes(kw) || kw.includes(ak))) score += 2;
            if (assetName.includes(kw)) score += 3;
          }
          return { asset, score };
        }).filter((m: any) => m.score > 0)
          .sort((a: any, b: any) => b.score - a.score);

        if (scoredMatches.length > 0) {
          const best = scoredMatches[0];
          console.log(`[NGSS SERVER] ✅ FOUND via category+keyword: ${best.asset.name} (score: ${best.score})`);
          return {
            found: true,
            asset: best.asset as NGSSAsset,
            source: 'internal',
            matchType: 'category',
            confidence: Math.min(0.85, 0.4 + (best.score * 0.1))
          };
        }
      }
      console.log(`[NGSS SERVER] Strategy 3: No category+keyword match`);
    }

    // Strategy 4: Curriculum tag match
    if (curriculum) {
      console.log(`[NGSS SERVER] Strategy 4: Curriculum tag "${curriculum}"...`);
      const { data, error } = await supabase
        .from('ngss_assets')
        .select('*')
        .contains('curriculum_tags', [curriculum])
        .limit(5);

      const matches = data as any[] | null;
      if (matches && !error && matches.length > 0) {
        // Score by keyword overlap
        const scoredMatches = matches.map((asset: any) => {
          const assetKeywords = (asset.keywords || []).map((k: string) => k.toLowerCase());
          const overlap = normalizedKeywords.filter(k =>
            assetKeywords.some((ak: string) => ak.includes(k) || k.includes(ak))
          ).length;
          return { asset, score: overlap };
        }).filter((m: any) => m.score > 0)
          .sort((a: any, b: any) => b.score - a.score);

        if (scoredMatches.length > 0) {
          console.log(`[NGSS SERVER] ✅ FOUND via curriculum: ${scoredMatches[0].asset.name}`);
          return {
            found: true,
            asset: scoredMatches[0].asset as NGSSAsset,
            source: 'internal',
            matchType: 'keyword',
            confidence: 0.6
          };
        }
      }
      console.log(`[NGSS SERVER] Strategy 4: No curriculum match`);
    }

    // Strategy 5: Broad search - any asset matching any keyword in name or description
    console.log(`[NGSS SERVER] Strategy 5: Broad text search...`);
    for (const keyword of normalizedKeywords) {
      if (keyword.length < 4) continue;

      const { data, error } = await supabase
        .from('ngss_assets')
        .select('*')
        .or(`name.ilike.%${keyword}%,description.ilike.%${keyword}%`)
        .limit(1);

      if (data && (data as any[]).length > 0 && !error) {
        const asset = (data as any[])[0];
        console.log(`[NGSS SERVER] ✅ FOUND via broad search: "${keyword}" → ${asset.name}`);
        return {
          found: true,
          asset: asset as NGSSAsset,
          source: 'internal',
          matchType: 'fulltext',
          confidence: 0.5
        };
      }
    }

    console.log(`[NGSS SERVER] ❌ No match found - will fall back to AI generation`);
    console.log(`[NGSS SERVER] ═══════════════════════════════════════════════\n`);

    return {
      found: false,
      asset: null,
      source: 'ai_generated',
      matchType: null,
      confidence: 0
    };

  } catch (error) {
    console.error('[NGSS SERVER] Database error:', error);
    return {
      found: false,
      asset: null,
      source: 'ai_generated',
      matchType: null,
      confidence: 0
    };
  }
}
