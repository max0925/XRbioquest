// @ts-nocheck
"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, HelpCircle, Plus, Dna, Atom, Zap, Sparkles, ArrowUp, Paperclip, X, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "../../components/Navigation";
import {
  AgentSidebar,
  DesignerPanel,
  EnvironmentViewport,
  SuccessNotification,
  AIPreviewCard,
  ExportPopup
} from "../../components/environment-design";
import OnboardingTour from "../../components/onboarding/OnboardingTour";
import { useSceneManager } from "../../hooks/useSceneManager";
import { useOnboardingTour } from "../../hooks/useOnboardingTour";

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE PROMPTS - Quick start topics for lesson creation
// ═══════════════════════════════════════════════════════════════════════════
const examplePrompts = [
  {
    icon: Dna,
    color: "from-emerald-500 to-teal-500",
    title: "DNA Replication",
    prompt: "Create an interactive VR lesson about DNA replication for high school biology students"
  },
  {
    icon: Atom,
    color: "from-blue-500 to-cyan-500",
    title: "Solar System",
    prompt: "Design a 3D solar system exploration experience for middle school astronomy"
  },
  {
    icon: Zap,
    color: "from-purple-500 to-pink-500",
    title: "Atomic Structure",
    prompt: "Build a VR lesson on atomic structure and electron orbitals for chemistry class"
  },
  {
    icon: Sparkles,
    color: "from-orange-500 to-amber-500",
    title: "Human Anatomy",
    prompt: "Create an immersive anatomy lesson focusing on the skeletal and muscular systems"
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// WELCOME SCREEN - Shown when no active lesson
// ═══════════════════════════════════════════════════════════════════════════
function WelcomeScreen({ onStartLesson }: { onStartLesson: (prompt: string) => void }) {
  const [input, setInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");

  const handleSend = (promptText?: string) => {
    const messageToSend = promptText || input;
    if (!messageToSend.trim()) return;
    onStartLesson(messageToSend);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  };

  const clearFile = () => {
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 bg-gray-50">
      <div className="w-full max-w-3xl flex flex-col items-center">
        {/* DNA Orb Animation */}
        <motion.div
          className="relative mb-6"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="w-28 h-28 rounded-full bg-gradient-to-r from-emerald-400/20 to-cyan-400/20 blur-xl"
              animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <div className="relative w-[72px] h-[72px] rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 shadow-xl flex items-center justify-center">
            <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }}>
              <Dna size={32} className="text-white" strokeWidth={2} />
            </motion.div>
          </div>
        </motion.div>

        {/* Welcome Text */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-gray-900 via-emerald-900 to-gray-900 bg-clip-text text-transparent"
          style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
        >
          Create VR Lessons with AI
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-base text-gray-600 mb-8"
          style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
        >
          Describe a lesson idea or try an example below
        </motion.p>

        {/* Example Prompts */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap gap-3 justify-center mb-10 max-w-2xl"
        >
          {examplePrompts.map((example, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSend(example.prompt)}
              className="group px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:border-emerald-400 hover:shadow-lg transition-all duration-200"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${example.color} flex items-center justify-center flex-shrink-0`}>
                  <example.icon size={18} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="text-sm font-semibold text-gray-700">{example.title}</span>
              </div>
            </motion.button>
          ))}
        </motion.div>

        {/* Input Area */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-2xl"
        >
          {/* File Preview */}
          {fileName && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl text-sm shadow-md"
            >
              <ImageIcon size={18} className="text-emerald-600" />
              <span className="text-emerald-900 font-semibold truncate max-w-[200px]">{fileName}</span>
              <button onClick={clearFile} className="text-emerald-600 hover:text-emerald-800 hover:scale-110 transition-transform">
                <X size={18} strokeWidth={2.5} />
              </button>
            </motion.div>
          )}

          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-3xl blur-lg opacity-20"></div>
            <div className="relative flex items-end gap-3 px-5 py-4 bg-white border-2 border-gray-200 rounded-3xl shadow-2xl hover:shadow-emerald-200/50 focus-within:border-emerald-500 focus-within:shadow-emerald-300/50 transition-all duration-300">
              {/* File Upload */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
              >
                <Paperclip size={20} strokeWidth={2.5} />
              </motion.button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*" />

              {/* Text Input */}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Describe your lesson idea..."
                rows={1}
                className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 resize-none py-2 text-[15px] font-medium"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif', maxHeight: '160px', minHeight: '28px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
              />

              {/* Send Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className={`p-3 rounded-xl transition-all duration-300 shadow-lg ${
                  !input.trim()
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:shadow-emerald-400/50"
                }`}
              >
                <ArrowUp size={20} strokeWidth={3} />
              </motion.button>
            </div>

            <p className="text-xs text-gray-400 text-center mt-4 font-medium" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
              ✨ Powered by BioQuest AI • Press Enter to send
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LEFT SIDEBAR - Shown in both welcome and editor views
// ═══════════════════════════════════════════════════════════════════════════
function LessonSidebar({ onNewLesson, hasActiveLesson }: { onNewLesson: () => void; hasActiveLesson: boolean }) {
  return (
    <motion.aside
      initial={{ x: -280, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-[260px] bg-white/95 backdrop-blur-xl border-r border-gray-200/50 flex flex-col shadow-xl flex-shrink-0"
      style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
    >
      {/* New Lesson Button */}
      <div className="p-4 border-b border-gray-200/50">
        <motion.button
          onClick={onNewLesson}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:shadow-lg transition-all duration-300 text-sm font-semibold"
        >
          <Plus size={18} strokeWidth={2.5} />
          New Lesson
        </motion.button>
      </div>

      {/* Recent Lessons */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-xs font-bold text-gray-500 mb-3 px-2 uppercase tracking-wider">Recent</div>
        <div className="space-y-2">
          {hasActiveLesson && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/50 text-sm text-gray-900 truncate cursor-pointer hover:shadow-md transition-all"
            >
              Current Lesson
            </motion.div>
          )}
          {!hasActiveLesson && (
            <p className="text-xs text-gray-400 px-2">No recent lessons</p>
          )}
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200/50 bg-gradient-to-br from-gray-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold text-sm shadow-lg">
            U
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 text-sm">User</p>
            <p className="text-xs text-emerald-600 font-medium">Teacher Mode ✨</p>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ENVIRONMENT DESIGN PAGE - Merged with Create Lesson functionality
// Shows welcome screen when no active lesson, editor when lesson is started
// ═══════════════════════════════════════════════════════════════════════════

function EnvironmentDesignContent() {
  const searchParams = useSearchParams();
  const scene = useSceneManager();
  const tour = useOnboardingTour();

  // Track if user has started a lesson
  const [hasActiveLesson, setHasActiveLesson] = useState(false);
  const initialCheckDone = useRef(false);

  // AI Orchestrator state (shared with viewport)
  const [aiState, setAiState] = useState({
    skybox_style: 'Clean modern laboratory with white walls, scientific equipment, 8k',
    lighting_color: '#ffffff',
    channel_state: 0.0,
    skybox_url: null as string | null
  });

  // Check for initial prompt or existing scene on mount
  useEffect(() => {
    if (!scene.mounted || initialCheckDone.current) return;
    initialCheckDone.current = true;

    const urlPrompt = searchParams.get('prompt');
    const storedPrompt = localStorage.getItem('initial_prompt');

    // If there's a prompt in URL or localStorage, we have an active lesson
    if (urlPrompt || storedPrompt) {
      setHasActiveLesson(true);
    }
    // Also check if there are existing scene assets
    if (scene.sceneAssets.length > 0) {
      setHasActiveLesson(true);
    }
  }, [scene.mounted, searchParams, scene.sceneAssets.length]);

  // Watch for scene changes to detect active lesson
  useEffect(() => {
    if (scene.agent.messages.length > 0 || scene.sceneAssets.length > 0) {
      setHasActiveLesson(true);
    }
  }, [scene.agent.messages.length, scene.sceneAssets.length]);

  // Handle starting a new lesson from welcome screen
  const handleStartLesson = (prompt: string) => {
    setHasActiveLesson(true);
    // Send the prompt to the AI agent
    setTimeout(() => {
      scene.agent.handleAiSend(prompt);
    }, 100);
  };

  // Handle creating a new lesson (reset state)
  const handleNewLesson = () => {
    setHasActiveLesson(false);
    scene.agent.clearAgentAssets();
  };

  if (!scene.mounted) return null;

  // Show welcome screen when no active lesson
  if (!hasActiveLesson) {
    return (
      <div className="h-screen w-screen bg-gray-50 relative overflow-hidden flex flex-col">
        <Navigation />
        <div className="flex-1 mt-[64px] flex overflow-hidden">
          <LessonSidebar onNewLesson={handleNewLesson} hasActiveLesson={false} />
          <WelcomeScreen onStartLesson={handleStartLesson} />
        </div>
      </div>
    );
  }

  // Show full editor when lesson is active
  return (
    <div className="h-screen w-screen bg-[#0a0a0a] relative overflow-hidden flex flex-col">
      <Navigation />

      {/* 3-Column Layout */}
      <div className="flex-1 mt-[64px] flex overflow-hidden">
        {/* Left: AI Agent Sidebar + Asset Library */}
        <AgentSidebar
          isOpen={scene.leftPanelOpen}
          messages={scene.agent.messages}
          isAiLoading={scene.agent.isAiLoading}
          agentStatus={scene.agent.agentStatus}
          agentLogs={scene.agent.agentLogs}
          isExecuting={scene.agent.isExecuting}
          onSendMessage={scene.agent.handleAiSend}
          onClearScene={scene.agent.clearAgentAssets}
          onAddAsset={scene.addAssetFromLibrary}
        />

        {/* Center: 3D Viewport */}
        <EnvironmentViewport
          sceneAssets={scene.sceneAssets}
          activeSelection={scene.activeSelection}
          transformMode={scene.transformMode}
          leftPanelOpen={scene.leftPanelOpen}
          rightPanelOpen={scene.rightPanelOpen}
          aiState={aiState}
          onAiStateChange={setAiState}
          onSelectAsset={scene.setActiveSelection}
          onUpdateTransform={scene.updateAssetTransform}
          onEnvironmentLoaded={(uid) => scene.updateAssetTransform(uid, { bestFitScale: 1 })}
          onToggleLeftPanel={scene.toggleLeftPanel}
          onToggleRightPanel={scene.toggleRightPanel}
          onSetTransformMode={scene.setTransformMode}
          onResetTransform={scene.handleResetTransform}
          onLoadingStateChange={scene.handleLoadingStateChange}
        />

        {/* Right: Designer Panel */}
        <DesignerPanel
          isOpen={scene.rightPanelOpen}
          sceneAssets={scene.sceneAssets}
          activeSelection={scene.activeSelection}
          loadingModels={scene.loadingModels}
          onSelectAsset={scene.setActiveSelection}
          onUpdateTransform={scene.updateAssetTransform}
          onToggleVisibility={scene.toggleAssetVisibility}
          onRemoveAsset={scene.removeAsset}
          onExport={scene.handleExport}
        />
      </div>

      {/* Global Overlays */}
      <SuccessNotification show={scene.showSuccessNotification} />
      <AIPreviewCard
        show={scene.showPreviewCard}
        data={scene.aiPreviewData}
        onDeploy={scene.handleDeployAISkybox}
        onDiscard={scene.discardAIPreview}
      />
      <ExportPopup
        show={scene.showExportPopup}
        url={scene.exportUrl}
        onClose={scene.closeExportPopup}
      />

      {/* Onboarding Tour */}
      <OnboardingTour tour={tour} />

      {/* Help Button — restart tour */}
      <button
        onClick={() => { tour.resetTour(); setTimeout(() => tour.startTour(), 100); }}
        className="fixed bottom-5 left-5 z-50 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/30 hover:text-white/70 hover:bg-white/10 hover:border-white/20 transition-all"
        title="Restart tour"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.15); }
        a-scene { display: block; width: 100%; height: 100%; position: relative; z-index: 10; }
      `}</style>
    </div>
  );
}

// Main export with Suspense boundary
export default function EnvironmentDesignPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    }>
      <EnvironmentDesignContent />
    </Suspense>
  );
}
