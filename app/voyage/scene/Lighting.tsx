// @ts-nocheck
"use client";

export function Lighting() {
    return (
        <>
            <a-entity light="type: ambient; color: #ffffff; intensity: 0.6"></a-entity>
            <a-entity
                light="type: directional; color: #ffffff; intensity: 0.8; castShadow: true; shadowMapWidth: 2048; shadowMapHeight: 2048"
                position="2 4 2"
            ></a-entity>
            <a-entity
                light="type: directional; color: #b4c6e0; intensity: 0.3"
                position="-2 2 -2"
            ></a-entity>
            <a-entity light="type: hemisphere; color: #ffffff; groundColor: #444444; intensity: 0.4"></a-entity>
        </>
    );
}
