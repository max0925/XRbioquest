// @ts-nocheck
"use client";

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { ChevronRight, ChevronLeft, Loader2, Move, RotateCcw, Maximize2, Zap, Wand2, Send, Mic, MessagesSquare } from "lucide-react";
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
    <main className="flex-1 relative flex flex-col bg-[#1a1a1a] scene-container" data-tour="viewport">
      {/* Left Toggle Button */}
      <div className="absolute top-4 left-4 z-30 flex gap-2">
        <button
          onClick={onToggleLeftPanel}
          className="bg-black/60 backdrop-blur px-3 py-2 rounded-lg border border-white/10 text-white hover:bg-black/80 transition-all flex items-center gap-1.5"
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${leftPanelOpen ? 'rotate-180' : ''}`} />
          <MessagesSquare className="w-4 h-4" />
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
      {/* AI Orchestrator — Classroom Controller */}
      {showAiPopover && (
        <div
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 w-[360px]"
          style={{ animation: 'orchestrator-enter 0.25s cubic-bezier(0.16,1,0.3,1)' }}
        >
          {/* Outer glow ring */}
          <div
            className="absolute -inset-px rounded-[20px] opacity-60"
            style={{
              background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08), transparent 60%)',
              animation: isAiLoading ? 'orchestrator-pulse 2s ease-in-out infinite' : 'none',
            }}
          />

          <div
            className="relative rounded-[20px] overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(23,23,23,0.97) 0%, rgba(10,10,10,0.98) 100%)',
              backdropFilter: 'blur(40px) saturate(1.8)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 24px 48px -12px rgba(0,0,0,0.6), 0 0 64px -16px rgba(251,191,36,0.08)',
            }}
          >
            {/* Header — minimal, authoritative */}
            <div className="px-5 pt-4 pb-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: isAiLoading ? '#fbbf24' : '#34d399',
                      boxShadow: isAiLoading ? '0 0 8px rgba(251,191,36,0.5)' : '0 0 8px rgba(52,211,153,0.4)',
                      animation: isAiLoading ? 'orchestrator-pulse 1.5s ease-in-out infinite' : 'none',
                    }}
                  />
                  <span
                    className="text-[11px] font-medium tracking-wide uppercase"
                    style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}
                  >
                    {isAiLoading ? 'Orchestrating...' : 'Scene Intelligence'}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Response — only when present */}
            {aiReply && (
              <div className="px-5 pt-1 pb-3">
                <p
                  className="text-[13px] leading-relaxed"
                  style={{ color: 'rgba(253,230,138,0.9)', fontStyle: 'italic' }}
                >
                  {aiReply}
                </p>
              </div>
            )}

            {/* Active environment indicator — subtle */}
            {(aiState.skybox_style && aiState.skybox_style !== 'Clean modern laboratory') && (
              <div className="px-5 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-amber-500/60" />
                  <span
                    className="text-[10px] truncate"
                    style={{ color: 'rgba(255,255,255,0.25)' }}
                    title={aiState.skybox_style}
                  >
                    {aiState.skybox_style}
                  </span>
                </div>
              </div>
            )}

            {/* Input — the hero element */}
            <div className="px-4 pb-4 pt-1">
              <div
                className="relative rounded-2xl transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  boxShadow: isListening
                    ? '0 0 0 2px rgba(239,68,68,0.4), 0 0 20px rgba(239,68,68,0.1)'
                    : '0 0 0 1px rgba(255,255,255,0.06)',
                }}
              >
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isAiLoading && !isListening) {
                      e.preventDefault();
                      handleCommand();
                    }
                  }}
                  placeholder="What happens to the heart in zero gravity?"
                  disabled={isAiLoading || isListening}
                  rows={2}
                  className="w-full bg-transparent resize-none px-4 pt-3.5 pb-10 text-[13px] text-white/90 placeholder-white/20 focus:outline-none disabled:opacity-40 leading-relaxed"
                  style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                />

                {/* Bottom controls bar inside the input */}
                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                  {/* Listening indicator */}
                  <div className="flex items-center gap-2">
                    {isListening && (
                      <div className="flex items-center gap-1.5">
                        <span className="flex gap-0.5">
                          {[0, 1, 2].map(i => (
                            <span
                              key={i}
                              className="w-0.5 bg-red-400 rounded-full"
                              style={{
                                height: '12px',
                                animation: `orchestrator-bar 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
                              }}
                            />
                          ))}
                        </span>
                        <span className="text-[10px] text-red-400/80">Listening...</span>
                      </div>
                    )}
                    {isAiLoading && (
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'rgba(251,191,36,0.7)' }} />
                        <span className="text-[10px]" style={{ color: 'rgba(251,191,36,0.5)' }}>Building world...</span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    {/* Voice */}
                    <button
                      onClick={toggleVoiceInput}
                      disabled={isAiLoading}
                      className="p-2 rounded-xl transition-all disabled:opacity-30"
                      style={{
                        background: isListening ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                        color: isListening ? '#f87171' : 'rgba(255,255,255,0.35)',
                      }}
                      title={isListening ? 'Stop listening' : 'Ask with voice'}
                    >
                      <Mic className="w-4 h-4" />
                    </button>

                    {/* Send */}
                    <button
                      onClick={handleCommand}
                      disabled={isAiLoading || !userInput.trim() || isListening}
                      className="p-2 rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                      style={{
                        background: (userInput.trim() && !isAiLoading && !isListening)
                          ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                          : 'rgba(255,255,255,0.05)',
                        color: (userInput.trim() && !isAiLoading && !isListening)
                          ? '#000'
                          : 'rgba(255,255,255,0.2)',
                        boxShadow: (userInput.trim() && !isAiLoading && !isListening)
                          ? '0 2px 12px rgba(245,158,11,0.3)'
                          : 'none',
                      }}
                      title="Send"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Keyframes */}
          <style>{`
            @keyframes orchestrator-enter {
              from { opacity: 0; transform: translateY(8px) scale(0.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes orchestrator-pulse {
              0%, 100% { opacity: 0.4; }
              50% { opacity: 1; }
            }
            @keyframes orchestrator-bar {
              from { transform: scaleY(0.3); }
              to { transform: scaleY(1); }
            }
          `}</style>
        </div>
      )}

      {/* Toolbar */}
      <div data-tour="transform-toolbar" className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/80 backdrop-blur p-1.5 rounded-xl border border-white/10 z-30">
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
          data-tour="ai-orchestrator-btn"
          className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
            showAiPopover
              ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25'
              : 'bg-gradient-to-r from-violet-600/80 to-fuchsia-600/80 text-white/90 hover:from-violet-600 hover:to-fuchsia-600 hover:text-white hover:shadow-lg hover:shadow-violet-500/25'
          }`}
          title="AI Orchestrator"
        >
          <Wand2 className="w-4 h-4" />
          <span className="text-xs font-medium">AI Orchestrator</span>
        </button>
      </div>
    </>
  );
}
