import { describe, expect, it } from 'vitest';
import { MISI_UTAMA } from '../shared/content';
import { periksaKeluar } from '../shared/guardrail';
import { mulaiMisi, progresAwal, type Progres } from '../shared/missions';
import { PANJANG_BARIS_MAKS, WARGA, naskahDesa, naskahPenduduk, semuaPembicara, type Baris } from '../shared/warga';
import { NPC_PLANS } from '../src/game/living-model';

const KEADAAN = ['sebelum', 'sesudah', 'festival', 'tamat'] as const;
const barisPenduduk: Baris[] = Object.entries(WARGA.penduduk).flatMap(([id, w]) =>
  KEADAAN.flatMap((k) => w[k].map((b) => (typeof b === 'string' ? { siapa: id, teks: b } : b))),
);

const semua: Baris[] = [
  ...barisPenduduk,
  ...WARGA.pembuka,
  ...Object.values(WARGA.arahan).flat(),
  ...WARGA.ajakanFestival,
  ...WARGA.sesudahFestival,
];

describe('naskah warga', () => {
  it('setiap baris punya pembicara yang dikenal dan muat dalam 2 baris', () => {
    for (const b of semua) {
      expect(semuaPembicara()[b.siapa], b.teks).toBeDefined();
      expect(b.teks.length, b.teks).toBeLessThanOrEqual(PANJANG_BARIS_MAKS);
    }
  });

  it('ada arahan untuk setiap misi', () => {
    for (const m of MISI_UTAMA) expect(WARGA.arahan[m.id]?.length, m.id).toBeGreaterThan(0);
  });

  it('pembuka tidak membocorkan jawaban misi mana pun', () => {
    for (const m of MISI_UTAMA) {
      for (const b of WARGA.pembuka) {
        expect(periksaKeluar(b.teks, { misi: m, tingkat: 1 }), `${m.id}: ${b.teks}`).toMatchObject({ aman: true });
      }
    }
  });

  it('arahan ke sebuah misi tidak membocorkan jawaban misi itu', () => {
    for (const m of MISI_UTAMA) {
      for (const b of WARGA.arahan[m.id]) {
        expect(periksaKeluar(b.teks, { misi: m, tingkat: 1 }), `${m.id}: ${b.teks}`).toMatchObject({ aman: true });
      }
    }
  });
});

describe('naskahDesa', () => {
  const selesai = (p: Progres, ...ids: string[]): Progres => ({
    ...p,
    status: { ...p.status, ...Object.fromEntries(ids.map((id) => [id, 'selesai' as const])) },
  });

  it('mengarahkan ke misi pertama yang belum selesai', () => {
    expect(naskahDesa(progresAwal())).toEqual({ jenis: 'arahan', baris: WARGA.arahan['misi-1'] });
    const p = mulaiMisi(selesai(progresAwal(), 'misi-1', 'misi-2'), 'misi-4');
    expect(naskahDesa(p)).toEqual({ jenis: 'arahan', baris: WARGA.arahan['misi-3'] });
  });

  it('mengajak ke Festival kalau keempat misi selesai, lalu berterima kasih sesudahnya', () => {
    const p = selesai(progresAwal(), 'misi-1', 'misi-2', 'misi-3', 'misi-4');
    expect(naskahDesa(p).jenis).toBe('festival');
    expect(naskahDesa({ ...p, festivalSelesai: true }).jenis).toBe('sesudah');
  });
});

describe('penduduk desa (PRD F-03: semua warga bisa diajak bicara)', () => {
  const selesai = (p: Progres, ...ids: string[]): Progres => ({
    ...p,
    status: { ...p.status, ...Object.fromEntries(ids.map((id) => [id, 'selesai' as const])) },
  });

  it('setiap warga yang berjalan di desa punya naskah, dan setiap naskah punya warganya', () => {
    expect(Object.keys(WARGA.penduduk).sort()).toEqual(NPC_PLANS.map((p) => p.id).sort());
  });

  it('setiap penduduk peduli pada misi yang ada dan punya naskah untuk keempat keadaan', () => {
    for (const [id, w] of Object.entries(WARGA.penduduk)) {
      expect(MISI_UTAMA.some((m) => m.id === w.misi), id).toBe(true);
      for (const k of KEADAAN) expect(w[k].length, `${id}.${k}`).toBeGreaterThan(0);
    }
  });

  it('keempat tempat disebut oleh setidaknya satu penduduk', () => {
    const disebut = new Set(Object.values(WARGA.penduduk).map((w) => w.misi));
    for (const m of MISI_UTAMA) expect(disebut.has(m.id), m.id).toBe(true);
  });

  it('naskah penduduk tidak membocorkan jawaban misi mana pun', () => {
    for (const m of MISI_UTAMA) {
      for (const b of barisPenduduk) {
        expect(periksaKeluar(b.teks, { misi: m, tingkat: 1 }), `${m.id}: ${b.teks}`).toMatchObject({ aman: true });
      }
    }
  });

  it('menyebut tempatnya sampai pulih, lalu berterima kasih, mengajak ke Festival, dan merayakan', () => {
    const [id, w] = Object.entries(WARGA.penduduk)[0];
    const awal = naskahPenduduk(progresAwal(), id)!;
    expect(awal.jenis).toBe('sebelum');
    expect(awal.baris[0]).toEqual({ siapa: id, teks: w.sebelum[0] });
    expect(naskahPenduduk(mulaiMisi(progresAwal(), w.misi), id)!.jenis).toBe('sebelum');
    expect(naskahPenduduk(selesai(progresAwal(), w.misi), id)!.jenis).toBe('sesudah');
    const semuaPulih = selesai(progresAwal(), ...MISI_UTAMA.map((m) => m.id));
    expect(naskahPenduduk(semuaPulih, id)!.jenis).toBe('festival');
    expect(naskahPenduduk({ ...semuaPulih, festivalSelesai: true }, id)!.jenis).toBe('tamat');
  });

  it('baris untuk pembicara lain (misalnya Tiko) tetap atas nama pembicara itu', () => {
    const baris = Object.keys(WARGA.penduduk).flatMap((id) => naskahPenduduk(progresAwal(), id)!.baris);
    expect(baris.some((b) => b.siapa === 'tiko')).toBe(true);
  });

  it('warga hiasan tanpa naskah tidak bisa diajak bicara', () => {
    expect(naskahPenduduk(progresAwal(), 'bukan-warga')).toBeUndefined();
  });
});
