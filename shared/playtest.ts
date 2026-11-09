/**
 * Catatan playtest (PRD bagian Validasi), murni tanpa UI supaya mudah diuji.
 * Dipakai hanya dengan `?playtest=1`. Tidak ada data pribadi: tiap anak hanya diberi kode "Anak 1", "Anak 2", …
 *
 * - `CatatanSesi`: waktu mulai dan selesai, serta hitungan "Aku bingung" untuk anak yang sedang bermain.
 * - `ringkasMisi`: angka per misi yang dibaca dari progres dan catatan sesi.
 * - `HasilAnak` dan `keCsv`: hasil yang disimpan per anak, lalu diekspor ke CSV.
 */
import { MISI_UTAMA, cariMisi, pilihanBenar } from './content';
import { dibantuPenuh, progresAwal, type Progres } from './missions';

export interface CatatanSesi {
  /** Saat anak menekan "Mulai petualangan" (ms sejak epoch, supaya tetap benar setelah halaman dimuat ulang). */
  mulai?: number;
  festivalSelesai?: number;
  /** Saat misi pertama kali dibuka (status belum → sedang). */
  misiMulai: Record<string, number>;
  /** Saat misi selesai (alasan benar). */
  misiSelesai: Record<string, number>;
  /** Berapa kali anak menekan "Aku bingung" untuk misi itu sebelum misinya selesai. */
  bingung: Record<string, number>;
}

/** Keadaan anak yang sedang bermain. Disimpan terpisah dari progres biasa supaya progres asli laptop tidak tertimpa. */
export interface SesiPlaytest {
  progres: Progres;
  catatan: CatatanSesi;
  skorSebelum: number | null;
  skorSesudah: number | null;
}

export interface RingkasanMisi {
  misiId: string;
  /** Id pilihan alasan pertama (kosong kalau belum menjawab). */
  pilihanPertama: string | null;
  /** null = belum menjawab. */
  benarPertama: boolean | null;
  tingkatTertinggi: number;
  /** Pertama keliru, lalu benar dengan petunjuk paling tinggi tingkat 2. null = misi belum selesai. */
  perbaikiSendiri: boolean | null;
  /** Benar setelah petunjuk tingkat 3. null = misi belum selesai. */
  dibantuPenuh: boolean | null;
  bingung: number;
  /** Dari misi dibuka sampai selesai, dibulatkan ke detik. null = misi belum selesai. */
  durasiDetik: number | null;
}

export interface HasilAnak {
  anak: string;
  skorSebelum: number | null;
  skorSesudah: number | null;
  misi: RingkasanMisi[];
  durasiTotalDetik: number | null;
}

export function catatanBaru(): CatatanSesi {
  return { misiMulai: {}, misiSelesai: {}, bingung: {} };
}

export function sesiBaru(): SesiPlaytest {
  return { progres: progresAwal(), catatan: catatanBaru(), skorSebelum: null, skorSesudah: null };
}

/** Catat saat anak mulai bermain. Waktu yang sudah ada tidak ditimpa (mis. saat "Lanjutkan" setelah dimuat ulang). */
export function catatMulai(c: CatatanSesi, t: number): CatatanSesi {
  return c.mulai === undefined ? { ...c, mulai: t } : c;
}

/** Bandingkan progres sebelum dan sesudah satu perubahan, lalu catat waktu misi dimulai, misi selesai, dan Festival selesai. */
export function catatPerubahan(c: CatatanSesi, lama: Progres, baru: Progres, t: number): CatatanSesi {
  let hasil = c;
  for (const m of MISI_UTAMA) {
    const sebelum = lama.status[m.id] ?? 'belum';
    const sesudah = baru.status[m.id] ?? 'belum';
    if (sebelum === 'belum' && sesudah !== 'belum' && hasil.misiMulai[m.id] === undefined) {
      hasil = { ...hasil, misiMulai: { ...hasil.misiMulai, [m.id]: t } };
    }
    if (sebelum !== 'selesai' && sesudah === 'selesai' && hasil.misiSelesai[m.id] === undefined) {
      hasil = { ...hasil, misiSelesai: { ...hasil.misiSelesai, [m.id]: t } };
    }
  }
  if (!lama.festivalSelesai && baru.festivalSelesai && hasil.festivalSelesai === undefined) {
    hasil = { ...hasil, festivalSelesai: t };
  }
  return hasil;
}

/** Hitung satu tekanan "Aku bingung" untuk misi itu. Tekanan setelah misinya selesai tidak dihitung. */
export function catatBingung(c: CatatanSesi, p: Progres, misiId: string): CatatanSesi {
  if (!cariMisi(misiId)?.pertanyaan || p.status[misiId] === 'selesai') return c;
  return { ...c, bingung: { ...c.bingung, [misiId]: (c.bingung[misiId] ?? 0) + 1 } };
}

const detik = (dari?: number, sampai?: number) =>
  dari === undefined || sampai === undefined ? null : Math.max(0, Math.round((sampai - dari) / 1000));

export function ringkasMisi(p: Progres, c: CatatanSesi, misiId: string): RingkasanMisi {
  const misi = cariMisi(misiId);
  const pertama = p.pilihanPertama[misiId] ?? null;
  const benarPertama = pertama === null || !misi ? null : pilihanBenar(misi)?.id === pertama;
  const tingkatTertinggi = p.petunjuk[misiId] ?? 0;
  const selesai = p.status[misiId] === 'selesai';
  return {
    misiId,
    pilihanPertama: pertama,
    benarPertama,
    tingkatTertinggi,
    perbaikiSendiri: selesai ? benarPertama === false && tingkatTertinggi <= 2 : null,
    dibantuPenuh: selesai ? dibantuPenuh(p, misiId) : null,
    bingung: c.bingung[misiId] ?? 0,
    durasiDetik: selesai ? detik(c.misiMulai[misiId], c.misiSelesai[misiId]) : null,
  };
}

/** Dari anak mulai bermain sampai Festival Hujan selesai. */
export function durasiTotal(c: CatatanSesi): number | null {
  return detik(c.mulai, c.festivalSelesai);
}

export function hasilAnak(anak: string, s: SesiPlaytest): HasilAnak {
  return {
    anak,
    skorSebelum: s.skorSebelum,
    skorSesudah: s.skorSesudah,
    misi: MISI_UTAMA.map((m) => ringkasMisi(s.progres, s.catatan, m.id)),
    durasiTotalDetik: durasiTotal(s.catatan),
  };
}

/** Kode anonim anak berikutnya: satu lebih besar dari nomor terbesar yang sudah tersimpan. */
export function kodeBerikut(daftar: readonly HasilAnak[]): string {
  const nomor = daftar.map((h) => Number(/^Anak (\d+)$/.exec(h.anak)?.[1] ?? 0));
  return `Anak ${Math.max(0, ...nomor) + 1}`;
}

/** Skor tes 0–5 (bilangan bulat). Isian kosong = null; isian lain yang tidak sah = undefined. */
export function bacaSkor(teks: string): number | null | undefined {
  const t = teks.trim();
  if (t === '') return null;
  if (!/^\d+$/.test(t)) return undefined;
  const n = Number(t);
  return n >= 0 && n <= 5 ? n : undefined;
}

// ---- CSV ----

const KOLOM_MISI = [
  'pilihan_pertama',
  'benar_pertama',
  'tingkat_tertinggi',
  'perbaiki_sendiri',
  'dibantu_penuh',
  'bingung',
  'durasi_detik',
] as const;

/** Awalan kolom per misi, mis. `misi-1` → `misi1`. */
const awalan = (misiId: string) => misiId.replace(/[^a-z0-9]/gi, '');

export const KOLOM_CSV: string[] = [
  'anak',
  'skor_sebelum',
  'skor_sesudah',
  ...MISI_UTAMA.flatMap((m) => KOLOM_MISI.map((k) => `${awalan(m.id)}_${k}`)),
  'durasi_total_detik',
];

/** Kosong untuk data yang belum ada; ya/tidak ditulis 1/0 supaya mudah dijumlah di spreadsheet. */
function sel(v: string | number | boolean | null): string {
  if (v === null) return '';
  if (typeof v === 'boolean') return v ? '1' : '0';
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function barisCsv(h: HasilAnak): string[] {
  const perMisi = new Map(h.misi.map((r) => [r.misiId, r]));
  const isi: string[] = [sel(h.anak), sel(h.skorSebelum), sel(h.skorSesudah)];
  for (const m of MISI_UTAMA) {
    const r = perMisi.get(m.id);
    isi.push(
      sel(r?.pilihanPertama ?? null),
      sel(r?.benarPertama ?? null),
      sel(r?.tingkatTertinggi ?? 0),
      sel(r?.perbaikiSendiri ?? null),
      sel(r?.dibantuPenuh ?? null),
      sel(r?.bingung ?? 0),
      sel(r?.durasiDetik ?? null),
    );
  }
  isi.push(sel(h.durasiTotalDetik));
  return isi;
}

export function keCsv(daftar: readonly HasilAnak[]): string {
  return [KOLOM_CSV.join(','), ...daftar.map((h) => barisCsv(h).join(','))].join('\r\n') + '\r\n';
}

// ---- Penyimpanan (kunci terpisah dari progres biasa) ----

export const KUNCI_HASIL = 'pulau-tirta:playtest:hasil:v1';
export const KUNCI_SESI = 'pulau-tirta:playtest:sesi:v1';

type Penyimpanan = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function baca<T>(store: Pick<Storage, 'getItem'>, kunci: string): T | undefined {
  try {
    const raw = store.getItem(kunci);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function tulis(store: Pick<Storage, 'setItem'>, kunci: string, nilai: unknown): void {
  try {
    store.setItem(kunci, JSON.stringify(nilai));
  } catch {
    /* penyimpanan tidak tersedia: game tetap jalan */
  }
}

export function muatHasil(store: Pick<Storage, 'getItem'> = globalThis.localStorage): HasilAnak[] {
  const d = baca<unknown>(store, KUNCI_HASIL);
  return Array.isArray(d) ? (d as HasilAnak[]) : [];
}

export function simpanHasil(daftar: readonly HasilAnak[], store: Pick<Storage, 'setItem'> = globalThis.localStorage): void {
  tulis(store, KUNCI_HASIL, daftar);
}

export function muatSesi(store: Pick<Storage, 'getItem'> = globalThis.localStorage): SesiPlaytest {
  const d = baca<Partial<SesiPlaytest>>(store, KUNCI_SESI);
  const awal = sesiBaru();
  if (!d || typeof d !== 'object') return awal;
  return {
    progres: { ...awal.progres, ...d.progres },
    catatan: { ...awal.catatan, ...d.catatan },
    skorSebelum: d.skorSebelum ?? null,
    skorSesudah: d.skorSesudah ?? null,
  };
}

export function simpanSesi(s: SesiPlaytest, store: Pick<Storage, 'setItem'> = globalThis.localStorage): void {
  tulis(store, KUNCI_SESI, s);
}

export function hapusSesi(store: Pick<Storage, 'removeItem'> = globalThis.localStorage): void {
  try {
    store.removeItem(KUNCI_SESI);
  } catch {
    /* abaikan */
  }
}

/** Hapus semua hasil dan sesi anak yang sedang bermain. Progres biasa (bukan playtest) tidak disentuh. */
export function hapusSemua(store: Penyimpanan = globalThis.localStorage): void {
  try {
    store.removeItem(KUNCI_HASIL);
    store.removeItem(KUNCI_SESI);
  } catch {
    /* abaikan */
  }
}
