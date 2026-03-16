import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration (Next.js 16+)
  // Force all packages to use A-Frame's bundled Three.js to prevent
  // "Multiple instances of Three.js" warning and rendering failures
  turbopack: {},
};

export default nextConfig;
