// hooks/useMeshyAI.ts
import { useCallback } from 'react';

const MESHY_DISABLED = false;

const CONFIG = {
  PREVIEW_TIMEOUT_ATTEMPTS: 60,  // 5 min for preview
  REFINE_TIMEOUT_ATTEMPTS: 90,   // 7.5 min for refine (texturing is slower)
  POLL_INTERVAL: 5000,
  QUALITY: 'high',
  TOPOLOGY: 'quad',
  MAX_CONCURRENT_GENERATIONS: 2,
};

let activeGenerations = 0;

export function useMeshyAI() {

  const pollStatus = async (
    taskId: string,
    onUpdate: (s: string, p: number) => void,
    maxAttempts: number = CONFIG.PREVIEW_TIMEOUT_ATTEMPTS
  ) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch(`/api/ai/model-status?taskId=${taskId}`);

        if (!res.ok) {
          const errorText = await res.text();
          let errorMsg = 'Status check failed';
          try {
            const errorData = JSON.parse(errorText);
            errorMsg = errorData.error || errorMsg;
          } catch {
            errorMsg = errorText || errorMsg;
          }
          // Don't throw on transient errors (504, 502) — just retry
          if (res.status >= 500) {
            console.warn(`[MESHY] Poll attempt ${i + 1}/${maxAttempts}: ${res.status} — retrying...`);
            onUpdate('RETRYING', 0);
            await new Promise(r => setTimeout(r, CONFIG.POLL_INTERVAL));
            continue;
          }
          throw new Error(errorMsg);
        }

        const data = await res.json();
        onUpdate(data.status, data.progress || 0);

        if (data.status === 'SUCCEEDED') {
          return {
            success: true,
            modelUrl: data.modelUrl,
            thumbnail: data.thumbnail,
            taskId: data.taskId,
            modelUrls: data.modelUrls,       // Full model_urls object from Meshy
            hasTextures: data.hasTextures,    // Whether texture_urls were present
          };
        }
        if (data.status === 'FAILED') return { success: false, error: data.error };
        if (data.status === 'EXPIRED') return { success: false, error: 'Task expired' };

        await new Promise(r => setTimeout(r, CONFIG.POLL_INTERVAL));
      } catch (e: any) {
        console.warn(`[MESHY] Poll error (attempt ${i + 1}):`, e.message);
        await new Promise(r => setTimeout(r, CONFIG.POLL_INTERVAL));
      }
    }
    return { success: false, error: 'Timeout waiting for model generation' };
  };

  const generate3DModel = useCallback(async (prompt: string, onStatus: (msg: string) => void) => {
    if (MESHY_DISABLED) {
      onStatus('Meshy AI is disabled for testing');
      return { success: false, error: 'Meshy AI is temporarily disabled', disabled: true };
    }

    if (activeGenerations >= CONFIG.MAX_CONCURRENT_GENERATIONS) {
      onStatus(`Queue: ${activeGenerations}/${CONFIG.MAX_CONCURRENT_GENERATIONS} generations active...`);
      return {
        success: false,
        error: `Max concurrent generations reached (${CONFIG.MAX_CONCURRENT_GENERATIONS}). Please wait.`,
        queued: true,
      };
    }

    activeGenerations++;
    onStatus(`[${activeGenerations}/${CONFIG.MAX_CONCURRENT_GENERATIONS}] Starting generation...`);

    try {
      // ── Step 1: Preview (geometry only, minimal textures) ──────────────
      onStatus(`[${activeGenerations}/${CONFIG.MAX_CONCURRENT_GENERATIONS}] Initializing geometry...`);
      const startReq = await fetch('/api/ai/generate-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          texture_quality: CONFIG.QUALITY,
          topology: CONFIG.TOPOLOGY,
        }),
      });

      if (startReq.status === 429) {
        activeGenerations--;
        const error = await startReq.json();
        onStatus(`Rate limit: ${error.current}/${error.limit} models active`);
        return { success: false, error: error.error, rateLimited: true };
      }

      if (!startReq.ok) {
        const errorText = await startReq.text();
        let errorMsg = 'Failed to start generation';
        try { errorMsg = JSON.parse(errorText).error || errorMsg; } catch {}
        activeGenerations--;
        onStatus(`Error: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const startRes = await startReq.json();
      if (!startRes.taskId) {
        activeGenerations--;
        throw new Error(startRes.error || 'No taskId received from Meshy API');
      }

      onStatus(`TaskId: ${startRes.taskId} — Sculpting geometry...`);

      const previewRes = await pollStatus(
        startRes.taskId,
        (s, p) => onStatus(`[${activeGenerations}/${CONFIG.MAX_CONCURRENT_GENERATIONS}] Sculpting: ${s} ${p}%`),
        CONFIG.PREVIEW_TIMEOUT_ATTEMPTS
      );

      if (!previewRes.success) {
        activeGenerations--;
        return previewRes;
      }

      // ── Step 2: Refine (PBR texture baking — this is where materials come from) ──
      onStatus(`[${activeGenerations}/${CONFIG.MAX_CONCURRENT_GENERATIONS}] Baking PBR textures...`);

      let refineReq;
      try {
        refineReq = await fetch('/api/ai/refine-model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ previewTaskId: startRes.taskId }),
        });
      } catch (err: any) {
        console.error('[MESHY] Refine request failed:', err.message);
        activeGenerations--;
        // Refine failed to start — return preview as last resort
        onStatus('Refine request failed — using preview model (may lack textures)');
        return { ...previewRes, warning: 'Refine failed, using preview GLB (no PBR textures)' };
      }

      if (!refineReq.ok) {
        const errorText = await refineReq.text();
        console.error('[MESHY] Refine API error:', errorText);
        activeGenerations--;
        onStatus('Refine API error — using preview model (may lack textures)');
        return { ...previewRes, warning: 'Refine API rejected, using preview GLB' };
      }

      const refineStart = await refineReq.json();

      if (!refineStart.taskId) {
        console.error('[MESHY] No refine taskId returned');
        activeGenerations--;
        return { ...previewRes, warning: 'No refine taskId, using preview GLB' };
      }

      onStatus(`[${activeGenerations}/${CONFIG.MAX_CONCURRENT_GENERATIONS}] Texturing: IN_PROGRESS...`);

      const refineRes = await pollStatus(
        refineStart.taskId,
        (s, p) => onStatus(`[${activeGenerations}/${CONFIG.MAX_CONCURRENT_GENERATIONS}] Texturing: ${s} ${p}%`),
        CONFIG.REFINE_TIMEOUT_ATTEMPTS
      );

      activeGenerations--;

      if (refineRes.success) {
        console.log('[MESHY] ✓ Refine complete — GLB has embedded PBR textures');
        return {
          ...refineRes,
          refineTaskId: refineStart.taskId,
        };
      }

      // Refine polling failed/timed out — fall back to preview
      console.warn('[MESHY] Refine failed, falling back to preview GLB (no textures):', refineRes.error);
      onStatus('Texture baking failed — using untextured model');
      return {
        ...previewRes,
        warning: `Refine failed: ${refineRes.error}. Using preview GLB without PBR textures.`,
      };

    } catch (error: any) {
      activeGenerations--;
      return { success: false, error: error.message };
    }
  }, []);

  return { generate3DModel };
}
