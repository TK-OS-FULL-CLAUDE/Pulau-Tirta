import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import raw from '../public/maps/pulau-tirta-v3.json';
import { bacaPeta, bisaBerdiri, interaksiTerdekat, langkahGerak, lokasiPada, misiPemulihan, kedalamanLayer } from '../src/game/map-data';

const dunia = bacaPeta(raw);
describe('World V3', () => {
  it('memakai empat atlas asli terpisah, GID tidak tumpang tindih, packed tanpa spacing', () => {
    expect([raw.width, raw.height, dunia.lebar, dunia.tinggi]).toEqual([192, 144, 3072, 2304]);
    expect(raw.tilesets.map((s) => [s.name, s.firstgid, s.tilecount])).toEqual([
      ['tiny_city', 1, 132], ['tiny_town', 133, 132], ['tiny_farm', 265, 132], ['tiny_battle', 397, 198],
    ]);
    for (const set of raw.tilesets) {
      expect([set.tilewidth, set.tileheight, set.margin, set.spacing]).toEqual([16, 16, 0, 0]);
      expect(existsSync(resolve('public/maps', set.image))).toBe(true);
      const used = raw.layers.some((l) => 'data' in l && l.data?.some((id) => id >= set.firstgid && id < set.firstgid + set.tilecount));
      expect(used).toBe(true);
    }
    expect(dunia.pemainTileset).toBe('tiny_city');
    expect(dunia.pemainFrame).toBe(108);
  });

  it('mempertahankan V1 dan sumber V3 yang dapat diedit', () => {
    const v1 = JSON.parse(readFileSync('world/maps/pulau_tirta.tmj', 'utf8'));
    const v3 = JSON.parse(readFileSync('world/maps/pulau_tirta_v3.tmj', 'utf8'));
    expect([v1.width, v1.height]).toEqual([72, 54]);
    expect(v3.layers).toEqual(raw.layers);
    expect(v3.tilesets.every((s: { source: string }) => existsSync(resolve('world/maps', s.source)))).toBe(true);
    expect(['TerrainDetails', 'Water', 'Landmarks', 'NPCSpawns', 'FuturePaths', 'DevelopmentAreas'].every((name) => raw.layers.some((l) => l.name === name))).toBe(true);
  });

  it('spawn, ID aplikasi, dan lima region sesuai kontrak', () => {
    expect(dunia.spawn).toEqual({ x: 1544, y: 1272 });
    expect(bisaBerdiri(dunia, dunia.spawn.x, dunia.spawn.y)).toBe(true);
    expect(dunia.interaksi.map((i) => i.misiId)).toEqual(['misi-1', 'misi-2', 'misi-3', 'misi-4', undefined]);
    for (const i of dunia.interaksi) {
      expect(lokasiPada(dunia, i.x, i.y).id).toBe(i.id);
      expect(bisaBerdiri(dunia, i.x, i.y), i.nama).toBe(true);
    }
  });

  it('recovery terrain, air, tanaman dan kanopi mengikuti empat status yang sama', () => {
    const recovery = dunia.peta.layers.filter((l) => l.name.startsWith('Recovery_'));
    expect(recovery).toHaveLength(16);
    for (const id of ['misi-1', 'misi-2', 'misi-3', 'misi-4']) {
      const layers = recovery.filter((l) => misiPemulihan(l) === id);
      expect(layers).toHaveLength(4);
      expect(layers.every((l) => !l.visible)).toBe(true);
      expect(kedalamanLayer(layers[0])).toBeLessThan(5);
      expect(kedalamanLayer(layers[1])).toBeLessThan(5);
      expect(kedalamanLayer(layers[2])).toBeGreaterThan(10);
      expect(kedalamanLayer(layers[3])).toBeGreaterThan(30);
    }
  });

  it('kelima tujuan dan jembatan dapat dijangkau dengan movement dan collision game', () => {
    const start = [96, 79];
    const queue = [start], seen = new Map([[start.join(','), 0]]);
    for (let n = 0; n < queue.length; n++) {
      const [x, y] = queue[n];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
        if (seen.has(key) || !bisaBerdiri(dunia, nx * 16 + 8, ny * 16 + 8)) continue;
        let p = { x: x * 16 + 8, y: y * 16 + 8 };
        for (let i = 0; i < 8; i++) p = langkahGerak(dunia, p, dx, dy, 2000 / 86);
        if (Math.hypot(p.x - (nx * 16 + 8), p.y - (ny * 16 + 8)) > 0.001) continue;
        queue.push([nx, ny]); seen.set(key, seen.get(`${x},${y}`)! + 1);
      }
    }
    expect(seen.size).toBeGreaterThan(10000);
    for (const i of dunia.interaksi) {
      const reachable = queue.filter(([x, y]) => interaksiTerdekat(dunia, x * 16 + 8, y * 16 + 8)?.id === i.id);
      expect(reachable.length, i.nama).toBeGreaterThan(0);
      // Jalur utama pendek: maksimal 30 detik jalan dari hub pada kecepatan 86 px/s.
      expect(Math.min(...reachable.map((p) => seen.get(p.join(','))!)) * 16 / 86, i.nama).toBeLessThan(30);
    }
    expect(seen.has('158,106'), 'tengah jembatan').toBe(true);
    expect(seen.has('165,110'), 'loop eksplorasi sebelah timur sungai').toBe(true);
  });

  it('indeks spatial hanya memeriksa penghalang terdekat dan collision tetap benar', () => {
    expect(dunia.penghalangPerSel.size).toBeGreaterThan(50);
    expect(Math.max(...Array.from(dunia.penghalangPerSel.values(), (list) => list.length))).toBeLessThan(dunia.penghalang.length / 3);
    for (const o of dunia.penghalang) expect(bisaBerdiri(dunia, o.x + o.width / 2, o.y + o.height / 2)).toBe(false);
    expect(bisaBerdiri(dunia, 8, 8)).toBe(false);
  });
});
