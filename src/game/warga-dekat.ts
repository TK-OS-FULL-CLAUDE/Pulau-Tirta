/**
 * Warga mana yang bisa diajak bicara di dekat pemain (PRD F-03). Murni, tanpa Phaser, supaya bisa diuji.
 * Dunia hanya memberi posisi kaki warga yang sedang terlihat; isi percakapan diatur sistem dialog lewat PengaitDunia.
 */
export const RADIUS_BICARA = 20;
/** Label tetap menempel sedikit lebih jauh supaya tidak berkedip saat warga atau pemain bergeser sedikit. */
export const RADIUS_LEPAS = RADIUS_BICARA + 8;

export interface WargaDunia {
  id: string;
  x: number;
  y: number;
}

export function wargaTerdekat(warga: readonly WargaDunia[], kaki: { x: number; y: number }, sekarang?: string): string | undefined {
  const jarak = (w: WargaDunia) => Math.hypot(w.x - kaki.x, w.y - kaki.y);
  const lama = sekarang === undefined ? undefined : warga.find((w) => w.id === sekarang);
  if (lama && jarak(lama) <= RADIUS_LEPAS) return lama.id;
  let terdekat: string | undefined;
  let terbaik = Infinity;
  for (const w of warga) {
    const d = jarak(w);
    if (d <= RADIUS_BICARA && d < terbaik) {
      terbaik = d;
      terdekat = w.id;
    }
  }
  return terdekat;
}
