// @ts-nocheck
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, LayoutGrid } from "lucide-react";
import AgentConsole from "../AgentConsole";
import AssetLibraryPanel from "./AssetLibraryPanel";
import type { AgentMessage, AgentStatus } from "../../hooks/useAgentOrchestrator";

// ═══════════════════════════════════════════════════════════════════════════
// AGENT SIDEBAR - Tabbed Panel: AI Chat + Asset Library
// Manus-style floating card with tab navigation
// ═══════════════════════════════════════════════════════════════════════════

export interface AgentSidebarProps {
  isOpen: boolean;
  messages: AgentMessage[];
  isAiLoading: boolean;
  agentStatus: AgentStatus;
  agentLogs: string[];
  isExecuting: boolean;
  onSendMessage: (input: string) => void;
  onClearScene: () => void;
  onAddAsset?: (asset: {
    name: string;
    modelUrl: string;
    thumbnailUrl?: string;
    source: 'internal';
  }) => void;
}

type TabId = 'chat' | 'library';

const TABS = [
  { id: 'chat' as TabId, label: 'AI Chat', icon: MessageSquare },
  { id: 'library' as TabId, label: 'Asset Library', icon: LayoutGrid },
];

export default function AgentSidebar({
  isOpen,
  messages,
  isAiLoading,
  agentStatus,
  agentLogs,
  isExecuting,
  onSendMessage,
  onClearScene,
  onAddAsset,
}: AgentSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabId>('chat');

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -40, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          className="h-full flex-shrink-0 p-3"
          style={{ width: '25vw', minWidth: '320px', maxWidth: '420px' }}
          data-tour="agent-sidebar"
        >
          {/* Floating Card Container */}
          <div
            className="h-full bg-white overflow-hidden shadow-2xl flex flex-col"
            style={{
              borderRadius: '32px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.03)'
            }}
          >
            {/* Tab Navigation */}
            <div className="flex-shrink-0 px-4 pt-4 pb-2">
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : ''}`} />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {activeTab === 'chat' ? (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <AgentConsole
                      messages={messages}
                      isAiLoading={isAiLoading}
                      agentStatus={agentStatus}
                      agentLogs={agentLogs}
                      isExecuting={isExecuting}
                      onSendMessage={onSendMessage}
                      onClearScene={onClearScene}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="library"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <AssetLibraryPanel
                      onAddAsset={onAddAsset || (() => console.warn('[AssetLibrary] onAddAsset not provided'))}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
