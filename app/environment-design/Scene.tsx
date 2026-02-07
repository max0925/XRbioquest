"use client";
import { useEffect, useState, useRef } from "react";

interface AIState {
  skybox_style?: string;
  lighting_color?: string;
  channel_state: number;
  skybox_url?: string | null;
}

export default function Scene({
  sceneAssets = [],
  activeSelection,
  transformMode,
  onAssetClick,
  onAssetTransform,
  onEnvironmentLoaded,
  onLoadingStateChange,
  aiState = { skybox_style: 'Clean modern laboratory', lighting_color: '#ffffff', channel_state: 0.5, skybox_url: null }
}: {
  sceneAssets?: any[];
  activeSelection?: any;
  transformMode?: string;
  onAssetClick?: (asset: any) => void;
  onAssetTransform?: (uid: string, transform: any) => void;
  onEnvironmentLoaded?: (uid: string, box: any) => void;
  onLoadingStateChange?: (loadingModels: Map<string, number>) => void;
  aiState?: AIState;
}) {
  const [ready, setReady] = useState(false);
  const sceneRef = useRef(null);
  const [loadingModels, setLoadingModels] = useState<Map<string, number>>(new Map());

  // Notify parent of loading state changes
  useEffect(() => {
    if (onLoadingStateChange) {
      onLoadingStateChange(loadingModels);
    }
  }, [loadingModels, onLoadingStateChange]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!window.AFRAME) {
        require("aframe");
        require("aframe-environment-component");
        require("aframe-extras");
        require("super-hands");
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
        window.dispatchEvent(new Event('resize'));
      }, 150);
      return () => clearTimeout(timer);
    }
  }, []);

  // Q/E vertical movement controls
  useEffect(() => {
    if (!ready || typeof window === "undefined") return;

    const handleVerticalMovement = (evt: KeyboardEvent) => {
      const key = evt.key.toLowerCase();
      const cameraRig = document.querySelector('#camera-rig');
      if (!cameraRig) return;

      // Fix TS Error: Cast to any to access .x .y .z properties safely
      const currentPos = cameraRig.getAttribute('position') as any;
      const speed = 0.5; // Movement speed for vertical controls

      if (!currentPos) return;

      if (key === 'q') {
        // Q key: move down
        cameraRig.setAttribute('position', `${currentPos.x} ${currentPos.y - speed} ${currentPos.z}`);
      } else if (key === 'e') {
        // E key: move up
        cameraRig.setAttribute('position', `${currentPos.x} ${currentPos.y + speed} ${currentPos.z}`);
      }
    };

    window.addEventListener('keydown', handleVerticalMovement);
    return () => window.removeEventListener('keydown', handleVerticalMovement);
  }, [ready]);


  // Register Interaction FX components
  useEffect(() => {
    if (!ready || typeof window === "undefined" || !window.AFRAME) return;

    // VR Grabbable component - works with super-hands for Quest controllers
    // Uses hover-start/end and grab-start/end events from super-hands
    if (!window.AFRAME.components['vr-grabbable']) {
      window.AFRAME.registerComponent('vr-grabbable', {
        schema: {
          highlightColor: { type: 'color', default: '#10b981' },
          grabDistance: { type: 'number', default: 0.5 }
        },

        init: function() {
          this.el.classList.add('clickable');
          this.grabbed = false;
          this.hovered = false;
          this.originalParent = this.el.parentNode;
          this.grabber = null;

          // Store original material for highlight
          this.originalEmissive = null;
          this.originalEmissiveIntensity = 0;

          // Hover events from super-hands
          this.el.addEventListener('hover-start', this.onHoverStart.bind(this));
          this.el.addEventListener('hover-end', this.onHoverEnd.bind(this));

          // Grab events from super-hands
          this.el.addEventListener('grab-start', this.onGrabStart.bind(this));
          this.el.addEventListener('grab-end', this.onGrabEnd.bind(this));

          // Fallback click for desktop
          this.el.addEventListener('click', this.onClick.bind(this));

          console.log('[VR-GRABBABLE] Initialized:', this.el.getAttribute('data-name'));
        },

        onHoverStart: function(evt) {
          if (this.grabbed) return;
          this.hovered = true;
          console.log('[VR-GRABBABLE] Hover start:', this.el.getAttribute('data-name'));

          // Highlight on hover
          const material = this.el.getAttribute('material') || {};
          this.originalEmissive = material.emissive || '#000000';
          this.originalEmissiveIntensity = material.emissiveIntensity || 0;

          this.el.setAttribute('material', 'emissive', this.data.highlightColor);
          this.el.setAttribute('material', 'emissiveIntensity', 0.3);
        },

        onHoverEnd: function(evt) {
          if (this.grabbed) return;
          this.hovered = false;
          console.log('[VR-GRABBABLE] Hover end:', this.el.getAttribute('data-name'));

          // Remove highlight
          this.el.setAttribute('material', 'emissive', this.originalEmissive || '#000000');
          this.el.setAttribute('material', 'emissiveIntensity', this.originalEmissiveIntensity || 0);
        },

        onGrabStart: function(evt) {
          this.grabbed = true;
          this.grabber = evt.detail.hand;
          console.log('[VR-GRABBABLE] Grab start:', this.el.getAttribute('data-name'));

          // Reparent to controller for smooth movement
          if (this.grabber) {
            const worldPos = new window.THREE.Vector3();
            const worldQuat = new window.THREE.Quaternion();
            this.el.object3D.getWorldPosition(worldPos);
            this.el.object3D.getWorldQuaternion(worldQuat);

            // Calculate local position relative to controller
            const controllerPos = new window.THREE.Vector3();
            this.grabber.object3D.getWorldPosition(controllerPos);
            const localPos = worldPos.sub(controllerPos);

            // Reparent
            this.grabber.object3D.attach(this.el.object3D);
          }

          // Visual feedback
          this.el.setAttribute('material', 'emissive', '#ffff00');
          this.el.setAttribute('material', 'emissiveIntensity', 0.5);

          // Haptic feedback if available
          if (this.grabber && this.grabber.components['tracked-controls']) {
            const gamepad = this.grabber.components['tracked-controls'].controller;
            if (gamepad && gamepad.hapticActuators && gamepad.hapticActuators[0]) {
              gamepad.hapticActuators[0].pulse(0.5, 50);
            }
          }
        },

        onGrabEnd: function(evt) {
          console.log('[VR-GRABBABLE] Grab end:', this.el.getAttribute('data-name'));

          // Reparent back to scene
          if (this.grabbed && this.originalParent) {
            const scene = document.querySelector('a-scene') as any;
            if (scene && scene.object3D) {
              // Get world transform before reparenting
              const worldPos = new window.THREE.Vector3();
              const worldQuat = new window.THREE.Quaternion();
              this.el.object3D.getWorldPosition(worldPos);
              this.el.object3D.getWorldQuaternion(worldQuat);

              // Reparent to scene
              scene.object3D.attach(this.el.object3D);

              // Update A-Frame position/rotation attributes
              this.el.setAttribute('position', `${worldPos.x} ${worldPos.y} ${worldPos.z}`);
              const euler = new window.THREE.Euler().setFromQuaternion(worldQuat);
              this.el.setAttribute('rotation', `${euler.x * 180/Math.PI} ${euler.y * 180/Math.PI} ${euler.z * 180/Math.PI}`);
            }
          }

          this.grabbed = false;
          this.grabber = null;

          // Reset visual
          this.el.setAttribute('material', 'emissive', this.originalEmissive || '#000000');
          this.el.setAttribute('material', 'emissiveIntensity', this.originalEmissiveIntensity || 0);
        },

        onClick: function(evt) {
          // Desktop click feedback
          console.log('[VR-GRABBABLE] Click:', this.el.getAttribute('data-name'));
          this.el.setAttribute('material', 'emissive', '#ffff00');
          this.el.setAttribute('material', 'emissiveIntensity', 0.3);
          setTimeout(() => {
            this.el.setAttribute('material', 'emissiveIntensity', 0);
          }, 200);
        },

        remove: function() {
          this.el.removeEventListener('hover-start', this.onHoverStart);
          this.el.removeEventListener('hover-end', this.onHoverEnd);
          this.el.removeEventListener('grab-start', this.onGrabStart);
          this.el.removeEventListener('grab-end', this.onGrabEnd);
          this.el.removeEventListener('click', this.onClick);
        }
      });
    }

    // Note: 'grabbable' component is provided by super-hands package
    // We use 'vr-grabbable' for custom behavior with visual feedback

    // Glow Pulse component
    if (!window.AFRAME.components['glow-pulse']) {
      window.AFRAME.registerComponent('glow-pulse', {
        init: function() {
          this.el.setAttribute('animation__glow', {
            property: 'components.material.material.emissiveIntensity',
            from: 0,
            to: 0.5,
            dur: 1000,
            dir: 'alternate',
            loop: true,
            easing: 'easeInOutSine'
          });

          // Set emissive color
          const currentMaterial = this.el.getAttribute('material') || {};
          this.el.setAttribute('material', {
            ...currentMaterial,
            emissive: '#10b981',
            emissiveIntensity: 0
          });
        },
        remove: function() {
          this.el.removeAttribute('animation__glow');
          this.el.setAttribute('material', 'emissiveIntensity', '0');
        }
      });
    }

    // Collision Trigger component
    if (!window.AFRAME.components['collision-trigger']) {
      window.AFRAME.registerComponent('collision-trigger', {
        schema: {
          target: { default: '.clickable' }
        },
        init: function() {
          this.el.setAttribute('material', 'opacity', '1');

          // Add collision detection
          this.onCollision = (evt: any) => {
            const collidedEl = evt.detail.body.el;
            if (collidedEl && collidedEl.classList.contains('clickable')) {
              // Change both objects' colors
              this.el.setAttribute('material', 'color', '#ff0000');
              collidedEl.setAttribute('material', 'color', '#0000ff');

              setTimeout(() => {
                this.el.setAttribute('material', 'color', '#ffffff');
                collidedEl.setAttribute('material', 'color', '#ffffff');
              }, 1000);
            }
          };

          this.el.addEventListener('collide', this.onCollision);
        },
        remove: function() {
          this.el.removeEventListener('collide', this.onCollision);
        }
      });
    }
  }, [ready]);

  // Register morph-driver component for AI-controlled morph targets
  useEffect(() => {
    if (!ready || typeof window === "undefined" || !window.AFRAME) return;

    if (!window.AFRAME.components['morph-driver']) {
      window.AFRAME.registerComponent('morph-driver', {
        schema: {
          value: { type: 'number', default: 0.5 }
        },
        init: function() {
          this.currentValue = 0.5; // Start at neutral
          this.mesh = null;
        },
        tick: function(time, timeDelta) {
          // Find the mesh on first tick
          if (!this.mesh) {
            const object3D = this.el.object3D;
            if (object3D) {
              object3D.traverse((node: any) => {
                if (node.isMesh && node.morphTargetInfluences && node.morphTargetInfluences.length > 0) {
                  this.mesh = node;
                }
              });
            }
          }

          // Smoothly animate morph target towards target value
          if (this.mesh && this.mesh.morphTargetInfluences) {
            const targetValue = this.data.value;
            // Smooth lerp: current + (target - current) * lerpFactor
            // Using THREE.MathUtils.lerp for smooth animation
            const lerpSpeed = 0.1; // Adjust for smoothness (lower = smoother)
            this.currentValue = window.THREE.MathUtils.lerp(
              this.currentValue,
              targetValue,
              lerpSpeed
            );

            // Apply to first morph target
            this.mesh.morphTargetInfluences[0] = this.currentValue;
          }
        },
        update: function(oldData) {
          // Called when the attribute value changes
          // The tick function will handle the smooth transition
        }
      });
    }
  }, [ready]);

  // Register custom drag component for models
  useEffect(() => {
    if (!ready || typeof window === "undefined" || !window.AFRAME) return;

    // Custom drag-drop component with ground-plane raycasting
    if (!window.AFRAME.components['drag-drop']) {
      window.AFRAME.registerComponent('drag-drop', {
        schema: {
          uid: { type: 'string' }
        },
        init: function() {
          this.isDragging = false;
          this.dragPlane = null;
          this.offset = new window.THREE.Vector3();

          // Mouse enter - show grab cursor
          this.el.addEventListener('mouseenter', () => {
            this.el.sceneEl.canvas.style.cursor = 'grab';
          });

          // Mouse leave - reset cursor
          this.el.addEventListener('mouseleave', () => {
            if (!this.isDragging) {
              this.el.sceneEl.canvas.style.cursor = 'default';
            }
          });

          // Mouse down - start drag
          this.el.addEventListener('mousedown', (evt: any) => {
            evt.stopPropagation();
            this.isDragging = true;
            this.el.sceneEl.canvas.style.cursor = 'grabbing';

            // Store the current Y position to keep model grounded
            const currentPos = this.el.getAttribute('position');
            const planeY = currentPos.y;

            // Create a plane at the model's Y position (horizontal ground plane)
            this.dragPlane = new window.THREE.Plane(new window.THREE.Vector3(0, 1, 0), -planeY);

            // Calculate offset from intersection point to model center
            if (evt.detail && evt.detail.intersection) {
              const intersection = evt.detail.intersection.point;
              this.offset.copy(currentPos).sub(intersection);
            }

            // Add visual feedback
            this.el.setAttribute('scale', {
              x: (currentPos.scale?.x || 1) * 1.1,
              y: (currentPos.scale?.y || 1) * 1.1,
              z: (currentPos.scale?.z || 1) * 1.1
            });
          });

          // Mouse move - drag model
          this.el.sceneEl.addEventListener('mousemove', (evt: any) => {
            if (!this.isDragging || !this.dragPlane) return;

            const camera = this.el.sceneEl.camera;
            const rect = this.el.sceneEl.canvas.getBoundingClientRect();

            // Calculate normalized mouse coordinates
            const mouse = new window.THREE.Vector2(
              ((evt.clientX - rect.left) / rect.width) * 2 - 1,
              -((evt.clientY - rect.top) / rect.height) * 2 + 1
            );

            // Create raycaster from camera through mouse position
            const raycaster = new window.THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);

            // Find intersection with drag plane
            const intersectPoint = new window.THREE.Vector3();
            raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);

            if (intersectPoint) {
              // Apply offset to maintain grab point
              intersectPoint.add(this.offset);

              // Update position (X and Z change, Y stays constant)
              const currentPos = this.el.getAttribute('position');
              this.el.setAttribute('position', {
                x: intersectPoint.x,
                y: currentPos.y, // Keep Y constant (grounded)
                z: intersectPoint.z
              });
            }
          });

          // Mouse up - end drag
          this.el.sceneEl.addEventListener('mouseup', () => {
            if (this.isDragging) {
              this.isDragging = false;
              this.dragPlane = null;
              this.el.sceneEl.canvas.style.cursor = 'grab';

              // Remove visual feedback
              const currentPos = this.el.getAttribute('position');
              const currentScale = this.el.getAttribute('scale');
              this.el.setAttribute('scale', {
                x: currentScale.x / 1.1,
                y: currentScale.y / 1.1,
                z: currentScale.z / 1.1
              });

              // Sync position back to React state
              const position = this.el.getAttribute('position');
              const rotation = this.el.getAttribute('rotation');
              const scale = this.el.getAttribute('scale');

              if (onAssetTransform && this.data.uid) {
                onAssetTransform(this.data.uid, {
                  position: { x: position.x, y: position.y, z: position.z },
                  rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
                  scale: scale.x / 1.1 // Remove the 1.1x scale boost
                });
              }
            }
          });

          // Mouse leave - cancel drag if mouse leaves canvas
          this.el.sceneEl.addEventListener('mouseleave', () => {
            if (this.isDragging) {
              this.isDragging = false;
              this.dragPlane = null;
              this.el.sceneEl.canvas.style.cursor = 'default';

              // Remove visual feedback
              const currentScale = this.el.getAttribute('scale');
              this.el.setAttribute('scale', {
                x: currentScale.x / 1.1,
                y: currentScale.y / 1.1,
                z: currentScale.z / 1.1
              });
            }
          });
        }
      });
    }
  }, [ready, onAssetTransform]);

  // Listen for transform changes and sync to React state
  useEffect(() => {
    if (!ready || typeof window === "undefined") return;

    const handleTransformChanged = (evt: any) => {
      const uid = activeSelection?.uid;
      if (!uid || !onAssetTransform) return;

      const { position, rotation, scale } = evt.detail;

      onAssetTransform(uid, {
        position: { x: position.x, y: position.y, z: position.z },
        rotation: {
          x: rotation.x * (180 / Math.PI),
          y: rotation.y * (180 / Math.PI),
          z: rotation.z * (180 / Math.PI)
        },
        scale: scale.x
      });
    };

    const scene = document.querySelector('a-scene');
    if (scene) {
      scene.addEventListener('transform-changed', handleTransformChanged);
      return () => scene.removeEventListener('transform-changed', handleTransformChanged);
    }
  }, [ready, activeSelection, onAssetTransform]);

  // Calculate bounding box for environment when model loads
  useEffect(() => {
    if (!ready || typeof window === "undefined" || !window.THREE || !onEnvironmentLoaded) return;

    // Find all 3D environment assets
    const envAssets = sceneAssets.filter((asset: any) => asset.type === 'environment-3d' && asset.visible);
    if (envAssets.length === 0) return;

    // Wait for each environment model to load
    const checkModelsLoaded = setInterval(() => {
      envAssets.forEach((env: any) => {
        const envModel = document.querySelector(`[data-uid="${env.uid}"]`) as any;
        if (!envModel || envModel.dataset.boundingBoxCalculated) return;

        const object3D = envModel.object3D;
        if (!object3D || !object3D.children || object3D.children.length === 0) return;

        // Model is loaded, calculate bounding box
        envModel.dataset.boundingBoxCalculated = 'true';

        try {
          const box = new window.THREE.Box3().setFromObject(object3D);

          // Only call callback if bounding box is valid
          if (box.min && box.max && isFinite(box.min.x) && isFinite(box.max.x)) {
            onEnvironmentLoaded(env.uid, box);
          }
        } catch (error) {
          console.warn('Failed to calculate environment bounding box for', env.uid, ':', error);
        }
      });
    }, 200);

    // Cleanup
    return () => clearInterval(checkModelsLoaded);
  }, [ready, sceneAssets, onEnvironmentLoaded]);

  // Track model loading progress via A-Frame model-loaded / model-error events
  useEffect(() => {
    if (!ready || typeof window === "undefined") return;

    const cleanups: (() => void)[] = [];

    const setup = () => {
      sceneAssets.forEach((asset: any) => {
        if (!asset.modelPath || asset.type !== 'model') return;

        const modelEl = document.querySelector(`[data-loading-uid="${asset.uid}"]`) as any;
        if (!modelEl || modelEl._loadTracked) return;
        modelEl._loadTracked = true;

        // Simulated progress (A-Frame doesn't expose real progress)
        setLoadingModels(prev => new Map(prev).set(asset.uid, 10));

        const progressInterval = setInterval(() => {
          setLoadingModels(prev => {
            const newMap = new Map(prev);
            const current = newMap.get(asset.uid) || 0;
            if (current < 90) newMap.set(asset.uid, Math.min(current + 10, 90));
            return newMap;
          });
        }, 300);

        const finish = (success: boolean) => {
          clearInterval(progressInterval);
          if (success) {
            setLoadingModels(prev => new Map(prev).set(asset.uid, 100));
            setTimeout(() => {
              setLoadingModels(prev => { const m = new Map(prev); m.delete(asset.uid); return m; });
            }, 500);
          } else {
            setLoadingModels(prev => { const m = new Map(prev); m.delete(asset.uid); return m; });
          }
        };

        const onLoaded = () => finish(true);
        const onError = () => finish(false);

        modelEl.addEventListener('model-loaded', onLoaded);
        modelEl.addEventListener('model-error', onError);

        cleanups.push(() => {
          clearInterval(progressInterval);
          modelEl.removeEventListener('model-loaded', onLoaded);
          modelEl.removeEventListener('model-error', onError);
        });
      });
    };

    const timer = setTimeout(setup, 100);
    return () => {
      clearTimeout(timer);
      cleanups.forEach(fn => fn());
    };
  }, [ready, sceneAssets]);

  if (!ready) return <div className="w-full h-full bg-[#0A0A0A]" />;

  return (
    <>
    {/* @ts-ignore */}
    <a-scene
      ref={sceneRef}
      embedded
      vr-mode-ui="enabled: true; enterVRButton: #enterVRButton"
      cursor="rayOrigin: mouse"
      raycaster="objects: .clickable"
      renderer="antialias: true; colorManagement: true;"
    >
      {/* Render all scene assets */}
      {sceneAssets.map((asset: any) => {
        if (!asset.visible) return null;

        const isSelected = activeSelection?.uid === asset.uid;
        const pos = asset.position || { x: 0, y: 0, z: 0 };
        const rot = asset.rotation || { x: 0, y: 0, z: 0 };

        // Render AI Skybox
        if (asset.type === 'environment-ai') {
          return (
            // @ts-ignore
            <a-sky
              key={asset.uid}
              data-uid={asset.uid}
              src={asset.imagePath}
              crossOrigin="anonymous" 
              rotation={`${rot.x} ${rot.y} ${rot.z}`}
            ></a-sky>
          );
        }

        // Render 3D Environment
        if (asset.type === 'environment-3d') {
          return (
            <a-entity key={asset.uid}>
              {/* @ts-ignore */}
              <a-gltf-model
                data-uid={asset.uid}
                src={`/api/ai/proxy-model?url=${encodeURIComponent(asset.modelPath)}`}
                position={`${pos.x} ${pos.y} ${pos.z}`}
                rotation={`${rot.x} ${rot.y} ${rot.z}`}
                scale={`${asset.scale || 1} ${asset.scale || 1} ${asset.scale || 1}`}
                shadow="receive: true"
                crossOrigin="anonymous"
              ></a-gltf-model>
              {/* Ground plane for 3D environments */}
              <a-entity
                geometry="primitive: plane; width: 50; height: 50"
                rotation="-90 0 0"
                position="0 0 0"
                material="color: #1a1a1a; roughness: 0.9"
                shadow="receive: true"
              ></a-entity>
            </a-entity>
          );
        }

        // Render regular model
        const isCellMembrane = asset.name?.toLowerCase().includes('cell membrane') ||
                               asset.modelPath?.toLowerCase().includes('cell membrane') ||
                               asset.modelPath?.toLowerCase().includes('cell_membrane');

        return (
          <a-entity
            key={asset.uid}
            data-uid={asset.uid}
            className="clickable"
            position={`${pos.x} ${pos.y} ${pos.z}`}
            rotation={`${rot.x} ${rot.y} ${rot.z}`}
            scale={`${asset.scale || 1} ${asset.scale || 1} ${asset.scale || 1}`}
            {...(transformMode === 'drag' && { 'drag-drop': `uid: ${asset.uid}` })}
            {...(isSelected && transformMode !== 'drag' && {
              transformer: `mode: ${transformMode}`
            })}
            data-name={asset.name}
            {...(asset.interactionFX?.grabbable && { 'vr-grabbable': '', 'grabbable': '' })}
            {...(asset.interactionFX?.glowPulse && { 'glow-pulse': '' })}
            {...(asset.interactionFX?.collisionTrigger && { 'collision-trigger': '' })}
            onClick={() => onAssetClick(asset)}
            animation__hover="property: scale; to: 1.05 1.05 1.05; startEvents: mouseenter; dur: 200"
            animation__leave="property: scale; to: 1 1 1; startEvents: mouseleave; dur: 200"
          >
            {/* Model or simple loading state */}
            {asset.modelPath ? (
              // @ts-ignore
              <a-gltf-model
                key={`glb-${asset.uid}-${asset.modelPath}`}
                src={`/api/ai/proxy-model?url=${encodeURIComponent(asset.modelPath)}`}
                crossOrigin="anonymous"
                shadow="cast: true; receive: true"
                draco-loader="decoderPath: https://www.gstatic.com/draco/versioned/decoders/1.5.6/;"
                data-loading-uid={asset.uid}
                {...(isCellMembrane && { 'morph-driver': `value: ${aiState.channel_state}` })}
                {...(asset.hasAnimation && { 'animation-mixer': 'clip: *; loop: repeat' })}
              ></a-gltf-model>
            ) : (
              // Minimal loading placeholder - just pulsing emerald glow
              <a-entity
                geometry="primitive: sphere; radius: 0.3"
                material="color: #10b981; opacity: 0.4; transparent: true; emissive: #10b981; emissiveIntensity: 0.8"
                animation="property: components.material.material.emissiveIntensity; from: 0.3; to: 1.2; dir: alternate; dur: 1000; loop: true; easing: easeInOutSine"
              ></a-entity>
            )}

            {/* Selection highlight ring */}
            {isSelected && (
              <a-entity
                geometry="primitive: ring; radiusInner: 0.5; radiusOuter: 0.6"
                rotation="-90 0 0"
                position="0 0 0"
                  material="color: #10b981; opacity: 0.8; transparent: true; side: double"
                  animation="property: rotation; to: -90 360 0; loop: true; dur: 3000; easing: linear"
                ></a-entity>
              )}

              {/* 投影底座 */}
              <a-entity
                geometry="primitive: circle; radius: 0.45"
                rotation="-90 0 0"
                position="0 -0.99 0"
                material="color: #000; opacity: 0.15; transparent: true"
              ></a-entity>

            {/* 标签文本 */}
            <a-entity
              position="0 -0.7 0"
              text={`value: ${asset.name}; align: center; width: 3; color: ${isSelected ? '#10b981' : '#FFF'}; font: kelsonsans`}
            ></a-entity>
            </a-entity>
          );
        })}

      {/* ── Always-on Lighting (PBR materials need light to render) ── */}
      <a-entity light="type: ambient; intensity: 0.6; color: #fff"></a-entity>
      <a-entity
        light={`type: directional; intensity: 0.8; castShadow: true; color: ${aiState.lighting_color || '#ffffff'}`}
        position="-2 4 2"
      ></a-entity>
      <a-entity
        light="type: directional; intensity: 0.3; castShadow: false"
        position="2 3 -2"
      ></a-entity>
      <a-entity
        light="type: hemisphere; intensity: 0.4; color: #ffffee; groundColor: #080820"
      ></a-entity>

      {/* Environment: AI Skybox or Default A-Frame */}
      {sceneAssets.filter((asset: any) => asset.type?.includes('environment')).length === 0 && (
        <>
          {aiState.skybox_url ? (
            // @ts-ignore
            <a-sky src={aiState.skybox_url} rotation="0 0 0"></a-sky>
          ) : (
            // Default A-Frame Environment (Unity-like grid + blue sky)
            <a-entity
              environment="preset: default; groundColor: #445; grid: 1x1; gridColor: #333; groundTexture: none; groundColor2: #000; dressing: none; dressingAmount: 0"
            ></a-entity>
          )}
        </>
      )}

      {/* Camera Rig with VR Controllers */}
      <a-entity
        id="camera-rig"
        position="0 1.6 5"
        movement-controls="fly: false; speed: 0.1"
      >
        <a-camera
          look-controls="
            pointerLockEnabled: false;
            reverseMouseDrag: false;
            touchEnabled: true;
          "
          wasd-controls="acceleration: 65"
        >
          {/* Crosshair */}
          <a-entity
            position="0 0 -1"
            geometry="primitive: ring; radiusInner: 0.005; radiusOuter: 0.01"
            material="color: white; shader: flat; opacity: 0.5"
          ></a-entity>
        </a-camera>

        {/* Left Hand Controller - Quest/Oculus Touch */}
        {/* @ts-ignore */}
        <a-entity
          id="left-hand"
          hand-controls="hand: left; handModelStyle: lowPoly; color: #10b981"
          laser-controls="hand: left"
          raycaster="objects: .clickable; far: 10; lineColor: #10b981; lineOpacity: 0.5"
          super-hands="
            colliderEvent: raycaster-intersection;
            colliderEventProperty: els;
            colliderEndEvent: raycaster-intersection-cleared;
            colliderEndEventProperty: clearedEls;
            grabStartButtons: gripdown, triggerdown;
            grabEndButtons: gripup, triggerup;
          "
          sphere-collider="objects: .clickable; radius: 0.1"
        ></a-entity>

        {/* Right Hand Controller - Quest/Oculus Touch */}
        {/* @ts-ignore */}
        <a-entity
          id="right-hand"
          hand-controls="hand: right; handModelStyle: lowPoly; color: #10b981"
          laser-controls="hand: right"
          raycaster="objects: .clickable; far: 10; lineColor: #10b981; lineOpacity: 0.5"
          super-hands="
            colliderEvent: raycaster-intersection;
            colliderEventProperty: els;
            colliderEndEvent: raycaster-intersection-cleared;
            colliderEndEventProperty: clearedEls;
            grabStartButtons: gripdown, triggerdown;
            grabEndButtons: gripup, triggerup;
          "
          sphere-collider="objects: .clickable; radius: 0.1"
        ></a-entity>
      </a-entity>
    </a-scene>
  </>
  );
}