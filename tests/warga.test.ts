import { describe, expect, it } from 'vitest';
import { MISI_UTAMA } from '../shared/content';
import { periksaKeluar } from '../shared/guardrail';
import { mulaiMisi, progresAwal, type Progres } from '../shared/missions';
import { PANJANG_BARIS_MAKS, WARGA, naskahDesa, type Baris } from '../shared/warga';

const semua: Baris[] = [
  ...WARGA.pembuka,
  ...Object.values(WARGA.arahan).flat(),
  ...WARGA.ajakanFestival,
  ...WARGA.sesudahFestival,
];

describe('naskah warga', () => {
  it('setiap baris punya pembicara yang dikenal dan muat dalam 2 baris', () => {
    for (const b of semua) {
      expect(WARGA.pembicara[b.siapa], b.teks).toBeDefined();
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
