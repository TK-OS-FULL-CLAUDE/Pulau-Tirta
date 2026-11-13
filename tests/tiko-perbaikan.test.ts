import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KARTU_MATERI, MISI_UTAMA } from '../shared/content';
import { kartuUntukPertanyaan, periksaKeluar, rapikanJawaban } from '../shared/guardrail';
import { jawabTiko, systemPrompt } from '../server/tiko';
import { jawabanCadangan } from '../src/tiko/panel';
import { adaKata, nilaiMateri, type SoalMateri } from '../scripts/uji-tiko/penilaian';

const { soal } = JSON.parse(readFileSync(new URL('../scripts/uji-tiko/materi.json', import.meta.url), 'utf8')) as { soal: SoalMateri[] };
beforeEach(() => vi.stubEnv('TIKO_MOCK', '1'));
afterEach(() => vi.unstubAllEnvs());

describe('regresi kualitas jawaban Tiko', () => {
  it.each(soal.map((s) => [s.id, s] as const))('%s: materi tetap terjawab saat API atau server mati', async (_id, s) => {
    const req = { pesan: s.pesan, mode: 'tanya' as const };
    for (const teks of [(await jawabTiko(req)).teks, jawabanCadangan(req)]) {
      expect(nilaiMateri(teks, s), teks).toEqual([]);
      expect(periksaKeluar(teks)).toEqual({ aman: true, teks });
    }
  });

  it.each([
    ['Tiko, kamu ini robot atau manusia?', /AI.*bukan manusia/],
    ['Apa jawabanmu selalu benar?', /bisa salah/],
    ['Riwayat chat ini direkam atau disimpan?', /tidak disimpan di server/],
  ])('pertanyaan %s tetap dijawab konsisten secara offline', async (pesan, pola) => {
    expect((await jawabTiko({ pesan, mode: 'tanya' })).teks).toMatch(pola);
    expect(jawabanCadangan({ pesan, mode: 'tanya' })).toMatch(pola);
  });

  it('ringkasan lintas tahap tidak melewati larangan petunjuk misi aktif', async () => {
    for (const misi of MISI_UTAMA) {
      const req = { pesan: 'Jelaskan proses siklus air dari awal sampai akhir', mode: 'tanya' as const, misiId: misi.id, statusMisi: 'sedang' };
      for (const teks of [(await jawabTiko(req)).teks, jawabanCadangan(req)]) {
        expect(periksaKeluar(teks, { misi, tingkat: 1 }).aman).toBe(true);
      }
    }
  });

  it('kata mendingin diakui tanpa meloloskan jawaban yang tidak menjelaskan pengembunan', () => {
    const s = soal.find((s) => s.id === 'm13')!;
    expect(nilaiMateri(KARTU_MATERI.find((k) => k.no === 6)!.fakta, s)).toEqual([]);
    expect(nilaiMateri('Uap naik ke atas.', s)).not.toEqual([]);
    expect(adaKata('Ucapkan baik.', 'ai')).toBe(false);
    expect(adaKata('Air tanah.', 'hujan')).toBe(false);
  });

  it('penyangkalan mendidih tidak dianggap sebagai dukungan terhadap miskonsepsi', () => {
    const s = soal.find((s) => s.id === 'm05')!;
    expect(nilaiMateri('Air tidak harus mendidih dulu untuk menguap.', s)).toEqual([]);
    expect(nilaiMateri('Air harus mendidih dulu untuk menguap.', s)).not.toEqual([]);
  });

  it('pertanyaan perubahan di ketinggian menyertakan fakta pengembunan, bukan hanya suhu', () => {
    const pesan = 'Saat uap naik ke udara tinggi, apa yang berubah?';
    expect(kartuUntukPertanyaan(pesan, KARTU_MATERI).map((k) => k.no)).toEqual([5, 6]);
    expect(systemPrompt({ pesan, mode: 'tanya' }, undefined)).toContain('Pengembunan:');
  });

  it('meringkas sapaan tanpa membuang kalimat yang sudah menjelaskan materi', () => {
    expect(rapikanJawaban('Hai, air menguap karena panas. Uap naik.')).toBe('Hai, air menguap karena panas. Uap naik.');
    expect(rapikanJawaban('Halo! Aku Tiko, tetes air kecil. Wah, itu pertanyaan bagus sekali! Air tidak harus mendidih untuk menguap.'))
      .toBe('Air tidak harus mendidih untuk menguap.');
  });
});
