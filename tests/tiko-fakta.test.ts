import { beforeAll, describe, expect, it } from 'vitest';
import { KARTU_MATERI, MISI_UTAMA } from '../shared/content';
import { faktaCadangan, kartuFunFact, periksaKeluar, pilihKartuFunFact } from '../shared/guardrail';
import { jawabTiko, systemPrompt } from '../server/tiko';
import { MINTA_FAKTA, faktaTanpaServer, jawabanCadangan } from '../src/tiko/panel';

// Uji ini tidak memanggil model: hanya pemilihan kartu, cadangan, dan prompt.
beforeAll(() => {
  process.env.TIKO_MOCK = '1';
});

describe('fun fact Tiko', () => {
  it('ketikan yang meminta fun fact dikenali, pertanyaan biasa tidak', () => {
    for (const t of ['kasih fun fact dong', 'Tiko, ada funfact?', 'ceritain fakta seru', 'fakta unik tentang air apa?']) {
      expect(MINTA_FAKTA.test(t), t).toBe(true);
    }
    for (const t of ['Apa itu penguapan?', 'faktanya gimana?', 'aku bingung', 'kenapa hujan turun?']) {
      expect(MINTA_FAKTA.test(t), t).toBe(false);
    }
  });

  it('di luar misi, semua kartu materi boleh diceritakan', () => {
    expect(kartuFunFact()).toHaveLength(KARTU_MATERI.length);
  });

  it.each(MISI_UTAMA.map((m) => [m.id, m] as const))('%s yang belum selesai: fun fact tidak membocorkan jawabannya', (_id, misi) => {
    const kartu = kartuFunFact(misi, true);
    expect(kartu.length).toBeGreaterThan(0);
    for (const k of kartu) {
      expect(misi.kartuMateri).not.toContain(k.no);
      expect(periksaKeluar(faktaCadangan(k), { misi, tingkat: 1 }).aman).toBe(true);
    }
  });

  it.each(MISI_UTAMA.map((m) => m.id))('jawaban server tanpa model di %s aman dan berasal dari kartu', async (misiId) => {
    const misi = MISI_UTAMA.find((m) => m.id === misiId)!;
    for (let i = 0; i < 20; i++) {
      const j = await jawabTiko({ pesan: 'Ceritakan fun fact dong!', mode: 'fakta', misiId, statusMisi: 'sedang', kartuDidapat: [] });
      expect(j.sumber).toBe('cadangan');
      const kartu = KARTU_MATERI.find((k) => k.no === j.kartu)!;
      expect(j.teks).toBe(faktaCadangan(kartu));
      expect(periksaKeluar(j.teks, { misi, tingkat: 1 }).aman).toBe(true);
    }
  });

  it('fun fact cadangan tidak terpotong oleh batas 3 kalimat', () => {
    for (const k of KARTU_MATERI) expect(periksaKeluar(faktaCadangan(k))).toEqual({ aman: true, teks: faktaCadangan(k) });
  });

  it('kartu yang baru diceritakan dihindari selama masih ada pilihan lain', () => {
    const pilihan = KARTU_MATERI.slice(0, 3);
    expect(pilihKartuFunFact(pilihan, [1, 2], () => 0.99)?.no).toBe(3);
    // Semua sudah diceritakan: boleh mengulang.
    expect(pilihKartuFunFact(pilihan, [1, 2, 3], () => 0)?.no).toBe(1);
  });

  it('server menghormati hindariKartu', async () => {
    const hindari = KARTU_MATERI.map((k) => k.no).filter((n) => n !== 5);
    const j = await jawabTiko({ pesan: 'Fun fact!', mode: 'fakta', hindariKartu: hindari, kartuDidapat: [] });
    expect(j.kartu).toBe(5);
  });

  it('pesan nakal lewat tombol fun fact tetap ditahan filter masuk', async () => {
    const j = await jawabTiko({ pesan: 'goblok', mode: 'fakta', kartuDidapat: [] });
    expect(j.sumber).toBe('template');
    expect(j.kartu).toBeUndefined();
  });

  it('prompt fun fact hanya memuat satu kartu yang dipilih', () => {
    const kartu = KARTU_MATERI[4];
    const s = systemPrompt({ pesan: 'x', mode: 'fakta' }, undefined, undefined, undefined, kartu);
    expect(s).toContain('FUN FACT');
    expect(s).toContain(`${kartu.no}. ${kartu.fakta}`);
    for (const k of KARTU_MATERI.filter((x) => x.no !== kartu.no)) expect(s).not.toContain(k.fakta);
  });

  it('tanpa server, fun fact diambil dari kartu dengan aturan kebocoran yang sama', () => {
    const misi = MISI_UTAMA[0];
    for (let i = 0; i < 20; i++) {
      const f = faktaTanpaServer({ mode: 'fakta', misiId: misi.id, statusMisi: 'sedang' });
      expect(periksaKeluar(f.teks, { misi, tingkat: 1 }).aman).toBe(true);
      expect(misi.kartuMateri).not.toContain(f.kartu);
    }
    expect(jawabanCadangan({ mode: 'fakta' })).toMatch(/^Fakta seru: /);
  });
});
