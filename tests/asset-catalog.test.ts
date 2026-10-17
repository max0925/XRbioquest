import assert from 'node:assert/strict';
import test from 'node:test';
import { matchCatalogAsset, refreshCatalogPaths } from '../lib/asset-catalog.ts';

const catalog = [
  { id: 'ribosome-uuid', name: 'Ribosome', keywords: ['ribosome'], model_url: 'https://example.com/ribosome-v2.glb' },
  { id: 'protein-uuid', name: 'Polypeptide Chain', keywords: ['polypeptide'], model_url: 'https://example.com/polypeptide.glb' },
];

test('newly registered assets are matched without a code registry', () => {
  const added = { id: 'new-uuid', name: 'New Model', keywords: ['new teaching model'], model_url: 'https://example.com/new.glb' };
  assert.equal(matchCatalogAsset({ id: 'object', search_keyword: 'new teaching model' }, [...catalog, added]), added);
});

test('explicit IDs are authoritative; missing IDs do not silently switch models', () => {
  assert.equal(matchCatalogAsset({ id: 'object', supabase_id: 'ribosome-uuid' }, catalog), catalog[0]);
  assert.equal(matchCatalogAsset({ id: 'ribosome', supabase_id: 'missing' }, catalog), undefined);
});

test('ambiguous aliases and unrelated terms do not choose arbitrary models', () => {
  assert.equal(matchCatalogAsset({ id: 'cargo', search_keyword: 'ribosome' }, [...catalog,
    { ...catalog[0], id: 'other' }]), undefined);
  assert.equal(matchCatalogAsset({ id: 'nucleus' }, catalog), undefined);
});

test('refresh uses newest URL while preserving separate interaction IDs and phases', () => {
  const config = {
    assets: [1, 2, 3].map(n => ({ id: `polypeptide-${n}`, model_source: 'library',
      supabase_id: 'protein-uuid', model_path: 'https://example.com/old.glb', role: 'draggable' })),
    phases: [{ type: 'drag-multi', total: 3, drag_item: 'polypeptide-1' }],
  };
  const refreshed = refreshCatalogPaths(config, catalog);
  assert.deepEqual(refreshed.assets.map(a => a.id), ['polypeptide-1', 'polypeptide-2', 'polypeptide-3']);
  assert.ok(refreshed.assets.every(a => a.model_path === catalog[1].model_url && a.role === 'draggable'));
  assert.equal(refreshed.phases, config.phases);
  assert.equal(config.assets[0].model_path, 'https://example.com/old.glb');
});

test('legacy URLs and missing catalog records retain saved fallback', () => {
  const assets = [
    { id: 'ribosome', model_source: 'library', model_path: 'https://example.com/legacy.glb' },
    { id: 'removed', model_source: 'library', supabase_id: 'missing', model_path: 'https://example.com/saved.glb' },
    { id: 'ribosome', model_source: 'meshy', model_path: 'https://example.com/generated.glb' },
  ];
  assert.deepEqual(refreshCatalogPaths({ assets }, catalog).assets, assets);
});
