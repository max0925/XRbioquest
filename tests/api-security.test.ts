import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolveAuthenticatedUser } from '../lib/api/auth-policy.ts';
import {
  canReadGameExperience,
  publicationUpdate,
  verifyGameConfigOwner,
} from '../lib/api/game-config-access.ts';
import type { User } from '@supabase/supabase-js';

const user = { id: 'user-1' } as unknown as User;

test('authentication accepts a verified Supabase user', async () => {
  const result = await resolveAuthenticatedUser(async () => ({
    data: { user },
    error: null,
  }));
  assert.equal(result?.id, 'user-1');
});

test('authentication rejects missing, errored, and failed sessions', async () => {
  assert.equal(await resolveAuthenticatedUser(async () => ({ data: { user: null }, error: null })), null);
  assert.equal(await resolveAuthenticatedUser(async () => ({ data: { user }, error: new Error('invalid') })), null);
  assert.equal(await resolveAuthenticatedUser(async () => { throw new Error('failed'); }), null);
});

test('ownership permits only the game config owner', async () => {
  const lookup = async () => ({ user_id: 'user-1' });
  assert.equal(await verifyGameConfigOwner('user-1', 'game-1', lookup), true);
  assert.equal(await verifyGameConfigOwner('user-2', 'game-1', lookup), false);
});

test('ownership rejects anonymous legacy and missing game configs', async () => {
  assert.equal(await verifyGameConfigOwner('user-1', 'game-1', async () => ({ user_id: null })), false);
  assert.equal(await verifyGameConfigOwner('user-1', 'missing', async () => null), false);
});

test('critical paid and write routes invoke the shared authentication guard', async () => {
  const routes = [
    'app/api/update-game-config/route.ts',
    'app/api/generate-skybox/route.ts',
    'app/api/assemble-game/route.ts',
    'app/api/edit-game/route.ts',
    'app/api/npc-chat/route.ts',
    'app/api/ai/generate-env/route.ts',
    'app/api/ai/generate-model/route.ts',
    'app/api/ai/refine-model/route.ts',
    'app/api/ai/upload-skybox/route.ts',
    'app/api/assets/import/route.ts',
    'app/api/assets/download/route.ts',
    'app/api/scenes/save/route.ts',
  ];

  for (const route of routes) {
    const source = await readFile(route, 'utf8');
    assert.match(source, /requireApiUser\(\)/, `${route} must require authentication`);
  }
});

test('game-config mutations constrain writes by authenticated owner', async () => {
  for (const route of ['app/api/update-game-config/route.ts', 'app/api/generate-skybox/route.ts']) {
    const source = await readFile(route, 'utf8');
    assert.match(source, /userOwnsGameConfig/, `${route} must verify ownership`);
    assert.match(source, /\.eq\('user_id', user\.id\)/, `${route} must constrain the write by owner`);
  }
});

test('private drafts are readable only by their owner through access-controlled paths', () => {
  const draft = { user_id: 'owner-1', visibility: 'draft' as const };
  assert.equal(canReadGameExperience('owner-1', draft), true);
  assert.equal(canReadGameExperience('other-user', draft), false);
  assert.equal(canReadGameExperience(null, draft), false);
});

test('published and legacy experiences remain publicly readable', () => {
  assert.equal(canReadGameExperience(null, { user_id: 'owner-1', visibility: 'published' }), true);
  assert.equal(canReadGameExperience(null, { user_id: null, visibility: null }), true);
});

test('owner publication changes map draft and published state consistently', () => {
  assert.deepEqual(publicationUpdate('published'), { visibility: 'published', is_published: true });
  assert.deepEqual(publicationUpdate('draft'), { visibility: 'draft', is_published: false });
});

test('all P1a mutation routes reject unauthenticated requests before mutation', async () => {
  for (const route of [
    'app/api/game-configs/route.ts',
    'app/api/game-configs/[id]/route.ts',
    'app/api/game-configs/[id]/publication/route.ts',
    'app/api/update-game-config/route.ts',
  ]) {
    const source = await readFile(route, 'utf8');
    assert.match(source, /requireApiUser\(\)/, `${route} must require authentication`);
  }
});

test('workspace publication UI uses the owner endpoint and gates student sharing', async () => {
  const source = await readFile('app/workspace/[id]/page.tsx', 'utf8');

  assert.match(source, /body: JSON\.stringify\(\{ visibility: nextVisibility \}\)/);
  assert.match(source, /visibility === 'published' \? 'draft' : 'published'/);
  assert.match(source, /if \(visibility !== 'published'\)/);
  assert.match(source, /Publish this experience before sharing it with students\./);

  const shareGate = source.indexOf("if (visibility !== 'published')");
  const clipboardWrite = source.indexOf('navigator.clipboard.writeText');
  assert.ok(shareGate >= 0 && clipboardWrite > shareGate, 'clipboard use must follow the published-state gate');
});

test('structured and AI lesson editing require trusted teacher role and ownership', async () => {
  for (const route of ['app/api/game-configs/[id]/route.ts', 'app/api/update-game-config/route.ts', 'app/api/edit-game/route.ts']) {
    const source = await readFile(route, 'utf8');
    assert.match(source, /getClassroomRole\([^)]*user\) !== 'teacher'/, `${route} must require app_metadata teacher role`);
  }
  const structuredRoute = await readFile('app/api/game-configs/[id]/route.ts', 'utf8');
  assert.match(structuredRoute, /canMutateGameExperience\(user\.id, record\)/);
  assert.match(structuredRoute, /\.eq\('user_id', user\.id\)/);
});
