// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import dynamic from 'next/dynamic';
import {
  Atom, Box, ChevronRight, ChevronLeft, Upload, Sparkles, CheckCircle2,
  Search, Loader2, MousePointerClick, Mountain, Brain, RefreshCcw,
  ChevronDown, Check, X, Plus, Zap, Settings2, Eye, Move, Maximize, GripVertical,
  Layers, Trash2, Info, Send
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "../../components/Navigation";
import { QRCodeSVG } from 'qrcode.react';

// ✅ 核心修复：隔离 A-Frame 渲染，解决水合与黑屏
const SceneView = dynamic(() => import('./Scene'), { 
  ssr: false,
  loading: () => <div className="flex-1 bg-black flex items-center justify-center text-gray-700 font-mono text-[10px] tracking-widest uppercase">Initializing Unity Core...</div>
});

// ----------------------------------------------------------------------
// 模拟数据
// ----------------------------------------------------------------------
const INTERNAL_ENVIRONMENTS = [
  { id: 'classroom', name: 'Classroom', thumb: '/classroom.jpg', type: 'Architecture', modelPath: '/environemnt/classroom.glb' },
  { id: 'forest', name: 'Low Poly Forest', thumb: 'https://placehold.co/400x300/047857/ffffff?text=Forest', type: 'Nature', modelPath: '/environemnt/low_poly_forest.glb' },
];

const INTERNAL_ASSETS = [
  { id: 'animal_cell', name: 'Animal Cell', thumb: '/bio.png', tags: ['Biology'], modelPath: '/models/animal_cell.glb' },
  { id: 'plant_cell', name: 'Plant Cell', thumb: '/ecosystems.png', tags: ['Biology'], modelPath: '/models/plant_cell.glb' },
  { id: 'microscope', name: 'Microscope', thumb: 'https://placehold.co/400x300/1e293b/10b981?text=Microscope', tags: ['Equipment'], modelPath: '/models/microscope.glb' },
];

export default function EnvironmentDesignPage() {
  const [mounted, setMounted] = useState(false);
  const [wizardStep, setWizardStep] = useState('env_selection'); // env_selection | asset_selection | editor
  const [openSection, setOpenSection] = useState('internal');
  
  // Unified scene assets (environments + models)
  const [sceneAssets, setSceneAssets] = useState([]);
  const [activeSelection, setActiveSelection] = useState(null);

  // Sync activeEditingAsset with activeSelection for backwards compatibility
  const activeEditingAsset = activeSelection;
  const setActiveEditingAsset = setActiveSelection;

  // Temporary selections during wizard
  const [selectedEnv, setSelectedEnv] = useState(null);
  const [selectedModels, setSelectedModels] = useState([]); 
  
  // ✅ 核心修复：分离搜索状态，解决打字中断焦点丢失问题
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [downloadingModel, setDownloadingModel] = useState(null); // Track which model is downloading
  const [transformMode, setTransformMode] = useState('translate'); // translate | rotate | scale | drag
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExportPopup, setShowExportPopup] = useState(false);
  const [exportUrl, setExportUrl] = useState('');
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // AI 聊天状态
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your AI Design Assistant. Ready to build something epic?" }
  ]);
  const [aiInput, setAiInput] = useState("");

  // AI Environment Generation
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSkyboxPath, setAiSkyboxPath] = useState<string | null>(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [aiPreviewData, setAiPreviewData] = useState<{ imagePath: string; prompt: string } | null>(null);
  const [showPreviewCard, setShowPreviewCard] = useState(false);

  // AI Model Generation (Meshy.ai)
  const [isGeneratingModel, setIsGeneratingModel] = useState(false);
  const [aiModelPreview, setAiModelPreview] = useState<{ modelUrl: string; thumbnail: string | null; prompt: string } | null>(null);
  const [showModelPreviewCard, setShowModelPreviewCard] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEnvSelect = (env) => {
    setSelectedEnv({
      id: env.id || env.uid,
      name: env.name,
      thumb: env.thumb || env.thumbnail,
      modelPath: env.modelPath || null,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      bestFitScale: 1 // Will be calculated based on bounding box
    });
  };

  const toggleModelSelection = (model) => {
    const modelId = model.uid || model.id;
    setSelectedModels(prev => {
      const isExisting = prev.find(m => m.uid === modelId);
      if (isExisting) return prev.filter(m => m.uid !== modelId);
      return [...prev, {
        uid: modelId,
        name: model.name,
        type: 'model', // ✅ Explicitly set type for Scene.tsx rendering
        thumbnail: model.thumbnail || model.thumb,
        modelPath: model.modelPath || null,
        visible: true, // ✅ Ensure visible by default
        placed: false,
        position: { x: 0, y: 1, z: -3 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1,
        interactionFX: {
          grabbable: false,
          glowPulse: false,
          collisionTrigger: false
        }
      }];
    });
  };

  // Update transform for any scene asset (model or environment)
  const updateAssetTransform = (uid, transform) => {
    setSceneAssets(prev => prev.map(asset =>
      asset.uid === uid ? { ...asset, ...transform } : asset
    ));
    // Also update activeSelection if it's the same asset
    if (activeSelection?.uid === uid) {
      setActiveSelection(prev => ({ ...prev, ...transform }));
    }
  };

  // Legacy support for wizard mode
  const updateModelTransform = (uid, transform) => {
    setSelectedModels(prev => prev.map(m =>
      m.uid === uid ? { ...m, ...transform } : m
    ));
  };

  const updateEnvironmentTransform = (transform) => {
    setSelectedEnv(prev => prev ? { ...prev, ...transform } : prev);
  };

  // Calculate best fit scale based on model bounding box
  const calculateBestFitScale = (boundingBox) => {
    if (!boundingBox) return 1.0;

    // Target size for environment in VR space (in meters)
    const targetSize = 10.0;

    // Get the maximum dimension of the bounding box
    const size = boundingBox.getSize(new window.THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);

    // Calculate scale to fit target size
    const bestFit = maxDimension > 0 ? targetSize / maxDimension : 1.0;

    return Math.max(0.0001, Math.min(100, bestFit)); // Clamp to valid range
  };

  // Update best fit scale for environment
  const updateBestFitScale = (scale) => {
    setSelectedEnv(prev => prev ? { ...prev, bestFitScale: scale } : prev);
  };

  const handleSearch = async (query) => {
    if (!query) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/assets/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      // ✅ 核心修复：深度定位 Sketchfab 缩略图路径
      const optimizedData = data.map(item => ({
        ...item,
        thumbnail: item.thumbnails?.images?.[0]?.url || item.thumbnail || '/bridge.png'
      }));
      setSearchResults(Array.isArray(optimizedData) ? optimizedData.slice(0, 8) : []);
    } catch (error) { setSearchResults([]); } finally { setIsSearching(false); }
  };

  const handleDownloadAndImport = async (model) => {
    if (downloadingModel) return; // Prevent multiple imports

    setDownloadingModel(model.uid);

    try {
      // Call the one-click import API
      const response = await fetch('/api/assets/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: model.uid,
          name: model.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import model');
      }

      // Check if importing environment or asset
      if (wizardStep === 'env_selection') {
        // Update selectedEnv for environment imports
        setSelectedEnv({
          id: model.uid,
          name: data.modelName || model.name,
          thumb: model.thumbnail,
          modelPath: data.modelPath, // Local path: /imports/[uid]/model.glb
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: 1,
          bestFitScale: 1 // Will be calculated based on bounding box
        });
      } else {
        // Add to selectedModels for asset imports
        const newModel = {
          uid: model.uid,
          name: data.modelName || model.name,
          type: 'model', // ✅ Explicitly set type for Scene.tsx rendering
          thumbnail: model.thumbnail,
          modelPath: data.modelPath, // Local path: /imports/[uid]/model.glb
          visible: true, // ✅ Ensure visible by default
          placed: false,
          position: { x: 0, y: 1, z: -3 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: 1,
          interactionFX: {
            grabbable: false,
            glowPulse: false,
            collisionTrigger: false
          }
        };

        setSelectedModels(prev => {
          const exists = prev.find(m => m.uid === model.uid);
          if (exists) return prev;
          return [...prev, newModel];
        });
      }

      // Model imported successfully

    } catch (error) {
      console.error('Import error:', error);
      alert(error.message || 'Failed to import model. Please try again.');
    } finally {
      setDownloadingModel(null);
    }
  };

  const handleAiSend = (inputOverride?: string) => {
    const input = inputOverride !== undefined ? inputOverride : aiInput;
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', content: input }]);
    setAiInput("");
  };

  // Handle AI Environment Generation
  const handleAIGeneration = async (promptOverride?: string) => {
    const prompt = promptOverride !== undefined ? promptOverride : aiPrompt;
    if (!prompt.trim() || isGeneratingAI) return;

    setIsGeneratingAI(true);

    // Immediately collapse both sidebars for immersive preview
    setLeftPanelOpen(false);
    setRightPanelOpen(false);

    try {
      const response = await fetch('/api/ai/generate-env', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate AI environment');
      }

      // Store preview data instead of immediately deploying
      setAiPreviewData({
        imagePath: data.imagePath,
        prompt: prompt,
      });

      // Show preview card
      setShowPreviewCard(true);

      // Show success notification
      setShowSuccessNotification(true);
      setTimeout(() => setShowSuccessNotification(false), 5000);

      // Clear the prompt
      setAiPrompt("");

    } catch (error: any) {
      console.error('AI Generation error:', error);
      alert(error.message || 'Failed to generate AI environment. Please try again.');

      // Reopen panels on error
      setLeftPanelOpen(true);
      setRightPanelOpen(true);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Deploy AI skybox to scene as an asset
  const handleDeployAISkybox = () => {
    if (aiPreviewData) {
      const newEnvAsset = {
        uid: `ai-env-${Date.now()}`,
        name: aiPreviewData.prompt.substring(0, 30) + '...',
        type: 'environment-ai',
        thumbnail: aiPreviewData.imagePath,
        imagePath: aiPreviewData.imagePath,
        modelPath: null, // AI skyboxes don't have modelPath
        visible: true,
        placed: true,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: -130, z: 0 },
        scale: 1,
        bestFitScale: 1, // For reset functionality
      };

      // Add to scene assets
      setSceneAssets(prev => [...prev, newEnvAsset]);

      // Automatically select the new AI environment for editing
      setActiveSelection(newEnvAsset);

      setShowPreviewCard(false);
      setAiPreviewData(null);

      // Reopen panels after deploying
      setLeftPanelOpen(true);
      setRightPanelOpen(true);
    }
  };

  // Discard AI preview
  const handleDiscardAIPreview = () => {
    setAiPreviewData(null);
    setShowPreviewCard(false);
    setLeftPanelOpen(true);
    setRightPanelOpen(true);
  };

  // Handle AI Model Generation (Meshy.ai)
  const handleAIModelGeneration = async (promptOverride?: string) => {
    const prompt = promptOverride !== undefined ? promptOverride : aiPrompt;
    if (!prompt.trim() || isGeneratingModel) return;

    setIsGeneratingModel(true);
    setLeftPanelOpen(false);
    setRightPanelOpen(false);

    try {
      // Step 1: 发起任务 (默认为预览模式)
      const response = await fetch('/api/ai/generate-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to start AI generation');

      const taskId = data.taskId;
      let attempts = 0;
      const maxAttempts = 120;

      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await fetch(`/api/ai/model-status?taskId=${taskId}`);
          const statusData = await statusRes.json();

          if (!statusRes.ok) {
            clearInterval(pollInterval);
            throw new Error('Status poll failed');
          }

          if (statusData.status === 'SUCCEEDED') {
            clearInterval(pollInterval);

            // ✅ 核心修复：使用代理 URL 解决跨域，并确保材质路径正确
            const rawModelUrl = statusData.modelUrl;
            const proxiedUrl = `/api/ai/proxy-model?url=${encodeURIComponent(rawModelUrl)}`;

            const newAiModel = {
              uid: `ai-model-${Date.now()}`,
              name: prompt.substring(0, 20) + '...',
              type: 'model',
              thumbnail: statusData.thumbnail || '/bio.png',
              modelPath: proxiedUrl, // ✅ 使用代理路径加载
              visible: true,
              placed: true,
              position: { x: 0, y: 1, z: -3 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: 1,
              bestFitScale: 1,
              interactionFX: { grabbable: true, glowPulse: false, collisionTrigger: false }
            };

            // 资产入库
            setSceneAssets(prev => [...prev, newAiModel]);
            setActiveSelection(newAiModel);
            
            // 更新预览状态，为接下来的材质 Refine 做准备
            setAiModelPreview({
              taskId: taskId,
              modelUrl: proxiedUrl,
              thumbnail: statusData.thumbnail,
              prompt: prompt,
              status: 'PREVIEW_DONE' // 标记预览完成，现在是白模
            });

            setIsGeneratingModel(false);
            setAiPrompt(""); 
            setLeftPanelOpen(true);
            setRightPanelOpen(true);
            
            console.log('✅ AI Preview Model Loaded. Ready for Texture Refinement.');

          } else if (statusData.status === 'FAILED') {
            clearInterval(pollInterval);
            setIsGeneratingModel(false);
            setLeftPanelOpen(true);
            setRightPanelOpen(true);
            alert('Generation Failed');
          }
        } catch (pollErr) {
          console.error('Polling error:', pollErr);
        }
      }, 5000);

    } catch (error: any) {
      alert(error.message);
      setIsGeneratingModel(false);
      setLeftPanelOpen(true);
      setRightPanelOpen(true);
    }
  };

  // Deploy AI model to scene as an asset
  const handleDeployAIModel = () => {
    if (aiModelPreview) {
      const newModelAsset = {
        uid: `ai-model-${Date.now()}`,
        name: aiModelPreview.prompt.substring(0, 30) + '...',
        type: 'model',
        thumbnail: aiModelPreview.thumbnail || '/bio.png',
        modelPath: aiModelPreview.modelUrl,
        visible: true,
        placed: true,
        position: { x: 0, y: 1, z: -3 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1,
        bestFitScale: 1, // For reset functionality
        interactionFX: {
          grabbable: false,
          glowPulse: false,
          collisionTrigger: false,
        },
      };

      // Add to scene assets
      setSceneAssets(prev => [...prev, newModelAsset]);

      // Automatically select the new AI model for editing
      setActiveSelection(newModelAsset);

      setShowModelPreviewCard(false);
      setAiModelPreview(null);

      // Reopen panels after deploying
      setLeftPanelOpen(true);
      setRightPanelOpen(true);
    }
  };

  // Discard AI model preview
  const handleDiscardAIModel = () => {
    setAiModelPreview(null);
    setShowModelPreviewCard(false);
    setLeftPanelOpen(true);
    setRightPanelOpen(true);
  };

  // Add 3D environment to scene assets
  const handleAddEnvironmentToScene = () => {
    if (selectedEnv) {
      const newEnvAsset = {
        uid: `env-${selectedEnv.id}-${Date.now()}`,
        name: selectedEnv.name,
        type: 'environment-3d',
        thumbnail: selectedEnv.thumb,
        modelPath: selectedEnv.modelPath,
        visible: true,
        position: selectedEnv.position || { x: 0, y: 0, z: 0 },
        rotation: selectedEnv.rotation || { x: 0, y: 0, z: 0 },
        scale: selectedEnv.scale || 1,
        bestFitScale: selectedEnv.bestFitScale || 1,
      };

      // Add to scene assets
      setSceneAssets(prev => [...prev, newEnvAsset]);

      // Automatically select the new 3D environment for editing
      setActiveSelection(newEnvAsset);

      // Don't clear selectedEnv yet - user might want to add it again
    }
  };

  // Toggle visibility of an asset
  const toggleAssetVisibility = (uid) => {
    setSceneAssets(prev => prev.map(asset =>
      asset.uid === uid ? { ...asset, visible: !asset.visible } : asset
    ));
  };

  // Remove asset from scene
  const removeAsset = (uid) => {
    setSceneAssets(prev => prev.filter(asset => asset.uid !== uid));
    if (activeSelection?.uid === uid) {
      setActiveSelection(null);
    }
  };

  // Serialize scene data to JSON - reads from live A-Frame DOM
  const serializeScene = () => {
    // Helper to parse A-Frame position/rotation/scale strings or objects
    const parseVec3 = (val) => {
      if (!val) return { x: 0, y: 0, z: 0 };
      if (typeof val === 'object') return { x: val.x || 0, y: val.y || 0, z: val.z || 0 };
      const parts = String(val).split(' ').map(Number);
      return { x: parts[0] || 0, y: parts[1] || 0, z: parts[2] || 0 };
    };

    const parseScale = (val) => {
      if (!val) return 1;
      if (typeof val === 'number') return val;
      if (typeof val === 'object') return val.x || 1;
      const parts = String(val).split(' ').map(Number);
      return parts[0] || 1;
    };

    // Read environment from DOM or fall back to state
    let environment = null;
    const envAsset = sceneAssets.find(a => a.type === 'environment-3d' || a.type === 'environment-ai');
    if (envAsset) {
      const envEl = document.querySelector(`[data-uid="${envAsset.uid}"]`);
      if (envEl) {
        const pos = envEl.getAttribute('position');
        const rot = envEl.getAttribute('rotation');
        const scale = envEl.getAttribute('scale');
        environment = {
          id: envAsset.id || envAsset.uid,
          name: envAsset.name,
          thumb: envAsset.thumb || envAsset.thumbnail,
          modelPath: envAsset.modelPath || null,
          imagePath: envAsset.imagePath || null,
          type: envAsset.type,
          position: parseVec3(pos),
          rotation: parseVec3(rot),
          scale: parseScale(scale)
        };
      } else {
        // Fall back to state
        environment = {
          id: envAsset.id || envAsset.uid,
          name: envAsset.name,
          thumb: envAsset.thumb || envAsset.thumbnail,
          modelPath: envAsset.modelPath || null,
          imagePath: envAsset.imagePath || null,
          type: envAsset.type,
          position: envAsset.position || { x: 0, y: 0, z: 0 },
          rotation: envAsset.rotation || { x: 0, y: 0, z: 0 },
          scale: envAsset.scale || 1
        };
      }
    } else if (selectedEnv) {
      // Fall back to wizard state if no sceneAssets environment
      environment = {
        ...selectedEnv,
        position: selectedEnv.position || { x: 0, y: 0, z: 0 },
        rotation: selectedEnv.rotation || { x: 0, y: 0, z: 0 },
        scale: selectedEnv.scale || 1
      };
    }

    // Read models from DOM
    const models = [];
    const modelAssets = sceneAssets.filter(a => a.type === 'model' && a.visible !== false);

    for (const asset of modelAssets) {
      const el = document.querySelector(`[data-uid="${asset.uid}"]`);
      if (el) {
        const pos = el.getAttribute('position');
        const rot = el.getAttribute('rotation');
        const scale = el.getAttribute('scale');

        // Check for interaction FX components on the element
        const hasGrabbable = el.hasAttribute('grabbable');
        const hasGlowPulse = el.hasAttribute('glow-pulse');
        const hasCollisionTrigger = el.hasAttribute('collision-trigger');

        // Get model path from nested gltf-model or from asset state
        const gltfEl = el.querySelector('a-gltf-model');
        const modelPath = gltfEl?.getAttribute('src') || asset.modelPath;

        models.push({
          uid: asset.uid,
          name: asset.name || el.getAttribute('data-name') || 'Untitled',
          modelPath: modelPath,
          position: parseVec3(pos),
          rotation: parseVec3(rot),
          scale: parseScale(scale),
          interactionFX: {
            grabbable: hasGrabbable || asset.interactionFX?.grabbable || false,
            glowPulse: hasGlowPulse || asset.interactionFX?.glowPulse || false,
            collisionTrigger: hasCollisionTrigger || asset.interactionFX?.collisionTrigger || false
          }
        });
      } else {
        // Fall back to state if DOM element not found
        models.push({
          uid: asset.uid,
          name: asset.name,
          modelPath: asset.modelPath,
          position: asset.position || { x: 0, y: 1, z: -3 },
          rotation: asset.rotation || { x: 0, y: 0, z: 0 },
          scale: asset.scale || 1,
          interactionFX: asset.interactionFX || {
            grabbable: false,
            glowPulse: false,
            collisionTrigger: false
          }
        });
      }
    }

    // Also include placed models from wizard state (for backwards compatibility)
    const placedWizardModels = selectedModels.filter(m => m.placed && !modelAssets.find(a => a.uid === m.uid));
    for (const m of placedWizardModels) {
      const el = document.querySelector(`[data-uid="${m.uid}"]`);
      if (el) {
        const pos = el.getAttribute('position');
        const rot = el.getAttribute('rotation');
        const scale = el.getAttribute('scale');
        const gltfEl = el.querySelector('a-gltf-model');
        const modelPath = gltfEl?.getAttribute('src') || m.modelPath;

        models.push({
          uid: m.uid,
          name: m.name,
          modelPath: modelPath,
          position: parseVec3(pos),
          rotation: parseVec3(rot),
          scale: parseScale(scale),
          interactionFX: {
            grabbable: el.hasAttribute('grabbable') || m.interactionFX?.grabbable || false,
            glowPulse: el.hasAttribute('glow-pulse') || m.interactionFX?.glowPulse || false,
            collisionTrigger: el.hasAttribute('collision-trigger') || m.interactionFX?.collisionTrigger || false
          }
        });
      } else {
        models.push({
          uid: m.uid,
          name: m.name,
          modelPath: m.modelPath,
          position: m.position,
          rotation: m.rotation,
          scale: m.scale,
          interactionFX: m.interactionFX
        });
      }
    }

    const sceneData = {
      environment,
      models,
      timestamp: new Date().toISOString()
    };

    console.log('Serialized scene from DOM:', sceneData);
    return JSON.stringify(sceneData);
  };

  // Handle export to VR
  const handleExport = async () => {
    try {
      const sceneJson = serializeScene();
      const sceneData = JSON.parse(sceneJson);

      // Call save API
      const response = await fetch('/api/scenes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sceneData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save scene');
      }

      // Generate short URL
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/view/${data.id}`;
      setExportUrl(url);
      setShowExportPopup(true);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export scene. Please try again.');
    }
  };

  // Copy URL to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(exportUrl);
  };

  if (!mounted) return null;

  // ✅ 核心修复：手风琴逻辑。使用 CSS grid 实现平滑高度切换，解决“闪现”和“卡顿”
  const AccordionSection = ({ id, title, subtitle, color, icon: Icon, children }) => {
    const isOpen = openSection === id;
    return (
      <div className={`border rounded-[2.5rem] transition-all duration-300 mb-4 ${isOpen ? 'bg-white shadow-xl ring-1 ring-black/5 flex-1' : 'bg-gray-50/50'}`}>
        <button onClick={() => setOpenSection(id)} className="w-full p-6 flex items-center justify-between group outline-none">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl transition-colors ${isOpen ? color + ' text-white' : 'bg-white text-gray-400'}`}><Icon className="w-6 h-6" /></div>
            <div className="text-left"><h3 className={`font-black uppercase tracking-widest text-[10px] ${isOpen ? 'text-gray-900' : 'text-gray-400'}`}>{title}</h3><p className="text-[9px] text-gray-400 uppercase font-black tracking-tighter">{subtitle}</p></div>
          </div>
          <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-gray-900' : 'text-gray-300'}`} />
        </button>
        <div className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <div className="p-8 pt-0 max-h-[42vh] overflow-y-auto custom-scrollbar">{children}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen bg-[#F8F9FB] relative overflow-hidden flex flex-col text-gray-800">
      <Navigation />

      <AnimatePresence mode="wait">
        {(wizardStep === 'env_selection' || wizardStep === 'asset_selection') && (
          <motion.div 
            key="wizard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#F8F9FB] pt-[90px] pb-10 px-6 md:px-20 overflow-y-auto"
          >
            <div className="max-w-5xl mx-auto min-h-full flex flex-col pb-40">
              <header className="mb-10 text-center">
                <h1 className="text-4xl font-black tracking-tighter italic uppercase underline decoration-emerald-500">
                  {wizardStep === 'env_selection' ? "01 Environment" : "02 Teaching Assets"}
                </h1>
                <p className="text-gray-500 mt-2 font-medium tracking-tight">Personalized selection for your XR lesson.</p>
              </header>

              <div className="flex-1 flex flex-col">
                <AccordionSection id="internal" title="Level 1: Internal" subtitle="Standard Library" color="bg-emerald-600" icon={Box}>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {(wizardStep === 'env_selection' ? INTERNAL_ENVIRONMENTS : INTERNAL_ASSETS).map(item => {
                      const isSelected = wizardStep === 'env_selection' ? selectedEnv?.id === item.id : selectedModels.find(m => m.uid === item.id);
                      return (
                        <div key={item.id} onClick={() => wizardStep === 'env_selection' ? handleEnvSelect(item) : toggleModelSelection(item)} className={`relative p-4 rounded-[2rem] border-2 transition-all cursor-pointer ${isSelected ? 'border-emerald-500 bg-emerald-50/50 shadow-md scale-95' : 'border-gray-50 bg-gray-50 hover:border-emerald-200'}`}>
                          <img src={item.thumb} className="w-full h-28 object-cover rounded-2xl mb-3 shadow-sm" />
                          <p className="font-bold text-center text-[10px] uppercase tracking-tighter">{item.name}</p>
                          {isSelected && <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1 shadow-lg"><Check className="w-3 h-3" /></div>}
                        </div>
                      );
                    })}
                  </div>
                </AccordionSection>

                <AccordionSection id="marketplace" title="Level 2: Marketplace" subtitle="Sketchfab Library" color="bg-blue-600" icon={Search}>
                  <div className="space-y-4">
                    <div className="flex gap-2 mb-4">
                      {/* ✅ 核心修复：使用 defaultValue 和 onBlur 解决搜索框打字卡顿 */}
                      <input 
                        className="flex-1 bg-gray-100 border-none rounded-2xl px-6 text-sm outline-none focus:ring-2 ring-blue-100 shadow-inner" 
                        defaultValue={searchQuery}
                        onBlur={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch(e.target.value)}
                        placeholder="Search millions of 3D models..." 
                      />
                      <button onClick={() => handleSearch(searchQuery)} className="p-4 bg-gray-900 text-white rounded-2xl transition-transform active:scale-90 shadow-xl">
                        {isSearching ? <Loader2 className="animate-spin" /> : <Search className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {searchResults.map(m => {
                        const isSelected = wizardStep === 'env_selection' ? selectedEnv?.id === m.uid : selectedModels.find(sm => sm.uid === m.uid);
                        const isDownloading = downloadingModel === m.uid;
                        return (
                          <div key={m.uid} className={`relative p-3 rounded-2xl border-2 transition-all ${isSelected ? 'border-blue-500 bg-blue-50/50 shadow-md' : 'border-gray-50 bg-gray-50'}`}>
                            <img src={m.thumbnail} className="w-full h-20 object-cover rounded-xl mb-2 shadow-sm" />
                            <p className="text-[10px] font-bold line-clamp-1 text-center tracking-tighter uppercase mb-2">{m.name}</p>

                            {/* Import button for both environments and assets */}
                            <button
                              onClick={() => handleDownloadAndImport(m)}
                              disabled={isDownloading || isSelected}
                              className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                isSelected
                                  ? 'bg-emerald-500 text-white cursor-default'
                                  : isDownloading
                                  ? 'bg-blue-400 text-white cursor-wait'
                                  : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                              }`}
                            >
                              {isDownloading ? (
                                <span className="flex items-center justify-center gap-2">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Importing...
                                </span>
                              ) : isSelected ? (
                                <span className="flex items-center justify-center gap-1">
                                  <Check className="w-3 h-3" />
                                  Imported
                                </span>
                              ) : (
                                wizardStep === 'env_selection' ? 'Import Environment' : 'Import Model'
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </AccordionSection>

                <AccordionSection id="ai" title="Level 3: AI Creative" subtitle="Rodin & Skybox" color="bg-purple-600" icon={Sparkles}>
                  <div className="p-6 bg-purple-50/50 rounded-3xl space-y-4 text-center">
                    {wizardStep === 'asset_selection' && (
                      <div className="border-2 border-dashed border-purple-200 p-8 rounded-[2rem] text-center bg-white/50 cursor-pointer hover:bg-white transition-colors group">
                        <Upload className="mx-auto text-purple-300 mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-[10px] font-black uppercase text-purple-900 tracking-widest">Upload Reference Image (AI Rodin)</p>
                      </div>
                    )}
                    {/* ✅ Performance Fix: Use defaultValue to avoid re-rendering 3D scene on every keystroke */}
                    <textarea
                      key={`ai-prompt-${wizardStep}-${isGeneratingAI || isGeneratingModel ? 'generating' : 'idle'}`}
                      defaultValue={aiPrompt}
                      onBlur={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        // Ctrl+Enter or Cmd+Enter to trigger generation
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                          e.preventDefault();
                          const textarea = e.currentTarget;
                          const currentPrompt = textarea.value || '';
                          setAiPrompt(currentPrompt);
                          if (wizardStep === 'env_selection') {
                            handleAIGeneration(currentPrompt);
                          } else {
                            handleAIModelGeneration(currentPrompt);
                          }
                        }
                      }}
                      disabled={isGeneratingAI || isGeneratingModel}
                      className="w-full bg-white border-none rounded-2xl p-5 text-xs resize-none shadow-sm outline-none focus:ring-2 ring-purple-100 disabled:opacity-50"
                      rows={3}
                      placeholder={wizardStep === 'env_selection' ? "e.g., A futuristic sci-fi laboratory with holographic displays and neon lighting... (Ctrl+Enter to generate)" : "e.g., A realistic DNA double helix molecule with detailed base pairs... (Ctrl+Enter to generate)"}
                    />
                    <button
                      onClick={(e) => {
                        // Get current textarea value and pass directly to avoid state timing issues
                        const textarea = e.currentTarget.parentElement?.querySelector('textarea');
                        const currentPrompt = textarea?.value || '';
                        setAiPrompt(currentPrompt); // Update state for future use

                        // Call appropriate handler based on wizard step
                        if (wizardStep === 'env_selection') {
                          handleAIGeneration(currentPrompt);
                        } else {
                          handleAIModelGeneration(currentPrompt);
                        }
                      }}
                      disabled={isGeneratingAI || isGeneratingModel}
                      className="w-full bg-purple-600 disabled:bg-gray-300 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl shadow-purple-200 transition-transform active:scale-95 tracking-widest flex items-center justify-center gap-2"
                    >
                      {isGeneratingAI ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating Environment...
                        </>
                      ) : isGeneratingModel ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating 3D Model...
                        </>
                      ) : (
                        wizardStep === 'env_selection' ? 'Generate AI Environment' : 'Generate AI Model'
                      )}
                    </button>
                  </div>
                </AccordionSection>
              </div>

              {/* 底部导航栏 */}
              <footer className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl bg-white/90 backdrop-blur-md p-6 rounded-[2.5rem] border shadow-2xl flex justify-between items-center z-[110]">
                <div className="flex gap-8 items-center overflow-hidden">
                  <div className="flex flex-col min-w-[100px]">
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Selected Env</span>
                    {selectedEnv ? <div className="flex items-center gap-2 mt-0.5"><img src={selectedEnv.thumb} className="w-7 h-7 rounded-lg object-cover shadow-sm border border-gray-100" /><span className="text-xs font-bold truncate w-24 tracking-tighter">{selectedEnv.name}</span></div> : <span className="text-xs text-gray-300 italic">None Selected</span>}
                  </div>
                  {wizardStep === 'asset_selection' && (
                    <div className="flex flex-col border-l border-gray-100 pl-8">
                      <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Assets ({selectedModels.length})</span>
                      <div className="flex -space-x-2 mt-0.5">{selectedModels.map(m => <img key={m.uid} src={m.thumbnail} className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-md" />)}</div>
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  {wizardStep === 'asset_selection' && <button onClick={() => setWizardStep('env_selection')} className="text-xs font-bold text-gray-400 uppercase px-4 tracking-widest hover:text-black">Back</button>}
                  <button onClick={() => {
                    if (wizardStep === 'env_selection') {
                      handleAddEnvironmentToScene();
                      setWizardStep('asset_selection');
                    } else {
                      // Transfer all selected models to sceneAssets when entering editor
                      const modelAssets = selectedModels.map(model => ({
                        ...model,
                        type: 'model',
                        visible: true,
                        placed: true,
                      }));

                      // Add all models to scene assets
                      setSceneAssets(prev => [...prev, ...modelAssets]);

                      // Auto-select the first model
                      if (modelAssets.length > 0) {
                        setActiveSelection(modelAssets[0]);
                      }

                      setWizardStep('editor');
                    }
                  }} disabled={wizardStep === 'env_selection' ? !selectedEnv : selectedModels.length === 0} className="bg-emerald-600 disabled:bg-gray-100 text-white px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl transition-all hover:scale-105 active:scale-95">
                    {wizardStep === 'env_selection' ? "Add Content" : "Enter Unity Workspace"} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </footer>
            </div>
          </motion.div>
        )}

        {/* --- 阶段 3：编辑器主视口 --- */}
        {wizardStep === 'editor' && (
          <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 mt-[64px] flex overflow-hidden bg-[#111]">
            {/* 左侧：Inspector */}
            <AnimatePresence mode="wait">
              {leftPanelOpen && (
                <motion.aside
                  initial={{ x: -280, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -280, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="w-[280px] bg-[#252526] border-r border-black flex flex-col text-gray-300 shadow-2xl z-20"
                >
                  <div className="p-4 border-b border-black flex items-center justify-between bg-black/20"><span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Inspector</span><Settings2 className="w-4 h-4" /></div>
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {activeSelection ? (
                  <div className="animate-in fade-in duration-300">
                    <div className="flex items-center gap-4 mb-6">
                      <img src={activeSelection.thumbnail} className="w-14 h-14 rounded-2xl border border-white/10 shadow-2xl" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate w-36 tracking-tight italic">{activeSelection.name}</p>
                        <p className={`text-[9px] uppercase font-black tracking-widest ${
                          activeSelection.type === 'environment-3d' ? 'text-blue-400' :
                          activeSelection.type === 'environment-ai' ? 'text-purple-400' :
                          'text-gray-500'
                        }`}>
                          {activeSelection.type === 'environment-3d' ? '3D Environment' :
                           activeSelection.type === 'environment-ai' ? 'AI Skybox' :
                           '3D Entity'}
                        </p>
                      </div>
                    </div>

                    {/* Position Controls */}
                    <div className="space-y-3 pb-4 border-b border-white/5">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Position</p>
                      {['x', 'y', 'z'].map(axis => (
                        <div key={axis} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-gray-600 uppercase font-black w-3">{axis}</span>
                            <input
                              type="range"
                              min="-10"
                              max="10"
                              step="0.1"
                              value={activeSelection.position?.[axis] || 0}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                const newPos = { ...(activeSelection.position || { x: 0, y: 0, z: 0 }), [axis]: val };
                                updateAssetTransform(activeSelection.uid, { position: newPos });
                              }}
                              className="flex-1 accent-emerald-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <input
                              type="number"
                              step="0.1"
                              value={(activeSelection.position?.[axis] || 0).toFixed(1)}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const newPos = { ...(activeSelection.position || { x: 0, y: 0, z: 0 }), [axis]: val };
                                updateAssetTransform(activeSelection.uid, { position: newPos });
                              }}
                              className="w-14 px-1 py-0.5 text-[9px] text-emerald-500 font-mono bg-black/30 border border-emerald-500/20 rounded text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Rotation Controls */}
                    <div className="space-y-3 py-4 border-b border-white/5">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Rotation</p>
                      {['x', 'y', 'z'].map(axis => (
                        <div key={axis} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-gray-600 uppercase font-black w-3">{axis}</span>
                            <input
                              type="range"
                              min="-180"
                              max="180"
                              step="1"
                              value={activeSelection.rotation?.[axis] || 0}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                const newRot = { ...(activeSelection.rotation || { x: 0, y: 0, z: 0 }), [axis]: val };
                                updateAssetTransform(activeSelection.uid, { rotation: newRot });
                              }}
                              className="flex-1 accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <input
                              type="number"
                              step="1"
                              value={(activeSelection.rotation?.[axis] || 0).toFixed(0)}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const newRot = { ...(activeSelection.rotation || { x: 0, y: 0, z: 0 }), [axis]: val };
                                updateAssetTransform(activeSelection.uid, { rotation: newRot });
                              }}
                              className="w-14 px-1 py-0.5 text-[9px] text-blue-400 font-mono bg-black/30 border border-blue-500/20 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Scale Control - Exponential Dual Input */}
                    <div className="space-y-3 py-4 border-b border-white/5">
                       <div className="flex justify-between items-center">
                         <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Scale</span>
                         <span className="text-xs text-purple-400 font-mono tracking-widest font-black">{(activeSelection.scale || 1).toFixed(4)}x</span>
                       </div>
                       <div className="flex items-center gap-3">
                         {/* Exponential Range Slider (0.0001 to 100) */}
                         <input
                           type="range"
                           min={Math.log(0.0001)}
                           max={Math.log(100)}
                           step="0.01"
                           value={Math.log(activeSelection.scale || 1)}
                           onChange={(e) => {
                             const actualVal = Math.exp(parseFloat(e.target.value));
                             updateAssetTransform(activeSelection.uid, { scale: actualVal });
                           }}
                           className="flex-1 accent-purple-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                         />
                         {/* Ultra-Precision Number Input (4 decimals) */}
                         <input
                           type="number"
                           step="0.0001"
                           min="0.0001"
                           max="100"
                           value={(activeSelection.scale || 1).toFixed(4)}
                           onChange={(e) => {
                             const val = parseFloat(e.target.value) || 0.0001;
                             const clampedVal = Math.max(0.0001, Math.min(100, val));
                             updateAssetTransform(activeSelection.uid, { scale: clampedVal });
                           }}
                           className="w-24 px-2 py-1.5 text-[10px] text-emerald-400 font-mono bg-[#1A1A1A] border border-emerald-500/30 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                         />
                       </div>
                       <div className="flex justify-between text-[8px] text-gray-500 font-mono">
                         <span>0.0001</span>
                         <span>0.01</span>
                         <span>1.0</span>
                         <span>10</span>
                         <span>100</span>
                       </div>
                    </div>

                    {/* Reset Transform - Smart Reset for Environments */}
                    <div className="pt-4 pb-4 border-b border-white/5">
                      <button
                        onClick={() => {
                          const isEnv = activeSelection.type?.includes('environment');
                          const resetScale = isEnv && activeSelection.bestFitScale ? activeSelection.bestFitScale : 1;

                          updateAssetTransform(activeSelection.uid, {
                            position: isEnv ? { x: 0, y: 0, z: 0 } : { x: 0, y: 1, z: -3 },
                            rotation: activeSelection.type === 'environment-ai' ? { x: 0, y: -130, z: 0 } : { x: 0, y: 0, z: 0 },
                            scale: resetScale
                          });
                        }}
                        className="w-full py-3 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:from-red-500/30 hover:to-orange-500/30 hover:border-red-500/50 transition-all shadow-lg hover:shadow-red-500/10 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <RefreshCcw className="w-3 h-3" />
                        {activeSelection.type?.includes('environment') && activeSelection.bestFitScale ? 'Smart Reset' : 'Reset Transform'}
                      </button>
                    </div>

                    {/* Interaction FX - Only for models */}
                    {!activeSelection.type?.includes('environment') && activeSelection.interactionFX && (
                      <div className="space-y-4 pt-4">
                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2 italic">Interaction FX</p>

                        {/* Grabbable */}
                        <label className="flex items-center justify-between p-3.5 bg-black/20 rounded-2xl cursor-pointer hover:bg-black/40 border border-transparent hover:border-yellow-500/20 transition-all shadow-inner">
                          <div>
                            <span className="text-xs text-gray-300 font-medium tracking-tight">Grabbable</span>
                            <p className="text-[9px] text-gray-500 mt-0.5">Pick up in VR mode</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={activeSelection.interactionFX?.grabbable || false}
                            onChange={(e) => {
                              const newFX = {
                                ...activeSelection.interactionFX,
                                grabbable: e.target.checked
                              };
                              updateAssetTransform(activeSelection.uid, { interactionFX: newFX });
                            }}
                            className="accent-yellow-500 w-4 h-4 rounded"
                          />
                        </label>

                        {/* Glow Pulse */}
                        <label className="flex items-center justify-between p-3.5 bg-black/20 rounded-2xl cursor-pointer hover:bg-black/40 border border-transparent hover:border-emerald-500/20 transition-all shadow-inner">
                          <div>
                            <span className="text-xs text-gray-300 font-medium tracking-tight">Glow Pulse</span>
                            <p className="text-[9px] text-gray-500 mt-0.5">Pulsing light effect</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={activeSelection.interactionFX?.glowPulse || false}
                            onChange={(e) => {
                              const newFX = {
                                ...activeSelection.interactionFX,
                                glowPulse: e.target.checked
                              };
                              updateAssetTransform(activeSelection.uid, { interactionFX: newFX });
                            }}
                            className="accent-emerald-500 w-4 h-4 rounded"
                          />
                        </label>

                        {/* Collision Trigger */}
                        <label className="flex items-center justify-between p-3.5 bg-black/20 rounded-2xl cursor-pointer hover:bg-black/40 border border-transparent hover:border-blue-500/20 transition-all shadow-inner">
                          <div>
                            <span className="text-xs text-gray-300 font-medium tracking-tight">Collision Trigger</span>
                            <p className="text-[9px] text-gray-500 mt-0.5">Color change on contact</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={activeSelection.interactionFX?.collisionTrigger || false}
                            onChange={(e) => {
                              const newFX = {
                                ...activeSelection.interactionFX,
                                collisionTrigger: e.target.checked
                              };
                              updateAssetTransform(activeSelection.uid, { interactionFX: newFX });
                            }}
                            className="accent-blue-500 w-4 h-4 rounded"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="animate-in fade-in duration-300">
                    {/* World Component Header */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-xl">
                        <Mountain className="w-8 h-8 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white tracking-tight italic">World Component</p>
                        <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Environment Transform</p>
                      </div>
                    </div>

                    {selectedEnv ? (
                      <>
                        {/* Position Controls */}
                        <div className="space-y-3 pb-4 border-b border-white/5">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Position</p>
                          {['x', 'y', 'z'].map(axis => (
                            <div key={axis} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-gray-600 uppercase font-black w-3">{axis}</span>
                                <input
                                  type="range"
                                  min="-50"
                                  max="50"
                                  step="0.1"
                                  value={selectedEnv.position?.[axis] || 0}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    const newPos = { ...(selectedEnv.position || { x: 0, y: 0, z: 0 }), [axis]: val };
                                    updateEnvironmentTransform({ position: newPos });
                                  }}
                                  className="flex-1 accent-emerald-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <input
                                  type="number"
                                  step="0.1"
                                  value={(selectedEnv.position?.[axis] || 0).toFixed(1)}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const newPos = { ...(selectedEnv.position || { x: 0, y: 0, z: 0 }), [axis]: val };
                                    updateEnvironmentTransform({ position: newPos });
                                  }}
                                  className="w-14 px-1 py-0.5 text-[9px] text-emerald-500 font-mono bg-black/30 border border-emerald-500/20 rounded text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Rotation Controls */}
                        <div className="space-y-3 py-4 border-b border-white/5">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Rotation</p>
                          {['x', 'y', 'z'].map(axis => (
                            <div key={axis} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-gray-600 uppercase font-black w-3">{axis}</span>
                                <input
                                  type="range"
                                  min="-180"
                                  max="180"
                                  step="1"
                                  value={selectedEnv.rotation?.[axis] || 0}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    const newRot = { ...(selectedEnv.rotation || { x: 0, y: 0, z: 0 }), [axis]: val };
                                    updateEnvironmentTransform({ rotation: newRot });
                                  }}
                                  className="flex-1 accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <input
                                  type="number"
                                  step="1"
                                  value={(selectedEnv.rotation?.[axis] || 0).toFixed(0)}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const newRot = { ...(selectedEnv.rotation || { x: 0, y: 0, z: 0 }), [axis]: val };
                                    updateEnvironmentTransform({ rotation: newRot });
                                  }}
                                  className="w-14 px-1 py-0.5 text-[9px] text-blue-400 font-mono bg-black/30 border border-blue-500/20 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Scale Control - Exponential Slider with Ultra-Precision */}
                        <div className="space-y-3 py-4 border-b border-white/5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Scale</span>
                            <span className="text-xs text-purple-400 font-mono tracking-widest font-black">{(selectedEnv.scale || 1).toFixed(4)}x</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {/* Exponential Range Slider */}
                            <input
                              type="range"
                              min={Math.log(0.0001)} // ln(0.0001) ≈ -9.21
                              max={Math.log(100)}     // ln(100) ≈ 4.61
                              step="0.01"
                              value={Math.log(selectedEnv.scale || 1)}
                              onChange={(e) => {
                                const logVal = parseFloat(e.target.value);
                                const actualVal = Math.exp(logVal); // e^(slider value)
                                const clampedVal = Math.max(0.0001, Math.min(100, actualVal));
                                updateEnvironmentTransform({ scale: clampedVal });
                              }}
                              className="flex-1 accent-purple-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                            {/* Ultra-Precision Number Input (4 decimals) */}
                            <input
                              type="number"
                              step="0.0001"
                              min="0.0001"
                              max="100"
                              value={(selectedEnv.scale || 1).toFixed(4)}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0.0001;
                                const clampedVal = Math.max(0.0001, Math.min(100, val));
                                updateEnvironmentTransform({ scale: clampedVal });
                              }}
                              className="w-24 px-2 py-1.5 text-[10px] text-emerald-400 font-mono bg-[#1A1A1A] border border-emerald-500/30 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                          </div>
                          <div className="flex justify-between text-[8px] text-gray-500 font-mono">
                            <span>0.0001</span>
                            <span>0.01</span>
                            <span>1.0</span>
                            <span>100</span>
                          </div>
                          <p className="text-[8px] text-gray-600 italic mt-1">Exponential scale for ultra-wide range</p>
                        </div>

                        {/* Smart Reset Transform */}
                        <div className="pt-4">
                          <button
                            onClick={() => {
                              const bestFit = selectedEnv?.bestFitScale || 1.0;
                              updateEnvironmentTransform({
                                position: { x: 0, y: 0, z: 0 },
                                rotation: { x: 0, y: 0, z: 0 },
                                scale: bestFit
                              });
                            }}
                            className="w-full py-3 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:from-emerald-500/30 hover:to-cyan-500/30 hover:border-emerald-500/50 transition-all shadow-lg hover:shadow-emerald-500/10 active:scale-95 flex items-center justify-center gap-2"
                          >
                            <RefreshCcw className="w-3 h-3" />
                            Reset to Best Fit
                          </button>
                          <p className="text-[8px] text-gray-600 text-center mt-2 italic">
                            Optimal scale: {(selectedEnv?.bestFitScale || 1.0).toFixed(4)}x
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-6 grayscale">
                        <MousePointerClick className="w-12 h-12 mb-4 text-white" />
                        <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                          Deploy environment<br/>to edit properties
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
                </motion.aside>
              )}
            </AnimatePresence>

            {/* 中间：SCENE VIEW */}
            <main className="flex-1 relative flex flex-col bg-black scene-container">
              {/* Panel Toggle Buttons */}
              <div className="absolute top-5 left-5 z-30 flex gap-2">
                {/* Left Panel Toggle */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLeftPanelOpen(!leftPanelOpen)}
                  className="bg-black/80 backdrop-blur px-3 py-2 rounded-xl border border-emerald-500/30 text-emerald-500 hover:border-emerald-500/60 transition-all shadow-2xl"
                  title={leftPanelOpen ? "Hide Inspector" : "Show Inspector"}
                >
                  <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${leftPanelOpen ? 'rotate-180' : ''}`} />
                </motion.button>

                <div className="bg-black/60 backdrop-blur px-3 py-2 rounded-xl border border-white/10 text-emerald-500 text-[9px] font-black uppercase flex items-center gap-2 shadow-2xl tracking-widest">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Live Viewport
                </div>

                {/* Right Panel Toggle */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setRightPanelOpen(!rightPanelOpen)}
                  className="bg-black/80 backdrop-blur px-3 py-2 rounded-xl border border-blue-500/30 text-blue-500 hover:border-blue-500/60 transition-all shadow-2xl"
                  title={rightPanelOpen ? "Hide Designer Hub" : "Show Designer Hub"}
                >
                  <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${rightPanelOpen ? 'rotate-180' : ''}`} />
                </motion.button>
              </div>
              <SceneView
                 sceneAssets={sceneAssets}
                 activeSelection={activeSelection}
                 transformMode={transformMode}
                 onAssetClick={setActiveSelection}
                 onAssetTransform={updateAssetTransform}
                 onEnvironmentLoaded={(uid, boundingBox) => {
                   const bestFit = calculateBestFitScale(boundingBox);
                   updateAssetTransform(uid, { bestFitScale: bestFit });
                 }}
              />
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#1A1A1A]/90 backdrop-blur-md p-2 rounded-2xl border border-white/5 shadow-2xl z-30 transition-all hover:bg-[#1A1A1A]">
                {/* Move Tool */}
                <button
                  onClick={() => setTransformMode('translate')}
                  className={`p-3 rounded-xl transition-all shadow-xl ${transformMode === 'translate' ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:bg-white/10 hover:text-white'}`}
                  title="Move Tool (Translate)"
                >
                  <Move className="w-4 h-4" />
                </button>

                {/* Rotate Tool */}
                <button
                  onClick={() => setTransformMode('rotate')}
                  className={`p-3 rounded-xl transition-all shadow-xl ${transformMode === 'rotate' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-white/10 hover:text-white'}`}
                  title="Rotate Tool"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>

                {/* Scale Tool */}
                <button
                  onClick={() => setTransformMode('scale')}
                  className={`p-3 rounded-xl transition-all shadow-xl ${transformMode === 'scale' ? 'bg-purple-500 text-white' : 'text-gray-500 hover:bg-white/10 hover:text-white'}`}
                  title="Scale Tool"
                >
                  <Maximize className="w-4 h-4" />
                </button>

                {/* Free Drag Mode */}
                <button
                  onClick={() => setTransformMode('drag')}
                  className={`p-3 rounded-xl transition-all shadow-xl ${transformMode === 'drag' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-white/10 hover:text-white'}`}
                  title="Free Drag Mode"
                >
                  <GripVertical className="w-4 h-4" />
                </button>

                {/* Divider */}
                <div className="w-px h-8 bg-white/10"></div>

                {/* Fullscreen Toggle */}
                <button
                  onClick={() => {
                    const elem = document.querySelector('.scene-container');
                    if (!isFullscreen) {
                      elem?.requestFullscreen?.();
                    } else {
                      document.exitFullscreen?.();
                    }
                    setIsFullscreen(!isFullscreen);
                  }}
                  className="p-3 hover:bg-white/10 rounded-xl text-gray-500 hover:text-white transition-all shadow-xl"
                  title="Toggle Fullscreen"
                >
                  <Layers className="w-4 h-4" />
                </button>

                {/* Reset Transform */}
                <button
                  onClick={() => {
                    if (activeSelection) {
                      const isEnv = activeSelection.type?.includes('environment');
                      const resetScale = isEnv && activeSelection.bestFitScale ? activeSelection.bestFitScale : 1;

                      updateAssetTransform(activeSelection.uid, {
                        position: isEnv ? { x: 0, y: 0, z: 0 } : { x: 0, y: 1, z: -3 },
                        rotation: activeSelection.type === 'environment-ai' ? { x: 0, y: -130, z: 0 } : { x: 0, y: 0, z: 0 },
                        scale: resetScale
                      });
                    }
                  }}
                  disabled={!activeSelection}
                  className="p-3 hover:bg-white/10 rounded-xl text-gray-500 hover:text-red-400 transition-all shadow-xl disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Reset Transform"
                >
                  <Zap className="w-4 h-4" />
                </button>
              </div>
            </main>

            {/* 右侧：HIERARCHY & AI */}
            <AnimatePresence mode="wait">
              {rightPanelOpen && (
                <motion.aside
                  initial={{ x: 340, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 340, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="w-[340px] bg-[#252526] border-l border-black flex flex-col text-gray-300 shadow-2xl z-20"
                >
                  <div className="p-4 border-b border-black flex items-center justify-between bg-black/20 shadow-inner"><span className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic">Designer Hub</span><Brain className="w-4 h-4" /></div>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                {/* AI 对话框 - 高度固定 */}
                <div className="space-y-4 bg-black/20 p-5 rounded-[2rem] border border-white/5 shadow-inner">
                   <div className="flex items-center gap-2 mb-1"><Sparkles className="w-3 h-3 text-purple-400" /><span className="text-[9px] font-black uppercase text-purple-300 tracking-widest italic">Creative Chat</span></div>
                   <div className="h-20 overflow-y-auto space-y-3 pr-2 mb-4 custom-scrollbar">
                      {messages.map((m, i) => (<div key={i} className={`text-[11px] p-3.5 rounded-2xl leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-emerald-600 ml-6 text-white' : 'bg-white/5 mr-6 border border-white/5 text-gray-300'}`}>{m.content}</div>))}
                   </div>
                   <div className="relative">
                      {/* ✅ Performance Fix: Use defaultValue to avoid re-rendering 3D scene on every keystroke */}
                      <textarea
                        key={`ai-chat-${messages.length}`}
                        defaultValue={aiInput}
                        onBlur={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            const currentInput = e.currentTarget.value;
                            setAiInput("");
                            handleAiSend(currentInput);
                          }
                        }}
                        className="w-full bg-[#1A1A1A] rounded-2xl p-4 text-[11px] h-20 border-none resize-none pr-10 custom-scrollbar outline-none focus:ring-1 ring-purple-500/50 shadow-inner"
                        placeholder="Ask AI to place models..."
                      />
                      <button
                        onClick={(e) => {
                          const textarea = e.currentTarget.parentElement?.querySelector('textarea');
                          const currentInput = textarea?.value || '';
                          setAiInput("");
                          handleAiSend(currentInput);
                        }}
                        className="absolute right-3 bottom-3 text-emerald-500 hover:scale-125 transition-transform"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                   </div>
                </div>

                {/* All Scene Assets (Environments + Models) */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest italic">Scene Assets</p>
                    <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {sceneAssets.length} Total
                    </span>
                  </div>
                  <div className="space-y-2.5 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                    {sceneAssets.map(asset => (
                      <div
                        key={asset.uid}
                        onClick={() => setActiveSelection(asset)}
                        className={`group bg-[#2D2D2D] p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition-all border shadow-md ${
                          activeSelection?.uid === asset.uid ? 'border-emerald-500 bg-emerald-500/10 shadow-lg' : 'border-transparent hover:border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <img
                            src={asset.thumbnail}
                            className="w-11 h-11 rounded-xl object-cover border border-white/5 shadow-md group-hover:scale-105 transition-transform"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-bold text-white truncate w-24 tracking-tighter uppercase italic">
                              {asset.name}
                            </span>
                            <span className={`text-[8px] uppercase font-black tracking-widest mt-0.5 ${
                              asset.type === 'environment-3d' ? 'text-blue-400' :
                              asset.type === 'environment-ai' ? 'text-purple-400' :
                              'text-gray-400'
                            }`}>
                              {asset.type === 'environment-3d' ? '3D Environment' :
                               asset.type === 'environment-ai' ? 'AI Skybox' :
                               'Model'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAssetVisibility(asset.uid);
                            }}
                            className={`p-2.5 rounded-xl transition-all shadow-xl active:scale-90 ${
                              asset.visible
                                ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                                : 'bg-black/40 text-gray-500 hover:text-white border border-transparent'
                            }`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAsset(asset.uid);
                            }}
                            className="p-2.5 rounded-xl transition-all shadow-xl active:scale-90 bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {sceneAssets.length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-[10px] italic">
                        No assets in scene yet. Add an environment from the Designer Hub!
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-7 mt-auto border-t border-black/40 bg-black/20">
                <button
                  onClick={handleExport}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4.5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all hover:scale-[1.03] active:scale-95 shadow-emerald-500/10 italic"
                >
                  Export Project to VR
                </button>
              </div>
                </motion.aside>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Notification for AI Generation */}
      <AnimatePresence>
        {showSuccessNotification && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[250] pointer-events-none"
          >
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-4 rounded-2xl shadow-2xl border border-purple-400/50 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black text-sm uppercase tracking-widest">AI World Ready!</p>
                <p className="text-xs text-purple-100 mt-0.5">Your 360° environment is ready to preview</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Preview Card */}
      <AnimatePresence>
        {showPreviewCard && aiPreviewData && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 z-[240] w-[400px] pointer-events-auto"
          >
            <div className="bg-[#1A1A1A] border-2 border-purple-500/50 rounded-[2rem] p-6 shadow-2xl backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest">AI Preview</h3>
                    <p className="text-purple-400 text-[10px] font-medium">Ready to deploy</p>
                  </div>
                </div>
                <button
                  onClick={handleDiscardAIPreview}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Preview Image */}
              <div className="relative rounded-2xl overflow-hidden mb-4 border border-purple-500/20">
                <img
                  src={aiPreviewData.imagePath}
                  alt="AI Generated Environment"
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-white text-xs font-medium line-clamp-2">
                    {aiPreviewData.prompt}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleDiscardAIPreview}
                  className="flex-1 py-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-xs font-black uppercase tracking-widest hover:bg-red-500/30 transition-all active:scale-95"
                >
                  Discard
                </button>
                <button
                  onClick={handleDeployAISkybox}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl text-white text-xs font-black uppercase tracking-widest hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg shadow-purple-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Add to Scene
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Model Preview Card */}
      <AnimatePresence>
        {showModelPreviewCard && aiModelPreview && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 z-[240] w-[400px] pointer-events-auto"
          >
            <div className="bg-[#1A1A1A] border-2 border-emerald-500/50 rounded-[2rem] p-6 shadow-2xl backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest">AI Model Ready</h3>
                    <p className="text-emerald-400 text-[10px] font-medium">3D Model Generated</p>
                  </div>
                </div>
                <button
                  onClick={handleDiscardAIModel}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Preview Image/Thumbnail */}
              <div className="relative rounded-2xl overflow-hidden mb-4 border border-emerald-500/20 bg-gradient-to-br from-gray-900 to-gray-800">
                {aiModelPreview.thumbnail ? (
                  <img
                    src={aiModelPreview.thumbnail}
                    alt="AI Generated Model"
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 flex items-center justify-center">
                    <div className="text-center">
                      <Box className="w-16 h-16 text-emerald-500/50 mx-auto mb-2" />
                      <p className="text-gray-500 text-xs">3D Model Preview</p>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-white text-xs font-medium line-clamp-2">
                    {aiModelPreview.prompt}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleDiscardAIModel}
                  className="flex-1 py-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-xs font-black uppercase tracking-widest hover:bg-red-500/30 transition-all active:scale-95"
                >
                  Discard
                </button>
                <button
                  onClick={handleDeployAIModel}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl text-white text-xs font-black uppercase tracking-widest hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Add to Scene
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Popup Modal */}
      <AnimatePresence>
        {showExportPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setShowExportPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1A1A1A] border border-emerald-500/30 rounded-[2rem] p-8 max-w-2xl w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">VR Scene Exported!</h2>
                <button
                  onClick={() => setShowExportPopup(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <p className="text-gray-400 mb-6 text-sm">
                Your VR scene has been exported successfully. Share this link with anyone to view your creation in VR!
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Shareable Link */}
                <div className="bg-black/40 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-[9px] uppercase font-black tracking-widest text-gray-500 mb-2">Shareable Link</p>
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="text"
                      value={exportUrl}
                      readOnly
                      className="flex-1 bg-transparent text-emerald-400 text-xs font-mono px-3 py-2 border border-emerald-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-[8px] text-gray-500 uppercase tracking-wide">Short URL - Quest 3 Compatible</p>
                </div>

                {/* QR Code */}
                <div className="bg-black/40 border border-emerald-500/20 rounded-xl p-4 flex flex-col items-center justify-center">
                  <p className="text-[9px] uppercase font-black tracking-widest text-gray-500 mb-3">Scan with Quest 3</p>
                  <div className="bg-white p-3 rounded-xl">
                    <QRCodeSVG
                      value={exportUrl}
                      size={120}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-[8px] text-gray-500 uppercase tracking-wide mt-2">Open camera to scan</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => window.open(exportUrl, '_blank')}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95"
                >
                  Open in VR
                </button>
                <button
                  onClick={() => setShowExportPopup(false)}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3E3E3F; border-radius: 10px; }
        a-scene { display: block; width: 100%; height: 100%; position: relative; z-index: 10; }
        input[type='range']::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; background: #10b981; cursor: pointer; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 10px rgba(16, 185, 129, 0.4); }
      `}</style>
    </div>
  );
}