// @ts-nocheck
// The sole movement controller for registered physical maps. It replaces both
// movement-controls and wasd-controls so collision cannot be bypassed.
import { MapCollisionWorld } from '@/lib/maps/collision';

export function registerMapWalk() {
  if (!window.AFRAME || window.AFRAME.components['map-walk']) return;

  window.AFRAME.registerComponent('map-walk', {
    schema: {
      collisionPath: { default: '' },
      speed: { default: 3 },
      radius: { default: 0.3 },
      spawn: { type: 'vec3' },
      camera: { type: 'selector' },
      enabled: { default: true },
    },
    init() {
      this.keys = new Set();
      this.ready = false;
      this.direction = new window.AFRAME.THREE.Vector3();
      this.abort = new AbortController();
      this.down = (event: KeyboardEvent) => {
        if (event.target?.closest?.('input,textarea,select,[contenteditable]')) return;
        if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.code)) {
          event.preventDefault();
          this.keys.add(event.code);
        }
      };
      this.up = (event: KeyboardEvent) => this.keys.delete(event.code);
      this.clear = () => this.keys.clear();

      fetch(this.data.collisionPath, { signal: this.abort.signal })
        .then((response: Response) => {
          if (!response.ok) throw new Error(`Map collision HTTP ${response.status}`);
          return response.json();
        })
        .then((data: any) => {
          this.world = new MapCollisionWorld(data, this.data.radius);
          const spawn = this.data.spawn;
          if (!this.world.isFree(spawn.x, spawn.z)) throw new Error('Map spawn is outside walkable space');
          this.el.object3D.position.set(spawn.x, this.world.groundHeight(spawn.x, spawn.z) + 0.06, spawn.z);
          // Keep an authoritative last-safe location. Existing VR helpers in
          // the application can otherwise change the rig position directly;
          // a GLB is visual only, so every movement path must pass through the
          // collision world rather than trusting those helpers.
          this.lastSafe = this.el.object3D.position.clone();
          this.ready = true;
          this.el.emit('map-ready');
        })
        .catch((error: Error) => {
          if (error.name !== 'AbortError') this.el.emit('map-runtime-error', { message: error.message }, true);
        });
    },
    play() {
      window.addEventListener('keydown', this.down);
      window.addEventListener('keyup', this.up);
      window.addEventListener('blur', this.clear);
    },
    pause() {
      window.removeEventListener('keydown', this.down);
      window.removeEventListener('keyup', this.up);
      window.removeEventListener('blur', this.clear);
      this.clear();
    },
    update() {
      if (!this.data.enabled) this.clear();
    },
    remove() {
      this.pause();
      this.abort.abort();
    },
    tick(_time: number, delta: number) {
      if (!this.ready || !this.data.enabled || !delta || !this.data.camera) return;
      const position = this.el.object3D.position;

      // Reconcile any movement made by another component between frames (for
      // example, a gamepad/thumbstick or a teleport implementation). This
      // preserves a valid walk path, blocks jumps through trees, and restores
      // the last safe position when an external controller leaves the map.
      const driftX = position.x - this.lastSafe.x;
      const driftZ = position.z - this.lastSafe.z;
      if (Math.hypot(driftX, driftZ) > 0.0001) {
        const reconciled = this.world.move(this.lastSafe, driftX, driftZ);
        position.set(reconciled.x, reconciled.y, reconciled.z);
        this.lastSafe.copy(position);
      }

      let forward = Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'));
      let right = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
      if (!forward && !right) return;
      const length = Math.hypot(forward, right);
      forward /= length;
      right /= length;
      this.data.camera.object3D.getWorldDirection(this.direction);
      this.direction.negate();
      this.direction.y = 0;
      if (this.direction.lengthSq() < 1e-8) return;
      this.direction.normalize();
      const distance = Math.max(0, this.data.speed) * Math.min(delta, 100) / 1000;
      const dx = (this.direction.x * forward - this.direction.z * right) * distance;
      const dz = (this.direction.z * forward + this.direction.x * right) * distance;
      const next = this.world.move(this.lastSafe, dx, dz);
      position.set(next.x, next.y, next.z);
      this.lastSafe.copy(position);
    },
  });
}
