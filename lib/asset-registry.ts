// ═══════════════════════════════════════════════════════════════════════════
// Biology Asset Registry
//
// Single source of truth for all biology 3D model assets available in
// BioQuest via the Supabase ngss_assets table.
//
//   available: true  → Confirmed in ngss_assets table; usable as model_source "library".
//   available: false → Planned; not yet in the table.
//
// supabase_id — UUID from ngss_assets.id column.
//               Run `SELECT id, name FROM ngss_assets ORDER BY name;` to
//               populate real values. Placeholder UUIDs are used below.
//
// The AI assembler receives only available=true entries (via buildAssetTableForPrompt).
// ═══════════════════════════════════════════════════════════════════════════

export interface AssetRegistryEntry {
  /** Kebab-case id used in GameConfig (e.g. "mitochondria") */
  id: string;
  /** Display name shown in HUD / tooltips */
  name: string;
  /**
   * UUID from Supabase ngss_assets.id column.
   * Used for direct DB lookup via lookupBySupabaseId().
   * Replace placeholders with real UUIDs from:
   *   SELECT id, name FROM ngss_assets ORDER BY name;
   */
  supabase_id: string;
  /** Primary search keyword for searchNGSSAssetsServer — matches ngss_assets keywords[] */
  search_keyword: string;
  /** Broad biology category */
  category: 'cell-biology' | 'genetics' | 'human-body' | 'molecules' | 'ecology';
  /** Relevant NGSS performance expectations */
  ngss_standards: string[];
  /** One-sentence educational description for the AI assembler */
  description: string;
  /** Which interaction types this model works well for */
  supported_interactions: ('click' | 'drag' | 'examine')[];
  /** false = not yet in ngss_assets table; excluded from AI assembler prompt */
  available: boolean;
}

// ─── Registry ────────────────────────────────────────────────────────────────
// All 14 confirmed models from the ngss_assets Supabase table.
// supabase_id values are PLACEHOLDERS — replace with:
//   SELECT id, name FROM ngss_assets ORDER BY name;

export const ASSET_REGISTRY: AssetRegistryEntry[] = [
  // ── Cell Biology ─────────────────────────────────────────────────────────
  {
    id: 'mitochondria',
    name: 'Mitochondria',
    supabase_id: 'FILL-IN-00000000-0000-0000-0000-000000000001',
    search_keyword: 'mitochondria',
    category: 'cell-biology',
    ngss_standards: ['HS-LS1-2', 'HS-LS1-6', 'AP-Bio-Unit-3'],
    description: 'Double-membraned powerhouse; produces ATP via cellular respiration',
    supported_interactions: ['click', 'drag', 'examine'],
    available: true,
  },
  {
    id: 'lysosome',
    name: 'Lysosome',
    supabase_id: 'FILL-IN-00000000-0000-0000-0000-000000000002',
    search_keyword: 'lysosome',
    category: 'cell-biology',
    ngss_standards: ['HS-LS1-2', 'HS-LS1-6'],
    description: 'Digestive vesicle containing hydrolytic enzymes; breaks down cellular waste at pH 4.5',
    supported_interactions: ['click', 'drag', 'examine'],
    available: true,
  },
  {
    id: 'endoplasmic-reticulum',
    name: 'Endoplasmic Reticulum',
    supabase_id: 'FILL-IN-00000000-0000-0000-0000-000000000003',
    search_keyword: 'endoplasmic reticulum',
    category: 'cell-biology',
    ngss_standards: ['HS-LS1-2'],
    description: 'Rough ER folds and glycosylates proteins; Smooth ER synthesizes lipids and detoxifies',
    supported_interactions: ['click', 'drag', 'examine'],
    available: true,
  },
  {
    id: 'golgi-apparatus',
    name: 'Golgi Apparatus',
    supabase_id: 'FILL-IN-00000000-0000-0000-0000-000000000004',
    search_keyword: 'golgi apparatus',
    category: 'cell-biology',
    ngss_standards: ['HS-LS1-2'],
    description: 'Packaging and sorting station; modifies proteins and routes them to final destinations',
    supported_interactions: ['click', 'drag', 'examine'],
    available: true,
  },

  // ── Genetics ─────────────────────────────────────────────────────────────
  {
    id: 'dna-molecule',
    name: 'DNA Molecule',
    supabase_id: 'FILL-IN-00000000-0000-0000-0000-000000000005',
    search_keyword: 'DNA molecule',
    category: 'genetics',
    ngss_standards: ['HS-LS3-1', 'HS-LS3-2'],
    description: 'Double-stranded antiparallel helix; stores genetic information as complementary base pairs',
    supported_interactions: ['click', 'examine'],
    available: true,
  },
  {
    id: 'dna-base-pairing',
    name: 'DNA Base Pairing',
    supabase_id: 'FILL-IN-00000000-0000-0000-0000-000000000006',
    search_keyword: 'DNA base pairing',
    category: 'genetics',
    ngss_standards: ['HS-LS3-1', 'HS-LS3-2'],
    description: 'Adenine pairs with Thymine (2 H-bonds) and Cytosine pairs with Guanine (3 H-bonds)',
    supported_interactions: ['click', 'drag', 'examine'],
    available: true,
  },
  {
    id: 'dna-ribbon',
    name: 'DNA Ribbon Structure',
    supabase_id: 'FILL-IN-00000000-0000-0000-0000-000000000007',
    search_keyword: 'DNA ribbon',
    category: 'genetics',
    ngss_standards: ['HS-LS3-1'],
    description: 'Ribbon diagram highlighting major/minor grooves; shows sugar-phosphate backbone structure',
    supported_interactions: ['click', 'examine'],
    available: true,
  },

  // ── Molecules ─────────────────────────────────────────────────────────────
  {
    id: 'glucose',
    name: 'Glucose',
    supabase_id: 'FILL-IN-00000000-0000-0000-0000-000000000008',
    search_keyword: 'glucose',
    category: 'molecules',
    ngss_standards: ['HS-LS1-6', 'HS-LS1-7'],
    description: 'C₆H₁₂O₆ primary fuel molecule; enters glycolysis to begin cellular respiration',
    supported_interactions: ['click', 'drag', 'examine'],
    available: true,
  },
  {
    id: 'enzyme-inhibition',
    name: 'Enzyme Inhibition',
    supabase_id: 'FILL-IN-00000000-0000-0000-0000-000000000009',
    search_keyword: 'enzyme inhibition',
    category: 'molecules',
    ngss_standards: ['HS-LS1-6', 'AP-Bio-Unit-3'],
    description: 'Competitive vs allosteric inhibition; regulates metabolic pathway flux by blocking active sites',
    supported_interactions: ['click', 'drag', 'examine'],
    available: true,
  },
  {
    id: 'polypeptide-chain',
    name: 'Polypeptide Chain',
    supabase_id: 'FILL-IN-00000000-0000-0000-0000-000000000010',
    search_keyword: 'polypeptide chain',
    category: 'molecules',
    ngss_standards: ['HS-LS1-1', 'HS-LS3-1'],
    description: 'Chain of amino acids linked by peptide bonds; folds into 3D protein structure based on R-groups',
    supported_interactions: ['click', 'examine'],
    available: true,
  },

  // ── Human Body ────────────────────────────────────────────────────────────
  {
    id: 'human-heart',
    name: 'Human Heart',
    supabase_id: 'FILL-IN-00000000-0000-0000-0000-000000000011',
    search_keyword: 'heart',
    category: 'human-body',
    ngss_standards: ['HS-LS1-2'],
    description: 'Four-chambered muscular pump; circulates ~5 L of blood per minute through pulmonary and systemic circuits',
    supported_interactions: ['click', 'examine'],
    available: true,
  },
  {
    id: 'human-lungs',
    name: 'Human Lungs',
    supabase_id: 'FILL-IN-00000000-0000-0000-0000-000000000012',
    search_keyword: 'lungs',
    category: 'human-body',
    ngss_standards: ['HS-LS1-2', 'HS-LS1-7'],
    description: 'Gas exchange organs; 300 million alveoli provide ~70 m² surface area for O₂/CO₂ diffusion',
    supported_interactions: ['click', 'examine'],
    available: true,
  },
  {
    id: 'human-skeleton',
    name: 'Human Skeleton',
    supabase_id: 'FILL-IN-00000000-0000-0000-0000-000000000013',
    search_keyword: 'human skeleton',
    category: 'human-body',
    ngss_standards: ['HS-LS1-2'],
    description: '206 bones providing structural support, protection, and attachment points for muscles',
    supported_interactions: ['click', 'examine'],
    available: true,
  },
  {
    id: 'human-anatomy',
    name: 'Human Anatomy',
    supabase_id: 'FILL-IN-00000000-0000-0000-0000-000000000014',
    search_keyword: 'human anatomy',
    category: 'human-body',
    ngss_standards: ['HS-LS1-2'],
    description: 'Full-body cross-section showing major organ systems and their spatial relationships',
    supported_interactions: ['click', 'examine'],
    available: true,
  },

  // ── Planned (not yet in ngss_assets table) ────────────────────────────────
  {
    id: 'chloroplast',
    name: 'Chloroplast',
    supabase_id: '',
    search_keyword: 'chloroplast',
    category: 'cell-biology',
    ngss_standards: ['HS-LS1-5', 'HS-LS1-6'],
    description: 'Double-membraned plastid; converts light energy to glucose via photosynthesis',
    supported_interactions: ['click', 'drag', 'examine'],
    available: false,
  },
  {
    id: 'nucleus',
    name: 'Nucleus',
    supabase_id: '',
    search_keyword: 'nucleus',
    category: 'cell-biology',
    ngss_standards: ['HS-LS1-1', 'HS-LS3-1'],
    description: 'Command center of the cell; contains chromatin and directs gene expression',
    supported_interactions: ['click', 'examine'],
    available: false,
  },
  {
    id: 'cell-membrane',
    name: 'Cell Membrane',
    supabase_id: '',
    search_keyword: 'cell membrane',
    category: 'cell-biology',
    ngss_standards: ['HS-LS1-2', 'HS-LS1-3'],
    description: 'Phospholipid bilayer with embedded proteins; selectively permeable boundary controlling transport',
    supported_interactions: ['click', 'examine'],
    available: false,
  },
  {
    id: 'ribosome',
    name: 'Ribosome',
    supabase_id: '',
    search_keyword: 'ribosome',
    category: 'cell-biology',
    ngss_standards: ['HS-LS1-1', 'HS-LS3-1'],
    description: 'Site of protein synthesis; translates mRNA codons into amino acid chains',
    supported_interactions: ['click', 'drag', 'examine'],
    available: false,
  },
  {
    id: 'chromosome',
    name: 'Chromosome',
    supabase_id: '',
    search_keyword: 'chromosome',
    category: 'genetics',
    ngss_standards: ['HS-LS3-1', 'HS-LS3-2'],
    description: 'Condensed chromatin structure; humans have 46 chromosomes (23 homologous pairs)',
    supported_interactions: ['click', 'drag', 'examine'],
    available: false,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns only models that are available in the ngss_assets table. */
export function getAvailableAssets(): AssetRegistryEntry[] {
  return ASSET_REGISTRY.filter((a) => a.available);
}

/** Returns assets filtered by category. */
export function getAssetsByCategory(
  category: AssetRegistryEntry['category']
): AssetRegistryEntry[] {
  return ASSET_REGISTRY.filter((a) => a.category === category);
}

/**
 * Look up a registry entry by its Supabase ngss_assets UUID.
 * Returns null if not found or supabase_id is not set.
 */
export function lookupBySupabaseId(id: string): AssetRegistryEntry | null {
  if (!id) return null;
  return ASSET_REGISTRY.find((a) => a.supabase_id === id) ?? null;
}

/**
 * Look up a registry entry by its search keyword (case-insensitive).
 */
export function lookupByKeyword(keyword: string): AssetRegistryEntry | null {
  const lower = keyword.toLowerCase();
  return (
    ASSET_REGISTRY.find(
      (a) => a.available && a.search_keyword.toLowerCase() === lower
    ) ?? null
  );
}

/**
 * Builds the asset table for the AI assembler system prompt.
 * Only includes available=true entries.
 */
export function buildAssetTableForPrompt(): string {
  const available = getAvailableAssets();
  const header =
    'id                       | name                     | search_keyword           | category       | description\n' +
    '-------------------------|--------------------------|--------------------------|----------------|---------------------------------------------';
  const rows = available.map((a) => {
    const id = a.id.padEnd(25);
    const name = a.name.padEnd(24);
    const kw = a.search_keyword.padEnd(24);
    const cat = a.category.padEnd(14);
    return `${id}| ${name}| ${kw}| ${cat}| ${a.description}`;
  });
  return [header, ...rows].join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// Map Template Registry
//
// Pre-made 3D environment GLB models available in Supabase storage.
// The AI assembler picks a map_template id; the runtime resolves it to a URL.
// ═══════════════════════════════════════════════════════════════════════════

export interface MapTemplate {
  /** Kebab-case id used in GameConfig environment.map_template */
  id: string;
  /** Display name */
  name: string;
  /** GLB filename in Supabase ngss-assets storage bucket */
  glb_filename: string;
  /** Short description for AI assembler */
  description: string;
  /** Recommended topic categories */
  recommended_for: string[];
  /** Whether the GLB is confirmed in Supabase storage */
  available: boolean;
}

export const MAP_TEMPLATES: MapTemplate[] = [
  {
    id: 'lake-low-poly',
    name: 'Lake Low-Poly',
    glb_filename: 'just_a_lake_low_poly.glb',
    description: 'Lake with surrounding grass terrain — good for biology, general science',
    recommended_for: ['cell-biology', 'ecology', 'general'],
    available: true,
  },
  {
    id: 'low-poly-island',
    name: 'Low-Poly Island',
    glb_filename: 'low_poly_island.glb',
    description: 'Tropical island with grass and water — good for biology, ecology',
    recommended_for: ['cell-biology', 'ecology', 'general'],
    available: true,
  },
  {
    id: 'sci-fi-buildings',
    name: 'Sci-Fi Buildings',
    glb_filename: 'stylized_low_poly_sci-fi_buildings.glb',
    description: 'Futuristic cityscape with neon lights — good for chemistry, tech topics',
    recommended_for: ['chemistry', 'genetics'],
    available: true,
  },
  {
    id: 'the-hills',
    name: 'The Hills',
    glb_filename: 'the_hills.glb',
    description: 'Rolling green hills with paths — good for ecology, evolution',
    recommended_for: ['ecology', 'evolution'],
    available: true,
  },
  {
    id: 'volcano',
    name: 'Volcano',
    glb_filename: 'the_volcano.glb',
    description: 'Volcanic landscape with lava — good for earth science, dramatic settings',
    recommended_for: ['earth-science', 'chemistry'],
    available: true,
  },
  {
    id: 'orange-platform',
    name: 'Orange Platform',
    glb_filename: 'the_orange_platform_-_island.glb',
    description: 'Simple floating platform — good for focused lab-style experiences',
    recommended_for: ['cell-biology', 'human-body', 'general'],
    available: true,
  },
];

export function getAvailableMaps(): MapTemplate[] {
  return MAP_TEMPLATES.filter((m) => m.available);
}

export function lookupMapTemplate(id: string): MapTemplate | undefined {
  return MAP_TEMPLATES.find((m) => m.id === id);
}

export function buildMapTableForPrompt(): string {
  const available = getAvailableMaps();
  const header = '| id | name | description | recommended_for |';
  const sep = '|---|---|---|---|';
  const rows = available.map(
    (m) =>
      `| ${m.id} | ${m.name} | ${m.description} | ${m.recommended_for.join(', ')} |`
  );
  return [header, sep, ...rows].join('\n');
}
