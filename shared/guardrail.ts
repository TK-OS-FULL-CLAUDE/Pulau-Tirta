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
  /(\+62|62|0)8\d{7,12}/, // nomor HP (diperiksa juga setelah spasi, titik, dan strip dibuang; lihat `adaDataPribadi`)
  /[\w.+-]+@[\w-]+\.[\w.]+/, // email
  /(^|\s)@[a-z0-9_.]{3,}/i, // akun media sosial (@nama)
  /\b(alamat(ku| rumah(ku)?)?|rumahku di|nomor (hp|wa|telepon)ku|nama lengkapku)\b/i,
  /\b(sekolah ?ku di|(aku|saya) sekolah di)\b/i,
  /\b(sekolah ?ku|sekolah (aku|saya))( adalah| namanya)? (sd|sdn|sdit|mi|min)\b/i,
  /\b(nama ?ku|nama (aku|saya))( adalah)? \p{L}{2,}/iu,
  /\btinggal di (jl|jln|jalan|gang|gg|perum|perumahan|komplek|kompleks|rt|blok)\b/i,
  /\b(jl|jln|gg)\.? ?\p{L}+ .*\b(no|nomor|blok)\b/iu,
];

/** Nomor HP sering ditulis dengan spasi atau strip ("0812-3456-7890"), jadi digit juga diperiksa dalam bentuk rapat. */
function adaDataPribadi(pesan: string): boolean {
  const rapat = pesan.replace(/(?<=[\d+])[\s.-]+(?=\d)/g, '');
  return POLA_DATA_PRIBADI.some((p) => p.test(pesan) || p.test(rapat));
}

// Contoh awal; lengkapi dengan daftar yang disusun tim.
const KATA_KASAR = ['anjing', 'bangsat', 'goblok', 'tolol', 'kontol', 'memek', 'bodoh lu'];

/** Huruf yang sering diganti angka atau simbol supaya lolos filter ("k0nt0l"). Hanya untuk pemeriksaan kata kasar. */
function tanpaSamaran(teks: string): string {
  const ganti: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };
  return teks.toLowerCase().replace(/[013457@$]/g, (c) => ganti[c]);
}

/** Termasuk tulisan singkat yang biasa dipakai anak ("bgt", "dibuli", "pengen mati"). */
const KATA_KHAWATIR = [
  'dirundung',
  'dirisak',
  'dibully',
  'dibuly',
  'dibuli',
  'di bully',
  'di buli',
  'dipukul',
  'dipukulin',
  'ditampar',
  'disakiti',
  'dianiaya',
  'sedih banget',
  'sedih bgt',
  'sedih sekali',
  'ingin mati',
  'mau mati',
  'pengen mati',
  'pingin mati',
  'pengin mati',
  'bunuh diri',
  'melukai diri',
  'nyakitin diri',
  'menyakiti diri',
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
  cadanganTanya: 'Aku belum bisa menjawab itu sekarang. Coba buka layar Misi, atau tanyakan ke gurumu.',
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
  if (adaDataPribadi(pesan)) return { lolos: false, alasan: 'data-pribadi', balasan: BALASAN.dataPribadi };
  if (KATA_KASAR.some((k) => mengandungKata(pesan, k) || mengandungKata(tanpaSamaran(pesan), k)))
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
  // Sapaan dan perkenalan model sering menghabiskan tiga kalimat sebelum inti jawaban.
  // Hanya buang kalimat pembuka yang seluruhnya basa-basi; "Hai, air ..." tetap utuh.
  const isi = kalimat.filter((k) => !(
    /^(hai|halo|helo)[!. ]*$/i.test(k.trim()) ||
    /^(hai[!, ]*|halo[!, ]*)?aku tiko\b/i.test(k.trim()) ||
    /^(wah[,! ]*)?(itu )?pertanyaan( yang)? (bagus|menarik)/i.test(k.trim())
  ));
  return (isi.length ? isi : kalimat)
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

const BUKAN_KATA_KUNCI = new Set(['apa', 'itu', 'kenapa', 'mengapa', 'bagaimana', 'gimana', 'yang', 'dari', 'dengan', 'untuk', 'tiko', 'kamu', 'aku', 'kita', 'dong', 'bisa', 'ada', 'tidak', 'nggak', 'air', 'jadi', 'kalau', 'apakah', 'sama', 'juga', 'kok', 'deh', 'mana', 'saja', 'aja']);

/**
 * Kartu materi yang paling cocok dengan pertanyaan (kata yang sama atau bentuk dasarnya), untuk jawaban tanpa AI.
 * Tanpa kecocokan: undefined, supaya Tiko tidak menjawab dengan fakta yang tidak nyambung.
 */
export function kartuPalingCocok(pesan: string, kartu: KartuMateri[]): KartuMateri | undefined {
  const dasar = (k: string) => k.replace(/^(peng|pen|pem|meng|mem|ber|ter|pe|me|di)(?=[a-z]{3})/, '').replace(/(kan|nya|an)$/, '');
  const kata = (pesan.toLowerCase().match(/[a-z]+/g) ?? []).filter((k) => k.length >= 3 && !BUKAN_KATA_KUNCI.has(k));
  let terbaik: KartuMateri | undefined;
  let skor = 0;
  for (const k of kartu) {
    const fakta = k.fakta.toLowerCase();
    const s = kata.reduce((n, w) => n + (fakta.includes(w) ? 2 : dasar(w).length >= 3 && fakta.includes(dasar(w)) ? 1 : 0), 0);
    if (s > skor) {
      skor = s;
      terbaik = k;
    }
  }
  return terbaik;
}

/** Identitas dan privasi harus tetap benar ketika API mati, termasuk di browser offline. */
export function jawabanTentangTiko(pesan: string): string | undefined {
  const t = normal(pesan);
  const balasan: string[] = [];
  if (/\b(obrolan|percakapan|chat|pesan|riwayat)\b/.test(t) && /simpan|rekam/.test(t))
    balasan.push('Percakapan tidak disimpan di server; riwayat hanya ada sementara selama aplikasi dibuka.');
  if (/\b(kamu|tiko|jawabanmu)\b/.test(t) && /\b(salah|keliru|benar|sempurna)\b/.test(t))
    balasan.push('Aku bisa salah, jadi cek juga Kartu Ilmu atau tanyakan ke guru, ya.');
  if (/\b(kamu|tiko)\b/.test(t) && /\b(manusia|robot|ai|siapa|program)\b/.test(t))
    balasan.push('Aku Tiko, AI di dalam game, bukan manusia.');
  return balasan.length ? balasan.join(' ') : undefined;
}

/** Pertanyaan sebab-akibat bisa memerlukan lebih dari satu kartu, bukan kecocokan satu kata saja. */
export function kartuUntukPertanyaan(pesan: string, kartu: KartuMateri[]): KartuMateri[] {
  const t = normal(pesan);
  let nomor: number[] | undefined;
  if (/jaga|hemat|lindungi/.test(t) && /air|siklus/.test(t)) nomor = [12];
  else if (/siklus air/.test(t) && /urut|tahap|proses|gimana|bagaimana/.test(t)) nomor = [3, 6, 8, 9, 10];
  else if (/uap/.test(t) && /naik|tinggi|dingin/.test(t)) nomor = [5, 6];
  else if (/hujan/.test(t) && /tanah|setelah|sesudah/.test(t)) nomor = [9, 10];
  else if (/sungai/.test(t) && /mana|menuju|muara/.test(t)) nomor = [10];
  else if (/\bwujud\b|\bes batu\b/.test(t)) nomor = [2];
  else if (/uap/.test(t) && /lihat|kelihatan|tampak/.test(t)) nomor = [3];
  const pilihan = nomor?.map((no) => kartu.find((k) => k.no === no)).filter((k): k is KartuMateri => Boolean(k));
  if (pilihan?.length) return pilihan;
  const cocok = kartuPalingCocok(pesan, kartu);
  return cocok ? [cocok] : [];
}

/** Ambil fakta dari konten yang sama di server dan browser; jangan menjawab dengan kartu acak. */
export function jawabanMateriCadangan(pesan: string, kartu: KartuMateri[]): string | undefined {
  const pilihan = kartuUntukPertanyaan(pesan, kartu);
  if (!pilihan.length) return undefined;
  if (pilihan.length === 1) return `Ini yang aku tahu: ${pilihan[0].fakta}`;
  // Ringkasan lintas tahap: tiap kartu menyumbang fakta pertamanya, tetap maksimal tiga kalimat.
  const fakta = pilihan.map((k) => k.fakta.split(/(?<=[.!?])\s+/)[0].replace(/[.!?]+$/, ''));
  const teks = fakta.slice(0, 2).join('. ') + (fakta.length > 2 ? `. ${fakta.slice(2).join('; ')}` : '');
  return `Ini yang aku tahu: ${teks}.`;
}
