/**
 * Seed script: clears ngss_assets table and inserts clean data
 * matching the asset-registry.ts entries.
 *
 * Usage: node scripts/seed-ngss-assets.mjs
 */

const SUPABASE_URL = 'https://tqqimwpwjnaldwuibeqf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  // Try reading from .env.local
  const fs = await import('fs');
  const path = await import('path');
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/);
      if (match) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = match[1].trim();
        break;
      }
    }
  }
}

const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/assets`;

const ASSETS = [
  // ═══ CELLS & ORGANELLES ═══
  {
    name: 'Mitochondria',
    description: 'Powerhouse of the cell — produces ATP through cellular respiration',
    model_filename: 'mitochondria_-_cell_organelles.glb',
    category: 'Biology',
    subcategory: 'Cell Biology',
    standards: ['HS-LS1-7'],
    curriculum: ['NGSS'],
    keywords: ['mitochondria', 'organelle', 'ATP', 'energy', 'powerhouse', 'cellular respiration', 'cell'],
  },
  {
    name: 'Lysosome',
    description: 'Digestive system of the cell — breaks down waste with enzymes',
    model_filename: 'lysosome.glb',
    category: 'Biology',
    subcategory: 'Cell Biology',
    standards: ['HS-LS1-2'],
    curriculum: ['NGSS'],
    keywords: ['lysosome', 'organelle', 'digestion', 'waste', 'enzyme', 'autophagy', 'cell'],
  },
  {
    name: 'Endoplasmic Reticulum',
    description: 'Transport network — folds and processes proteins',
    model_filename: 'endoplasmic_reticulum.glb',
    category: 'Biology',
    subcategory: 'Cell Biology',
    standards: ['HS-LS1-1'],
    curriculum: ['NGSS'],
    keywords: ['endoplasmic reticulum', 'ER', 'organelle', 'protein', 'transport', 'folding', 'cell'],
  },
  {
    name: 'Golgi Apparatus',
    description: 'Packaging center — modifies, sorts, and ships proteins',
    model_filename: 'golgi_apparatuscomplex.glb',
    category: 'Biology',
    subcategory: 'Cell Biology',
    standards: ['HS-LS1-1'],
    curriculum: ['NGSS'],
    keywords: ['golgi', 'golgi apparatus', 'organelle', 'packaging', 'vesicle', 'secretory', 'cell'],
  },

  // ═══ GENETICS ═══
  {
    name: 'DNA Molecule',
    description: 'Double helix structure carrying genetic information',
    model_filename: 'deoxyribonucleic_acid_dna.glb',
    category: 'Biology',
    subcategory: 'Genetics',
    standards: ['HS-LS1-1', 'HS-LS3-1'],
    curriculum: ['NGSS'],
    keywords: ['DNA', 'double helix', 'genetics', 'gene', 'nucleotide', 'heredity'],
  },
  {
    name: 'DNA Base Pairing',
    description: 'Complementary base pairs — A-T and C-G hydrogen bonds',
    model_filename: 'dna_helix_with_base_pairing_3d.glb',
    category: 'Biology',
    subcategory: 'Genetics',
    standards: ['HS-LS1-1', 'HS-LS3-1'],
    curriculum: ['NGSS'],
    keywords: ['base pair', 'adenine', 'thymine', 'cytosine', 'guanine', 'DNA', 'complementary'],
  },
  {
    name: 'DNA Ribbon Structure',
    description: 'Ribbon visualization of DNA molecular structure',
    model_filename: 'b-dna_ribbon_backbone__sticks_bases.glb',
    category: 'Biology',
    subcategory: 'Genetics',
    standards: ['HS-LS3-1'],
    curriculum: ['NGSS'],
    keywords: ['DNA', 'ribbon', 'structure', 'genetics', 'double helix', 'backbone'],
  },
  {
    name: 'DNA Replication',
    description: 'DNA replication fork showing semiconservative replication',
    model_filename: 'dna_replication_model.glb',
    category: 'Biology',
    subcategory: 'Genetics',
    standards: ['HS-LS1-1', 'HS-LS3-1'],
    curriculum: ['NGSS'],
    keywords: ['DNA', 'replication', 'fork', 'semiconservative', 'helicase', 'polymerase'],
  },

  // ═══ MOLECULES ═══
  {
    name: 'Glucose Molecule',
    description: 'Simple sugar C6H12O6 — primary fuel for cellular respiration',
    model_filename: 'glucose_molecule.glb',
    category: 'Biology',
    subcategory: 'Molecules',
    standards: ['HS-LS1-7'],
    curriculum: ['NGSS'],
    keywords: ['glucose', 'sugar', 'molecule', 'energy', 'respiration', 'C6H12O6'],
  },
  {
    name: 'Polypeptide Chain',
    description: 'Polypeptide chain — amino acid sequence that folds into protein',
    model_filename: 'keratine_chains__vlakna_keratinu.glb',
    category: 'Biology',
    subcategory: 'Molecules',
    standards: ['HS-LS1-1'],
    curriculum: ['NGSS'],
    keywords: ['polypeptide', 'protein', 'amino acid', 'chain', 'folding', 'keratin'],
  },
  {
    name: 'Enzyme Inhibition',
    description: 'Enzyme-substrate interaction showing competitive inhibition',
    model_filename: 'ornithine_decarboxylase_inhibition_by_g418.glb',
    category: 'Biology',
    subcategory: 'Molecules',
    standards: ['HS-LS1-1'],
    curriculum: ['NGSS'],
    keywords: ['enzyme', 'inhibition', 'substrate', 'active site', 'competitive', 'protein'],
  },

  // ═══ HUMAN BODY ═══
  {
    name: 'Human Heart',
    description: 'Four-chambered heart — pumps blood through circulatory system',
    model_filename: 'realistic_human_heart.glb',
    category: 'Biology',
    subcategory: 'Human Body',
    standards: ['HS-LS1-2'],
    curriculum: ['NGSS'],
    keywords: ['heart', 'cardiovascular', 'blood', 'circulation', 'organ', 'pump'],
  },
  {
    name: 'Human Lungs',
    description: 'Lungs — gas exchange organ for oxygen and carbon dioxide',
    model_filename: 'realistic_human_lungs.glb',
    category: 'Biology',
    subcategory: 'Human Body',
    standards: ['HS-LS1-2'],
    curriculum: ['NGSS'],
    keywords: ['lungs', 'respiratory', 'breathing', 'oxygen', 'alveoli', 'gas exchange'],
  },
  {
    name: 'Human Skeleton',
    description: 'Full human skeletal system — 206 bones providing structure',
    model_filename: 'human_skeleton.glb',
    category: 'Biology',
    subcategory: 'Human Body',
    standards: ['HS-LS1-2'],
    curriculum: ['NGSS'],
    keywords: ['skeleton', 'bones', 'skeletal', 'anatomy', 'skull', 'spine'],
  },
  {
    name: 'Human Anatomy',
    description: 'Full human anatomical model showing major organ systems',
    model_filename: 'human_anatomy.glb',
    category: 'Biology',
    subcategory: 'Human Body',
    standards: ['HS-LS1-2'],
    curriculum: ['NGSS'],
    keywords: ['anatomy', 'human body', 'organs', 'body systems', 'torso'],
  },
];

async function supaFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
      ...options.headers,
    },
  });
  return res;
}

async function main() {
  console.log('[SEED] Starting ngss_assets rebuild...\n');

  // Step 1: Verify storage files exist
  console.log('[SEED] Checking storage files...');
  let allExist = true;
  for (const asset of ASSETS) {
    const url = `${STORAGE_BASE}/${asset.model_filename}`;
    const res = await fetch(url, { method: 'HEAD' });
    const ok = res.status === 200;
    console.log(`  ${ok ? '\u2713' : '\u2717 ' + res.status} ${asset.model_filename}`);
    if (!ok) allExist = false;
  }
  if (!allExist) {
    console.error('\n[SEED] Some files missing in storage! Aborting.');
    process.exit(1);
  }
  console.log(`\n[SEED] All ${ASSETS.length} files confirmed in storage.\n`);

  // Step 2: Delete all existing rows
  console.log('[SEED] Deleting all existing ngss_assets rows...');
  const delRes = await supaFetch('/rest/v1/ngss_assets?id=not.is.null', { method: 'DELETE' });
  if (!delRes.ok) {
    const err = await delRes.text();
    console.error('[SEED] Delete failed:', delRes.status, err);
    process.exit(1);
  }
  console.log('[SEED] Deleted OK.\n');

  // Step 3: Insert new rows
  console.log('[SEED] Inserting', ASSETS.length, 'assets...');
  const rows = ASSETS.map((a) => ({
    name: a.name,
    description: a.description,
    model_url: `${STORAGE_BASE}/${a.model_filename}`,
    thumbnail_url: null,
    category: a.category,
    subcategory: a.subcategory,
    standards: a.standards,
    curriculum: a.curriculum,
    keywords: a.keywords,
    has_animation: false,
  }));

  const insertRes = await supaFetch('/rest/v1/ngss_assets', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(rows),
  });

  if (!insertRes.ok) {
    const err = await insertRes.text();
    console.error('[SEED] Insert failed:', insertRes.status, err);
    process.exit(1);
  }

  const inserted = await insertRes.json();
  console.log(`[SEED] Inserted ${inserted.length} rows.\n`);

  // Step 4: Verify
  console.log('[SEED] Verification:');
  for (const row of inserted) {
    console.log(`  ${row.id} | ${row.name} | ${row.subcategory}`);
  }

  console.log('\n[SEED] Done! ngss_assets table rebuilt successfully.');
}

main().catch((err) => {
  console.error('[SEED] Fatal error:', err);
  process.exit(1);
});
