import misiData from '../content/misi.json';
import kartuData from '../content/kartu-materi.json';

export type Tingkat = 1 | 2 | 3;

export interface Pilihan {
  id: string;
  teks: string;
  benar?: boolean;
  miskonsepsi?: string;
}

/**
 * Teks yang tampil di aktivitas misi. `arahan`, `siap`, dan `sorot` tampil SEBELUM anak menjawab,
 * jadi wajib lolos aturan kebocoran tingkat 1 (diuji). `catatanSesudah` tampil setelah jawaban benar.
 */
export interface TeksAktivitas {
  arahan: string;
  /** Langkah tambahan sebelum pertanyaan (dipakai Hutan & Sungai): menanam bibit, lalu membuka sungai yang tersumbat. */
  tanam?: string;
  sumbat?: string;
  /** Puncak Kabut: angin sudah ke arah gunung tapi terlalu lemah. */
  lemah?: string;
  siap: string;
  sorot?: string;
  catatanSesudah?: string;
  /** Label di gambar dan tombol aktivitas (kunci ditentukan tiap aktivitas). Tampil sebelum menjawab, jadi ikut diuji. */
  label?: Record<string, string>;
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
  aktivitas?: TeksAktivitas;
}

export interface Peristiwa {
  id: string;
  teks: string;
  /** Gambar kecil di kartu peristiwa (membantu anak yang membaca pelan). */
  ikon?: string;
  tahap: string;
  /** Petunjuk template Tiko per tingkat ("1"–"3"). Tingkat 1–2 tidak boleh menyebut kata terlarang tahapnya (diuji). */
  petunjuk?: Record<string, string>;
}

export interface Festival {
  tahap: string[];
  kartuMateri: number[];
  /** Kata yang tidak boleh muncul di petunjuk tingkat 1–2 untuk peristiwa dengan tahap ini. */
  kataTerlarang: Record<string, string[]>;
  peristiwa: Peristiwa[];
}

export interface KartuMateri {
  no: number;
  fakta: string;
}

export const DAFTAR_MISI: Misi[] = misiData.misi as Misi[];
export const FESTIVAL: Festival = misiData.festival as Festival;
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
