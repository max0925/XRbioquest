import type { AssetConfig, GameConfig, ResolvedGameConfig, Vec3 } from '../../types/game-config.ts';
import type { MapCollisionData, MapEnvironmentId, MapManifest, MapRuntime } from '../../types/map-config.ts';
import { MapCollisionWorld } from './collision.ts';

const MAP_MANIFESTS: Record<Exclude<MapEnvironmentId, 'procedural-terrain'>, string> = {
  'bioquest-forest': '/worlds/bioquest-forest/map.config.json',
  'bioquest-forest-xr-v2': '/worlds/bioquest-forest-xr-v2/map.config.json',
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isVec3 = (value: unknown): value is Vec3 =>
  Array.isArray(value) && value.length === 3 && value.every(isFiniteNumber);

const isSafeMapPath = (value: unknown, id: string, extension: string): value is string =>
  typeof value === 'string' &&
  value.startsWith(`/worlds/${id}/`) &&
  value.endsWith(extension) &&
  !value.includes('..') &&
  !value.includes('://') &&
  !value.includes('\\');

const assertColor = (value: unknown, field: string) => {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`${field} must be a six-digit hex color`);
  }
};

function assertPointRecord(value: unknown, field: string, bounds: MapManifest['bounds']) {
  if (!isObject(value) || Object.keys(value).length === 0) throw new Error(`${field} must not be empty`);
  for (const [id, point] of Object.entries(value)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !isObject(point) || typeof point.label !== 'string' || !isVec3(point.position)) {
      throw new Error(`${field}.${id} is invalid`);
    }
    const [x, , z] = point.position;
    if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) {
      throw new Error(`${field}.${id} is outside map bounds`);
    }
  }
}

export function isMapEnvironmentId(value: unknown): value is MapEnvironmentId {
  return value === 'procedural-terrain' || value === 'bioquest-forest' || value === 'bioquest-forest-xr-v2';
}

export function assertMapEnvironmentId(value: unknown): asserts value is MapEnvironmentId | undefined {
  if (value !== undefined && !isMapEnvironmentId(value)) {
    throw new Error(`Unknown environment_id "${String(value)}"`);
  }
}

export function validateMapManifest(raw: unknown, expectedId: Exclude<MapEnvironmentId, 'procedural-terrain'>): MapManifest {
  if (!isObject(raw)) throw new Error('Map manifest must be an object');
  if (raw.id !== expectedId || typeof raw.label !== 'string' || !isFiniteNumber(raw.version) || raw.version < 1) {
    throw new Error('Map manifest identity is invalid');
  }
  if (!isSafeMapPath(raw.modelPath, expectedId, '.glb') || !isSafeMapPath(raw.collisionPath, expectedId, '.json')) {
    throw new Error('Map manifest contains an unsafe asset path');
  }
  if (raw.collisionMeshPath !== undefined && !isSafeMapPath(raw.collisionMeshPath, expectedId, '.glb')) {
    throw new Error('Map manifest contains an unsafe collision mesh path');
  }
  if (raw.navmeshPath !== undefined && !isSafeMapPath(raw.navmeshPath, expectedId, '.glb')) {
    throw new Error('Map manifest contains an unsafe navigation mesh path');
  }
  if (!isObject(raw.bounds) || !['minX', 'maxX', 'minZ', 'maxZ'].every((key) => isFiniteNumber(raw.bounds![key]))) {
    throw new Error('Map bounds are invalid');
  }
  const bounds = raw.bounds as unknown as MapManifest['bounds'];
  if (bounds.minX >= bounds.maxX || bounds.minZ >= bounds.maxZ) throw new Error('Map bounds are empty');
  if (!isObject(raw.defaultSky)) throw new Error('Map sky is invalid');
  assertColor(raw.defaultSky.color, 'defaultSky.color');
  assertColor(raw.defaultSky.fogColor, 'defaultSky.fogColor');
  if (!isFiniteNumber(raw.defaultSky.fogDensity) || raw.defaultSky.fogDensity < 0 || raw.defaultSky.fogDensity > 0.1) {
    throw new Error('defaultSky.fogDensity is invalid');
  }
  if (!isObject(raw.lighting) || !isObject(raw.lighting.ambient) || !isObject(raw.lighting.directional)) {
    throw new Error('Map lighting is invalid');
  }
  for (const [name, light] of Object.entries(raw.lighting)) {
    if (!isObject(light)) throw new Error(`lighting.${name} is invalid`);
    assertColor(light.color, `lighting.${name}.color`);
    if (!isFiniteNumber(light.intensity) || light.intensity < 0 || light.intensity > 4) throw new Error(`lighting.${name}.intensity is invalid`);
    if (light.position !== undefined && !isVec3(light.position)) throw new Error(`lighting.${name}.position is invalid`);
    if (name === 'hemisphere') assertColor(light.groundColor, 'lighting.hemisphere.groundColor');
  }
  assertPointRecord(raw.spawnPoints, 'spawnPoints', bounds);
  assertPointRecord(raw.anchors, 'anchors', bounds);
  if (typeof raw.defaultSpawnPoint !== 'string' || !Object.hasOwn(raw.spawnPoints as object, raw.defaultSpawnPoint)) {
    throw new Error('defaultSpawnPoint is not registered');
  }
  for (const [id, point] of Object.entries(raw.spawnPoints as Record<string, Record<string, unknown>>)) {
    if (!isFiniteNumber(point.eyeHeight) || point.eyeHeight < 1 || point.eyeHeight > 2.2) throw new Error(`spawnPoints.${id}.eyeHeight is invalid`);
  }
  if (!isObject(raw.performanceBudget) || !['maxModelBytes', 'maxTriangles', 'maxTextureSize'].every((key) => isFiniteNumber(raw.performanceBudget![key]) && Number(raw.performanceBudget![key]) > 0)) {
    throw new Error('performanceBudget is invalid');
  }
  if (!isObject(raw.fallback) || raw.fallback.environmentId !== 'procedural-terrain' || typeof raw.fallback.message !== 'string') {
    throw new Error('Map fallback is invalid');
  }
  return raw as unknown as MapManifest;
}

export function validateCollisionData(raw: unknown, manifest: MapManifest): MapCollisionData {
  if (!isObject(raw) || !isFiniteNumber(raw.version) || !isObject(raw.bounds) || !isObject(raw.island) || !isObject(raw.ground)) {
    throw new Error('Collision data is invalid');
  }
  const collision = raw as unknown as MapCollisionData;
  if (JSON.stringify(collision.bounds) !== JSON.stringify(manifest.bounds)) throw new Error('Collision bounds do not match the manifest');
  const outline = collision.island.outline;
  if (
    !Array.isArray(outline) ||
    outline.length < 3 ||
    outline.some((point) =>
      !isObject(point) ||
      !isFiniteNumber(point.x) ||
      !isFiniteNumber(point.z) ||
      point.x < collision.bounds.minX ||
      point.x > collision.bounds.maxX ||
      point.z < collision.bounds.minZ ||
      point.z > collision.bounds.maxZ
    )
  ) {
    throw new Error('Collision island outline is invalid');
  }
  const { xs, ys, heights } = collision.ground;
  if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length < 2 || ys.length < 2 || !xs.every(isFiniteNumber) || !ys.every(isFiniteNumber)) {
    throw new Error('Collision height grid axes are invalid');
  }
  if (!Array.isArray(heights) || heights.length !== ys.length || heights.some((row) => !Array.isArray(row) || row.length !== xs.length || !row.every(isFiniteNumber))) {
    throw new Error('Collision height grid is invalid');
  }
  if (!Array.isArray(collision.boxes) || collision.boxes.some((box) => !isObject(box) || typeof box.name !== 'string' || !['minX', 'maxX', 'minZ', 'maxZ'].every((key) => isFiniteNumber(box[key as keyof typeof box])))) {
    throw new Error('Collision blockers are invalid');
  }
  return collision;
}

export function proceduralMapRuntime(fallbackMessage?: string): MapRuntime {
  return { kind: 'procedural', id: 'procedural-terrain', fallbackMessage };
}

export function resolveAnchoredAssets(assets: AssetConfig[], manifest: MapManifest, collision: MapCollisionData) {
  const world = new MapCollisionWorld(collision);
  const positions: Record<string, Vec3> = {};
  for (const asset of assets) {
    if (!asset.anchor) throw new Error(`Asset "${asset.id}" needs an anchor for ${manifest.id}`);
    const anchor = manifest.anchors[asset.anchor];
    if (!anchor) throw new Error(`Asset "${asset.id}" uses unknown anchor "${asset.anchor}"`);
    const offset = asset.offset ?? [0, 0, 0];
    const x = anchor.position[0] + offset[0];
    const z = anchor.position[2] + offset[2];
    if (!world.isFree(x, z)) throw new Error(`Asset "${asset.id}" is outside walkable map space`);
    positions[asset.id] = [x, world.groundHeight(x, z) + offset[1], z];
  }
  return positions;
}

export async function loadMapRuntime(config: GameConfig, fetcher: FetchLike = fetch): Promise<MapRuntime> {
  const environmentId = config.environment.environment_id ?? 'procedural-terrain';
  assertMapEnvironmentId(environmentId);
  if (environmentId === 'procedural-terrain') return proceduralMapRuntime();

  const manifestPath = MAP_MANIFESTS[environmentId];
  try {
    const manifestResponse = await fetcher(manifestPath);
    if (!manifestResponse.ok) throw new Error(`manifest HTTP ${manifestResponse.status}`);
    const manifest = validateMapManifest(await manifestResponse.json(), environmentId);
    const collisionResponse = await fetcher(manifest.collisionPath);
    if (!collisionResponse.ok) throw new Error(`collision HTTP ${collisionResponse.status}`);
    const collision = validateCollisionData(await collisionResponse.json(), manifest);
    const modelResponse = await fetcher(manifest.modelPath, { method: 'HEAD' });
    if (!modelResponse.ok) throw new Error(`model HTTP ${modelResponse.status}`);
    if (manifest.collisionMeshPath) {
      const collisionMeshResponse = await fetcher(manifest.collisionMeshPath, { method: 'HEAD' });
      if (!collisionMeshResponse.ok) throw new Error(`collision mesh HTTP ${collisionMeshResponse.status}`);
    }
    if (manifest.navmeshPath) {
      const navmeshResponse = await fetcher(manifest.navmeshPath, { method: 'HEAD' });
      if (!navmeshResponse.ok) throw new Error(`navigation mesh HTTP ${navmeshResponse.status}`);
    }

    const world = new MapCollisionWorld(collision);
    for (const [id, point] of Object.entries({ ...manifest.anchors, ...manifest.spawnPoints })) {
      const [x, y, z] = point.position;
      if (!world.isFree(x, z) || Math.abs(world.groundHeight(x, z) - y) > 0.02) {
        throw new Error(`Map point "${id}" does not match collision ground`);
      }
    }
    const spawnName = config.environment.spawn_point ?? manifest.defaultSpawnPoint;
    const spawnPoint = manifest.spawnPoints[spawnName];
    if (!spawnPoint) throw new Error(`Unknown spawn point "${spawnName}"`);
    const defaultSpawn = manifest.spawnPoints[manifest.defaultSpawnPoint];
    if (Math.abs(defaultSpawn.position[0] - collision.spawn.x) > 0.001 || Math.abs(defaultSpawn.position[2] - collision.spawn.z) > 0.001) {
      throw new Error('Default spawn does not match collision data');
    }
    return {
      kind: 'physical',
      id: environmentId,
      manifest,
      collision,
      spawnPoint,
      assetPositions: resolveAnchoredAssets(config.assets, manifest, collision),
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown map error';
    console.warn(`[map-runtime] ${environmentId} unavailable: ${detail}`);
    if (environmentId === 'bioquest-forest-xr-v2') {
      throw new Error(`${environmentId} unavailable: ${detail}`);
    }
    return proceduralMapRuntime(`Map unavailable (${detail}). Using safe procedural terrain.`);
  }
}

export function applyMapRuntime(config: ResolvedGameConfig, runtime: MapRuntime): ResolvedGameConfig {
  if (runtime.kind !== 'physical') return config;
  return {
    ...config,
    assets: config.assets.map((asset) => ({
      ...asset,
      position: runtime.assetPositions[asset.id] ?? asset.position,
    })),
  };
}

export const registeredMapManifestPath = (id: Exclude<MapEnvironmentId, 'procedural-terrain'>) => MAP_MANIFESTS[id];
