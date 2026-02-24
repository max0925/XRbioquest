// @ts-nocheck
"use client";

import { HUDPanel } from '../components/HUDPanel';

interface CameraRigProps {
    phaseTitle: string;
    phaseInstruction: string;
}

export function CameraRig({ phaseTitle, phaseInstruction }: CameraRigProps) {
    return (
        <a-entity id="camera-rig" position="0 -2 1">
            {/* Camera */}
            <a-entity
                id="head"
                camera
                position="0 1.6 0"
                rotation="0 0 0"
                look-controls="pointerLockEnabled: false; reverseMouseDrag: false; touchEnabled: true"
                wasd-controls="acceleration: 65; fly: true"
            >
                {/* Crosshair */}
                <a-entity
                    position="0 0 -1"
                    geometry="primitive: ring; radiusInner: 0.005; radiusOuter: 0.01"
                    material="color: white; shader: flat; opacity: 0.5"
                ></a-entity>

                {/* VR HUD Panel */}
                <HUDPanel title={phaseTitle} instruction={phaseInstruction} />
            </a-entity>

            {/* Left Hand Controller */}
            <a-entity
                id="leftHand"
                hand-controls="hand: left"
                laser-controls="hand: left"
                raycaster="objects: .clickable, .grabbable; far: 5"
                simple-grab
            ></a-entity>

            {/* Right Hand Controller */}
            <a-entity
                id="rightHand"
                hand-controls="hand: right"
                laser-controls="hand: right"
                raycaster="objects: .clickable, .grabbable; far: 5"
                simple-grab
            ></a-entity>
        </a-entity>
    );
}
