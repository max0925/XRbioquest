"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ViewScenePage() {
  const params = useParams();
  const [sceneData, setSceneData] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadScene = async () => {
      try {
        const id = params.id as string;

        // Fetch scene from API
        const response = await fetch(`/api/scenes/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load scene');
        }

        setSceneData(data.data);
      } catch (err: any) {
        console.error('Failed to load scene:', err);
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

      // Load aframe-transformer-component
      if (!document.querySelector('script[src*="aframe-transformer-component"]')) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/aframe-transformer-component@1.2.0/dist/aframe-transformer-component.min.js';
        script.async = false;
        document.head.appendChild(script);
      }

      const timer = setTimeout(() => {
        setReady(true);
      }, 150);
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

  return (
    <div className="h-screen w-screen bg-black">
      <a-scene
        embedded
        vr-mode-ui="enabled: true"
        renderer="antialias: true; colorManagement: true;"
      >
        {/* Environment */}
        {sceneData.environment?.modelPath ? (
          <>
            <a-gltf-model
              src={sceneData.environment.modelPath}
              position={`${sceneData.environment.position?.x || 0} ${sceneData.environment.position?.y || 0} ${sceneData.environment.position?.z || 0}`}
              rotation={`${sceneData.environment.rotation?.x || 0} ${sceneData.environment.rotation?.y || 0} ${sceneData.environment.rotation?.z || 0}`}
              scale={`${sceneData.environment.scale || 1} ${sceneData.environment.scale || 1} ${sceneData.environment.scale || 1}`}
              shadow="receive: true"
            ></a-gltf-model>
            <a-entity
              geometry="primitive: plane; width: 50; height: 50"
              rotation="-90 0 0"
              position="0 0 0"
              material="color: #1a1a1a; roughness: 0.9"
              shadow="receive: true"
              visible="false"
            ></a-entity>
          </>
        ) : (
          <a-entity environment="preset: default; seed: 42; shadow: true; lighting: point; grid: dots; gridColor: #333; playArea: 1.2;"></a-entity>
        )}

        {/* Models */}
        {sceneData.models?.map((model, idx) => {
          const pos = model.position || { x: (idx * 2) - 1, y: 1, z: -3 };
          const rot = model.rotation || { x: 0, y: 0, z: 0 };
          const scale = model.scale || 1;

          return (
            <a-entity
              key={model.uid || idx}
              position={`${pos.x} ${pos.y} ${pos.z}`}
              rotation={`${rot.x} ${rot.y} ${rot.z}`}
              scale={`${scale} ${scale} ${scale}`}
              {...(model.interactionFX?.grabbable && { grabbable: '' })}
              {...(model.interactionFX?.glowPulse && { 'glow-pulse': '' })}
              {...(model.interactionFX?.collisionTrigger && { 'collision-trigger': '' })}
            >
              {model.modelPath ? (
                <a-gltf-model
                  src={model.modelPath}
                  shadow="cast: true; receive: true"
                ></a-gltf-model>
              ) : (
                <a-entity
                  geometry="primitive: sphere; radius: 0.4"
                  material="color: #10b981; roughness: 0.4; metalness: 0.3"
                  shadow="cast: true"
                ></a-entity>
              )}

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
                text={`value: ${model.name}; align: center; width: 3; color: #FFF; font: kelsonsans`}
              ></a-entity>
            </a-entity>
          );
        })}

        {/* Lighting */}
        <a-entity light="type: ambient; intensity: 0.5"></a-entity>
        <a-entity light="type: directional; intensity: 0.6; castShadow: true" position="-1 3 1"></a-entity>

        {/* Camera with WASD controls */}
        <a-entity
          id="camera-rig"
          position="0 1.6 5"
        >
          <a-camera
            look-controls="pointerLockEnabled: false; reverseMouseDrag: false; touchEnabled: true;"
            wasd-controls="acceleration: 65"
          >
            <a-entity
              position="0 0 -1"
              geometry="primitive: ring; radiusInner: 0.005; radiusOuter: 0.01"
              material="color: white; shader: flat; opacity: 0.5"
            ></a-entity>
          </a-camera>
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
