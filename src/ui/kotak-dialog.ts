/**
 * Percakapan warga (PRD F-03): gelembung teks kecil di atas kepala yang sedang berbicara, satu baris naskah per gelembung.
 * Lanjut dengan E, Enter, klik, atau Spasi saat tombol ▶ terfokus; Esc menutup. Panel Tiko tetap bisa dipakai di sampingnya.
 */
import type { Baris, Pembicara } from '../../shared/warga';
import { el } from './dom';

export interface OpsiPercakapan {
  pembicara: Record<string, Pembicara>;
  /** Dipanggil setelah kotak ditutup. `tamat` = semua baris sudah dibaca (bukan dilewati dengan Esc). */
  tutup: (tamat: boolean) => void;
}

type Titik = { x: number; y: number };
/** Titik di atas kepala pembicara, relatif ke #game. Dipasang game (src/main.ts); tanpa ini gelembung di tengah bawah. */
let titikKepala: (siapa: string) => Titik | undefined = () => undefined;
export function aturTitikKepala(f: (siapa: string) => Titik | undefined): void {
  titikKepala = f;
}

const JARAK_KEPALA = 10;
const TEPI = 8;

function kotak(): HTMLDialogElement {
  let d = document.getElementById('kotak-dialog') as HTMLDialogElement | null;
  if (!d) {
    d = el('dialog', undefined, { id: 'kotak-dialog', class: 'kotak-dialog', 'aria-label': 'Percakapan' });
    document.getElementById('game')!.append(d);
  }
  return d;
}

/** Gelembung di atas titik, tetap di dalam area game; ekornya tetap menunjuk ke kepala pembicara. */
function letakkan(d: HTMLDialogElement, t: Titik | undefined): void {
  if (!t) {
    d.removeAttribute('data-melayang');
    d.style.left = d.style.top = '';
    return;
  }
  const wadah = d.parentElement!;
  const lebar = d.offsetWidth;
  const tinggi = d.offsetHeight;
  const kiri = Math.max(TEPI, Math.min(wadah.clientWidth - lebar - TEPI, t.x - lebar / 2));
  const atas = Math.max(TEPI, t.y - tinggi - JARAK_KEPALA);
  d.setAttribute('data-melayang', '');
  d.style.left = `${Math.round(kiri)}px`;
  d.style.top = `${Math.round(atas)}px`;
  d.style.setProperty('--ekor', `${Math.round(Math.max(14, Math.min(lebar - 14, t.x - kiri)))}px`);
}

export function bukaPercakapan(baris: Baris[], o: OpsiPercakapan): void {
  const d = kotak();
  if (d.open || baris.length === 0) {
    o.tutup(baris.length === 0);
    return;
  }
  const teks = el('p', '', { class: 'kotak-teks', 'aria-live': 'polite' });
  const lanjut = el('button', '▶', { type: 'button', class: 'kotak-lanjut' });
  d.replaceChildren(teks, lanjut);

  let i = 0;
  let tamat = false;
  let bingkai = 0;
  // Abaikan tekanan dalam 250 ms pertama, supaya tombol yang membuka kotak tidak langsung melewati baris pertama.
  const dibuka = performance.now();
  const tampil = () => {
    const b = baris[i];
    const p = o.pembicara[b.siapa] ?? { nama: b.siapa, ikon: '' };
    teks.textContent = b.teks;
    // Nama pembicara tetap dibacakan pembaca layar walau tidak ditulis di gelembung.
    d.setAttribute('aria-label', `${p.nama} berkata`);
    lanjut.setAttribute('aria-label', i < baris.length - 1 ? 'Lanjut' : 'Selesai');
    // Pembicara berganti: gelembung meluncur naik lagi dari kepala pembicara baru.
    // Pembicara sama: hanya teksnya yang meluncur masuk.
    const pembicaraBaru = i === 0 || baris[i - 1].siapa !== b.siapa;
    d.toggleAttribute('data-tiko', b.siapa === 'tiko');
    d.classList.remove('baru', 'ganti');
    void d.offsetWidth; // ulang animasi
    d.classList.add(pembicaraBaru ? 'baru' : 'ganti');
    letakkan(d, titikKepala(b.siapa));
  };
  // Gelembung ikut bergerak bersama pembicara (warga bisa masih berjalan, kamera bisa bergeser).
  const ikuti = () => {
    if (!d.open) return;
    letakkan(d, titikKepala(baris[i].siapa));
    bingkai = requestAnimationFrame(ikuti);
  };
  const maju = () => {
    if (performance.now() - dibuka < 250) return;
    if (i < baris.length - 1) {
      i++;
      tampil();
    } else {
      tamat = true;
      d.close();
    }
  };
  const tekan = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      d.close();
    } else if (e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      if (!e.repeat) maju();
    }
  };
  lanjut.addEventListener('click', (e) => {
    e.stopPropagation();
    maju();
  });
  // Enter yang ditahan memicu klik berulang pada tombol; abaikan pengulangannya.
  lanjut.addEventListener('keydown', (e) => {
    if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault();
  });
  d.addEventListener('click', maju);
  d.addEventListener('keydown', tekan);
  d.addEventListener(
    'close',
    () => {
      cancelAnimationFrame(bingkai);
      d.removeEventListener('click', maju);
      d.removeEventListener('keydown', tekan);
      o.tutup(tamat);
    },
    { once: true },
  );
  d.show();
  tampil();
  lanjut.focus();
  bingkai = requestAnimationFrame(ikuti);
}
