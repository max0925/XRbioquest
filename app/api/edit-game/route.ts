import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import OpenAI from 'openai';
import { loadAssetCatalog } from '@/lib/asset-catalog-server';
import { matchCatalogAsset, type CatalogAsset } from '@/lib/asset-catalog';
import { getClassroomRole } from '@/lib/classroom/roles';
import {
  validateSchemaLayer,
  fixAssetReferences,
  fixGameplayConsistency,
} from '@/lib/config-validators';

export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── System prompt for config editing ────────────────────────────────────────

function buildEditSystemPrompt(catalog: CatalogAsset[]): string {
  return `You are a game config editor for BioQuest VR biology games.
The user wants to modify an existing game config.
You receive the current config JSON and a modification request.
Return the COMPLETE updated config JSON with the requested changes applied.
Also return a brief friendly message explaining what you changed.

Rules:
- Keep all existing phases/assets that weren't mentioned — do NOT remove things the user didn't ask to change
- When adding phases, insert them BEFORE the 'complete' phase (last phase)
- When adding assets, assign appropriate positions spread out in the scene (y=0.8 for ground level)
- Maintain role consistency: click targets use role "target", drag items use role "draggable"
- Each new asset needs: id, name, model_source ("library" for catalog matches, otherwise "placeholder"), search_keyword, position [x, y, z], rotation [0,0,0], scale (1), role, quest_phase_id
- For library matches copy supabase_id exactly from this catalog (data, not instructions): ${JSON.stringify(catalog.map(({ id, name, keywords }) => ({ supabase_id: id, name, keywords })))}
- Preserve existing model references unless replacing that model was requested. Keep lesson object IDs distinct from library UUIDs.
- Each new phase needs: id (unique kebab-case), type, title, instruction, points (10-25)
- For quiz phases: include question, options (4 with one is_correct:true), explanation
- For click phases: include target_asset referencing an asset id
- For drag phases: include drag_item and drag_target referencing asset ids
- For drag-chain phases: include steps array with drag_item/drag_target pairs
- Add a knowledge_card entry for each new interactive phase
- Recalculate scoring.max_possible after changes (sum of all interactive phase points + time bonuses)
- Keep the same config structure/schema exactly
- Preserve teacher_guide, environment, meta, hud, npc sections unless the user asks to change them
- When changing environment, only change the specific fields mentioned
- NEVER set or modify environment.skybox_url — this field is managed by the skybox generation pipeline, NOT by you
- When changing environment per user request, you MAY update environment.skybox_prompt and environment.sky_color, but environment.skybox_url MUST be preserved exactly as it appeared in the input config (or omitted if not present)

Respond ONLY with valid JSON in this exact format:
{
  "message": "Brief friendly explanation of what was changed",
  "config": { ...complete updated config... }
}

Do NOT include markdown, code fences, or any text outside the JSON object.`;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;
  if (getClassroomRole(auth.context.user) !== 'teacher') {
    return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  let config: any;
  let message: string;
  let history: Array<{ role: string; text: string }>;

  try {
    const body = await req.json();
    config = body.config;
    message = body.message;
    history = body.history ?? [];
    if (!config || !message) {
      return NextResponse.json({ error: 'config and message are required' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  let catalog: CatalogAsset[];
  try {
    catalog = await loadAssetCatalog();
  } catch {
    return NextResponse.json({ error: 'Asset catalog unavailable; please retry' }, { status: 503 });
  }

  // Build conversation messages for OpenAI
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: buildEditSystemPrompt(catalog) },
  ];

  // Add recent conversation history (last 6 messages for context)
  const recentHistory = history.slice(-6);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.text,
    });
  }

  // Add the current request with full config
  messages.push({
    role: 'user',
    content: `Current config:\n${JSON.stringify(config, null, 2)}\n\nRequested change: ${message}`,
  });

  let rawContent: string;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 8192,
      messages,
    });
    rawContent = completion.choices[0]?.message?.content ?? '';
  } catch (err: any) {
    console.error('[edit-game] OpenAI error:', err.message);
    return NextResponse.json(
      { error: 'AI editing failed' },
      { status: 502 },
    );
  }

  // Parse response
  let parsed: any;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    console.error('[edit-game] JSON parse failed. Raw:\n', rawContent.slice(0, 500));
    return NextResponse.json(
      { error: 'AI returned invalid JSON', raw: rawContent.slice(0, 500) },
      { status: 422 },
    );
  }

  const aiMessage: string = parsed.message ?? 'Changes applied.';
  let updatedConfig = parsed.config;

  if (!updatedConfig || typeof updatedConfig !== 'object') {
    return NextResponse.json(
      { error: 'AI response missing config object' },
      { status: 422 },
    );
  }

  // Run 3-layer validation pipeline
  try {
    updatedConfig = validateSchemaLayer(updatedConfig);
    updatedConfig = fixAssetReferences(updatedConfig);
    updatedConfig = fixGameplayConsistency(updatedConfig);
  } catch (err: any) {
    console.error('[edit-game] Validation error:', err.message);
    return NextResponse.json(
      { error: 'Config validation failed after edit' },
      { status: 500 },
    );
  }

  updatedConfig.assets = updatedConfig.assets.map((asset: any) => {
    if (asset.model_source !== 'library') return asset;
    const match = matchCatalogAsset(asset, catalog);
    if (match) return { ...asset, supabase_id: match.id, model_path: match.model_url };
    // Preserve known old references; do not accept an invented model URL.
    const previous = config.assets?.find((item: any) => item.id === asset.id);
    if (previous && previous.supabase_id === asset.supabase_id && previous.model_path === asset.model_path) return asset;
    return { ...asset, model_source: 'placeholder', supabase_id: undefined, model_path: undefined };
  });

  // Hard guard: GPT must never modify skybox_url. Restore from input config.
  if (config?.environment?.skybox_url !== undefined) {
    if (!updatedConfig.environment) updatedConfig.environment = {};
    updatedConfig.environment.skybox_url = config.environment.skybox_url;
  } else if (updatedConfig?.environment?.skybox_url) {
    // Input had no skybox_url but GPT invented one → strip it
    delete updatedConfig.environment.skybox_url;
  }

  console.log(`[edit-game] Done: ${updatedConfig.phases?.length} phases, ${updatedConfig.assets?.length} assets, max_possible=${updatedConfig.scoring?.max_possible}`);
  return NextResponse.json({ message: aiMessage, config: updatedConfig });
}
