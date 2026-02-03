// @ts-nocheck
"use client";

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { ChevronRight, ChevronLeft, Loader2, Move, RotateCcw, Maximize2, Zap, Sparkles, Send, Mic } from "lucide-react";
import type { SceneAsset } from "../../hooks/useAgentOrchestrator";
import { useVoiceInput } from "../../hooks/useVoiceInput";

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

  // AI Orchestrator state
  aiState?: {
    skybox_style?: string;
    lighting_color?: string;
    channel_state: number;
    skybox_url?: string | null;
  };
  onAiStateChange?: (state: { skybox_style?: string; lighting_color?: string; channel_state: number; skybox_url?: string | null }) => void;

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
  aiState,
  onAiStateChange,
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
          className="bg-black/60 backdrop-blur px-3 py-2 rounded-lg border border-white/10 text-white hover:bg-black/80 transition-all flex items-center gap-2"
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${leftPanelOpen ? 'rotate-180' : ''}`} />
          <span className="text-xs font-medium">AI Orchestrator</span>
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
        aiState={aiState}
        onAssetClick={onSelectAsset}
        onAssetTransform={onUpdateTransform}
        onEnvironmentLoaded={onEnvironmentLoaded}
        onLoadingStateChange={onLoadingStateChange}
      />

      {/* Transform Toolbar */}
      <TransformToolbar
        transformMode={transformMode}
        activeSelection={activeSelection}
        aiState={aiState}
        onAiStateChange={onAiStateChange}
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
  aiState?: {
    skybox_style?: string;
    lighting_color?: string;
    channel_state: number;
    skybox_url?: string | null;
  };
  onAiStateChange?: (state: { skybox_style?: string; lighting_color?: string; channel_state: number; skybox_url?: string | null }) => void;
  onSetTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
  onResetTransform: () => void;
}

function TransformToolbar({
  transformMode,
  activeSelection,
  aiState = { skybox_style: 'Clean modern laboratory', lighting_color: '#ffffff', channel_state: 0.0, skybox_url: null },
  onAiStateChange,
  onSetTransformMode,
  onResetTransform,
}: TransformToolbarProps) {
  const [showAiPopover, setShowAiPopover] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiReply, setAiReply] = useState('');

  // Voice input hook
  const { isListening, toggleVoiceInput } = useVoiceInput((transcript) => {
    setUserInput(transcript);
  });

  // Handle AI command
  const handleCommand = async () => {
    if (!userInput.trim() || !onAiStateChange) return;

    setIsAiLoading(true);
    try {
      // Get AI response
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userInput })
      });

      if (!response.ok) throw new Error('Failed to communicate with AI');

      const data = await response.json();

      // Display AI reply immediately
      setAiReply(data.reply + ' Generating skybox...');
      setUserInput('');

      // Trigger skybox generation (this will take ~20-60 seconds)
      try {
        const skyboxResponse = await fetch('/api/generate-skybox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: data.skybox_style })
        });

        if (!skyboxResponse.ok) {
          console.warn('Skybox generation failed, using default environment');
          setAiReply(data.reply + ' (Skybox generation failed, using default)');
          // Update state without skybox URL (will use default environment)
          onAiStateChange({
            skybox_style: data.skybox_style,
            lighting_color: data.lighting_color,
            channel_state: data.channel_state,
            skybox_url: null
          });
          return;
        }

        const skyboxData = await skyboxResponse.json();

        if (skyboxData.file_url) {
          console.log(`[SKYBOX] ✓ Skybox ready: ${skyboxData.file_url}`);
          setAiReply(data.reply + ' Skybox loaded!');

          // Update state with the generated skybox URL
          onAiStateChange({
            skybox_style: data.skybox_style,
            lighting_color: data.lighting_color,
            channel_state: data.channel_state,
            skybox_url: skyboxData.file_url
          });
        } else {
          console.warn('No file_url in response');
          setAiReply(data.reply + ' (Skybox URL not available)');
          onAiStateChange({
            skybox_style: data.skybox_style,
            lighting_color: data.lighting_color,
            channel_state: data.channel_state,
            skybox_url: null
          });
        }
      } catch (skyboxError) {
        console.error('Skybox generation error:', skyboxError);
        setAiReply(data.reply + ' (Skybox generation error)');
        onAiStateChange({
          skybox_style: data.skybox_style,
          lighting_color: data.lighting_color,
          channel_state: data.channel_state,
          skybox_url: null
        });
      }

    } catch (error) {
      console.error('AI Orchestrator error:', error);
      setAiReply('Error: Unable to process command. Please try again.');
    } finally {
      setIsAiLoading(false);
    }
  };
  const modes = [
    { mode: 'translate' as const, icon: Move, color: 'emerald', title: 'Move' },
    { mode: 'rotate' as const, icon: RotateCcw, color: 'blue', title: 'Rotate' },
    { mode: 'scale' as const, icon: Maximize2, color: 'purple', title: 'Scale' },
  ];

  return (
    <>
      {/* AI Popover - Glassmorphism Design */}
      {showAiPopover && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-neutral-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-72 overflow-hidden z-40">
          {/* Status Text */}
          <div className="px-4 py-2.5">
            <div className="text-xs text-white/60 mb-0.5">Current Environment</div>
            <div className="text-sm text-white/90 font-medium truncate" title={aiState.skybox_style}>
              {aiState.skybox_style}
            </div>
          </div>

          {/* AI Reply */}
          {aiReply && (
            <div className="px-4 py-2 border-t border-white/5 bg-white/5">
              <div className="text-xs text-emerald-400/90">{aiReply}</div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 border-t border-white/5">
            <div className="relative">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isAiLoading && !isListening && handleCommand()}
                placeholder="Enter command..."
                disabled={isAiLoading || isListening}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-20 text-white text-xs placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50 transition-all"
              />
              {/* Mic Button */}
              <button
                onClick={toggleVoiceInput}
                disabled={isAiLoading}
                className={`absolute right-11 top-1/2 -translate-y-1/2 ${
                  isListening ? 'bg-red-500/80 animate-pulse' : 'bg-white/10 hover:bg-white/20'
                } text-white p-1.5 rounded-md transition-all disabled:opacity-50`}
              >
                <Mic className="w-3 h-3" />
              </button>
              {/* Send Button */}
              <button
                onClick={handleCommand}
                disabled={isAiLoading || !userInput.trim() || isListening}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 disabled:bg-white/5 text-white p-1.5 rounded-md transition-all disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
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

        <div className="w-px h-6 bg-white/10 mx-1" />

        {/* AI Button */}
        <button
          onClick={() => setShowAiPopover(!showAiPopover)}
          className={`p-2.5 rounded-lg transition-all ${
            showAiPopover
              ? 'bg-purple-500 text-white'
              : 'text-purple-400 hover:text-white hover:bg-purple-500/20'
          }`}
          title="AI Orchestrator"
        >
          <Sparkles className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}
