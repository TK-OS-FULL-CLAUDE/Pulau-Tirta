import Anthropic from '@anthropic-ai/sdk';
import { cariMisi, kartuUntuk, type KartuMateri, type Misi, type Tingkat } from '../shared/content';
import {
  BALASAN,
  FUN_FACT_TUNDA,
  faktaCadangan,
  kartuFunFact,
  periksaKeluar,
  periksaMasuk,
  petunjukCadangan,
  pilihKartuFunFact,
  type HasilKeluar,
} from '../shared/guardrail';

/** 'fakta' = tombol "Fun fact": Tiko menceritakan satu kartu materi dengan gaya seru. */
export type Mode = 'petunjuk' | 'tanya' | 'fakta';
export const MODE: readonly Mode[] = ['petunjuk', 'tanya', 'fakta'];

export interface PermintaanChat {
  pesan: string;
  mode: Mode;
  lokasi?: string;
  misiId?: string;
  statusMisi?: string;
  alasanId?: string;
  tingkat?: number;
  kartuDidapat?: number[];
  /** Mode 'fakta': nomor kartu yang baru saja diceritakan, supaya fun fact tidak berulang. */
  hindariKartu?: number[];
  riwayat?: { dari: 'anak' | 'tiko'; teks: string }[];
}

export interface JawabanChat {
  teks: string;
  sumber: 'model' | 'cadangan' | 'template';
  tingkat?: Tingkat;
  /** Mode 'fakta': nomor kartu materi yang diceritakan. */
  kartu?: number;
}

const BATAS_WAKTU_MS = Number(process.env.TIKO_TIMEOUT_MS ?? 8000);
const MODEL = process.env.TIKO_MODEL ?? 'claude-haiku-5-5';

function pakaiModel(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY) && process.env.TIKO_MOCK !== '1';
}

/** Untuk laporan uji: model apa yang dipakai, atau mode cadangan. */
export function infoModel(): { pakaiModel: boolean; model: string } {
  return { pakaiModel: pakaiModel(), model: MODEL };
}

/** Yang terjadi di dalam satu jawaban: teks mentah model, hasil guardrail keluar, atau galat API. Hanya untuk uji. */
export interface CatatanTiko {
  mentah?: string;
  keluar?: HasilKeluar;
  galat?: string;
}

let klien: Anthropic | null = null;
function getKlien(): Anthropic {
  if (!klien) klien = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: BATAS_WAKTU_MS, maxRetries: 0 });
  return klien;
}

/**
 * `tingkatLarangan`: tingkat yang kata terlarangnya berlaku. Sama dengan `tingkat` untuk petunjuk;
 * untuk ketikan bebas di misi yang belum selesai, tingkat 1 (lihat `jawabTiko`).
 */
export function systemPrompt(
  req: PermintaanChat,
  misi: Misi | undefined,
  tingkat?: Tingkat,
  tingkatLarangan: Tingkat | undefined = tingkat,
  /** Mode 'fakta': satu-satunya kartu yang boleh diceritakan. */
  kartuFakta?: KartuMateri,
): string {
  const kartu = (kartuFakta ? [kartuFakta] : kartuUntuk(misi))
    .map((k) => `${k.no}. ${k.fakta}`)
    .join('\n');
  const tugasFakta = kartuFakta
    ? `
FUN FACT
- Anak menekan tombol "Fun fact". Ceritakan fakta di kartu ${kartuFakta.no} sebagai fun fact yang seru.
- Awali dengan "Tahukah kamu?" atau "Fakta seru:". Maksimal 2 kalimat. Boleh satu contoh sehari-hari yang sederhana.
- Jangan menambah fakta sains lain di luar kartu itu.
`
    : '';
  const alasan = misi?.pilihan?.find((p) => p.id === req.alasanId)?.teks ?? '-';
  const terlarang = tingkatLarangan ? (misi?.kataTerlarang?.[String(tingkatLarangan)] ?? []).join(', ') || '-' : '-';
  return `Kamu adalah Tiko, tetes air kecil yang ceria di game "Petualangan Pulau Tirta".
Kamu menemani anak SD kelas V belajar siklus air.

CARA BICARA
- Bahasa Indonesia sederhana. Maksimal 3 kalimat pendek.
- Panggil pemain "kamu", sebut dirimu "aku". Ramah, sabar, tidak menggurui.
- Kalau memakai istilah (penguapan, pengembunan, dll.), jelaskan dengan contoh sehari-hari.
- Kalau ditanya, jujur bahwa kamu AI di dalam game.

FAKTA
- Untuk materi, gunakan HANYA fakta di KARTU MATERI. Kalau tidak tahu, bilang belum tahu dan ajak bertanya ke guru.
- Uap air tidak terlihat. Jangan pernah menyebut uap air sebagai asap.

MEMBANTU MISI
- Jangan pernah memberi jawaban pertanyaan misi secara langsung.
- Ini petunjuk tingkat ${tingkat ?? '-'}: 1 = pertanyaan balik, 2 = arahkan ke bukti di layar, 3 = jelaskan langkahnya.
- Kata yang DILARANG di tingkat ini: ${terlarang}.
- Alasan yang baru dipilih anak: ${alasan}.

BATASAN
- Hanya bahas game, sains, dan alam. Topik lain: tanggapi ramah satu kalimat, lalu ajak kembali ke petualangan.
- Jangan pernah menanyakan atau mengulang data pribadi (nama lengkap, alamat, sekolah, nomor HP).
- Kalau anak bercerita dirundung, disakiti, atau sangat sedih: tanggapi dengan lembut dan sarankan bercerita ke guru atau orang tua.
- Tidak ada kekerasan, hal menakutkan, atau konten dewasa.
${tugasFakta}
KEADAAN GAME
Lokasi: ${req.lokasi ?? '-'}
Misi aktif: ${misi?.judul ?? '-'} (${req.statusMisi ?? '-'})
Kartu Ilmu yang sudah didapat: ${(req.kartuDidapat ?? []).join(', ') || '-'}

KARTU MATERI
${kartu}`;
}

const BUKAN_KATA_KUNCI = new Set(['apa', 'itu', 'kenapa', 'mengapa', 'bagaimana', 'gimana', 'yang', 'dari', 'dengan', 'untuk', 'tiko', 'kamu', 'aku', 'dong', 'bisa', 'ada', 'tidak', 'nggak', 'air', 'jadi', 'kalau', 'apakah', 'sama', 'juga', 'kok', 'deh', 'mana', 'saja', 'aja']);

/**
 * Kartu materi yang paling cocok dengan pertanyaan (kata yang sama atau bentuk dasarnya), untuk jawaban tanpa AI.
 * Tanpa kecocokan: undefined, supaya Tiko tidak menjawab dengan fakta yang tidak nyambung.
 */
export function kartuPalingCocok(pesan: string, kartu: KartuMateri[]): KartuMateri | undefined {
  const dasar = (k: string) => k.replace(/^(pen|peng|pem|pe|me|meng|mem|ber|ter|di)(?=[a-z]{3})/, '').replace(/(an|kan|nya)$/, '');
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

function cadanganTanya(misi: Misi | undefined, pesan = ''): string {
  const cocok = kartuPalingCocok(pesan, kartuUntuk(misi));
  if (cocok) return `Ini yang aku tahu: ${cocok.fakta}`;
  if (!pesan) {
    const fakta = kartuUntuk(misi)[0]?.fakta;
    if (fakta) return `Ini yang aku tahu: ${fakta}`;
  }
  return BALASAN.cadanganTanya;
}

async function panggilModel(
  req: PermintaanChat,
  misi: Misi | undefined,
  tingkat?: Tingkat,
  tingkatLarangan?: Tingkat,
  kartuFakta?: KartuMateri,
): Promise<string> {
  const riwayat = (req.riwayat ?? []).slice(-6).map((r) => ({
    role: r.dari === 'anak' ? ('user' as const) : ('assistant' as const),
    content: r.teks,
  }));
  // API mensyaratkan pesan pertama dari user.
  while (riwayat.length && riwayat[0].role !== 'user') riwayat.shift();
  const res = await getKlien().messages.create({
    model: MODEL,
    max_tokens: 200,
    // Haiku 5.5 menolak temperature selain bawaan (400), jadi tidak dikirim. Thinking-nya menyala secara bawaan dan
    // bisa menghabiskan max_tokens sebelum ada teks; jawaban Tiko pendek, jadi thinking dimatikan.
    thinking: { type: 'disabled' },
    system: systemPrompt(req, misi, tingkat, tingkatLarangan, kartuFakta),
    messages: [...riwayat, { role: 'user', content: req.pesan }],
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join(' ');
}

export async function jawabTiko(req: PermintaanChat, catat?: (c: CatatanTiko) => void): Promise<JawabanChat> {
  const masuk = periksaMasuk(req.pesan);
  if (!masuk.lolos) return { teks: masuk.balasan, sumber: 'template' };

  const misi = req.misiId ? cariMisi(req.misiId) : undefined;
  const tingkat =
    req.mode === 'petunjuk' && misi ? (Math.min(3, Math.max(1, Number(req.tingkat) || 1)) as Tingkat) : undefined;
  // Ketikan bebas di lokasi misi yang belum selesai tetap tunduk pada aturan kebocoran tingkat 1;
  // kalau tidak, anak cukup mengetik "kasih tau jawabannya" untuk melewati petunjuk bertingkat.
  const misiAktif = Boolean(misi) && req.statusMisi !== 'selesai';
  const tingkatLarangan: Tingkat | undefined = tingkat ?? (misiAktif ? 1 : undefined);
  const cadangan = (): JawabanChat => {
    if (misi && tingkat) return { teks: petunjukCadangan(misi, tingkat), sumber: 'cadangan', tingkat };
    // Kartu materi misi aktif memuat jawabannya, jadi cadangan ketikan bebas berupa pertanyaan balik.
    if (misi && misiAktif) return { teks: petunjukCadangan(misi, 1), sumber: 'cadangan' };
    return { teks: cadanganTanya(misi, masuk.pesan), sumber: 'cadangan' };
  };

  if (req.mode === 'fakta') return jawabFakta({ ...req, pesan: masuk.pesan }, misi, misiAktif, catat);

  if (!pakaiModel()) return cadangan();
  try {
    const mentah = await panggilModel({ ...req, pesan: masuk.pesan }, misi, tingkat, tingkatLarangan);
    const keluar = periksaKeluar(mentah, { misi, tingkat: tingkatLarangan });
    catat?.({ mentah, keluar });
    if (!keluar.aman) return cadangan();
    return { teks: keluar.teks, sumber: 'model', tingkat };
  } catch (e) {
    catat?.({ galat: e instanceof Error ? e.message : String(e) });
    return cadangan();
  }
}

/**
 * Tombol "Fun fact": server memilih satu kartu materi (bukan model), lalu model menceritakannya dengan gaya seru.
 * Selama misi di lokasi ini belum selesai, kartu yang bisa membocorkan jawabannya tidak dipilih, dan jawaban model
 * tetap diperiksa dengan aturan kebocoran tingkat 1. Cadangannya isi kartu itu apa adanya.
 */
async function jawabFakta(
  req: PermintaanChat,
  misi: Misi | undefined,
  misiAktif: boolean,
  catat?: (c: CatatanTiko) => void,
): Promise<JawabanChat> {
  const hindari = Array.isArray(req.hindariKartu) ? req.hindariKartu.filter((n) => Number.isInteger(n)).slice(-12) : [];
  const kartu = pilihKartuFunFact(kartuFunFact(misi, misiAktif), hindari);
  if (!kartu) return { teks: FUN_FACT_TUNDA, sumber: 'template' };
  const cadangan: JawabanChat = { teks: faktaCadangan(kartu), sumber: 'cadangan', kartu: kartu.no };
  if (!pakaiModel()) return cadangan;
  const tingkatLarangan: Tingkat | undefined = misiAktif ? 1 : undefined;
  try {
    // Riwayat tidak dikirim: fun fact berdiri sendiri, dan prompt-nya hanya memuat satu kartu.
    const mentah = await panggilModel({ ...req, riwayat: [] }, misi, undefined, tingkatLarangan, kartu);
    const keluar = periksaKeluar(mentah, { misi, tingkat: tingkatLarangan });
    catat?.({ mentah, keluar });
    if (!keluar.aman) return cadangan;
    return { teks: keluar.teks, sumber: 'model', kartu: kartu.no };
  } catch (e) {
    catat?.({ galat: e instanceof Error ? e.message : String(e) });
    return cadangan;
  }
}
