import { properti, type ObjekTiled } from './map-data';
import type { NpcPlan } from './living-model';

/** Optional map-authored activity. Archived maps keep their original plan. */
export function villageActivity(marker: ObjekTiled, fallback: NpcPlan | undefined): NpcPlan | undefined {
  const encoded = properti(marker, 'villageActivity');
  if (!fallback || typeof encoded !== 'string') return fallback;
  try {
    const data = JSON.parse(encoded) as { tiles?: unknown; pauseMs?: unknown };
    if (!Array.isArray(data.tiles) || !data.tiles.length || data.tiles.length > 6 ||
        !data.tiles.every(t => Array.isArray(t) && t.length === 2 && t.every(n => typeof n === 'number' && Number.isFinite(n))) ||
        typeof data.pauseMs !== 'number' || !Number.isFinite(data.pauseMs) || data.pauseMs < 500 || data.pauseMs > 10000) return fallback;
    return { ...fallback, pauseMs: data.pauseMs, waypoints: data.tiles.map(([x, y]: number[]) => ({ x: x * 16 + 8, y: y * 16 + 8 })) };
  } catch { return fallback; }
}
