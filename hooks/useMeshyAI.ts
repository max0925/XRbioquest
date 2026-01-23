// hooks/useMeshyAI.ts
import { useCallback } from 'react';

const CONFIG = {
  TIMEOUT_ATTEMPTS: 60,
  POLL_INTERVAL: 5000,
  QUALITY: 'high',
  TOPOLOGY: 'quad'
};

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
    try {
      // 1. Preview
      onStatus('Initializing geometry...');
      const startRes = await fetch('/api/ai/generate-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          texture_quality: CONFIG.QUALITY, 
          topology: CONFIG.TOPOLOGY 
        })
      }).then(r => r.json());

      if (!startRes.taskId) throw new Error(startRes.error || 'Start failed');

      const previewRes = await pollStatus(startRes.taskId, (s, p) => 
        onStatus(`Sculpting: ${s} ${p}%`)
      );
      if (!previewRes.success) return previewRes;

      // 2. Refine (PBR)
      onStatus('Baking PBR textures (High Quality)...');
      const refineStart = await fetch('/api/ai/refine-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previewTaskId: startRes.taskId })
      }).then(r => r.json());

      if (refineStart.taskId) {
        const refineRes = await pollStatus(refineStart.taskId, (s, p) => 
          onStatus(`Refining: ${s} ${p}%`)
        );
        if (refineRes.success) return { ...refineRes, refineTaskId: refineStart.taskId };
      }

      return previewRes; // Fallback to preview if refine fails
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, []);

  return { generate3DModel };
}