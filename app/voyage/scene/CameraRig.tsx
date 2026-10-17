// @ts-nocheck
"use client";

import { useEffect, useRef } from 'react';
import type { MapRuntime } from '@/types/map-config';

interface CameraRigProps {
    phaseTitle: string;
    phaseInstruction: string;
    spawnPosition?: string;
    /** Enable simple gravity — pulls rig to y=0 on every tick. */
    gravity?: boolean;
    /** Enable terrain-follow — pins rig Y to terrain surface + offset. */
    terrainFollow?: boolean;
    /** Registered physical map; replaces every free movement controller. */
    mapRuntime?: Extract<MapRuntime, { kind: 'physical' }>;
    /** Use the isolated keyboard-only controller in the desktop Play scene. */
    desktopMapControls?: boolean;
    onMapError?: (message: string) => void;
}

export function CameraRig({ phaseTitle, phaseInstruction, spawnPosition = "0 0 2", gravity = false, terrainFollow = false, mapRuntime, desktopMapControls = false, onMapError }: CameraRigProps) {
    const rigRef = useRef<HTMLElement | null>(null);
    useEffect(() => {
        const rig = rigRef.current;
        if (!rig || !onMapError) return;
        const handleError = (event: CustomEvent<{ message?: string }>) => onMapError(event.detail?.message || 'Map collision unavailable.');
        rig.addEventListener('map-runtime-error', handleError as EventListener);
        return () => rig.removeEventListener('map-runtime-error', handleError as EventListener);
    }, [onMapError]);

    useEffect(() => {
        const rig = rigRef.current;
        if (!rig || !mapRuntime || !desktopMapControls) return;
        rig.removeAttribute('movement-controls');
        rig.removeAttribute('wasd-controls');
        rig.querySelectorAll('[movement-controls], [wasd-controls]').forEach((element) => {
            element.removeAttribute('movement-controls');
            element.removeAttribute('wasd-controls');
        });
        // Attach after the rig and its camera child exist. This is the sole
        // desktop movement path for a physical map.
        rig.setAttribute('desktop-map-walk', `collisionPath: ${mapRuntime.manifest.collisionPath}; radius: 0.35; spawn: ${mapSpawn.join(' ')}`);
    }, [desktopMapControls, mapRuntime]);

    const mapSpawn = mapRuntime?.spawnPoint.position ?? [0, 0, 0];
    const usesPhysicalMap = Boolean(mapRuntime);
    // a-camera always injects wasd-controls. Use a plain camera entity only in
    // the desktop physical-map branch so keyboard movement has one authority.
    const CameraEntity = mapRuntime && desktopMapControls ? 'a-entity' : 'a-camera';
    return (
        <a-entity
            ref={rigRef}
            id="camera-rig"
            position={mapRuntime ? mapSpawn.join(' ') : spawnPosition}
            {...(mapRuntime
                ? desktopMapControls
                    ? { 'desktop-map-walk': `collisionPath: ${mapRuntime.manifest.collisionPath}; radius: 0.35; spawn: ${mapSpawn.join(' ')}` }
                    : { 'map-walk': `collisionPath: ${mapRuntime.manifest.collisionPath}; camera: #head; speed: 3; spawn: ${mapSpawn.join(' ')}` }
                : {
                    'movement-controls': 'fly: false; speed: 0.15; controls: gamepad, touch, keyboard',
                    ...(terrainFollow ? { 'terrain-follow': 'boundary: 55' } : gravity ? { 'play-gravity': '' } : {}),
                  })}
        >
            {/* Camera */}
            <CameraEntity
                id="head"
                {...(mapRuntime && desktopMapControls ? { camera: 'active: true' } : {})}
                look-controls="pointerLockEnabled: false; reverseMouseDrag: false"
                {...(!mapRuntime && { 'wasd-controls': 'acceleration: 65' })}
                position={mapRuntime ? `0 ${mapRuntime.spawnPoint.eyeHeight} 0` : "0 0 0"}
            >
                {/* Crosshair */}
                <a-entity
                    position="0 0 -1"
                    geometry="primitive: ring; radiusInner: 0.005; radiusOuter: 0.01"
                    material="color: white; shader: flat; opacity: 0.5"
                ></a-entity>


                {/* VR Info Panel - Floating organelle knowledge panel */}
                <a-entity id="vr-info-panel" position="0 0 -1.5" visible="false">
                    {/* Glow background */}
                    <a-plane width="1.1" height="0.8" color="#10b981" opacity="0.1" position="0 0 -0.002"></a-plane>
                    {/* Main panel */}
                    <a-plane width="1.0" height="0.75" color="#0a0a12" opacity="0.95"></a-plane>
                    {/* Top accent line */}
                    <a-plane width="0.9" height="0.005" color="#10b981" position="0 0.35 0.001"></a-plane>

                    {/* Title */}
                    <a-text id="info-panel-title" value="Organelle Name" align="center" color="#10b981" width="1.8" position="0 0.28 0.002"></a-text>

                    {/* Description */}
                    <a-text id="info-panel-desc" value="Description of organelle..." align="left" color="#ffffff" width="0.8" position="-0.42 0.12 0.002" wrap-count="35"></a-text>

                    {/* Function */}
                    <a-text id="info-panel-function" value="Function: ..." align="left" color="#00e5ff" width="0.8" position="-0.42 -0.08 0.002" wrap-count="35"></a-text>

                    {/* Close button */}
                    <a-entity position="0 -0.28 0.002">
                        <a-plane className="clickable" width="0.25" height="0.06" color="#ef4444" info-panel-close></a-plane>
                        <a-text value="Close" align="center" color="#ffffff" width="0.5" position="0 0 0.001"></a-text>
                    </a-entity>
                </a-entity>
            </CameraEntity>

            {/* Left Hand Controller with Wrist Menu */}
            <a-entity
                id="leftHand"
                hand-controls="hand: left"
                smart-controller="hand: left"
                raycaster="objects: .clickable, .grabbable; far: 10"
                cursor="fuse: false; rayOrigin: entity"
                simple-grab
                pull-to-hand
                {...(!usesPhysicalMap && { 'left-thumbstick-listener': '' })}
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
                raycaster="objects: .clickable, .grabbable, .teleport-floor; far: 10"
                cursor="fuse: false; rayOrigin: entity"
                simple-grab
                pull-to-hand
                {...(!usesPhysicalMap && { 'simple-teleport': '' })}
            ></a-entity>
        </a-entity>
    );
}
