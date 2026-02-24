// @ts-nocheck
"use client";

import { ORGANELLES, proxyUrl } from '../config';
import type { PhaseInfo } from '../config';

interface OrganelleEntitiesProps {
    phaseInfo: PhaseInfo;
    currentPhase: number;
    completedPhases: Set<number>;
}

export function OrganelleEntities({ phaseInfo, currentPhase, completedPhases }: OrganelleEntitiesProps) {
    return (
        <>
            {ORGANELLES.map((organelle, idx) => {
                const isTarget = phaseInfo.target === organelle.name;
                const isGlucose = organelle.name === 'Glucose Molecule';

                // Determine target phase for this organelle (which phase needs to click it)
                let targetPhase = -1; // -1 means always clickable
                if (organelle.name === 'Mitochondria') targetPhase = 1;
                else if (organelle.name === 'Lysosome') targetPhase = 3;
                else if (organelle.name === 'Endoplasmic Reticulum') targetPhase = 4;

                // Use model path directly from ORGANELLES array
                const actualModelPath = proxyUrl(organelle.modelPath);

                return (
                    <a-entity
                        key={organelle.uid}
                        position={`${organelle.position.x} ${organelle.position.y} ${organelle.position.z}`}
                        rotation="0 0 0"
                        scale="1 1 1"
                        geometry="primitive: box; width: 0.5; height: 0.6; depth: 0.5"
                        material="visible: false"
                        class="clickable grabbable cursor-listener"
                        data-name={organelle.name}
                        game-clickable={`name: ${organelle.name}; targetPhase: ${targetPhase}`}
                        {...(isGlucose && { 'game-draggable': 'name: Glucose Molecule; snapDistance: 1.5', 'data-draggable': 'true' })}
                    >
                        {/* GLTF Model */}
                        <a-gltf-model
                            src={actualModelPath}
                            auto-scale="target: 0.6"
                            position="0 -0.3 0"
                            crossorigin="anonymous"
                            shadow="cast: true; receive: true"
                        ></a-gltf-model>

                        {/* Shadow */}
                        <a-entity
                            geometry="primitive: circle; radius: 0.45"
                            rotation="-90 0 0"
                            position="0 -0.99 0"
                            material="color: #000; opacity: 0.15; transparent: true"
                        ></a-entity>

                        {/* Label */}
                        <a-entity
                            position="0 -0.7 0"
                            text={`value: ${organelle.name}; align: center; width: 3; color: ${isTarget ? '#00e5ff' : '#FFF'}; font: kelsonsans`}
                        ></a-entity>

                        {/* Target Indicator - Glowing ring for current target */}
                        {isTarget && (
                            <a-entity
                                position="0 0 0"
                                geometry="primitive: torus; radius: 0.5; radiusTubular: 0.02"
                                material="color: #00e5ff; emissive: #00e5ff; emissiveIntensity: 0.8; transparent: true; opacity: 0.8"
                                rotation="-90 0 0"
                                animation="property: rotation; to: -90 360 0; loop: true; dur: 3000; easing: linear"
                            ></a-entity>
                        )}

                        {/* Success indicator for glucose in phase 2 */}
                        {isGlucose && completedPhases.has(2) && currentPhase === 2 && (
                            <a-entity
                                position="0 0.8 0"
                                geometry="primitive: sphere; radius: 0.1"
                                material="color: #00e5ff; emissive: #00e5ff; emissiveIntensity: 1"
                                animation="property: scale; to: 1.5 1.5 1.5; dir: alternate; loop: true; dur: 500"
                            ></a-entity>
                        )}
                    </a-entity>
                );
            })}
        </>
    );
}
