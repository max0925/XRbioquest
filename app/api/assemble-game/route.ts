import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { validateGameConfig } from '@/lib/game-config-loader';
import type { GameConfig } from '@/types/game-config';

export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Available Supabase assets ────────────────────────────────────────────────
// These are real GLB files in storage. GPT-4o may pick any subset.
const SUPABASE_ASSETS = `
id                       | model_path                                    | description
-------------------------|-----------------------------------------------|-------------------------------------
mitochondria             | mitochondria_-_cell_organelles.glb            | Double-membraned powerhouse; produces ATP
lysosome                 | lysosome.glb                                  | Digestive vesicle; breaks down waste at pH 4.5
endoplasmic-reticulum    | endoplasmic_reticulum.glb                     | Protein folding & transport network
golgi-apparatus          | golgi_apparatuscomplex.glb                    | Packaging/sorting station; modifies proteins
glucose                  | glucose_molecule.glb                          | C₆H₁₂O₆ fuel molecule for cellular respiration
`.trim();

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are an expert VR biology game designer and curriculum specialist.
Your task: output a single valid GameConfig JSON object for a 3D VR biology game.

════════════════════════════════════════
AVAILABLE SUPABASE ASSETS
(model_source: "supabase")
════════════════════════════════════════
${SUPABASE_ASSETS}

For any asset NOT in the table above, use:
  model_source: "meshy"   + generate_prompt: "<vivid 3D model description>"
  model_source: "library" + search_keyword: "<keyword>"  (for generic lab/biology items)

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
   click    → identification & recognition
   drag     → function / cause-effect relationship
   drag-multi → bulk/repeated processes (autophagy, phagocytosis, ion channels)
   drag-chain → sequential pathway (secretory pathway, electron transport, signal transduction)

2. PROGRESSIVE COMPLEXITY: phases must increase in cognitive load.
   Typical arc: intro → click → drag → drag-multi → drag-chain → complete
   Simpler games may omit drag-multi or drag-chain.

3. KNOWLEDGE CARDS (REQUIRED for every interactive phase):
   knowledge_cards must have one entry keyed by phase.id for each
   click / drag / drag-multi / drag-chain phase.
   Each card must include: title, body (with unicode formulas if relevant), tag.
   Include misconception where a common student error exists.

4. SCORING:
   click phases:      50–150 pts
   drag phases:       100–200 pts + optional time_bonus (10–30s, 25–75pts)
   drag-multi phases: 100–200 pts (for completing all items, not per item)
   drag-chain phases: 100–200 pts (for completing entire chain)
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
    "lighting": "warm" | "cool" | "neutral" | "dramatic" | "bioluminescent"
  },
  "assets": [
    {
      "id": "kebab-case-asset-id",
      "name": "Display Name",
      "model_source": "supabase" | "meshy" | "library",
      "model_path": "filename.glb",          // supabase only
      "generate_prompt": "...",              // meshy only
      "search_keyword": "...",              // library only
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
STRICT OUTPUT RULES
════════════════════════════════════════
- Output ONLY the JSON object. No markdown, no explanation, no code fences.
- Every phase id and asset id in phases must also appear in the assets array.
- knowledge_cards must have one entry for every click/drag/drag-multi/drag-chain phase.
- The phases array must start with an "intro" type and end with a "complete" type.
- Asset positions must not overlap (min 1.5 units apart).
- Use kebab-case for all id fields.
- The "npc" field is optional but encouraged.
`.trim();

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
        { role: 'system', content: SYSTEM_PROMPT },
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
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch (err: any) {
    console.error('[assemble-game] JSON parse failed. Raw:\n', rawContent.slice(0, 500));
    return NextResponse.json(
      { error: 'AI returned invalid JSON', raw: rawContent.slice(0, 500) },
      { status: 422 }
    );
  }

  // ── Validate against GameConfig shape ──
  try {
    validateGameConfig(parsed);
  } catch (err: any) {
    console.error('[assemble-game] Validation failed:', err.message);
    return NextResponse.json(
      {
        error: 'Generated config failed validation',
        details: err.message,
        // Return raw config so caller can inspect/repair
        raw: parsed,
      },
      { status: 422 }
    );
  }

  const config = parsed as GameConfig;

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
      },
    },
    { status: 200 }
  );
}
