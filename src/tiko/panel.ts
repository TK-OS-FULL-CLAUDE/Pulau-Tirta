import { cariMisi, kartuUntuk, type Tingkat } from '../../shared/content';
import {
  BATAS_PANJANG_PESAN,
  FUN_FACT_TUNDA,
  faktaCadangan,
  kartuFunFact,
  jawabanMateriCadangan,
  jawabanTentangTiko,
  periksaMasuk,
  petunjukCadangan,
  pilihKartuFunFact,
} from '../../shared/guardrail';
import { potretTiko } from './gambar';
import type { Suasana } from './roh';

const TIDAK_TERHUBUNG = 'Aku sedang tidak bisa terhubung. Coba lihat lagi apa yang berubah di layar, ya.';

interface IsiPermintaan {
  mode?: unknown;
  pesan?: unknown;
  misiId?: unknown;
  statusMisi?: unknown;
  tingkat?: unknown;
  hindariKartu?: unknown;
}

/** Fun fact saat server tidak bisa dihubungi: langsung dari kartu materi, dengan aturan kebocoran yang sama. */
export function faktaTanpaServer(isi: IsiPermintaan, acak: () => number = Math.random): { teks: string; kartu?: number } {
  const misi = typeof isi.misiId === 'string' ? cariMisi(isi.misiId) : undefined;
  const hindari = Array.isArray(isi.hindariKartu) ? isi.hindariKartu.filter((n): n is number => Number.isInteger(n)) : [];
  const kartu = pilihKartuFunFact(kartuFunFact(misi, Boolean(misi) && isi.statusMisi !== 'selesai'), hindari, acak);
  return kartu ? { teks: faktaCadangan(kartu), kartu: kartu.no } : { teks: FUN_FACT_TUNDA };
}

/**
 * Jawaban saat server tidak bisa dihubungi atau membalas error.
 * Petunjuk misi tetap memakai petunjuk cadangan tim untuk misi dan tingkat itu, jadi game tetap jalan offline.
 */
export function jawabanCadangan(isi: IsiPermintaan): string {
  if (isi.mode === 'fakta') return faktaTanpaServer(isi).teks;
  const misi = isi.mode === 'petunjuk' && typeof isi.misiId === 'string' ? cariMisi(isi.misiId) : undefined;
  const t = isi.tingkat;
  if (misi && (t === 1 || t === 2 || t === 3)) return petunjukCadangan(misi, t);
  if (isi.mode === 'tanya' && typeof isi.pesan === 'string' && isi.pesan.trim()) return jawabTanyaTanpaServer(isi, isi.pesan);
  return TIDAK_TERHUBUNG;
}

/**
 * Pertanyaan ketikan saat server tidak bisa dihubungi: aturan yang sama dengan cadangan di server.
 * Filter masuk tetap berlaku; di misi yang belum selesai Tiko memberi pertanyaan balik (kartu materinya memuat jawaban);
 * selain itu Tiko menjawab dari kartu materi yang paling cocok.
 */
function jawabTanyaTanpaServer(isi: IsiPermintaan, pesan: string): string {
  const masuk = periksaMasuk(pesan);
  if (!masuk.lolos) return masuk.balasan;
  const tentang = jawabanTentangTiko(masuk.pesan);
  if (tentang) return tentang;
  const misi = typeof isi.misiId === 'string' ? cariMisi(isi.misiId) : undefined;
  if (misi && isi.statusMisi !== 'selesai') return petunjukCadangan(misi, 1);
  return jawabanMateriCadangan(masuk.pesan, kartuUntuk(misi)) ?? TIDAK_TERHUBUNG;
}

export interface KonteksGame {
  lokasi: string;
  misiId?: string;
  statusMisi?: string;
  kartuDidapat: number[];
  /** Nama konsep di lokasi sekarang, untuk tombol "Apa itu …?" */
  konsep?: string;
}

type Pesan = { dari: 'anak' | 'tiko'; teks: string };

interface Jawaban {
  teks: string;
  sumber: 'model' | 'cadangan' | 'template';
  kartu?: number;
}

/** Kecepatan teks muncul huruf demi huruf. */
const MS_PER_HURUF = 22;
/** Ketikan yang meminta fun fact, mis. "kasih fun fact dong" atau "ada fakta seru?". */
export const MINTA_FAKTA = /\bfun ?facts?\b|\bfakta (seru|unik|menarik|lucu)\b/i;

/**
 * Tiko di layar: kotak chat di kiri bawah dan kotak jawaban di tengah bawah, di atas area game.
 * Kotak jawaban hanya menampilkan jawaban terakhir; riwayat singkat tetap dikirim ke server sebagai konteks
 * dan hanya ada di memori selama halaman dibuka.
 */
export class PanelTiko {
  private riwayat: Pesan[] = [];
  /** Kartu fun fact yang baru saja diceritakan, supaya tidak berulang. */
  private kartuFakta: number[] = [];
  private kotak = document.getElementById('tiko-jawaban') as HTMLElement;
  private tanyaan = document.getElementById('tiko-tanya') as HTMLElement;
  private teks = document.getElementById('tiko-teks') as HTMLElement;
  private teksSr = document.getElementById('tiko-teks-sr') as HTMLElement;
  private sumber = document.getElementById('tiko-sumber') as HTMLElement;
  private mengetik = document.getElementById('tiko-mengetik') as HTMLElement;
  private input = document.getElementById('tiko-input') as HTMLInputElement;
  private ketik?: number;
  /** Setelah selesai bicara, roh Tiko kembali berputar walau kotak jawaban masih terbuka. */
  private balik?: number;
  /** Kotak jawaban hilang sendiri setelah anak sempat membacanya. */
  private hilang?: number;
  /** Nomor permintaan terakhir; jawaban yang datang terlambat untuk permintaan lama diabaikan. */
  private nomor = 0;
  private suasana: (s: Suasana) => void = () => undefined;
  private readonly tenang = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  constructor(private konteks: () => KonteksGame) {
    const potret = potretTiko();
    document.querySelectorAll<HTMLImageElement>('.tiko-potret, .tiko-potret-kecil').forEach((img) => (img.src = potret));

    document.getElementById('tiko-form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      const teks = this.input.value.trim().slice(0, BATAS_PANJANG_PESAN);
      if (!teks) return;
      this.input.value = '';
      void this.tanya(teks);
    });
    document.getElementById('tentang-tiko')!.addEventListener('click', () =>
      (document.getElementById('dialog-tentang') as HTMLDialogElement).showModal(),
    );
    // Klik pada teks yang sedang muncul langsung menampilkan semuanya.
    this.teks.addEventListener('click', () => this.selesaikanKetik());
    // Selama kursor di atas kotak, kotak tidak hilang dulu, supaya anak sempat membaca.
    this.kotak.addEventListener('pointerenter', () => window.clearTimeout(this.hilang));
    this.kotak.addEventListener('pointerleave', () => {
      if (this.ketik === undefined && !this.kotak.hidden && this.mengetik.hidden) this.jadwalHilang(2000);
    });
    this.pasangBukaTutupBar();
  }

  /**
   * Kolom ketik awalnya hanya logo Tiko. Dibuka dengan klik logo atau tombol T, ditutup lagi saat anak kembali
   * ke peta (fokus pindah) atau menekan Esc, selama kolomnya kosong.
   */
  private pasangBukaTutupBar(): void {
    const bar = document.querySelector<HTMLElement>('.tiko-bar')!;
    const form = document.getElementById('tiko-form')!;
    const tombol = document.getElementById('tiko-buka')!;
    const terbuka = () => !bar.hasAttribute('data-tertutup');
    const atur = (buka: boolean) => {
      bar.toggleAttribute('data-tertutup', !buka);
      tombol.setAttribute('aria-expanded', String(buka));
    };
    const buka = () => {
      atur(true);
      this.input.focus();
    };
    const tutupKalauKosong = () => {
      if (!this.input.value.trim()) atur(false);
    };

    tombol.addEventListener('click', () => {
      if (terbuka() && !this.input.value.trim()) {
        atur(false);
        this.input.blur();
      } else buka();
    });
    // Fokus ke kolom ketik dari mana pun (Tab, atau skrip uji yang memanggil focus()) ikut membukanya.
    // Fokus ke logo tidak: klik logo sudah membuka/menutup sendiri.
    form.addEventListener('focusin', (e) => {
      if (e.target !== tombol) atur(true);
    });
    form.addEventListener('focusout', (e) => {
      if (!form.contains(e.relatedTarget as Node | null)) tutupKalauKosong();
    });
    this.input.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      // Esc di sini hanya menutup kolom ketik, tidak ikut membuka menu jeda (src/main.ts).
      e.preventDefault();
      this.input.blur();
      tutupKalauKosong();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() !== 't' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const fokus = document.activeElement;
      const sedangMengetik = fokus instanceof HTMLElement && (fokus.matches('input, textarea, select') || fokus.isContentEditable);
      // Jangan buka di balik layar modal (judul, jeda, jurnal, Tentang Tiko).
      if (sedangMengetik || document.querySelector('dialog[open]:modal')) return;
      e.preventDefault();
      buka();
    });
  }

  /** Roh Tiko di peta mengikuti keadaan panel: berpikir saat menunggu, berbicara saat kotak jawaban terbuka. */
  pantau(suasana: (s: Suasana) => void): void {
    this.suasana = suasana;
  }

  sapa(teks: string): void {
    this.riwayat.push({ dari: 'tiko', teks });
    this.tampilJawaban(teks);
  }

  /** Tiko hanya menjawab yang diketik anak. Minta fun fact lewat ketikan dijawab dari satu kartu materi. */
  async tanya(teks: string): Promise<void> {
    if (MINTA_FAKTA.test(teks)) {
      await this.kirim({ pesan: teks, mode: 'fakta', hindariKartu: this.kartuFakta }, teks, false);
      return;
    }
    await this.kirim({ pesan: teks, mode: 'tanya' }, teks);
  }

  /** Dipanggil game saat anak memilih alasan keliru. */
  async petunjuk(misiId: string, tingkat: Tingkat, pesan = 'Aku memilih alasan itu.', alasanId?: string): Promise<void> {
    await this.kirim({ pesan, mode: 'petunjuk', misiId, tingkat, alasanId }, pesan || undefined);
  }

  /** `simpanRiwayat` false untuk fun fact: tidak perlu jadi konteks percakapan berikutnya. */
  private async kirim(isi: Record<string, unknown>, pertanyaan?: string, simpanRiwayat = true): Promise<void> {
    const k = this.konteks();
    const nomor = ++this.nomor;
    const riwayat = this.riwayat.slice(-6);
    if (pertanyaan && simpanRiwayat) this.riwayat.push({ dari: 'anak', teks: pertanyaan });
    this.mulaiBerpikir(pertanyaan);
    let jawaban: Jawaban;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...k, ...isi, riwayat }),
        signal: AbortSignal.timeout(9000),
      });
      const data = (await res.json()) as Partial<Jawaban>;
      if (!res.ok || typeof data.teks !== 'string' || !data.teks) throw new Error(`balasan tidak dipakai (${res.status})`);
      jawaban = data as Jawaban;
    } catch {
      const cadangan = isi.mode === 'fakta' ? faktaTanpaServer({ ...k, ...isi }) : { teks: jawabanCadangan({ ...k, ...isi }) };
      jawaban = { ...cadangan, sumber: 'cadangan' };
    }
    if (typeof jawaban.kartu === 'number') this.kartuFakta = [...this.kartuFakta, jawaban.kartu].slice(-6);
    if (simpanRiwayat && jawaban.sumber === 'template' && pertanyaan) {
      // Pesan yang ditahan filter (data pribadi, kata kasar, dll.) tidak disimpan sebagai konteks percakapan.
      for (let i = this.riwayat.length - 1; i >= 0; i--) {
        if (this.riwayat[i].dari === 'anak' && this.riwayat[i].teks === pertanyaan) {
          this.riwayat.splice(i, 1);
          break;
        }
      }
    } else if (simpanRiwayat) this.riwayat.push({ dari: 'tiko', teks: jawaban.teks });
    // Anak sudah bertanya lagi sebelum jawaban ini tiba: jawaban baru yang ditampilkan.
    if (nomor !== this.nomor) return;
    this.tampilJawaban(jawaban.teks, pertanyaan, jawaban.sumber);
  }

  private mulaiBerpikir(pertanyaan?: string): void {
    this.hentikanKetik();
    this.bukaKotak();
    this.isiTanyaan(pertanyaan);
    this.teks.textContent = '';
    this.teksSr.textContent = '';
    this.sumber.hidden = true;
    this.mengetik.hidden = false;
    window.clearTimeout(this.balik);
    this.suasana('pikir');
  }

  private tampilJawaban(teks: string, pertanyaan?: string, sumber?: Jawaban['sumber']): void {
    this.hentikanKetik();
    this.bukaKotak();
    this.isiTanyaan(pertanyaan);
    this.mengetik.hidden = true;
    this.teksSr.textContent = teks;
    // Sumber jawaban hanya terlihat di mode demo (?demo=1), untuk juri.
    const demo = new URLSearchParams(location.search).has('demo');
    this.sumber.hidden = !(sumber && demo);
    if (sumber) this.sumber.textContent = sumber === 'model' ? 'AI' : sumber === 'cadangan' ? 'jawaban cadangan' : 'template';
    window.clearTimeout(this.balik);
    this.suasana('bicara');
    this.kotak.classList.remove('baru');
    void this.kotak.offsetWidth; // ulang animasi masuk
    this.kotak.classList.add('baru');
    if (this.tenang) {
      this.teks.textContent = teks;
      this.kembaliBerputar();
      return;
    }
    let i = 0;
    this.teks.textContent = '';
    this.teks.dataset.utuh = teks;
    this.ketik = window.setInterval(() => {
      i = Math.min(teks.length, i + 1);
      this.teks.textContent = teks.slice(0, i);
      if (i >= teks.length) {
        this.hentikanKetik();
        this.kembaliBerputar();
      }
    }, MS_PER_HURUF);
  }

  private kembaliBerputar(): void {
    window.clearTimeout(this.balik);
    this.balik = window.setTimeout(() => this.suasana('putar'), 2500);
    // Waktu baca: 3 detik ditambah sedikit per huruf, paling lama 10 detik.
    const panjang = (this.teks.dataset.utuh ?? this.teks.textContent ?? '').length;
    this.jadwalHilang(Math.min(10_000, 3000 + panjang * 45));
  }

  private jadwalHilang(ms: number): void {
    window.clearTimeout(this.hilang);
    this.hilang = window.setTimeout(() => this.tutup(), ms);
  }

  private selesaikanKetik(): void {
    if (this.ketik === undefined) return;
    this.teks.textContent = this.teks.dataset.utuh ?? this.teks.textContent;
    this.hentikanKetik();
    this.kembaliBerputar();
  }

  private hentikanKetik(): void {
    if (this.ketik !== undefined) window.clearInterval(this.ketik);
    this.ketik = undefined;
  }

  private isiTanyaan(pertanyaan?: string): void {
    this.tanyaan.hidden = !pertanyaan;
    this.tanyaan.textContent = pertanyaan ? `Kamu: ${pertanyaan}` : '';
  }

  private bukaKotak(): void {
    window.clearTimeout(this.hilang);
    this.kotak.classList.remove('pergi');
    this.kotak.hidden = false;
  }

  /** Kotak meluncur turun dan memudar, lalu disembunyikan. */
  private tutup(): void {
    window.clearTimeout(this.hilang);
    this.suasana('putar');
    if (this.tenang) {
      this.kotak.hidden = true;
      return;
    }
    this.kotak.classList.remove('baru');
    this.kotak.classList.add('pergi');
    this.hilang = window.setTimeout(() => {
      this.kotak.classList.remove('pergi');
      this.kotak.hidden = true;
    }, 420);
  }
}
