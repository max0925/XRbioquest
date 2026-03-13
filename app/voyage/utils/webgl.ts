/**
 * Checks if WebGL is available in the current browser
 * @returns true if WebGL or WebGL2 is supported, false otherwise
 */
export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2') || canvas.getContext('experimental-webgl');

    if (!gl) {
      return false;
    }

    // If we got a context, WebGL is available
    return true;
  } catch (e) {
    // If an error occurs during context creation, WebGL is not available
    return false;
  }
}
