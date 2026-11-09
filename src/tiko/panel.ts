import { cariMisi, type Tingkat } from '../../shared/content';
import { BATAS_PANJANG_PESAN, petunjukCadangan } from '../../shared/guardrail';

const TIDAK_TERHUBUNG = 'Aku sedang tidak bisa terhubung. Coba lihat lagi apa yang berubah di layar, ya.';

/**
 * Jawaban saat server tidak bisa dihubungi atau membalas error.
 * Petunjuk misi tetap memakai petunjuk cadangan tim untuk misi dan tingkat itu, jadi game tetap jalan offline.
 */
export function jawabanCadangan(isi: { mode?: unknown; misiId?: unknown; tingkat?: unknown }): string {
  const misi = isi.mode === 'petunjuk' && typeof isi.misiId === 'string' ? cariMisi(isi.misiId) : undefined;
  const t = isi.tingkat;
  if (misi && (t === 1 || t === 2 || t === 3)) return petunjukCadangan(misi, t);
  return TIDAK_TERHUBUNG;
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
}

/** Panel chat Tiko (HTML di atas canvas). Riwayat hanya ada di memori selama halaman dibuka. */
export class PanelTiko {
  private riwayat: Pesan[] = [];
  private daftar = document.getElementById('tiko-pesan') as HTMLOListElement;
  private mengetik = document.getElementById('tiko-mengetik') as HTMLElement;
  private input = document.getElementById('tiko-input') as HTMLInputElement;

  constructor(
    private konteks: () => KonteksGame,
    private keMana: () => string,
    /** Tingkat petunjuk untuk "Aku bingung" di sebuah misi; dari sistem misi supaya naik bertahap (1 → 2 → 3). */
    private tingkatBingung: (misiId: string) => Tingkat = () => 1,
    /** Penanganan khusus "Aku bingung" (mis. di Festival Hujan). Kembalikan true kalau sudah ditangani. */
    private bingungKhusus: () => boolean = () => false,
  ) {
    document.getElementById('tiko-form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      const teks = this.input.value.trim().slice(0, BATAS_PANJANG_PESAN);
      if (!teks) return;
      this.input.value = '';
      void this.tanya(teks);
    });
    document.querySelectorAll<HTMLButtonElement>('[data-cepat]').forEach((b) =>
      b.addEventListener('click', () => this.cepat(b.dataset.cepat ?? '')),
    );
    document.getElementById('tentang-tiko')!.addEventListener('click', () =>
      (document.getElementById('dialog-tentang') as HTMLDialogElement).showModal(),
    );
  }

  sapa(teks: string): void {
    this.tampil({ dari: 'tiko', teks });
  }

  private cepat(jenis: string): void {
    if (jenis === 'ke-mana') {
      // Dijawab dari template, tanpa memanggil model.
      this.tampil({ dari: 'anak', teks: 'Aku harus ke mana?' });
      this.tampil({ dari: 'tiko', teks: this.keMana() });
      return;
    }
    if (jenis === 'bingung') {
      if (this.bingungKhusus()) return;
      const k = this.konteks();
      if (k.misiId) void this.petunjuk(k.misiId, this.tingkatBingung(k.misiId), 'Aku bingung');
      else void this.tanya('Aku bingung');
      return;
    }
    const konsep = this.konteks().konsep ?? 'siklus air';
    void this.tanya(`Apa itu ${konsep.toLowerCase()}?`);
  }

  async tanya(teks: string): Promise<void> {
    this.tampil({ dari: 'anak', teks });
    await this.kirim({ pesan: teks, mode: 'tanya' });
  }

  /** Dipanggil game saat anak memilih alasan keliru. */
  async petunjuk(misiId: string, tingkat: Tingkat, pesan = 'Aku memilih alasan itu.', alasanId?: string): Promise<void> {
    if (pesan) this.tampil({ dari: 'anak', teks: pesan });
    await this.kirim({ pesan, mode: 'petunjuk', misiId, tingkat, alasanId });
  }

  private async kirim(isi: Record<string, unknown>): Promise<void> {
    const k = this.konteks();
    this.mengetik.hidden = false;
    let jawaban: Jawaban;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...k, ...isi, riwayat: this.riwayat.slice(-6) }),
        signal: AbortSignal.timeout(9000),
      });
      const data = (await res.json()) as Partial<Jawaban>;
      if (!res.ok || typeof data.teks !== 'string' || !data.teks) throw new Error(`balasan tidak dipakai (${res.status})`);
      jawaban = data as Jawaban;
    } catch {
      jawaban = { teks: jawabanCadangan(isi), sumber: 'cadangan' };
    } finally {
      this.mengetik.hidden = true;
    }
    this.tampil({ dari: 'tiko', teks: jawaban.teks }, jawaban.sumber);
  }

  private tampil(p: Pesan, sumber?: Jawaban['sumber']): void {
    this.riwayat.push(p);
    const li = document.createElement('li');
    li.className = p.dari;
    li.textContent = p.teks;
    // Sumber jawaban hanya terlihat di mode demo (?demo=1), untuk juri.
    if (sumber && new URLSearchParams(location.search).has('demo')) {
      const s = document.createElement('small');
      s.textContent = sumber === 'model' ? 'AI' : sumber === 'cadangan' ? 'jawaban cadangan' : 'template';
      li.append(s);
    }
    this.daftar.append(li);
    this.daftar.scrollTop = this.daftar.scrollHeight;
  }
}
