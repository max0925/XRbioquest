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
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="w-[30%] min-w-[340px] max-w-[420px] bg-[#1e1e1e] border-l border-[#333] flex flex-col text-gray-300 z-20"
        >
          {/* Header */}
          <div className="p-4 border-b border-[#333] flex items-center justify-between bg-[#252526]">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Designer Hub</span>
            <Brain className="w-4 h-4 text-gray-500" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            {/* INSPECTOR PANEL */}
            <InspectorPanel
              activeSelection={activeSelection}
              onUpdateTransform={onUpdateTransform}
            />

            {/* SCENE ASSETS LIST */}
            <SceneAssetsList
              sceneAssets={sceneAssets}
              activeSelection={activeSelection}
              onSelectAsset={onSelectAsset}
              onToggleVisibility={onToggleVisibility}
              onRemoveAsset={onRemoveAsset}
            />
          </div>

          {/* Export Button */}
          <div className="p-4 border-t border-[#333] bg-[#252526]">
            <button
              onClick={onExport}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98]"
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
      <div className="bg-[#252526] rounded-xl border border-[#333] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#333]">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inspector</span>
        </div>
        <div className="p-8 text-center text-gray-600">
          <Box className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-xs">Select an asset to inspect</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#252526] rounded-xl border border-[#333] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#333] flex items-center justify-between">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inspector</span>
        <span className="text-[10px] text-emerald-400 font-medium truncate max-w-[150px]">
          {activeSelection.name}
        </span>
      </div>

      <div className="p-4 space-y-5">
        {/* Position */}
        <TransformSection
          icon={<Move className="w-3.5 h-3.5 text-emerald-400" />}
          label="Position"
          values={activeSelection.position}
          step={0.1}
          decimals={2}
          accentColor="emerald"
          onChange={(axis, val) => {
            onUpdateTransform(activeSelection.uid, {
              position: { ...activeSelection.position, [axis]: val }
            });
          }}
        />

        {/* Rotation */}
        <TransformSection
          icon={<RotateCcw className="w-3.5 h-3.5 text-blue-400" />}
          label="Rotation"
          values={activeSelection.rotation}
          step={5}
          decimals={0}
          accentColor="blue"
          onChange={(axis, val) => {
            onUpdateTransform(activeSelection.uid, {
              rotation: { ...activeSelection.rotation, [axis]: val }
            });
          }}
        />

        {/* Scale */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-semibold text-gray-400 uppercase">Scale</span>
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
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>0.01</span>
              <span className="text-purple-400 font-bold">{(activeSelection.scale || 1).toFixed(2)}</span>
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
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold text-gray-400 uppercase">{label}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(['x', 'y', 'z'] as const).map((axis) => (
          <div key={axis} className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">{axis}</label>
            <input
              type="number"
              step={step}
              value={values?.[axis]?.toFixed(decimals) || 0}
              onChange={(e) => onChange(axis, parseFloat(e.target.value) || 0)}
              className={`w-full bg-[#1a1a1a] border border-[#444] rounded-lg px-3 py-2 text-xs text-white focus:border-${accentColor}-500 focus:outline-none`}
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
    { key: 'grabbable', label: 'Grabbable', color: 'emerald', icon: '✋' },
    { key: 'glowPulse', label: 'Glow Pulse', color: 'purple', icon: '✨' },
    { key: 'collisionTrigger', label: 'Collision Trigger', color: 'orange', icon: '💥' },
  ];

  return (
    <div className="space-y-3 pt-2 border-t border-[#333]">
      <span className="text-xs font-semibold text-gray-400 uppercase">Interactions</span>
      <div className="space-y-2">
        {interactions.map(({ key, label, color, icon }) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer group">
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
              className={`w-4 h-4 rounded accent-${color}-500`}
            />
            <span className="text-[11px] mr-1">{icon}</span>
            <span className="text-xs text-gray-400 group-hover:text-white transition-colors">{label}</span>
          </label>
        ))}
      </div>

      {/* Physics Section */}
      <div className="pt-3 mt-3 border-t border-[#333]">
        <span className="text-xs font-semibold text-gray-400 uppercase">Physics</span>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-3 cursor-pointer group">
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
              className="w-4 h-4 rounded accent-blue-500"
            />
            <span className="text-[11px] mr-1">🌍</span>
            <span className="text-xs text-gray-400 group-hover:text-white transition-colors">Gravity</span>
          </label>

          {/* Mass slider - only show when gravity is enabled */}
          {activeSelection.physics?.dynamic && (
            <div className="ml-7 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500">Mass</span>
                <span className="text-[10px] text-blue-400 font-mono">{(activeSelection.physics?.mass || 1).toFixed(1)} kg</span>
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
                className="w-full accent-blue-500 h-1"
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
  onSelectAsset: (asset: SceneAsset) => void;
  onToggleVisibility: (uid: string) => void;
  onRemoveAsset: (uid: string) => void;
}

function SceneAssetsList({
  sceneAssets,
  activeSelection,
  onSelectAsset,
  onToggleVisibility,
  onRemoveAsset,
}: SceneAssetsListProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Scene Assets</span>
        <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-1 rounded-full">
          {sceneAssets.length} items
        </span>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
        {sceneAssets.map(asset => (
          <div
            key={asset.uid}
            onClick={() => onSelectAsset(asset)}
            className={`group bg-[#252526] p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all border ${
              activeSelection?.uid === asset.uid
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-transparent hover:border-[#444]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={asset.thumbnail || '/bio.png'}
                className="w-10 h-10 rounded-lg object-cover border border-[#444]"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                  {asset.name}
                </span>
                <span className={`text-[10px] font-medium ${
                  asset.type === 'environment-3d' ? 'text-blue-400' :
                  asset.type === 'environment-ai' ? 'text-purple-400' : 'text-gray-500'
                }`}>
                  {asset.type === 'environment-3d' ? 'Environment' :
                   asset.type === 'environment-ai' ? 'AI Skybox' : 'Model'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleVisibility(asset.uid); }}
                className={`p-2 rounded-lg transition-all ${
                  asset.visible ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-gray-600 hover:bg-white/5'
                }`}
              >
                {asset.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveAsset(asset.uid); }}
                className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {sceneAssets.length === 0 && (
          <div className="text-center py-8 text-gray-600">
            <Layers className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-xs">No assets yet</p>
            <p className="text-[10px] mt-1">Use the Agent to add content</p>
          </div>
        )}
      </div>
    </div>
  );
}
