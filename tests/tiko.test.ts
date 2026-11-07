import { beforeEach, describe, expect, it } from 'vitest';
import { jawabTiko, systemPrompt } from '../server/tiko';
import { cariMisi } from '../shared/content';

describe('jawabTiko tanpa model (mode cadangan)', () => {
  beforeEach(() => {
    process.env.TIKO_MOCK = '1';
  });

  it('memberi petunjuk cadangan sesuai misi dan tingkat', async () => {
    const j = await jawabTiko({ pesan: 'Aku bingung', mode: 'petunjuk', misiId: 'misi-1', tingkat: 2 });
    expect(j.sumber).toBe('cadangan');
    expect(j.tingkat).toBe(2);
    expect(j.teks).toBe(cariMisi('misi-1')!.petunjukCadangan!['2']);
  });

  it('menjawab pertanyaan materi dari kartu materi', async () => {
    const j = await jawabTiko({ pesan: 'Apa itu pengembunan?', mode: 'tanya', misiId: 'misi-2' });
    expect(j.sumber).toBe('cadangan');
    expect(j.teks).toMatch(/udara makin dingin|uap air/i);
  });

  it('menahan data pribadi sebelum sampai ke model', async () => {
    const j = await jawabTiko({ pesan: 'nomorku 081234567890', mode: 'tanya' });
    expect(j.sumber).toBe('template');
  });
});

describe('system prompt', () => {
  it('memuat aturan inti, kata terlarang per tingkat, dan hanya kartu materi yang relevan', () => {
    const misi = cariMisi('misi-1');
    const p = systemPrompt({ pesan: '', mode: 'petunjuk', misiId: 'misi-1', alasanId: 'b' }, misi, 1);
    expect(p).toContain('Jangan pernah memberi jawaban pertanyaan misi secara langsung');
    expect(p).toContain('uap, menguap, penguapan');
    expect(p).toContain('Airnya meresap ke pasir');
    expect(p).toContain('Penguapan: panas matahari');
    expect(p).not.toContain('Pengembunan:');
  });
});
