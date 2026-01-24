// @ts-nocheck
import { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAgentOrchestrator, type SceneAsset } from './useAgentOrchestrator';

// ═══════════════════════════════════════════════════════════════════════════
// SCENE MANAGER HOOK - Centralized scene state management
// Handles: Assets, Selection, Transforms, AI Generation, Export
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// UNIQUE ID GENERATOR - Prevents duplicate key errors in React
// ═══════════════════════════════════════════════════════════════════════════
const generateUniqueId = (prefix: string = 'asset'): string => {
  const timestamp = Date.now();
  const random = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
  return `${prefix}-${timestamp}-${random}`;
};

// ═══════════════════════════════════════════════════════════════════════════
// PROXY URL HELPER - Bypass CORS for external assets
// Includes fallback: stores direct URL for recovery if proxy fails
// ═══════════════════════════════════════════════════════════════════════════
const PROXY_DOMAINS = [
  'blockadelabs',
  'backend.blockadelabs.com',
  's3.amazonaws.com',
  'meshy.ai',
  'assets.meshy.ai',
  'cloudfront.net',
];

const proxyUrl = (url: string | null): string | null => {
  if (!url) return null;

  // Check if URL needs proxying
  const needsProxy = PROXY_DOMAINS.some(domain => url.includes(domain));

  if (needsProxy) {
    // Use single encoding to avoid double-encoding issues
    const encoded = encodeURIComponent(url);
    const proxied = `/api/proxy?url=${encoded}`;
    console.log(`[PROXY] Wrapping URL: ${url.substring(0, 50)}...`);
    return proxied;
  }

  return url;
};

// Direct URL extractor (for fallback if proxy fails)
const extractDirectUrl = (proxiedUrl: string | null): string | null => {
  if (!proxiedUrl) return null;
  if (proxiedUrl.startsWith('/api/proxy?url=')) {
    try {
      const urlParam = proxiedUrl.replace('/api/proxy?url=', '');
      return decodeURIComponent(urlParam);
    } catch {
      return null;
    }
  }
  return proxiedUrl;
};

export interface UseSceneManagerReturn {
  // Scene state
  sceneAssets: SceneAsset[];
  activeSelection: SceneAsset | null;
  setActiveSelection: (asset: SceneAsset | null) => void;

  // Transform
  transformMode: 'translate' | 'rotate' | 'scale';
  setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
  updateAssetTransform: (uid: string, transform: Partial<SceneAsset>) => void;
  handleResetTransform: () => void;

  // Panel state
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;

  // AI Generation
  aiPreviewData: { imagePath: string; prompt: string } | null;
  showPreviewCard: boolean;
  showSuccessNotification: boolean;
  isGeneratingAI: boolean;
  handleDeployAISkybox: () => void;
  discardAIPreview: () => void;

  // Export
  showExportPopup: boolean;
  exportUrl: string;
  handleExport: () => Promise<void>;
  closeExportPopup: () => void;

  // Asset management
  toggleAssetVisibility: (uid: string) => void;
  removeAsset: (uid: string) => void;

  // Agent
  agent: ReturnType<typeof useAgentOrchestrator>;

  // Mounting
  mounted: boolean;
}

export function useSceneManager(): UseSceneManagerReturn {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const initialPromptSent = useRef(false);

  // Scene state
  const [sceneAssets, setSceneAssets] = useState<SceneAsset[]>([]);
  const [activeSelection, setActiveSelection] = useState<SceneAsset | null>(null);

  // UI state
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Export state
  const [showExportPopup, setShowExportPopup] = useState(false);
  const [exportUrl, setExportUrl] = useState('');

  // AI Generation state
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiPreviewData, setAiPreviewData] = useState<{ imagePath: string; prompt: string } | null>(null);
  const [showPreviewCard, setShowPreviewCard] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // Handle AI Environment Generation with Preview Modal
  // Default: Shows preview modal for user to approve (Discard / Add to Scene)
  // autoApply=true: Immediately deploys without confirmation (disabled by default)
  // ═══════════════════════════════════════════════════════════════════════════
  const handleAIGeneration = useCallback(async (promptOverride?: string, autoApply: boolean = false) => {
    const prompt = promptOverride !== undefined ? promptOverride : aiPrompt;
    if (!prompt.trim() || isGeneratingAI) return;
    setIsGeneratingAI(true);
    console.log(`[SKYBOX GEN] Starting generation | Preview Mode: ${!autoApply} | Prompt: "${prompt.substring(0, 50)}..."`);

    try {
      // ═══════════════════════════════════════════════════════════════════════
      // STEP 1: Generate skybox with Blockade Labs
      // ═══════════════════════════════════════════════════════════════════════
      console.log(`[SKYBOX GEN] Step 1: Calling Blockade Labs API...`);
      const response = await fetch('/api/ai/generate-env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = 'Failed to generate skybox';
        try {
          const errorData = JSON.parse(errorText);
          errorMsg = errorData.error || errorMsg;
        } catch {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();

      const blockadeImageUrl = data.imagePath;
      const skyboxId = data.skyboxId;
      console.log(`[SKYBOX GEN] ✓ Blockade Labs generation complete`);

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 2: Fetch image in browser (client-side)
      // ═══════════════════════════════════════════════════════════════════════
      console.log(`[SKYBOX GEN] Step 2: Fetching image from Blockade Labs...`);
      const imageResponse = await fetch(blockadeImageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch skybox image: ${imageResponse.status} ${imageResponse.statusText}`);
      }

      const imageBlob = await imageResponse.blob();
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      console.log(`[SKYBOX GEN] ✓ Image fetched: ${imageBlob.size} bytes, type: ${contentType}`);

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 3: Upload directly to Supabase Storage (client-side, no 413 errors)
      // ═══════════════════════════════════════════════════════════════════════
      console.log(`[SKYBOX GEN] Step 3: Uploading directly to Supabase Storage...`);

      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Normalize content type
      const normalizedType = contentType === 'image/jpg' ? 'image/jpeg' : contentType;
      const extension = normalizedType.includes('png') ? 'png' : 'jpg';
      const fileName = `skybox-${skyboxId}-${Date.now()}.${extension}`;

      // Direct upload to Supabase Storage (bypasses Next.js API route)
      const imageBuffer = await imageBlob.arrayBuffer();
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('skyboxes')
        .upload(fileName, imageBuffer, {
          contentType: normalizedType,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Supabase upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('skyboxes')
        .getPublicUrl(fileName);

      const supabaseImageUrl = publicUrlData.publicUrl;
      console.log(`[SKYBOX GEN] ✓ Direct upload complete: ${supabaseImageUrl}`);

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 4: Apply to scene or show preview
      // ═══════════════════════════════════════════════════════════════════════
      if (autoApply) {
        console.log(`[SKYBOX GEN] Step 4: Auto-applying skybox to scene...`);

        // Create and deploy the skybox asset immediately
        const newEnvAsset: SceneAsset = {
          uid: generateUniqueId('ai-env'),
          name: prompt.substring(0, 30) + '...',
          type: 'environment-ai',
          thumbnail: supabaseImageUrl,
          imagePath: supabaseImageUrl,
          modelPath: null,
          visible: true,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: -130, z: 0 },
          scale: 1,
          bestFitScale: 1,
        };

        // Remove existing AI skyboxes and add new one (with duplicate check)
        setSceneAssets(prev => {
          // Prevent duplicate by checking uid
          if (prev.some(a => a.uid === newEnvAsset.uid)) return prev;
          const withoutOldSkyboxes = prev.filter(a => a.type !== 'environment-ai');
          return [...withoutOldSkyboxes, newEnvAsset];
        });

        setShowSuccessNotification(true);
        setTimeout(() => setShowSuccessNotification(false), 3000);
        console.log(`[SKYBOX GEN] ✓ Complete - Skybox added to scene`);
      } else {
        // ═══════════════════════════════════════════════════════════════════════
        // PREVIEW MODE (default): Show AI Preview modal for user confirmation
        // User can choose "Discard" or "Add to Scene"
        // ═══════════════════════════════════════════════════════════════════════
        console.log(`[SKYBOX GEN] Step 4: Showing preview modal...`);
        setAiPreviewData({ imagePath: supabaseImageUrl, prompt });
        setShowPreviewCard(true);
        setShowSuccessNotification(true);
        setTimeout(() => setShowSuccessNotification(false), 5000);
      }

      setAiPrompt("");
    } catch (error: any) {
      console.error(`[SKYBOX GEN] ✗ Failed: ${error.message}`);
      alert(error.message || 'Failed to generate AI environment.');
    } finally {
      setIsGeneratingAI(false);
    }
  }, [aiPrompt, isGeneratingAI]);

  // Agent Orchestrator
  const agent = useAgentOrchestrator({
    onSceneAssetsChange: setSceneAssets,
    onAiPromptChange: setAiPrompt,
    onAIGeneration: handleAIGeneration,
  });

  // Mount effect
  useEffect(() => { setMounted(true); }, []);

  // Handle initial prompt from URL or localStorage
  useEffect(() => {
    if (!mounted || initialPromptSent.current) return;
    const urlPrompt = searchParams.get('prompt');
    const storedPrompt = localStorage.getItem('initial_prompt');
    const promptToSend = urlPrompt || storedPrompt;
    if (promptToSend) {
      initialPromptSent.current = true;
      localStorage.removeItem('initial_prompt');
      setTimeout(() => agent.handleAiSend(promptToSend), 500);
    }
  }, [mounted, searchParams, agent]);

  // Update transform for any scene asset
  const updateAssetTransform = useCallback((uid: string, transform: Partial<SceneAsset>) => {
    setSceneAssets(prev => prev.map(asset => asset.uid === uid ? { ...asset, ...transform } : asset));
    if (activeSelection?.uid === uid) {
      setActiveSelection(prev => prev ? { ...prev, ...transform } : prev);
    }
  }, [activeSelection]);

  // Deploy AI skybox to scene
  const handleDeployAISkybox = useCallback(() => {
    if (!aiPreviewData) return;
    const newEnvAsset: SceneAsset = {
      uid: generateUniqueId('ai-env'),
      name: aiPreviewData.prompt.substring(0, 30) + '...',
      type: 'environment-ai',
      thumbnail: aiPreviewData.imagePath,
      imagePath: aiPreviewData.imagePath,
      modelPath: null,
      visible: true,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: -130, z: 0 },
      scale: 1,
      bestFitScale: 1,
    };
    setSceneAssets(prev => {
      // Prevent duplicate by checking uid
      if (prev.some(a => a.uid === newEnvAsset.uid)) return prev;
      return [...prev, newEnvAsset];
    });
    setActiveSelection(newEnvAsset);
    setShowPreviewCard(false);
    setAiPreviewData(null);
  }, [aiPreviewData]);

  // Discard AI preview
  const discardAIPreview = useCallback(() => {
    setAiPreviewData(null);
    setShowPreviewCard(false);
  }, []);

  // Serialize scene to JSON
  const serializeScene = useCallback(() => {
    const envAsset = sceneAssets.find(a => a.type?.includes('environment'));
    const environment = envAsset ? {
      id: envAsset.uid,
      name: envAsset.name,
      thumb: envAsset.thumbnail,
      modelPath: envAsset.modelPath,
      imagePath: envAsset.imagePath,
      type: envAsset.type,
      position: envAsset.position,
      rotation: envAsset.rotation,
      scale: envAsset.scale
    } : null;
    const models = sceneAssets
      .filter(a => a.type === 'model' && a.visible !== false)
      .map(a => ({
        uid: a.uid,
        name: a.name,
        modelPath: a.modelPath,
        position: a.position,
        rotation: a.rotation,
        scale: a.scale,
        interactionFX: a.interactionFX,
        physics: a.physics
      }));
    return JSON.stringify({ environment, models, timestamp: new Date().toISOString() });
  }, [sceneAssets]);

  // Handle export
  const handleExport = useCallback(async () => {
    try {
      const sceneData = serializeScene();
      const response = await fetch('/api/scenes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: sceneData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save scene');
      setExportUrl(`${window.location.origin}/view/${data.id}`);
      setShowExportPopup(true);
    } catch (error) {
      alert('Failed to export scene.');
    }
  }, [serializeScene]);

  // Reset transform handler
  const handleResetTransform = useCallback(() => {
    if (!activeSelection) return;
    const isEnv = activeSelection.type?.includes('environment');
    updateAssetTransform(activeSelection.uid, {
      position: isEnv ? { x: 0, y: 0, z: 0 } : { x: 0, y: 1, z: -3 },
      rotation: activeSelection.type === 'environment-ai' ? { x: 0, y: -130, z: 0 } : { x: 0, y: 0, z: 0 },
      scale: activeSelection.bestFitScale || 1
    });
  }, [activeSelection, updateAssetTransform]);

  // Toggle asset visibility
  const toggleAssetVisibility = useCallback((uid: string) => {
    setSceneAssets(prev => prev.map(a => a.uid === uid ? { ...a, visible: !a.visible } : a));
  }, []);

  // Remove asset
  const removeAsset = useCallback((uid: string) => {
    setSceneAssets(prev => prev.filter(a => a.uid !== uid));
    if (activeSelection?.uid === uid) setActiveSelection(null);
  }, [activeSelection]);

  return {
    // Scene state
    sceneAssets,
    activeSelection,
    setActiveSelection,

    // Transform
    transformMode,
    setTransformMode,
    updateAssetTransform,
    handleResetTransform,

    // Panel state
    leftPanelOpen,
    rightPanelOpen,
    toggleLeftPanel: useCallback(() => setLeftPanelOpen(p => !p), []),
    toggleRightPanel: useCallback(() => setRightPanelOpen(p => !p), []),

    // AI Generation
    aiPreviewData,
    showPreviewCard,
    showSuccessNotification,
    isGeneratingAI,
    handleDeployAISkybox,
    discardAIPreview,

    // Export
    showExportPopup,
    exportUrl,
    handleExport,
    closeExportPopup: useCallback(() => setShowExportPopup(false), []),

    // Asset management
    toggleAssetVisibility,
    removeAsset,

    // Agent
    agent,

    // Mounting
    mounted,
  };
}

export type { SceneAsset };
