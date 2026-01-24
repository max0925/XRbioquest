// lib/meshyRateLimit.ts
// ═══════════════════════════════════════════════════════════════════════════
// SERVER-SIDE RATE LIMITING - Hard limit: max 2 models per session
// Shared module for tracking active Meshy AI generations per IP
// ═══════════════════════════════════════════════════════════════════════════

const MAX_MODELS_PER_SESSION = 2;
const activeGenerationsMap = new Map<string, number>();

// Clean up stale entries every 10 minutes
if (typeof global !== 'undefined' && !global.meshyCleanupInterval) {
  global.meshyCleanupInterval = setInterval(() => {
    activeGenerationsMap.clear();
  }, 10 * 60 * 1000);
}

export function getClientId(headers: Headers): string {
  // Use IP address as client identifier
  const forwarded = headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] :
             headers.get('x-real-ip') ||
             'unknown';
  return ip;
}

export function checkRateLimit(clientId: string): { allowed: boolean; current: number; limit: number } {
  const currentCount = activeGenerationsMap.get(clientId) || 0;
  return {
    allowed: currentCount < MAX_MODELS_PER_SESSION,
    current: currentCount,
    limit: MAX_MODELS_PER_SESSION
  };
}

export function incrementGeneration(clientId: string): void {
  const current = activeGenerationsMap.get(clientId) || 0;
  activeGenerationsMap.set(clientId, current + 1);
}

export function decrementGeneration(clientId: string): void {
  const current = activeGenerationsMap.get(clientId) || 0;
  if (current > 0) {
    activeGenerationsMap.set(clientId, current - 1);
  }
}

export function getActiveCount(clientId: string): number {
  return activeGenerationsMap.get(clientId) || 0;
}

// Extend global type for TypeScript
declare global {
  var meshyCleanupInterval: NodeJS.Timeout | undefined;
}
