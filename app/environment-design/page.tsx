// @ts-nocheck
"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import Navigation from "../../components/Navigation";
import {
  AgentSidebar,
  DesignerPanel,
  EnvironmentViewport,
  SuccessNotification,
  AIPreviewCard,
  ExportPopup
} from "../../components/environment-design";
import { useSceneManager } from "../../hooks/useSceneManager";

// ═══════════════════════════════════════════════════════════════════════════ 
// ENVIRONMENT DESIGN PAGE - Clean Layout Container
// 所有的状态逻辑都移到了 useSceneManager hook 里
// ═══════════════════════════════════════════════════════════════════════════ 

function EnvironmentDesignContent() {
  const scene = useSceneManager();

  if (!scene.mounted) return null;

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] relative overflow-hidden flex flex-col">
      <Navigation />

      {/* 3-Column Layout */}
      <div className="flex-1 mt-[64px] flex overflow-hidden">
        {/* Left: AI Agent Sidebar */}
        <AgentSidebar
          isOpen={scene.leftPanelOpen}
          messages={scene.agent.messages}
          isAiLoading={scene.agent.isAiLoading}
          agentStatus={scene.agent.agentStatus}
          agentLogs={scene.agent.agentLogs}
          isExecuting={scene.agent.isExecuting}
          onSendMessage={scene.agent.handleAiSend}
          onClearScene={scene.agent.clearAgentAssets}
        />

        {/* Center: 3D Viewport */}
        <EnvironmentViewport
          sceneAssets={scene.sceneAssets}
          activeSelection={scene.activeSelection}
          transformMode={scene.transformMode}
          leftPanelOpen={scene.leftPanelOpen}
          rightPanelOpen={scene.rightPanelOpen}
          onSelectAsset={scene.setActiveSelection}
          onUpdateTransform={scene.updateAssetTransform}
          onEnvironmentLoaded={(uid) => scene.updateAssetTransform(uid, { bestFitScale: 1 })}
          onToggleLeftPanel={scene.toggleLeftPanel}
          onToggleRightPanel={scene.toggleRightPanel}
          onSetTransformMode={scene.setTransformMode}
          onResetTransform={scene.handleResetTransform}
        />

        {/* Right: Designer Panel */}
        <DesignerPanel
          isOpen={scene.rightPanelOpen}
          sceneAssets={scene.sceneAssets}
          activeSelection={scene.activeSelection}
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