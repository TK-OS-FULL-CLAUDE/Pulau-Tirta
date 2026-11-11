/**
 * Guardrail Tiko. Dipakai server (sebelum dan sesudah model) dan diuji otomatis.
 * Daftar kata di sini adalah titik awal; tim konten melengkapinya.
 */
import type { KartuMateri, Misi, Tingkat } from './content';
import { KARTU_MATERI, pilihanBenar } from './content';

export const BATAS_PANJANG_PESAN = 200;
export const MAKS_KALIMAT_JAWABAN = 3;

export type HasilMasuk =
  | { lolos: true; pesan: string }
  | { lolos: false; alasan: 'kosong' | 'terlalu-panjang' | 'data-pribadi' | 'kata-kasar' | 'khawatir'; balasan: string };

const POLA_DATA_PRIBADI: RegExp[] = [
  /(\+62|62|0)8\d{7,12}/, // nomor HP
  /[\w.+-]+@[\w-]+\.[\w.]+/, // email
  /\b(alamat(ku| rumah(ku)?)?|rumahku di|nomor (hp|wa|telepon)ku|sekolahku di|nama lengkapku)\b/i,
];

// Contoh awal; lengkapi dengan daftar yang disusun tim.
const KATA_KASAR = ['anjing', 'bangsat', 'goblok', 'tolol', 'kontol', 'memek', 'bodoh lu'];

const KATA_KHAWATIR = [
  'dirundung',
  'dibully',
  'dipukul',
  'disakiti',
  'dianiaya',
  'sedih banget',
  'sedih sekali',
  'ingin mati',
  'mau mati',
  'bunuh diri',
];

export const BALASAN = {
  kosong: 'Kamu belum menulis apa-apa. Mau tanya soal air, atau minta petunjuk?',
  terlaluPanjang: `Pesannya terlalu panjang untukku. Coba tulis lebih singkat, maksimal ${BATAS_PANJANG_PESAN} huruf, ya.`,
  dataPribadi:
    'Eh, jangan tulis nomor HP, alamat, atau nama lengkap di sini, ya. Itu rahasiamu. Yuk lanjut berpetualang!',
  kataKasar: 'Yuk pakai kata-kata yang baik. Ada yang mau kamu tanyakan soal air?',
  khawatir:
    'Terima kasih sudah cerita. Itu pasti berat. Ceritakan juga ke guru atau orang tuamu sekarang, ya. Mereka bisa membantumu.',
  diLuarTopik: 'Hmm, aku cuma tahu soal air dan alam. Yuk kembali ke petualangan! Mau ke mana kita?',
  cadanganTanya: 'Aku belum bisa menjawab itu sekarang. Coba buka Jurnal Petualangan, atau tanyakan ke gurumu.',
};

function normal(teks: string): string {
  return teks
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mengandungKata(teks: string, kata: string): boolean {
  const t = ` ${normal(teks)} `;
  return t.includes(` ${normal(kata)} `) || t.includes(` ${normal(kata)}`);
}

export function periksaMasuk(pesanMentah: string): HasilMasuk {
  const pesan = (pesanMentah ?? '').trim();
  if (!pesan) return { lolos: false, alasan: 'kosong', balasan: BALASAN.kosong };
  if (pesan.length > BATAS_PANJANG_PESAN)
    return { lolos: false, alasan: 'terlalu-panjang', balasan: BALASAN.terlaluPanjang };
  if (KATA_KHAWATIR.some((k) => mengandungKata(pesan, k)))
    return { lolos: false, alasan: 'khawatir', balasan: BALASAN.khawatir };
  if (POLA_DATA_PRIBADI.some((p) => p.test(pesan)))
    return { lolos: false, alasan: 'data-pribadi', balasan: BALASAN.dataPribadi };
  if (KATA_KASAR.some((k) => mengandungKata(pesan, k)))
    return { lolos: false, alasan: 'kata-kasar', balasan: BALASAN.kataKasar };
  return { lolos: true, pesan };
}

/** Potong jawaban model menjadi maksimal 3 kalimat. */
export function rapikanJawaban(teks: string): string {
  const kalimat = teks
    .replace(/\s+/g, ' ')
    .trim()
    .match(/[^.!?]+[.!?]*/g);
  if (!kalimat) return teks.trim();
  return kalimat
    .slice(0, MAKS_KALIMAT_JAWABAN)
    .map((k) => k.trim())
    .join(' ');
}

const STOPWORD = new Set(['yang', 'dan', 'di', 'ke', 'dari', 'jadi', 'itu', 'ini', 'air', 'untuk', 'dengan', 'menjadi']);

function kataIsi(teks: string): string[] {
  return normal(teks)
    .split(' ')
    .filter((w) => w.length > 2 && !STOPWORD.has(w));
}

/** True kalau teks memuat urutan 4 kata atau lebih dari kalimat sumber, atau ≥70% kata isinya. */
export function mirip(teks: string, sumber: string): boolean {
  const a = normal(teks).split(' ');
  const b = normal(sumber).split(' ');
  for (let i = 0; i + 4 <= b.length; i++) {
    const potong = b.slice(i, i + 4).join(' ');
    if (` ${a.join(' ')} `.includes(` ${potong} `)) return true;
  }
  const isi = new Set(kataIsi(sumber));
  if (isi.size === 0) return false;
  const ada = kataIsi(teks).filter((w) => isi.has(w));
  return new Set(ada).size / isi.size >= 0.7;
}

export type HasilKeluar = { aman: true; teks: string } | { aman: false; alasan: string };

/**
 * Periksa jawaban Tiko sebelum tampil. Untuk mode petunjuk, terapkan aturan kebocoran per misi dan tingkat.
 */
export function periksaKeluar(teks: string, opsi: { misi?: Misi; tingkat?: Tingkat } = {}): HasilKeluar {
  const rapi = rapikanJawaban(teks);
  if (!rapi) return { aman: false, alasan: 'kosong' };
  if (KATA_KASAR.some((k) => mengandungKata(rapi, k))) return { aman: false, alasan: 'kata-kasar' };
  if (/\b(siapa nama lengkapmu|di mana (alamat|rumah)mu|berapa nomor|sekolahmu di mana)\b/i.test(rapi))
    return { aman: false, alasan: 'minta-data-pribadi' };

  const { misi, tingkat } = opsi;
  if (misi && tingkat) {
    const terlarang = misi.kataTerlarang?.[String(tingkat)] ?? [];
    const kena = terlarang.find((k) => mengandungKata(rapi, k));
    if (kena) return { aman: false, alasan: `bocor-kata:${kena}` };
    const benar = pilihanBenar(misi);
    const kutipan = [...(misi.kutipanTerlarang ?? []), ...(benar ? [benar.teks] : [])];
    if (kutipan.some((k) => mirip(rapi, k))) return { aman: false, alasan: 'bocor-kutipan' };
  }
  return { aman: true, teks: rapi };
}

/** Petunjuk cadangan untuk misi dan tingkat; selalu lolos periksaKeluar (diuji). */
export function petunjukCadangan(misi: Misi, tingkat: Tingkat): string {
  return misi.petunjukCadangan?.[String(tingkat)] ?? 'Coba lihat lagi apa yang berubah di layar. Apa bedanya?';
}

/** Fun fact cadangan: isi kartu materi apa adanya, jadi selalu benar dan tetap jalan tanpa AI atau internet. */
export function faktaCadangan(kartu: KartuMateri): string {
  return `Fakta seru: ${kartu.fakta}`;
}

/**
 * Kartu yang boleh diceritakan sebagai fun fact. Selama misi di lokasi ini belum selesai, kartu misi itu dan kartu
 * yang memuat kata terlarang tingkat 1 dilewati, supaya fun fact tidak membocorkan jawaban misi.
 */
export function kartuFunFact(misi?: Misi, misiAktif = false): KartuMateri[] {
  if (!misi || !misiAktif) return KARTU_MATERI;
  return KARTU_MATERI.filter(
    (k) => !misi.kartuMateri.includes(k.no) && periksaKeluar(faktaCadangan(k), { misi, tingkat: 1 }).aman,
  );
}

/** Pilih satu kartu fun fact, sebisa mungkin yang belum baru saja diceritakan. */
export function pilihKartuFunFact(
  pilihan: KartuMateri[],
  hindari: number[] = [],
  acak: () => number = Math.random,
): KartuMateri | undefined {
  const baru = pilihan.filter((k) => !hindari.includes(k.no));
  const kumpulan = baru.length ? baru : pilihan;
  return kumpulan[Math.floor(acak() * kumpulan.length)];
}

/** Kalau semua kartu bisa membocorkan misi yang sedang berjalan. */
export const FUN_FACT_TUNDA =
  'Fun fact-ku soal tempat ini aku simpan dulu sampai misinya selesai, ya. Coba tanya aku lagi nanti!';
