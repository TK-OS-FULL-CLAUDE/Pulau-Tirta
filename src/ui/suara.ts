/**
 * Efek suara dan musik latar (PRD F-12), dibuat langsung dengan Web Audio API. Tidak ada file aset,
 * jadi tidak ada urusan lisensi dan tetap jalan offline.
 * - AudioContext baru dibuat setelah interaksi pertama (aturan autoplay browser), jadi console tetap bersih
 *   sebelum anak menekan apa pun.
 * - Satu pilihan "Suara: Nyala/Mati" (menu jeda) berlaku untuk semua suara, termasuk musik. Pilihannya disimpan
 *   di localStorage.
 * - Suara keliru dibuat lembut (dua tetes air), bukan bunyi "salah" yang terdengar seperti hukuman.
 */

import { DETIK_PER_LANGKAH, JUMLAH_LANGKAH, jadwalkanLangkah } from './musik-desa';

export type JenisSuara = 'klik' | 'benar' | 'keliru' | 'pulih' | 'hujan';

export const KUNCI_SUARA = 'pulau-tirta:suara:v1';

type Simpanan = Pick<Storage, 'getItem' | 'setItem'>;

/** Bawaan: nyala. Hanya "mati" yang tersimpan yang mematikannya. */
export function muatPilihanSuara(store: Pick<Storage, 'getItem'> | undefined): boolean {
  try {
    return store?.getItem(KUNCI_SUARA) !== 'mati';
  } catch {
    return true;
  }
}

export function simpanPilihanSuara(nyala: boolean, store: Pick<Storage, 'setItem'> | undefined): void {
  try {
    store?.setItem(KUNCI_SUARA, nyala ? 'nyala' : 'mati');
  } catch {
    /* penyimpanan tidak tersedia: pilihan berlaku selama halaman dibuka */
  }
}

function penyimpananBrowser(): Simpanan | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

interface OpsiNada {
  tipe?: OscillatorType;
  vol?: number;
  /** Frekuensi akhir (geser nada). */
  ke?: number;
  serang?: number;
  tujuan?: AudioNode;
}

export class Suara {
  private ctx: AudioContext | null = null;
  private efek: GainNode | null = null;
  private musikBus: GainNode | null = null;
  private derau: AudioBuffer | null = null;
  private musikTimer: ReturnType<typeof setInterval> | undefined;
  private musikBerikut = 0;
  private musikLangkah = 0;
  private _nyala: boolean;

  constructor(
    private store: Simpanan | undefined = penyimpananBrowser(),
    /** Musik latar pelan; bisa dimatikan terpisah lewat kode kalau mengganggu saat playtest. */
    private denganMusik = true,
  ) {
    this._nyala = muatPilihanSuara(store);
  }

  get nyala(): boolean {
    return this._nyala;
  }

  /** Pasang pendengar interaksi pertama dan bunyi klik tombol. Panggil sekali. */
  pasang(): void {
    const aktifkan = () => this.aktifkan();
    for (const jenis of ['pointerdown', 'keydown', 'touchend'] as const) window.addEventListener(jenis, aktifkan, { capture: true });
    // Klik tombol. Pilihan alasan dan tombol Periksa punya bunyinya sendiri (benar/keliru/hujan).
    document.addEventListener('click', (e) => {
      const b = e.target instanceof Element ? e.target.closest('button') : null;
      if (!b || b.disabled || b.closest('.pilihan-alasan') || b.classList.contains('tombol-periksa')) return;
      this.main('klik');
    });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else if (this._nyala) void this.ctx.resume();
    });
  }

  /** Ubah pilihan Nyala/Mati (dipanggil dari tombol di menu jeda, jadi selalu di dalam gestur pengguna). */
  ubah(nyala: boolean): void {
    this._nyala = nyala;
    simpanPilihanSuara(nyala, this.store);
    if (!nyala) {
      this.hentikanMusik();
      void this.ctx?.suspend();
      return;
    }
    this.aktifkan();
  }

  main(jenis: JenisSuara): void {
    const ctx = this.ctx;
    if (!this._nyala || !ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.01;
    switch (jenis) {
      case 'klik':
        this.nada(880, t, 0.07, { tipe: 'triangle', vol: 0.07, ke: 1100 });
        break;
      case 'benar':
        [523.25, 659.25, 783.99].forEach((f, i) => this.nada(f, t + i * 0.09, 0.4, { tipe: 'triangle', vol: 0.14 }));
        this.nada(1046.5, t + 0.27, 0.6, { vol: 0.08 });
        break;
      case 'keliru':
        // Dua tetes air yang pelan: tanda "coba lagi", bukan buzzer.
        this.nada(520, t, 0.18, { vol: 0.08, ke: 880 });
        this.nada(440, t + 0.17, 0.22, { vol: 0.06, ke: 720 });
        break;
      case 'pulih':
        [392.0, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          this.nada(f, t + i * 0.11, 1.1, { vol: 0.1, serang: 0.005 });
          this.nada(f * 2, t + i * 0.11, 0.6, { vol: 0.025, serang: 0.005 });
        });
        break;
      case 'hujan':
        this.hujan(t);
        break;
    }
  }

  /** Buat atau lanjutkan AudioContext, hanya kalau suara nyala dan sedang ada gestur pengguna. */
  private aktifkan(): void {
    if (!this._nyala) return;
    const aktivasi = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation;
    if (aktivasi && !aktivasi.isActive) return;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
      } catch {
        return;
      }
      const utama = this.ctx.createGain();
      utama.gain.value = 0.8;
      utama.connect(this.ctx.destination);
      this.efek = this.ctx.createGain();
      this.efek.connect(utama);
      // Musik lewat lowpass supaya lembut dan tidak menutupi suara lain.
      const lembut = this.ctx.createBiquadFilter();
      lembut.type = 'lowpass';
      lembut.frequency.value = 2800;
      lembut.connect(utama);
      this.musikBus = this.ctx.createGain();
      this.musikBus.gain.value = 1;
      this.musikBus.connect(lembut);
    }
    if (this.ctx.state !== 'running' && !document.hidden) void this.ctx.resume();
    this.mulaiMusik();
  }

  private nada(f: number, t: number, lama: number, o: OpsiNada = {}): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.tipe ?? 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.ke) osc.frequency.exponentialRampToValueAtTime(o.ke, t + lama * 0.6);
    const serang = o.serang ?? 0.01;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol ?? 0.1, t + serang);
    g.gain.exponentialRampToValueAtTime(0.0001, t + lama);
    osc.connect(g).connect(o.tujuan ?? this.efek!);
    osc.start(t);
    osc.stop(t + lama + 0.05);
  }

  /** Derau putih 2 detik, dipakai bersama oleh hujan dan kocokan musik. */
  private ambilDerau(): AudioBuffer {
    const ctx = this.ctx!;
    if (!this.derau) {
      this.derau = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = this.derau.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.derau;
  }

  /** Hujan di Festival: desis derau yang disaring, naik lalu reda sekitar 6 detik, ditambah tetes-tetes kecil. */
  private hujan(t: number): void {
    const ctx = this.ctx!;
    const sumber = ctx.createBufferSource();
    sumber.buffer = this.ambilDerau();
    sumber.loop = true;
    const saring = ctx.createBiquadFilter();
    saring.type = 'bandpass';
    saring.frequency.value = 1400;
    saring.Q.value = 0.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 1.2);
    g.gain.setValueAtTime(0.12, t + 4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 6.5);
    sumber.connect(saring).connect(g).connect(this.efek!);
    sumber.start(t);
    sumber.stop(t + 6.6);
    for (let i = 0; i < 16; i++) {
      const f = 1100 + Math.random() * 900;
      this.nada(f, t + 0.6 + Math.random() * 4.5, 0.09, { vol: 0.035, ke: f * 1.5, serang: 0.003 });
    }
  }

  /** Lagu dimulai dari awal dan muncul pelan selama 2 detik. */
  private mulaiMusik(): void {
    if (!this.denganMusik || this.musikTimer !== undefined || !this.ctx || !this.musikBus) return;
    const t = this.ctx.currentTime;
    this.musikBus.gain.cancelScheduledValues(t);
    this.musikBus.gain.setValueAtTime(0.0001, t);
    this.musikBus.gain.exponentialRampToValueAtTime(1, t + 2);
    this.musikLangkah = 0;
    this.musikBerikut = t + 0.3;
    this.musikTimer = setInterval(() => this.jadwalkanMusik(), 250);
  }

  private hentikanMusik(): void {
    clearInterval(this.musikTimer);
    this.musikTimer = undefined;
  }

  /** Lagu "Pagi di Desa Tirta" (src/ui/musik-desa.ts), dijadwalkan per seperdelapan sekitar 0,6 detik ke depan. */
  private jadwalkanMusik(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.musikBus) return;
    if (this.musikBerikut < ctx.currentTime) this.musikBerikut = ctx.currentTime + 0.1;
    while (this.musikBerikut < ctx.currentTime + 0.6) {
      jadwalkanLangkah(ctx, this.musikBus, this.musikLangkah, this.musikBerikut, this.ambilDerau());
      this.musikLangkah = (this.musikLangkah + 1) % JUMLAH_LANGKAH;
      this.musikBerikut += DETIK_PER_LANGKAH;
    }
  }
}
