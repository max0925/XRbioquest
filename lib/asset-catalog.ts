export interface CatalogAsset {
  id: string;
  name: string;
  keywords: string[] | null;
  model_url: string;
}

const normalize = (value: string) => value.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

/** Exact names/aliases only: ambiguous matches must not select the wrong biology model. */
export function matchCatalogAsset(
  asset: { supabase_id?: string; search_keyword?: string; name?: string; id: string },
  catalog: CatalogAsset[],
): CatalogAsset | undefined {
  if (asset.supabase_id) return catalog.find(row => row.id === asset.supabase_id);
  for (const query of [asset.search_keyword, asset.name, asset.id.replace(/-\d+$/, '')]) {
    if (!query) continue;
    const key = normalize(query);
    const names = catalog.filter(row => normalize(row.name) === key);
    if (names.length === 1) return names[0];
    if (names.length > 1) return undefined;
    const aliases = catalog.filter(row => (row.keywords ?? []).some(word => normalize(word) === key));
    if (aliases.length === 1) return aliases[0];
    if (aliases.length > 1) return undefined;
  }
  return undefined;
}

export function refreshCatalogPaths<T extends { assets: Array<{ id: string; model_source: string; supabase_id?: string; model_path?: string; search_keyword?: string; name?: string }> }>(config: T, catalog: CatalogAsset[]): T {
  return { ...config, assets: config.assets.map(asset => {
    // Legacy courses without a catalog UUID retain their saved URLs.
    if (asset.model_source !== 'library' || (!asset.supabase_id && asset.model_path)) return asset;
    const match = matchCatalogAsset(asset, catalog);
    return match ? { ...asset, supabase_id: match.id, model_path: match.model_url } : asset;
  }) };
}
