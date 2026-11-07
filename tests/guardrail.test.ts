import { describe, expect, it } from 'vitest';
import { MISI_UTAMA, type Tingkat } from '../shared/content';
import { mirip, periksaKeluar, periksaMasuk, petunjukCadangan, rapikanJawaban } from '../shared/guardrail';

describe('periksaMasuk', () => {
  it('meloloskan pertanyaan biasa', () => {
    expect(periksaMasuk('Kenapa awan ada di atas?')).toEqual({ lolos: true, pesan: 'Kenapa awan ada di atas?' });
  });

  it.each([
    ['', 'kosong'],
    ['a'.repeat(201), 'terlalu-panjang'],
    ['nomorku 081234567890', 'data-pribadi'],
    ['emailku raka@contoh.com', 'data-pribadi'],
    ['alamat rumahku di jalan mawar', 'data-pribadi'],
    ['aku dirundung teman', 'khawatir'],
    ['kamu goblok', 'kata-kasar'],
  ])('menahan %j sebagai %s', (pesan, alasan) => {
    const hasil = periksaMasuk(pesan);
    expect(hasil.lolos).toBe(false);
    if (!hasil.lolos) expect(hasil.alasan).toBe(alasan);
  });

  it('tidak meneruskan data pribadi ke model, dan balasannya mengingatkan', () => {
    const hasil = periksaMasuk('nomor hpku 085712345678');
    expect(hasil.lolos).toBe(false);
    if (!hasil.lolos) expect(hasil.balasan).toMatch(/jangan tulis/i);
  });
});

describe('rapikanJawaban', () => {
  it('memotong jawaban menjadi maksimal 3 kalimat', () => {
    expect(rapikanJawaban('Satu. Dua! Tiga? Empat. Lima.')).toBe('Satu. Dua! Tiga?');
  });
});

describe('aturan kebocoran petunjuk', () => {
  const pantai = MISI_UTAMA.find((m) => m.id === 'misi-1')!;

  it('menolak kata jawaban di tingkat 1 dan 2', () => {
    for (const t of [1, 2] as Tingkat[]) {
      const hasil = periksaKeluar('Airnya menguap karena panas.', { misi: pantai, tingkat: t });
      expect(hasil.aman).toBe(false);
    }
  });

  it('membolehkan konsep di tingkat 3, tapi menolak kutipan pilihan benar', () => {
    expect(periksaKeluar('Helai tipis itu gambaran uap air. Apa yang dilakukan panas pada air?', { misi: pantai, tingkat: 3 }).aman).toBe(true);
    expect(
      periksaKeluar('Panas matahari mengubah air menjadi uap air yang naik ke udara.', { misi: pantai, tingkat: 3 }).aman,
    ).toBe(false);
  });

  it('mendeteksi parafrase yang terlalu mirip', () => {
    expect(mirip('matahari mengubah air jadi uap lalu naik ke udara', 'Panas matahari mengubah air menjadi uap air yang naik ke udara')).toBe(true);
    expect(mirip('Coba lihat dasar kolamnya', 'Panas matahari mengubah air menjadi uap air yang naik ke udara')).toBe(false);
  });

  it('semua petunjuk cadangan lolos pemeriksa yang sama dengan model', () => {
    for (const misi of MISI_UTAMA) {
      for (const t of [1, 2, 3] as Tingkat[]) {
        const teks = petunjukCadangan(misi, t);
        const hasil = periksaKeluar(teks, { misi, tingkat: t });
        expect(hasil, `${misi.id} tingkat ${t}: ${teks}`).toMatchObject({ aman: true });
      }
    }
  });

  it('menolak jawaban yang meminta data pribadi', () => {
    expect(periksaKeluar('Siapa nama lengkapmu?').aman).toBe(false);
  });
});
