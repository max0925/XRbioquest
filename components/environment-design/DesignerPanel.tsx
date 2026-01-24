// @ts-nocheck
"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Move, RotateCcw, Maximize2, Box, Eye, EyeOff, Trash2, Layers
} from "lucide-react";
import type { SceneAsset } from "../../hooks/useAgentOrchestrator";

// ═══════════════════════════════════════════════════════════════════════════
// DESIGNER PANEL - Right sidebar with Inspector, Scene Assets, and Export
// ═══════════════════════════════════════════════════════════════════════════

export interface DesignerPanelProps {
  isOpen: boolean;
  sceneAssets: SceneAsset[];
  activeSelection: SceneAsset | null;
  loadingModels?: Map<string, number>;
  onSelectAsset: (asset: SceneAsset | null) => void;
  onUpdateTransform: (uid: string, transform: Partial<SceneAsset>) => void;
  onToggleVisibility: (uid: string) => void;
  onRemoveAsset: (uid: string) => void;
  onExport: () => void;
}

export default function DesignerPanel({
  isOpen,
  sceneAssets,
  activeSelection,
  loadingModels,
  onSelectAsset,
  onUpdateTransform,
  onToggleVisibility,
  onRemoveAsset,
  onExport,
}: DesignerPanelProps) {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.aside
          initial={{ x: 280, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 280, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="w-[280px] bg-[#1a1a1a] border-l border-white/5 flex flex-col z-20"
        >
          {/* Header */}
          <div className="px-4 py-4 border-b border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/40 uppercase tracking-wide">Inspector</span>
              <Brain className="w-4 h-4 text-white/20" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 custom-scrollbar">
            {/* INSPECTOR PANEL */}
            <InspectorPanel
              activeSelection={activeSelection}
              onUpdateTransform={onUpdateTransform}
            />

            {/* SCENE ASSETS LIST */}
            <SceneAssetsList
              sceneAssets={sceneAssets}
              activeSelection={activeSelection}
              loadingModels={loadingModels}
              onSelectAsset={onSelectAsset}
              onToggleVisibility={onToggleVisibility}
              onRemoveAsset={onRemoveAsset}
            />
          </div>

          {/* Export Button */}
          <div className="px-4 py-4 border-t border-white/5">
            <button
              onClick={onExport}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
            >
              Export to VR
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INSPECTOR PANEL - Transform controls and interaction settings
// ═══════════════════════════════════════════════════════════════════════════

interface InspectorPanelProps {
  activeSelection: SceneAsset | null;
  onUpdateTransform: (uid: string, transform: Partial<SceneAsset>) => void;
}

function InspectorPanel({ activeSelection, onUpdateTransform }: InspectorPanelProps) {
  if (!activeSelection) {
    return (
      <div className="bg-black/20 rounded-xl border border-white/5">
        <div className="px-4 py-3 border-b border-white/5">
          <span className="text-xs font-semibold text-white">Transform</span>
        </div>
        <div className="p-8 text-center">
          <Box className="w-8 h-8 mx-auto mb-2.5 text-white/20" />
          <p className="text-xs text-white/40">Select an asset to inspect</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/20 rounded-xl border border-white/5">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <span className="text-xs font-semibold text-white">Transform</span>
        <span className="text-xs text-white/50 font-medium truncate max-w-[120px]">
          {activeSelection.name}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Position */}
        <TransformSection
          icon={<Move className="w-3.5 h-3.5 text-emerald-500" />}
          label="Position"
          values={activeSelection.position}
          step={0.1}
          decimals={2}
          accentColor="green"
          onChange={(axis, val) => {
            onUpdateTransform(activeSelection.uid, {
              position: { ...activeSelection.position, [axis]: val }
            });
          }}
        />

        {/* Rotation */}
        <TransformSection
          icon={<RotateCcw className="w-3.5 h-3.5 text-emerald-500" />}
          label="Rotation"
          values={activeSelection.rotation}
          step={5}
          decimals={0}
          accentColor="green"
          onChange={(axis, val) => {
            onUpdateTransform(activeSelection.uid, {
              rotation: { ...activeSelection.rotation, [axis]: val }
            });
          }}
        />

        {/* Scale */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-medium text-white">Scale</span>
          </div>
          <div className="space-y-2">
            <input
              type="range"
              min="0.01"
              max="10"
              step="0.01"
              value={activeSelection.scale || 1}
              onChange={(e) => {
                onUpdateTransform(activeSelection.uid, { scale: parseFloat(e.target.value) });
              }}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-white/50">
              <span>0.01</span>
              <span className="text-emerald-500 font-semibold">{(activeSelection.scale || 1).toFixed(2)}</span>
              <span>10</span>
            </div>
          </div>
        </div>

        {/* Interaction FX - Only for models */}
        {activeSelection.type === 'model' && (
          <InteractionFXSection
            activeSelection={activeSelection}
            onUpdateTransform={onUpdateTransform}
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSFORM SECTION - Reusable XYZ input group
// ═══════════════════════════════════════════════════════════════════════════

interface TransformSectionProps {
  icon: React.ReactNode;
  label: string;
  values: { x: number; y: number; z: number } | undefined;
  step: number;
  decimals: number;
  accentColor: string;
  onChange: (axis: 'x' | 'y' | 'z', value: number) => void;
}

function TransformSection({ icon, label, values, step, decimals, accentColor, onChange }: TransformSectionProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-white">{label}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(['x', 'y', 'z'] as const).map((axis) => (
          <div key={axis} className="space-y-1">
            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wide">{axis}</label>
            <input
              type="number"
              step={step}
              value={values?.[axis]?.toFixed(decimals) || 0}
              onChange={(e) => onChange(axis, parseFloat(e.target.value) || 0)}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-colors"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERACTION FX SECTION - Grabbable, Glow, Collision, Physics
// ═══════════════════════════════════════════════════════════════════════════

interface InteractionFXSectionProps {
  activeSelection: SceneAsset;
  onUpdateTransform: (uid: string, transform: Partial<SceneAsset>) => void;
}

function InteractionFXSection({ activeSelection, onUpdateTransform }: InteractionFXSectionProps) {
  const interactions = [
    { key: 'grabbable', label: 'Grabbable', icon: '✋' },
    { key: 'glowPulse', label: 'Glow Pulse', icon: '✨' },
    { key: 'collisionTrigger', label: 'Collision', icon: '💥' },
  ];

  return (
    <div className="space-y-2.5 pt-3 border-t border-white/5">
      <span className="text-xs font-medium text-white">Interactions</span>
      <div className="space-y-1.5">
        {interactions.map(({ key, label, icon }) => (
          <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={activeSelection.interactionFX?.[key] || false}
              onChange={(e) => {
                onUpdateTransform(activeSelection.uid, {
                  interactionFX: {
                    ...activeSelection.interactionFX,
                    [key]: e.target.checked
                  }
                });
              }}
              className="w-4 h-4 rounded accent-emerald-500 border-white/10"
            />
            <span className="text-xs">{icon}</span>
            <span className="text-xs text-white/50 group-hover:text-white transition-colors">{label}</span>
          </label>
        ))}
      </div>

      {/* Physics Section */}
      <div className="pt-3 mt-3 border-t border-white/5">
        <span className="text-xs font-medium text-white">Physics</span>
        <div className="mt-2 space-y-1.5">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={activeSelection.physics?.dynamic || false}
              onChange={(e) => {
                onUpdateTransform(activeSelection.uid, {
                  physics: {
                    ...activeSelection.physics,
                    dynamic: e.target.checked,
                    mass: activeSelection.physics?.mass || 1,
                    shape: activeSelection.physics?.shape || 'auto'
                  }
                });
              }}
              className="w-4 h-4 rounded accent-emerald-500 border-white/10"
            />
            <span className="text-xs">🌍</span>
            <span className="text-xs text-white/50 group-hover:text-white transition-colors">Gravity</span>
          </label>

          {/* Mass slider - only show when gravity is enabled */}
          {activeSelection.physics?.dynamic && (
            <div className="ml-7 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40">Mass</span>
                <span className="text-[10px] text-emerald-500 font-mono">{(activeSelection.physics?.mass || 1).toFixed(1)} kg</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="100"
                step="0.1"
                value={activeSelection.physics?.mass || 1}
                onChange={(e) => {
                  onUpdateTransform(activeSelection.uid, {
                    physics: {
                      ...activeSelection.physics,
                      dynamic: true,
                      mass: parseFloat(e.target.value)
                    }
                  });
                }}
                className="w-full accent-emerald-500 h-1"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE ASSETS LIST - Shows all assets in the scene
// ═══════════════════════════════════════════════════════════════════════════

interface SceneAssetsListProps {
  sceneAssets: SceneAsset[];
  activeSelection: SceneAsset | null;
  loadingModels?: Map<string, number>;
  onSelectAsset: (asset: SceneAsset) => void;
  onToggleVisibility: (uid: string) => void;
  onRemoveAsset: (uid: string) => void;
}

function SceneAssetsList({
  sceneAssets,
  activeSelection,
  loadingModels,
  onSelectAsset,
  onToggleVisibility,
  onRemoveAsset,
}: SceneAssetsListProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-white">Scene Assets</span>
        <span className="text-xs text-white/40 font-medium">
          {sceneAssets.length}
        </span>
      </div>

      <div className="space-y-1.5 max-h-[320px] overflow-y-auto custom-scrollbar">
        {sceneAssets.map(asset => (
          <div
            key={asset.uid}
            onClick={() => onSelectAsset(asset)}
            className={`group bg-black/20 p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-all border ${
              activeSelection?.uid === asset.uid
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-white/5 hover:border-white/10'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={asset.thumbnail || '/bio.png'}
                className="w-10 h-10 rounded-lg object-cover border border-white/10"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-white truncate max-w-[120px]">
                  {asset.name}
                </span>
                <span className="text-[10px] text-white/40">
                  {asset.type === 'environment-3d' ? 'Environment' :
                   asset.type === 'environment-ai' ? 'AI Skybox' : 'Model'}
                </span>
                {/* Inline loading progress */}
                {loadingModels && loadingModels.has(asset.uid) && (
                  <span className="text-[10px] text-emerald-500/70 mt-0.5">
                    {asset.pendingGeneration ? 'Generating' : 'Loading'}… {loadingModels.get(asset.uid)}%
                  </span>
                )}
                {asset.pendingGeneration && (!loadingModels || !loadingModels.has(asset.uid)) && (
                  <span className="text-[10px] text-emerald-500/70 mt-0.5">
                    Generating…
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleVisibility(asset.uid); }}
                className={`p-1.5 rounded-lg transition-all ${
                  asset.visible ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-white/20 hover:bg-white/5'
                }`}
              >
                {asset.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveAsset(asset.uid); }}
                className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {sceneAssets.length === 0 && (
          <div className="text-center py-8 text-white/40">
            <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-xs">No assets yet</p>
            <p className="text-[10px] mt-1">Use the Agent to add content</p>
          </div>
        )}
      </div>
    </div>
  );
}
