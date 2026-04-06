// @ts-nocheck
'use client';

import { useEffect } from 'react';
import type { ResolvedGameConfig, PhaseConfig, ResolvedAsset } from '@/types/game-config';
import { NPCEntity } from './NPCEntity';

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

  // ── Active delivery target for highlighting ─────────────────────────────
  const snapTargetId = getDragTargetAssetId(phase, chainStep);
  const isDeliveryPhase = phase.type === 'drag' || phase.type === 'drag-multi' || phase.type === 'drag-chain';

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
      {/* ── NPC guide entity (rendered when config includes an npc) ── */}
      {config.npc && <NPCEntity npc={config.npc} />}

      {assetsToRender.map((asset) => {
        const isClickTarget = asset.id === clickTargetId;
        const isSnapTarget = asset.id === snapTargetId;
        const isTarget = isClickTarget || isSnapTarget;
        const isDraggable = asset.role === 'draggable';
        const hasModel = !!asset.model_url;
        const isPlaceholder = (asset as any).model_source === 'placeholder' || (asset as any).model_source === 'primitive';

        if (!hasModel) {
          console.log(`[GameAssets] "${asset.id}" — placeholder sphere, color=${(asset as any).primitive_color || 'default'}`);
        }

        const posStr = `${asset.position[0]} ${asset.position[1]} ${asset.position[2]}`;
        const proxiedUrl = hasModel ? proxyModelUrl(asset.model_url) : '';

        const isDeliveryTarget = isDeliveryPhase && asset.id === snapTargetId;

        return (
          <a-entity
            key={asset.id}
            data-asset-id={asset.id}
            data-base-y={String(asset.position[1])}
            data-asset-name={asset.name}
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
            // Bounding sphere for raycasting
            geometry={
              isDraggable
                ? 'primitive: sphere; radius: 0.6'
                : 'primitive: sphere; radius: 1.5'
            }
            material={
              isDraggable
                ? 'color: #F59E0B; opacity: 0.15; transparent: true'
                : 'opacity: 0.001; transparent: true; side: double'
            }
            class={`clickable grabbable cursor-listener`}
            // Config-driven click component (active for non-draggable assets)
            {...(!isDraggable && {
              'config-clickable': '',
              'config-delivery-point': ''
            })}
            // Collect-to-inventory component (active for draggable/collectible assets)
            {...(isDraggable && {
              'config-collectible': '',
              'config-collectible-beacon': ''
            })}
          >
            {/* ── GLTF model (if URL is resolved) ── */}
            {hasModel && (
              <a-gltf-model
                src={proxiedUrl}
                config-auto-scale="target: 1.2"
                position="0 0 0"
                crossorigin="anonymous"
                shadow="cast: true; receive: true"
                class="clickable"
                data-asset-id={asset.id}
                {...(!isDraggable && { 'config-clickable': '' })}
                {...(isDraggable && { 'config-collectible': '' })}
              ></a-gltf-model>
            )}

            {/* ── Placeholder sphere for missing models / placeholder assets ── */}
            {!hasModel && (() => {
              const pColor = (asset as any).primitive_color || (isDraggable ? '#94A3B8' : '#4A5568');
              return (
                <>
                  <a-sphere
                    radius="0.6"
                    material={`color: ${pColor}; opacity: 0.85; transparent: true; emissive: ${pColor}; emissiveIntensity: 0.3`}
                    shadow="cast: true"
                    position="0 0 0"
                    animation="property: components.material.material.emissiveIntensity; from: 0.1; to: 0.6; dir: alternate; dur: 1500; loop: true; easing: easeInOutSine"
                  ></a-sphere>
                  {/* Name label above the sphere */}
                  <a-entity
                    position="0 1 0"
                    text={`value: ${asset.name}; align: center; width: 4; color: #FFFFFF; font: kelsonsans`}
                    look-at="[camera]"
                  ></a-entity>
                </>
              );
            })()}

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
