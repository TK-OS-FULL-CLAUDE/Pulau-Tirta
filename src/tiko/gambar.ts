/**
 * Gambar pixel art Tiko, roh tetes air. Satu sumber untuk sprite di peta (Phaser) dan potret di kotak jawaban (HTML),
 * jadi Tiko terlihat sama di mana pun. Setiap huruf = satu pixel, titik = transparan.
 */

const WARNA: Record<string, string> = {
  o: '#17506e', // garis luar
  b: '#4fc3f7', // badan
  d: '#2a9fd8', // bayangan badan
  l: '#b8efff', // kilau
  w: '#ffffff', // kilau paling terang
  e: '#14303f', // mata dan mulut
  p: '#ff9cb8', // pipi
};

/** 11 × 13 pixel. Mata terbuka. */
export const TIKO_BUKA = [
  '.....o.....',
  '....obo....',
  '....obo....',
  '...oblbo...',
  '..olbbbbo..',
  '.olwbbbbbo.',
  '.olbbbbbbo.',
  'olbebbbebdo',
  'obbebbbebdo',
  'obpbbebbpdo',
  '.obbbbbbdo.',
  '..odddddo..',
  '...ooooo...',
];

/** Mata berkedip. */
export const TIKO_KEDIP = TIKO_BUKA.map((baris, i) => (i === 7 ? 'olbbbbbbbdo' : baris));

/** Kilau kecil untuk jejak percikan. */
export const KILAU = ['.l.', 'lwl', '.l.'];

/** Gambar data pixel ke canvas baru; `skala` = ukuran satu pixel. */
export function gambarPixel(data: string[], skala = 1, warna: Record<string, string> = WARNA): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = data[0].length * skala;
  c.height = data.length * skala;
  const ctx = c.getContext('2d')!;
  data.forEach((baris, y) =>
    [...baris].forEach((ch, x) => {
      const isi = warna[ch];
      if (!isi) return;
      ctx.fillStyle = isi;
      ctx.fillRect(x * skala, y * skala, skala, skala);
    }),
  );
  return c;
}

/**
 * Cahaya lembut di sekeliling Tiko, tetap bergaya pixel: tiga cincin dengan transparansi bertingkat.
 * `jari` dalam pixel dunia.
 */
export function gambarCahaya(jari = 10): HTMLCanvasElement {
  const ukuran = jari * 2 + 1;
  const c = document.createElement('canvas');
  c.width = c.height = ukuran;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < ukuran; y++) {
    for (let x = 0; x < ukuran; x++) {
      const r = Math.hypot(x - jari, y - jari) / jari;
      const alfa = r <= 0.45 ? 0.32 : r <= 0.75 ? 0.18 : r <= 1 ? 0.08 : 0;
      if (!alfa) continue;
      ctx.fillStyle = `rgba(150, 230, 255, ${alfa})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

let potret: string | undefined;
/** Potret Tiko sebagai data URL, untuk <img> di kotak jawaban dan kotak chat. */
export function potretTiko(): string {
  potret ??= gambarPixel(TIKO_BUKA, 8).toDataURL();
  return potret;
}
