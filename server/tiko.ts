import Anthropic from '@anthropic-ai/sdk';
import { cariMisi, kartuUntuk, type Misi, type Tingkat } from '../shared/content';
import { BALASAN, periksaKeluar, periksaMasuk, petunjukCadangan } from '../shared/guardrail';

export type Mode = 'petunjuk' | 'tanya';

export interface PermintaanChat {
  pesan: string;
  mode: Mode;
  lokasi?: string;
  misiId?: string;
  statusMisi?: string;
  alasanId?: string;
  tingkat?: number;
  kartuDidapat?: number[];
  riwayat?: { dari: 'anak' | 'tiko'; teks: string }[];
}

export interface JawabanChat {
  teks: string;
  sumber: 'model' | 'cadangan' | 'template';
  tingkat?: Tingkat;
}

const BATAS_WAKTU_MS = Number(process.env.TIKO_TIMEOUT_MS ?? 8000);
const MODEL = process.env.TIKO_MODEL ?? 'claude-haiku-5-5';

function pakaiModel(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY) && process.env.TIKO_MOCK !== '1';
}

let klien: Anthropic | null = null;
function getKlien(): Anthropic {
  if (!klien) klien = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: BATAS_WAKTU_MS, maxRetries: 0 });
  return klien;
}

export function systemPrompt(req: PermintaanChat, misi: Misi | undefined, tingkat?: Tingkat): string {
  const kartu = kartuUntuk(misi)
    .map((k) => `${k.no}. ${k.fakta}`)
    .join('\n');
  const alasan = misi?.pilihan?.find((p) => p.id === req.alasanId)?.teks ?? '-';
  const terlarang = tingkat ? (misi?.kataTerlarang?.[String(tingkat)] ?? []).join(', ') || '-' : '-';
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

KEADAAN GAME
Lokasi: ${req.lokasi ?? '-'}
Misi aktif: ${misi?.judul ?? '-'} (${req.statusMisi ?? '-'})
Kartu Ilmu yang sudah didapat: ${(req.kartuDidapat ?? []).join(', ') || '-'}

KARTU MATERI
${kartu}`;
}

function cadanganTanya(misi: Misi | undefined): string {
  const fakta = kartuUntuk(misi)[0]?.fakta;
  return fakta ? `Ini yang aku tahu: ${fakta}` : BALASAN.cadanganTanya;
}

async function panggilModel(req: PermintaanChat, misi: Misi | undefined, tingkat?: Tingkat): Promise<string> {
  const riwayat = (req.riwayat ?? []).slice(-6).map((r) => ({
    role: r.dari === 'anak' ? ('user' as const) : ('assistant' as const),
    content: r.teks,
  }));
  // API mensyaratkan pesan pertama dari user.
  while (riwayat.length && riwayat[0].role !== 'user') riwayat.shift();
  const res = await getKlien().messages.create({
    model: MODEL,
    max_tokens: 200,
    temperature: 0.3,
    system: systemPrompt(req, misi, tingkat),
    messages: [...riwayat, { role: 'user', content: req.pesan }],
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join(' ');
}

export async function jawabTiko(req: PermintaanChat): Promise<JawabanChat> {
  const masuk = periksaMasuk(req.pesan);
  if (!masuk.lolos) return { teks: masuk.balasan, sumber: 'template' };

  const misi = req.misiId ? cariMisi(req.misiId) : undefined;
  const tingkat =
    req.mode === 'petunjuk' && misi ? (Math.min(3, Math.max(1, Number(req.tingkat) || 1)) as Tingkat) : undefined;
  const cadangan = (): JawabanChat =>
    misi && tingkat
      ? { teks: petunjukCadangan(misi, tingkat), sumber: 'cadangan', tingkat }
      : { teks: cadanganTanya(misi), sumber: 'cadangan' };

  if (!pakaiModel()) return cadangan();
  try {
    const mentah = await panggilModel({ ...req, pesan: masuk.pesan }, misi, tingkat);
    const keluar = periksaKeluar(mentah, { misi, tingkat });
    if (!keluar.aman) return cadangan();
    return { teks: keluar.teks, sumber: 'model', tingkat };
  } catch {
    return cadangan();
  }
}
