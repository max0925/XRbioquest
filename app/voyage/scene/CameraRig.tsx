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

            {/* Left Hand Controller with Wrist Menu */}
            <a-entity
                id="leftHand"
                hand-controls="hand: left"
                smart-controller="hand: left"
                raycaster="objects: .clickable; far: 10"
                cursor="fuse: false; rayOrigin: entity"
                simple-grab
                left-thumbstick-listener
            >
                {/* Wrist Button - Hamburger icon (back of wrist, facing up) */}
                <a-entity id="wrist-btn" position="0 0.02 -0.15" rotation="-90 0 0">
                    <a-circle className="clickable" radius="0.025" color="#1a1a2e" opacity="0.95" toggle-menu></a-circle>
                    <a-ring radius-inner="0.023" radius-outer="0.025" color="#10b981"></a-ring>
                    {/* Hamburger lines */}
                    <a-plane width="0.02" height="0.003" color="#10b981" position="0 0.007 0.001"></a-plane>
                    <a-plane width="0.02" height="0.003" color="#10b981" position="0 0 0.001"></a-plane>
                    <a-plane width="0.02" height="0.003" color="#10b981" position="0 -0.007 0.001"></a-plane>
                </a-entity>

                {/* Wrist Menu Panel - Main menu */}
                <a-entity id="menu-panel" position="0 0.15 -0.15" rotation="-45 0 0" visible="false">
                    {/* Panel background with glow */}
                    <a-plane width="0.27" height="0.32" color="#10b981" opacity="0.1" position="0 0 -0.002"></a-plane>
                    <a-plane width="0.25" height="0.3" color="#0a0a12" opacity="0.95"></a-plane>
                    {/* Top accent line */}
                    <a-plane width="0.23" height="0.004" color="#10b981" position="0 0.13 0.001"></a-plane>
                    {/* Title */}
                    <a-text value="MENU" align="center" color="#10b981" width="0.5" position="0 0.11 0.002"></a-text>

                    {/* Tasks button */}
                    <a-entity position="0 0.06 0.002" voyage-menu-nav="target: tasks">
                        <a-plane className="clickable" width="0.2" height="0.045" color="#2d2d44"></a-plane>
                        <a-text value="Tasks" align="center" color="#ffffff" width="0.4" position="0 0 0.001"></a-text>
                    </a-entity>

                    {/* Notes button */}
                    <a-entity position="0 0.01 0.002" voyage-menu-nav="target: notes">
                        <a-plane className="clickable" width="0.2" height="0.045" color="#2d2d44"></a-plane>
                        <a-text value="Notes" align="center" color="#ffffff" width="0.4" position="0 0 0.001"></a-text>
                    </a-entity>

                    {/* Close button */}
                    <a-entity position="0 -0.04 0.002">
                        <a-plane className="clickable" width="0.2" height="0.045" color="#ef4444" close-menu></a-plane>
                        <a-text value="Close" align="center" color="#ffffff" width="0.4" position="0 0 0.001"></a-text>
                    </a-entity>
                </a-entity>

                {/* Tasks Sub-Panel */}
                <a-entity id="tasks-panel" position="0 0.15 -0.15" rotation="-45 0 0" visible="false">
                    {/* Panel background */}
                    <a-plane width="0.27" height="0.35" color="#10b981" opacity="0.1" position="0 0 -0.002"></a-plane>
                    <a-plane width="0.25" height="0.33" color="#0a0a12" opacity="0.95"></a-plane>
                    {/* Top accent line */}
                    <a-plane width="0.23" height="0.004" color="#10b981" position="0 0.145 0.001"></a-plane>

                    {/* Title */}
                    <a-text id="tasks-title" value="Phase 0: Welcome" align="center" color="#10b981" width="0.45" position="0 0.12 0.002"></a-text>

                    {/* Task items */}
                    <a-text id="task-1" value="Task 1" align="left" color="#ffffff" width="0.4" position="-0.11 0.06 0.002" wrap-count="25"></a-text>
                    <a-text id="task-2" value="Task 2" align="left" color="#ffffff" width="0.4" position="-0.11 0.01 0.002" wrap-count="25"></a-text>

                    {/* Score */}
                    <a-text id="tasks-score" value="Score: 0" align="center" color="#FFD700" width="0.4" position="0 -0.05 0.002"></a-text>

                    {/* Back button */}
                    <a-entity position="0 -0.12 0.002" back-to-menu>
                        <a-plane className="clickable" width="0.2" height="0.045" color="#2d2d44"></a-plane>
                        <a-text value="Back" align="center" color="#ffffff" width="0.4" position="0 0 0.001"></a-text>
                    </a-entity>
                </a-entity>

                {/* Notes Sub-Panel */}
                <a-entity id="notes-panel" position="0 0.15 -0.15" rotation="-45 0 0" visible="false">
                    {/* Panel background */}
                    <a-plane width="0.27" height="0.35" color="#10b981" opacity="0.1" position="0 0 -0.002"></a-plane>
                    <a-plane width="0.25" height="0.33" color="#0a0a12" opacity="0.95"></a-plane>
                    {/* Top accent line */}
                    <a-plane width="0.23" height="0.004" color="#10b981" position="0 0.145 0.001"></a-plane>

                    {/* Title */}
                    <a-text value="NOTES" align="center" color="#10b981" width="0.5" position="0 0.12 0.002"></a-text>

                    {/* Notes content */}
                    <a-text id="notes-content" value="Learning notes appear here..." align="left" color="#ffffff" width="0.4" position="-0.11 0.05 0.002" wrap-count="28"></a-text>

                    {/* Back button */}
                    <a-entity position="0 -0.12 0.002" back-to-menu>
                        <a-plane className="clickable" width="0.2" height="0.045" color="#2d2d44"></a-plane>
                        <a-text value="Back" align="center" color="#ffffff" width="0.4" position="0 0 0.001"></a-text>
                    </a-entity>
                </a-entity>
            </a-entity>

            {/* Right Hand Controller */}
            <a-entity
                id="rightHand"
                hand-controls="hand: right"
                smart-controller="hand: right"
                raycaster="objects: .clickable, .teleport-floor; far: 10"
                cursor="fuse: false; rayOrigin: entity"
                simple-grab
                simple-teleport
            ></a-entity>
        </a-entity>
    );
}
