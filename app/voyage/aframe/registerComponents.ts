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
                snapDistance: { type: 'number', default: 1.5 }
            },
            init: function () {
                var self = this;
                var isDragging = false;
                var dragStarted = false;
                var mouseStartX = 0;
                var mouseStartY = 0;
                var originalPosition = null;

                // Store original position on load
                self.el.addEventListener('loaded', function () {
                    var pos = self.el.getAttribute('position');
                    originalPosition = { x: pos.x, y: pos.y, z: pos.z };
                    console.log('[DRAG] Loaded entity:', self.el.getAttribute('data-name'), 'at', originalPosition);
                });

                // ── Helper: find snap target element by data-name ──
                function findTargetEl(targetName) {
                    var el = document.querySelector('[data-name="' + targetName + '"]');
                    if (el) {
                        var pos = el.getAttribute('position');
                        console.log('[DRAG]', targetName, 'actual position:', pos);
                        return { x: pos.x, y: pos.y, z: pos.z };
                    }
                    return null;
                }

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
                    dragStarted = false; // don't move until threshold reached
                    mouseStartX = evt.clientX || 0;
                    mouseStartY = evt.clientY || 0;
                    originalPosition = Object.assign({}, self.el.getAttribute('position'));

                    // Prevent camera movement while dragging
                    var scene = self.el.sceneEl;
                    if (scene.camera && scene.camera.el) {
                        scene.camera.el.setAttribute('look-controls', 'enabled', false);
                    }

                    console.log('[DRAG] Ready to drag', name, 'from', originalPosition);
                });

                // ── MOUSEMOVE: move entity in 3D ──
                window.addEventListener('mousemove', function (evt) {
                    if (!isDragging) return;

                    // Check 5px threshold before starting actual movement
                    if (!dragStarted) {
                        var mdx = Math.abs(evt.clientX - mouseStartX);
                        var mdy = Math.abs(evt.clientY - mouseStartY);
                        if (mdx < 5 && mdy < 5) return; // haven't moved enough yet
                        dragStarted = true;
                        console.log('[DRAG] Drag threshold reached, moving entity');
                    }

                    var scene = self.el.sceneEl;
                    if (!scene || !scene.canvas || !scene.camera) return;

                    var rect = scene.canvas.getBoundingClientRect();
                    var x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
                    var y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;

                    // Unproject screen position to world at entity's Z plane
                    var camera = scene.camera;
                    var vector = new window.THREE.Vector3(x, y, 0.5);
                    vector.unproject(camera);
                    var dir = vector.sub(camera.position).normalize();
                    var targetZ = originalPosition ? originalPosition.z : -3;
                    var distance = (targetZ - camera.position.z) / dir.z;
                    var pos = camera.position.clone().add(dir.multiplyScalar(distance));

                    self.el.setAttribute('position', { x: pos.x, y: pos.y, z: targetZ });
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

                    // Was just a click, not a real drag — do nothing
                    if (!dragStarted) {
                        console.log('[DRAG] Was a click, not a drag — ignoring');
                        return;
                    }

                    var name = self.el.getAttribute('data-name');
                    var phase = window.currentPhase;
                    console.log('[DRAG] mouseup — dropped', name, 'in phase', phase);

                    // Get snap target info for this phase
                    var targetInfo = getSnapTarget(phase);
                    if (!targetInfo) {
                        if (originalPosition) self.el.setAttribute('position', originalPosition);
                        return;
                    }

                    // Read LIVE position of the target organelle from the DOM
                    var targetPos = findTargetEl(targetInfo.name);
                    if (!targetPos) {
                        console.log('[DRAG] Target element not found:', targetInfo.name);
                        if (originalPosition) self.el.setAttribute('position', originalPosition);
                        return;
                    }

                    var currentPos = self.el.getAttribute('position');
                    var dx = currentPos.x - targetPos.x;
                    var dy = currentPos.y - targetPos.y;
                    var dz = currentPos.z - targetPos.z;
                    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    console.log('[DRAG] Distance to', targetInfo.name + ':', dist.toFixed(2));

                    if (dist < self.data.snapDistance) {
                        // ── SUCCESS ──
                        console.log('[DRAG] ✓ Snap success!');
                        self.el.setAttribute('position', targetPos);

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
                        // ── FAIL — return to original ──
                        console.log('[DRAG] ✗ Too far, returning to', originalPosition);
                        if (originalPosition) {
                            self.el.setAttribute('animation__spring', {
                                property: 'position',
                                to: originalPosition.x + ' ' + originalPosition.y + ' ' + originalPosition.z,
                                dur: 500,
                                easing: 'easeOutElastic'
                            });
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
