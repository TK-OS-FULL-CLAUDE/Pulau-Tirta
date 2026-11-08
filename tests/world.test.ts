import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import runtime from '../public/maps/pulau-tirta.json';
import { bacaPeta, bisaBerdiri, interaksiTerdekat, langkahGerak, lokasiPada, PEMULIHAN, type PetaTiled } from '../src/game/map-data';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dunia = bacaPeta(runtime);
const salin = () => structuredClone(runtime) as PetaTiled;

describe('ekspor dan kontrak world', () => {
  it('hasil ekspor dan gambar sesuai sumber editor; ekspor ulang deterministik', () => {
    const hasil = spawnSync(process.execPath, ['scripts/export-world.mjs', '--check'], { cwd: root, encoding: 'utf8' });
    expect(hasil.stderr).toBe('');
    expect(hasil.status).toBe(0);
    for (const set of runtime.tilesets) expect(existsSync(resolve(root, 'public/maps', set.image))).toBe(true);
    const sumber = JSON.parse(readFileSync(resolve(root, 'world/maps/pulau_tirta.tmj'), 'utf8'));
    expect(runtime.layers).toEqual(sumber.layers);
    expect(runtime.tilesets).toHaveLength(2);
    expect(runtime.tilesets.every((s) => !('source' in s))).toBe(true);
  });

  it('membaca dimensi, spawn, pusat interaksi, dan pemetaan M1–M5', () => {
    expect([dunia.lebar, dunia.tinggi]).toEqual([1152, 864]);
    expect(dunia.spawn).toEqual({ x: 584, y: 488 });
    expect(dunia.lokasi[0].id).toBe('desa');
    expect(dunia.interaksi.map((i) => [i.id, i.misiId, i.x, i.y, i.radius])).toEqual([
      ['pantai', 'misi-1', 200, 568, 30],
      ['puncak', 'misi-2', 344, 200, 30],
      ['lembah', 'misi-3', 872, 280, 30],
      ['hutan', 'misi-4', 856, 664, 30],
      ['desa', undefined, 616, 488, 30],
    ]);
    expect(Object.values(PEMULIHAN)).toEqual(['misi-1', 'misi-2', 'misi-3', 'misi-4']);
  });

  it.each(['Ground', 'Paths', 'Objects', 'AbovePlayer', 'Collisions', 'Interactions', 'Regions', 'Spawn', ...Object.keys(PEMULIHAN)])('menolak layer wajib yang hilang: %s', (nama) => {
    const peta = salin();
    peta.layers = peta.layers.filter((l) => l.name !== nama);
    expect(() => bacaPeta(peta)).toThrow(nama);
  });

  it('menolak format eksternal, ukuran layer, GID, dan ID misi yang salah', () => {
    const eksternal = salin(); eksternal.tilesets[0].source = 'terrain.tsj';
    expect(() => bacaPeta(eksternal)).toThrow('embedded');
    const dimensi = salin(); dimensi.layers[0].data!.pop();
    expect(() => bacaPeta(dimensi)).toThrow('dimensi');
    const gid = salin(); gid.layers[0].data![0] = 999;
    expect(() => bacaPeta(gid)).toThrow('GID');
    const id = salin(); id.layers.find((l) => l.name === 'Interactions')!.objects![0].properties!.find((p) => p.name === 'missionId')!.value = 'M99';
    expect(() => bacaPeta(id)).toThrow('M99');
  });

  it('menolak interaksi duplikat dan spawn di penghalang', () => {
    const duplikat = salin();
    const objects = duplikat.layers.find((l) => l.name === 'Interactions')!.objects!;
    objects[1].properties = structuredClone(objects[0].properties);
    expect(() => bacaPeta(duplikat)).toThrow('unik');
    const spawn = salin();
    const titik = spawn.layers.find((l) => l.name === 'Spawn')!.objects![0];
    titik.x = 0; titik.y = 0;
    expect(() => bacaPeta(spawn)).toThrow('spawn');
  });
});

describe('navigasi dan collision', () => {
  it('spawn aman; air, world bounds, bangunan dan batang pohon memblokir pemain', () => {
    expect(bisaBerdiri(dunia, 584, 488)).toBe(true);
    expect(bisaBerdiri(dunia, 8, 8)).toBe(false);
    expect(bisaBerdiri(dunia, -10, 488)).toBe(false);
    expect(bisaBerdiri(dunia, dunia.lebar, 488)).toBe(false);
    for (const o of dunia.penghalang) expect(bisaBerdiri(dunia, o.x + o.width / 2, o.y + o.height / 2)).toBe(false);
  });

  it('lima interaksi dapat dicapai dari spawn menggunakan collider dan movement runtime', () => {
    const start = [Math.floor(dunia.spawn.x / 16), Math.floor(dunia.spawn.y / 16)];
    const antrean = [start];
    const dilalui = new Set([start.join(',')]);
    for (let i = 0; i < antrean.length; i++) {
      const [x, y] = antrean[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
        if (dilalui.has(key) || !bisaBerdiri(dunia, nx * 16 + 8, ny * 16 + 8)) continue;
        let posisi = { x: x * 16 + 8, y: y * 16 + 8 };
        // Satu tile ditempuh dalam 8 frame; semua langkah memakai fungsi game.
        for (let n = 0; n < 8; n++) posisi = langkahGerak(dunia, posisi, dx, dy, 1000 * 2 / 86);
        if (Math.hypot(posisi.x - (nx * 16 + 8), posisi.y - (ny * 16 + 8)) > 0.001) continue;
        dilalui.add(key); antrean.push([nx, ny]);
      }
    }
    expect(dilalui.size).toBeGreaterThan(1000);
    for (const target of dunia.interaksi) {
      expect(antrean.some(([x, y]) => interaksiTerdekat(dunia, x * 16 + 8, y * 16 + 8)?.id === target.id), target.nama).toBe(true);
    }
  });

  it('gerak diagonal sama cepat, delta dibatasi dan tidak menembus bangunan', () => {
    const posisi = dunia.spawn;
    const lurus = langkahGerak(dunia, posisi, 1, 0, 40);
    const diagonal = langkahGerak(dunia, posisi, 1, 1, 40);
    expect(Math.hypot(diagonal.x - posisi.x, diagonal.y - posisi.y)).toBeCloseTo(lurus.x - posisi.x);
    expect(langkahGerak(dunia, posisi, 1, 0, 5000)).toEqual(lurus);
    expect(langkahGerak(dunia, posisi, 1, 0, -1)).toEqual(posisi);
    let dekat = { x: 488, y: 380 };
    for (let i = 0; i < 100; i++) dekat = langkahGerak(dunia, dekat, 1, 0, 40);
    expect(dekat.x).toBeLessThan(496 - 4.6);
    expect(bisaBerdiri(dunia, dekat.x, dekat.y)).toBe(true);
  });

  it('region memperbarui konteks tanpa interaksi; jalan di luar region kembali ke hub', () => {
    for (const target of dunia.interaksi) expect(lokasiPada(dunia, target.x, target.y).id).toBe(target.id);
    expect(lokasiPada(dunia, 600, 100).id).toBe('desa');
    expect(interaksiTerdekat(dunia, 584, 488)).toBeUndefined();
    expect(interaksiTerdekat(dunia, 616, 488)?.id).toBe('desa');
  });
});
