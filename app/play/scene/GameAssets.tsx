// @ts-nocheck
'use client';

import { useEffect } from 'react';
import type { ResolvedGameConfig, PhaseConfig, ResolvedAsset } from '@/types/game-config';

// ─── Proxy helper (mirrors voyage's proxyUrl) ────────────────────────────────
// Supabase storage URLs load fine directly. Meshy/CDN URLs need CORS proxy.
const PROXY_DOMAINS = ['assets.meshy.ai', 'meshy.ai', 's3.amazonaws.com', 'cloudfront.net'];

function proxyModelUrl(url: string): string {
  const needsProxy = PROXY_DOMAINS.some((d) => url.includes(d));
  return needsProxy ? `/api/ai/proxy-model?url=${encodeURIComponent(url)}` : url;
}

// ─── Target detection helpers ─────────────────────────────────────────────────

function getTargetAssetId(phase: PhaseConfig): string | null {
  switch (phase.type) {
    case 'click':
      return phase.target_asset;
    case 'drag':
      return phase.drag_target;
    case 'drag-multi':
      return phase.drag_target;
    case 'drag-chain': {
      const step = phase.steps[0]; // active step is managed by chainStep in props
      return step?.drag_target ?? null;
    }
    default:
      return null;
  }
}

function getDragTargetAssetId(phase: PhaseConfig, chainStep: number): string | null {
  if (phase.type === 'drag') return phase.drag_target;
  if (phase.type === 'drag-multi') return phase.drag_target;
  if (phase.type === 'drag-chain') return phase.steps[chainStep]?.drag_target ?? null;
  return null;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface GameAssetsProps {
  config: ResolvedGameConfig;
  currentPhase: PhaseConfig;
  chainStep: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GameAssets({ config, currentPhase, chainStep }: GameAssetsProps) {
  const phase = currentPhase;

  // ── Populate window.playAssetPositions for A-Frame components ──
  // Done on every render so drag components always have fresh positions.
  useEffect(() => {
    const positions: Record<string, [number, number, number]> = {};
    for (const asset of config.assets) {
      positions[asset.id] = asset.position;
    }
    window.playAssetPositions = positions;
  });

  // ── Which assets are draggable right now ──────────────────────────────────
  //
  // drag:        the single drag_item
  // drag-multi:  all assets whose quest_phase_id === phase.id AND role='draggable'
  //              (this is the KEY rule: don't hardcode — use quest_phase_id)
  // drag-chain:  the drag_item of the CURRENT chain step
  // other:       nothing
  //
  const draggableIds = new Set<string>();
  if (phase.type === 'drag') {
    draggableIds.add(phase.drag_item);
  } else if (phase.type === 'drag-multi') {
    for (const asset of config.assets) {
      if (asset.quest_phase_id === phase.id && asset.role === 'draggable') {
        draggableIds.add(asset.id);
      }
    }
  } else if (phase.type === 'drag-chain') {
    const step = phase.steps[chainStep];
    if (step) draggableIds.add(step.drag_item);
  }

  // ── Active snap target for highlighting ──────────────────────────────────
  const snapTargetId = getDragTargetAssetId(phase, chainStep);

  // ── Click target for highlighting ────────────────────────────────────────
  const clickTargetId = phase.type === 'click' ? phase.target_asset : null;

  // ── Determine which assets to render ─────────────────────────────────────
  //
  // Always visible:
  //   role = 'target'       (organelles are always in the scene)
  //   role = 'interactive'  (same)
  //   role = 'decorative'   (background props)
  //
  // Phase-visible:
  //   role = 'draggable' → only when the asset's ID is in draggableIds
  //                        OR it's a drag-multi/drag-chain phase with matching quest_phase_id
  //                        (so all 3 damaged proteins show up during clean-cell)
  //
  const assetsToRender = config.assets.filter((asset) => {
    if (asset.role !== 'draggable') return true; // always show targets/interactive/decorative

    // Draggable: show if it belongs to the current phase
    if (asset.quest_phase_id === phase.id) return true;

    // Also show if it's explicitly in draggableIds (handles non-quest_phase_id cases)
    if (draggableIds.has(asset.id)) return true;

    return false;
  });

  return (
    <>
      {assetsToRender.map((asset) => {
        const isClickTarget = asset.id === clickTargetId;
        const isSnapTarget = asset.id === snapTargetId;
        const isTarget = isClickTarget || isSnapTarget;
        const isDraggable = asset.role === 'draggable';
        const hasModel = !!asset.model_url;

        const posStr = `${asset.position[0]} ${asset.position[1]} ${asset.position[2]}`;
        const proxiedUrl = hasModel ? proxyModelUrl(asset.model_url) : '';

        return (
          <a-entity
            key={asset.id}
            data-asset-id={asset.id}
            position={posStr}
            rotation={
              asset.rotation
                ? `${asset.rotation[0]} ${asset.rotation[1]} ${asset.rotation[2]}`
                : '0 0 0'
            }
            scale={
              asset.scale
                ? `${asset.scale} ${asset.scale} ${asset.scale}`
                : '1 1 1'
            }
            // Invisible bounding box for raycasting (draggables use sphere, targets use box)
            geometry={
              isDraggable
                ? 'primitive: sphere; radius: 0.4'
                : 'primitive: box; width: 0.5; height: 0.6; depth: 0.5'
            }
            material={
              isDraggable
                ? 'color: #F59E0B; opacity: 0.15; transparent: true'
                : 'visible: false'
            }
            class={`clickable grabbable cursor-listener`}
            // Config-driven click component (active for all non-draggable assets)
            {...(!isDraggable && { 'config-clickable': '' })}
            // Config-driven drag component (active for draggable assets)
            {...(isDraggable && {
              'config-draggable': `snapDistance: ${asset.snap_distance ?? 2.0}`
            })}
          >
            {/* ── GLTF model (if URL is resolved) ── */}
            {hasModel && (
              <a-gltf-model
                src={proxiedUrl}
                config-auto-scale="target: 0.6"
                position="0 -0.3 0"
                crossorigin="anonymous"
                shadow="cast: true; receive: true"
              ></a-gltf-model>
            )}

            {/* ── Placeholder for unresolved meshy/library assets ── */}
            {!hasModel && (
              <a-sphere
                radius="0.2"
                color={isDraggable ? '#94A3B8' : '#4A5568'}
                material="transparent: true; opacity: 0.7; emissive: #4A5568; emissiveIntensity: 0.3"
                position="0 0 0"
              ></a-sphere>
            )}

            {/* ── Drop shadow ── */}
            <a-entity
              geometry="primitive: circle; radius: 0.45"
              rotation="-90 0 0"
              position="0 -0.99 0"
              material="color: #000; opacity: 0.15; transparent: true"
            ></a-entity>

            {/* ── Label ── */}
            <a-entity
              position="0 -0.7 0"
              text={`value: ${asset.name}; align: center; width: 3; color: ${isTarget ? '#00e5ff' : '#FFF'}; font: kelsonsans`}
            ></a-entity>

            {/* ── Target indicator ring (current click or snap target) ── */}
            {isTarget && (
              <a-entity
                position="0 0 0"
                geometry="primitive: torus; radius: 0.5; radiusTubular: 0.02"
                material="color: #00e5ff; emissive: #00e5ff; emissiveIntensity: 0.8; transparent: true; opacity: 0.8"
                rotation="-90 0 0"
                animation="property: rotation; to: -90 360 0; loop: true; dur: 3000; easing: linear"
              ></a-entity>
            )}

            {/* ── Draggable glow pulse ── */}
            {isDraggable && draggableIds.has(asset.id) && (
              <a-entity
                geometry="primitive: sphere; radius: 0.45"
                material="color: #F59E0B; emissive: #F59E0B; emissiveIntensity: 0.3; transparent: true; opacity: 0.15"
                animation="property: scale; to: 1.1 1.1 1.1; dir: alternate; loop: true; dur: 1200; easing: easeInOutSine"
              ></a-entity>
            )}
          </a-entity>
        );
      })}
    </>
  );
}
