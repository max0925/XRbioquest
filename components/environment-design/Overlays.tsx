// @ts-nocheck
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, X } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';

// ═══════════════════════════════════════════════════════════════════════════
// OVERLAY COMPONENTS - Minimal, Manus-style modals and notifications
// ═══════════════════════════════════════════════════════════════════════════

export function SuccessNotification({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-[250]"
        >
          <div className="bg-[#1a1a1a] text-white px-5 py-3 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.3)] border border-white/10 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="font-medium text-sm">AI Environment Ready</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface AIPreviewCardProps {
  show: boolean;
  data: { imagePath: string; prompt: string } | null;
  onDeploy: () => void;
  onDiscard: () => void;
}

export function AIPreviewCard({ show, data, onDeploy, onDiscard }: AIPreviewCardProps) {
  if (!show || !data) return null;
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.95, opacity: 0, y: 20 }}
      className="fixed bottom-6 right-6 z-[240] w-[340px]"
    >
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">AI Preview</h3>
              <p className="text-white/50 text-xs">Ready to deploy</p>
            </div>
          </div>
          <button onClick={onDiscard} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>
        <div className="relative rounded-xl overflow-hidden mb-3 border border-white/10">
          <img src={data.imagePath} alt="AI Generated" className="w-full h-32 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <p className="absolute bottom-2 left-2 right-2 text-white text-xs line-clamp-2 font-medium">{data.prompt}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onDiscard} className="flex-1 py-2.5 bg-white/5 text-white/70 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors">
            Discard
          </button>
          <button onClick={onDeploy} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors">
            Add to Scene
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface ExportPopupProps {
  show: boolean;
  url: string;
  onClose: () => void;
}

export function ExportPopup({ show, url, onClose }: ExportPopupProps) {
  if (!show) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-[460px] w-full shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-white">VR Scene Exported</h2>
            <p className="text-white/50 text-sm mt-1">Share this link to view in VR</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 mb-6">
          {/* Shareable Link Section */}
          <div className="bg-black/20 border border-white/5 rounded-xl p-4">
            <p className="text-xs font-medium text-white/40 mb-3">Shareable Link</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                readOnly
                className="flex-1 bg-black/30 text-white/90 text-sm px-3 py-2.5 rounded-lg border border-white/10 min-w-0 focus:outline-none focus:border-emerald-500/50"
              />
              <button
                onClick={() => navigator.clipboard.writeText(url)}
                className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors whitespace-nowrap"
              >
                Copy
              </button>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="bg-black/20 border border-white/5 rounded-xl p-4 flex flex-col items-center">
            <p className="text-xs font-medium text-white/40 mb-3">QR Code</p>
            <div className="bg-white p-3 rounded-lg">
              <QRCodeSVG value={url} size={96} level="H" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => window.open(url, '_blank')}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
          >
            Open in VR
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
