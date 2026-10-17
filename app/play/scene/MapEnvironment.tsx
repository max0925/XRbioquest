// @ts-nocheck
'use client';

import { useEffect, useRef, useState } from 'react';
import type { MapRuntime } from '@/types/map-config';

interface MapEnvironmentProps {
  runtime: Extract<MapRuntime, { kind: 'physical' }>;
  onError: (message: string) => void;
}

/** Visual runtime for a validated, registered physical map. */
export function MapEnvironment({ runtime, onError }: MapEnvironmentProps) {
  const modelRef = useRef<HTMLElement | null>(null);
  const [showCollision, setShowCollision] = useState(false);
  const { manifest } = runtime;

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || !manifest.collisionMeshPath) return;
    setShowCollision(new URLSearchParams(window.location.search).get('debugCollision') === '1');
  }, [manifest.collisionMeshPath]);

  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;
    const handleError = () => onError(`${manifest.label} model could not be loaded.`);
    model.addEventListener('model-error', handleError);
    return () => model.removeEventListener('model-error', handleError);
  }, [manifest.label, onError]);

  return (
    <>
      <a-entity
        ref={modelRef}
        id={`${manifest.id}-environment`}
        gltf-model={`url(${manifest.modelPath})`}
        /* Forest ground contains closely layered surfaces; disabling map-level
           shadows prevents the old rectangular/z-fighting shadow artifact. */
        shadow="cast: false; receive: false"
      ></a-entity>
      {showCollision && manifest.collisionMeshPath && (
        <a-entity
          id={`${manifest.id}-collision-debug`}
          gltf-model={`url(${manifest.collisionMeshPath})`}
          shadow="cast: false; receive: false"
        ></a-entity>
      )}
      <a-sky color={manifest.defaultSky.color}></a-sky>
      <a-entity light={`type: ambient; color: ${manifest.lighting.ambient.color}; intensity: ${manifest.lighting.ambient.intensity}`}></a-entity>
      <a-entity
        light={`type: directional; color: ${manifest.lighting.directional.color}; intensity: ${manifest.lighting.directional.intensity}; castShadow: ${Boolean(manifest.lighting.directional.castShadow)}`}
        position={(manifest.lighting.directional.position ?? [5, 10, 5]).join(' ')}
      ></a-entity>
      {manifest.lighting.hemisphere && (
        <a-entity light={`type: hemisphere; color: ${manifest.lighting.hemisphere.color}; groundColor: ${manifest.lighting.hemisphere.groundColor}; intensity: ${manifest.lighting.hemisphere.intensity}`}></a-entity>
      )}
    </>
  );
}
