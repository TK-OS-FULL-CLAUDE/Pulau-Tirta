/**
 * Musik latar "Pagi di Desa Tirta": lagu asli tim dengan nuansa game bertani yang ceria. Ada seruling untuk melodi,
 * petikan akor di ketukan 2 dan 4, bass yang melangkah, dan kocokan pelan. Semua dibuat dengan Web Audio API,
 * jadi tidak ada file audio dan tetap jalan offline.
 *
 * 32 birama 4/4 di G mayor, 104 ketukan per menit (sekitar 74 detik), diulang terus. Satu langkah = seperdelapan.
 */

export const TEMPO = 104;
export const LANGKAH_PER_BIRAMA = 8;
export const DETIK_PER_LANGKAH = 60 / TEMPO / 2;

type Not = [nada: string, panjang: number];

/** Melodi seruling: [nada, panjang dalam seperdelapan]; 'r' = diam. Satu baris = satu birama. */
export const MELODI: Not[][] = [
  // A: pagi di desa
  [['D5', 1], ['B4', 1], ['G4', 2], ['B4', 1], ['D5', 1], ['G5', 2]],
  [['E5', 2], ['G5', 1], ['E5', 1], ['C5', 3], ['r', 1]],
  [['F#5', 1], ['E5', 1], ['D5', 1], ['C5', 1], ['A4', 2], ['D5', 2]],
  [['B4', 3], ['A4', 1], ['G4', 4]],
  [['G4', 1], ['A4', 1], ['B4', 2], ['E5', 2], ['D5', 2]],
  [['C5', 1], ['B4', 1], ['A4', 1], ['G4', 1], ['E4', 2], ['G4', 2]],
  [['A4', 2], ['C#5', 2], ['E5', 1], ['G5', 1], ['E5', 2]],
  [['F#5', 4], ['r', 2], ['D5', 1], ['E5', 1]],
  [['D5', 1], ['B4', 1], ['G4', 2], ['B4', 1], ['D5', 1], ['G5', 2]],
  [['A5', 2], ['G5', 1], ['E5', 1], ['G5', 2], ['E5', 2]],
  [['D5', 1], ['E5', 1], ['F#5', 1], ['A5', 1], ['G5', 2], ['F#5', 2]],
  [['E5', 3], ['D5', 1], ['B4', 4]],
  [['C5', 2], ['E5', 2], ['G5', 2], ['E5', 2]],
  [['D5', 2], ['F#5', 2], ['A5', 2], ['F#5', 2]],
  [['G5', 3], ['D5', 1], ['B4', 2], ['A4', 2]],
  [['G4', 4], ['r', 4]],
  // B: ke ladang
  [['E5', 4], ['G5', 2], ['E5', 2]],
  [['F#5', 4], ['A5', 2], ['F#5', 2]],
  [['D5', 3], ['B4', 1], ['F#5', 4]],
  [['E5', 6], ['r', 2]],
  [['C5', 2], ['D5', 2], ['E5', 2], ['G5', 2]],
  [['A5', 3], ['G5', 1], ['F#5', 2], ['D5', 2]],
  [['G5', 2], ['D5', 2], ['B4', 2], ['D5', 2]],
  [['F5', 4], ['D5', 2], ['B4', 2]],
  [['E5', 4], ['G5', 2], ['E5', 2]],
  [['F#5', 3], ['E5', 1], ['D5', 2], ['A4', 2]],
  [['B4', 2], ['D5', 2], ['F#5', 2], ['D5', 2]],
  [['E5', 3], ['F#5', 1], ['G5', 4]],
  [['C5', 2], ['E5', 2], ['A5', 2], ['G5', 2]],
  [['F#5', 2], ['E5', 2], ['D5', 2], ['C5', 2]],
  [['B4', 3], ['A4', 1], ['G4', 2], ['B4', 2]],
  [['G4', 4], ['r', 4]],
];

/** Akor tiap birama (sejajar dengan MELODI). */
export const AKOR = [
  'G', 'C', 'D', 'G', 'Em', 'C', 'A7', 'D',
  'G', 'C', 'D', 'Em', 'C', 'D', 'G', 'G',
  'C', 'D', 'Bm', 'Em', 'C', 'D', 'G', 'G7',
  'C', 'D', 'Bm', 'Em', 'Am', 'D7', 'G', 'G',
];

/** Bass (nada dasar di ketukan 1, nada kelima di ketukan 3) dan nada petikan tiap akor. */
export const SUARA_AKOR: Record<string, { bas: [string, string]; petik: string[] }> = {
  G: { bas: ['G2', 'D3'], petik: ['G3', 'B3', 'D4'] },
  G7: { bas: ['G2', 'D3'], petik: ['F3', 'B3', 'D4'] },
  C: { bas: ['C3', 'G2'], petik: ['G3', 'C4', 'E4'] },
  D: { bas: ['D3', 'A2'], petik: ['F#3', 'A3', 'D4'] },
  D7: { bas: ['D3', 'A2'], petik: ['F#3', 'A3', 'C4'] },
  Em: { bas: ['E2', 'B2'], petik: ['G3', 'B3', 'E4'] },
  Am: { bas: ['A2', 'E3'], petik: ['A3', 'C4', 'E4'] },
  A7: { bas: ['A2', 'E3'], petik: ['G3', 'C#4', 'E4'] },
  Bm: { bas: ['B2', 'F#3'], petik: ['F#3', 'B3', 'D4'] },
};

const NADA_DASAR: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Frekuensi (Hz) dari nama nada seperti 'A4' atau 'F#5'. */
export function hz(nada: string): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(nada);
  if (!m) throw new Error(`Nada tidak dikenal: ${nada}`);
  const midi = 12 * (Number(m[3]) + 1) + NADA_DASAR[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

export const JUMLAH_LANGKAH = MELODI.length * LANGKAH_PER_BIRAMA;

/** Nada seruling yang mulai di tiap langkah (frekuensi dan panjang dalam langkah). */
const SERULING: ({ f: number; panjang: number } | undefined)[] = (() => {
  const daftar: ({ f: number; panjang: number } | undefined)[] = new Array(JUMLAH_LANGKAH).fill(undefined);
  MELODI.forEach((birama, i) => {
    let langkah = i * LANGKAH_PER_BIRAMA;
    for (const [nada, panjang] of birama) {
      if (nada !== 'r') daftar[langkah] = { f: hz(nada), panjang };
      langkah += panjang;
    }
  });
  return daftar;
})();

/** Seruling: sinus lembut dengan sedikit segitiga dan getaran (vibrato) yang muncul pelan. */
function seruling(ctx: BaseAudioContext, tujuan: AudioNode, f: number, t: number, lama: number): void {
  const g = ctx.createGain();
  const vol = 0.05;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.03);
  g.gain.linearRampToValueAtTime(vol * 0.75, t + Math.max(0.06, lama - 0.06));
  g.gain.exponentialRampToValueAtTime(0.0001, t + lama + 0.15);
  g.connect(tujuan);
  const getar = ctx.createOscillator();
  const dalam = ctx.createGain();
  getar.frequency.value = 5.2;
  dalam.gain.setValueAtTime(0, t);
  dalam.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.35, lama));
  getar.connect(dalam);
  for (const [tipe, kuat] of [['sine', 1], ['triangle', 0.22]] as const) {
    const osc = ctx.createOscillator();
    const v = ctx.createGain();
    osc.type = tipe;
    osc.frequency.value = f;
    dalam.connect(osc.frequency);
    v.gain.value = kuat;
    osc.connect(v).connect(g);
    osc.start(t);
    osc.stop(t + lama + 0.2);
  }
  getar.start(t);
  getar.stop(t + lama + 0.2);
}

/** Petikan akor (seperti marimba kecil): segitiga yang cepat meredup, ditambah kilau satu oktaf di atas. */
function petik(ctx: BaseAudioContext, tujuan: AudioNode, f: number, t: number): void {
  for (const [kali, vol, lama] of [[1, 0.016, 0.32], [2, 0.004, 0.14]] as const) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = f * kali;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + lama);
    osc.connect(g).connect(tujuan);
    osc.start(t);
    osc.stop(t + lama + 0.02);
  }
}

function bas(ctx: BaseAudioContext, tujuan: AudioNode, f: number, t: number, lama: number): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.015, t + lama * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + lama);
  osc.connect(g).connect(tujuan);
  osc.start(t);
  osc.stop(t + lama + 0.02);
}

/** Kocokan (shaker) pelan dari derau yang disaring tinggi. */
function kocok(ctx: BaseAudioContext, tujuan: AudioNode, derau: AudioBuffer, t: number, vol: number): void {
  const sumber = ctx.createBufferSource();
  sumber.buffer = derau;
  const saring = ctx.createBiquadFilter();
  saring.type = 'highpass';
  saring.frequency.value = 6500;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  sumber.connect(saring).connect(g).connect(tujuan);
  sumber.start(t, Math.random() * 1.5);
  sumber.stop(t + 0.06);
}

/** Jadwalkan semua bunyi pada satu langkah (seperdelapan) lagu, mulai detik `t`. */
export function jadwalkanLangkah(ctx: BaseAudioContext, tujuan: AudioNode, langkah: number, t: number, derau?: AudioBuffer): void {
  const i = ((langkah % JUMLAH_LANGKAH) + JUMLAH_LANGKAH) % JUMLAH_LANGKAH;
  const dalamBirama = i % LANGKAH_PER_BIRAMA;
  const akor = SUARA_AKOR[AKOR[Math.floor(i / LANGKAH_PER_BIRAMA)]];
  const not = SERULING[i];
  if (not) seruling(ctx, tujuan, not.f, t, not.panjang * DETIK_PER_LANGKAH);
  if (dalamBirama === 0) bas(ctx, tujuan, hz(akor.bas[0]), t, DETIK_PER_LANGKAH * 3.5);
  if (dalamBirama === 4) bas(ctx, tujuan, hz(akor.bas[1]), t, DETIK_PER_LANGKAH * 3.5);
  if (dalamBirama === 2 || dalamBirama === 6) akor.petik.forEach((n, k) => petik(ctx, tujuan, hz(n), t + k * 0.012));
  if (derau && i % 2 === 1) kocok(ctx, tujuan, derau, t, dalamBirama === 3 || dalamBirama === 7 ? 0.012 : 0.006);
}
