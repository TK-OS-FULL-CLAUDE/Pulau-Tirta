/** Batas bentuk layar. Di luar batas ini canvas tetap mendapat pita, supaya peta yang terlihat tidak terlalu sempit. */
export const RASIO_MIN = 4 / 3;
export const RASIO_MAKS = 12 / 5;

/**
 * Ukuran dasar canvas untuk area game berukuran `lebar` x `tinggi` (piksel CSS). Bentuknya mengikuti area game,
 * supaya peta memenuhi layar tanpa pita kosong di kiri-kanan atau atas-bawah. Sisi pendek ukuran dasar 16:9
 * (`lebarDasar` x `tinggiDasar`, yaitu LEBAR x TINGGI di world.ts) dipertahankan, jadi besar pixel art sama seperti
 * di layar 16:9; yang bertambah hanya luas peta yang terlihat.
 */
export function ukuranDasar(lebar: number, tinggi: number, lebarDasar: number, tinggiDasar: number): { width: number; height: number } {
  const rasio = Math.min(RASIO_MAKS, Math.max(RASIO_MIN, lebar / tinggi));
  return rasio >= lebarDasar / tinggiDasar
    ? { width: Math.round(tinggiDasar * rasio), height: tinggiDasar }
    : { width: lebarDasar, height: Math.round(lebarDasar / rasio) };
}
