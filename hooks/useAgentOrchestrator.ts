// hooks/useAgentOrchestrator.ts
import { useState, useCallback } from 'react';
import { useMeshyAI } from './useMeshyAI'; // Import Tool 1
import { useAssetLibrary } from './useAssetLibrary'; // Import Tool 2

// ═══════════════════════════════════════════════════════════════════════════
// UNIQUE ID GENERATOR - Prevents duplicate key errors in React
// Uses crypto.randomUUID() with timestamp fallback
// ═══════════════════════════════════════════════════════════════════════════
const generateUniqueId = (prefix: string = 'asset'): string => {
  const timestamp = Date.now();
  const random = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
  return `${prefix}-${timestamp}-${random}`;
};

// Types
export interface AutomationStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'success' | 'failed' | 'skipped';
  detail?: string;
}

export interface SceneAsset {
  uid: string;
  name: string;
  type: 'model' | 'environment-3d' | 'environment-ai';
  thumbnail?: string;
  modelPath?: string | null;
  visible: boolean;
  placed: boolean;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
  pendingGeneration?: boolean;
  generationPrompt?: string;
  interactionFX?: { grabbable: boolean; glowPulse: boolean; collisionTrigger: boolean };
}

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
  type?: 'chat' | 'thinking' | 'lesson_plan' | 'building';
  lessonPlan?: any;
}

// Config
const DUAL_LOAD_SKYBOX = true;

// ─── MAIN HOOK ───────────────────────────────────────────────────────────────
export function useAgentOrchestrator({
  onSceneAssetsChange,
  onAiPromptChange,
  onAIGeneration,
}: {
  onSceneAssetsChange: (updater: (prev: SceneAsset[]) => SceneAsset[]) => void;
  onAiPromptChange?: (prompt: string) => void;
  onAIGeneration?: (prompt: string, autoApply?: boolean) => void;
}) {
  
  // Tools
  const { generate3DModel } = useMeshyAI();
  const { searchLibrary } = useAssetLibrary();

  // State
  const [messages, setMessages] = useState<AgentMessage[]>([
    { role: 'assistant', content: "Hi! I'm your AI Design Assistant. Ready to build something epic?" }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [agentLogs, setAgentLogs] = useState<string[]>(['[SYSTEM] Ready.']);
  const [automationSteps, setAutomationSteps] = useState<AutomationStep[]>([]); // ✨ Visual Steps Kept!

  const addLog = useCallback((msg: string) => setAgentLogs(p => [...p, msg]), []);

  // Helper: Visual Step Updater
  const updateStep = (id: string, status: AutomationStep['status'], detail?: string) => {
    setAutomationSteps(prev => prev.map(s => s.id === id ? { ...s, status, detail: detail || s.detail } : s));
  };

  // ─── ACTION LOGIC ──────────────────────────────────────────────────────────
  const executeActions = useCallback(async (actions: any[], lessonPlan?: any) => {
    const newAssets: SceneAsset[] = [];

    // Track model generation: only first model calls real API, rest are placeholders
    let modelGenerationCount = 0;

    // Reset Visual Steps
    setAutomationSteps([]); 

    for (const action of actions) {
      addLog(`[ACTION] ${action.type}`);

      switch (action.type) {
        
        // 1. SEARCH & ADD (With Visual Steps)
        case 'SEARCH_LIBRARY': {
          const query = action.params.query || action.params.asset_name;
          const intent = action.params.intent || 'object';
          const stepId = generateUniqueId('step-search');

          // ✨ Add Visual Step
          setAutomationSteps(p => [...p, { id: stepId, label: `Searching: ${query}`, status: 'active' }]);

          // Environment Routing
          if (intent === 'environment') {
            updateStep(stepId, 'skipped', 'Environment detected -> Skybox');
            addLog(`[ROUTING] Environment detected, switching to Skybox AI`);
            if (onAIGeneration) setTimeout(() => onAIGeneration(query, false), 500); // Trigger Preview
            break;
          }

          // Library Search
          const result = searchLibrary(query);
          if (result) {
            updateStep(stepId, 'success', `Found: ${result.asset.name}`);
            newAssets.push({
              uid: generateUniqueId('lib'),
              name: result.asset.name,
              type: 'model',
              thumbnail: result.asset.thumb,
              modelPath: result.asset.modelPath,
              visible: true,
              placed: true,
              position: { x: newAssets.length * 2, y: 0, z: -3 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: 1,
              interactionFX: { grabbable: false, glowPulse: false, collisionTrigger: false }
            });
          } else {
            updateStep(stepId, 'active', 'Not found locally, generating AI model...');
            // Fallback to Generation
            actions.push({ 
              type: 'GENERATE_MODEL', 
              params: { name: query, prompt: `3D model of ${query}`, intent: 'object' } 
            });
          }
          break;
        }

        // 2. GENERATE MODEL - Generate ALL models via Meshy API
        case 'GENERATE_MODEL': {
          const { name, prompt } = action.params;
          modelGenerationCount++;

          const stepId = generateUniqueId('step-gen');
          const uid = generateUniqueId('ai-model');

          addLog(`[GENERATE] "${name}" → Calling Meshy API`);
          setAutomationSteps(p => [...p, { id: stepId, label: `Generating: ${name}`, status: 'active', detail: 'Calling Meshy API...' }]);

          const asset: SceneAsset = {
            uid,
            name: `${name} (Generating...)`,
            type: 'model',
            modelPath: null,
            visible: true,
            placed: true,
            position: { x: (modelGenerationCount - 1) * 2, y: 1, z: -3 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: 1,
            pendingGeneration: true,
            generationPrompt: prompt,
            interactionFX: { glowPulse: true, grabbable: false, collisionTrigger: false }
          };

          onSceneAssetsChange(prev => {
            if (prev.some(a => a.uid === asset.uid)) return prev;
            return [...prev, asset];
          });

          // Call Meshy API for ALL models
          generate3DModel(prompt, (status) => {
            updateStep(stepId, 'active', status);
            addLog(`[MESHY] ${name}: ${status}`);
          }).then((res: any) => {
            if (res.success && res.modelUrl) {
              updateStep(stepId, 'success', 'Model Ready');
              addLog(`[MESHY] ✓ ${name}: Model URL received`);
              onSceneAssetsChange(prev => prev.map(a => a.uid === uid ? {
                ...a,
                modelPath: res.modelUrl,
                name: name,
                pendingGeneration: false,
                interactionFX: { ...a.interactionFX, glowPulse: false }
              } : a));
            } else {
              // Handle failures: remove the placeholder asset
              updateStep(stepId, 'failed', res.error || 'Generation failed');
              addLog(`[MESHY] ✗ ${name}: ${res.error || 'Failed'}`);

              // Remove the placeholder asset since generation failed
              onSceneAssetsChange(prev => prev.filter(a => a.uid !== uid));

              // Show error in automation steps
              if (res.disabled) {
                updateStep(stepId, 'failed', 'Meshy AI is disabled');
              } else if (res.rateLimited || res.queued) {
                updateStep(stepId, 'failed', 'Rate limit reached (max 2 concurrent)');
              }
            }
          });
          break;
        }

        // 3. SKYBOX (Visual Step + Modal)
        case 'GENERATE_SKYBOX':
        case 'UPDATE_SKYBOX': {
          const { prompt } = action.params;
          // ✨ Add Visual Step
          setAutomationSteps(p => [...p, { id: generateUniqueId('step-sky'), label: 'Skybox Generation', status: 'success', detail: 'Waiting for approval...' }]);
          
          if (onAiPromptChange) onAiPromptChange(prompt);
          if (onAIGeneration) setTimeout(() => onAIGeneration(prompt, false), 100); // Force Preview
          break;
        }

        // 4. ENVIRONMENT & DUAL LAYER
        case 'SET_ENVIRONMENT': {
          const { file, skybox_prompt } = action.params;
          const libAsset = searchLibrary(file)?.asset;

          if (libAsset) {
            const newEnvUid = generateUniqueId('env');
            // Single state update: filter old environments AND add new one
            onSceneAssetsChange(prev => {
              const filtered = prev.filter(a => !a.type.includes('environment'));
              return [{
                uid: newEnvUid,
                name: libAsset.name,
                type: 'environment-3d',
                modelPath: libAsset.modelPath,
                visible: true,
                placed: true,
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: 1
              }, ...filtered];
            });

            if (DUAL_LOAD_SKYBOX) {
              const exteriorPrompt = skybox_prompt || `View outside a ${libAsset.name}`;
              addLog('[DUAL] Triggering exterior view...');
              if (onAIGeneration) setTimeout(() => onAIGeneration(exteriorPrompt, false), 800);
            }
          }
          break;
        }

        // 5. INJECT LOGIC
        case 'INJECT_LOGIC': {
          const { target, interaction_type } = action.params;
          addLog(`[FX] Applying ${interaction_type} to ${target}`);
          
          const fxMap: any = { 'grabbable': 'grabbable', 'glow_pulse': 'glowPulse', 'collision_trigger': 'collisionTrigger' };
          const prop = fxMap[interaction_type.toLowerCase()] || interaction_type;

          setTimeout(() => {
            onSceneAssetsChange(prev => prev.map(a => 
              (a.name.toLowerCase().includes(target.toLowerCase()) || a.uid.includes(target))
                ? { ...a, interactionFX: { ...a.interactionFX, [prop]: true } }
                : a
            ));
          }, 500);
          break;
        }
      }
    }
    
    if (newAssets.length > 0) {
      onSceneAssetsChange(prev => {
        // Filter out any assets that already exist to prevent duplicates
        const existingUids = new Set(prev.map(a => a.uid));
        const uniqueNewAssets = newAssets.filter(a => !existingUids.has(a.uid));
        return uniqueNewAssets.length > 0 ? [...prev, ...uniqueNewAssets] : prev;
      });
    }
  }, [addLog, onSceneAssetsChange, onAiPromptChange, onAIGeneration, generate3DModel, searchLibrary]);

  // ─── CHAT HANDLER ──────────────────────────────────────────────────────────
  const handleAiSend = useCallback(async (input: string) => {
    if (!input.trim() || isAiLoading) return;
    setMessages(p => [...p, { role: 'user', content: input }]);
    setIsAiLoading(true);
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, history: messages })
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorMsg = 'API Error';
        try {
          const errorData = JSON.parse(errorText);
          errorMsg = errorData.reasoning || errorData.error || errorMsg;
        } catch {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();

      if (data.actions) {
        // Lesson Plan Display
        const plan = data.actions.find((a: any) => a.type === 'DISPLAY_LESSON_PLAN')?.params?.lessonPlan || data.lessonPlan;
        if (plan) {
          setMessages(p => [...p, { role: 'assistant', content: `Lesson Plan: ${plan.topic}`, type: 'lesson_plan', lessonPlan: plan }]);
        }
        
        // Chat Response
        const chatMsg = data.actions.find((a: any) => a.type === 'CHAT_RESPONSE');
        if (chatMsg) {
          setMessages(p => [...p, { role: 'assistant', content: chatMsg.params.message }]);
        }

        await executeActions(data.actions, plan);
      } else {
        setMessages(p => [...p, { role: 'assistant', content: data.message || 'Processing...' }]);
      }
    } catch (e) {
      addLog(`[ERROR] ${e.message}`);
      setMessages(p => [...p, { role: 'assistant', content: "Something went wrong." }]);
    } finally {
      setIsAiLoading(false);
    }
  }, [messages, isAiLoading, addLog, executeActions]);

  return {
    messages,
    isAiLoading,
    agentLogs,
    automationSteps,
    handleAiSend,
    clearAgentAssets: () => onSceneAssetsChange(() => []),
    resetAgentState: () => {
      setAgentLogs(['[SYSTEM] Reset.']);
      setAutomationSteps([]);
    },
  };
}