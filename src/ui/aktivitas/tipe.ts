import type { Misi, Tingkat } from '../../../shared/content';

/** Satu aktivitas misi yang tampil di dialog misi, di atas pertanyaan alasan. */
export interface Aktivitas {
  el: HTMLElement;
  /** Tunjukkan bukti di layar untuk tingkat petunjuk ini (dipakai mulai tingkat 2). */
  sorot(tingkat: Tingkat): void;
  /** Hentikan animasi saat dialog ditutup atau misi selesai. */
  hentikan(): void;
}

/** `siap` dipanggil sekali, saat anak sudah melihat akibat percobaannya; lalu pertanyaan alasan muncul. */
export type PembuatAktivitas = (misi: Misi, siap: () => void) => Aktivitas;
