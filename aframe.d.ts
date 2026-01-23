// aframe.d.ts
export {};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "a-scene": any;
      "a-entity": any;
      "a-box": any;
      "a-sphere": any;
      "a-plane": any;
      "a-sky": any;
      "a-camera": any;
      "a-light": any;
      "a-gltf-model": any;
      "a-assets": any;
      "a-asset-item": any;
      "a-text": any;
      "a-ring": any;
      "a-torus": any;
      "a-cursor": any;
      "a-cylinder": any;
      "a-cone": any;
    }
  }
}

declare global {
  interface Window {
    AFRAME: any;
    THREE: any;
  }
}
