// ═══════════════════════════════════════════════════════════════════════════
// Biology Asset Registry
//
// Single source of truth for all biology 3D model assets available in
// BioQuest via the Supabase ngss_assets table.
//
// model_filename must match exactly what's in Supabase storage bucket "assets".
// The AI assembler receives only available=true entries (via buildAssetTableForPrompt).
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_STORAGE_BASE =
  'https://tqqimwpwjnaldwuibeqf.supabase.co/storage/v1/object/public/assets';

export interface AssetRegistryEntry {
  /** Kebab-case id used in GameConfig (e.g. "mitochondria") */
  id: string;
  /** Display name shown in HUD / tooltips */
  name: string;
  /** Primary search keyword for searchNGSSAssetsServer */
  search_keyword: string;
  /** Broad biology category */
  category: 'cell-biology' | 'genetics' | 'human-body' | 'molecules' | 'ecology';
  /** Relevant NGSS performance expectations */
  ngss_standards: string[];
  /** One-sentence educational description for the AI assembler */
  description: string;
  /** Which interaction types this model works well for */
  supported_interactions: ('click' | 'drag' | 'examine')[];
  /** Exact .glb filename in Supabase storage bucket "assets" */
  model_filename: string;
  /** false = not yet in storage; excluded from AI assembler prompt */
  available: boolean;
}

// ─── Registry ────────────────────────────────────────────────────────────────
// All confirmed models verified against Supabase storage bucket.

export const ASSET_REGISTRY: AssetRegistryEntry[] = [
  // ═══ CELLS & ORGANELLES ═══
  {
    id: 'mitochondria',
    name: 'Mitochondria',
    search_keyword: 'mitochondria',
    category: 'cell-biology',
    ngss_standards: ['HS-LS1-7'],
    description: 'Powerhouse of the cell — produces ATP through cellular respiration',
    supported_interactions: ['click', 'drag', 'examine'],
    model_filename: 'mitochondria_-_cell_organelles.glb',
    available: true,
  },
  {
    id: 'lysosome',
    name: 'Lysosome',
    search_keyword: 'lysosome',
    category: 'cell-biology',
    ngss_standards: ['HS-LS1-2'],
    description: 'Digestive system of the cell — breaks down waste with enzymes',
    supported_interactions: ['click', 'drag', 'examine'],
    model_filename: 'lysosome.glb',
    available: true,
  },
  {
    id: 'endoplasmic-reticulum',
    name: 'Endoplasmic Reticulum',
    search_keyword: 'endoplasmic reticulum',
    category: 'cell-biology',
    ngss_standards: ['HS-LS1-1'],
    description: 'Transport network — folds and processes proteins',
    supported_interactions: ['click', 'drag', 'examine'],
    model_filename: 'endoplasmic_reticulum.glb',
    available: true,
  },
  {
    id: 'golgi-apparatus',
    name: 'Golgi Apparatus',
    search_keyword: 'golgi apparatus',
    category: 'cell-biology',
    ngss_standards: ['HS-LS1-1'],
    description: 'Packaging center — modifies, sorts, and ships proteins',
    supported_interactions: ['click', 'drag', 'examine'],
    model_filename: 'golgi_apparatuscomplex.glb',
    available: true,
  },

  // ═══ GENETICS ═══
  {
    id: 'dna-molecule',
    name: 'DNA Molecule',
    search_keyword: 'DNA molecule',
    category: 'genetics',
    ngss_standards: ['HS-LS1-1', 'HS-LS3-1'],
    description: 'Double helix structure carrying genetic information',
    supported_interactions: ['click', 'examine'],
    model_filename: 'deoxyribonucleic_acid_dna.glb',
    available: true,
  },
  {
    id: 'dna-base-pairing',
    name: 'DNA Base Pairing',
    search_keyword: 'DNA base pairing',
    category: 'genetics',
    ngss_standards: ['HS-LS1-1', 'HS-LS3-1'],
    description: 'Complementary base pairs — A-T and C-G hydrogen bonds',
    supported_interactions: ['click', 'drag', 'examine'],
    model_filename: 'dna_helix_with_base_pairing_3d.glb',
    available: true,
  },
  {
    id: 'dna-ribbon',
    name: 'DNA Ribbon Structure',
    search_keyword: 'DNA ribbon',
    category: 'genetics',
    ngss_standards: ['HS-LS3-1'],
    description: 'Ribbon visualization of DNA molecular structure',
    supported_interactions: ['click', 'examine'],
    model_filename: 'b-dna_ribbon_backbone__sticks_bases.glb',
    available: true,
  },
  {
    id: 'dna-replication',
    name: 'DNA Replication',
    search_keyword: 'DNA replication',
    category: 'genetics',
    ngss_standards: ['HS-LS1-1', 'HS-LS3-1'],
    description: 'DNA replication fork showing semiconservative replication',
    supported_interactions: ['click', 'examine'],
    model_filename: 'dna_replication_model.glb',
    available: true,
  },

  // ═══ MOLECULES ═══
  {
    id: 'glucose-molecule',
    name: 'Glucose Molecule',
    search_keyword: 'glucose',
    category: 'molecules',
    ngss_standards: ['HS-LS1-7'],
    description: 'Simple sugar C6H12O6 — primary fuel for cellular respiration',
    supported_interactions: ['click', 'drag', 'examine'],
    model_filename: 'glucose_molecule.glb',
    available: true,
  },
  {
    id: 'polypeptide-chain',
    name: 'Polypeptide Chain',
    search_keyword: 'polypeptide',
    category: 'molecules',
    ngss_standards: ['HS-LS1-1'],
    description: 'Polypeptide chain — amino acid sequence that folds into protein',
    supported_interactions: ['click', 'examine'],
    model_filename: 'keratine_chains__vlakna_keratinu.glb',
    available: true,
  },
  {
    id: 'enzyme-inhibition',
    name: 'Enzyme Inhibition',
    search_keyword: 'enzyme inhibition',
    category: 'molecules',
    ngss_standards: ['HS-LS1-1'],
    description: 'Enzyme-substrate interaction showing competitive inhibition',
    supported_interactions: ['click', 'drag', 'examine'],
    model_filename: 'ornithine_decarboxylase_inhibition_by_g418.glb',
    available: true,
  },

  // ═══ HUMAN BODY ═══
  {
    id: 'human-heart',
    name: 'Human Heart',
    search_keyword: 'heart',
    category: 'human-body',
    ngss_standards: ['HS-LS1-2'],
    description: 'Four-chambered heart — pumps blood through circulatory system',
    supported_interactions: ['click', 'examine'],
    model_filename: 'realistic_human_heart.glb',
    available: true,
  },
  {
    id: 'human-lungs',
    name: 'Human Lungs',
    search_keyword: 'lungs',
    category: 'human-body',
    ngss_standards: ['HS-LS1-2'],
    description: 'Lungs — gas exchange organ for oxygen and carbon dioxide',
    supported_interactions: ['click', 'examine'],
    model_filename: 'realistic_human_lungs.glb',
    available: true,
  },
  {
    id: 'human-skeleton',
    name: 'Human Skeleton',
    search_keyword: 'human skeleton',
    category: 'human-body',
    ngss_standards: ['HS-LS1-2'],
    description: 'Full human skeletal system — 206 bones providing structure',
    supported_interactions: ['click', 'examine'],
    model_filename: 'human_skeleton.glb',
    available: true,
  },
  {
    id: 'human-anatomy',
    name: 'Human Anatomy',
    search_keyword: 'human anatomy',
    category: 'human-body',
    ngss_standards: ['HS-LS1-2'],
    description: 'Full human anatomical model showing major organ systems',
    supported_interactions: ['click', 'examine'],
    model_filename: 'human_anatomy.glb',
    available: true,
  },

  // ═══ CELLS (WHOLE) ═══
  {
    id: 'animal-cell',
    name: 'Animal Cell',
    search_keyword: 'animal cell',
    category: 'cell-biology',
    ngss_standards: ['HS-LS1-1', 'HS-LS1-2'],
    description: 'Complete animal cell showing all major organelles',
    supported_interactions: ['click', 'examine'],
    model_filename: 'animal_cell.glb',
    available: true,
  },
  {
    id: 'plant-cell',
    name: 'Plant Cell',
    search_keyword: 'plant cell',
    category: 'cell-biology',
    ngss_standards: ['HS-LS1-1', 'HS-LS1-2'],
    description: 'Complete plant cell with cell wall, chloroplasts, and large vacuole',
    supported_interactions: ['click', 'examine'],
    model_filename: 'plant_cell.glb',
    available: true,
  },
  {
    id: 'ribosome',
    name: 'Ribosome',
    search_keyword: 'ribosome',
    category: 'cell-biology',
    ngss_standards: ['HS-LS1-1', 'HS-LS1-2'],
    description: 'Ribosome — molecular machine that translates mRNA into protein',
    supported_interactions: ['click', 'drag', 'examine'],
    model_filename: 'ribosome.glb',
    available: true,
  },
  {
    id: 'chloroplast',
    name: 'Chloroplast',
    search_keyword: 'chloroplast',
    category: 'cell-biology',
    ngss_standards: ['HS-LS1-1', 'HS-LS1-5'],
    description: 'Chloroplast — converts light energy to chemical energy via photosynthesis',
    supported_interactions: ['click', 'drag', 'examine'],
    model_filename: 'chloroplast.glb',
    available: true,
  },
  {
    id: 'chromosome',
    name: 'Chromosome',
    search_keyword: 'chromosome',
    category: 'genetics',
    ngss_standards: ['HS-LS3-1', 'HS-LS3-2'],
    description: 'Condensed chromosome structure carrying genes during cell division',
    supported_interactions: ['click', 'drag', 'examine'],
    model_filename: 'chromosome.glb',
    available: true,
  },
  {
    id: 'red-blood-cell',
    name: 'Red Blood Cell',
    search_keyword: 'red blood cell',
    category: 'human-body',
    ngss_standards: ['HS-LS1-2'],
    description: 'Biconcave red blood cell (erythrocyte) that carries oxygen via hemoglobin',
    supported_interactions: ['click', 'drag', 'examine'],
    model_filename: 'red_blood_cell.glb',
    available: true,
  },
  {
    id: 'neuron',
    name: 'Neuron',
    search_keyword: 'neuron',
    category: 'human-body',
    ngss_standards: ['HS-LS1-2'],
    description: 'Nerve cell with axon, dendrites, and synaptic terminals for signal transmission',
    supported_interactions: ['click', 'examine'],
    model_filename: 'neuron.glb',
    available: true,
  },

  // ═══ HUMAN ORGANS (NEW) ═══
  {
    id: 'human-brain',
    name: 'Human Brain',
    search_keyword: 'brain',
    category: 'human-body',
    ngss_standards: ['HS-LS1-2'],
    description: 'Human brain — central organ of the nervous system controlling cognition',
    supported_interactions: ['click', 'examine'],
    model_filename: 'human_brain.glb',
    available: true,
  },
  {
    id: 'human-kidney',
    name: 'Human Kidney',
    search_keyword: 'kidney',
    category: 'human-body',
    ngss_standards: ['HS-LS1-2'],
    description: 'Human kidney — filters blood and produces urine via nephrons',
    supported_interactions: ['click', 'examine'],
    model_filename: 'human_kidney.glb',
    available: true,
  },
  {
    id: 'human-stomach',
    name: 'Human Stomach',
    search_keyword: 'stomach',
    category: 'human-body',
    ngss_standards: ['HS-LS1-2'],
    description: 'Human stomach — muscular organ that digests food with gastric acid',
    supported_interactions: ['click', 'examine'],
    model_filename: 'human_stomach.glb',
    available: true,
  },
  {
    id: 'human-eye',
    name: 'Human Eye',
    search_keyword: 'eye',
    category: 'human-body',
    ngss_standards: ['HS-LS1-2'],
    description: 'Human eye — sensory organ with lens, retina, and optic nerve for vision',
    supported_interactions: ['click', 'examine'],
    model_filename: 'human_eye.glb',
    available: true,
  },

  // ═══ ECOLOGY ═══
  {
    id: 'coral-reef',
    name: 'Coral Reef',
    search_keyword: 'coral reef',
    category: 'ecology',
    ngss_standards: ['HS-LS2-1', 'HS-LS2-2', 'HS-LS2-4'],
    description: 'Coral reef ecosystem — marine habitat built by coral polyps',
    supported_interactions: ['click', 'examine'],
    model_filename: 'coral_reef.glb',
    available: true,
  },
  {
    id: 'clownfish',
    name: 'Clownfish',
    search_keyword: 'clownfish',
    category: 'ecology',
    ngss_standards: ['HS-LS2-1', 'HS-LS2-2'],
    description: 'Clownfish — symbiotic marine fish that lives among sea anemones',
    supported_interactions: ['click', 'drag', 'examine'],
    model_filename: 'clownfish.glb',
    available: true,
  },
  {
    id: 'shark',
    name: 'Shark',
    search_keyword: 'shark',
    category: 'ecology',
    ngss_standards: ['HS-LS2-1', 'HS-LS2-2'],
    description: 'Shark — apex marine predator at the top of ocean food chains',
    supported_interactions: ['click', 'examine'],
    model_filename: 'shark.glb',
    available: true,
  },
  {
    id: 'sea-turtle',
    name: 'Sea Turtle',
    search_keyword: 'sea turtle',
    category: 'ecology',
    ngss_standards: ['HS-LS2-1', 'HS-LS2-2'],
    description: 'Sea turtle — marine reptile and consumer in ocean ecosystems',
    supported_interactions: ['click', 'examine'],
    model_filename: 'sea_turtle.glb',
    available: true,
  },
  {
    id: 'seaweed',
    name: 'Seaweed',
    search_keyword: 'seaweed',
    category: 'ecology',
    ngss_standards: ['HS-LS2-1', 'HS-LS2-4'],
    description: 'Seaweed — marine algae and primary producer via photosynthesis',
    supported_interactions: ['click', 'drag', 'examine'],
    model_filename: 'seaweed.glb',
    available: true,
  },
  {
    id: 'frog',
    name: 'Frog',
    search_keyword: 'frog',
    category: 'ecology',
    ngss_standards: ['HS-LS2-1', 'HS-LS2-2'],
    description: 'Frog — amphibian that undergoes metamorphosis, consumer in pond ecosystems',
    supported_interactions: ['click', 'drag', 'examine'],
    model_filename: 'frog.glb',
    available: true,
  },
  {
    id: 'butterfly',
    name: 'Butterfly',
    search_keyword: 'butterfly',
    category: 'ecology',
    ngss_standards: ['HS-LS2-1', 'HS-LS2-2'],
    description: 'Butterfly — insect pollinator that undergoes complete metamorphosis',
    supported_interactions: ['click', 'examine'],
    model_filename: 'butterfly.glb',
    available: true,
  },
  {
    id: 'oak-tree',
    name: 'Oak Tree',
    search_keyword: 'oak tree',
    category: 'ecology',
    ngss_standards: ['HS-LS2-1', 'HS-LS2-4'],
    description: 'Oak tree — large producer in forest ecosystems via photosynthesis',
    supported_interactions: ['click', 'examine'],
    model_filename: 'oak_tree.glb',
    available: true,
  },
  {
    id: 'mushroom',
    name: 'Mushroom',
    search_keyword: 'mushroom',
    category: 'ecology',
    ngss_standards: ['HS-LS2-1', 'HS-LS2-4'],
    description: 'Mushroom — fungal decomposer that breaks down organic matter in ecosystems',
    supported_interactions: ['click', 'drag', 'examine'],
    model_filename: 'mushroom.glb',
    available: true,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns only models that are available in storage. */
export function getAvailableAssets(): AssetRegistryEntry[] {
  return ASSET_REGISTRY.filter((a) => a.available);
}

/** Returns assets filtered by category. */
export function getAssetsByCategory(
  category: AssetRegistryEntry['category'],
): AssetRegistryEntry[] {
  return ASSET_REGISTRY.filter((a) => a.category === category);
}

/**
 * Look up a registry entry by its search keyword (case-insensitive).
 */
export function lookupByKeyword(keyword: string): AssetRegistryEntry | null {
  const lower = keyword.toLowerCase();
  return (
    ASSET_REGISTRY.find(
      (a) => a.available && a.search_keyword.toLowerCase() === lower,
    ) ?? null
  );
}

/**
 * Get the full Supabase storage URL for an asset.
 */
export function getModelUrl(entry: AssetRegistryEntry): string {
  return `${SUPABASE_STORAGE_BASE}/${entry.model_filename}`;
}

/**
 * Builds the asset table for the AI assembler system prompt.
 * Only includes available=true entries.
 */
export function buildAssetTableForPrompt(): string {
  const available = getAvailableAssets();
  const rows = available.map((a) => `- ${a.id} (${a.name}) [${a.category}]`);
  return rows.join('\n');
}
