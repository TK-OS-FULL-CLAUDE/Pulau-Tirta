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

/** Satu baris naskah penduduk: teks biasa diucapkan warga itu sendiri, atau baris lengkap untuk pembicara lain. */
export type BarisPenduduk = string | Baris;

export type KeadaanPenduduk = 'sebelum' | 'sesudah' | 'festival' | 'tamat';

/** Warga yang berjalan di desa (NPC di peta). Kuncinya sama dengan id NPC, misalnya village_npc_1. */
export interface Penduduk extends Pembicara, Record<KeadaanPenduduk, BarisPenduduk[]> {
  peran: string;
  /** Tempat yang dipedulikan warga ini; ia menyebutnya sampai tempat itu pulih. */
  misi: string;
}

export interface NaskahWarga {
  pembicara: Record<string, Pembicara>;
  pembuka: Baris[];
  arahan: Record<string, Baris[]>;
  ajakanFestival: Baris[];
  sesudahFestival: Baris[];
  penduduk: Record<string, Penduduk>;
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

/** Semua pembicara untuk kotak dialog: Kepala Desa, Tiko, dan para penduduk. */
export function semuaPembicara(naskah: NaskahWarga = WARGA): Record<string, Pembicara> {
  const penduduk = Object.entries(naskah.penduduk).map(([id, w]) => [id, { nama: w.nama, ikon: w.ikon }] as const);
  return { ...naskah.pembicara, ...Object.fromEntries(penduduk) };
}

/**
 * Apa yang dikatakan seorang penduduk sesuai progres (sistem arahan halus tingkat 2 di PRD): menyebut tempat yang
 * dipedulikannya sampai tempat itu pulih, lalu berterima kasih; mengajak ke Festival; dan merayakan sesudahnya.
 * undefined kalau id itu bukan penduduk yang punya naskah (warga hiasan).
 */
export function naskahPenduduk(
  p: Progres,
  wargaId: string,
  naskah: NaskahWarga = WARGA,
): { jenis: KeadaanPenduduk; baris: Baris[] } | undefined {
  const w = naskah.penduduk[wargaId];
  if (!w) return undefined;
  const jenis: KeadaanPenduduk = p.festivalSelesai
    ? 'tamat'
    : festivalTerbuka(p)
      ? 'festival'
      : p.status[w.misi] === 'selesai'
        ? 'sesudah'
        : 'sebelum';
  return { jenis, baris: w[jenis].map((b) => (typeof b === 'string' ? { siapa: wargaId, teks: b } : b)) };
}
