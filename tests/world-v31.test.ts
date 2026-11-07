import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import raw from '../public/maps/pulau-tirta-v3-1.json';
import previous from '../public/maps/pulau-tirta-v3.json';
import buildings from '../world/buildings-v31.json';
import baseline from '../world/v31-baseline.json';
import { bacaPeta, bisaBerdiri, langkahGerak, interaksiTerdekat, kedalamanLayer, properti } from '../src/game/map-data';
const dunia = bacaPeta(raw);

describe('World V3.1 art pass', () => {
  it('V3, runtime cadangan, TSJ dan generator V3 tetap identik dengan baseline', () => {
    for (const [file, hash] of Object.entries(baseline)) expect(createHash('sha256').update(readFileSync(file)).digest('hex'), file).toBe(hash);
  });

  it('ukuran, spawn, lima region dan kontrak interaksi tidak berubah', () => {
    expect([raw.width, raw.height, raw.tilewidth, raw.tileheight]).toEqual([192, 144, 16, 16]);
    for (const name of ['Spawn', 'Interactions', 'Regions']) expect(raw.layers.find((l) => l.name === name)).toEqual(previous.layers.find((l) => l.name === name));
  });

  it('tujuh rumah memiliki dinding di bawah jendela/pintu dan gable tersambung', () => {
    expect(buildings).toHaveLength(7);
    const walls = dunia.peta.layers.find((l) => l.name === 'Objects')!;
    const roof = dunia.peta.layers.find((l) => l.name === 'AbovePlayer')!;
    const facade = dunia.peta.layers.find((l) => l.name === 'Facades')!;
    expect(kedalamanLayer(roof)).toBeGreaterThan(20);
    expect(kedalamanLayer(facade)).toBeLessThan(20);
    for (const b of buildings) {
      const center = b.x + Math.floor(b.width / 2);
      expect(roof.data![(b.y + 1) * raw.width + center]).toBe(133 + (b.roof.red ? 67 : 63));
      const row = facade.data!.slice((b.y + 3) * raw.width + b.x, (b.y + 3) * raw.width + b.x + b.width);
      expect(row.filter(Boolean)).toHaveLength(1);
      expect(row[Math.floor(b.width / 2)]).toBe(133 + (b.coolWall ? 89 : 85));
      for (let dy = 2; dy < 4; dy++) for (let dx = 0; dx < b.width; dx++) expect(walls.data![(b.y + dy) * raw.width + b.x + dx]).toBeGreaterThan(0);
    }
  });

  it('pad lantai abu-abu sudah dihapus; kolam dan cermin memakai props khusus', () => {
    const paths = dunia.peta.layers.find((l) => l.name === 'Paths')!;
    expect(paths.data!.includes(1 + 88)).toBe(false);
    const objects = dunia.peta.layers.find((l) => l.name === 'Objects')!;
    for (const x of [50, 61]) {
      expect(objects.data![102 * raw.width + x]).toBe(595 + 58);
      expect(bisaBerdiri(dunia, (x + 2.5) * 16, 104.5 * 16)).toBe(false);
    }
    expect(objects.data![100 * raw.width + 58]).toBe(595 + 52);
    expect(bisaBerdiri(dunia, 920, 1672)).toBe(true);
  });

  it('atlas tambahan SVG memiliki tile air/bridge yang valid dan tetap terpisah', () => {
    const props = raw.tilesets.find((s) => s.name === 'tirta_props')!;
    expect([props.firstgid, props.tilecount, props.columns]).toEqual([595, 160, 16]);
    expect(props.image.endsWith('.svg')).toBe(true);
    expect(readFileSync('world/assets/tirta_props/tileset.svg', 'utf8')).toContain('shape-rendering="crispEdges"');
    expect(dunia.pemainTileset).toBe('tiny_city');
    expect(dunia.pemainFrame).toBe(108);
  });

  it('dekorasi festival terpisah dari recovery misi dan tidak membuat collider baru', () => {
    const layers = dunia.peta.layers.filter((l) => properti(l, 'festival') === true);
    expect(layers).toHaveLength(3);
    expect(layers.every((l) => !l.visible && !l.name.startsWith('Recovery_'))).toBe(true);
    const after = structuredClone(raw);
    for (const l of after.layers) if (l.name.startsWith('Recovery_') || l.name.startsWith('Celebration_')) l.visible = true;
    expect(bacaPeta(after).solid).toEqual(dunia.solid);
    expect(bisaBerdiri(dunia, dunia.spawn.x, dunia.spawn.y)).toBe(true);
  });

  it('lima tujuan, seluruh pintu rumah dan jembatan masih dapat dicapai', () => {
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
    for (const target of dunia.interaksi) expect(queue.some(([x, y]) => interaksiTerdekat(dunia, x * 16 + 8, y * 16 + 8)?.id === target.id), target.nama).toBe(true);
    for (const b of buildings) expect(seen.has(`${b.door.x},${b.door.y + 1}`), `pintu ${b.name}`).toBe(true);
    expect(seen.has('158,106'), 'jembatan').toBe(true);
    expect(seen.has('165,110'), 'sisi timur sungai').toBe(true);
  });
});
