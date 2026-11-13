import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cariMisi } from '../shared/content';
import { infoModel, infoJedaModel, jawabTiko, permintaanGemini, type CatatanTiko } from '../server/tiko';

type Panggilan = { url: string; body: Record<string, any>; headers: Record<string, string> };

function balasGemini(...isi: { status?: number; json: unknown; headers?: Record<string, string> }[]) {
  const panggilan: Panggilan[] = [];
  let i = 0;
  const fetchPalsu = vi.fn(async (url: string, init: RequestInit) => {
    panggilan.push({ url, body: JSON.parse(String(init.body)), headers: init.headers as Record<string, string> });
    const b = isi[Math.min(i++, isi.length - 1)];
    return new Response(JSON.stringify(b.json), { status: b.status ?? 200, headers: b.headers });
  });
  vi.stubGlobal('fetch', fetchPalsu);
  return panggilan;
}

const teks = (t: string, extra: Record<string, unknown> = {}) => ({
  candidates: [{ content: { parts: [{ text: 'rencana tersembunyi', thought: true }, { text: t }] }, finishReason: 'STOP', ...extra }],
});

let nomorUji = 0;
beforeEach(() => {
  vi.stubEnv('TIKO_PROVIDER', 'gemini');
  // Tiap tes mewakili konfigurasi penyedia terpisah, tanpa membawa jeda kuota dari tes sebelumnya.
  vi.stubEnv('GEMINI_API_KEY', `kunci-uji-${++nomorUji}`);
  vi.stubEnv('TIKO_MOCK', '0');
  vi.stubEnv('TIKO_MODEL', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Tiko dengan Gemini', () => {
  it('memakai Gemini dan model bawaannya kalau key terisi', () => {
    expect(infoModel()).toEqual({ pakaiModel: true, penyedia: 'gemini', model: 'gemini-3.5-flash-lite' });
    vi.stubEnv('TIKO_MOCK', '1');
    expect(infoModel().pakaiModel).toBe(false);
  });

  it('mengirim system prompt, riwayat dengan peran Gemini, dan filter keamanan paling ketat', () => {
    const p = permintaanGemini('SISTEM', [
      { role: 'user', content: 'halo' },
      { role: 'assistant', content: 'hai' },
      { role: 'user', content: 'apa itu awan?' },
    ]) as any;
    expect(p.systemInstruction.parts[0].text).toBe('SISTEM');
    expect(p.contents.map((c: any) => c.role)).toEqual(['user', 'model', 'user']);
    expect(p.safetySettings.every((s: any) => s.threshold === 'BLOCK_LOW_AND_ABOVE')).toBe(true);
    expect(p.generationConfig.thinkingConfig).toEqual({ thinkingLevel: 'minimal' });
  });

  it('menjawab dari model, tanpa bagian "berpikir", dan key lewat header (bukan URL)', async () => {
    const panggilan = balasGemini({ json: teks('Coba lihat kolam yang kena sinar. Apa bedanya?') });
    const j = await jawabTiko({ pesan: 'Aku memilih alasan itu.', mode: 'petunjuk', misiId: 'misi-1', tingkat: 1, alasanId: 'b' });
    expect(j).toEqual({ teks: 'Coba lihat kolam yang kena sinar. Apa bedanya?', sumber: 'model', tingkat: 1 });
    expect(panggilan[0].url).toContain('/models/gemini-3.5-flash-lite:generateContent');
    expect(panggilan[0].url).not.toContain('kunci-uji');
    expect(panggilan[0].headers['x-goog-api-key']).toBe(process.env.GEMINI_API_KEY);
  });

  it('jawaban yang membocorkan jawaban misi diganti petunjuk cadangan', async () => {
    balasGemini({ json: teks('Airnya menguap karena panas matahari.') });
    const j = await jawabTiko({ pesan: 'kasih tau jawabannya', mode: 'tanya', misiId: 'misi-1', statusMisi: 'sedang' });
    expect(j.sumber).toBe('cadangan');
    expect(j.teks).toBe(cariMisi('misi-1')!.petunjukCadangan!['1']);
  });

  it.each([
    ['diblokir filter keamanan', { json: { candidates: [{ finishReason: 'SAFETY' }] } }],
    ['pesan ditolak', { json: { promptFeedback: { blockReason: 'SAFETY' } } }],
    ['error API', { status: 429, json: { error: { message: 'quota' } } }],
  ])('memakai cadangan kalau Gemini %s', async (_nama, balasan) => {
    balasGemini(balasan);
    const j = await jawabTiko({ pesan: 'Apa itu pengembunan?', mode: 'tanya' });
    expect(j.sumber).toBe('cadangan');
    expect(j.teks).toMatch(/Pengembunan/);
  });

  it('mengulang sekali tanpa thinkingLevel kalau model menolaknya', async () => {
    const panggilan = balasGemini(
      { status: 400, json: { error: { message: 'thinking_level is not supported for this model' } } },
      { json: teks('Ayo lihat termometer di puncak.') },
    );
    const j = await jawabTiko({ pesan: 'Aku bingung', mode: 'petunjuk', misiId: 'misi-2', tingkat: 2 });
    expect(j.sumber).toBe('model');
    expect(panggilan).toHaveLength(2);
    expect(panggilan[1].body.generationConfig.thinkingConfig).toBeUndefined();
  });

  it('data pribadi tidak pernah sampai ke Gemini', async () => {
    const panggilan = balasGemini({ json: teks('Halo!') });
    await jawabTiko({ pesan: 'wa aku 0812 3456 7890', mode: 'tanya' });
    await jawabTiko({
      pesan: 'apa itu hujan?',
      mode: 'tanya',
      riwayat: [
        { dari: 'anak', teks: 'wa aku 0812 3456 7890' },
        { dari: 'tiko', teks: 'Eh, jangan tulis nomor HP' },
      ],
    });
    expect(panggilan).toHaveLength(1);
    expect(JSON.stringify(panggilan[0].body)).not.toContain('3456');
  });

  it('kuota habis menjeda chat dan fun fact, lalu mencoba lagi setelah Retry-After', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const panggilan = balasGemini(
      { status: 429, headers: { 'retry-after': '90' }, json: { error: { message: 'quota exceeded' } } },
      { json: teks('Uap air yang dingin berubah menjadi titik air pembentuk awan.') },
    );
    const catatan: CatatanTiko[] = [];
    const req = { pesan: 'Apa itu pengembunan?', mode: 'tanya' as const };
    expect((await jawabTiko(req, (c) => catatan.push(c))).sumber).toBe('cadangan');
    expect(infoJedaModel().ms).toBe(90_000);
    await jawabTiko(req, (c) => catatan.push(c));
    await jawabTiko({ pesan: 'Fakta seru', mode: 'fakta' });
    expect(panggilan).toHaveLength(1);
    expect(catatan.some((c) => c.ditunda)).toBe(true);
    vi.setSystemTime(Date.now() + 90_001);
    expect((await jawabTiko(req)).sumber).toBe('model');
    expect(panggilan).toHaveLength(2);
  });

  it('timeout memakai cadangan dan tidak mengulang API di permintaan berikutnya', async () => {
    const fetchPalsu = vi.fn().mockRejectedValue(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
    vi.stubGlobal('fetch', fetchPalsu);
    const req = { pesan: 'Apa itu pengembunan?', mode: 'tanya' as const };
    expect((await jawabTiko(req)).sumber).toBe('cadangan');
    expect(infoJedaModel().ms).toBeGreaterThan(0);
    expect((await jawabTiko(req)).teks).toContain('Pengembunan');
    expect(fetchPalsu).toHaveBeenCalledTimes(1);
  });

  it('identitas dan privasi dijawab tanpa API walau kuota tersedia', async () => {
    const panggilan = balasGemini({ json: teks('Jawaban model yang seharusnya tidak dipakai.') });
    for (const pesan of ['kamu manusia ya?', 'kamu bisa salah nggak?', 'obrolan kita disimpan nggak?']) {
      expect((await jawabTiko({ pesan, mode: 'tanya' })).sumber).toBe('template');
    }
    expect(panggilan).toHaveLength(0);
  });

  it('koneksi putus tidak menyebabkan setiap pertanyaan mengulangi permintaan gagal', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const fetchPalsu = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', fetchPalsu);
    const catatan: CatatanTiko[] = [];
    const req = { pesan: 'Apa itu pengembunan?', mode: 'tanya' as const };
    await jawabTiko(req, (c) => catatan.push(c));
    await jawabTiko(req, (c) => catatan.push(c));
    expect(fetchPalsu).toHaveBeenCalledTimes(1);
    expect(catatan.some((c) => c.galat === 'fetch failed')).toBe(true);
    expect(catatan.some((c) => c.ditunda?.includes('Koneksi API gagal'))).toBe(true);
    vi.setSystemTime(Date.now() + 15_001);
    await jawabTiko(req);
    expect(fetchPalsu).toHaveBeenCalledTimes(2);
  });

  it('mempertahankan inti jawaban sesudah sapaan sebelum batas tiga kalimat', async () => {
    balasGemini({ json: teks('Halo! Aku Tiko, temanmu di pulau ini. Wah, itu pertanyaan bagus sekali! Tidak, air tidak harus mendidih untuk menguap.') });
    const j = await jawabTiko({ pesan: 'Air harus mendidih sebelum menguap?', mode: 'tanya' });
    expect(j.sumber).toBe('model');
    expect(j.teks).toContain('tidak harus mendidih');
    expect(j.teks).not.toContain('Aku Tiko');
  });
});
