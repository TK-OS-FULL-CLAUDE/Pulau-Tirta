import { beforeAll, describe, expect, it } from 'vitest';
import { KARTU_MATERI } from '../shared/content';
import { jawabTiko, kartuPalingCocok } from '../server/tiko';

beforeAll(() => {
  process.env.TIKO_MOCK = '1';
});

describe('jawaban Tiko tanpa AI memilih kartu yang nyambung', () => {
  it.each([
    ['Apa itu penguapan?', 3],
    ['Awan itu terbuat dari apa?', 6],
    ['Kenapa hujan bisa turun?', 8],
    ['Air sumur datangnya dari mana?', 9],
    ['Kenapa pohon penting buat air?', 11],
    ['Kenapa di puncak gunung lebih dingin?', 5],
  ])('"%s" → kartu %i', (pesan, no) => {
    expect(kartuPalingCocok(pesan, KARTU_MATERI)?.no).toBe(no);
  });

  it('pertanyaan yang tidak cocok dengan kartu mana pun tidak dijawab dengan fakta acak', async () => {
    expect(kartuPalingCocok('siapa presiden indonesia?', KARTU_MATERI)).toBeUndefined();
    const j = await jawabTiko({ pesan: 'siapa presiden indonesia?', mode: 'tanya', kartuDidapat: [] });
    expect(j.teks).not.toMatch(/^Ini yang aku tahu/);
  });
});
