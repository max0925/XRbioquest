import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { validateGameConfig } from '@/lib/game-config-loader';
import { buildAssetTableForPrompt, getAvailableAssets } from '@/lib/asset-registry';
import { searchNGSSAssetsServer } from '@/lib/ngssAssetsServer';
import type { GameConfig } from '@/types/game-config';

export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `
You are an expert VR biology game designer and curriculum specialist.
Your task: output a single valid GameConfig JSON object for a 3D VR biology game.

════════════════════════════════════════
⚠️  CRITICAL ASSET RULES — READ FIRST
════════════════════════════════════════
1. You may ONLY use assets from the AVAILABLE ASSETS table below.
2. Do NOT invent or create assets that are not in this list.
3. model_source: "meshy" is DISABLED. Do not use it.
4. Every asset in your config MUST have model_source: "library" and MUST use
   an id and search_keyword EXACTLY as listed in the AVAILABLE ASSETS table.
5. If the requested topic cannot be taught with the available assets, adapt the
   lesson to use the closest relevant assets from the table.
   Example: an ecology topic → use glucose + mitochondria to teach cellular energy flow.

════════════════════════════════════════
AVAILABLE ASSETS
(ONLY these 14 models exist — no others)
════════════════════════════════════════
${buildAssetTableForPrompt()}

════════════════════════════════════════
AVAILABLE PHASE TYPES
════════════════════════════════════════
intro        → required first phase. No interaction. Shows welcome text.
click        → player clicks a 3D object. Requires: target_asset (asset id)
drag         → player drags item onto target. Requires: drag_item, drag_target.
               Optional: time_bonus { threshold_seconds, bonus_points }
drag-multi   → player collects N identical items → one target.
               Requires: drag_item (representative id), drag_target, total (number 2–5)
               RULE: declare total separate assets each with quest_phase_id = this phase id
drag-chain   → sequential drag pathway. Requires: steps[] where each step has { drag_item, drag_target }
               Use for metabolic pathways, protein secretion, signal cascades
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
   drag-chain → sequential pathway (secretory pathway, electron transport, signal transduction)
   quiz       → conceptual check / misconception correction (insert after a click or drag)
   explore    → spatial orientation / navigation to a key structure

2. PROGRESSIVE COMPLEXITY: phases must increase in cognitive load.
   Typical arc: intro → click → drag → drag-multi → drag-chain → complete
   Simpler games may omit drag-multi or drag-chain.

3. KNOWLEDGE CARDS (REQUIRED for every interactive phase):
   knowledge_cards must have one entry keyed by phase.id for each
   click / drag / drag-multi / drag-chain / quiz / explore phase.
   Each card must include: title, body (with unicode formulas if relevant), tag.
   Include misconception where a common student error exists.

4. SCORING:
   click phases:      50–150 pts
   drag phases:       100–200 pts + optional time_bonus (10–30s, 25–75pts)
   drag-multi phases: 100–200 pts (for completing all items, not per item)
   drag-chain phases: 100–200 pts (for completing entire chain)
   quiz phases:       50–100 pts (awarded on first correct answer)
   explore phases:    25–75 pts (awarded on reaching target)
   Set scoring.max_possible = sum of all phase points + all possible bonuses.
   Set scoring.passing_threshold = 60% of max_possible.

5. ASSET DECLARATIONS:
   Every asset id referenced in phases (target_asset, drag_item, drag_target,
   step.drag_item, step.drag_target) MUST appear in the assets array.
   Assets used as snap targets should have role: "target".
   Assets that are dragged should have role: "draggable".

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
    "preset": "tron" | "starry" | "forest" | "default" | "contact" | "egypt" | "checkerboard" | "goaland" | "yavapai" | "goldmine" | "threetowers" | "poison" | "arches" | "japan" | "dream" | "volcano" | "osiris",
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
    { "id": "...", "type": "drag-chain", "title": "...", "instruction": "...",
      "steps": [
        { "drag_item": "item-id", "drag_target": "target-id" },
        { "drag_item": "item-id", "drag_target": "target-id" }
      ], "points": 150 },
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
  }
}

════════════════════════════════════════
ENVIRONMENT PRESET GUIDE
════════════════════════════════════════
Always include BOTH skybox_prompt AND preset. The preset renders immediately
as a fallback; skybox_prompt is used to generate a photorealistic skybox later.

environment.preset MUST be one of these exact values:
  default, contact, egypt, checkerboard, forest, goaland, yavapai,
  goldmine, threetowers, poison, arches, tron, japan, dream, volcano, starry, osiris

Choose preset based on the lesson topic:
  Cell biology / biochemistry → "default" (green field with trees)
  Genetics / DNA              → "starry"  (night sky, mysterious)
  Ecology / plants / ecosystems → "forest" (dense forest)
  Human body / physiology     → "tron"    (sci-fi grid)
  Photosynthesis / plants     → "japan"   (cherry blossoms)
  Ocean / marine biology      → "osiris"  (blue tones)
  Evolution                   → "yavapai" (desert canyon)
  Chemistry / molecules       → "tron"    (neon grid, futuristic lab feel)
  General biology             → "default" (green field with trees)
  Middle school               → "japan"   (calm, approachable aesthetic)

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
- knowledge_cards must have one entry for every click/drag/drag-multi/drag-chain phase.
- The phases array must start with an "intro" type and end with a "complete" type.
- Asset positions must not overlap (min 8 units apart).
- Use kebab-case for all id fields.
- environment.preset is REQUIRED — choose from the preset guide above.
- The "npc" field is optional but encouraged.
- model_source MUST be "library" for every asset. "meshy" is NOT allowed.
`.trim();
}

// ─── Asset ids from the registry (available only) ─────────────────────────────

const AVAILABLE_ASSET_IDS = new Set(getAvailableAssets().map((a) => a.id));

// ─── Returns all asset ids referenced by a phase ──────────────────────────────

function getPhaseAssetRefs(phase: any): string[] {
  const refs: string[] = [];
  switch (phase.type) {
    case 'click':
      if (phase.target_asset) refs.push(phase.target_asset);
      break;
    case 'drag':
      if (phase.drag_item) refs.push(phase.drag_item);
      if (phase.drag_target) refs.push(phase.drag_target);
      break;
    case 'drag-multi':
      if (phase.drag_item) refs.push(phase.drag_item);
      if (phase.drag_target) refs.push(phase.drag_target);
      break;
    case 'drag-chain':
      if (Array.isArray(phase.steps)) {
        for (const step of phase.steps) {
          if (step.drag_item) refs.push(step.drag_item);
          if (step.drag_target) refs.push(step.drag_target);
        }
      }
      break;
    case 'explore':
      if (phase.target_asset) refs.push(phase.target_asset);
      break;
  }
  return refs;
}

// ─── Post-generation registry validation ──────────────────────────────────────

/**
 * Hash a string to a consistent hue (0–360) for deterministic placeholder colors.
 * Same asset name always gets the same color.
 */
function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

function enforceRegistryAssets(cfg: any): { config: any; placeholderAssets: string[] } {
  const placeholderAssets: string[] = [];

  // Keep ALL assets. Valid library assets stay as-is; others become placeholders.
  const originalAssets: any[] = cfg.assets ?? [];
  const patchedAssets = originalAssets.map((asset: any) => {
    const valid = asset.model_source === 'library' && AVAILABLE_ASSET_IDS.has(asset.id);
    if (valid) return asset;

    // Mark as placeholder — game stays fully playable with colored spheres
    console.log(`[assemble-game] Placeholder: "${asset.id}" ("${asset.name}") — not in model library`);
    placeholderAssets.push(asset.id);
    return {
      ...asset,
      model_source: 'placeholder',
      model_path: null,
      primitive_color: nameToColor(asset.name || asset.id),
      primitive_shape: 'sphere',
    };
  });

  console.log(`[assemble-game] Assets: ${originalAssets.length} total, ${originalAssets.length - placeholderAssets.length} library models, ${placeholderAssets.length} placeholders`);

  // All phases stay — placeholders keep asset ids intact
  const originalPhases: any[] = cfg.phases ?? [];

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
      max_tokens: 4096,
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
  let parsed: any;
  try {
    parsed = JSON.parse(rawContent);
  } catch (err: any) {
    console.error('[assemble-game] JSON parse failed. Raw:\n', rawContent.slice(0, 500));
    return NextResponse.json(
      { error: 'AI returned invalid JSON', raw: rawContent.slice(0, 500) },
      { status: 422 }
    );
  }

  // ── Enforce registry: keep all assets, mark non-library ones as placeholders ──
  const { config: cleaned, placeholderAssets } = enforceRegistryAssets(parsed);

  // ── Clamp asset Y positions to valid range (ground level) ──
  if (Array.isArray(cleaned.assets)) {
    for (const asset of cleaned.assets) {
      if (Array.isArray(asset.position) && asset.position.length >= 3) {
        const y = asset.position[1];
        if (y < 0) asset.position[1] = 0.8;
        else if (y < 0.3) asset.position[1] = 0.3;
        else if (y > 2.0) asset.position[1] = 2.0;
      }
    }
  }

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
