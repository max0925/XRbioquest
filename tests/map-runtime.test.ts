import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import type { GameConfig } from '../types/game-config.ts';
import type { MapCollisionData } from '../types/map-config.ts';
import {
  applyMapRuntime,
  assertMapEnvironmentId,
  loadMapRuntime,
  registeredMapManifestPath,
  validateCollisionData,
  validateMapManifest,
} from '../lib/maps/map-runtime.ts';
import { MapCollisionWorld } from '../lib/maps/collision.ts';
import { isDevelopmentMapPreviewAvailable } from '../lib/maps/development-preview.ts';

const readJson = async (path: string) => JSON.parse(await readFile(path, 'utf8'));

const baseConfig = (): GameConfig => ({
  meta: { id: 'map-test', title: 'Map test', subject: 'Biology', grade: 'high', duration_minutes: 5, ngss_standards: [], learning_objectives: [] },
  environment: { skybox_prompt: '', lighting: 'neutral' },
  assets: [{ id: 'marker', name: 'Marker', model_source: 'primitive', position: [4, 2, -3], role: 'interactive' }],
  phases: [{ id: 'intro', type: 'intro', title: 'Intro', instruction: 'Begin' }, { id: 'done', type: 'complete', title: 'Done', instruction: 'Done' }],
  knowledge_cards: {},
  scoring: { max_possible: 0, passing_threshold: 0 },
  hud: { show_score: true, show_phase_counter: true, show_instruction: true, show_timer: false, show_knowledge_cards: false, show_tasks: true },
});

async function forestFixtures() {
  const manifest = validateMapManifest(await readJson('public/worlds/bioquest-forest/map.config.json'), 'bioquest-forest');
  const collision = validateCollisionData(await readJson('public/worlds/bioquest-forest/collision.json'), manifest);
  return { manifest, collision };
}

function fixtureFetcher(manifest: unknown, collision: unknown, modelOk = true) {
  return async (path: string, init?: RequestInit) => ({
    ok: init?.method === 'HEAD' ? modelOk : true,
    status: init?.method === 'HEAD' && !modelOk ? 404 : 200,
    json: async () => path.endsWith('map.config.json') ? manifest : collision,
  });
}

test('forest manifest uses registered local resources and collision-aligned points', async () => {
  const { manifest, collision } = await forestFixtures();
  assert.equal(registeredMapManifestPath('bioquest-forest'), '/worlds/bioquest-forest/map.config.json');
  assert.equal(manifest.collisionPath, '/worlds/bioquest-forest/collision.json');
  const world = new MapCollisionWorld(collision);
  const defaultSpawn = manifest.spawnPoints[manifest.defaultSpawnPoint];
  assert.equal(defaultSpawn.position[0], collision.spawn.x);
  assert.equal(defaultSpawn.position[2], collision.spawn.z);
  for (const point of Object.values({ ...manifest.anchors, ...manifest.spawnPoints })) {
    assert.equal(world.isFree(point.position[0], point.position[2]), true);
    assert.ok(Math.abs(world.groundHeight(point.position[0], point.position[2]) - point.position[1]) < 0.02);
  }
});

test('forest coastline keeps repeated movement inside the island in cardinal and diagonal directions', async () => {
  const { collision } = await forestFixtures();
  const coastlineOnly = { ...collision, boxes: [] };
  const directions = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ] as const;

  for (const [dx, dz] of directions) {
    const world = new MapCollisionWorld(coastlineOnly);
    let position = { x: 0, z: 0 };
    for (let step = 0; step < 500; step += 1) {
      position = world.move(position, dx * 0.08, dz * 0.08);
      assert.equal(world.isFree(position.x, position.z), true, `escaped island while moving ${dx},${dz}`);
    }
  }
});

test('diagonal movement projects onto the coastline instead of crossing it', () => {
  const collision: MapCollisionData = {
    version: 1,
    bounds: { minX: -5, maxX: 5, minZ: -5, maxZ: 5 },
    island: { outline: [{ x: -4, z: -4 }, { x: 4, z: -4 }, { x: 4, z: 4 }, { x: -4, z: 4 }] },
    spawn: { x: 0, z: 0 },
    boxes: [],
    ground: { xs: [-5, 5], ys: [-5, 5], heights: [[0, 0], [0, 0]] },
  };
  const world = new MapCollisionWorld(collision, 0.3);
  const start = { x: 3.69, z: 0 };
  const result = world.move(start, 0.2, 0.2);

  assert.ok(result.z > start.z, 'expected movement along the coastline');
  assert.ok(result.x <= start.x + 0.001, 'expected outward movement to be removed');
  assert.equal(world.isFree(result.x, result.z), true);
});

test('unknown map ids, URLs, and path traversal are rejected', async () => {
  assert.throws(() => assertMapEnvironmentId('https://example.com/map.glb'), /Unknown environment_id/);
  assert.throws(() => assertMapEnvironmentId('../bioquest-forest'), /Unknown environment_id/);
  const raw = await readJson('public/worlds/bioquest-forest/map.config.json');
  raw.modelPath = '/worlds/bioquest-forest/../secret.glb';
  assert.throws(() => validateMapManifest(raw, 'bioquest-forest'), /unsafe asset path/);
});

test('registered map resource failure safely falls back to procedural terrain', async () => {
  const { manifest, collision } = await forestFixtures();
  const config = baseConfig();
  config.environment.environment_id = 'bioquest-forest';
  config.assets[0].anchor = 'learning-clearing';
  const runtime = await loadMapRuntime(config, fixtureFetcher(manifest, collision, false));
  assert.equal(runtime.kind, 'procedural');
  assert.match(runtime.fallbackMessage ?? '', /safe procedural terrain/i);
});

test('anchor placement uses collision ground plus offset and stays in bounds', async () => {
  const { manifest, collision } = await forestFixtures();
  const config = baseConfig();
  config.environment.environment_id = 'bioquest-forest';
  config.environment.spawn_point = 'trail-start';
  config.assets[0].anchor = 'learning-clearing';
  config.assets[0].offset = [1, 0.75, 1];
  const requested: string[] = [];
  const fetcher = fixtureFetcher(manifest, collision);
  const runtime = await loadMapRuntime(config, async (path, init) => {
    requested.push(path);
    return fetcher(path, init);
  });
  assert.equal(runtime.kind, 'physical');
  if (runtime.kind !== 'physical') return;
  const world = new MapCollisionWorld(collision);
  assert.deepEqual(runtime.assetPositions.marker, [1, world.groundHeight(1, 1) + 0.75, 1]);
  assert.deepEqual(requested, [
    '/worlds/bioquest-forest/map.config.json',
    '/worlds/bioquest-forest/collision.json',
    '/worlds/bioquest-forest/forest-web.glb',
  ]);
});

test('physical maps reject absolute-only lesson placement and fall back safely', async () => {
  const { manifest, collision } = await forestFixtures();
  const config = baseConfig();
  config.environment.environment_id = 'bioquest-forest';
  const runtime = await loadMapRuntime(config, fixtureFetcher(manifest, collision));
  assert.equal(runtime.kind, 'procedural');
  assert.match(runtime.fallbackMessage ?? '', /needs an anchor/);
});

test('legacy lessons remain procedural and preserve absolute asset positions', async () => {
  const config = baseConfig();
  const runtime = await loadMapRuntime(config);
  assert.equal(runtime.kind, 'procedural');
  const resolved = { ...config, environment: { ...config.environment, skybox_url: '' }, assets: [{ ...config.assets[0], model_url: '' }] };
  assert.deepEqual(applyMapRuntime(resolved, runtime).assets[0].position, [4, 2, -3]);
});

test('development forest example is explicit and fully anchored', async () => {
  const example = await readJson('data/map-examples/bioquest-forest.example.json') as GameConfig;
  assert.equal(example.environment.environment_id, 'bioquest-forest');
  assert.ok(example.assets.every((asset) => asset.anchor));
});

test('forest preview is available only in local development', async () => {
  assert.equal(isDevelopmentMapPreviewAvailable('development'), true);
  assert.equal(isDevelopmentMapPreviewAvailable('production'), false);
  assert.equal(isDevelopmentMapPreviewAvailable('test'), false);

  const route = await readFile('app/dev/map-preview/bioquest-forest/page.tsx', 'utf8');
  assert.match(route, /bioquest-forest\.example\.json/);
  assert.match(route, /<PlayExperience/);
  assert.doesNotMatch(route, /loadGameConfig|supabase|\/api\//i);
});
