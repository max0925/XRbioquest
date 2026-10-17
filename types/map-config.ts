import type { MapEnvironmentId, Vec3 } from '@/types/game-config';

export type { MapEnvironmentId } from '@/types/game-config';

export interface MapLightConfig {
  color: string;
  intensity: number;
  position?: Vec3;
  castShadow?: boolean;
}

export interface MapPointConfig {
  label: string;
  position: Vec3;
}

export interface MapManifest {
  id: Exclude<MapEnvironmentId, 'procedural-terrain'>;
  label: string;
  version: number;
  modelPath: string;
  collisionPath: string;
  /** Optional real 3D collider mesh, shown only in the development debug view. */
  collisionMeshPath?: string;
  /** Optional walkable surface mesh for tooling and future navigation integrations. */
  navmeshPath?: string;
  defaultSky: {
    color: string;
    fogColor: string;
    fogDensity: number;
  };
  lighting: {
    ambient: MapLightConfig;
    directional: MapLightConfig;
    hemisphere?: MapLightConfig & { groundColor: string };
  };
  defaultSpawnPoint: string;
  spawnPoints: Record<string, MapPointConfig & { eyeHeight: number }>;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  anchors: Record<string, MapPointConfig>;
  performanceBudget: {
    maxModelBytes: number;
    maxTriangles: number;
    maxTextureSize: number;
  };
  fallback: {
    environmentId: 'procedural-terrain';
    message: string;
  };
}

export interface MapCollisionData {
  version: number;
  bounds: MapManifest['bounds'];
  island: {
    /** Clockwise or counter-clockwise coastline vertices in map-local X/Z. */
    outline: Array<{ x: number; z: number }>;
  };
  spawn: { x: number; z: number };
  boxes: Array<{
    name: string;
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  }>;
  ground: {
    xs: number[];
    ys: number[];
    heights: number[][];
  };
}

export type MapRuntime =
  | {
      kind: 'procedural';
      id: 'procedural-terrain';
      fallbackMessage?: string;
    }
  | {
      kind: 'physical';
      id: Exclude<MapEnvironmentId, 'procedural-terrain'>;
      manifest: MapManifest;
      collision: MapCollisionData;
      spawnPoint: MapPointConfig & { eyeHeight: number };
      assetPositions: Record<string, Vec3>;
    };
