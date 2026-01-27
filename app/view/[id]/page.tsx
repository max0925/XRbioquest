"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

// ═══════════════════════════════════════════════════════════════════════════
// SAFE TESTING MODE - CORS proxy functions disabled (using local assets only)
// ═══════════════════════════════════════════════════════════════════════════
// const PROXY_DOMAINS = ['assets.meshy.ai', 'api.meshy.ai', 'meshy.ai', 'blockadelabs', 's3.amazonaws.com', 'storage.googleapis.com', 'cloudfront.net'];
// function shouldProxy(url: string | null | undefined): boolean {
//   if (!url) return false;
//   return PROXY_DOMAINS.some(domain => url.includes(domain));
// }
// function proxyUrl(url: string | null | undefined): string | null {
//   if (!url) return null;
//   if (shouldProxy(url)) {
//     return `/api/proxy?url=${encodeURIComponent(url)}`;
//   }
//   return url;
// }

// Safe scale validation
const safeScale = (scale: number | undefined | null): number => {
  if (scale === null || scale === undefined || !isFinite(scale) || scale <= 0) {
    return 1;
  }
  return Math.max(0.001, Math.min(1000, scale));
};

export default function ViewScenePage() {
  const params = useParams();
  const [sceneData, setSceneData] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadScene = async () => {
      try {
        const id = params.id as string;
        const response = await fetch(`/api/scenes/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load scene');
        }

        setSceneData(data.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load scene');
      }
    };

    loadScene();
  }, [params.id]);

  useEffect(() => {
    if (typeof window !== "undefined" && sceneData) {
      if (!window.AFRAME) {
        require("aframe");
        require("aframe-environment-component");
        require("aframe-extras");
      }

      if (!document.querySelector('script[src*="aframe-transformer-component"]')) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/aframe-transformer-component@1.2.0/dist/aframe-transformer-component.min.js';
        script.async = false;
        document.head.appendChild(script);
      }

      const timer = setTimeout(() => setReady(true), 150);
      return () => clearTimeout(timer);
    }
  }, [sceneData]);

  if (error) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-black text-red-500 mb-4 uppercase">Error Loading Scene</h1>
          <p className="text-gray-400">{error}</p>
          <p className="text-gray-600 text-sm mt-4">Scene ID: {params.id}</p>
        </div>
      </div>
    );
  }

  if (!sceneData || !ready) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-emerald-500 font-black uppercase tracking-widest text-xs">Loading VR Scene...</p>
        </div>
      </div>
    );
  }

  // SAFE TESTING MODE - Ignore database environment
  // const env = sceneData.environment;
  // const isAISkybox = env?.type === 'environment-ai' || env?.imagePath;
  // const envModelPath = proxyUrl(env?.modelPath);
  // const envImagePath = proxyUrl(env?.imagePath);

  return (
    <div className="h-screen w-screen bg-black">
      <a-scene
        embedded
        vr-mode-ui="enabled: true"
        renderer="antialias: true; colorManagement: true; physicallyCorrectLights: true"
      >
        {/* SAFE TESTING MODE - Simple dark sky (no database environment) */}
        <a-sky color="#1a1a1a"></a-sky>

        {/* SAFE TESTING MODE - All models use local microscope.glb */}
        {sceneData.models?.map((model: any, idx: number) => {
          const pos = model.position || { x: (idx * 2) - 1, y: 1, z: -3 };
          const rot = model.rotation || { x: 0, y: 0, z: 0 };
          const scale = safeScale(model.scale);
          // Force all models to use local asset (ignore model.modelPath)
          const modelPath = "/models/microscope.glb";

          return (
            <a-entity
              key={model.uid || idx}
              position={`${pos.x} ${pos.y} ${pos.z}`}
              rotation={`${rot.x} ${rot.y} ${rot.z}`}
              scale={`${scale} ${scale} ${scale}`}
              geometry="primitive: box; width: 0.5; height: 0.6; depth: 0.5"
              material="visible: false"
              className="clickable"
              {...(model.interactionFX?.grabbable && { grabbable: '' })}
              {...(model.interactionFX?.collisionTrigger && { 'collision-trigger': '' })}
              {...(model.interactionFX?.glowPulse && { 'glow-pulse': '' })}
            >
              {/* Child Model - Visual only, offset downward */}
              <a-gltf-model
                src={modelPath}
                position="0 -0.3 0"
                crossorigin="anonymous"
                shadow="cast: true; receive: true"
              ></a-gltf-model>

              {/* Shadow base */}
              <a-entity
                geometry="primitive: circle; radius: 0.45"
                rotation="-90 0 0"
                position="0 -0.99 0"
                material="color: #000; opacity: 0.15; transparent: true"
              ></a-entity>

              {/* Label */}
              <a-entity
                position="0 -0.7 0"
                text={`value: ${model.name || 'Model'}; align: center; width: 3; color: #FFF; font: kelsonsans`}
              ></a-entity>
            </a-entity>
          );
        })}

        {/* PBR-optimized Scene Lighting */}
        <a-entity light="type: ambient; color: #ffffff; intensity: 0.6"></a-entity>
        <a-entity
          light="type: directional; color: #ffffff; intensity: 0.8; castShadow: true; shadowMapWidth: 2048; shadowMapHeight: 2048"
          position="2 4 2"
        ></a-entity>
        <a-entity
          light="type: directional; color: #b4c6e0; intensity: 0.3"
          position="-2 2 -2"
        ></a-entity>
        <a-entity light="type: hemisphere; color: #ffffff; groundColor: #444444; intensity: 0.4"></a-entity>

        {/* VR Camera Rig with Hand Controllers */}
        <a-entity id="camera-rig" movement-controls="speed: 0.15; fly: false; camera: #head" position="0 0 5">
          {/* Head with Camera */}
          <a-entity
            id="head"
            camera
            position="0 1.6 0"
            look-controls="pointerLockEnabled: false; reverseMouseDrag: false; touchEnabled: true"
            wasd-controls="acceleration: 65"
          >
            <a-entity
              position="0 0 -1"
              geometry="primitive: ring; radiusInner: 0.005; radiusOuter: 0.01"
              material="color: white; shader: flat; opacity: 0.5"
            ></a-entity>
          </a-entity>

          {/* Left Hand Controller */}
          <a-entity
            tracked-controls="hand: left"
            hand-controls="hand: left; handModelStyle: lowPoly"
            laser-controls="hand: left"
            raycaster="objects: .clickable; far: 5"
          ></a-entity>

          {/* Right Hand Controller */}
          <a-entity
            tracked-controls="hand: right"
            hand-controls="hand: right; handModelStyle: lowPoly"
            laser-controls="hand: right"
            raycaster="objects: .clickable; far: 5"
          ></a-entity>
        </a-entity>
      </a-scene>

      {/* VR Enter Button Overlay */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="bg-black/60 backdrop-blur px-6 py-3 rounded-2xl border border-emerald-500/30 text-emerald-500 text-xs font-black uppercase tracking-widest shadow-2xl">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            VR Ready - Click VR Button to Enter
          </span>
        </div>
      </div>

      {/* Info Badge */}
      <div className="fixed top-5 left-5 z-50 bg-black/60 backdrop-blur px-4 py-2 rounded-xl border border-white/10 text-white text-[9px] font-black uppercase tracking-widest">
        XRbioquest VR Viewer
      </div>
    </div>
  );
}
