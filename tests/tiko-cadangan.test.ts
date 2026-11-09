import { describe, expect, it } from 'vitest';
import { MISI_UTAMA } from '../shared/content';
import { periksaKeluar, petunjukCadangan } from '../shared/guardrail';
import { jawabanCadangan } from '../src/tiko/panel';

describe('Tiko saat server tidak bisa dihubungi', () => {
  it.each(MISI_UTAMA.map((m) => m.id))('petunjuk %s tetap khusus misi dan naik per tingkat', (id) => {
    const misi = MISI_UTAMA.find((m) => m.id === id)!;
    const teks = ([1, 2, 3] as const).map((tingkat) => jawabanCadangan({ mode: 'petunjuk', misiId: id, tingkat }));
    expect(teks).toEqual([1, 2, 3].map((t) => petunjukCadangan(misi, t as 1 | 2 | 3)));
    expect(new Set(teks).size).toBe(3);
  });

  it.each(MISI_UTAMA.map((m) => m.id))('petunjuk cadangan %s tingkat 1–2 tidak membocorkan jawaban', (id) => {
    const misi = MISI_UTAMA.find((m) => m.id === id)!;
    for (const tingkat of [1, 2] as const) {
      expect(periksaKeluar(jawabanCadangan({ mode: 'petunjuk', misiId: id, tingkat }), { misi, tingkat }).aman).toBe(true);
    }
  });

  it('pertanyaan bebas, misi tak dikenal, atau tingkat aneh memakai pesan umum', () => {
    const umum = jawabanCadangan({ mode: 'tanya' });
    expect(umum).toMatch(/tidak bisa terhubung/);
    expect(jawabanCadangan({ mode: 'petunjuk', misiId: 'misi-99', tingkat: 1 })).toBe(umum);
    expect(jawabanCadangan({ mode: 'petunjuk', misiId: 'misi-1', tingkat: 7 })).toBe(umum);
  });
});
