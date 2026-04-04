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
//   window.playAssetPositions        Record<assetId, [x,y,z]>
//   window.currentPlayPhaseType      'intro'|'click'|'drag'|'drag-multi'|'drag-chain'|'complete'
//   window.currentPlayPhaseId        string  e.g. "find-mito"
//   window.currentPlayClickTarget    string  asset ID (ClickPhase only)
//   window.currentPlayDragItems      Set<string>  asset IDs that can be dragged right now
//   window.currentPlaySnapTargetId   string  asset ID to snap to (updated per chain step)
//   window.currentPlaySnapDistance   number  world-units snap radius
//   window.currentPlayChainIsLastStep boolean  true when drag-chain is on its final step
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

  // ─── 2. CONFIG-DRAGGABLE ─────────────────────────────────────────────
  // 3D drag with config-driven snap targets and spring-return.
  //
  // On drag end:
  //   • Checks if this asset is in window.currentPlayDragItems
  //   • Looks up snap target position from window.playAssetPositions
  //   • Success → snap (or re-allow for intermediate chain steps)
  //   • Fail    → spring-return to original position
  //
  if (!window.AFRAME.components['config-draggable']) {
    window.AFRAME.registerComponent('config-draggable', {
      schema: {
        snapDistance: { type: 'number', default: 2.0 }
      },

      init: function () {
        var self = this;
        self.isDragging = false;
        self.dragStarted = false;
        self.originalPosition = null;
        var snapped = false;

        // ── Store original position on entity load ──
        self.el.addEventListener('loaded', function () {
          var pos = self.el.getAttribute('position');
          self.originalPosition = {
            x: parseFloat(pos.x) || 0,
            y: parseFloat(pos.y) || 0,
            z: parseFloat(pos.z) || 0
          };
        });

        // ── Helpers ──
        function getMyAssetId() {
          return self.el.getAttribute('data-asset-id') || '';
        }

        function amIDraggableNow() {
          var id = getMyAssetId();
          var items = window.currentPlayDragItems;
          return items && items.has(id);
        }

        function getSnapTargetPosition() {
          var targetId = window.currentPlaySnapTargetId;
          if (!targetId) return null;
          var positions = window.playAssetPositions;
          if (!positions) return null;
          var pos = positions[targetId];
          if (!pos) return null;
          return { x: pos[0], y: pos[1], z: pos[2] };
        }

        function getSnapDistance() {
          return window.currentPlaySnapDistance || self.data.snapDistance;
        }

        function spawnParticleBurst(targetPos) {
          var sceneEl = self.el.sceneEl;
          for (var i = 0; i < 8; i++) {
            var angle = (i / 8) * Math.PI * 2;
            var r = 0.5;
            var particle = document.createElement('a-entity');
            particle.setAttribute('geometry', { primitive: 'sphere', radius: 0.05 });
            particle.setAttribute('material', { color: '#22c55e', emissive: '#22c55e', emissiveIntensity: 0.8 });
            particle.setAttribute('position', targetPos.x + ' ' + targetPos.y + ' ' + targetPos.z);
            particle.setAttribute('animation', {
              property: 'position',
              to: (targetPos.x + Math.cos(angle) * r) + ' ' + (targetPos.y + 0.3) + ' ' + (targetPos.z + Math.sin(angle) * r),
              dur: 800,
              easing: 'easeOutQuad'
            });
            particle.setAttribute('animation__fade', { property: 'material.opacity', from: 1, to: 0, dur: 800 });
            sceneEl.appendChild(particle);
            setTimeout(function (p) { try { sceneEl.removeChild(p); } catch (_) { } }, 1000, particle);
          }
        }

        // ── Start drag ──
        var startDrag = function () {
          if (snapped) return;
          if (!amIDraggableNow()) return;

          self.isDragging = true;
          self.dragStarted = true;

          var worldPos = new window.THREE.Vector3();
          self.el.object3D.getWorldPosition(worldPos);
          self.originalPosition = { x: worldPos.x, y: worldPos.y, z: worldPos.z };

          // Disable camera look while dragging
          var scene = self.el.sceneEl;
          if (scene.camera && scene.camera.el) {
            scene.camera.el.setAttribute('look-controls', 'enabled', false);
          }
        };

        self.el.addEventListener('mousedown', startDrag);
        self.el.addEventListener('triggerdown', startDrag);

        // ── Mouse move ──
        window.addEventListener('mousemove', function (evt) {
          if (!self.isDragging || !self.dragStarted) return;
          var scene = self.el.sceneEl;
          if (!scene || !scene.canvas || !scene.camera) return;

          var rect = scene.canvas.getBoundingClientRect();
          var mx = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
          var my = -((evt.clientY - rect.top) / rect.height) * 2 + 1;

          var rc = new window.THREE.Raycaster();
          rc.setFromCamera(new window.THREE.Vector2(mx, my), scene.camera);

          var planeZ = self.originalPosition ? self.originalPosition.z : -3;
          var pl = new window.THREE.Plane(new window.THREE.Vector3(0, 0, 1), -planeZ);
          var pt = new window.THREE.Vector3();
          rc.ray.intersectPlane(pl, pt);
          if (pt) self.el.setAttribute('position', { x: pt.x, y: pt.y, z: planeZ });
        });

        // ── End drag ──
        var endDrag = function () {
          if (!self.isDragging) return;
          self.isDragging = false;

          var scene = self.el.sceneEl;
          if (scene.camera && scene.camera.el) {
            scene.camera.el.setAttribute('look-controls', 'enabled', true);
          }

          if (!self.dragStarted) return;

          var phaseType = window.currentPlayPhaseType;
          var isDragMulti = phaseType === 'drag-multi';
          var isDragChain = phaseType === 'drag-chain';

          var targetPos = getSnapTargetPosition();
          if (!targetPos) {
            if (!isDragMulti && self.originalPosition) {
              self.el.setAttribute('position', self.originalPosition);
            }
            self.dragStarted = false;
            return;
          }

          // World position for distance check
          var worldPos = new window.THREE.Vector3();
          self.el.object3D.getWorldPosition(worldPos);
          var dx = worldPos.x - targetPos.x;
          var dy = worldPos.y - targetPos.y;
          var dz = worldPos.z - targetPos.z;
          var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          var snapDist = getSnapDistance();

          console.log('[CONFIG-DRAG] dist to snap target:', dist.toFixed(2), 'threshold:', snapDist);

          if (dist < snapDist) {
            // ── SUCCESS ──
            spawnParticleBurst(targetPos);

            var isChain = isDragChain;
            var isLastChainStep = window.currentPlayChainIsLastStep;

            if (isChain && !isLastChainStep) {
              // Intermediate chain step: snap entity to target but DON'T lock it
              // (user needs to pick it up again for the next step)
              self.el.setAttribute('position', targetPos);
              self.originalPosition = { x: targetPos.x, y: targetPos.y, z: targetPos.z };
              // snapped stays false — entity remains draggable for next step
            } else {
              // Final snap: lock the entity
              snapped = true;
            }

            window.dispatchEvent(new CustomEvent('play-drag-success', {
              detail: {
                phaseId: window.currentPlayPhaseId,
                assetId: getMyAssetId(),
                phaseType: phaseType
              }
            }));
          } else {
            // ── FAIL — return to original (drag-multi items stay where dropped) ──
            if (!isDragMulti && self.originalPosition) {
              self.el.setAttribute('position', self.originalPosition);
            }
          }

          self.dragStarted = false;
        };

        window.addEventListener('mouseup', endDrag);
        window.addEventListener('triggerup', endDrag);

        // ── Pull-to-hand release (VR) ──
        window.addEventListener('pull-release', function (evt) {
          if (!evt.detail || evt.detail.target !== self.el) return;
          if (!amIDraggableNow() || snapped) return;

          self.dragStarted = true;
          // Reuse endDrag logic after a tick so position is updated
          setTimeout(endDrag, 16);
        });
      },

      // ── Tick: VR controller drag movement ──
      tick: function () {
        if (!this.isDragging || !this.dragStarted) return;

        var leftHand = document.getElementById('leftHand');
        var rightHand = document.getElementById('rightHand');
        if (!leftHand || !rightHand) return;

        var intersection = null;
        var activeController = null;

        if (leftHand.components && leftHand.components.raycaster) {
          var li = leftHand.components.raycaster.getIntersection(this.el);
          if (li) { activeController = leftHand; intersection = li; }
        }
        if (!intersection && rightHand.components && rightHand.components.raycaster) {
          var ri = rightHand.components.raycaster.getIntersection(this.el);
          if (ri) { activeController = rightHand; intersection = ri; }
        }

        if (activeController && activeController.components.raycaster) {
          var rc = activeController.components.raycaster.raycaster;
          var planeZ = this.originalPosition ? this.originalPosition.z : -3;
          var pl = new window.THREE.Plane(new window.THREE.Vector3(0, 0, 1), -planeZ);
          var pt = new window.THREE.Vector3();
          var hit = rc.ray.intersectPlane(pl, pt);
          if (hit && pt) {
            this.el.setAttribute('position', { x: pt.x, y: pt.y, z: planeZ });
          }
        }
      }
    });
  }

  // ─── 3. CONFIG-AUTO-SCALE ─────────────────────────────────────────────
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
