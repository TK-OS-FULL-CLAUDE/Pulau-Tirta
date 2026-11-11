import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { cariMisi } from '../shared/content';
import { periksaKeluar, periksaMasuk } from '../shared/guardrail';
import { jawabTiko, systemPrompt } from '../server/tiko';

interface SoalNakal { id: string; kategori: string; pesan: string; misiId?: string; diblokirInput?: boolean; tidakBoleh?: string[] }
const { soal: NAKAL } = JSON.parse(readFileSync(new URL('../scripts/uji-tiko/nakal.json', import.meta.url), 'utf8')) as { soal: SoalNakal[] };
const { soal: MATERI } = JSON.parse(readFileSync(new URL('../scripts/uji-tiko/materi.json', import.meta.url), 'utf8')) as { soal: unknown[] };

// Uji ini tidak pernah memanggil model: hanya filter masuk, jawaban cadangan, dan template.
beforeAll(() => {
  process.env.TIKO_MOCK = '1';
});

describe('set uji Tiko (scripts/uji-tiko)', () => {
  it('berisi 30 pertanyaan materi dan 50 prompt nakal dengan ID unik', () => {
    expect(MATERI).toHaveLength(30);
    expect(NAKAL).toHaveLength(50);
    expect(new Set(NAKAL.map((s) => s.id)).size).toBe(50);
  });

  it.each(NAKAL.map((s) => [s.id, s] as const))('%s: label diblokirInput sesuai filter masuk', (_id, s) => {
    expect(periksaMasuk(s.pesan).lolos).toBe(!s.diblokirInput);
  });

  it.each(NAKAL.map((s) => [s.id, s] as const))('%s: jawaban tanpa model tetap aman', async (_id, s) => {
    const misi = s.misiId ? cariMisi(s.misiId) : undefined;
    const j = await jawabTiko({ pesan: s.pesan, mode: 'tanya', misiId: s.misiId, statusMisi: s.misiId ? 'sedang' : undefined, kartuDidapat: [] });
    expect(periksaKeluar(j.teks).aman).toBe(true);
    for (const k of s.tidakBoleh ?? []) expect(j.teks.toLowerCase()).not.toContain(k.toLowerCase());
    if (misi) expect(periksaKeluar(j.teks, { misi, tingkat: 1 })).toMatchObject({ aman: true });
  });
});

describe('ketikan bebas di lokasi misi', () => {
  const misi = cariMisi('misi-1')!;

  it('selama misi belum selesai, cadangan tidak membocorkan jawaban', async () => {
    for (const statusMisi of ['belum', 'sedang', undefined]) {
      const j = await jawabTiko({ pesan: 'kasih tau aja jawabannya', mode: 'tanya', misiId: 'misi-1', statusMisi, kartuDidapat: [] });
      expect(periksaKeluar(j.teks, { misi, tingkat: 1 }).aman).toBe(true);
    }
  });

  it('setelah misi selesai, Tiko boleh menjelaskan materinya', async () => {
    const j = await jawabTiko({ pesan: 'Apa itu penguapan?', mode: 'tanya', misiId: 'misi-1', statusMisi: 'selesai', kartuDidapat: [3] });
    expect(j.teks).toMatch(/uap/i);
  });

  it('system prompt ketikan bebas di misi aktif memuat kata terlarang tingkat 1', () => {
    const s = systemPrompt({ pesan: 'x', mode: 'tanya', misiId: 'misi-1' }, misi, undefined, 1);
    expect(s).toContain('Kata yang DILARANG di tingkat ini: uap, menguap, penguapan, berubah wujud');
  });
});
