"use client";
import { useEffect, useState, useRef } from "react";

interface AIState {
  environment: "default" | "starry" | "forest" | "poison";
  channel_state: number;
}

export default function Scene({
  sceneAssets = [],
  activeSelection,
  transformMode,
  onAssetClick,
  onAssetTransform,
  onEnvironmentLoaded,
  onLoadingStateChange,
  aiState = { environment: "default", channel_state: 0.5 },
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
  const [loadingModels, setLoadingModels] = useState<Map<string, number>>(
    new Map()
  );

  // Notify parent of loading state changes
  useEffect(() => {
    onLoadingStateChange?.(loadingModels);
  }, [loadingModels, onLoadingStateChange]);

  // 1) Load A-Frame + deps ONCE (no duplicate grabbable registration)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load A-Frame core
    if (!window.AFRAME) {
      require("aframe");
    }

    // Environment component
    if (window.AFRAME && !window.AFRAME.components["environment"]) {
      require("aframe-environment-component");
    }

    // Extras (movement-controls system etc.)
    if (window.AFRAME && !window.AFRAME.systems["movement-controls"]) {
      require("aframe-extras");
    }

    // super-hands registers grabbable, etc.
    // IMPORTANT: Do NOT re-register "grabbable" yourself.
    if (window.AFRAME && !window.AFRAME.components["grabbable"]) {
      require("super-hands");
    }

    // aframe-transformer-component (script tag)
    if (
      !document.querySelector('script[src*="aframe-transformer-component"]')
    ) {
      const script = document.createElement("script");
      script.src =
        "https://unpkg.com/aframe-transformer-component@1.2.0/dist/aframe-transformer-component.min.js";
      script.async = false;
      document.head.appendChild(script);
    }

    const timer = setTimeout(() => {
      setReady(true);
      window.dispatchEvent(new Event("resize"));
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  // Q/E vertical movement controls
  useEffect(() => {
    if (!ready || typeof window === "undefined") return;

    const handleVerticalMovement = (evt: KeyboardEvent) => {
      const key = evt.key.toLowerCase();
      const cameraRig = document.querySelector("#camera-rig") as any;
      if (!cameraRig) return;

      const currentPos = cameraRig.getAttribute("position") as any;
      const speed = 0.5;
      if (!currentPos) return;

      if (key === "q") {
        cameraRig.setAttribute(
          "position",
          `${currentPos.x} ${currentPos.y - speed} ${currentPos.z}`
        );
      } else if (key === "e") {
        cameraRig.setAttribute(
          "position",
          `${currentPos.x} ${currentPos.y + speed} ${currentPos.z}`
        );
      }
    };

    window.addEventListener("keydown", handleVerticalMovement);
    return () => window.removeEventListener("keydown", handleVerticalMovement);
  }, [ready]);

  // Register Interaction FX components (NO custom "grabbable" here)
  useEffect(() => {
    if (!ready || typeof window === "undefined" || !window.AFRAME) return;

    // Click FX (separate from super-hands grabbable)
    if (!window.AFRAME.components["click-fx"]) {
      window.AFRAME.registerComponent("click-fx", {
        init: function () {
          this.el.classList.add("clickable");
          this.el.addEventListener("click", () => {
            // Visual feedback
            const currentMaterial = this.el.getAttribute("material") || {};
            this.el.setAttribute("material", {
              ...currentMaterial,
              emissive: currentMaterial.emissive || "#ffff00",
              emissiveIntensity: 0.3,
            });
            setTimeout(() => {
              this.el.setAttribute("material", "emissiveIntensity", 0);
            }, 200);
          });
        },
      });
    }

    // Glow Pulse component
    if (!window.AFRAME.components["glow-pulse"]) {
      window.AFRAME.registerComponent("glow-pulse", {
        init: function () {
          this.el.setAttribute("animation__glow", {
            property: "components.material.material.emissiveIntensity",
            from: 0,
            to: 0.5,
            dur: 1000,
            dir: "alternate",
            loop: true,
            easing: "easeInOutSine",
          });

          const currentMaterial = this.el.getAttribute("material") || {};
          this.el.setAttribute("material", {
            ...currentMaterial,
            emissive: "#10b981",
            emissiveIntensity: 0,
          });
        },
        remove: function () {
          this.el.removeAttribute("animation__glow");
          this.el.setAttribute("material", "emissiveIntensity", "0");
        },
      });
    }

    // Collision Trigger component
    if (!window.AFRAME.components["collision-trigger"]) {
      window.AFRAME.registerComponent("collision-trigger", {
        schema: {
          target: { default: ".clickable" },
        },
        init: function () {
          this.el.setAttribute("material", "opacity", "1");

          this.onCollision = (evt: any) => {
            const collidedEl = evt.detail?.body?.el;
            if (collidedEl && collidedEl.classList.contains("clickable")) {
              this.el.setAttribute("material", "color", "#ff0000");
              collidedEl.setAttribute("material", "color", "#0000ff");

              setTimeout(() => {
                this.el.setAttribute("material", "color", "#ffffff");
                collidedEl.setAttribute("material", "color", "#ffffff");
              }, 1000);
            }
          };

          this.el.addEventListener("collide", this.onCollision);
        },
        remove: function () {
          this.el.removeEventListener("collide", this.onCollision);
        },
      });
    }
  }, [ready]);

  // Register morph-driver component for AI-controlled morph targets
  useEffect(() => {
    if (!ready || typeof window === "undefined" || !window.AFRAME) return;

    if (!window.AFRAME.components["morph-driver"]) {
      window.AFRAME.registerComponent("morph-driver", {
        schema: {
          value: { type: "number", default: 0.5 },
        },
        init: function () {
          this.currentValue = 0.5;
          this.mesh = null;
        },
        tick: function () {
          if (!this.mesh) {
            const object3D = this.el.object3D;
            if (object3D) {
              object3D.traverse((node: any) => {
                if (
                  node.isMesh &&
                  node.morphTargetInfluences &&
                  node.morphTargetInfluences.length > 0
                ) {
                  this.mesh = node;
                }
              });
            }
          }

          if (this.mesh && this.mesh.morphTargetInfluences) {
            const targetValue = this.data.value;
            const lerpSpeed = 0.1;

            this.currentValue = window.THREE.MathUtils.lerp(
              this.currentValue,
              targetValue,
              lerpSpeed
            );

            this.mesh.morphTargetInfluences[0] = this.currentValue;
          }
        },
      });
    }
  }, [ready]);

  // Register custom drag component for models (fixed scale logic + better cleanup)
  useEffect(() => {
    if (!ready || typeof window === "undefined" || !window.AFRAME) return;

    if (!window.AFRAME.components["drag-drop"]) {
      window.AFRAME.registerComponent("drag-drop", {
        schema: {
          uid: { type: "string" },
        },
        init: function () {
          this.isDragging = false;
          this.dragPlane = null;
          this.offset = new window.THREE.Vector3();
          this.originalScale = null;

          this.onMouseEnter = () => {
            if (this.el.sceneEl?.canvas) this.el.sceneEl.canvas.style.cursor = "grab";
          };

          this.onMouseLeaveEl = () => {
            if (!this.isDragging && this.el.sceneEl?.canvas) {
              this.el.sceneEl.canvas.style.cursor = "default";
            }
          };

          this.onMouseDown = (evt: any) => {
            evt.stopPropagation();
            this.isDragging = true;
            if (this.el.sceneEl?.canvas) this.el.sceneEl.canvas.style.cursor = "grabbing";

            const currentPos = this.el.getAttribute("position");
            const planeY = currentPos?.y ?? 0;

            this.dragPlane = new window.THREE.Plane(
              new window.THREE.Vector3(0, 1, 0),
              -planeY
            );

            if (evt.detail?.intersection?.point && currentPos) {
              const intersection = evt.detail.intersection.point;
              this.offset.copy(currentPos).sub(intersection);
            }

            // Store + apply scale feedback safely
            const scale = this.el.getAttribute("scale") || { x: 1, y: 1, z: 1 };
            this.originalScale = { x: scale.x, y: scale.y, z: scale.z };
            this.el.setAttribute("scale", {
              x: scale.x * 1.1,
              y: scale.y * 1.1,
              z: scale.z * 1.1,
            });
          };

          this.onMouseMoveScene = (evt: any) => {
            if (!this.isDragging || !this.dragPlane) return;
            const sceneEl = this.el.sceneEl;
            const canvas = sceneEl?.canvas;
            const camera = sceneEl?.camera;
            if (!canvas || !camera) return;

            const rect = canvas.getBoundingClientRect();
            const mouse = new window.THREE.Vector2(
              ((evt.clientX - rect.left) / rect.width) * 2 - 1,
              -((evt.clientY - rect.top) / rect.height) * 2 + 1
            );

            const raycaster = new window.THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);

            const intersectPoint = new window.THREE.Vector3();
            raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);

            if (intersectPoint) {
              intersectPoint.add(this.offset);
              const currentPos = this.el.getAttribute("position") || { x: 0, y: 0, z: 0 };
              this.el.setAttribute("position", {
                x: intersectPoint.x,
                y: currentPos.y,
                z: intersectPoint.z,
              });
            }
          };

          this.endDrag = () => {
            if (!this.isDragging) return;
            this.isDragging = false;
            this.dragPlane = null;

            if (this.el.sceneEl?.canvas) this.el.sceneEl.canvas.style.cursor = "grab";

            // Restore original scale (no /1.1 drift)
            if (this.originalScale) {
              this.el.setAttribute("scale", this.originalScale);
            }

            // Sync transform back
            const position = this.el.getAttribute("position");
            const rotation = this.el.getAttribute("rotation");
            const scale = this.el.getAttribute("scale");

            if (onAssetTransform && this.data.uid) {
              onAssetTransform(this.data.uid, {
                position: { x: position.x, y: position.y, z: position.z },
                rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
                scale: scale?.x ?? 1,
              });
            }
          };

          this.onMouseUpScene = () => this.endDrag();

          this.onMouseLeaveScene = () => {
            if (!this.isDragging) return;
            // Cancel drag & restore
            this.isDragging = false;
            this.dragPlane = null;

            if (this.el.sceneEl?.canvas) this.el.sceneEl.canvas.style.cursor = "default";
            if (this.originalScale) {
              this.el.setAttribute("scale", this.originalScale);
            }
          };

          // Bind listeners
          this.el.addEventListener("mouseenter", this.onMouseEnter);
          this.el.addEventListener("mouseleave", this.onMouseLeaveEl);
          this.el.addEventListener("mousedown", this.onMouseDown);

          this.el.sceneEl.addEventListener("mousemove", this.onMouseMoveScene);
          this.el.sceneEl.addEventListener("mouseup", this.onMouseUpScene);
          this.el.sceneEl.addEventListener("mouseleave", this.onMouseLeaveScene);
        },
        remove: function () {
          // Cleanup listeners when component removed (e.g., transformMode changes)
          this.el.removeEventListener("mouseenter", this.onMouseEnter);
          this.el.removeEventListener("mouseleave", this.onMouseLeaveEl);
          this.el.removeEventListener("mousedown", this.onMouseDown);

          if (this.el.sceneEl) {
            this.el.sceneEl.removeEventListener("mousemove", this.onMouseMoveScene);
            this.el.sceneEl.removeEventListener("mouseup", this.onMouseUpScene);
            this.el.sceneEl.removeEventListener("mouseleave", this.onMouseLeaveScene);
          }
        },
      });
    }
  }, [ready, onAssetTransform]);

  // Listen for transformer changes and sync to React state
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
          z: rotation.z * (180 / Math.PI),
        },
        scale: scale.x,
      });
    };

    const scene = document.querySelector("a-scene") as any;
    if (scene) {
      scene.addEventListener("transform-changed", handleTransformChanged);
      return () => scene.removeEventListener("transform-changed", handleTransformChanged);
    }
  }, [ready, activeSelection, onAssetTransform]);

  // Calculate bounding box for environment when model loads
  useEffect(() => {
    if (!ready || typeof window === "undefined" || !window.THREE || !onEnvironmentLoaded)
      return;

    const envAssets = sceneAssets.filter(
      (asset: any) => asset.type === "environment-3d" && asset.visible
    );
    if (envAssets.length === 0) return;

    const checkModelsLoaded = setInterval(() => {
      envAssets.forEach((env: any) => {
        const envModel = document.querySelector(`[data-uid="${env.uid}"]`) as any;
        if (!envModel || envModel.dataset.boundingBoxCalculated) return;

        const object3D = envModel.object3D;
        if (!object3D || !object3D.children || object3D.children.length === 0) return;

        envModel.dataset.boundingBoxCalculated = "true";

        try {
          const box = new window.THREE.Box3().setFromObject(object3D);
          if (box.min && box.max && isFinite(box.min.x) && isFinite(box.max.x)) {
            onEnvironmentLoaded(env.uid, box);
          }
        } catch (error) {
          console.warn("Failed to calculate environment bounding box for", env.uid, error);
        }
      });
    }, 200);

    return () => clearInterval(checkModelsLoaded);
  }, [ready, sceneAssets, onEnvironmentLoaded]);

  // Track model loading progress (fixed cleanup: no return-inside-forEach)
  useEffect(() => {
    if (!ready || typeof window === "undefined" || !window.THREE) return;

    const cleanups: Array<() => void> = [];

    const timer = setTimeout(() => {
      sceneAssets.forEach((asset: any) => {
        if (!asset.modelPath || asset.type !== "model") return;

        const modelEl = document.querySelector(
          `[data-loading-uid="${asset.uid}"]`
        ) as any;
        if (!modelEl) return;

        const onProgress = () => {
          setLoadingModels((prev) => {
            const next = new Map(prev);
            const current = next.get(asset.uid) || 0;
            if (current < 90) next.set(asset.uid, Math.min(current + 10, 90));
            return next;
          });
        };

        const onLoaded = () => {
          setLoadingModels((prev) => {
            const next = new Map(prev);
            next.set(asset.uid, 100);
            return next;
          });

          setTimeout(() => {
            setLoadingModels((prev) => {
              const next = new Map(prev);
              next.delete(asset.uid);
              return next;
            });
          }, 500);
        };

        const onError = () => {
          setLoadingModels((prev) => {
            const next = new Map(prev);
            next.delete(asset.uid);
            return next;
          });
        };

        modelEl.addEventListener("model-loaded", onLoaded);
        modelEl.addEventListener("model-error", onError);

        // Simulated progress interval
        if (!loadingModels.has(asset.uid)) {
          setLoadingModels((prev) => new Map(prev).set(asset.uid, 10));
          const progressInterval = setInterval(onProgress, 300);
          modelEl._progressInterval = progressInterval;
        }

        cleanups.push(() => {
          modelEl.removeEventListener("model-loaded", onLoaded);
          modelEl.removeEventListener("model-error", onError);
          if (modelEl._progressInterval) clearInterval(modelEl._progressInterval);
        });
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      cleanups.forEach((fn) => fn());
    };
    // NOTE: intentionally not depending on loadingModels to avoid re-binding listeners constantly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, sceneAssets]);

  if (!ready) return <div className="w-full h-full bg-[#0A0A0A]" />;

  return (
    <>
      {/* @ts-ignore */}
      <a-scene
        ref={sceneRef}
        embedded
        vr-mode-ui="enabled: false"
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
          if (asset.type === "environment-ai") {
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
          if (asset.type === "environment-3d") {
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

          // Regular model checks
          const isCellMembrane =
            asset.name?.toLowerCase().includes("cell membrane") ||
            asset.modelPath?.toLowerCase().includes("cell membrane") ||
            asset.modelPath?.toLowerCase().includes("cell_membrane");

          // IMPORTANT: drag mode and grabbable MUST be mutually exclusive
          const enableDrag = transformMode === "drag";
          const enableGrab = !enableDrag && !!asset.interactionFX?.grabbable;

          return (
            <a-entity
              key={asset.uid}
              data-uid={asset.uid}
              className="clickable"
              position={`${pos.x} ${pos.y} ${pos.z}`}
              rotation={`${rot.x} ${rot.y} ${rot.z}`}
              scale={`${asset.scale || 1} ${asset.scale || 1} ${asset.scale || 1}`}
              {...(enableDrag ? { "drag-drop": `uid: ${asset.uid}` } : {})}
              {...(!enableDrag && isSelected && transformMode !== "drag"
                ? { transformer: `mode: ${transformMode}` }
                : {})}
              data-name={asset.name}
              {...(enableGrab ? { grabbable: "" } : {})}
              {...(asset.interactionFX?.glowPulse ? { "glow-pulse": "" } : {})}
              {...(asset.interactionFX?.collisionTrigger
                ? { "collision-trigger": "" }
                : {})}
              {...(asset.interactionFX?.grabbable ? { "click-fx": "" } : {})}
              onClick={() => onAssetClick?.(asset)}
              animation__hover="property: scale; to: 1.05 1.05 1.05; startEvents: mouseenter; dur: 200"
              animation__leave="property: scale; to: 1 1 1; startEvents: mouseleave; dur: 200"
            >
              {asset.modelPath ? (
                // @ts-ignore
                <a-gltf-model
                  key={`glb-${asset.uid}-${asset.modelPath}`}
                  src={`/api/ai/proxy-model?url=${encodeURIComponent(asset.modelPath)}`}
                  crossOrigin="anonymous"
                  shadow="cast: true; receive: true"
                  draco-loader="decoderPath: https://www.gstatic.com/draco/versioned/decoders/1.5.6/;"
                  data-loading-uid={asset.uid}
                  {...(isCellMembrane
                    ? { "morph-driver": `value: ${aiState.channel_state}` }
                    : {})}
                ></a-gltf-model>
              ) : (
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
                text={`value: ${asset.name}; align: center; width: 3; color: ${
                  isSelected ? "#10b981" : "#FFF"
                }; font: kelsonsans`}
              ></a-entity>
            </a-entity>
          );
        })}

        {/* AI-Controlled Environment (only if no env assets present) */}
        {sceneAssets.filter((asset: any) => asset.type?.includes("environment")).length ===
          0 && (
          <a-entity
            environment={`preset: ${aiState.environment}; seed: 42; shadow: true; lighting: point; grid: dots; gridColor: #333; playArea: 1.2`}
          ></a-entity>
        )}

        {/* Cell Membrane fallback */}
        {!sceneAssets.some(
          (asset: any) =>
            asset.name?.toLowerCase().includes("cell membrane") ||
            asset.modelPath?.toLowerCase().includes("cell membrane") ||
            asset.modelPath?.toLowerCase().includes("cell_membrane")
        ) && (
          <a-gltf-model
            src="/models/Cell_Membrane.glb"
            position="0 1.5 0"
            scale="1 1 1"
            morph-driver={`value: ${aiState.channel_state}`}
            shadow="cast: true; receive: true"
          ></a-gltf-model>
        )}

        {/* Lights */}
        <a-entity light="type: ambient; intensity: 0.5"></a-entity>
        <a-entity
          light="type: directional; intensity: 0.6; castShadow: true"
          position="-1 3 1"
        ></a-entity>

        {/* Camera Rig */}
        <a-entity id="camera-rig" position="0 1.6 5">
          <a-camera
            look-controls="
              pointerLockEnabled: false;
              reverseMouseDrag: false;
              touchEnabled: true;
            "
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
    </>
  );
}
