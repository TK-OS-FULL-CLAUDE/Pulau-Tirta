/** Logika misi murni (tanpa Phaser) supaya mudah diuji. */
import { FESTIVAL, MISI_UTAMA, cariMisi, type Tingkat } from './content';

export type StatusMisi = 'belum' | 'sedang' | 'selesai';

export interface Progres {
  status: Record<string, StatusMisi>;
  /** Tingkat petunjuk tertinggi yang sudah diberikan per misi (0 = belum ada). */
  petunjuk: Record<string, number>;
  /** Pilihan alasan pertama per misi, untuk catatan playtest. */
  pilihanPertama: Record<string, string>;
  kartuDidapat: number[];
  festivalSelesai: boolean;
}

export function progresAwal(): Progres {
  const status: Record<string, StatusMisi> = {};
  for (const m of MISI_UTAMA) status[m.id] = 'belum';
  return { status, petunjuk: {}, pilihanPertama: {}, kartuDidapat: [], festivalSelesai: false };
}

export function mulaiMisi(p: Progres, id: string): Progres {
  if (p.status[id] !== 'belum') return p;
  return { ...p, status: { ...p.status, [id]: 'sedang' } };
}

export interface HasilJawab {
  progres: Progres;
  benar: boolean;
  /** Tingkat petunjuk yang harus diberikan berikutnya kalau salah. */
  tingkatPetunjuk?: Tingkat;
}

export function jawab(p: Progres, id: string, pilihanId: string): HasilJawab {
  const misi = cariMisi(id);
  const pilihan = misi?.pilihan?.find((x) => x.id === pilihanId);
  if (!misi || !pilihan) throw new Error(`Misi atau pilihan tidak dikenal: ${id}/${pilihanId}`);

  const pilihanPertama = p.pilihanPertama[id] ? p.pilihanPertama : { ...p.pilihanPertama, [id]: pilihanId };
  if (pilihan.benar) {
    const kartu = Array.from(new Set([...p.kartuDidapat, ...misi.kartuMateri])).sort((a, b) => a - b);
    return {
      benar: true,
      progres: { ...p, pilihanPertama, kartuDidapat: kartu, status: { ...p.status, [id]: 'selesai' } },
    };
  }
  const berikut = Math.min(3, (p.petunjuk[id] ?? 0) + 1) as Tingkat;
  return {
    benar: false,
    tingkatPetunjuk: berikut,
    progres: {
      ...p,
      pilihanPertama,
      status: { ...p.status, [id]: 'sedang' },
      petunjuk: { ...p.petunjuk, [id]: berikut },
    },
  };
}

/**
 * Acak urutan (Fisher–Yates) tanpa mengubah daftar asli.
 * Dipakai untuk pilihan alasan: di konten, pilihan benar selalu ditulis pertama.
 */
export function acak<T>(daftar: readonly T[], rng: () => number = Math.random): T[] {
  const hasil = [...daftar];
  for (let i = hasil.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [hasil[i], hasil[j]] = [hasil[j], hasil[i]];
  }
  return hasil;
}

/** Anak yang baru benar setelah petunjuk tingkat 3 dicatat "dibantu penuh". */
export function dibantuPenuh(p: Progres, id: string): boolean {
  return p.status[id] === 'selesai' && (p.petunjuk[id] ?? 0) >= 3;
}

export function festivalTerbuka(p: Progres): boolean {
  return MISI_UTAMA.every((m) => p.status[m.id] === 'selesai');
}

/** Cocokkan peristiwa → tahap. Mengembalikan id peristiwa yang salah (kosong = semua benar). */
export function periksaFestival(jawaban: Record<string, string>): string[] {
  return FESTIVAL.peristiwa.filter((e) => jawaban[e.id] !== e.tahap).map((e) => e.id);
}

const KUNCI = 'pulau-tirta:progres:v1';

export function simpan(p: Progres, store: Pick<Storage, 'setItem'> = globalThis.localStorage): void {
  try {
    store.setItem(KUNCI, JSON.stringify(p));
  } catch {
    /* penyimpanan tidak tersedia: game tetap jalan */
  }
}

export function muat(store: Pick<Storage, 'getItem'> = globalThis.localStorage): Progres {
  try {
    const raw = store.getItem(KUNCI);
    if (raw) return { ...progresAwal(), ...JSON.parse(raw) };
  } catch {
    /* abaikan */
  }
  return progresAwal();
}
