// @ts-nocheck
"use client";

export function Lighting() {
    return (
        <>
            <a-entity light="type: ambient; color: #4466aa; intensity: 1.0"></a-entity>
            <a-entity
                light="type: directional; color: #ffffff; intensity: 1.2; castShadow: true; shadowMapWidth: 2048; shadowMapHeight: 2048"
                position="5 10 5"
            ></a-entity>
            <a-entity light="type: hemisphere; color: #6688cc; groundColor: #1a3a2a; intensity: 0.3"></a-entity>
        </>
    );
}
