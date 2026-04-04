import type {
  GameConfig,
  ResolvedGameConfig,
  ResolvedEnvironment,
  ResolvedAsset,
  PhaseConfig,
  AssetConfig,
  ClickPhase,
  DragPhase,
  DragMultiPhase,
  DragChainPhase,
  QuizPhase,
  ExplorePhase,
} from '@/types/game-config';
import { lookupBySupabaseId, lookupByKeyword } from '@/lib/asset-registry';

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPABASE_STORAGE_BASE =
  'https://tqqimwpwjnaldwuibeqf.supabase.co/storage/v1/object/public/assets';

// ─── Loader ───────────────────────────────────────────────────────────────────

/**
 * Load a GameConfig: tries bundled local JSON first, then falls back to the
 * Supabase game_configs table (for AI-generated experiences saved at runtime).
 */
export async function loadGameConfig(id: string): Promise<GameConfig> {
  // 1. Try local JSON file (built-in experiences bundled at build time)
  try {
    const module = await import(`@/data/experiences/${id}.json`);
    const raw: unknown = module.default ?? module;
    validateGameConfig(raw);
    return raw as GameConfig;
  } catch {
    // Module not found or invalid → fall through to DB
  }

  // 2. Fall back to Supabase game_configs table
  return loadGameConfigFromDB(id);
}

/**
 * Load a GameConfig from the Supabase game_configs table by record id.
 * Uses the public anon key (safe — NEXT_PUBLIC keys are client-visible).
 */
export async function loadGameConfigFromDB(id: string): Promise<GameConfig> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      'Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    );
  }

  const res = await fetch(
    `${supabaseUrl}/rest/v1/game_configs?id=eq.${encodeURIComponent(id)}&select=config`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Database fetch failed with status ${res.status}`);
  }

  const rows: Array<{ config: unknown }> = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`No experience found with id "${id}"`);
  }

  const raw = rows[0].config;
  validateGameConfig(raw);
  return raw as GameConfig;
}

// ─── Resolver ─────────────────────────────────────────────────────────────────

/**
 * Resolves all asset model_paths and the environment skybox_url into
 * fully-qualified URLs.
 *
 * Handles:
 *   model_source = 'supabase'  → constructs URL from SUPABASE_STORAGE_BASE
 *   model_source = 'library'   → model_url must already be set on the asset
 *   model_source = 'meshy'     → model_url must already be set on the asset
 *                                 (Meshy generation is an async step done
 *                                  before this call, not here)
 *
 * Throws if a non-supabase asset has no model_url yet, so you know what still
 * needs async resolution.
 */
export function resolveAssetPaths(config: GameConfig): ResolvedGameConfig {
  const environment: ResolvedEnvironment = {
    ...config.environment,
    skybox_url: config.environment.skybox_url ?? '',
  };

  const assets: ResolvedAsset[] = config.assets.map((asset) => {
    const model_url = resolveModelUrl(asset);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { model_path: _mp, ...rest } = asset;
    return { ...rest, model_url };
  });

  return {
    ...config,
    environment,
    assets,
  };
}

function resolveModelUrl(asset: AssetConfig): string {
  if (asset.model_source === 'supabase') {
    if (!asset.model_path) {
      throw new Error(
        `Asset "${asset.id}" has model_source="supabase" but no model_path`
      );
    }
    return `${SUPABASE_STORAGE_BASE}/${asset.model_path}`;
  }

  // 'library' assets: model_path is set to the full ngss_assets model_url at
  // assembly time (by the /api/assemble-game route). Use it directly.
  if (asset.model_path) {
    return asset.model_path.startsWith('http')
      ? asset.model_path
      : `${SUPABASE_STORAGE_BASE}/${asset.model_path}`;
  }

  // Fallback: try registry lookup by supabase_id or search_keyword.
  // (Handles configs assembled before the auto-resolution step existed.)
  if (asset.model_source === 'library') {
    const entry =
      (asset.supabase_id ? lookupBySupabaseId(asset.supabase_id) : null) ??
      (asset.search_keyword ? lookupByKeyword(asset.search_keyword) : null);
    if (entry) {
      // Registry entries don't store model_url — flag for re-assembly
      console.warn(
        `[game-config-loader] Asset "${asset.id}" (library) has no model_path. ` +
          `Re-assemble the experience to populate URLs from the ngss_assets table.`
      );
    }
  }

  // No model URL — render placeholder geometry.
  console.warn(
    `[game-config-loader] Asset "${asset.id}" (source: ${asset.model_source}) has no ` +
      `resolved model URL — rendering placeholder geometry.`
  );
  return '';
}

// ─── Runtime Validator ────────────────────────────────────────────────────────
// Validates the loaded JSON against the discriminated union shape at runtime.
// Throws a descriptive error if any required field is missing.

export function validateGameConfig(raw: unknown): asserts raw is GameConfig {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('GameConfig must be a JSON object');
  }

  const cfg = raw as Record<string, unknown>;

  requireField(cfg, 'meta', 'object');
  requireField(cfg, 'environment', 'object');
  requireField(cfg, 'scoring', 'object');
  requireField(cfg, 'hud', 'object');

  if (!Array.isArray(cfg.assets)) {
    throw new Error('GameConfig.assets must be an array');
  }
  if (!Array.isArray(cfg.phases)) {
    throw new Error('GameConfig.phases must be an array');
  }
  if (typeof cfg.knowledge_cards !== 'object' || cfg.knowledge_cards === null) {
    throw new Error('GameConfig.knowledge_cards must be an object');
  }

  (cfg.phases as unknown[]).forEach((phase, i) => {
    validatePhase(phase, i);
  });
}

function validatePhase(raw: unknown, index: number): asserts raw is PhaseConfig {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`phases[${index}] must be an object`);
  }

  const p = raw as Record<string, unknown>;
  const ctx = `phases[${index}] (id="${p.id ?? '?'}")`;

  if (typeof p.id !== 'string') {
    throw new Error(`${ctx}: id must be a string`);
  }
  if (typeof p.type !== 'string') {
    throw new Error(`${ctx}: type must be a string`);
  }

  const type = p.type as string;

  switch (type) {
    case 'intro':
    case 'complete':
      // No extra fields required
      break;

    case 'click': {
      const cp = p as unknown as Partial<ClickPhase>;
      if (typeof cp.target_asset !== 'string') {
        throw new Error(`${ctx}: ClickPhase requires target_asset (string)`);
      }
      break;
    }

    case 'drag': {
      const dp = p as unknown as Partial<DragPhase>;
      if (typeof dp.drag_item !== 'string') {
        throw new Error(`${ctx}: DragPhase requires drag_item (string)`);
      }
      if (typeof dp.drag_target !== 'string') {
        throw new Error(`${ctx}: DragPhase requires drag_target (string)`);
      }
      break;
    }

    case 'drag-multi': {
      const dmp = p as unknown as Partial<DragMultiPhase>;
      if (typeof dmp.drag_item !== 'string') {
        throw new Error(`${ctx}: DragMultiPhase requires drag_item (string)`);
      }
      if (typeof dmp.drag_target !== 'string') {
        throw new Error(`${ctx}: DragMultiPhase requires drag_target (string)`);
      }
      if (typeof dmp.total !== 'number') {
        throw new Error(`${ctx}: DragMultiPhase requires total (number)`);
      }
      break;
    }

    case 'drag-chain': {
      const dcp = p as unknown as Partial<DragChainPhase>;
      if (!Array.isArray(dcp.steps) || dcp.steps.length === 0) {
        throw new Error(`${ctx}: DragChainPhase requires steps (non-empty array)`);
      }
      dcp.steps.forEach((step, si) => {
        if (typeof step !== 'object' || step === null) {
          throw new Error(`${ctx} steps[${si}]: must be an object`);
        }
        const s = step as unknown as Record<string, unknown>;
        if (typeof s.drag_item !== 'string') {
          throw new Error(`${ctx} steps[${si}]: requires drag_item (string)`);
        }
        if (typeof s.drag_target !== 'string') {
          throw new Error(`${ctx} steps[${si}]: requires drag_target (string)`);
        }
      });
      break;
    }

    case 'quiz': {
      const qp = p as unknown as Partial<QuizPhase>;
      if (typeof qp.question !== 'string') {
        throw new Error(`${ctx}: QuizPhase requires question (string)`);
      }
      if (!Array.isArray(qp.options) || qp.options.length === 0) {
        throw new Error(`${ctx}: QuizPhase requires options (non-empty array)`);
      }
      if (typeof qp.explanation !== 'string') {
        throw new Error(`${ctx}: QuizPhase requires explanation (string)`);
      }
      break;
    }

    case 'explore': {
      const ep = p as unknown as Partial<ExplorePhase>;
      if (
        !Array.isArray(ep.target_position) ||
        ep.target_position.length !== 3 ||
        ep.target_position.some((v) => typeof v !== 'number')
      ) {
        throw new Error(
          `${ctx}: ExplorePhase requires target_position ([x, y, z] numbers)`
        );
      }
      if (typeof ep.trigger_radius !== 'number') {
        throw new Error(`${ctx}: ExplorePhase requires trigger_radius (number)`);
      }
      break;
    }

    default:
      throw new Error(`${ctx}: unknown phase type "${type}"`);
  }
}

function requireField(
  obj: Record<string, unknown>,
  key: string,
  expectedType: 'object' | 'string' | 'number'
) {
  const val = obj[key];
  const actualType = val === null ? 'null' : typeof val;
  if (expectedType === 'object') {
    if (typeof val !== 'object' || val === null) {
      throw new Error(`GameConfig.${key} must be an object (got ${actualType})`);
    }
  } else if (actualType !== expectedType) {
    throw new Error(
      `GameConfig.${key} must be a ${expectedType} (got ${actualType})`
    );
  }
}
