// hooks/useMeshyAI.ts
import { useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// MESHY API GUARD - Set to true to disable all Meshy AI calls for testing
// ═══════════════════════════════════════════════════════════════════════════
const MESHY_DISABLED = false; // ✅ RE-ENABLED with safety limits

const CONFIG = {
  TIMEOUT_ATTEMPTS: 60,
  POLL_INTERVAL: 5000,
  QUALITY: 'high',
  TOPOLOGY: 'quad',
  MAX_CONCURRENT_GENERATIONS: 2 // 🔒 Cost control: max 2 concurrent generations
};

// Global tracker for concurrent generations
let activeGenerations = 0;
const generationQueue: Array<() => void> = [];

export function useMeshyAI() {
  
  const pollStatus = async (taskId: string, onUpdate: (s: string, p: number) => void) => {
    for (let i = 0; i < CONFIG.TIMEOUT_ATTEMPTS; i++) {
      try {
        const res = await fetch(`/api/ai/model-status?taskId=${taskId}`);
        const data = await res.json();
        onUpdate(data.status, data.progress || 0);
        
        if (data.status === 'SUCCEEDED') return { success: true, ...data };
        if (data.status === 'FAILED') return { success: false, error: data.error };
        
        await new Promise(r => setTimeout(r, CONFIG.POLL_INTERVAL));
      } catch (e) {
        await new Promise(r => setTimeout(r, CONFIG.POLL_INTERVAL));
      }
    }
    return { success: false, error: 'Timeout' };
  };

  const generate3DModel = useCallback(async (prompt: string, onStatus: (msg: string) => void) => {
    // Guard: Return immediately if Meshy is disabled
    if (MESHY_DISABLED) {
      onStatus('Meshy AI is disabled for testing');
      return {
        success: false,
        error: 'Meshy AI is temporarily disabled for testing',
        disabled: true
      };
    }

    // 🔒 Concurrent limit check
    if (activeGenerations >= CONFIG.MAX_CONCURRENT_GENERATIONS) {
      onStatus(`Queue: ${activeGenerations}/${CONFIG.MAX_CONCURRENT_GENERATIONS} generations active...`);
      return {
        success: false,
        error: `Max concurrent generations reached (${CONFIG.MAX_CONCURRENT_GENERATIONS}). Please wait for current models to complete.`,
        queued: true
      };
    }

    // Track active generation
    activeGenerations++;
    onStatus(`[${activeGenerations}/${CONFIG.MAX_CONCURRENT_GENERATIONS}] Starting generation...`);

    try {
      // 1. Preview
      onStatus(`[${activeGenerations}/${CONFIG.MAX_CONCURRENT_GENERATIONS}] Initializing geometry...`);
      const startReq = await fetch('/api/ai/generate-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          texture_quality: CONFIG.QUALITY,
          topology: CONFIG.TOPOLOGY
        })
      });

      // Handle 429 rate limit
      if (startReq.status === 429) {
        activeGenerations--;
        const error = await startReq.json();
        onStatus(`Rate limit: ${error.current}/${error.limit} models active`);
        return { success: false, error: error.error, rateLimited: true };
      }

      const startRes = await startReq.json();
      if (!startRes.taskId) throw new Error(startRes.error || 'Start failed');

      const previewRes = await pollStatus(startRes.taskId, (s, p) =>
        onStatus(`[${activeGenerations}/${CONFIG.MAX_CONCURRENT_GENERATIONS}] Sculpting: ${s} ${p}%`)
      );
      if (!previewRes.success) {
        activeGenerations--;
        return previewRes;
      }

      // 2. Refine (PBR)
      onStatus(`[${activeGenerations}/${CONFIG.MAX_CONCURRENT_GENERATIONS}] Baking PBR textures...`);
      const refineStart = await fetch('/api/ai/refine-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previewTaskId: startRes.taskId })
      }).then(r => r.json());

      if (refineStart.taskId) {
        const refineRes = await pollStatus(refineStart.taskId, (s, p) =>
          onStatus(`[${activeGenerations}/${CONFIG.MAX_CONCURRENT_GENERATIONS}] Refining: ${s} ${p}%`)
        );
        activeGenerations--;
        if (refineRes.success) return { ...refineRes, refineTaskId: refineStart.taskId };
      }

      activeGenerations--;
      return previewRes; // Fallback to preview if refine fails
    } catch (error: any) {
      activeGenerations--;
      return { success: false, error: error.message };
    }
  }, []);

  return { generate3DModel };
}