import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { validateGameConfig } from '@/lib/game-config-loader';
import { buildAssetTableForPrompt, getAvailableAssets, type AssetRegistryEntry } from '@/lib/asset-registry';
import { searchNGSSAssetsServer } from '@/lib/ngssAssetsServer';
import {
  nameToColor,
  validateSchemaLayer,
  fixAssetReferences,
  fixGameplayConsistency,
} from '@/lib/config-validators';
import type { GameConfig } from '@/types/game-config';

export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `
You are an expert VR biology game designer and curriculum specialist.
Your task: output a single valid GameConfig JSON object for a 3D VR biology game.

════════════════════════════════════════
ASSET FREEDOM
════════════════════════════════════════
You may use ANY biology-related asset name that fits your lesson.
Use names that clearly describe the biological object (e.g. 'coral-polyp',
'green-algae', 'clownfish', 'chloroplast', 'red-blood-cell').

STRONGLY PREFER using assets from our library below — they render as real 3D models.
Non-library assets render as labeled colored sphere placeholders, which is less engaging.

CRITICAL RULES:
- Each asset id MUST describe what the asset actually IS. Use a descriptive kebab-case id.
  oxygen → id: "oxygen", name: "Oxygen Molecule"
  plankton → id: "plankton", name: "Plankton"
  adenine → id: "adenine", name: "Adenine"
  coral-polyp → id: "coral-polyp", name: "Coral Polyp"
- Do NOT reuse the same id for different items. Every asset must have a unique, descriptive id.
- Do NOT use a library model id (like "glucose-molecule") to represent a different object.
  The system will show a colored sphere placeholder for non-library items — this is OK and preferred over a wrong model.
- For drag-multi phases with total=N, you MUST create exactly N separate draggable assets
  in the assets array, each with unique ids (e.g. plankton-1, plankton-2, plankton-3),
  each with role: "draggable" and quest_phase_id matching the phase id.
  Do NOT rely on the system to auto-create missing items.
- If you need multiple copies of the same kind, use numbered suffixes: "oxygen-1", "oxygen-2", "oxygen-3".
- model_source: always set to "library". The system will automatically convert non-library assets to placeholders.

AVAILABLE LIBRARY MODELS (these render as real 3D models):
${buildAssetTableForPrompt()}

Any other asset id is allowed but will render as a labeled colored sphere placeholder.

════════════════════════════════════════
AVAILABLE PHASE TYPES
════════════════════════════════════════
intro        → required first phase. No interaction. Shows welcome text.
               The intro instruction MUST tell a story in 2-3 sentences:
               - Give the player a ROLE (scientist, explorer, nano-bot, etc.)
               - Set the SCENE (where they are, what happened)
               - Explain their MISSION (what they must do and why it matters)
               Examples:
               "You've been miniaturized and injected into a coral reef ecosystem. The reef is dying — producers are vanishing and energy flow has stopped. Your mission: identify the key organisms, restore the food web, and save the reef before it's too late."
               "A mysterious genetic mutation is spreading through the population. You're a geneticist sent to investigate. Decode the DNA, trace the inheritance pattern, and find the cure."
               NEVER use generic text like "Click Continue to begin" or "Welcome to this experience".
click        → player clicks a 3D object. Requires: target_asset (asset id)
drag         → player drags item onto target. Requires: drag_item, drag_target.
               Optional: time_bonus { threshold_seconds, bonus_points }
drag-multi   → player collects N identical items → one target.
               Requires: drag_item (representative id), drag_target, total (number 2–5)
               RULE: declare total separate assets each with quest_phase_id = this phase id
drag-chain   → DEPRECATED. Do NOT use this type. Use drag or drag-multi instead.
quiz         → multiple-choice question overlay (no 3D interaction).
               Requires: question (string), options (array of 4 objects), explanation (string)
               Each option: { "id": "a"|"b"|"c"|"d", "text": string, "is_correct": boolean }
               Exactly one option must have is_correct: true.
               Use after click/drag phases to check conceptual understanding.
explore      → player walks to a target location in the scene.
               Requires: target_position ([x,y,z]), trigger_radius (number, default 2.5)
               Optional: target_asset (asset id to highlight as destination)
               Use to guide players between scene areas or to landmark organelles.
complete     → required last phase. Shows score + celebration.

════════════════════════════════════════
NGSS / AP / IB STANDARD TAGS
════════════════════════════════════════
Cell Biology:  HS-LS1-1, HS-LS1-2, HS-LS1-3, HS-LS1-5, HS-LS1-6, HS-LS1-7
               AP Bio: Unit 2 (Cell Structure), Unit 3 (Cell Energetics)
               IB HL: B1.1, B2.2.4, B2.2.5, C1.2, C1.3
Genetics:      HS-LS3-1, HS-LS3-2, HS-LS3-3
               AP Bio: Unit 5 (Heredity), Unit 6 (Gene Expression)
               IB HL: D1.1, D2.1, D3.1
Ecology:       HS-LS2-1 through HS-LS2-8
               AP Bio: Unit 8 (Ecology)
               IB HL: C4.1, C4.2
Evolution:     HS-LS4-1 through HS-LS4-6
               AP Bio: Unit 7 (Natural Selection)
               IB HL: D4.1, D4.2
Middle School: MS-LS1-1, MS-LS1-2, MS-LS1-3, MS-LS1-5, MS-LS1-6, MS-LS1-7

════════════════════════════════════════
PEDAGOGY RULES (MUST FOLLOW)
════════════════════════════════════════
1. ACTION-CONCEPT BINDING: Every interactive phase teaches exactly one concept.
   click      → identification & recognition
   drag       → function / cause-effect relationship
   drag-multi → bulk/repeated processes (autophagy, phagocytosis, ion channels)
   quiz       → conceptual check / misconception correction (insert after a click or drag)
   explore    → spatial orientation / navigation to a key structure

2. MANDATORY PHASE STRUCTURE — generate EXACTLY this structure (9 phases total):
   Phase 1: intro      — Narrative story (2-3 sentences: role + scene + mission)
   Phase 2: click      — Identify a key structure (100 pts)
   Phase 3: drag       — Deliver a molecule/substance to a target (150 pts)
   Phase 4: quiz       — 4-option multiple choice about the topic (75 pts)
   Phase 5: drag-multi — Collect 3 items and deliver them, total: 3 (150 pts)
   Phase 6: explore    — Walk to a location to observe a process (50 pts)
   Phase 7: click      — Identify another important structure (100 pts)
   Phase 8: quiz       — Another knowledge check question (75 pts)
   Phase 9: complete   — Celebration with summary

   That is 7 interactive phases + intro + complete = 9 phases total.
   You MUST include at least 2 quiz phases and at least 1 explore phase.
   Do NOT use drag-chain type. It is deprecated and confuses players.
   Use drag (single item) or drag-multi (multiple items) instead.
   Do NOT generate fewer than 7 interactive phases. Short games are rejected.

3. KNOWLEDGE CARDS (REQUIRED for every interactive phase):
   knowledge_cards must have one entry keyed by phase.id for each
   click / drag / drag-multi / quiz / explore phase.
   Each card must include: title, body (with unicode formulas if relevant), tag.
   Include misconception where a common student error exists.

4. SCORING:
   click phases:      50–150 pts
   drag phases:       100–200 pts + optional time_bonus (10–30s, 25–75pts)
   drag-multi phases: 100–200 pts (for completing all items, not per item)
   quiz phases:       50–100 pts (awarded on first correct answer)
   explore phases:    25–75 pts (awarded on reaching target)
   Set scoring.max_possible = sum of all phase points + all possible bonuses.
   Set scoring.passing_threshold = 60% of max_possible.

5. ASSET DECLARATIONS:
   Every asset id referenced in phases (target_asset, drag_item, drag_target,
   step.drag_item, step.drag_target) MUST appear in the assets array.
   ROLE RULES (critical for gameplay):
   - click phase target_asset → asset role MUST be "target" or "interactive"
   - drag/drag-multi drag_item → asset role MUST be "draggable"
   - drag/drag-multi drag_target → asset role MUST be "target"
   Getting roles wrong breaks click/collect interactions.

6. POSITIONS (Vec3 = [x, y, z]):
   Scene space: camera starts at z=+2 facing -z. Assets at z=-2 to z=-5 are comfortably visible.
   Spread x from -4 to +4. Keep y near 0 (floor level) for organelles, y=1–2 for floating items.
   Avoid placing two assets within 1 unit of each other.

════════════════════════════════════════
OUTPUT JSON SCHEMA (exact shape required)
════════════════════════════════════════
{
  "meta": {
    "id": "kebab-case-id",
    "title": "Human-readable title",
    "subject": "Biology",
    "grade": "elementary" | "middle" | "high" | "college",
    "duration_minutes": number,
    "ngss_standards": ["HS-LS1-2"],
    "learning_objectives": ["Students will..."]
  },
  "environment": {
    "skybox_prompt": "detailed scene prompt for AI skybox generator",
    "preset": "forest" | "starry" | "japan" | "default" | "dream",
    "lighting": "warm" | "cool" | "neutral" | "dramatic" | "bioluminescent"
  },
  "assets": [
    {
      "id": "kebab-case-asset-id",
      "name": "Display Name",
      "model_source": "library",
      "search_keyword": "...",              // MUST match a search_keyword from the AVAILABLE ASSETS table
      "position": [x, y, z],
      "rotation": [rx, ry, rz],             // optional
      "scale": 1.0,                         // optional
      "role": "target" | "draggable" | "interactive" | "decorative",
      "function": "energy" | "digestion" | "transport" | "packaging" | "fuel" | "structural" | "signaling" | "decorative",
      "description": "One sentence.",
      "quest_phase_id": "phase-id",         // required for draggables and key targets
      "snap_distance": 2.0                  // optional, default 2.0
    }
  ],
  "phases": [
    { "id": "intro", "type": "intro", "title": "...", "instruction": "..." },
    { "id": "...", "type": "click", "title": "...", "instruction": "...", "target_asset": "asset-id", "points": 100 },
    { "id": "...", "type": "drag", "title": "...", "instruction": "...", "drag_item": "asset-id", "drag_target": "asset-id", "points": 150,
      "time_bonus": { "threshold_seconds": 10, "bonus_points": 50 } },
    { "id": "...", "type": "drag-multi", "title": "...", "instruction": "... (0/N)", "drag_item": "first-item-id", "drag_target": "target-id", "total": 3, "points": 150 },
    { "id": "...", "type": "quiz", "title": "Quick Check", "instruction": "...", "question": "...",
      "options": [
        { "id": "a", "text": "...", "is_correct": false },
        { "id": "b", "text": "...", "is_correct": true },
        { "id": "c", "text": "...", "is_correct": false },
        { "id": "d", "text": "...", "is_correct": false }
      ], "explanation": "...", "points": 75 },
    { "id": "...", "type": "explore", "title": "...", "instruction": "Walk to the ...",
      "target_position": [x, y, z], "trigger_radius": 2.5, "target_asset": "asset-id", "points": 50 },
    { "id": "complete", "type": "complete", "title": "Mission Complete!", "instruction": "Summary sentence." }
  ],
  "knowledge_cards": {
    "phase-id": {
      "title": "Concept Name",
      "body": "2–3 sentence explanation with formulas where relevant (e.g. C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 36ATP).",
      "tag": "AP Bio / IB / NGSS reference",
      "misconception": "Common student error (optional)"
    }
  },
  "npc": {
    "name": "Dr. [Name]",
    "persona": "System prompt defining scientist personality and knowledge scope.",
    "spawn_position": [x, y, z],
    "hints": {
      "phase-id": "Helpful hint for this phase."
    }
  },
  "scoring": { "max_possible": number, "passing_threshold": number },
  "hud": {
    "show_score": true,
    "show_phase_counter": true,
    "show_instruction": true,
    "show_timer": true,
    "show_knowledge_cards": true,
    "show_tasks": true
  },
  "teacher_guide": {
    "learning_objectives": ["Students will be able to... (3-5 specific, measurable objectives using Bloom's taxonomy verbs)"],
    "essential_questions": ["Driving question that frames the inquiry? (2-3 questions)"],
    "vocabulary": [
      { "term": "Key Term", "definition": "Clear, student-friendly definition" }
    ],
    "ngss_standards": [
      { "code": "HS-LS1-1", "description": "Full standard description" }
    ],
    "pedagogical_notes": "1 paragraph explaining the teaching approach, learning theories used (constructivism, inquiry-based, etc.), and how the VR interactions support understanding.",
    "assessment_suggestions": [
      "Exit ticket or follow-up activity description (3 items)"
    ],
    "prerequisite_knowledge": [
      "Prior concept students should know (2-3 items)"
    ],
    "cross_curricular_connections": [
      "Chemistry: relevant connection",
      "Math: relevant connection"
    ]
  }
}

════════════════════════════════════════
ENVIRONMENT PRESET GUIDE
════════════════════════════════════════
Always include BOTH skybox_prompt AND preset. The preset renders immediately
as a fallback; skybox_prompt is used to generate a photorealistic skybox later.

environment.preset MUST be one of these 5 clean presets:
  forest, starry, japan, default, dream

Choose preset based on the lesson topic:
  Cell biology / biochemistry   → "default" (clean green field)
  Genetics / DNA                → "starry"  (night sky, mysterious)
  Ecology / plants / ecosystems → "forest"  (dense forest)
  Photosynthesis / plants       → "japan"   (cherry blossoms, calm)
  Ocean / marine / human body   → "dream"   (soft ethereal landscape)
  General biology               → "default" (green field)
  Middle school                 → "japan"   (calm, approachable aesthetic)

════════════════════════════════════════
ASSET PLACEMENT RULES
════════════════════════════════════════
- ALL assets must have Y position between 0.5 and 1.0 (sitting on ground, never underground)
- Target assets (delivery points) should be clustered near the center:
  X between -5 and 5, Z between -3 and -25
- Collectible assets should be scattered further out:
  X between -15 and 15, Z between -5 and -35
- Keep at least 8 units distance between any two assets
- Scatter assets in BOTH X and Z directions, not in a straight line
- NPC spawn at [1, 1.5, -1] near player start

Use these example positions as templates:
  Targets: [2,0.8,-3], [-3,0.8,-8], [5,0.8,-15], [-2,0.8,-22]
  Collectibles: [-8,0.8,-6], [12,0.5,-12], [-10,0.5,-18], [8,0.5,-25], [-7,0.8,-28]

NEVER place any asset with Y < 0 (underground) or Y > 3 (floating too high).

════════════════════════════════════════
STRICT OUTPUT RULES
════════════════════════════════════════
- Output ONLY the JSON object. No markdown, no explanation, no code fences.
- Every phase id and asset id in phases must also appear in the assets array.
- knowledge_cards must have one entry for every click/drag/drag-multi/quiz/explore phase.
- The phases array must start with an "intro" type and end with a "complete" type.
- Asset positions must not overlap (min 8 units apart).
- Use kebab-case for all id fields.
- environment.preset is REQUIRED — choose from the preset guide above.
- The "npc" field is optional but encouraged.
- model_source MUST be "library" for every asset. "meshy" is NOT allowed.
- teacher_guide is REQUIRED. It must contain: learning_objectives (3-5 items), essential_questions (2-3), vocabulary (5-8 terms with definitions), ngss_standards (2-3 with code + description), pedagogical_notes (1 paragraph), assessment_suggestions (3 items), prerequisite_knowledge (2-3), cross_curricular_connections (2-3).
`.trim();
}

// ─── Asset matching (fuzzy) ───────────────────────────────────────────────────

const AVAILABLE_ASSETS = getAvailableAssets();
const AVAILABLE_ASSET_IDS = new Set(AVAILABLE_ASSETS.map((a) => a.id));

function normalize(s: string): string {
  return s.toLowerCase().replace(/[-_]/g, ' ').replace(/s$/, '');
}

// Exact-string alias map for short/ambiguous names GPT commonly uses.
// Only matches when the ENTIRE normalized id or name equals the alias key.
// No molecule fallbacks — a placeholder sphere is better than a wrong model.
const ALIAS_MAP: Record<string, string> = {
  'protein': 'polypeptide-chain',
  'amino acid': 'polypeptide-chain',
  'enzyme': 'enzyme-inhibition',
  'cell membrane': 'animal-cell',
  'nucleus': 'animal-cell',
  'nerve': 'neuron',
  'bone': 'human-skeleton',
  'lung': 'human-lungs',
  'kidney': 'human-kidney',
  'brain': 'human-brain',
  'stomach': 'human-stomach',
  'eye': 'human-eye',
  'tree': 'oak-tree',
  'algae': 'seaweed',
  'kelp': 'seaweed',
  'fungus': 'mushroom',
  'fungi': 'mushroom',
  'coral': 'coral-reef',
  'turtle': 'sea-turtle',
};

// Words too generic to count as a meaningful keyword match on their own.
const GENERIC_TOKENS = new Set([
  'molecule', 'cell', 'organ', 'model', 'structure', 'system',
  'body', 'part', 'type', 'human', 'small', 'large', 'the',
]);

function tokenize(s: string): string[] {
  return normalize(s).split(/\s+/).filter((t) => t.length >= 3);
}

function fuzzyMatchRegistry(assetId: string, assetName: string): AssetRegistryEntry | null {
  const normId = normalize(assetId);
  const normName = normalize(assetName || '');

  // 1. Exact id match
  const exact = AVAILABLE_ASSETS.find((e) => e.id === assetId);
  if (exact) {
    console.log(`[REGISTRY-MATCH] "${assetId}" → exact id → "${exact.id}"`);
    return exact;
  }

  // 2. Exact normalized id match (catches underscores vs hyphens, trailing-s, etc.)
  for (const entry of AVAILABLE_ASSETS) {
    if (normalize(entry.id) === normId) {
      console.log(`[REGISTRY-MATCH] "${assetId}" → normalized id "${normId}" → "${entry.id}"`);
      return entry;
    }
  }

  // 3. Token-based matching — strict: require ≥2 non-generic token overlaps,
  //    OR 1 specific non-generic token that is ≥4 chars (catches "frog", "shark", "heart", etc.)
  const queryTokens = new Set([
    ...tokenize(assetId),
    ...tokenize(assetName || ''),
  ]);
  const queryArr = Array.from(queryTokens);

  let bestMatch: AssetRegistryEntry | null = null;
  let bestScore = 0;
  const debugCandidates: string[] = [];

  for (const entry of AVAILABLE_ASSETS) {
    const entryTokens = new Set([
      ...tokenize(entry.id),
      ...tokenize(entry.name),
      ...(entry.search_keyword ? tokenize(entry.search_keyword) : []),
    ]);

    let matchCount = 0;
    let nonGenericCount = 0;
    const matched: string[] = [];
    for (const token of queryArr) {
      if (entryTokens.has(token)) {
        matchCount++;
        matched.push(token);
        if (!GENERIC_TOKENS.has(token)) nonGenericCount++;
      }
    }

    // Accept if: ≥2 total matches with ≥1 non-generic,
    // OR exactly 1 non-generic match where the token is specific enough (≥4 chars)
    const hasSpecificSingle =
      nonGenericCount === 1 &&
      matchCount === 1 &&
      queryArr.some(
        (t) => entryTokens.has(t) && !GENERIC_TOKENS.has(t) && t.length >= 4,
      );

    const isValid =
      (matchCount >= 2 && nonGenericCount >= 1) || hasSpecificSingle;

    if (matchCount > 0) {
      debugCandidates.push(
        `${entry.id}(tokens:[${Array.from(entryTokens)}] matched:[${matched}] total:${matchCount} nonGen:${nonGenericCount} valid:${isValid})`,
      );
    }

    if (isValid && matchCount > bestScore) {
      bestScore = matchCount;
      bestMatch = entry;
    }
  }

  if (bestMatch) {
    console.log(
      `[REGISTRY-MATCH] "${assetId}" (name:"${assetName}") queryTokens:[${queryArr}] → token match → "${bestMatch.id}" (score:${bestScore}) | candidates: ${debugCandidates.join(', ')}`,
    );
    return bestMatch;
  }

  // 4. Alias map — exact normalized string match only (no substring)
  for (const [alias, targetId] of Object.entries(ALIAS_MAP)) {
    const normAlias = normalize(alias);
    if (normId === normAlias || normName === normAlias) {
      const entry = AVAILABLE_ASSETS.find((e) => e.id === targetId);
      if (entry) {
        console.log(`[REGISTRY-MATCH] "${assetId}" → alias "${alias}" → "${targetId}"`);
        return entry;
      }
    }
  }

  // No match — log full debug info
  console.log(
    `[REGISTRY-MISS] "${assetId}" (name:"${assetName}") normId:"${normId}" queryTokens:[${queryArr}] | partial candidates: ${debugCandidates.length > 0 ? debugCandidates.join(', ') : 'none'}`,
  );
  return null;
}

// ─── Returns all asset ids referenced by a phase ──────────────────────────────

// ─── Post-generation registry validation ──────────────────────────────────────

function enforceRegistryAssets(cfg: any): { config: any; placeholderAssets: string[] } {
  const placeholderAssets: string[] = [];
  const usedIds = new Set<string>();

  function getUniqueId(baseId: string): string {
    if (!usedIds.has(baseId)) {
      usedIds.add(baseId);
      return baseId;
    }
    let counter = 2;
    while (usedIds.has(`${baseId}-${counter}`)) counter++;
    const uniqueId = `${baseId}-${counter}`;
    usedIds.add(uniqueId);
    return uniqueId;
  }

  // Keep ALL assets. Match against registry with fuzzy logic; unmatched become placeholders.
  const originalAssets: any[] = cfg.assets ?? [];
  const patchedAssets = originalAssets.map((asset: any) => {
    // Exact id in registry — write model_path from registry
    if (asset.model_source === 'library' && AVAILABLE_ASSET_IDS.has(asset.id)) {
      const entry = AVAILABLE_ASSETS.find((e) => e.id === asset.id)!;
      const uniqueId = getUniqueId(asset.id);
      console.log(`[REGISTRY] "${asset.id}" (name: "${asset.name}") → exact match "${uniqueId}" → ${entry.model_filename}`);
      return { ...asset, id: uniqueId, model_path: entry.model_filename };
    }

    // Fuzzy match — write model_path directly so client doesn't need to re-lookup
    const match = fuzzyMatchRegistry(asset.id, asset.name || '');
    if (match) {
      const uniqueId = getUniqueId(match.id);
      console.log(`[REGISTRY] "${asset.id}" (name: "${asset.name}") → fuzzy matched "${match.id}"${uniqueId !== match.id ? ` (deduped → "${uniqueId}")` : ''} → ${match.model_filename}`);
      return {
        ...asset,
        id: uniqueId,
        model_source: 'library',
        search_keyword: match.search_keyword,
        model_path: match.model_filename,
      };
    }

    // No match — placeholder
    const uniqueId = getUniqueId(asset.id);
    console.log(`[REGISTRY] "${asset.id}" (name: "${asset.name}") → NO MATCH → placeholder "${uniqueId}"`);
    placeholderAssets.push(uniqueId);
    return {
      ...asset,
      id: uniqueId,
      model_source: 'placeholder',
      model_path: null,
      primitive_color: nameToColor(asset.name || asset.id),
      primitive_shape: 'sphere',
    };
  });

  console.log(`[assemble-game] Assets: ${originalAssets.length} total, ${originalAssets.length - placeholderAssets.length} library models, ${placeholderAssets.length} placeholders`);

  // Build id remap for assets whose id changed (old id → new id)
  const idRemap = new Map<string, string>();
  for (let i = 0; i < originalAssets.length; i++) {
    const oldId = originalAssets[i].id;
    const newId = patchedAssets[i].id;
    if (oldId !== newId) {
      idRemap.set(oldId, newId);
      console.log(`[REGISTRY] Remap phase refs: "${oldId}" → "${newId}"`);
    }
  }

  // Update phase references to remapped asset ids
  const originalPhases: any[] = cfg.phases ?? [];
  if (idRemap.size > 0) {
    for (const phase of originalPhases) {
      if (phase.target_asset && idRemap.has(phase.target_asset)) phase.target_asset = idRemap.get(phase.target_asset);
      if (phase.drag_item && idRemap.has(phase.drag_item)) phase.drag_item = idRemap.get(phase.drag_item);
      if (phase.drag_target && idRemap.has(phase.drag_target)) phase.drag_target = idRemap.get(phase.drag_target);
    }
  }

  // Recalculate scoring
  const interactiveTypes = new Set(['click', 'drag', 'drag-multi', 'drag-chain', 'quiz', 'explore']);
  let maxPossible = 0;
  for (const phase of originalPhases) {
    if (!interactiveTypes.has(phase.type)) continue;
    const pts = phase.points ?? 0;
    maxPossible += pts;
    if (phase.time_bonus?.bonus_points) maxPossible += phase.time_bonus.bonus_points;
  }

  return {
    config: {
      ...cfg,
      assets: patchedAssets,
      phases: originalPhases,
      scoring: {
        max_possible: maxPossible,
        passing_threshold: Math.round(maxPossible * 0.6),
      },
    },
    placeholderAssets,
  };
}


// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  let prompt: string;
  let gradeLevel: string | undefined;

  try {
    const body = await req.json();
    prompt = body.prompt;
    gradeLevel = body.gradeLevel;
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
      return NextResponse.json(
        { error: 'prompt is required (min 5 chars)' },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const userMessage = gradeLevel
    ? `Grade level: ${gradeLevel}\n\n${prompt.trim()}`
    : prompt.trim();

  let rawContent: string;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 8192,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: userMessage },
      ],
    });
    rawContent = completion.choices[0]?.message?.content ?? '';
  } catch (err: any) {
    console.error('[assemble-game] OpenAI error:', err.message);
    return NextResponse.json(
      { error: 'AI generation failed', details: err.message },
      { status: 502 }
    );
  }

  // ── Parse JSON ──
  console.log(`[ASSEMBLE] GPT response length: ${rawContent.length}`);
  console.log(`[ASSEMBLE] GPT response ends with: ${rawContent.slice(-100)}`);

  let parsed: any;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    // Try to recover truncated JSON by finding the last valid closing brace
    console.error(`[ASSEMBLE] JSON parse failed. First 500 chars:\n${rawContent.slice(0, 500)}`);
    console.error(`[ASSEMBLE] Last 200 chars:\n${rawContent.slice(-200)}`);

    // Attempt truncation recovery: strip trailing incomplete content and close
    let recovered = false;
    const trimmed = rawContent.trimEnd();
    if (trimmed.length > 100 && !trimmed.endsWith('}')) {
      // Find the last complete property or array close
      const lastBrace = trimmed.lastIndexOf('}');
      if (lastBrace > trimmed.length * 0.5) {
        try {
          // Count open vs close braces up to lastBrace to find a valid cut point
          let candidate = trimmed.slice(0, lastBrace + 1);
          // Close any unclosed braces/brackets
          let openBraces = 0, openBrackets = 0;
          for (const ch of candidate) {
            if (ch === '{') openBraces++;
            if (ch === '}') openBraces--;
            if (ch === '[') openBrackets++;
            if (ch === ']') openBrackets--;
          }
          candidate += ']'.repeat(Math.max(0, openBrackets)) + '}'.repeat(Math.max(0, openBraces));
          parsed = JSON.parse(candidate);
          recovered = true;
          console.log(`[ASSEMBLE] Recovered truncated JSON (cut at ${lastBrace}, added ${Math.max(0, openBrackets)} ] and ${Math.max(0, openBraces)} })`);
        } catch {
          // Recovery failed
        }
      }
    }

    if (!recovered) {
      return NextResponse.json(
        { error: 'AI returned invalid JSON (possibly truncated)', raw: rawContent.slice(0, 500) },
        { status: 422 }
      );
    }
  }

  // ── 3-layer validation pipeline ──
  const { config: enforced, placeholderAssets } = enforceRegistryAssets(parsed);
  const layer1 = validateSchemaLayer(enforced);
  const layer2 = fixAssetReferences(layer1);
  const cleaned = fixGameplayConsistency(layer2);

  // ── Resolve library asset model_urls before validation ──
  if (Array.isArray(cleaned.assets)) {
    await Promise.all(
      cleaned.assets.map(async (asset: any) => {
        if (asset.model_source === 'library' && asset.search_keyword && !asset.model_path) {
          try {
            const result = await searchNGSSAssetsServer({
              keywords: [asset.search_keyword],
            });
            if (result.found && result.asset) {
              asset.model_path = result.asset.model_url;
              asset.supabase_id = result.asset.id;
            }
          } catch (e) {
            console.warn(
              `[assemble-game] library lookup failed for "${asset.search_keyword}":`,
              (e as Error).message
            );
          }
        }
      })
    );
  }

  // ── Validate against GameConfig shape ──
  try {
    validateGameConfig(cleaned);
  } catch (err: any) {
    console.error('[assemble-game] Validation failed:', err.message);
    return NextResponse.json(
      {
        error: 'Generated config failed validation',
        details: err.message,
        raw: cleaned,
      },
      { status: 422 }
    );
  }

  const config = cleaned as GameConfig;

  return NextResponse.json(
    {
      config,
      meta: {
        generated_at: new Date().toISOString(),
        prompt: prompt.trim(),
        grade_level: gradeLevel ?? null,
        model: 'gpt-4o',
        phase_count: config.phases.length,
        asset_count: config.assets.length,
        placeholder_assets: placeholderAssets,
      },
    },
    { status: 200 }
  );
}
