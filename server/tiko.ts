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
  kartuPalingCocok,
  kartuUntukPertanyaan,
  jawabanTanyaCadangan,
  jawabanTentangTiko,
  pilihKartuFunFact,
  type HasilKeluar,
} from '../shared/guardrail';

export { kartuPalingCocok };

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

// Sisakan waktu untuk pemeriksaan keluaran dan cadangan sebelum batas delapan detik PRD.
const timeoutDiminta = Number(process.env.TIKO_TIMEOUT_MS ?? 7000);
const BATAS_WAKTU_MS = Number.isFinite(timeoutDiminta) && timeoutDiminta > 0 ? Math.min(timeoutDiminta, 7500) : 7000;

/** Penyedia model: `TIKO_PROVIDER`, atau otomatis dari key yang terisi (Gemini lebih dulu). */
export type Penyedia = 'gemini' | 'anthropic';
const MODEL_BAWAAN: Record<Penyedia, string> = { gemini: 'gemini-3.5-flash-lite', anthropic: 'claude-haiku-5-5' };

function penyedia(): Penyedia {
  const p = process.env.TIKO_PROVIDER?.trim().toLowerCase();
  if (p === 'gemini' || p === 'anthropic') return p;
  return process.env.GEMINI_API_KEY ? 'gemini' : 'anthropic';
}

function keyPenyedia(p: Penyedia): string | undefined {
  return (p === 'gemini' ? process.env.GEMINI_API_KEY : process.env.ANTHROPIC_API_KEY)?.trim() || undefined;
}

function modelDipakai(): string {
  return process.env.TIKO_MODEL?.trim() || MODEL_BAWAAN[penyedia()];
}

export function pakaiModel(): boolean {
  return Boolean(keyPenyedia(penyedia())) && process.env.TIKO_MOCK !== '1';
}

/** Untuk laporan uji dan /api/health: penyedia dan model yang dipakai, atau mode cadangan. */
export function infoModel(): { pakaiModel: boolean; penyedia: Penyedia; model: string } {
  return { pakaiModel: pakaiModel(), penyedia: penyedia(), model: modelDipakai() };
}

/** Yang terjadi di dalam satu jawaban: teks mentah model, hasil guardrail keluar, atau galat API. Hanya untuk uji. */
export interface CatatanTiko {
  mentah?: string;
  keluar?: HasilKeluar;
  galat?: string;
  ditunda?: string;
}

// Jangan terus menembak penyedia yang sedang menolak kuota atau timeout. Status ini hanya di memori.
let jedaModel = { identitas: '', sampai: 0, alasan: '' };
function identitasModel(): string {
  return `${penyedia()}:${modelDipakai()}:${keyPenyedia(penyedia())}`;
}
export function infoJedaModel(): { ms: number; alasan: string } {
  return jedaModel.identitas === identitasModel()
    ? { ms: Math.max(0, jedaModel.sampai - Date.now()), alasan: jedaModel.alasan }
    : { ms: 0, alasan: '' };
}
class GalatModel extends Error {
  constructor(message: string, readonly status: number, readonly jedaMs = 60_000) { super(message); }
}
function catatKegagalan(e: unknown, catat?: (c: CatatanTiko) => void): void {
  const pesan = e instanceof Error ? e.message : String(e);
  catat?.({ galat: pesan });
  const status = (e as { status?: number })?.status;
  const timeout = e instanceof Error && /timeout|timed out|aborted/i.test(`${e.name} ${pesan}`);
  const jaringan = e instanceof Error && /fetch failed|ECONNREFUSED|ENETUNREACH|ENOTFOUND|EAI_AGAIN|ECONNRESET|APIConnectionError/i.test(`${e.name} ${pesan}`);
  if (status === 429 || timeout || jaringan) {
    jedaModel = {
      identitas: identitasModel(),
      sampai: Date.now() + (status === 429 ? (e instanceof GalatModel ? e.jedaMs : 60_000) : 15_000),
      alasan: status === 429 ? 'Kuota/batas laju API; memakai cadangan sementara.'
        : timeout ? 'API timeout; memakai cadangan sementara.' : 'Koneksi API gagal; memakai cadangan sementara.',
    };
  }
}

let klien: Anthropic | null = null;
function getKlien(): Anthropic {
  if (!klien) klien = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: BATAS_WAKTU_MS, maxRetries: 0 });
  return klien;
}

type PesanModel = { role: 'user' | 'assistant'; content: string };

async function panggilAnthropic(system: string, messages: PesanModel[]): Promise<string> {
  const res = await getKlien().messages.create({
    model: modelDipakai(),
    max_tokens: 200,
    // Haiku 5.5 menolak temperature selain bawaan (400), jadi tidak dikirim. Thinking-nya menyala secara bawaan dan
    // bisa menghabiskan max_tokens sebelum ada teks; jawaban Tiko pendek, jadi thinking dimatikan.
    thinking: { type: 'disabled' },
    system,
    messages,
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join(' ');
}

/** Filter keamanan Gemini dipasang paling ketat, karena penggunanya anak. Guardrail keluar tetap jalan sesudahnya. */
const KEAMANAN_GEMINI = [
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
].map((category) => ({ category, threshold: 'BLOCK_LOW_AND_ABOVE' }));

/** Isi permintaan REST `generateContent`. Dipisah supaya bisa diuji tanpa memanggil API. */
export function permintaanGemini(system: string, messages: PesanModel[], thinking = true): Record<string, unknown> {
  return {
    systemInstruction: { parts: [{ text: system }] },
    contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    safetySettings: KEAMANAN_GEMINI,
    // Temperature dibiarkan bawaan (saran Google untuk Gemini 3). Batas token cukup longgar karena token berpikir
    // ikut dihitung; panjang jawaban tetap dipotong menjadi 3 kalimat oleh guardrail keluar.
    generationConfig: { maxOutputTokens: 1024, ...(thinking ? { thinkingConfig: { thinkingLevel: 'minimal' } } : {}) },
  };
}

interface BalasanGemini {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

async function panggilGemini(system: string, messages: PesanModel[]): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelDipakai())}:generateContent`;
  const sinyal = AbortSignal.timeout(BATAS_WAKTU_MS);
  const kirim = (thinking: boolean) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': keyPenyedia('gemini') ?? '' },
      body: JSON.stringify(permintaanGemini(system, messages, thinking)),
      signal: sinyal,
    });
  let res = await kirim(true);
  let data = (await res.json().catch(() => ({}))) as BalasanGemini;
  // Model yang tidak mengenal thinkingLevel menolak dengan 400; coba sekali lagi tanpa pengaturan itu.
  if (res.status === 400 && /thinking/i.test(data.error?.message ?? '')) {
    res = await kirim(false);
    data = (await res.json().catch(() => ({}))) as BalasanGemini;
  }
  if (!res.ok) {
    const retry = res.headers.get('retry-after');
    const detik = retry ? Number(retry) : NaN;
    const jeda = Number.isFinite(detik) ? detik * 1000 : retry ? Date.parse(retry) - Date.now() : 60_000;
    throw new GalatModel(`Gemini ${res.status}: ${data.error?.message ?? 'tanpa pesan'}`, res.status,
      Number.isFinite(jeda) && jeda > 0 ? jeda : 60_000);
  }
  if (data.promptFeedback?.blockReason) throw new Error(`Gemini memblokir pesan: ${data.promptFeedback.blockReason}`);
  const kandidat = data.candidates?.[0];
  const teks = (kandidat?.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text)
    .join(' ')
    .trim();
  if (!teks) throw new Error(`Gemini tidak memberi teks (${kandidat?.finishReason ?? 'tanpa alasan'})`);
  return teks;
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
  const tersedia = kartuUntuk(misi);
  const relevan = req.mode === 'tanya' && (!misi || req.statusMisi === 'selesai')
    ? kartuUntukPertanyaan(req.pesan, tersedia) : [];
  // Selama aturan kebocoran tingkat 1–2 berlaku, kartu materi misi ini memuat jawabannya. Model tidak perlu fakta itu
  // untuk menunjuk bukti di layar, dan dulu justru mengutipnya ("...bukan hilang ke udara"), jadi kartunya tidak dikirim.
  const sembunyikan = !kartuFakta && Boolean(misi) && (tingkatLarangan === 1 || tingkatLarangan === 2);
  const kartu = sembunyikan
    ? '(Disembunyikan sampai misi selesai. Bantu anak lewat bukti di layar, bukan lewat fakta.)'
    : (kartuFakta ? [kartuFakta] : relevan.length ? relevan : tersedia)
        .map((k) => `${k.no}. ${k.fakta}`)
        .join('\n');
  const akt = misi?.aktivitas;
  const layar = akt
    ? `
AKTIVITAS DI LAYAR (yang sedang dilihat anak; tunjuk hal-hal ini, jangan mengarang benda lain)
- Arahan: ${akt.arahan}
- Yang terjadi: ${akt.siap}${akt.sorot ? `\n- Bukti yang bisa ditunjuk: ${akt.sorot}` : ''}
`
    : '';
  const acuan = misi && tingkat ? petunjukCadangan(misi, tingkat) : '';
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
- Langsung jawab inti pertanyaan pada kalimat pertama; jangan menghabiskan kalimat untuk sapaan, perkenalan, atau pujian.
- Jawab semua bagian pertanyaan. Untuk sebab-akibat, jelaskan apa yang berubah dan mengapa, bukan hanya mengulang keadaan awal.
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
- Di tingkat 1 dan 2, jangan menyebut, menyiratkan, atau membandingkan dengan alasan yang benar. Jangan membantah
  alasan anak dengan "bukan X, tapi Y", dan jangan bilang ke mana air pergi atau apa yang terjadi padanya.
  Cukup ajak anak melihat bukti di layar.${acuan ? `
- PETUNJUK ACUAN TIM untuk tingkat ini: "${acuan}"
  Pakai petunjuk acuan ini sebagai dasar. Boleh disesuaikan dengan alasan yang dipilih anak, tapi jangan menambah
  informasi baru di luar petunjuk acuan dan AKTIVITAS DI LAYAR.` : ''}

BATASAN
- Hanya bahas game, sains, dan alam. Topik lain: tanggapi ramah satu kalimat, lalu ajak kembali ke petualangan.
- Jangan pernah menanyakan atau mengulang data pribadi (nama lengkap, alamat, sekolah, nomor HP).
- Kalau anak bercerita dirundung, disakiti, atau sangat sedih: tanggapi dengan lembut dan sarankan bercerita ke guru atau orang tua.
- Tidak ada kekerasan, hal menakutkan, atau konten dewasa.
${tugasFakta}${layar}
KEADAAN GAME
Lokasi: ${req.lokasi ?? '-'}
Misi aktif: ${misi?.judul ?? '-'} (${req.statusMisi ?? '-'})
Kartu Ilmu yang sudah didapat: ${(req.kartuDidapat ?? []).join(', ') || '-'}

KARTU MATERI
${kartu}`;
}

function cadanganTanya(misi: Misi | undefined, pesan = '', statusMisi?: string): string {
  if (!pesan) {
    const fakta = kartuUntuk(misi)[0]?.fakta;
    if (fakta) return `Ini yang aku tahu: ${fakta}`;
    return BALASAN.cadanganTanya;
  }
  return jawabanTanyaCadangan(pesan, misi, statusMisi) ?? BALASAN.cadanganTanya;
}

/**
 * Riwayat datang dari browser, jadi diperiksa ulang sebelum dikirim ke model. Pesan anak yang dulu ditahan filter
 * masuk (data pribadi, kata kasar, cerita yang mengkhawatirkan) dibuang bersama balasan Tiko sesudahnya; tanpa ini,
 * nomor HP yang ditahan di giliran pertama ikut terkirim ke model di giliran berikutnya.
 */
export function rapikanRiwayat(riwayat: unknown): { dari: 'anak' | 'tiko'; teks: string }[] {
  if (!Array.isArray(riwayat)) return [];
  const hasil: { dari: 'anak' | 'tiko'; teks: string }[] = [];
  let buangBalasan = false;
  for (const r of riwayat.slice(-6)) {
    const dari = (r as { dari?: unknown })?.dari;
    const teks = (r as { teks?: unknown })?.teks;
    if ((dari !== 'anak' && dari !== 'tiko') || typeof teks !== 'string' || !teks.trim()) continue;
    if (dari === 'anak') {
      const masuk = periksaMasuk(teks);
      buangBalasan = !masuk.lolos;
      if (masuk.lolos) hasil.push({ dari, teks: masuk.pesan });
    } else {
      if (!buangBalasan) hasil.push({ dari, teks: teks.slice(0, 400) });
      buangBalasan = false;
    }
  }
  return hasil;
}

async function panggilModel(
  req: PermintaanChat,
  misi: Misi | undefined,
  tingkat?: Tingkat,
  tingkatLarangan?: Tingkat,
  kartuFakta?: KartuMateri,
): Promise<string> {
  const riwayat = rapikanRiwayat(req.riwayat).map((r) => ({
    role: r.dari === 'anak' ? ('user' as const) : ('assistant' as const),
    content: r.teks,
  }));
  // API mensyaratkan pesan pertama dari user.
  while (riwayat.length && riwayat[0].role !== 'user') riwayat.shift();
  // Dua pesan berurutan dengan peran sama digabung, supaya urutan user/assistant tetap bergantian.
  for (let i = riwayat.length - 1; i > 0; i--) {
    if (riwayat[i].role === riwayat[i - 1].role) {
      riwayat[i - 1].content += `\n${riwayat[i].content}`;
      riwayat.splice(i, 1);
    }
  }
  // Pesan terakhir di riwayat dari anak: gabungkan dengan pesan baru (lihat di bawah) supaya tidak ada dua user berurutan.
  const pesanTerakhir = riwayat.at(-1)?.role === 'user' ? riwayat.pop()!.content + '\n' : '';
  const system = systemPrompt(req, misi, tingkat, tingkatLarangan, kartuFakta);
  const messages: PesanModel[] = [...riwayat, { role: 'user', content: pesanTerakhir + req.pesan }];
  return penyedia() === 'gemini' ? panggilGemini(system, messages) : panggilAnthropic(system, messages);
}

export async function jawabTiko(req: PermintaanChat, catat?: (c: CatatanTiko) => void): Promise<JawabanChat> {
  const masuk = periksaMasuk(req.pesan);
  if (!masuk.lolos) return { teks: masuk.balasan, sumber: 'template' };
  if (req.mode === 'tanya') {
    const tentang = jawabanTentangTiko(masuk.pesan);
    if (tentang) return { teks: tentang, sumber: 'template' };
  }

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
    return { teks: cadanganTanya(misi, masuk.pesan, req.statusMisi), sumber: 'cadangan' };
  };

  if (req.mode === 'fakta') return jawabFakta({ ...req, pesan: masuk.pesan }, misi, misiAktif, catat);

  if (!pakaiModel()) return cadangan();
  const jeda = infoJedaModel();
  if (jeda.ms) { catat?.({ ditunda: jeda.alasan }); return cadangan(); }
  try {
    const mentah = await panggilModel({ ...req, pesan: masuk.pesan }, misi, tingkat, tingkatLarangan);
    const keluar = periksaKeluar(mentah, { misi, tingkat: tingkatLarangan });
    catat?.({ mentah, keluar });
    if (!keluar.aman) return cadangan();
    return { teks: keluar.teks, sumber: 'model', tingkat };
  } catch (e) {
    catatKegagalan(e, catat);
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
  const jeda = infoJedaModel();
  if (jeda.ms) { catat?.({ ditunda: jeda.alasan }); return cadangan; }
  const tingkatLarangan: Tingkat | undefined = misiAktif ? 1 : undefined;
  try {
    // Riwayat tidak dikirim: fun fact berdiri sendiri, dan prompt-nya hanya memuat satu kartu.
    const mentah = await panggilModel({ ...req, riwayat: [] }, misi, undefined, tingkatLarangan, kartu);
    const keluar = periksaKeluar(mentah, { misi, tingkat: tingkatLarangan });
    catat?.({ mentah, keluar });
    if (!keluar.aman) return cadangan;
    return { teks: keluar.teks, sumber: 'model', kartu: kartu.no };
  } catch (e) {
    catatKegagalan(e, catat);
    return cadangan;
  }
}
