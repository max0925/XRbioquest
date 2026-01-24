// @ts-nocheck
"use client";

import dynamic from 'next/dynamic';
import { ChevronRight, ChevronLeft, Loader2, Move, RotateCcw, Maximize2, Zap } from "lucide-react";
import type { SceneAsset } from "../../hooks/useAgentOrchestrator";

// ═══════════════════════════════════════════════════════════════════════════
// ENVIRONMENT VIEWPORT - 3D Scene view with transform toolbar
// ═══════════════════════════════════════════════════════════════════════════

// Dynamic import for A-Frame scene (no SSR)
const SceneView = dynamic(() => import('../../app/environment-design/Scene'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-[#1a1a1a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <span className="text-gray-500 font-mono text-xs uppercase tracking-widest">Initializing Viewport...</span>
      </div>
    </div>
  )
});

export interface EnvironmentViewportProps {
  // Scene data
  sceneAssets: SceneAsset[];
  activeSelection: SceneAsset | null;
  transformMode: 'translate' | 'rotate' | 'scale';

  // Panel toggle states
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;

  // Callbacks
  onSelectAsset: (asset: SceneAsset | null) => void;
  onUpdateTransform: (uid: string, transform: Partial<SceneAsset>) => void;
  onEnvironmentLoaded: (uid: string, boundingBox: any) => void;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  onSetTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
  onResetTransform: () => void;
  onLoadingStateChange?: (loadingModels: Map<string, number>) => void;
}

export default function EnvironmentViewport({
  sceneAssets,
  activeSelection,
  transformMode,
  leftPanelOpen,
  rightPanelOpen,
  onLoadingStateChange,
  onSelectAsset,
  onUpdateTransform,
  onEnvironmentLoaded,
  onToggleLeftPanel,
  onToggleRightPanel,
  onSetTransformMode,
  onResetTransform,
}: EnvironmentViewportProps) {
  return (
    <main className="flex-1 relative flex flex-col bg-[#1a1a1a] scene-container">
      {/* Left Toggle Button */}
      <div className="absolute top-4 left-4 z-30 flex gap-2">
        <button
          onClick={onToggleLeftPanel}
          className="bg-black/60 backdrop-blur px-3 py-2 rounded-lg border border-white/10 text-white hover:bg-black/80 transition-all"
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${leftPanelOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className="bg-black/60 backdrop-blur px-3 py-2 rounded-lg border border-white/10 text-emerald-400 text-[10px] font-semibold uppercase flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          Live Preview
        </div>
      </div>

      {/* Right Toggle Button */}
      <div className="absolute top-4 right-4 z-30">
        <button
          onClick={onToggleRightPanel}
          className="bg-black/60 backdrop-blur px-3 py-2 rounded-lg border border-white/10 text-white hover:bg-black/80 transition-all"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${rightPanelOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* A-Frame Scene */}
      <SceneView
        sceneAssets={sceneAssets}
        activeSelection={activeSelection}
        transformMode={transformMode}
        onAssetClick={onSelectAsset}
        onAssetTransform={onUpdateTransform}
        onEnvironmentLoaded={onEnvironmentLoaded}
        onLoadingStateChange={onLoadingStateChange}
      />

      {/* Transform Toolbar */}
      <TransformToolbar
        transformMode={transformMode}
        activeSelection={activeSelection}
        onSetTransformMode={onSetTransformMode}
        onResetTransform={onResetTransform}
      />
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSFORM TOOLBAR - Bottom toolbar for transform mode selection
// ═══════════════════════════════════════════════════════════════════════════

interface TransformToolbarProps {
  transformMode: 'translate' | 'rotate' | 'scale';
  activeSelection: SceneAsset | null;
  onSetTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
  onResetTransform: () => void;
}

function TransformToolbar({
  transformMode,
  activeSelection,
  onSetTransformMode,
  onResetTransform,
}: TransformToolbarProps) {
  const modes = [
    { mode: 'translate' as const, icon: Move, color: 'emerald', title: 'Move' },
    { mode: 'rotate' as const, icon: RotateCcw, color: 'blue', title: 'Rotate' },
    { mode: 'scale' as const, icon: Maximize2, color: 'purple', title: 'Scale' },
  ];

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/80 backdrop-blur p-1.5 rounded-xl border border-white/10 z-30">
      {modes.map(({ mode, icon: Icon, color, title }) => (
        <button
          key={mode}
          onClick={() => onSetTransformMode(mode)}
          className={`p-2.5 rounded-lg transition-all ${
            transformMode === mode
              ? `bg-${color}-500 text-white`
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
          title={title}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}

      <div className="w-px h-6 bg-white/10 mx-1" />

      <button
        onClick={onResetTransform}
        disabled={!activeSelection}
        className="p-2.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        title="Reset Transform"
      >
        <Zap className="w-4 h-4" />
      </button>
    </div>
  );
}
