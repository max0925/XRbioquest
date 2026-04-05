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
            self.el.setAttribute('animation__hover', {
              property: 'scale',
              to: '1.15 1.15 1.15',
              dur: 200,
              easing: 'easeOutQuad'
            });
          }
        });

        self.el.addEventListener('mouseleave', function () {
          self.el.setAttribute('animation__hover', {
            property: 'scale',
            to: '1 1 1',
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

        // Hover pulse
        self.el.addEventListener('mouseenter', function () {
          if (self._collected) return;
          var assetId = self.el.getAttribute('data-asset-id');
          var items = window.currentPlayCollectibleItems;
          if (!items || !items.has(assetId)) return;
          self.el.setAttribute('animation__hover', {
            property: 'scale', to: '1.15 1.15 1.15', dur: 200, easing: 'easeOutQuad'
          });
        });
        self.el.addEventListener('mouseleave', function () {
          self.el.setAttribute('animation__hover', {
            property: 'scale', to: '1 1 1', dur: 200, easing: 'easeOutQuad'
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

          console.log('[delivery-click]', targetId, 'phase:', phaseType, 'expected:', window.currentPlayDeliveryTargetId,
            'selected:', window.playSelectedItem, 'inventory:', window.currentPlayInventory);

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
          this.el.setAttribute('animation__deliverypulse', {
            property: 'scale', to: '1.15 1.15 1.15',
            dir: 'alternate', loop: true, dur: 800, easing: 'easeInOutSine'
          });
        } else if (!shouldPulse && this._pulseActive) {
          this.el.removeAttribute('animation__deliverypulse');
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

        var rig = document.getElementById('camera-rig');
        if (!rig) return;

        var rigPos = rig.getAttribute('position');
        var dx = (rigPos.x || 0) - target[0];
        var dz = (rigPos.z || 0) - target[2];
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
        var rig = document.getElementById('camera-rig');
        if (!rig || !this._hintEl) return;

        var rigPos = rig.getAttribute('position');
        var myPos = this.el.getAttribute('position');
        var dx = (rigPos.x || 0) - (myPos.x || 0);
        var dz = (rigPos.z || 0) - (myPos.z || 0);
        var dist = Math.sqrt(dx * dx + dz * dz);

        var shouldShow = dist <= 3.0;
        if (shouldShow !== this._hintVisible) {
          this._hintVisible = shouldShow;
          this._hintEl.setAttribute('visible', shouldShow ? 'true' : 'false');
        }
      }
    });
  }

  // ─── 5. PLAY-GRAVITY ──────────────────────────────────────────────────
  // Pulls the camera rig down to y=1.6 (eye height at ground level).
  // Uses object3D.position directly — no schema, no attribute parsing issues.
  if (!window.AFRAME.components['play-gravity']) {
    window.AFRAME.registerComponent('play-gravity', {
      init: function () {
        this.raycaster = new window.THREE.Raycaster();
        this.downDir = new window.THREE.Vector3(0, -1, 0);
        this.groundY = 0;
        this.velocity = 0;
        this.hasGround = false;
        this._prevPos = new window.THREE.Vector3();
        this._directions = [
          new window.THREE.Vector3(1, 0, 0),
          new window.THREE.Vector3(-1, 0, 0),
          new window.THREE.Vector3(0, 0, 1),
          new window.THREE.Vector3(0, 0, -1),
        ];
      },
      tick: function (time, delta) {
        if (!delta) return;
        var rig = this.el;
        var pos = rig.object3D.position;

        // Horizontal collision check — cast 4 rays at knee height
        var mapEl = document.getElementById('map-model');
        if (mapEl && mapEl.getObject3D('mesh')) {
          var mesh = mapEl.getObject3D('mesh');
          var playerPos = new window.THREE.Vector3(pos.x, pos.y + 0.5, pos.z);

          for (var d = 0; d < this._directions.length; d++) {
            this.raycaster.set(playerPos, this._directions[d]);
            this.raycaster.far = 0.3;
            var hits = this.raycaster.intersectObject(mesh, true);
            if (hits.length > 0) {
              if (d < 2) pos.x = this._prevPos.x;
              else pos.z = this._prevPos.z;
            }
          }

          // Vertical: raycast down for ground height (highest Y)
          var origin = new window.THREE.Vector3(pos.x, pos.y + 5, pos.z);
          this.raycaster.set(origin, this.downDir);
          this.raycaster.far = 50;
          var intersects = this.raycaster.intersectObject(mesh, true);

          if (intersects.length > 0) {
            var highestY = -Infinity;
            for (var i = 0; i < intersects.length; i++) {
              if (intersects[i].point.y > highestY) {
                highestY = intersects[i].point.y;
              }
            }
            this.groundY = highestY;
            this.hasGround = true;
          }
        }

        // Apply gravity toward ground
        var targetY = this.hasGround ? this.groundY : 0;
        var eyeHeight = 1.6;
        var targetRigY = targetY + eyeHeight;

        if (pos.y > targetRigY + 0.1) {
          // Falling
          this.velocity += 15 * (delta / 1000);
          pos.y -= this.velocity * (delta / 1000);
          if (pos.y <= targetRigY) {
            pos.y = targetRigY;
            this.velocity = 0;
          }
        } else {
          // On ground — snap to terrain height
          pos.y = targetRigY;
          this.velocity = 0;
        }

        // Save current position for next frame
        this._prevPos.copy(pos);
      }
    });
  }

  // ─── 6. CONFIG-AUTO-SCALE ─────────────────────────────────────────────
  // Same as voyage auto-scale — normalizes GLB to target unit size.
  if (!window.AFRAME.components['config-auto-scale']) {
    window.AFRAME.registerComponent('config-auto-scale', {
      schema: { target: { type: 'number', default: 0.6 } },
      init: function () {
        this.onModelLoaded = this.onModelLoaded.bind(this);
        this.el.addEventListener('model-loaded', this.onModelLoaded);
      },
      onModelLoaded: function (evt) {
        var mesh = evt.detail.model;
        if (!mesh) return;
        var box = new window.THREE.Box3().setFromObject(mesh);
        var size = box.getSize(new window.THREE.Vector3());
        var maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          var s = this.data.target / maxDim;
          this.el.setAttribute('scale', s + ' ' + s + ' ' + s);
        }
      },
      remove: function () {
        this.el.removeEventListener('model-loaded', this.onModelLoaded);
      }
    });
  }
}
