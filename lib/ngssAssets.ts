import { createClient } from '@/lib/supabase/client';

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
  matchType: 'exact' | 'keyword' | 'category' | 'fulltext' | null;
  confidence: number; // 0-1 score
}

// Search parameters extracted from user input
export interface AssetSearchParams {
  keywords: string[];
  category?: string;
  subcategory?: string;
  curriculum?: string;
  ngssStandard?: string;
}

/**
 * Search NGSS assets database for matching internal assets
 * Uses a tiered search strategy:
 * 1. Exact keyword match
 * 2. Category + keyword match
 * 3. Full-text search on name/description
 * 4. Curriculum tag match
 */
export async function searchNGSSAssets(
  params: AssetSearchParams
): Promise<AssetSearchResult> {
  const supabase = createClient();

  const { keywords, category, subcategory, curriculum, ngssStandard } = params;

  // Normalize keywords for search
  const normalizedKeywords = keywords.map(k => k.toLowerCase().trim());

  try {
    // Strategy 1: Exact keyword match (highest confidence)
    for (const keyword of normalizedKeywords) {
      const { data: exactMatch, error: exactError } = await supabase
        .from('ngss_assets')
        .select('*')
        .contains('keywords', [keyword])
        .limit(1)
        .single();

      if (exactMatch && !exactError) {
        console.log(`[NGSS SEARCH] Exact keyword match: "${keyword}" -> ${exactMatch.name}`);
        return {
          found: true,
          asset: exactMatch as NGSSAsset,
          source: 'internal',
          matchType: 'exact',
          confidence: 1.0
        };
      }
    }

    // Strategy 2: Category + keyword combination
    if (category) {
      const { data: categoryMatches, error: catError } = await supabase
        .from('ngss_assets')
        .select('*')
        .ilike('category', `%${category}%`)
        .limit(10);

      if (categoryMatches && !catError && categoryMatches.length > 0) {
        // Score each match by keyword overlap
        const scoredMatches = categoryMatches.map(asset => {
          const assetKeywords = (asset.keywords || []).map((k: string) => k.toLowerCase());
          const overlap = normalizedKeywords.filter(k =>
            assetKeywords.some((ak: string) => ak.includes(k) || k.includes(ak))
          ).length;
          return { asset, score: overlap / Math.max(normalizedKeywords.length, 1) };
        }).filter(m => m.score > 0)
          .sort((a, b) => b.score - a.score);

        if (scoredMatches.length > 0) {
          const best = scoredMatches[0];
          console.log(`[NGSS SEARCH] Category+keyword match: ${category} -> ${best.asset.name} (score: ${best.score})`);
          return {
            found: true,
            asset: best.asset as NGSSAsset,
            source: 'internal',
            matchType: 'category',
            confidence: Math.min(0.9, best.score + 0.4)
          };
        }
      }
    }

    // Strategy 3: Full-text search on name/description
    const searchQuery = normalizedKeywords.join(' | ');
    const { data: fulltextMatches, error: ftError } = await supabase
      .from('ngss_assets')
      .select('*')
      .textSearch('name', searchQuery, { type: 'websearch' })
      .limit(5);

    if (fulltextMatches && !ftError && fulltextMatches.length > 0) {
      console.log(`[NGSS SEARCH] Full-text match: "${searchQuery}" -> ${fulltextMatches[0].name}`);
      return {
        found: true,
        asset: fulltextMatches[0] as NGSSAsset,
        source: 'internal',
        matchType: 'fulltext',
        confidence: 0.7
      };
    }

    // Strategy 4: Curriculum tag match
    if (curriculum) {
      const { data: curriculumMatch, error: currError } = await supabase
        .from('ngss_assets')
        .select('*')
        .contains('curriculum_tags', [curriculum])
        .limit(5);

      if (curriculumMatch && !currError && curriculumMatch.length > 0) {
        // Find best keyword overlap
        const scoredMatches = curriculumMatch.map(asset => {
          const assetKeywords = (asset.keywords || []).map((k: string) => k.toLowerCase());
          const overlap = normalizedKeywords.filter(k =>
            assetKeywords.some((ak: string) => ak.includes(k) || k.includes(ak))
          ).length;
          return { asset, score: overlap };
        }).sort((a, b) => b.score - a.score);

        if (scoredMatches[0]?.score > 0) {
          console.log(`[NGSS SEARCH] Curriculum match: ${curriculum} -> ${scoredMatches[0].asset.name}`);
          return {
            found: true,
            asset: scoredMatches[0].asset as NGSSAsset,
            source: 'internal',
            matchType: 'keyword',
            confidence: 0.6
          };
        }
      }
    }

    // Strategy 5: NGSS standard match
    if (ngssStandard) {
      const { data: standardMatch, error: stdError } = await supabase
        .from('ngss_assets')
        .select('*')
        .contains('ngss_standards', [ngssStandard])
        .limit(1)
        .single();

      if (standardMatch && !stdError) {
        console.log(`[NGSS SEARCH] NGSS standard match: ${ngssStandard} -> ${standardMatch.name}`);
        return {
          found: true,
          asset: standardMatch as NGSSAsset,
          source: 'internal',
          matchType: 'keyword',
          confidence: 0.5
        };
      }
    }

    // No match found
    console.log(`[NGSS SEARCH] No internal match for keywords: ${normalizedKeywords.join(', ')}`);
    return {
      found: false,
      asset: null,
      source: 'ai_generated', // Will fall back to Meshy
      matchType: null,
      confidence: 0
    };

  } catch (error) {
    console.error('[NGSS SEARCH] Database error:', error);
    return {
      found: false,
      asset: null,
      source: 'ai_generated',
      matchType: null,
      confidence: 0
    };
  }
}

/**
 * Batch search for multiple assets
 * Returns array of search results in same order as input
 */
export async function batchSearchNGSSAssets(
  assetQueries: AssetSearchParams[]
): Promise<AssetSearchResult[]> {
  const results = await Promise.all(
    assetQueries.map(params => searchNGSSAssets(params))
  );
  return results;
}
