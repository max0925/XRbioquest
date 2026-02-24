// @ts-nocheck
"use client";

interface CameraRigProps {
    phaseTitle: string;
    phaseInstruction: string;
}

export function CameraRig({ phaseTitle, phaseInstruction }: CameraRigProps) {
    return (
        <a-entity
            id="camera-rig"
            position="0 0 2"
            movement-controls="fly: false; speed: 0.15; controls: gamepad, touch, keyboard"
        >
            {/* Camera */}
            <a-camera
                id="head"
                look-controls="pointerLockEnabled: false; reverseMouseDrag: false"
                wasd-controls="acceleration: 65"
                position="0 1.6 0"
            >
                {/* Crosshair */}
                <a-entity
                    position="0 0 -1"
                    geometry="primitive: ring; radiusInner: 0.005; radiusOuter: 0.01"
                    material="color: white; shader: flat; opacity: 0.5"
                ></a-entity>

                {/* VR HUD with sync component */}
                <a-entity
                    id="vr-hud"
                    vr-hud-sync
                    position="0 0.3 -1.2"
                    geometry="primitive: plane; width: 0.8; height: 0.4"
                    material="color: #000; opacity: 0.5; transparent: true"
                >
                    {/* Phase title */}
                    <a-entity
                        id="vr-hud-phase"
                        position="0 0.12 0.01"
                        text={`value: ${phaseTitle}; align: center; width: 0.7; color: #00e5ff; font: kelsonsans`}
                    ></a-entity>

                    {/* Instruction text */}
                    <a-entity
                        id="vr-hud-instruction"
                        position="0 0 0.01"
                        text={`value: ${phaseInstruction}; align: center; width: 0.7; color: #FFF; font: kelsonsans; wrapCount: 40`}
                    ></a-entity>

                    {/* Score display */}
                    <a-entity
                        id="vr-hud-score"
                        position="0 -0.12 0.01"
                        text="value: Score: 0; align: center; width: 0.7; color: #FFD700; font: kelsonsans"
                    ></a-entity>
                </a-entity>
            </a-camera>

            {/* Left Hand Controller */}
            <a-entity
                id="leftHand"
                hand-controls="hand: left"
                laser-controls="hand: left"
                raycaster="objects: .clickable, .grabbable; far: 5"
                simple-grab
                left-thumbstick-listener
                wrist-dashboard
            ></a-entity>

            {/* Right Hand Controller */}
            <a-entity
                id="rightHand"
                hand-controls="hand: right"
                laser-controls="hand: right"
                raycaster="objects: .clickable, .grabbable; far: 5"
                simple-grab
                teleport-controls="cameraRig: #camera-rig; teleportOrigin: #head; button: trigger; curveShootingSpeed: 10; landingMaxAngle: 60; collisionEntities: .teleport-floor; type: parabolic"
            ></a-entity>
        </a-entity>
    );
}
