// @ts-nocheck
// Desktop-only movement authority for registered physical maps. This stays
// separate from the WebXR map-walk path used by Voyage's headset scene.
import { MapCollisionWorld } from '@/lib/maps/collision';

export function registerDesktopMapWalk() {
  if (!window.AFRAME || window.AFRAME.components['desktop-map-walk']) return;

  window.AFRAME.registerComponent('desktop-map-walk', {
    schema: {
      collisionPath: { default: '' },
      speed: { default: 5 },
      radius: { default: 0.35 },
      spawn: { type: 'vec3' },
      enabled: { default: true },
    },
    init() {
      this.keys = new Set();
      this.ready = false;
      this.forward = new window.AFRAME.THREE.Vector3();
      this.right = new window.AFRAME.THREE.Vector3();
      this.cameraQuaternion = new window.AFRAME.THREE.Quaternion();
      this.abort = new AbortController();
      this.invalidMovementReported = false;
      this.reportInvalidMovement = (stage, values, reason) => {
        if (this.invalidMovementReported || process.env.NODE_ENV === 'production') return;
        const invalid = Object.entries(values)
          .filter(([, value]) => !Number.isFinite(value))
          .map(([name, value]) => ({ name, value }));
        if (!invalid.length && !reason) return;
        this.invalidMovementReported = true;
        console.warn('[desktop-map-walk] Ignored one invalid movement frame.', { stage, reason, invalid, values });
      };

      // Never allow A-Frame's independent free-movement controls to race the
      // map controller. They can survive a React mode switch on an a-entity.
      this.el.removeAttribute('movement-controls');
      this.el.removeAttribute('wasd-controls');
      this.el.querySelectorAll('[movement-controls], [wasd-controls]').forEach((element) => {
        element.removeAttribute('movement-controls');
        element.removeAttribute('wasd-controls');
      });

      this.down = (event) => {
        if (event.target?.closest?.('input,textarea,select,[contenteditable]')) return;
        if (!['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.code)) return;
        event.preventDefault();
        this.keys.add(event.code);
      };
      this.keyUp = (event) => this.keys.delete(event.code);
      this.clear = () => this.keys.clear();

      fetch(this.data.collisionPath, { signal: this.abort.signal })
        .then((response) => {
          if (!response.ok) throw new Error(`Map collision HTTP ${response.status}`);
          return response.json();
        })
        .then((data) => {
          this.world = new MapCollisionWorld(data, this.data.radius);
          const spawn = this.data.spawn;
          if (!this.world.isFree(spawn.x, spawn.z)) throw new Error('Map spawn is outside walkable space');
          this.el.object3D.position.set(spawn.x, this.world.groundHeight(spawn.x, spawn.z) + 0.06, spawn.z);
          this.lastSafe = this.el.object3D.position.clone();
          this.ready = true;
          this.el.emit('map-ready');
        })
        .catch((error) => {
          if (error.name !== 'AbortError') this.el.emit('map-runtime-error', { message: error.message }, true);
        });
    },
    play() {
      window.addEventListener('keydown', this.down);
      window.addEventListener('keyup', this.keyUp);
      window.addEventListener('blur', this.clear);
    },
    pause() {
      window.removeEventListener('keydown', this.down);
      window.removeEventListener('keyup', this.keyUp);
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
    tick(_time, delta) {
      if (!this.ready || !this.data.enabled) return;
      const position = this.el.object3D.position;
      const lastSafeValues = {
        'lastSafe.x': this.lastSafe?.x,
        'lastSafe.y': this.lastSafe?.y,
        'lastSafe.z': this.lastSafe?.z,
      };
      if (!Object.values(lastSafeValues).every(Number.isFinite)) {
        this.reportInvalidMovement('last-safe-position', lastSafeValues);
        this.el.emit('map-runtime-error', { message: 'Desktop collision controller lost its last safe position.' }, true);
        this.ready = false;
        return;
      }

      const rigValues = {
        'rig.x': position.x,
        'rig.y': position.y,
        'rig.z': position.z,
      };
      if (!Object.values(rigValues).every(Number.isFinite)) {
        this.reportInvalidMovement('rig-position', rigValues);
        position.copy(this.lastSafe);
        return;
      }

      if (!Number.isFinite(delta)) {
        this.reportInvalidMovement('frame-delta', { delta });
        return;
      }
      if (delta <= 0) return;

      // Clamp any other desktop script that tries to move the rig directly.
      const driftX = position.x - this.lastSafe.x;
      const driftZ = position.z - this.lastSafe.z;
      const driftValues = {
        'lastSafe.x': this.lastSafe.x,
        'lastSafe.z': this.lastSafe.z,
        driftX,
        driftZ,
      };
      if (!Object.values(driftValues).every(Number.isFinite)) {
        this.reportInvalidMovement('rig-drift', driftValues);
        position.copy(this.lastSafe);
        return;
      }
      if (Math.hypot(driftX, driftZ) > 0.0001) {
        const reconciled = this.world.move(this.lastSafe, driftX, driftZ);
        position.set(reconciled.x, reconciled.y, reconciled.z);
        this.lastSafe.copy(position);
      }

      let forwardInput = Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'));
      let rightInput = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
      if (!forwardInput && !rightInput) return;
      const inputLength = Math.hypot(forwardInput, rightInput);
      forwardInput /= inputLength;
      rightInput /= inputLength;

      // Resolve the camera on demand; a selector parsed before child mounting
      // can otherwise remain null and silently disable boundary movement.
      const camera = this.el.sceneEl.querySelector('#head');
      if (!camera?.object3D) return;
      camera.object3D.getWorldQuaternion(this.cameraQuaternion);
      const quaternionValues = {
        'quaternion.x': this.cameraQuaternion.x,
        'quaternion.y': this.cameraQuaternion.y,
        'quaternion.z': this.cameraQuaternion.z,
        'quaternion.w': this.cameraQuaternion.w,
      };
      if (!Object.values(quaternionValues).every(Number.isFinite)) {
        this.reportInvalidMovement('camera-world-quaternion', quaternionValues);
        return;
      }

      this.forward.set(0, 0, -1).applyQuaternion(this.cameraQuaternion);
      this.forward.y = 0;
      const forwardValues = {
        'forward.x': this.forward.x,
        'forward.y': this.forward.y,
        'forward.z': this.forward.z,
      };
      if (!Object.values(forwardValues).every(Number.isFinite)) {
        this.reportInvalidMovement('horizontal-forward', forwardValues);
        return;
      }
      const forwardLengthSq = this.forward.lengthSq();
      if (forwardLengthSq < 1e-8) {
        this.reportInvalidMovement(
          'horizontal-forward-length',
          { ...forwardValues, forwardLengthSq },
          'Horizontal forward direction is too short.',
        );
        return;
      }
      this.forward.normalize();

      // The camera looks down local -Z, so the matching horizontal right
      // vector is (-forward.z, 0, forward.x). Keep this independent of any
      // mutable component field used by keyboard event handlers.
      this.right.set(-this.forward.z, 0, this.forward.x);
      const rightValues = {
        'right.x': this.right.x,
        'right.y': this.right.y,
        'right.z': this.right.z,
      };
      if (!Object.values(rightValues).every(Number.isFinite)) {
        this.reportInvalidMovement('horizontal-right', { ...forwardValues, ...rightValues });
        return;
      }
      const rightLengthSq = this.right.lengthSq();
      if (!Number.isFinite(rightLengthSq) || rightLengthSq < 1e-8) {
        this.reportInvalidMovement(
          'horizontal-right-length',
          { ...forwardValues, ...rightValues, rightLengthSq },
          'Horizontal right direction is too short.',
        );
        return;
      }
      this.right.normalize();

      const motionScaleValues = { speed: this.data.speed, delta };
      if (!Object.values(motionScaleValues).every(Number.isFinite)) {
        this.reportInvalidMovement('motion-scale', motionScaleValues);
        return;
      }
      const directionValues = {
        'forward.x': this.forward.x,
        'forward.z': this.forward.z,
        'right.x': this.right.x,
        'right.z': this.right.z,
      };
      if (!Object.values(directionValues).every(Number.isFinite)) {
        this.reportInvalidMovement('normalized-directions', directionValues);
        return;
      }

      const distance = Math.max(0, this.data.speed) * Math.min(delta, 100) / 1000;
      const dx = (this.forward.x * forwardInput + this.right.x * rightInput) * distance;
      const dz = (this.forward.z * forwardInput + this.right.z * rightInput) * distance;
      const movementValues = {
        'lastSafe.x': this.lastSafe.x,
        'lastSafe.z': this.lastSafe.z,
        dx,
        dz,
      };
      if (!Object.values(movementValues).every(Number.isFinite)) {
        this.reportInvalidMovement('collision-input', movementValues);
        return;
      }
      const next = this.world.move(this.lastSafe, dx, dz);
      position.set(next.x, next.y, next.z);
      this.lastSafe.copy(position);
    },
  });
}
