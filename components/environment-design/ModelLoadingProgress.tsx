// components/environment-design/ModelLoadingProgress.tsx
"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModelLoadingProgressProps {
  assetUid: string;
  assetName: string;
}

export default function ModelLoadingProgress({ assetUid, assetName }: ModelLoadingProgressProps) {
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.THREE) return;

    // Create Three.js LoadingManager for this specific model
    const manager = new window.THREE.LoadingManager();

    manager.onProgress = (url: string, itemsLoaded: number, itemsTotal: number) => {
      const percent = Math.round((itemsLoaded / itemsTotal) * 100);
      setProgress(percent);
    };

    manager.onLoad = () => {
      setProgress(100);
      setTimeout(() => setIsLoading(false), 500);
    };

    manager.onError = (url: string) => {
      console.error('Loading error:', url);
      setIsLoading(false);
    };

    // Store manager globally for GLTF loader to use
    if (!window.modelLoadingManagers) {
      window.modelLoadingManagers = new Map();
    }
    window.modelLoadingManagers.set(assetUid, manager);

    return () => {
      window.modelLoadingManagers?.delete(assetUid);
    };
  }, [assetUid]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed bottom-24 right-6 z-[230]"
        >
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.3)] min-w-[240px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white font-medium truncate max-w-[160px]">
                {assetName}
              </span>
              <span className="text-xs text-emerald-500 font-mono font-semibold">
                {progress}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>

            {/* Loading dots */}
            <div className="mt-2 flex items-center gap-1">
              <div className="text-[10px] text-white/40">Loading</div>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 h-1 bg-emerald-500/60 rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Extend window type
declare global {
  interface Window {
    modelLoadingManagers?: Map<string, any>;
  }
}
