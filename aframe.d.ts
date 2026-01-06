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
    }
  }
}

declare global {
  interface Window {
    AFRAME: any;
  }
}
