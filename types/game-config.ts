// ═══════════════════════════════════════════════════════════════════════════
// GameConfig — Config-driven type system for BioQuest VR games
// The AI assembler outputs this JSON; the Voyage runtime consumes it.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Primitives ──────────────────────────────────────────────────────────

/** [x, y, z] world-space position */
export type Vec3 = [number, number, number];

// ─── Meta ────────────────────────────────────────────────────────────────

export interface GameMeta {
  id: string;
  title: string;
  subject: string;
  grade: 'elementary' | 'middle' | 'high' | 'college';
  duration_minutes: number;
  ngss_standards: string[];
  learning_objectives: string[];
}

// ─── Environment ─────────────────────────────────────────────────────────

export interface EnvironmentConfig {
  /** Prompt sent to Blockade Labs for skybox generation */
  skybox_prompt: string;
  /** Pre-generated skybox URL (filled by resolver) */
  skybox_url?: string;
  /** Lighting mood applied to the scene */
  lighting: 'warm' | 'cool' | 'neutral' | 'dramatic' | 'bioluminescent';
}

// ─── Assets ──────────────────────────────────────────────────────────────

export type ModelSource = 'library' | 'supabase' | 'meshy';

export type AssetRole = 'interactive' | 'target' | 'draggable' | 'decorative';

export type AssetFunction =
  | 'energy'
  | 'digestion'
  | 'transport'
  | 'packaging'
  | 'fuel'
  | 'structural'
  | 'signaling'
  | 'decorative';

export interface AssetConfig {
  /** Unique id referenced by phases (e.g. "mitochondria") */
  id: string;
  /** Display name shown in HUD / knowledge cards */
  name: string;

  // ── Model resolution (exactly one of these groups is used) ───────────
  model_source: ModelSource;
  /** Supabase storage path (when model_source = 'supabase') */
  model_path?: string;
  /** Keyword for internal ngss_assets lookup (when model_source = 'library') */
  search_keyword?: string;
  /** Text prompt for Meshy AI generation (when model_source = 'meshy') */
  generate_prompt?: string;

  // ── Placement ────────────────────────────────────────────────────────
  position: Vec3;
  rotation?: Vec3;
  scale?: number;

  // ── Behaviour ────────────────────────────────────────────────────────
  role: AssetRole;
  /** Biological function — drives tooltip text */
  function?: AssetFunction;
  /** Free-text description shown on hover / in HUD */
  description?: string;
  /** Links this asset to a specific phase by phase id */
  quest_phase_id?: string;

  // ── Snap target config (for assets that receive drops) ───────────────
  /** Snap distance override (default 2.0) */
  snap_distance?: number;
}

// ─── Phases ──────────────────────────────────────────────────────────────

export type PhaseType =
  | 'intro'
  | 'click'
  | 'drag'
  | 'drag-multi'
  | 'drag-chain'
  | 'quiz'
  | 'explore'
  | 'complete';

interface PhaseBase {
  /** Unique id (e.g. "phase-0", "find-mito") */
  id: string;
  title: string;
  instruction: string;
  type: PhaseType;
  /** Points awarded on completion */
  points?: number;
  /** Bonus points if completed within time limit */
  time_bonus?: {
    threshold_seconds: number;
    bonus_points: number;
  };
}

export interface IntroPhase extends PhaseBase {
  type: 'intro';
}

export interface ClickPhase extends PhaseBase {
  type: 'click';
  /** Asset id the player must click */
  target_asset: string;
}

export interface DragPhase extends PhaseBase {
  type: 'drag';
  /** Asset id the player picks up */
  drag_item: string;
  /** Asset id the player drops onto */
  drag_target: string;
  /** Override snap distance for this phase */
  snap_distance?: number;
}

export interface DragMultiPhase extends PhaseBase {
  type: 'drag-multi';
  /** Asset id (or spawn template) for items to collect */
  drag_item: string;
  /** Asset id the player delivers items to */
  drag_target: string;
  /** Number of items to collect */
  total: number;
  /** Override snap distance for this phase */
  snap_distance?: number;
}

export interface DragChainStep {
  /** Asset id for the item being moved in this step */
  drag_item: string;
  /** Asset id for the drop target in this step */
  drag_target: string;
  /** Override snap distance for this step */
  snap_distance?: number;
}

export interface DragChainPhase extends PhaseBase {
  type: 'drag-chain';
  /** Ordered sequence of drag steps */
  steps: DragChainStep[];
}

export interface QuizOption {
  id: string;
  text: string;
  is_correct: boolean;
}

export interface QuizPhase extends PhaseBase {
  type: 'quiz';
  /** The question text (may duplicate `instruction` for clarity) */
  question: string;
  /** Exactly 4 answer options; exactly one must have is_correct: true */
  options: QuizOption[];
  /** Shown after a correct answer before auto-advancing */
  explanation: string;
}

export interface ExplorePhase extends PhaseBase {
  type: 'explore';
  /** World-space position the player must walk to */
  target_position: Vec3;
  /** Horizontal distance (world units) that triggers success; default 2.0 */
  trigger_radius: number;
  /** Optional asset id to highlight as the destination */
  target_asset?: string;
}

export interface CompletePhase extends PhaseBase {
  type: 'complete';
}

export type PhaseConfig =
  | IntroPhase
  | ClickPhase
  | DragPhase
  | DragMultiPhase
  | DragChainPhase
  | QuizPhase
  | ExplorePhase
  | CompletePhase;

// ─── Knowledge Cards ─────────────────────────────────────────────────────

export interface KnowledgeCardConfig {
  title: string;
  /** Educational content (may include unicode formulas like C₆H₁₂O₆) */
  body: string;
  /** Curriculum tag (e.g. "AP Bio Unit 2", "IB HL Topic 8", "NGSS HS-LS1-2") */
  tag: string;
  /** Common misconception to address (optional) */
  misconception?: string;
}

// ─── NPC ─────────────────────────────────────────────────────────────────

export interface NPCConfig {
  name: string;
  /** System prompt defining NPC personality / knowledge */
  persona: string;
  /** Where the NPC appears in the scene */
  spawn_position: Vec3;
  /** Phase-specific hints the NPC can give */
  hints: Record<string, string>;
}

// ─── Scoring ─────────────────────────────────────────────────────────────

export interface ScoringConfig {
  max_possible: number;
  passing_threshold: number;
}

// ─── HUD ─────────────────────────────────────────────────────────────────

export interface HUDConfig {
  show_score: boolean;
  show_phase_counter: boolean;
  show_instruction: boolean;
  show_timer: boolean;
  show_knowledge_cards: boolean;
  show_tasks: boolean;
}

// ─── Root Config ─────────────────────────────────────────────────────────

export interface GameConfig {
  meta: GameMeta;
  environment: EnvironmentConfig;
  assets: AssetConfig[];
  phases: PhaseConfig[];
  /** Keyed by phase id */
  knowledge_cards: Record<string, KnowledgeCardConfig>;
  npc?: NPCConfig;
  scoring: ScoringConfig;
  hud: HUDConfig;
}

// ─── Resolved Config ─────────────────────────────────────────────────────
// After the resolver fills in all optional URLs (skybox generated, models
// fetched from Meshy / library), this type guarantees no undefined URLs.

export interface ResolvedEnvironment extends EnvironmentConfig {
  skybox_url: string;
}

export interface ResolvedAsset extends Omit<AssetConfig, 'model_path'> {
  /** Guaranteed-present URL to the GLB file */
  model_url: string;
}

export interface ResolvedGameConfig extends Omit<GameConfig, 'environment' | 'assets'> {
  environment: ResolvedEnvironment;
  assets: ResolvedAsset[];
}
