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

// ✅ 核心修复：隔离 A-Frame 渲染，解决水合与黑屏
const SceneView = dynamic(() => import('./Scene'), { 
  ssr: false,
  loading: () => <div className="flex-1 bg-black flex items-center justify-center text-gray-700 font-mono text-[10px] tracking-widest uppercase">Initializing Unity Core...</div>
});

// ----------------------------------------------------------------------
// 模拟数据
// ----------------------------------------------------------------------
const INTERNAL_ENVIRONMENTS = [
  { id: 'lab', name: 'Sci-Fi Lab', thumb: '/environment.jpg', type: 'Architecture', modelPath: '/environemnt/sci-fi_lab.glb' },
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
  
  const [selectedEnv, setSelectedEnv] = useState(null);
  const [envDeployed, setEnvDeployed] = useState(false);
  const [selectedModels, setSelectedModels] = useState([]); 
  const [activeEditingAsset, setActiveEditingAsset] = useState(null); 
  
  // ✅ 核心修复：分离搜索状态，解决打字中断焦点丢失问题
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [downloadingModel, setDownloadingModel] = useState(null); // Track which model is downloading
  const [transformMode, setTransformMode] = useState('translate'); // translate | rotate | scale | drag
  const [isFullscreen, setIsFullscreen] = useState(false);

  // AI 聊天状态
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your AI Design Assistant. Ready to build something epic?" }
  ]);
  const [aiInput, setAiInput] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEnvSelect = (env) => {
    setSelectedEnv({
      id: env.id || env.uid,
      name: env.name,
      thumb: env.thumb || env.thumbnail,
      modelPath: env.modelPath || null
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
        thumbnail: model.thumbnail || model.thumb,
        modelPath: model.modelPath || null,
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

  const updateModelTransform = (uid, transform) => {
    setSelectedModels(prev => prev.map(m =>
      m.uid === uid ? { ...m, ...transform } : m
    ));
    // Also update activeEditingAsset if it's the same model
    if (activeEditingAsset?.uid === uid) {
      setActiveEditingAsset(prev => ({ ...prev, ...transform }));
    }
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
        });
      } else {
        // Add to selectedModels for asset imports
        const newModel = {
          uid: model.uid,
          name: data.modelName || model.name,
          thumbnail: model.thumbnail,
          modelPath: data.modelPath, // Local path: /imports/[uid]/model.glb
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

      // Show success feedback
      if (data.cached) {
        console.log('✅ Model loaded from cache');
      } else {
        console.log('✅ Model imported successfully');
      }

    } catch (error) {
      console.error('Import error:', error);
      alert(error.message || 'Failed to import model. Please try again.');
    } finally {
      setDownloadingModel(null);
    }
  };

  const handleAiSend = () => {
    if (!aiInput.trim()) return;
    setMessages([...messages, { role: 'user', content: aiInput }]);
    setAiInput("");
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
                    <textarea className="w-full bg-white border-none rounded-2xl p-5 text-xs resize-none shadow-sm outline-none focus:ring-2 ring-purple-100" rows={3} placeholder={wizardStep === 'env_selection' ? "Describe the 360 environment prompt..." : "Describe the 3D asset details..."} />
                    <button className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl shadow-purple-200 transition-transform active:scale-95 tracking-widest">Start AI Generation</button>
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
                  <button onClick={() => wizardStep === 'env_selection' ? setWizardStep('asset_selection') : setWizardStep('editor')} disabled={wizardStep === 'env_selection' ? !selectedEnv : selectedModels.length === 0} className="bg-emerald-600 disabled:bg-gray-100 text-white px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl transition-all hover:scale-105 active:scale-95">
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
            <aside className="w-[280px] bg-[#252526] border-r border-black flex flex-col text-gray-300 shadow-2xl z-20">
              <div className="p-4 border-b border-black flex items-center justify-between bg-black/20"><span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Inspector</span><Settings2 className="w-4 h-4" /></div>
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {activeEditingAsset ? (
                  <div className="animate-in fade-in duration-300">
                    <div className="flex items-center gap-4 mb-6"><img src={activeEditingAsset.thumbnail} className="w-14 h-14 rounded-2xl border border-white/10 shadow-2xl" /><div className="min-w-0"><p className="text-sm font-bold text-white truncate w-36 tracking-tight italic">{activeEditingAsset.name}</p><p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">3D Entity</p></div></div>

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
                              value={activeEditingAsset.position?.[axis] || 0}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                const newPos = { ...(activeEditingAsset.position || { x: 0, y: 1, z: -3 }), [axis]: val };
                                updateModelTransform(activeEditingAsset.uid, { position: newPos });
                              }}
                              className="flex-1 accent-emerald-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <input
                              type="number"
                              step="0.1"
                              value={(activeEditingAsset.position?.[axis] || 0).toFixed(1)}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const newPos = { ...(activeEditingAsset.position || { x: 0, y: 1, z: -3 }), [axis]: val };
                                updateModelTransform(activeEditingAsset.uid, { position: newPos });
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
                              value={activeEditingAsset.rotation?.[axis] || 0}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                const newRot = { ...(activeEditingAsset.rotation || { x: 0, y: 0, z: 0 }), [axis]: val };
                                updateModelTransform(activeEditingAsset.uid, { rotation: newRot });
                              }}
                              className="flex-1 accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <input
                              type="number"
                              step="1"
                              value={(activeEditingAsset.rotation?.[axis] || 0).toFixed(0)}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const newRot = { ...(activeEditingAsset.rotation || { x: 0, y: 0, z: 0 }), [axis]: val };
                                updateModelTransform(activeEditingAsset.uid, { rotation: newRot });
                              }}
                              className="w-14 px-1 py-0.5 text-[9px] text-blue-400 font-mono bg-black/30 border border-blue-500/20 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Scale Control - Dual Input */}
                    <div className="space-y-3 py-4 border-b border-white/5">
                       <div className="flex justify-between items-center">
                         <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Scale</span>
                         <span className="text-xs text-purple-400 font-mono tracking-widest font-black">{(activeEditingAsset.scale || 1).toFixed(3)}x</span>
                       </div>
                       <div className="flex items-center gap-3">
                         {/* Range Slider */}
                         <input
                           type="range"
                           min="0.001"
                           max="10"
                           step="0.001"
                           value={activeEditingAsset.scale || 1}
                           onChange={(e) => {
                             const val = parseFloat(e.target.value) || 0.001;
                             updateModelTransform(activeEditingAsset.uid, { scale: val });
                           }}
                           className="flex-1 accent-purple-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                         />
                         {/* Number Input */}
                         <input
                           type="number"
                           step="0.001"
                           min="0.001"
                           max="100"
                           value={(activeEditingAsset.scale || 1).toFixed(3)}
                           onChange={(e) => {
                             const val = parseFloat(e.target.value) || 0.001;
                             const clampedVal = Math.max(0.001, Math.min(100, val));
                             updateModelTransform(activeEditingAsset.uid, { scale: clampedVal });
                           }}
                           className="w-20 px-2 py-1.5 text-[10px] text-emerald-400 font-mono bg-[#1A1A1A] border border-emerald-500/30 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                         />
                       </div>
                       <div className="flex justify-between text-[8px] text-gray-500 font-mono">
                         <span>0.001</span>
                         <span>1.0</span>
                         <span>5.0</span>
                         <span>10+</span>
                       </div>
                    </div>

                    {/* Reset Transform */}
                    <div className="pt-4 pb-4 border-b border-white/5">
                      <button
                        onClick={() => {
                          updateModelTransform(activeEditingAsset.uid, {
                            position: { x: 0, y: 1, z: -3 },
                            rotation: { x: 0, y: 0, z: 0 },
                            scale: 1
                          });
                        }}
                        className="w-full py-3 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:from-red-500/30 hover:to-orange-500/30 hover:border-red-500/50 transition-all shadow-lg hover:shadow-red-500/10 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <RefreshCcw className="w-3 h-3" />
                        Reset Transform
                      </button>
                    </div>

                    {/* Interaction FX */}
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
                          checked={activeEditingAsset.interactionFX?.grabbable || false}
                          onChange={(e) => {
                            const newFX = {
                              ...activeEditingAsset.interactionFX,
                              grabbable: e.target.checked
                            };
                            updateModelTransform(activeEditingAsset.uid, { interactionFX: newFX });
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
                          checked={activeEditingAsset.interactionFX?.glowPulse || false}
                          onChange={(e) => {
                            const newFX = {
                              ...activeEditingAsset.interactionFX,
                              glowPulse: e.target.checked
                            };
                            updateModelTransform(activeEditingAsset.uid, { interactionFX: newFX });
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
                          checked={activeEditingAsset.interactionFX?.collisionTrigger || false}
                          onChange={(e) => {
                            const newFX = {
                              ...activeEditingAsset.interactionFX,
                              collisionTrigger: e.target.checked
                            };
                            updateModelTransform(activeEditingAsset.uid, { interactionFX: newFX });
                          }}
                          className="accent-blue-500 w-4 h-4 rounded"
                        />
                      </label>
                    </div>
                  </div>
                ) : ( <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-6 grayscale"><MousePointerClick className="w-12 h-12 mb-4 text-white" /><p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Select object in scene<br/>to inspect properties</p></div> )}
              </div>
            </aside>

            {/* 中间：SCENE VIEW */}
            <main className="flex-1 relative flex flex-col bg-black scene-container">
              <div className="absolute top-5 left-5 z-20 flex gap-2"><div className="bg-black/60 backdrop-blur px-3 py-2 rounded-xl border border-white/10 text-emerald-500 text-[9px] font-black uppercase flex items-center gap-2 shadow-2xl tracking-widest"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Live Viewport</div></div>
              <SceneView
                 envDeployed={envDeployed}
                 selectedEnv={selectedEnv}
                 selectedModels={selectedModels}
                 activeEditingAsset={activeEditingAsset}
                 transformMode={transformMode}
                 onAssetClick={setActiveEditingAsset}
                 onModelTransform={updateModelTransform}
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
                    if (activeEditingAsset) {
                      updateModelTransform(activeEditingAsset.uid, {
                        position: { x: 0, y: 1, z: -3 },
                        rotation: { x: 0, y: 0, z: 0 },
                        scale: 1
                      });
                    }
                  }}
                  disabled={!activeEditingAsset}
                  className="p-3 hover:bg-white/10 rounded-xl text-gray-500 hover:text-red-400 transition-all shadow-xl disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Reset Transform"
                >
                  <Zap className="w-4 h-4" />
                </button>
              </div>
            </main>

            {/* 右侧：HIERARCHY & AI */}
            <aside className="w-[340px] bg-[#252526] border-l border-black flex flex-col text-gray-300 shadow-2xl z-20">
              <div className="p-4 border-b border-black flex items-center justify-between bg-black/20 shadow-inner"><span className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic">Designer Hub</span><Brain className="w-4 h-4" /></div>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                {/* AI 对话框 - 高度固定 */}
                <div className="space-y-4 bg-black/20 p-5 rounded-[2rem] border border-white/5 shadow-inner">
                   <div className="flex items-center gap-2 mb-1"><Sparkles className="w-3 h-3 text-purple-400" /><span className="text-[9px] font-black uppercase text-purple-300 tracking-widest italic">Creative Chat</span></div>
                   <div className="h-20 overflow-y-auto space-y-3 pr-2 mb-4 custom-scrollbar">
                      {messages.map((m, i) => (<div key={i} className={`text-[11px] p-3.5 rounded-2xl leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-emerald-600 ml-6 text-white' : 'bg-white/5 mr-6 border border-white/5 text-gray-300'}`}>{m.content}</div>))}
                   </div>
                   <div className="relative">
                      <textarea value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAiSend())} className="w-full bg-[#1A1A1A] rounded-2xl p-4 text-[11px] h-20 border-none resize-none pr-10 custom-scrollbar outline-none focus:ring-1 ring-purple-500/50 shadow-inner" placeholder="Ask AI to place models..." />
                      <button onClick={handleAiSend} className="absolute right-3 bottom-3 text-emerald-500 hover:scale-125 transition-transform"><Send className="w-5 h-5" /></button>
                   </div>
                </div>

                {/* 环境卡片 */}
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1 italic">World Component</p>
                  <div className={`p-4 rounded-[1.5rem] flex items-center justify-between border transition-all duration-500 ${envDeployed ? 'bg-emerald-500/10 border-emerald-500/50 shadow-xl shadow-emerald-500/5' : 'bg-[#2D2D2D] border-white/5'}`}>
                    <div className="flex items-center gap-4">
                       <img src={selectedEnv?.thumb} className="w-11 h-11 rounded-xl object-cover border border-white/10 shadow-lg" />
                       <span className="text-[11px] font-bold text-white tracking-tight uppercase italic truncate w-32">{selectedEnv?.name || "No Source"}</span>
                    </div>
                    <button onClick={() => setEnvDeployed(!envDeployed)} className={`p-2.5 rounded-xl transition-all shadow-xl active:scale-90 ${envDeployed ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-black/40 text-gray-500 hover:text-white'}`}>{envDeployed ? <Eye className="w-4 h-4" /> : <Plus className="w-4 h-4" />}</button>
                  </div>
                </div>

                {/* 资产列表 */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><p className="text-[9px] font-black text-gray-600 uppercase tracking-widest italic">Scene Entities</p><span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full">{selectedModels.length} Loaded</span></div>
                  <div className="space-y-2.5">
                    {selectedModels.map(model => (
                      <div key={model.uid} onClick={() => setActiveEditingAsset(model)} className={`group bg-[#2D2D2D] p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition-all border shadow-md ${activeEditingAsset?.uid === model.uid ? 'border-emerald-500 bg-emerald-500/10 shadow-lg' : 'border-transparent hover:border-white/5'}`}>
                        <div className="flex items-center gap-4 min-w-0">
                           <img src={model.thumbnail} className="w-11 h-11 rounded-xl object-cover border border-white/5 shadow-md group-hover:scale-105 transition-transform" />
                           <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-bold text-white truncate w-24 tracking-tighter uppercase italic">{model.name}</span>
                              <span className={`text-[8px] uppercase font-black tracking-widest mt-0.5 ${model.placed ? 'text-emerald-500' : 'text-gray-500'}`}>{model.placed ? 'Deployed' : 'In Library'}</span>
                           </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedModels(prev => prev.map(m => m.uid === model.uid ? {...m, placed: !m.placed} : m)); }} className={`p-2.5 rounded-xl transition-all shadow-xl active:scale-90 ${model.placed ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-black/40 text-gray-500 hover:text-white border border-transparent'}`}>{model.placed ? <Trash2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-7 mt-auto border-t border-black/40 bg-black/20"><button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4.5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all hover:scale-[1.03] active:scale-95 shadow-emerald-500/10 italic">Export Project to VR</button></div>
            </aside>
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