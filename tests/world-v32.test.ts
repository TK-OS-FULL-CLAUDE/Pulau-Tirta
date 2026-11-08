import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import raw from '../public/maps/pulau-tirta-v3-2.json';
import previous from '../public/maps/pulau-tirta-v3-1.json';
import buildings from '../world/buildings-v32.json';
import environment from '../world/environment-v32.json';
import baseline from '../world/v32-baseline.json';
import { bacaPeta, bisaBerdiri, langkahGerak, interaksiTerdekat, misiPemulihan, properti } from '../src/game/map-data';
const dunia = bacaPeta(raw);
describe('World V3.2 environment', () => {
  it('preserves V3.1 source, assets, runtime and contract coordinates', () => {
    for (const [file, hash] of Object.entries(baseline)) expect(createHash('sha256').update(readFileSync(file)).digest('hex'), file).toBe(hash);
    expect([raw.width, raw.height, raw.tilewidth, raw.tileheight]).toEqual([192, 144, 16, 16]);
    for (const name of ['Spawn', 'Interactions', 'Regions', 'NPCSpawns']) expect(raw.layers.find(l => l.name === name)).toEqual(previous.layers.find(l => l.name === name));
  });
  it('keeps seven complete houses and explicit building collisions', () => {
    expect(buildings).toHaveLength(7);
    const wall = raw.layers.find(l => l.name === 'Objects')!.data!;
    const roof = raw.layers.find(l => l.name === 'AbovePlayer')!.data!;
    const facade = raw.layers.find(l => l.name === 'Facades')!.data!;
    for (const b of buildings) {
      expect(roof[(b.y + 1) * 192 + b.door.x], b.name).toBe(133 + (b.roof.red ? 67 : 63));
      expect(facade[b.door.y * 192 + b.door.x]).toBe(133 + (b.coolWall ? 89 : 85));
      for (let dx = 0; dx < b.width; dx++) expect(wall[(b.y + 2) * 192 + b.x + dx]).toBeGreaterThan(0);
      expect(bisaBerdiri(dunia, (b.x + 1.5) * 16, (b.y + 2.5) * 16)).toBe(false);
    }
  });
  it('all missions, house doors, mountain switchbacks, overlooks, pier and forest loop are reachable using actual movement', () => {
    const queue = [[96, 79]], seen = new Set(['96,79']);
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
        if (seen.has(key) || !bisaBerdiri(dunia, nx * 16 + 8, ny * 16 + 8)) continue;
        let p = { x: x * 16 + 8, y: y * 16 + 8 };
        for (let n = 0; n < 8; n++) p = langkahGerak(dunia, p, dx, dy, 2000 / 86);
        if (Math.hypot(p.x - (nx * 16 + 8), p.y - (ny * 16 + 8)) > 0.001) continue;
        seen.add(key); queue.push([nx, ny]);
      }
    }
    expect(bisaBerdiri(dunia, dunia.spawn.x, dunia.spawn.y)).toBe(true);
    for (const target of dunia.interaksi) {
      expect(bisaBerdiri(dunia, target.x, target.y), target.nama).toBe(true);
      expect(queue.some(([x, y]) => interaksiTerdekat(dunia, x * 16 + 8, y * 16 + 8)?.id === target.id), target.nama).toBe(true);
    }
    for (const [x, y] of [...environment.villageDoors, ...environment.viewpoints, ...environment.exploration, ...environment.mountainRoute]) expect(seen.has(`${x},${y}`), `route ${x},${y}`).toBe(true);
    for (const b of buildings) expect(seen.has(`${b.door.x},${b.door.y + 1}`), b.name).toBe(true);
  });
  it('recovery remains mission-driven, local and collision-identical, including festival', () => {
    for (const id of ['misi-1', 'misi-2', 'misi-3', 'misi-4']) expect(raw.layers.filter(l => misiPemulihan(l) === id)).toHaveLength(4);
    const after = structuredClone(raw);
    for (const l of after.layers) if (misiPemulihan(l) || properti(l, 'festival')) l.visible = true;
    expect(bacaPeta(after).solid).toEqual(dunia.solid);
    expect(bacaPeta(after).penghalang).toEqual(dunia.penghalang);
    expect(raw.layers.filter(l => properti(l, 'festival'))).toHaveLength(3);
    for (const name of ['Recovery_Plants_Lembah_Hujan', 'Recovery_Plants_Puncak_Kabut', 'Recovery_Plants_Hutan_Sungai']) expect(raw.layers.find(l => l.name === name)!.data!.some(Boolean), name).toBe(true);
  });
  it('retains stone basins, stable bridge, small static fog and Kenney assets', () => {
    const objects = raw.layers.find(l => l.name === 'Objects')!.data!;
    for (const x of [50, 61]) expect(objects[102 * 192 + x]).toBe(595 + 58);
    expect(bisaBerdiri(dunia, 158 * 16 + 8, 106 * 16 + 8)).toBe(true);
    const oldPaths = previous.layers.find(l => l.name === 'Paths')!.data!;
    const paths = raw.layers.find(l => l.name === 'Paths')!.data!;
    for (let i = 0; i < oldPaths.length; i++) if ([601, 602].includes(oldPaths[i])) expect([601, 602].includes(paths[i]), `bridge tile ${i % 192},${Math.floor(i / 192)}`).toBe(true);
    const fog = raw.layers.find(l => l.name === 'Mountain_Mist_V32')!;
    expect(fog.opacity).toBeLessThanOrEqual(0.5);
    expect(fog.data!.filter(Boolean).length).toBeLessThan(30);
    expect(raw.tilesets.slice(0, 5)).toEqual(previous.tilesets);
    for (const b of dunia.penghalang.filter(o => o.name.startsWith('v32_'))) expect(bisaBerdiri(dunia, b.x + b.width / 2, b.y + b.height / 2), b.name).toBe(false);
  });
});
