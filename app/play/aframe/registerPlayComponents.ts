// @ts-nocheck
// ═══════════════════════════════════════════════════════════════════════════
// A-Frame Components for the config-driven /play runtime
//
// These use DIFFERENT names from voyage's components (config-clickable,
// config-draggable) so both routes can coexist in the same browser session
// without AFRAME component registration conflicts.
//
// ── Window globals set by app/play/page.tsx ─────────────────────────────
//
//   window.playAssetPositions            Record<assetId, [x,y,z]>
//   window.currentPlayPhaseType          'intro'|'click'|'drag'|'drag-multi'|'drag-chain'|'complete'
//   window.currentPlayPhaseId            string  e.g. "find-mito"
//   window.currentPlayClickTarget        string  asset ID (ClickPhase only)
//   window.currentPlayCollectibleItems   Set<string>  asset IDs that can be collected right now
//   window.currentPlayInventory          string[]  collected item IDs (mirrors React state)
//   window.currentPlayDeliveryTargetId   string  asset ID to deliver to
//   window.currentPlayDeliverableItems   Set<string>  items that can be delivered to current target
//
// ═══════════════════════════════════════════════════════════════════════════

export function registerPlayComponents() {
  if (!window.AFRAME) return;

  // ─── 1. CONFIG-CLICKABLE ─────────────────────────────────────────────
  // Fires 'play-advance' + 'show-knowledge' when the correct asset is
  // clicked during a ClickPhase.
  if (!window.AFRAME.components['config-clickable']) {
    window.AFRAME.registerComponent('config-clickable', {
      init: function () {
        var self = this;

        var handleClick = function () {
          var assetId = self.el.getAttribute('data-asset-id');
          var phaseType = window.currentPlayPhaseType;

          if (phaseType !== 'click') return;
          if (assetId !== window.currentPlayClickTarget) return;

          window.dispatchEvent(new CustomEvent('play-advance'));
          window.dispatchEvent(new CustomEvent('show-knowledge', {
            detail: { phase: window.currentPlayPhaseId }
          }));
        };

        self.el.addEventListener('click', handleClick);
        self.el.addEventListener('triggerdown', handleClick);

        // Hover pulse — only when this is the active click target
        self.el.addEventListener('mouseenter', function () {
          if (
            window.currentPlayPhaseType === 'click' &&
            self.el.getAttribute('data-asset-id') === window.currentPlayClickTarget
          ) {
            var base = parseFloat(self.el.getAttribute('data-auto-scale')) || 1;
            var up = (base * 1.15).toFixed(4);
            self.el.setAttribute('animation__hover', {
              property: 'scale',
              to: up + ' ' + up + ' ' + up,
              dur: 200,
              easing: 'easeOutQuad'
            });
          }
        });

        self.el.addEventListener('mouseleave', function () {
          var base = parseFloat(self.el.getAttribute('data-auto-scale')) || 1;
          var s = base.toFixed(4);
          self.el.setAttribute('animation__hover', {
            property: 'scale',
            to: s + ' ' + s + ' ' + s,
            dur: 200,
            easing: 'easeOutQuad'
          });
        });
      }
    });
  }

  // ─── 2. CONFIG-COLLECTIBLE ───────────────────────────────────────────
  // Click-to-collect: player walks up and clicks within range.
  // Hides the entity and dispatches 'play-item-collected'.
  // Bobbing animation while active. Hover pulse on mouseenter.
  if (!window.AFRAME.components['config-collectible']) {
    window.AFRAME.registerComponent('config-collectible', {
      schema: {},

      init: function () {
        var self = this;
        self._collected = false;
        self._bobOffset = Math.random() * Math.PI * 2;

        var handleClick = function () {
          var assetId = self.el.getAttribute('data-asset-id');
          if (self._collected) return;
          var items = window.currentPlayCollectibleItems;
          if (!items || !items.has(assetId)) return;

          // No distance check — raycaster click means player can see it
          self._collected = true;

          // Brief white flash
          var flash = document.createElement('a-entity');
          flash.setAttribute('geometry', 'primitive: sphere; radius: 0.6');
          flash.setAttribute('material', 'color: #ffffff; emissive: #ffffff; emissiveIntensity: 1; transparent: true; opacity: 0.8; shader: flat');
          flash.setAttribute('position', '0 0 0');
          flash.setAttribute('animation__fade', 'property: material.opacity; from: 0.8; to: 0; dur: 300; easing: easeOutQuad');
          flash.setAttribute('animation__grow', 'property: scale; from: 1 1 1; to: 2 2 2; dur: 300; easing: easeOutQuad');
          self.el.appendChild(flash);
          setTimeout(function () { try { self.el.removeChild(flash); } catch (_) {} }, 400);

          // Hide entity
          self.el.setAttribute('visible', 'false');

          window.dispatchEvent(new CustomEvent('play-item-collected', {
            detail: {
              assetId: assetId,
              assetName: self.el.getAttribute('data-asset-name') || assetId,
              phaseId: window.currentPlayPhaseId
            }
          }));
        };

        self.el.addEventListener('click', handleClick);
        self.el.addEventListener('triggerdown', handleClick);

        // Hover pulse — use auto-scale value as base to avoid resetting to 1
        self.el.addEventListener('mouseenter', function () {
          if (self._collected) return;
          var assetId = self.el.getAttribute('data-asset-id');
          var items = window.currentPlayCollectibleItems;
          if (!items || !items.has(assetId)) return;
          var base = parseFloat(self.el.getAttribute('data-auto-scale')) || 1;
          var up = (base * 1.15).toFixed(4);
          self.el.setAttribute('animation__hover', {
            property: 'scale', to: up + ' ' + up + ' ' + up, dur: 200, easing: 'easeOutQuad'
          });
        });
        self.el.addEventListener('mouseleave', function () {
          var base = parseFloat(self.el.getAttribute('data-auto-scale')) || 1;
          var s = base.toFixed(4);
          self.el.setAttribute('animation__hover', {
            property: 'scale', to: s + ' ' + s + ' ' + s, dur: 200, easing: 'easeOutQuad'
          });
        });
      },

      // Bobbing when active
      tick: function (time) {
        if (this._collected) return;
        var assetId = this.el.getAttribute('data-asset-id');
        var items = window.currentPlayCollectibleItems;
        if (!items || !items.has(assetId)) return;
        var baseY = parseFloat(this.el.getAttribute('data-base-y') || '0');
        this.el.object3D.position.y = baseY + Math.sin(time / 1000 + this._bobOffset) * 0.15;
      }
    });
  }

  // ─── 2b. CONFIG-DELIVERY-POINT ──────────────────────────────────────
  // On target assets. Click-to-deliver: player selects item in hotbar,
  // then clicks the target in 3D. No distance check, no E key.
  if (!window.AFRAME.components['config-delivery-point']) {
    window.AFRAME.registerComponent('config-delivery-point', {
      schema: {},

      init: function () {
        var self = this;
        self._pulseActive = false;

        function spawnParticleBurst(pos) {
          var sceneEl = self.el.sceneEl;
          for (var i = 0; i < 8; i++) {
            var angle = (i / 8) * Math.PI * 2;
            var r = 0.5;
            var particle = document.createElement('a-entity');
            particle.setAttribute('geometry', { primitive: 'sphere', radius: 0.05 });
            particle.setAttribute('material', { color: '#22c55e', emissive: '#22c55e', emissiveIntensity: 0.8 });
            particle.setAttribute('position', pos.x + ' ' + pos.y + ' ' + pos.z);
            particle.setAttribute('animation', {
              property: 'position',
              to: (pos.x + Math.cos(angle) * r) + ' ' + (pos.y + 0.3) + ' ' + (pos.z + Math.sin(angle) * r),
              dur: 800, easing: 'easeOutQuad'
            });
            particle.setAttribute('animation__fade', { property: 'material.opacity', from: 1, to: 0, dur: 800 });
            sceneEl.appendChild(particle);
            setTimeout(function (p) { try { sceneEl.removeChild(p); } catch (_) {} }, 1000, particle);
          }
        }

        // Click handler — delivers if this is the right target and an item is selected
        var handleClick = function () {
          var targetId = self.el.getAttribute('data-asset-id');
          var phaseType = window.currentPlayPhaseType;
          var isDeliveryPhase = phaseType === 'drag' || phaseType === 'drag-multi' || phaseType === 'drag-chain';

          console.log('[delivery-click]', targetId,
            'phase:', phaseType,
            'phaseId:', window.currentPlayPhaseId,
            'expected:', window.currentPlayDeliveryTargetId,
            'selected:', window.playSelectedItem,
            'inventory:', window.currentPlayInventory,
            'collectible:', window.currentPlayCollectibleItems ? Array.from(window.currentPlayCollectibleItems) : [],
            'deliverable:', window.currentPlayDeliverableItems ? Array.from(window.currentPlayDeliverableItems) : []);

          if (!isDeliveryPhase) return;
          if (targetId !== window.currentPlayDeliveryTargetId) return;

          // Check selected item from hotbar
          var selectedItem = window.playSelectedItem;
          if (!selectedItem) return;

          // Verify selected item is deliverable
          var deliverableItems = window.currentPlayDeliverableItems;
          if (!deliverableItems || !deliverableItems.has(selectedItem)) return;

          // Verify item is in inventory
          var inventory = window.currentPlayInventory;
          if (!inventory || inventory.indexOf(selectedItem) === -1) return;

          // Success — deliver
          var entityPos = new window.THREE.Vector3();
          self.el.object3D.getWorldPosition(entityPos);
          spawnParticleBurst(entityPos);

          window.dispatchEvent(new CustomEvent('play-drag-success', {
            detail: {
              phaseId: window.currentPlayPhaseId,
              assetId: selectedItem,
              phaseType: window.currentPlayPhaseType,
              delivered: true
            }
          }));
        };

        self.el.addEventListener('click', handleClick);
        self.el.addEventListener('triggerdown', handleClick);
      },

      tick: function () {
        var targetId = this.el.getAttribute('data-asset-id');
        var phaseType = window.currentPlayPhaseType;
        var isDeliveryPhase = phaseType === 'drag' || phaseType === 'drag-multi' || phaseType === 'drag-chain';
        var isActive = isDeliveryPhase && targetId === window.currentPlayDeliveryTargetId;

        // Pulse animation when player has a selected item and this is the target
        var shouldPulse = isActive && !!window.playSelectedItem;

        if (shouldPulse && !this._pulseActive) {
          this._pulseActive = true;
          var base = parseFloat(this.el.getAttribute('data-auto-scale')) || 1;
          var up = (base * 1.15).toFixed(4);
          var bs = base.toFixed(4);
          this.el.setAttribute('animation__deliverypulse', {
            property: 'scale', from: bs + ' ' + bs + ' ' + bs, to: up + ' ' + up + ' ' + up,
            dir: 'alternate', loop: true, dur: 800, easing: 'easeInOutSine'
          });
        } else if (!shouldPulse && this._pulseActive) {
          this.el.removeAttribute('animation__deliverypulse');
          var baseR = parseFloat(this.el.getAttribute('data-auto-scale')) || 1;
          this.el.object3D.scale.set(baseR, baseR, baseR);
          this._pulseActive = false;
        }
      },

      remove: function () {}
    });
  }

  // ─── 2c. CONFIG-COLLECTIBLE-BEACON ──────────────────────────────────
  // Vertical light beam above collectible items for long-range visibility.
  if (!window.AFRAME.components['config-collectible-beacon']) {
    window.AFRAME.registerComponent('config-collectible-beacon', {
      init: function () { this._beamEl = null; },
      tick: function () {
        var assetId = this.el.getAttribute('data-asset-id');
        var items = window.currentPlayCollectibleItems;
        var shouldShow = items && items.has(assetId) && this.el.getAttribute('visible') !== 'false';

        if (shouldShow && !this._beamEl) {
          var beam = document.createElement('a-entity');
          beam.setAttribute('geometry', 'primitive: cylinder; radius: 0.03; height: 8');
          beam.setAttribute('material', 'color: #F59E0B; emissive: #F59E0B; emissiveIntensity: 0.6; transparent: true; opacity: 0.3; shader: flat');
          beam.setAttribute('position', '0 4 0');
          beam.setAttribute('animation', 'property: material.opacity; from: 0.3; to: 0.1; dir: alternate; loop: true; dur: 1500');
          this.el.appendChild(beam);
          this._beamEl = beam;
        } else if (!shouldShow && this._beamEl) {
          try { this.el.removeChild(this._beamEl); } catch (_) {}
          this._beamEl = null;
        }
      }
    });
  }

  // ─── 3. CONFIG-PROXIMITY-TRIGGER ──────────────────────────────────────
  // Placed as a single persistent entity in the scene. On each tick it:
  //   1. Reads window.currentPlayPhaseType — active only during 'explore' phases
  //   2. Compares camera-rig XZ position to window.currentPlayExploreTarget
  //   3. Fires 'play-proximity-reached' when the player is within trigger_radius
  //   4. Renders a pulsing cyan ring on the ground at the target position
  if (!window.AFRAME.components['config-proximity-trigger']) {
    window.AFRAME.registerComponent('config-proximity-trigger', {
      init: function () {
        this._triggered = false;
        this._indicatorEl = null;
        this._lastPhaseId = null;
      },

      _createIndicator: function (target) {
        if (this._indicatorEl) return; // already exists
        var el = document.createElement('a-entity');
        el.setAttribute('position', target[0] + ' 0.05 ' + target[2]);
        el.setAttribute('geometry', 'primitive: torus; radius: 1.5; radiusTubular: 0.05');
        el.setAttribute('material', 'color: #00e5ff; emissive: #00e5ff; emissiveIntensity: 0.6; transparent: true; opacity: 0.8; shader: flat');
        el.setAttribute('rotation', '-90 0 0');
        el.setAttribute('animation', 'property: scale; to: 1.15 1.15 1.15; dir: alternate; loop: true; dur: 900; easing: easeInOutSine');
        // Outer glow ring
        var glow = document.createElement('a-entity');
        glow.setAttribute('geometry', 'primitive: torus; radius: 1.7; radiusTubular: 0.02');
        glow.setAttribute('material', 'color: #00e5ff; emissive: #00e5ff; emissiveIntensity: 0.3; transparent: true; opacity: 0.35; shader: flat');
        glow.setAttribute('animation', 'property: scale; to: 1.08 1.08 1.08; dir: alternate; loop: true; dur: 1400; easing: easeInOutSine');
        el.appendChild(glow);
        this.el.sceneEl.appendChild(el);
        this._indicatorEl = el;
      },

      _removeIndicator: function () {
        if (this._indicatorEl) {
          try { this.el.sceneEl.removeChild(this._indicatorEl); } catch (_) {}
          this._indicatorEl = null;
        }
      },

      tick: function () {
        var phaseId = window.currentPlayPhaseId;
        var phaseType = window.currentPlayPhaseType;

        // Detect phase change → reset triggered state and indicator
        if (phaseId !== this._lastPhaseId) {
          this._lastPhaseId = phaseId;
          this._triggered = false;
          this._removeIndicator();
        }

        var isExplore = phaseType === 'explore';

        if (isExplore && !this._indicatorEl && !this._triggered) {
          var target = window.currentPlayExploreTarget;
          if (target) this._createIndicator(target);
        } else if (!isExplore && this._indicatorEl) {
          this._removeIndicator();
        }

        if (!isExplore || this._triggered) return;

        var target = window.currentPlayExploreTarget;
        var radius = window.currentPlayExploreTriggerRadius || 2.0;
        if (!target) return;

        var head = document.getElementById('head');
        if (!head) return;

        var worldPos = new window.THREE.Vector3();
        head.object3D.getWorldPosition(worldPos);
        var dx = worldPos.x - target[0];
        var dz = worldPos.z - target[2];
        var dist = Math.sqrt(dx * dx + dz * dz);

        if (dist <= radius) {
          this._triggered = true;
          this._removeIndicator();
          window.dispatchEvent(new CustomEvent('play-proximity-reached', {
            detail: { phaseId: phaseId }
          }));
        }
      },

      remove: function () {
        this._removeIndicator();
      }
    });
  }

  // ─── 4. CONFIG-NPC-ENTITY ─────────────────────────────────────────────
  // Handles NPC proximity detection (shows "Press T to talk" within 3 units),
  // click-to-open-chat (dispatches `play-npc-talk`), and hover glow.
  if (!window.AFRAME.components['config-npc-entity']) {
    window.AFRAME.registerComponent('config-npc-entity', {
      init: function () {
        var self = this;
        self._hintEl = null;
        self._hintVisible = false;

        // Find the hint text element once children are loaded
        self.el.addEventListener('loaded', function () {
          self._hintEl = self.el.querySelector('[data-npc-hint]');
        });

        // Click / VR trigger → open chat
        var handleTalk = function () {
          window.dispatchEvent(new CustomEvent('play-npc-talk'));
        };
        self.el.addEventListener('click', handleTalk);
        self.el.addEventListener('triggerdown', handleTalk);

        // Hover scale pulse
        self.el.addEventListener('mouseenter', function () {
          self.el.setAttribute('animation__hover', {
            property: 'scale',
            to: '1.12 1.12 1.12',
            dur: 200,
            easing: 'easeOutQuad'
          });
        });
        self.el.addEventListener('mouseleave', function () {
          self.el.setAttribute('animation__hover', {
            property: 'scale',
            to: '1 1 1',
            dur: 200,
            easing: 'easeOutQuad'
          });
        });
      },

      tick: function () {
        var head = document.getElementById('head');
        if (!head || !this._hintEl) return;

        var worldPos = new window.THREE.Vector3();
        head.object3D.getWorldPosition(worldPos);
        var myPos = this.el.getAttribute('position');
        var dx = worldPos.x - (myPos.x || 0);
        var dz = worldPos.z - (myPos.z || 0);
        var dist = Math.sqrt(dx * dx + dz * dz);

        var shouldShow = dist <= 3.0;
        if (shouldShow !== this._hintVisible) {
          this._hintVisible = shouldShow;
          this._hintEl.setAttribute('visible', shouldShow ? 'true' : 'false');
        }
      }
    });
  }

  // ─── 5. LOWPOLY-TERRAIN ──────────────────────────────────────────────
  // Procedurally generates a low-poly terrain mesh using layered sin/cos
  // noise. Vertex colors are assigned per-vertex based on height + theme.
  if (!window.AFRAME.components['lowpoly-terrain']) {
    window.AFRAME.registerComponent('lowpoly-terrain', {
      schema: {
        theme: { default: 'grassland' },
        size: { default: 60 },
        segments: { default: 24 },
        maxHeight: { default: 3 },
        seed: { default: 42 }
      },

      init: function () {
        var d = this.data;
        var THREE = window.THREE;

        // 1. Geometry — horizontal plane
        var geo = new THREE.PlaneGeometry(d.size, d.size, d.segments, d.segments);
        geo.rotateX(-Math.PI / 2);

        // 2. Displace vertices with layered sin/cos noise
        var verts = geo.attributes.position.array;
        var half = d.size * 0.5;
        for (var i = 0; i < verts.length; i += 3) {
          var x = verts[i];
          var z = verts[i + 2];
          var h = 0;
          h += Math.sin(x * 0.1 + d.seed) * Math.cos(z * 0.1 + d.seed) * d.maxHeight * 0.5;
          h += Math.sin(x * 0.3 + d.seed * 2) * Math.cos(z * 0.2 + d.seed * 3) * d.maxHeight * 0.3;
          h += Math.sin(x * 0.7 + d.seed * 5) * Math.cos(z * 0.5 + d.seed * 7) * d.maxHeight * 0.15;
          // Edge fade — flatten borders so player can't walk onto cliffs
          var dist = Math.sqrt(x * x + z * z) / half;
          var fade = Math.max(0, 1 - dist * dist);
          verts[i + 1] = h * fade;
        }
        geo.computeVertexNormals();

        // 3. Height-based vertex colors
        var colorThemes = {
          grassland: { low: [0.2, 0.5, 0.3], mid: [0.3, 0.7, 0.2], high: [0.5, 0.4, 0.2], water: [0.2, 0.4, 0.7] },
          ocean:     { low: [0.1, 0.2, 0.4], mid: [0.1, 0.3, 0.5], high: [0.2, 0.4, 0.3], water: [0.05, 0.15, 0.35] },
          cell:      { low: [0.7, 0.5, 0.6], mid: [0.8, 0.6, 0.7], high: [0.6, 0.4, 0.5], water: [0.5, 0.3, 0.5] },
          lab:       { low: [0.85, 0.85, 0.85], mid: [0.9, 0.9, 0.9], high: [0.75, 0.75, 0.78], water: [0.7, 0.7, 0.72] },
          space:     { low: [0.15, 0.1, 0.2], mid: [0.2, 0.15, 0.25], high: [0.3, 0.2, 0.35], water: [0.1, 0.05, 0.15] }
        };
        var pal = colorThemes[d.theme] || colorThemes.grassland;

        var colors = [];
        for (var i = 0; i < verts.length; i += 3) {
          var y = verts[i + 1];
          var ratio = (y + d.maxHeight) / (d.maxHeight * 2);
          var c;
          if (y < -0.3)      c = pal.water;
          else if (ratio < 0.4) c = pal.low;
          else if (ratio < 0.7) c = pal.mid;
          else                   c = pal.high;
          // Slight random jitter for organic feel
          colors.push(
            c[0] + (Math.random() - 0.5) * 0.05,
            c[1] + (Math.random() - 0.5) * 0.05,
            c[2] + (Math.random() - 0.5) * 0.05
          );
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        // 4. Flat-shaded material → low-poly look
        var mat = new THREE.MeshLambertMaterial({
          vertexColors: true,
          flatShading: true
        });

        // 5. Add mesh
        var mesh = new THREE.Mesh(geo, mat);
        mesh.name = 'lowpoly-terrain';
        mesh.receiveShadow = true;
        this.el.setObject3D('mesh', mesh);

        // Expose for terrain-follow raycasting
        this.el.terrainMesh = mesh;
      }
    });
  }

  // ─── 5b. TERRAIN-FOLLOW ────────────────────────────────────────────────
  // Attached to camera rig. Raycasts downward each tick to find the terrain
  // surface height and pins the rig to it. Includes boundary clamping.
  if (!window.AFRAME.components['terrain-follow']) {
    window.AFRAME.registerComponent('terrain-follow', {
      schema: {
        offset: { default: 1.6 },   // eye height above ground
        boundary: { default: 55 }    // XZ clamp radius
      },

      init: function () {
        this._raycaster = new window.THREE.Raycaster(
          new window.THREE.Vector3(),
          new window.THREE.Vector3(0, -1, 0)
        );
        this._lastGroundY = 0;
      },

      tick: function () {
        var terrainEl = document.querySelector('[lowpoly-terrain]');
        if (!terrainEl || !terrainEl.terrainMesh) return;

        var pos = this.el.object3D.position;
        var bnd = this.data.boundary;

        // Boundary clamp
        if (pos.x > bnd)  pos.x = bnd;
        if (pos.x < -bnd) pos.x = -bnd;
        if (pos.z > bnd)  pos.z = bnd;
        if (pos.z < -bnd) pos.z = -bnd;

        // Raycast from high above straight down
        this._raycaster.ray.origin.set(pos.x, 50, pos.z);
        var hits = this._raycaster.intersectObject(terrainEl.terrainMesh);
        if (hits.length > 0) {
          this._lastGroundY = hits[0].point.y;
        }
        pos.y = this._lastGroundY + this.data.offset;
      }
    });
  }

  // ─── 5c. TERRAIN-SNAP ───────────────────────────────────────────────────
  // Attached to asset entities. Waits for model-loaded + auto-scale to finish,
  // then raycasts down to find terrain surface and pins entity so its model
  // bottom sits exactly on the ground.
  if (!window.AFRAME.components['terrain-snap']) {
    window.AFRAME.registerComponent('terrain-snap', {
      schema: {
        offset: { default: 0 },
        fallbackOffset: { default: 0.6 }
      },

      init: function () {
        var self = this;
        self._snapped = false;
        var el = self.el;

        var hasModel = el.hasAttribute('gltf-model') ||
                       el.querySelector('a-gltf-model') !== null ||
                       el.tagName === 'A-GLTF-MODEL';

        if (!hasModel) {
          // Placeholder path: snap after terrain is ready
          setTimeout(function () { self._snapToTerrain(false); }, 600);
          return;
        }

        // GLTF path — check if auto-scale is present
        var gltfChild = el.querySelector('a-gltf-model');
        var autoScaleTarget = gltfChild && gltfChild.hasAttribute('config-auto-scale') ? gltfChild : null;

        if (autoScaleTarget) {
          // Wait for auto-scale-complete (emitted after scale + centering)
          var onScaleComplete = function () {
            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                self._snapToTerrain(true);
              });
            });
          };
          autoScaleTarget.addEventListener('auto-scale-complete', onScaleComplete, { once: true });
          self._cleanup = function () {
            autoScaleTarget.removeEventListener('auto-scale-complete', onScaleComplete);
          };
        } else {
          // Fallback: no auto-scale, just wait for model-loaded + 2 frames
          var target = gltfChild || el;
          var onLoaded = function () {
            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                self._snapToTerrain(true);
              });
            });
          };
          target.addEventListener('model-loaded', onLoaded, { once: true });
          self._cleanup = function () {
            target.removeEventListener('model-loaded', onLoaded);
          };
        }
      },

      _snapToTerrain: function (hasModel) {
        if (this._snapped) return;
        this._snapped = true;

        var terrainEl = document.querySelector('[lowpoly-terrain]');
        if (!terrainEl || !terrainEl.terrainMesh) {
          console.log('[terrain-snap] No terrain found, skipping');
          return;
        }

        var pos = this.el.object3D.position;

        var raycaster = new window.THREE.Raycaster(
          new window.THREE.Vector3(pos.x, 50, pos.z),
          new window.THREE.Vector3(0, -1, 0)
        );
        var hits = raycaster.intersectObject(terrainEl.terrainMesh);
        if (hits.length === 0) {
          console.log('[terrain-snap] No hit at', pos.x.toFixed(1), pos.z.toFixed(1));
          return;
        }

        var groundY = hits[0].point.y;

        if (hasModel) {
          // Compute bbox from ONLY visible Mesh nodes — excludes hidden helpers,
          // invisible sub-nodes, and the parent's hit-detection sphere
          var gltfChild = this.el.querySelector('a-gltf-model');
          var bboxRoot = gltfChild ? gltfChild.object3D : this.el.object3D;
          bboxRoot.updateMatrixWorld(true);

          var box = new window.THREE.Box3();
          var hasAny = false;
          bboxRoot.traverse(function(node) {
            if (node.isMesh && node.visible && node.geometry) {
              if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
              var nodeBox = node.geometry.boundingBox.clone();
              nodeBox.applyMatrix4(node.matrixWorld);
              if (hasAny) {
                box.union(nodeBox);
              } else {
                box.copy(nodeBox);
                hasAny = true;
              }
            }
          });

          if (!hasAny) {
            // Fallback if no visible meshes found
            box.setFromObject(bboxRoot);
          }

          var bottomY = box.min.y;
          var topY = box.max.y;
          var height = topY - bottomY;
          var bottomOffset = pos.y - bottomY;
          var oldY = pos.y;
          pos.y = groundY + bottomOffset + this.data.offset;

          console.log('[terrain-snap] GLTF:', this.el.getAttribute('data-asset-id'),
            '| entity.y before:', oldY.toFixed(2),
            '| bbox min.y:', bottomY.toFixed(2),
            '| bbox max.y:', topY.toFixed(2),
            '| bbox height:', height.toFixed(2),
            '| bottomOffset:', bottomOffset.toFixed(2),
            '| groundY:', groundY.toFixed(2),
            '| final.y:', pos.y.toFixed(2));
        } else {
          pos.y = groundY + this.data.fallbackOffset + this.data.offset;
          var assetId = this.el.getAttribute('data-asset-id');
          console.log('[terrain-snap] Placeholder:',
            assetId || '(no asset-id, tag=' + this.el.tagName + ', classes=' + this.el.className + ')',
            '| groundY:', groundY.toFixed(2),
            '| fallbackOffset:', this.data.fallbackOffset,
            '| final.y:', pos.y.toFixed(2));
        }

        // Update data-base-y so config-collectible's bobbing uses the snapped Y
        this.el.setAttribute('data-base-y', String(pos.y));
      },

      remove: function () {
        if (this._cleanup) this._cleanup();
      }
    });
  }

  // ─── 5d. PLAY-GRAVITY (legacy fallback) ─────────────────────────────────
  // Kept for backward compat when no terrain is present.
  if (!window.AFRAME.components['play-gravity']) {
    window.AFRAME.registerComponent('play-gravity', {
      init: function () {
        this.velocity = 0;
        this.grounded = false;
      },
      tick: function (time, delta) {
        if (!delta) return;
        var pos = this.el.object3D.position;
        var groundY = 0;

        if (pos.y > groundY) {
          this.velocity += 9.8 * (delta / 1000);
          pos.y -= this.velocity * (delta / 1000);
          if (pos.y <= groundY) {
            pos.y = groundY;
            this.velocity = 0;
            this.grounded = true;
          }
        } else {
          pos.y = groundY;
          this.velocity = 0;
          this.grounded = true;
        }
      }
    });
  }

  // ─── 6. CONFIG-AUTO-SCALE ─────────────────────────────────────────────
  // Same as voyage auto-scale — normalizes GLB to target unit size.
  if (!window.AFRAME.components['config-auto-scale']) {
    window.AFRAME.registerComponent('config-auto-scale', {
      schema: { target: { type: 'number', default: 1.2 } },
      init: function () {
        this._scaled = false;
        this.onModelLoaded = this.onModelLoaded.bind(this);
        this.el.addEventListener('model-loaded', this.onModelLoaded);
      },
      onModelLoaded: function () {
        if (this._scaled) return; // only run once
        this._scaled = true;
        var self = this;
        // Wait one frame so the mesh hierarchy is fully set up
        setTimeout(function () {
          var meshNode = self.el.getObject3D('mesh');
          if (!meshNode) return;
          // Measure original bounding box (before any scale)
          var box = new window.THREE.Box3().setFromObject(meshNode);
          var size = box.getSize(new window.THREE.Vector3());
          var maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim <= 0) return;
          var s = self.data.target / maxDim;
          self.el.object3D.scale.set(s, s, s);
          self.el.setAttribute('data-auto-scale', s);
          // Force world matrix update so bounding box reflects the new scale
          self.el.object3D.updateMatrixWorld(true);
          // Notify terrain-snap that scaling is done
          self.el.emit('auto-scale-complete');
        }, 0);
      },
      remove: function () {
        this.el.removeEventListener('model-loaded', this.onModelLoaded);
      }
    });
  }

  // ─── 7. PLAY-NATIVE-CLICK-HANDLER ───────────────────────────────────
  // Registered on <a-scene>. Bypasses A-Frame's cursor/raycaster for GLTF
  // mesh clicks. Uses THREE.Raycaster directly against all meshes under
  // .clickable elements, then dispatches click on the parent entity with
  // data-asset-id. This fixes the issue where A-Frame raycaster can't
  // reliably hit GLTF child meshes and route clicks to the parent entity.
  if (!window.AFRAME.components['play-native-click-handler']) {
    window.AFRAME.registerComponent('play-native-click-handler', {
      init: function () {
        var sceneEl = this.el; // this.el IS the <a-scene> when registered on scene
        var raycaster = new window.THREE.Raycaster();
        var mouse = new window.THREE.Vector2();

        var handler = function (e) {
          // ── HUD click-through guard ──
          // If any DOM element above the canvas is at the click point,
          // this is a HUD button click (GOT IT, Continue, Quiz, etc.) — ignore it.
          var elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
          for (var i = 0; i < elementsAtPoint.length; i++) {
            var domEl = elementsAtPoint[i];
            if (domEl === sceneEl.canvas || domEl === sceneEl) continue;
            // Any non-canvas element above means this click targets HUD
            return;
          }

          var camera = sceneEl.camera;
          if (!camera) return;

          var rect = sceneEl.canvas.getBoundingClientRect();
          mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(mouse, camera);

          // Collect all meshes from .clickable entities
          var meshes = [];
          var clickables = sceneEl.querySelectorAll('.clickable');
          for (var i = 0; i < clickables.length; i++) {
            var el = clickables[i];
            if (!el.object3D) continue;
            el.object3D.traverse(function (obj) {
              if (obj.isMesh) {
                obj._parentClickable = el;
                meshes.push(obj);
              }
            });
          }

          var hits = raycaster.intersectObjects(meshes, false);
          if (hits.length === 0) return;

          // Walk up to find the entity with data-asset-id
          var targetEl = hits[0].object._parentClickable;
          while (targetEl && !targetEl.getAttribute('data-asset-id')) {
            targetEl = targetEl.parentElement;
          }
          if (!targetEl) return;

          console.log('[NATIVE-CLICK] Hit:', targetEl.getAttribute('data-asset-id'), 'dist:', hits[0].distance.toFixed(1));
          targetEl.dispatchEvent(new Event('click', { bubbles: false }));
        };

        this._handler = handler;

        // Canvas is ready when registered on scene at renderstart
        if (sceneEl.canvas) {
          sceneEl.canvas.addEventListener('click', handler);
          console.log('[PLAY] Native click handler installed');
        } else {
          sceneEl.addEventListener('renderstart', function () {
            sceneEl.canvas.addEventListener('click', handler);
            console.log('[PLAY] Native click handler installed (deferred)');
          });
        }
      },
      remove: function () {
        if (this.el.canvas && this._handler) {
          this.el.canvas.removeEventListener('click', this._handler);
        }
      }
    });
  }
}
