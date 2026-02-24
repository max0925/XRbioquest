// @ts-nocheck

// ═══════════════════════════════════════════════════════════════════════════
// A-Frame Component Registrations for Voyage
// ═══════════════════════════════════════════════════════════════════════════
//
// Components:
//   1. game-clickable    — Phase-aware clicking (phase 1 click-to-advance)
//   2. game-draggable    — 3D drag with per-phase snap targets + spring-return
//   3. auto-scale        — Normalizes models to target unit size
//   4. simple-grab       — VR hand grabbing

export function registerVoyageComponents() {
    if (!window.AFRAME) return;

    // ═══════════════════════════════════════════════════════════════
    // 1. GAME-CLICKABLE
    // ═══════════════════════════════════════════════════════════════
    //
    // Phase 1: Click Mitochondria → phase-advance + show-knowledge
    // Phase 3/4: Clicking drag targets does nothing (drag only)
    // Wrong clicks in phase 1: wrong-click event
    //
    if (!window.AFRAME.components['game-clickable']) {
        window.AFRAME.registerComponent('game-clickable', {
            schema: {
                name: { type: 'string' },
                targetPhase: { type: 'number', default: -1 }
            },
            init: function () {
                var self = this;

                // Click handler — reads data-name from the element
                self.el.addEventListener('click', function () {
                    var name = self.el.getAttribute('data-name');
                    var phase = window.currentPhase;
                    console.log('[CLICK] name:', name, 'phase:', phase);

                    if (!name) return;

                    if (phase === 1) {
                        if (name === 'Mitochondria') {
                            window.dispatchEvent(new CustomEvent('phase-advance'));
                            window.dispatchEvent(new CustomEvent('show-knowledge', { detail: { phase: 1 } }));
                        } else {
                            window.dispatchEvent(new CustomEvent('wrong-click', { detail: { name: name } }));
                        }
                    }
                    // Phase 3/4: drag-only — clicking does nothing
                    // Phase 0, 2, 5: no click targets
                });

                // Hover effects
                self.el.addEventListener('mouseenter', function () {
                    if (window.currentPhase === 1) {
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

    // ═══════════════════════════════════════════════════════════════
    // 2. GAME-DRAGGABLE
    // ═══════════════════════════════════════════════════════════════
    //
    // Makes tagged entity draggable in 3D space.
    // On drag end: check proximity to phase-specific snap target.
    // Success → snap + dispatch 'drag-success'
    // Fail → spring-return to original position over 0.5s
    //
    // Snap targets by phase:
    //   Phase 2: Glucose Molecule → Mitochondria
    //   Phase 3: Damaged Protein → Lysosome
    //   Phase 4 step 0: Polypeptide → Endoplasmic Reticulum
    //   Phase 4 step 1: Processed Protein → Golgi Apparatus
    //
    if (!window.AFRAME.components['game-draggable']) {
        window.AFRAME.registerComponent('game-draggable', {
            schema: {
                name: { type: 'string' },
                snapDistance: { type: 'number', default: 2.0 }
            },
            init: function () {
                var self = this;
                var isDragging = false;
                var dragStarted = false;
                var originalPosition = null;

                // Hardcoded snap target positions (from organelles.ts config)
                var SNAP_POSITIONS = {
                    'Mitochondria': { x: -1.5, y: 0, z: -3 },
                    'Lysosome': { x: 1.5, y: 0, z: -3 },
                    'Endoplasmic Reticulum': { x: 0, y: 0, z: -4.5 },
                    'Golgi Apparatus': { x: -3, y: 0, z: -4 },
                };

                function getSnapPosition(targetName) {
                    return SNAP_POSITIONS[targetName] || null;
                }

                // Store original position on load
                self.el.addEventListener('loaded', function () {
                    var pos = self.el.getAttribute('position');
                    originalPosition = { x: parseFloat(pos.x) || 0, y: parseFloat(pos.y) || 0, z: parseFloat(pos.z) || 0 };
                    console.log('[DRAG] Loaded entity:', self.el.getAttribute('data-name'), 'at', originalPosition);
                });

                // ── Helper: get snap target for current phase ──
                function getSnapTarget(phase) {
                    if (phase === 2) return { name: 'Mitochondria' };
                    if (phase === 3) return { name: 'Lysosome' };
                    if (phase === 4) {
                        var step = window.voyagePhaseStep || 0;
                        if (step === 0) return { name: 'Endoplasmic Reticulum' };
                        if (step === 1) return { name: 'Golgi Apparatus' };
                    }
                    return null;
                }

                // ── MOUSEDOWN: start drag ──
                self.el.addEventListener('mousedown', function (evt) {
                    var name = self.el.getAttribute('data-name');
                    var phase = window.currentPhase;
                    console.log('[DRAG] mousedown on', name, 'phase:', phase);

                    // Only allow drag in appropriate phases
                    if (phase === 2 && name !== 'Glucose Molecule') return;
                    if (phase === 3 && name !== 'Damaged Protein') return;
                    if (phase === 4 && name !== 'Polypeptide' && name !== 'Processed Protein') return;
                    if (phase !== 2 && phase !== 3 && phase !== 4) return;

                    isDragging = true;
                    dragStarted = true;
                    // Get world position (not local) to avoid position jump on drag start
                    var worldPos = new window.THREE.Vector3();
                    self.el.object3D.getWorldPosition(worldPos);
                    originalPosition = { x: worldPos.x, y: worldPos.y, z: worldPos.z };

                    // Prevent camera movement while dragging
                    var scene = self.el.sceneEl;
                    if (scene.camera && scene.camera.el) {
                        scene.camera.el.setAttribute('look-controls', 'enabled', false);
                    }

                    console.log('[DRAG] Ready to drag', name, 'from', originalPosition);
                });

                // ── MOUSEMOVE: move entity in 3D ──
                window.addEventListener('mousemove', function (evt) {
                    if (!isDragging || !dragStarted) return;
                    var scene = self.el.sceneEl;
                    if (!scene || !scene.canvas || !scene.camera) return;
                    var rect = scene.canvas.getBoundingClientRect();
                    var mx = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
                    var my = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
                    var rc = new window.THREE.Raycaster();
                    rc.setFromCamera(new window.THREE.Vector2(mx, my), scene.camera);
                    var planeZ = originalPosition ? originalPosition.z : -3;
                    var pl = new window.THREE.Plane(new window.THREE.Vector3(0,0,1), -planeZ);
                    var pt = new window.THREE.Vector3();
                    rc.ray.intersectPlane(pl, pt);
                    if (pt) self.el.setAttribute('position', {x: pt.x, y: pt.y, z: planeZ});
                });

                // ── MOUSEUP: check snap target ──
                window.addEventListener('mouseup', function () {
                    if (!isDragging) return;
                    isDragging = false;

                    // Re-enable camera controls
                    var scene = self.el.sceneEl;
                    if (scene.camera && scene.camera.el) {
                        scene.camera.el.setAttribute('look-controls', 'enabled', true);
                    }

                    if (!dragStarted) {
                        console.log('[DRAG] Was a click, not a drag — ignoring');
                        return;
                    }

                    var name = self.el.getAttribute('data-name');
                    var phase = window.currentPhase;
                    console.log('[DRAG] mouseup — dropped', name, 'in phase', phase);

                    var targetInfo = getSnapTarget(phase);
                    if (!targetInfo) {
                        if (originalPosition) self.el.setAttribute('position', originalPosition);
                        return;
                    }

                    // Use hardcoded snap position (not affected by camera rig offset)
                    var targetPos = getSnapPosition(targetInfo.name);
                    if (!targetPos) {
                        console.log('[DRAG] No snap position for:', targetInfo.name);
                        if (originalPosition) self.el.setAttribute('position', originalPosition);
                        return;
                    }

                    // Read local position from DOM attribute
                    var currentPos = self.el.getAttribute('position');
                    var dx = currentPos.x - targetPos.x;
                    var dy = currentPos.y - targetPos.y;
                    var dz = currentPos.z - targetPos.z;
                    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    console.log('[DRAG] Local distance to', targetInfo.name + ':', dist.toFixed(2));

                    // Phase-dependent snap distance: 3.0 for phase 2, 2.0 for others
                    var snapDist = phase === 2 ? 3.0 : self.data.snapDistance;
                    if (dist < snapDist) {
                        // ── SUCCESS ──
                        console.log('[DRAG] ✓ Snap success!');
                        // Entity stays where dropped — React will unmount it on phase advance

                        // Green particle burst
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
                            setTimeout(function (p) { try { sceneEl.removeChild(p); } catch (e) { } }, 1000, particle);
                        }

                        window.dispatchEvent(new CustomEvent('drag-success', {
                            detail: { phase: phase, item: name }
                        }));
                    } else {
                        // ── FAIL — instant return to original ──
                        console.log('[DRAG] ✗ Too far, returning to', originalPosition);
                        if (originalPosition) {
                            self.el.setAttribute('position', originalPosition);
                        }
                    }
                });
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. AUTO-SCALE (unchanged)
    // ═══════════════════════════════════════════════════════════════
    if (!window.AFRAME.components['auto-scale']) {
        console.log('[VOYAGE] Registering auto-scale component...');
        window.AFRAME.registerComponent('auto-scale', {
            schema: {
                target: { type: 'number', default: 0.6 }
            },
            init: function () {
                this.onModelLoaded = this.onModelLoaded.bind(this);
                this.el.addEventListener('model-loaded', this.onModelLoaded);
            },
            onModelLoaded: function (evt) {
                const mesh = evt.detail.model;
                if (!mesh) return;
                const box = new window.THREE.Box3().setFromObject(mesh);
                const size = box.getSize(new window.THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                if (maxDim > 0) {
                    const s = this.data.target / maxDim;
                    this.el.setAttribute('scale', `${s} ${s} ${s}`);
                    console.log('[AUTO-SCALE] maxDim=' + maxDim.toFixed(2) + ' scale=' + s.toFixed(4));
                }
            },
            remove: function () {
                this.el.removeEventListener('model-loaded', this.onModelLoaded);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. SIMPLE-GRAB (VR hand grabbing)
    // ═══════════════════════════════════════════════════════════════
    if (!window.AFRAME.components['simple-grab']) {
        window.AFRAME.registerComponent('simple-grab', {
            init: function () {
                this.grabbedTarget = null;
                this.onTriggerDown = this.onTriggerDown.bind(this);
                this.onTriggerUp = this.onTriggerUp.bind(this);
            },
            play: function () {
                this.el.addEventListener('triggerdown', this.onTriggerDown);
                this.el.addEventListener('triggerup', this.onTriggerUp);
            },
            pause: function () {
                this.el.removeEventListener('triggerdown', this.onTriggerDown);
                this.el.removeEventListener('triggerup', this.onTriggerUp);
            },
            onTriggerDown: function () {
                const raycaster = this.el.components.raycaster;
                if (raycaster && raycaster.intersections.length > 0) {
                    const intersection = raycaster.intersections[0];
                    let target = intersection.object.el;
                    while (target && !target.classList.contains('grabbable')) {
                        target = target.parentElement;
                    }
                    if (target && target.classList.contains('grabbable')) {
                        this.grabbedTarget = target;
                        this.el.object3D.attach(target.object3D);
                    }
                }
            },
            onTriggerUp: function () {
                if (this.grabbedTarget) {
                    const sceneEl = this.el.sceneEl;
                    sceneEl.object3D.attach(this.grabbedTarget.object3D);
                    this.grabbedTarget = null;
                }
            }
        });
    }
}
