// @ts-nocheck
"use client";

import { motion, AnimatePresence } from "framer-motion";
import AgentConsole from "../AgentConsole";
import type { AgentMessage, AgentStatus } from "../../hooks/useAgentOrchestrator";

// ═══════════════════════════════════════════════════════════════════════════
// AGENT SIDEBAR - Manus-style AI Assistant Panel
// 25vw width, white theme, 32px border-radius, floating card aesthetic
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
}

export default function AgentSidebar({
  isOpen,
  messages,
  isAiLoading,
  agentStatus,
  agentLogs,
  isExecuting,
  onSendMessage,
  onClearScene,
}: AgentSidebarProps) {
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
            className="h-full bg-white overflow-hidden shadow-2xl"
            style={{
              borderRadius: '32px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.03)'
            }}
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
