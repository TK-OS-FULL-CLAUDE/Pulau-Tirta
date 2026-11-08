import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import baseline from '../world/v33-baseline.json';
import { DUNIA } from '../src/game/world-map';
import { bisaBerdiri, interaksiTerdekat } from '../src/game/map-data';
import { actorPose, facingFor, LIVING, makeNpc, NPC_PLANS, promptTarget, tickNpc, validateNpcPlan } from '../src/game/living-model';

describe('Living World V3.3', () => {
  it('keeps all uncommitted V3.2 terrain, coordinates and assets intact', () => {
    for (const [file, hash] of Object.entries(baseline)) expect(createHash('sha256').update(readFileSync(file)).digest('hex'), file).toBe(hash);
  });
  it('uses four local decorative plans with validated collision-safe segments', () => {
    expect(NPC_PLANS).toHaveLength(4);
    expect(NPC_PLANS.filter(p => p.waypoints.length > 1)).toHaveLength(3);
    for (const p of NPC_PLANS) expect(validateNpcPlan(DUNIA, p), p.id).toBe(true);
    expect(validateNpcPlan(DUNIA, { ...NPC_PLANS[0], waypoints: [{ x: 10, y: 10 }] })).toBe(false);
  });
  it('simulates three minutes without leaving local patrol bounds, colliding or entering mission clearings', () => {
    for (const plan of NPC_PLANS) {
      const state = makeNpc(plan), minX = Math.min(...plan.waypoints.map(p => p.x)), maxX = Math.max(...plan.waypoints.map(p => p.x));
      const minY = Math.min(...plan.waypoints.map(p => p.y)), maxY = Math.max(...plan.waypoints.map(p => p.y));
      const targets = new Set<number>(), modes = new Set<boolean>();
      for (let i = 0; i < 4500; i++) {
        tickNpc(state, plan, DUNIA, 40, true, { x: 0, y: 0 });
        if (!bisaBerdiri(DUNIA, state.x, state.y)) throw Error(`${plan.id} collision at ${i}`);
        if (state.x < minX - .25 || state.x > maxX + .25 || state.y < minY - .25 || state.y > maxY + .25) throw Error(`${plan.id} escaped local area`);
        if (DUNIA.interaksi.some(t => Math.hypot(t.x - state.x, t.y - state.y) < t.radius + 12)) throw Error(`${plan.id} entered mission area`);
        targets.add(state.target); modes.add(state.moving);
      }
      if (plan.waypoints.length > 1) { expect(targets.size).toBeGreaterThan(1); expect(modes.size).toBe(2); }
      else expect(state.distance).toBe(0);
    }
  });
  it('freezes offscreen or paused NPC state, clamps delta and yields to the player without becoming a collider', () => {
    const plan = NPC_PLANS[0], state = makeNpc(plan), start = structuredClone(state);
    tickNpc(state, plan, DUNIA, 99999, false, { x: 0, y: 0 }); expect(state).toEqual(start);
    state.waitMs = 0;
    tickNpc(state, plan, DUNIA, 1000, true, state); expect(state.distance).toBe(0);
    tickNpc(state, plan, DUNIA, 1000, true, { x: 0, y: 0 }); expect(state.distance).toBeCloseTo(LIVING.npcSpeed * .04);
    expect(bisaBerdiri(DUNIA, start.x, start.y)).toBe(true);
  });
  it('keeps a bounded cosmetic walk offset, neutral pause and stable facing at idle', () => {
    for (let n = 0; n < 100; n++) {
      const pose = actorPose(n, n * 40, true);
      expect(Math.abs(pose.y)).toBeLessThanOrEqual(.55); expect(pose.scaleY).toBe(1);
    }
    expect(actorPose(20, 500, false).y).toBe(0);
    expect(actorPose(20, 500, true, true)).toEqual({ y: 0, scaleY: 1 });
    expect(facingFor(0, 0, 'left')).toBe('left'); expect(facingFor(0, -1, 'left')).toBe('up');
    expect(facingFor(0, 1, 'up')).toBe('down'); expect(facingFor(-1, 0, 'down')).toBe('left');
  });
  it('uses hysteresis for prompt visibility without enlarging actual mission action radius', () => {
    const t = DUNIA.interaksi[0], inside = { x: t.x + t.radius - 1, y: t.y };
    const edge = { x: t.x + t.radius + 2, y: t.y };
    expect(promptTarget(DUNIA, inside)?.id).toBe(t.id);
    expect(promptTarget(DUNIA, edge, t)?.id).toBe(t.id);
    expect(interaksiTerdekat(DUNIA, edge.x, edge.y)).toBeUndefined();
    expect(promptTarget(DUNIA, { x: t.x + t.radius + 9, y: t.y }, t)).toBeUndefined();
  });
});
