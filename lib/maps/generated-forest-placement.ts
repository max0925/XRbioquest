import forestCollisionJson from '@/public/worlds/bioquest-forest-xr-v2/collision.json';
import forestManifestJson from '@/public/worlds/bioquest-forest-xr-v2/map.config.json';
import type { AssetConfig, GameConfig, Vec3 } from '@/types/game-config';
import type { MapManifest } from '@/types/map-config';
import { MapCollisionWorld } from './collision';
import { resolveAnchoredAssets, validateCollisionData, validateMapManifest } from './map-runtime';

export const GENERATED_COURSE_MAP_ID = 'bioquest-forest-xr-v2' as const;
export const GENERATED_COURSE_SPAWN = 'trail-start' as const;

const ASSET_CLEARANCE = 1.5;
const MIN_ASSET_SEPARATION = 2;
const MIN_SPAWN_SEPARATION = 3;
const SCALE_CANDIDATES = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4];
const ROTATION_CANDIDATES = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];

type LayoutPoint = {
  key: string;
  sourceX: number;
  sourceZ: number;
  kind: 'asset' | 'explore' | 'npc';
};

type PlacedPoint = { x: number; z: number };

export class GeneratedForestPlacementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeneratedForestPlacementError';
  }
}

function finitePosition(value: unknown, label: string): Vec3 {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    value.some((coordinate) => typeof coordinate !== 'number' || !Number.isFinite(coordinate))
  ) {
    throw new GeneratedForestPlacementError(`${label} must have a finite [x, y, z] position`);
  }
  return value as Vec3;
}

function clampHeightOffset(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0.5, Math.min(2, value));
}

function nearestAnchor(manifest: MapManifest, x: number, z: number) {
  let selected: [string, MapManifest['anchors'][string]] | null = null;
  let selectedDistance = Number.POSITIVE_INFINITY;
  for (const entry of Object.entries(manifest.anchors)) {
    const [, anchor] = entry;
    const distance = Math.hypot(x - anchor.position[0], z - anchor.position[2]);
    if (distance < selectedDistance) {
      selected = entry;
      selectedDistance = distance;
    }
  }
  if (!selected) throw new GeneratedForestPlacementError('Forest v2 manifest has no placement anchors');
  return selected;
}

function placementCenters(manifest: MapManifest, world: MapCollisionWorld): PlacedPoint[] {
  const preferred = ['learning-clearing', 'pond-side', 'trail-start']
    .map((name) => manifest.anchors[name])
    .filter(Boolean)
    .map((anchor) => ({ x: anchor.position[0], z: anchor.position[2] }));

  const grid: PlacedPoint[] = [];
  for (let z = manifest.bounds.minZ + 6; z <= manifest.bounds.maxZ - 6; z += 2) {
    for (let x = manifest.bounds.minX + 6; x <= manifest.bounds.maxX - 6; x += 2) {
      if (world.isFree(x, z)) grid.push({ x, z });
    }
  }
  grid.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));

  const seen = new Set<string>();
  return [...preferred, ...grid].filter((point) => {
    const key = `${point.x.toFixed(3)}:${point.z.toFixed(3)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return world.isFree(point.x, point.z);
  });
}

function assetSeparationIsValid(points: LayoutPoint[], placed: Map<string, PlacedPoint>): boolean {
  const assets = points.filter((point) => point.kind === 'asset');
  for (let first = 0; first < assets.length; first += 1) {
    for (let second = first + 1; second < assets.length; second += 1) {
      const a = placed.get(assets[first].key)!;
      const b = placed.get(assets[second].key)!;
      if (Math.hypot(a.x - b.x, a.z - b.z) < MIN_ASSET_SEPARATION) return false;
    }
  }
  return true;
}

function findLayoutTransform(
  points: LayoutPoint[],
  manifest: MapManifest,
  world: MapCollisionWorld,
): Map<string, PlacedPoint> {
  if (points.length === 0) return new Map();
  const centerX = points.reduce((sum, point) => sum + point.sourceX, 0) / points.length;
  const centerZ = points.reduce((sum, point) => sum + point.sourceZ, 0) / points.length;
  const spawn = manifest.spawnPoints[GENERATED_COURSE_SPAWN].position;
  const centers = placementCenters(manifest, world);

  for (const scale of SCALE_CANDIDATES) {
    for (const rotation of ROTATION_CANDIDATES) {
      const cosine = Math.cos(rotation);
      const sine = Math.sin(rotation);
      for (const center of centers) {
        const placed = new Map<string, PlacedPoint>();
        let valid = true;
        for (const point of points) {
          const relativeX = (point.sourceX - centerX) * scale;
          const relativeZ = (point.sourceZ - centerZ) * scale;
          const x = center.x + relativeX * cosine - relativeZ * sine;
          const z = center.z + relativeX * sine + relativeZ * cosine;
          if (!Number.isFinite(x) || !Number.isFinite(z) || !world.isFree(x, z)) {
            valid = false;
            break;
          }
          if (point.kind !== 'explore' && Math.hypot(x - spawn[0], z - spawn[2]) < MIN_SPAWN_SEPARATION) {
            valid = false;
            break;
          }
          placed.set(point.key, { x, z });
        }
        if (valid && assetSeparationIsValid(points, placed)) return placed;
      }
    }
  }

  throw new GeneratedForestPlacementError(
    `Could not place ${points.filter((point) => point.kind === 'asset').length} generated assets in forest v2 without overlapping trees, coastline, spawn, or each other`,
  );
}

/** Applies only to brand-new AI assembly results before they are saved. */
export function placeGeneratedCourseInForest(config: GameConfig): GameConfig {
  const manifest = validateMapManifest(forestManifestJson, GENERATED_COURSE_MAP_ID);
  const collision = validateCollisionData(forestCollisionJson, manifest);
  const placementWorld = new MapCollisionWorld(collision, ASSET_CLEARANCE);
  const validationWorld = new MapCollisionWorld(collision);
  const points: LayoutPoint[] = [];

  config.assets.forEach((asset, index) => {
    const [, , z] = finitePosition(asset.position, `Asset "${asset.id || index}"`);
    points.push({
      key: `asset:${index}`,
      sourceX: asset.position[0],
      sourceZ: z,
      kind: 'asset',
    });
  });

  config.phases.forEach((phase, index) => {
    if (phase.type !== 'explore' || phase.target_asset) return;
    const [x, , z] = finitePosition(phase.target_position, `Explore phase "${phase.id || index}"`);
    points.push({ key: `explore:${index}`, sourceX: x, sourceZ: z, kind: 'explore' });
  });

  if (config.npc) {
    const [x, , z] = finitePosition(config.npc.spawn_position, 'NPC');
    points.push({ key: 'npc', sourceX: x, sourceZ: z, kind: 'npc' });
  }

  const placed = findLayoutTransform(points, manifest, placementWorld);
  const assetPositions = new Map<string, Vec3>();

  config.assets.forEach((asset: AssetConfig, index) => {
    const point = placed.get(`asset:${index}`);
    if (!point) throw new GeneratedForestPlacementError(`Asset "${asset.id}" was not placed`);
    const original = finitePosition(asset.position, `Asset "${asset.id}"`);
    const heightOffset = clampHeightOffset(original[1], 0.8);
    const [anchorName, anchor] = nearestAnchor(manifest, point.x, point.z);
    const position: Vec3 = [
      point.x,
      validationWorld.groundHeight(point.x, point.z) + heightOffset,
      point.z,
    ];
    asset.anchor = anchorName;
    asset.offset = [point.x - anchor.position[0], heightOffset, point.z - anchor.position[2]];
    asset.position = position;
  });

  // Exercise the exact runtime resolver before the generated config is
  // returned or saved, so anchor/offset drift cannot become a play-time error.
  const resolvedAssetPositions = resolveAnchoredAssets(config.assets, manifest, collision);
  config.assets.forEach((asset) => {
    const position = resolvedAssetPositions[asset.id];
    if (!position) throw new GeneratedForestPlacementError(`Asset "${asset.id}" has no resolved forest position`);
    asset.position = position;
    assetPositions.set(asset.id, position);
  });

  config.phases.forEach((phase, index) => {
    if (phase.type !== 'explore') return;
    const assetPosition = phase.target_asset ? assetPositions.get(phase.target_asset) : undefined;
    const point = assetPosition
      ? { x: assetPosition[0], z: assetPosition[2] }
      : placed.get(`explore:${index}`);
    if (!point || !validationWorld.isFree(point.x, point.z)) {
      throw new GeneratedForestPlacementError(`Explore phase "${phase.id}" has no reachable target`);
    }
    phase.target_position = [point.x, validationWorld.groundHeight(point.x, point.z) + 0.05, point.z];
  });

  if (config.npc) {
    const point = placed.get('npc');
    if (!point) throw new GeneratedForestPlacementError('NPC was not placed');
    const original = finitePosition(config.npc.spawn_position, 'NPC');
    config.npc.spawn_position = [
      point.x,
      validationWorld.groundHeight(point.x, point.z) + clampHeightOffset(original[1], 1.5),
      point.z,
    ];
  }

  config.environment = {
    ...config.environment,
    environment_id: GENERATED_COURSE_MAP_ID,
    spawn_point: GENERATED_COURSE_SPAWN,
    skybox_prompt: '',
  };
  delete config.environment.skybox_url;
  delete config.environment.terrain_theme;
  delete config.environment.sky_color;
  delete config.environment.map_model;
  delete config.environment.preset;

  return config;
}
