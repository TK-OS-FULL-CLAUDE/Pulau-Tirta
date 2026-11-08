/** Pure living-world rules. Feet, speed and collision remain owned by map-data. */
import { bisaBerdiri, langkahGerak, type DataDunia, type InteraksiDunia } from './map-data';

export const LIVING = {
  npcLimit: 4, npcSpeed: 23, npcPauseMs: 1800, cameraMargin: 32,
  fogCount: 5, waterCount: 36, plantCount: 12, effectTickMs: 100,
  walkBobPx: 0.55, promptExitMargin: 8,
};
export type Facing = 'up' | 'down' | 'left' | 'right';
export interface Feet { x: number; y: number }
export interface NpcPlan { id: string; frame: number; waypoints: Feet[]; pauseMs: number }
const tile = (x: number, y: number): Feet => ({ x: x * 16 + 8, y: y * 16 + 8 });
export const NPC_PLANS: NpcPlan[] = [
  { id: 'village_npc_1', frame: 120, waypoints: [tile(87, 74), tile(87, 76), tile(87, 78), tile(90, 78)], pauseMs: 2200 },
  { id: 'village_npc_2', frame: 121, waypoints: [tile(107, 85)], pauseMs: 2400 },
  { id: 'village_npc_3', frame: 120, waypoints: [tile(104, 92), tile(104, 94), tile(100, 94)], pauseMs: 2600 },
  { id: 'village_npc_4', frame: 121, waypoints: [tile(94, 78), tile(94, 80), tile(93, 81)], pauseMs: 1600 },
];
export interface NpcState extends Feet {
  target: number; direction: number; waitMs: number; distance: number; facing: Facing; moving: boolean;
}
export function makeNpc(plan: NpcPlan): NpcState {
  return { ...plan.waypoints[0], target: plan.waypoints.length > 1 ? 1 : 0, direction: 1, waitMs: plan.pauseMs, distance: 0, facing: 'down', moving: false };
}
export function facingFor(dx: number, dy: number, previous: Facing): Facing {
  if (!dx && !dy) return previous;
  return Math.abs(dx) >= Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'up' : 'down';
}
/** No random wandering, teleport, pathfinding or dynamic NPC collision. Mutates one tiny state. */
export function tickNpc(state: NpcState, plan: NpcPlan, world: DataDunia, dt: number, active: boolean, player: Feet): void {
  state.moving = false;
  if (!active || !Number.isFinite(dt)) return;
  dt = Math.max(0, Math.min(dt, 40));
  if (plan.waypoints.length < 2 || Math.hypot(player.x - state.x, player.y - state.y) < 14) return;
  if (state.waitMs > 0) { state.waitMs = Math.max(0, state.waitMs - dt); return; }
  const target = plan.waypoints[state.target], dx = target.x - state.x, dy = target.y - state.y;
  const remaining = Math.hypot(dx, dy);
  if (remaining < 0.25) {
    state.x = target.x; state.y = target.y;
    if (state.target === plan.waypoints.length - 1) state.direction = -1;
    if (state.target === 0) state.direction = 1;
    state.target += state.direction; state.waitMs = plan.pauseMs; return;
  }
  const step = Math.min(dt * LIVING.npcSpeed / 86, remaining * 1000 / 86);
  const next = langkahGerak(world, state, dx, dy, step);
  // Yield before an interaction clearing; never use mission access as a patrol route.
  if (world.interaksi.some(i => Math.hypot(next.x - i.x, next.y - i.y) < i.radius + 12)) { state.waitMs = LIVING.npcPauseMs; return; }
  const moved = Math.hypot(next.x - state.x, next.y - state.y);
  if (moved < 0.001) { state.waitMs = LIVING.npcPauseMs; return; }
  state.facing = facingFor(next.x - state.x, next.y - state.y, state.facing);
  state.x = next.x; state.y = next.y; state.distance += moved; state.moving = true;
}

/** Cosmetic displacement only: never feed this offset to movement or camera follow. */
export function actorPose(distance: number, timeMs: number, moving: boolean, frozen = false) {
  if (frozen) return { y: 0, scaleY: 1 };
  return moving
    ? { y: -Math.abs(Math.sin(distance * Math.PI / 9)) * LIVING.walkBobPx, scaleY: 1 }
    : { y: 0, scaleY: 1 + Math.sin(timeMs / 900) * 0.008 };
}

/** Sticky label uses a slightly wider exit radius; actual keyboard action stays at original radius. */
export function promptTarget(world: DataDunia, feet: Feet, current?: InteraksiDunia): InteraksiDunia | undefined {
  if (current && Math.hypot(feet.x - current.x, feet.y - current.y) <= current.radius + LIVING.promptExitMargin) return current;
  let nearest: InteraksiDunia | undefined, best = Infinity;
  for (const i of world.interaksi) {
    const d = Math.hypot(feet.x - i.x, feet.y - i.y);
    if (d <= i.radius && d < best) { best = d; nearest = i; }
  }
  return nearest;
}

export function validateNpcPlan(world: DataDunia, plan: NpcPlan): boolean {
  if (!plan.waypoints.length) return false;
  for (let i = 0; i < plan.waypoints.length; i++) {
    const a = plan.waypoints[i], b = plan.waypoints[Math.min(i + 1, plan.waypoints.length - 1)];
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
    for (let n = 0; n <= steps; n++) {
      const x = a.x + (b.x - a.x) * n / steps, y = a.y + (b.y - a.y) * n / steps;
      if (!bisaBerdiri(world, x, y) || world.interaksi.some(t => Math.hypot(t.x - x, t.y - y) < t.radius + 12)) return false;
    }
  }
  return true;
}
