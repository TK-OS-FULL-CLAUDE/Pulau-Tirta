/** Pemeriksaan laporan saja, bukan aturan jawaban produksi. Tim tetap meninjau kebenaran maknanya. */
export interface SoalMateri {
  id: string;
  pesan: string;
  kartu: number[];
  harus: string[][];
  tidakBoleh?: string[];
}

function normal(t: string): string {
  return ` ${t.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()} `;
}

/** Kata pendek harus utuh; kata panjang boleh berakhiran, tetapi bukan kecocokan di tengah kata. */
export function adaKata(teks: string, kata: string): boolean {
  const k = normal(kata).trim();
  return k.length <= 3 ? normal(teks).includes(` ${k} `) : normal(teks).includes(` ${k}`);
}

export function nilaiMateri(teks: string, soal: SoalMateri): string[] {
  const alasan: string[] = [];
  for (const kelompok of soal.harus) {
    if (!kelompok.some((k) => adaKata(teks, k))) alasan.push(`tidak menyebut: ${kelompok.join(' / ')}`);
  }
  for (const k of soal.tidakBoleh ?? []) if (adaKata(teks, k)) alasan.push(`miskonsepsi: "${k}"`);
  return alasan;
}
