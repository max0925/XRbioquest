// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

// ═══════════════════════════════════════════════════════════════════════════
// CORS PROXY - Wrap external URLs to load AI-generated assets
// ═══════════════════════════════════════════════════════════════════════════
const PROXY_DOMAINS = ['assets.meshy.ai', 'api.meshy.ai', 'meshy.ai', 'blockadelabs', 's3.amazonaws.com', 'storage.googleapis.com', 'cloudfront.net'];

function shouldProxy(url: string | null | undefined): boolean {
  if (!url) return false;
  return PROXY_DOMAINS.some(domain => url.includes(domain));
}

function proxyUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (shouldProxy(url)) {
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

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

      // Register simple-grab component for VR hand grabbing
      if (window.AFRAME && !window.AFRAME.components['simple-grab']) {
        window.AFRAME.registerComponent('simple-grab', {
          init: function() {
            this.grabbedTarget = null;
            this.onTriggerDown = this.onTriggerDown.bind(this);
            this.onTriggerUp = this.onTriggerUp.bind(this);
          },
          play: function() {
            this.el.addEventListener('triggerdown', this.onTriggerDown);
            this.el.addEventListener('triggerup', this.onTriggerUp);
          },
          pause: function() {
            this.el.removeEventListener('triggerdown', this.onTriggerDown);
            this.el.removeEventListener('triggerup', this.onTriggerUp);
          },
          onTriggerDown: function() {
            const raycaster = this.el.components.raycaster;
            if (raycaster && raycaster.intersections.length > 0) {
              const intersection = raycaster.intersections[0];
              let target = intersection.object.el;

              // Find the clickable parent entity
              while (target && !target.classList.contains('clickable')) {
                target = target.parentElement;
              }

              if (target && target.classList.contains('clickable')) {
                this.grabbedTarget = target;
                // Attach target to hand
                this.el.object3D.attach(target.object3D);
              }
            }
          },
          onTriggerUp: function() {
            if (this.grabbedTarget) {
              const sceneEl = this.el.sceneEl;
              // Release back to scene
              sceneEl.object3D.attach(this.grabbedTarget.object3D);
              this.grabbedTarget = null;
            }
          }
        });
      }

      const timer = setTimeout(() => setReady(true), 150);
      return () => clearTimeout(timer);
    }
  }, [sceneData]);

  // Handle wrist menu toggle and button clicks
  useEffect(() => {
    if (!ready) return;

    const handleMenuClick = () => {
      const menuPanel = document.getElementById('wrist-menu-panel');
      if (menuPanel) {
        const isVisible = menuPanel.getAttribute('visible') === 'true';
        menuPanel.setAttribute('visible', String(!isVisible));
      }
    };

    const handleMenuButtonClick = (e: Event) => {
      const target = e.target as Element;
      const action = target.getAttribute('data-action');
      if (action) {
        console.log('[VR MENU] Action:', action);
        // Close menu after action
        const menuPanel = document.getElementById('wrist-menu-panel');
        if (menuPanel) {
          menuPanel.setAttribute('visible', 'false');
        }
      }
    };

    // Wait for A-Frame to be ready
    const setupListeners = () => {
      const watchText = document.querySelector('#wrist-watch a-text');
      if (watchText) {
        watchText.addEventListener('click', handleMenuClick);
      }

      const menuButtons = document.querySelectorAll('.menu-btn');
      menuButtons.forEach(btn => {
        btn.addEventListener('click', handleMenuButtonClick);
      });
    };

    const timer = setTimeout(setupListeners, 500);
    return () => clearTimeout(timer);
  }, [ready]);

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

  // Determine environment type and URLs (proxy external URLs)
  const env = sceneData.environment;
  const isAISkybox = env?.type === 'environment-ai' || env?.imagePath;
  const envModelPath = proxyUrl(env?.modelPath);
  const envImagePath = proxyUrl(env?.imagePath);

  return (
    <div className="h-screen w-screen bg-black">
      <a-scene
        embedded
        vr-mode-ui="enabled: true"
        renderer="antialias: true; colorManagement: true; physicallyCorrectLights: true"
      >
        {/* Environment - Handle both GLTF environments and AI Skyboxes */}
        {isAISkybox && envImagePath ? (
          // AI-generated 360 skybox
          <a-sky
            src={envImagePath}
            rotation={`${env?.rotation?.x || 0} ${env?.rotation?.y || -130} ${env?.rotation?.z || 0}`}
          ></a-sky>
        ) : envModelPath ? (
          // GLTF environment model
          <>
            <a-gltf-model
              src={envModelPath}
              crossorigin="anonymous"
              position={`${env?.position?.x || 0} ${env?.position?.y || 0} ${env?.position?.z || 0}`}
              rotation={`${env?.rotation?.x || 0} ${env?.rotation?.y || 0} ${env?.rotation?.z || 0}`}
              scale={`${safeScale(env?.scale)} ${safeScale(env?.scale)} ${safeScale(env?.scale)}`}
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
          // Default fallback environment
          <a-entity environment="preset: default; seed: 42; shadow: true; lighting: point; grid: dots; gridColor: #333; playArea: 1.2;"></a-entity>
        )}

        {/* Models - Render AI-generated models only (no fallback) */}
        {sceneData.models?.map((model: any, idx: number) => {
          const pos = model.position || { x: (idx * 2) - 1, y: 1, z: -3 };
          const rot = model.rotation || { x: 0, y: 0, z: 0 };
          const scale = safeScale(model.scale);
          // Use AI model path only - no fallback
          const modelPath = proxyUrl(model.modelPath);

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
              {/* Child Model - Only render if AI model path exists */}
              {modelPath && (
                <a-gltf-model
                  src={modelPath}
                  position="0 -0.3 0"
                  crossorigin="anonymous"
                  shadow="cast: true; receive: true"
                ></a-gltf-model>
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

          {/* Left Hand Controller with Wrist Watch Menu */}
          <a-entity id="left-hand" oculus-touch-controls="hand: left">
            {/* Wrist Watch Menu Button */}
            <a-entity id="wrist-watch" position="0 0.05 0.05" rotation="-30 0 0" scale="0.4 0.4 0.4">
              <a-circle radius="0.06" color="#1a1a2e" opacity="0.95"></a-circle>
              <a-ring radius-inner="0.055" radius-outer="0.06" color="#10b981"></a-ring>
              <a-text value="MENU" align="center" color="#10b981" width="0.3" position="0 0 0.001" class="clickable"></a-text>
            </a-entity>

            {/* Wrist Menu Panel - Hidden by default */}
            <a-entity id="wrist-menu-panel" position="0 0.1 0.05" rotation="-30 0 0" scale="0.35 0.35 0.35" visible="false">
              <a-plane width="0.28" height="0.32" color="#1a1a2e" opacity="0.95"></a-plane>
              <a-plane width="0.26" height="0.003" color="#10b981" position="0 0.14 0.001"></a-plane>
              <a-text value="MENU" align="center" color="#10b981" width="0.6" position="0 0.12 0.001"></a-text>

              {/* Tasks Button */}
              <a-plane class="clickable menu-btn" data-action="tasks" width="0.24" height="0.045" color="#2d2d44" position="0 0.06 0.002"></a-plane>
              <a-text value="Tasks" align="center" color="#ffffff" width="0.5" position="0 0.06 0.003"></a-text>

              {/* Quiz Button */}
              <a-plane class="clickable menu-btn" data-action="quiz" width="0.24" height="0.045" color="#2d2d44" position="0 0.005 0.002"></a-plane>
              <a-text value="Quiz" align="center" color="#ffffff" width="0.5" position="0 0.005 0.003"></a-text>

              {/* Notes Button */}
              <a-plane class="clickable menu-btn" data-action="notes" width="0.24" height="0.045" color="#2d2d44" position="0 -0.05 0.002"></a-plane>
              <a-text value="Notes" align="center" color="#ffffff" width="0.5" position="0 -0.05 0.003"></a-text>

              {/* Settings Button */}
              <a-plane class="clickable menu-btn" data-action="settings" width="0.24" height="0.045" color="#2d2d44" position="0 -0.105 0.002"></a-plane>
              <a-text value="Settings" align="center" color="#ffffff" width="0.5" position="0 -0.105 0.003"></a-text>
            </a-entity>
          </a-entity>

          {/* Right Hand Controller */}
          <a-entity
            id="right-hand"
            oculus-touch-controls="hand: right"
            laser-controls="hand: right"
            raycaster="objects: .clickable; far: 5"
          ></a-entity>
        </a-entity>

        {/* DEBUG: Green box in world space to confirm VR rendering */}
        <a-box position="0 1.5 3" width="0.5" height="0.5" depth="0.5" color="#00ff00"></a-box>
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
