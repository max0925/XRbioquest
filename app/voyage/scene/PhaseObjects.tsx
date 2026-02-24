// @ts-nocheck
"use client";

import { useState, useEffect, useRef } from 'react';
import type { PhaseProgress } from '../components/OverlayUI';

// ═══════════════════════════════════════════════════════════════════════════
// Phase-specific A-Frame entities
// ═══════════════════════════════════════════════════════════════════════════
//
// Phase 2: Glowing light near glucose + glucose gets game-draggable
// Phase 3: 3 damaged protein spheres (draggable → Lysosome)
// Phase 4: Polypeptide chain → ER, then Processed Protein → Golgi
//
// ATP/CO2 burst animations are triggered imperatively via useEffect
// listening for phase 2 'drag-success'.
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE = 'https://tqqimwpwjnaldwuibeqf.supabase.co/storage/v1/object/public/assets';

const DAMAGED_PROTEIN_POSITIONS = [
    { x: -1, y: 1.5, z: -3 },
    { x: 0.5, y: 0.8, z: -2.5 },
    { x: 1.5, y: 1.2, z: -3.5 },
];

// Mitochondria position for ATP/CO2 burst origin
const MITO_POS = { x: -1.5, y: 1, z: -3 };

interface PhaseObjectsProps {
    currentPhase: number;
    phaseProgress: PhaseProgress | null;
}

export function PhaseObjects({ currentPhase, phaseProgress }: PhaseObjectsProps) {
    // Track which damaged proteins have been delivered (phase 3)
    const deliveredCount = phaseProgress?.count ?? 0;

    // Track chain step for phase 4
    const chainStep = phaseProgress?.step ?? 0;

    // ── Phase 2 ATP/CO2 burst (imperative — spawns A-Frame entities) ──
    const burstFired = useRef(false);

    useEffect(() => {
        if (currentPhase !== 2) {
            burstFired.current = false;
            return;
        }

        const handleBurst = () => {
            if (burstFired.current) return;
            burstFired.current = true;

            const scene = document.querySelector('a-scene');
            if (!scene) return;

            // ── 36 ATP spheres bursting outward ──
            for (let i = 0; i < 36; i++) {
                const angle = (i / 36) * Math.PI * 2;
                const r = 1.5 + Math.random() * 0.5;
                const yOffset = (Math.random() - 0.5) * 2;
                const atp = document.createElement('a-entity');

                atp.setAttribute('geometry', { primitive: 'sphere', radius: 0.04 });
                atp.setAttribute('material', {
                    color: '#3B82F6',
                    emissive: '#3B82F6',
                    emissiveIntensity: 0.6,
                    transparent: true,
                    opacity: 1,
                });
                atp.setAttribute('position', `${MITO_POS.x} ${MITO_POS.y} ${MITO_POS.z}`);
                atp.setAttribute('animation', {
                    property: 'position',
                    to: `${MITO_POS.x + Math.cos(angle) * r} ${MITO_POS.y + yOffset} ${MITO_POS.z + Math.sin(angle) * r}`,
                    dur: 2000,
                    easing: 'easeOutQuad',
                });
                atp.setAttribute('animation__fade', {
                    property: 'material.opacity',
                    from: 1,
                    to: 0,
                    dur: 1000,
                    delay: 1500,
                });

                scene.appendChild(atp);
                setTimeout(() => { try { scene.removeChild(atp); } catch (_) { } }, 3000);
            }

            // ── 6 CO2 spheres floating upward ──
            for (let i = 0; i < 6; i++) {
                const xOff = (Math.random() - 0.5) * 0.6;
                const zOff = (Math.random() - 0.5) * 0.6;
                const co2 = document.createElement('a-entity');

                co2.setAttribute('geometry', { primitive: 'sphere', radius: 0.06 });
                co2.setAttribute('material', {
                    color: '#94A3B8',
                    transparent: true,
                    opacity: 1,
                });
                co2.setAttribute('position', `${MITO_POS.x + xOff} ${MITO_POS.y} ${MITO_POS.z + zOff}`);
                co2.setAttribute('animation', {
                    property: 'position',
                    to: `${MITO_POS.x + xOff} ${MITO_POS.y + 3} ${MITO_POS.z + zOff}`,
                    dur: 3000,
                    easing: 'easeInQuad',
                });
                co2.setAttribute('animation__fade', {
                    property: 'material.opacity',
                    from: 1,
                    to: 0,
                    dur: 1000,
                    delay: 2000,
                });

                scene.appendChild(co2);
                setTimeout(() => { try { scene.removeChild(co2); } catch (_) { } }, 3500);
            }
        };

        window.addEventListener('drag-success', handleBurst);
        return () => window.removeEventListener('drag-success', handleBurst);
    }, [currentPhase]);

    return (
        <>
            {/* ═══════════════════════════════════════════════════════════════
          PHASE 2: Glowing orange point light near glucose
      ═══════════════════════════════════════════════════════════════ */}
            {currentPhase === 2 && (
                <a-entity
                    light="type: point; color: #F97316; intensity: 0.8; distance: 5; decay: 2"
                    position="1.5 2 -2"
                ></a-entity>
            )}

            {/* ═══════════════════════════════════════════════════════════════
          PHASE 3: 3 damaged protein spheres
      ═══════════════════════════════════════════════════════════════ */}
            {currentPhase === 3 && DAMAGED_PROTEIN_POSITIONS.map((pos, i) => {
                // Hide proteins that have already been delivered
                if (i < deliveredCount) return null;
                return (
                    <a-entity
                        key={`damaged-protein-${i}`}
                        position={`${pos.x} ${pos.y} ${pos.z}`}
                    >
                        <a-sphere
                            radius="0.15"
                            color="#94A3B8"
                            opacity="0.8"
                            material="transparent: true"
                            class="clickable grabbable"
                            data-name="Damaged Protein"
                            data-index={String(i)}
                            game-draggable={`name: Damaged Protein; snapDistance: 0.8`}
                        ></a-sphere>
                        {/* Pulsing glow to indicate interactivity */}
                        <a-sphere
                            radius="0.2"
                            material="color: #94A3B8; emissive: #94A3B8; emissiveIntensity: 0.4; transparent: true; opacity: 0.3"
                            animation="property: scale; to: 1.3 1.3 1.3; dir: alternate; loop: true; dur: 800; easing: easeInOutSine"
                        ></a-sphere>
                        {/* Label */}
                        <a-entity
                            position="0 -0.3 0"
                            text={`value: Protein ${i + 1}; align: center; width: 2; color: #94A3B8; font: kelsonsans`}
                        ></a-entity>
                    </a-entity>
                );
            })}

            {/* ═══════════════════════════════════════════════════════════════
          PHASE 4, Step 0: Polypeptide chain (draggable → ER)
      ═══════════════════════════════════════════════════════════════ */}
            {currentPhase === 4 && chainStep === 0 && (
                <a-entity position="-0.5 2 -3">
                    <a-gltf-model
                        src={`${SUPABASE}/keratine_chains__vlakna_keratinu.glb`}
                        scale="0.3 0.3 0.3"
                        crossorigin="anonymous"
                        class="clickable grabbable"
                        data-name="Polypeptide"
                        game-draggable="name: Polypeptide; snapDistance: 0.8"
                    ></a-gltf-model>
                    {/* Glowing ring indicator */}
                    <a-entity
                        geometry="primitive: torus; radius: 0.4; radiusTubular: 0.015"
                        material="color: #F59E0B; emissive: #F59E0B; emissiveIntensity: 0.6; transparent: true; opacity: 0.7"
                        rotation="-90 0 0"
                        animation="property: rotation; to: -90 360 0; loop: true; dur: 4000; easing: linear"
                    ></a-entity>
                    <a-entity
                        position="0 -0.5 0"
                        text="value: Polypeptide; align: center; width: 2.5; color: #F59E0B; font: kelsonsans"
                    ></a-entity>
                </a-entity>
            )}

            {/* ═══════════════════════════════════════════════════════════════
          PHASE 4, Step 1: Processed Protein (draggable → Golgi)
          Appears after polypeptide reaches ER
      ═══════════════════════════════════════════════════════════════ */}
            {currentPhase === 4 && chainStep === 1 && (
                <a-entity position="0 1 -4.5">
                    <a-sphere
                        radius="0.2"
                        color="#F59E0B"
                        material="emissive: #F59E0B; emissiveIntensity: 0.3"
                        class="clickable grabbable"
                        data-name="Processed Protein"
                        game-draggable="name: Processed Protein; snapDistance: 0.8"
                    ></a-sphere>
                    <a-sphere
                        radius="0.28"
                        material="color: #F59E0B; emissive: #F59E0B; emissiveIntensity: 0.3; transparent: true; opacity: 0.2"
                        animation="property: scale; to: 1.2 1.2 1.2; dir: alternate; loop: true; dur: 1000; easing: easeInOutSine"
                    ></a-sphere>
                    <a-entity
                        position="0 -0.4 0"
                        text="value: Processed Protein; align: center; width: 2.5; color: #F59E0B; font: kelsonsans"
                    ></a-entity>
                </a-entity>
            )}

            {/* ═══════════════════════════════════════════════════════════════
          PHASE 4, Step 2+: Vesicle (appears after Golgi delivery)
          Decorative — shows the vesicle budding off
      ═══════════════════════════════════════════════════════════════ */}
            {currentPhase === 4 && chainStep >= 2 && (
                <a-entity position="-3 1.5 -4">
                    <a-sphere
                        radius="0.15"
                        color="#10B981"
                        material="transparent: true; opacity: 0.7; emissive: #10B981; emissiveIntensity: 0.4"
                        animation="property: position; to: -3 2.5 -4; dur: 3000; easing: easeInOutSine; dir: alternate; loop: true"
                    ></a-sphere>
                    <a-entity
                        position="0 -0.3 0"
                        text="value: Vesicle; align: center; width: 2; color: #10B981; font: kelsonsans"
                    ></a-entity>
                </a-entity>
            )}
        </>
    );
}
