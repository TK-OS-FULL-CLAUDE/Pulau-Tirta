/** Naskah warga Desa Tirta (content/warga.json) dan pemilihan naskah sesuai progres. */
import wargaData from '../content/warga.json';
import { MISI_UTAMA } from './content';
import { festivalTerbuka, type Progres } from './missions';

export interface Baris {
  siapa: string;
  teks: string;
}

export interface Pembicara {
  nama: string;
  ikon: string;
}

export interface NaskahWarga {
  pembicara: Record<string, Pembicara>;
  pembuka: Baris[];
  arahan: Record<string, Baris[]>;
  ajakanFestival: Baris[];
  sesudahFestival: Baris[];
}

export const WARGA: NaskahWarga = wargaData;

/** Panjang maksimal satu baris supaya muat dalam 2 baris kotak dialog (PRD: maksimal 2 baris). */
export const PANJANG_BARIS_MAKS = 140;

export type JenisNaskah = 'arahan' | 'festival' | 'sesudah';

/**
 * Apa yang dikatakan warga di Desa Tirta: arahan ke misi pertama yang belum selesai (sistem arahan halus
 * tingkat 2 di PRD), ajakan ke Festival kalau keempat misi selesai, atau terima kasih sesudah Festival.
 */
export function naskahDesa(p: Progres, naskah: NaskahWarga = WARGA): { jenis: JenisNaskah; baris: Baris[] } {
  if (p.festivalSelesai) return { jenis: 'sesudah', baris: naskah.sesudahFestival };
  if (festivalTerbuka(p)) return { jenis: 'festival', baris: naskah.ajakanFestival };
  const misi = MISI_UTAMA.find((m) => p.status[m.id] !== 'selesai')!;
  return { jenis: 'arahan', baris: naskah.arahan[misi.id] ?? [] };
}
