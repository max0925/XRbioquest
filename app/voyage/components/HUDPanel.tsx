// @ts-nocheck
"use client";

interface HUDPanelProps {
    title: string;
    instruction: string;
}

export function HUDPanel({ title, instruction }: HUDPanelProps) {
    return (
        <a-entity id="vr-hud" position="0 -0.3 -0.8" rotation="0 0 0" visible="false">
            <a-plane
                width="0.8"
                height="0.25"
                color="#001428"
                opacity="0.9"
                material="transparent: true"
            ></a-plane>
            <a-text
                id="vr-phase-text"
                value={title}
                position="-0.35 0.06 0.01"
                color="#00e5ff"
                width="0.7"
                font="roboto"
            ></a-text>
            <a-text
                id="vr-instruction-text"
                value={instruction}
                position="-0.35 -0.04 0.01"
                color="white"
                width="0.7"
                font="roboto"
                wrap-count="40"
            ></a-text>
        </a-entity>
    );
}
