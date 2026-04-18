// @ts-nocheck
'use client';

import type { NPCConfig } from '@/types/game-config';

interface NPCEntityProps {
  npc: NPCConfig;
}

/**
 * Renders the AI NPC guide as a floating emerald orb with a rotating ring.
 * The `config-npc-entity` A-Frame component handles:
 *   - Proximity detection → shows "Press T to talk" hint within 3 units
 *   - Click → dispatches `play-npc-talk` custom event
 *   - Hover → glow scale animation
 */
export function NPCEntity({ npc }: NPCEntityProps) {
  const [x, y, z] = npc.spawn_position;
  const posStr = `${x} ${y} ${z}`;

  return (
    <a-entity
      config-npc-entity=""
      position={posStr}
      scale="1.2 1.2 1.2"
      class="clickable cursor-listener intangible"
    >
      {/* Floating emerald orb — gently bobs up/down */}
      <a-sphere
        radius="0.25"
        material="color: #10b981; emissive: #10b981; emissiveIntensity: 0.55; shader: standard"
        animation__bob="property: position; to: 0 0.18 0; dir: alternate; loop: true; dur: 2000; easing: easeInOutSine"
      ></a-sphere>

      {/* Rotating ring around the orb */}
      <a-torus
        radius="0.38"
        radius-tubular="0.025"
        material="color: #34d399; emissive: #34d399; emissiveIntensity: 0.45; shader: flat"
        animation__spin="property: rotation; to: 0 360 0; loop: true; dur: 4000; easing: linear"
      ></a-torus>

      {/* Outer glow halo */}
      <a-sphere
        radius="0.3"
        material="color: #10b981; emissive: #10b981; emissiveIntensity: 0.2; transparent: true; opacity: 0.18; shader: flat"
        animation__pulse="property: scale; to: 1.2 1.2 1.2; dir: alternate; loop: true; dur: 1800; easing: easeInOutSine"
      ></a-sphere>

      {/* Name label above the orb */}
      <a-text
        value={npc.name}
        align="center"
        color="#34d399"
        width="3"
        position="0 0.65 0"
      ></a-text>

      {/* "Press T to talk" hint — toggled by config-npc-entity tick */}
      <a-text
        data-npc-hint="1"
        value="[ Press T to talk ]"
        align="center"
        color="#a7f3d0"
        width="2.8"
        position="0 -0.55 0"
        visible="false"
      ></a-text>
    </a-entity>
  );
}
