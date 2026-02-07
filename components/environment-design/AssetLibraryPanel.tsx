// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Loader2, Box, Dna, Heart, Microscope, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ═══════════════════════════════════════════════════════════════════════════
// ASSET LIBRARY PANEL - Browse & Add Internal NGSS Assets
// Aesthetic: Scientific/Laboratory dark theme with emerald accents
// ═══════════════════════════════════════════════════════════════════════════

interface NGSSAsset {
  id: string;
  name: string;
  description: string | null;
  model_url: string;
  thumbnail_url: string | null;
  category: string;
  subcategory: string | null;
  ngss_standards: string[];
  curriculum_tags: string[];
  has_animation: boolean;
  keywords: string[];
}

interface AssetLibraryPanelProps {
  onAddAsset: (asset: {
    name: string;
    modelUrl: string;
    thumbnailUrl?: string;
    source: 'internal';
  }) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All Assets', icon: Box },
  { id: 'Cell Biology', label: 'Cell Biology', icon: Microscope },
  { id: 'Human Anatomy', label: 'Human Anatomy', icon: Heart },
  { id: 'Genetics', label: 'Genetics', icon: Dna },
];

export default function AssetLibraryPanel({ onAddAsset }: AssetLibraryPanelProps) {
  const [assets, setAssets] = useState<NGSSAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<NGSSAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [addingAssetId, setAddingAssetId] = useState<string | null>(null);

  // Fetch assets from Supabase
  useEffect(() => {
    async function fetchAssets() {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from("ngss_assets")
          .select("*")
          .order("name", { ascending: true });

        if (fetchError) throw fetchError;

        setAssets(data || []);
        setFilteredAssets(data || []);
      } catch (err: any) {
        console.error("[ASSET LIBRARY] Failed to fetch assets:", err);
        setError(err.message || "Failed to load assets");
      } finally {
        setLoading(false);
      }
    }

    fetchAssets();
  }, []);

  // Filter assets based on search and category
  useEffect(() => {
    let filtered = [...assets];

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (a) => a.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.description?.toLowerCase().includes(query) ||
          a.keywords?.some((k) => k.toLowerCase().includes(query))
      );
    }

    setFilteredAssets(filtered);
  }, [assets, searchQuery, selectedCategory]);

  // Handle adding asset to scene
  const handleAddToScene = useCallback(
    async (asset: NGSSAsset) => {
      setAddingAssetId(asset.id);

      // Small delay for visual feedback
      await new Promise((resolve) => setTimeout(resolve, 300));

      onAddAsset({
        name: asset.name,
        modelUrl: asset.model_url,
        thumbnailUrl: asset.thumbnail_url || undefined,
        source: 'internal',
      });

      setAddingAssetId(null);
    },
    [onAddAsset]
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <h2
            className="text-lg font-semibold text-gray-900"
            style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
          >
            Asset Library
          </h2>
        </div>
        <p className="text-xs text-gray-500 ml-9">
          Curated NGSS-aligned 3D models
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex-shrink-0 px-5 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-gray-900 placeholder-gray-400 transition-all"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex-shrink-0 px-5 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                <Icon className="w-3 h-3" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="flex-shrink-0 mx-5 border-t border-gray-100" />

      {/* Asset Grid */}
      <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
            <p className="text-sm text-gray-400">Loading assets...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <Box className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-sm text-gray-500">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Try again
            </button>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">No assets found</p>
              <p className="text-xs text-gray-400 mt-1">
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : "Try a different category"}
              </p>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout">
              {filteredAssets.map((asset, index) => (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.03, duration: 0.2 }}
                >
                  <AssetCard
                    asset={asset}
                    isAdding={addingAssetId === asset.id}
                    onAdd={() => handleAddToScene(asset)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 bg-gray-50/50">
        <p className="text-xs text-gray-400 text-center">
          {filteredAssets.length} of {assets.length} assets
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ASSET CARD - Individual asset display with hover interaction
// ═══════════════════════════════════════════════════════════════════════════

interface AssetCardProps {
  asset: NGSSAsset;
  isAdding: boolean;
  onAdd: () => void;
}

function AssetCard({ asset, isAdding, onAdd }: AssetCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="group relative rounded-xl overflow-hidden bg-gray-50 border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-200 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onAdd}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Thumbnail */}
      <div className="aspect-square relative bg-gradient-to-br from-gray-100 to-gray-50 overflow-hidden">
        {asset.thumbnail_url ? (
          <img
            src={asset.thumbnail_url}
            alt={asset.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Box className="w-8 h-8 text-gray-300" />
          </div>
        )}

        {/* NGSS Badge */}
        {asset.ngss_standards && asset.ngss_standards.length > 0 && (
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-white shadow-sm">
              NGSS
            </span>
          </div>
        )}

        {/* Animation Badge */}
        {asset.has_animation && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500 text-white shadow-sm">
              Animated
            </span>
          </div>
        )}

        {/* Hover Overlay */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-emerald-600/90 flex items-center justify-center backdrop-blur-sm"
            >
              {isAdding ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-white/90">
                    Add to Scene
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info */}
      <div className="p-2.5">
        <h3
          className="text-xs font-semibold text-gray-800 truncate"
          style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
        >
          {asset.name}
        </h3>
        <p className="text-[10px] text-gray-400 truncate mt-0.5">
          {asset.category}
          {asset.subcategory ? ` / ${asset.subcategory}` : ""}
        </p>
      </div>
    </motion.div>
  );
}
