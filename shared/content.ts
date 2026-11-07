import misiData from '../content/misi.json';
import kartuData from '../content/kartu-materi.json';

export type Tingkat = 1 | 2 | 3;

export interface Pilihan {
  id: string;
  teks: string;
  benar?: boolean;
  miskonsepsi?: string;
}

export interface Misi {
  id: string;
  judul: string;
  lokasi: string;
  konsep: string;
  kartuMateri: number[];
  pertanyaan?: string;
  pilihan?: Pilihan[];
  kataTerlarang?: Record<string, string[]>;
  kutipanTerlarang?: string[];
  petunjukCadangan?: Record<string, string>;
}

export interface Peristiwa {
  id: string;
  teks: string;
  tahap: string;
}

export interface KartuMateri {
  no: number;
  fakta: string;
}

export const DAFTAR_MISI: Misi[] = misiData.misi as Misi[];
export const FESTIVAL: { tahap: string[]; peristiwa: Peristiwa[] } = misiData.festival;
export const KARTU_MATERI: KartuMateri[] = kartuData.kartu;

/** Misi yang punya pertanyaan alasan (misi 1–4). */
export const MISI_UTAMA = DAFTAR_MISI.filter((m) => m.pertanyaan);

export function cariMisi(id: string): Misi | undefined {
  return DAFTAR_MISI.find((m) => m.id === id);
}

export function kartuUntuk(misi: Misi | undefined): KartuMateri[] {
  if (!misi) return KARTU_MATERI;
  return KARTU_MATERI.filter((k) => misi.kartuMateri.includes(k.no));
}

export function pilihanBenar(misi: Misi): Pilihan | undefined {
  return misi.pilihan?.find((p) => p.benar);
}
