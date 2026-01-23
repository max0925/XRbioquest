// @ts-nocheck
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, X } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';

// ═══════════════════════════════════════════════════════════════════════════
// OVERLAY COMPONENTS - Popup modals and notifications
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
          <div className="bg-purple-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">AI Environment Ready!</span>
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
      initial={{ scale: 0.9, opacity: 0, y: 50 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.9, opacity: 0, y: 50 }}
      className="fixed bottom-8 right-8 z-[240] w-[360px]"
    >
      <div className="bg-[#1e1e1e] border border-purple-500/50 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">AI Preview</h3>
              <p className="text-purple-400 text-[10px]">Ready to deploy</p>
            </div>
          </div>
          <button onClick={onDiscard} className="p-1.5 hover:bg-white/10 rounded-lg">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="relative rounded-xl overflow-hidden mb-4">
          <img src={data.imagePath} alt="AI Generated" className="w-full h-36 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <p className="absolute bottom-2 left-2 right-2 text-white text-[10px] line-clamp-2">{data.prompt}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onDiscard} className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/30">
            Discard
          </button>
          <button onClick={onDeploy} className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700">
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
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1e1e1e] border border-emerald-500/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">VR Scene Exported!</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <p className="text-gray-400 mb-5 text-sm">Share this link to view your creation in VR.</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-[#252526] rounded-xl p-4">
            <p className="text-[10px] uppercase font-semibold text-gray-500 mb-2">Shareable Link</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                readOnly
                className="flex-1 bg-[#1a1a1a] text-emerald-400 text-xs px-3 py-2 rounded-lg border border-[#444]"
              />
              <button
                onClick={() => navigator.clipboard.writeText(url)}
                className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium"
              >
                Copy
              </button>
            </div>
          </div>
          <div className="bg-[#252526] rounded-xl p-4 flex flex-col items-center">
            <p className="text-[10px] uppercase font-semibold text-gray-500 mb-2">QR Code</p>
            <div className="bg-white p-2 rounded-lg">
              <QRCodeSVG value={url} size={80} level="H" />
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.open(url, '_blank')}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-medium text-sm"
          >
            Open in VR
          </button>
          <button onClick={onClose} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
