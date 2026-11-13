/**
 * Kotak dialog warga (PRD F-03): muncul di bagian bawah area game, satu baris naskah per kotak.
 * Lanjut dengan E, Spasi, Enter, atau klik; Esc menutup. Panel Tiko tetap bisa dipakai di sampingnya.
 */
import type { Baris, Pembicara } from '../../shared/warga';
import { potretTiko } from '../tiko/gambar';
import { el } from './dom';

export interface OpsiPercakapan {
  pembicara: Record<string, Pembicara>;
  /** Dipanggil setelah kotak ditutup. `tamat` = semua baris sudah dibaca (bukan dilewati dengan Esc). */
  tutup: (tamat: boolean) => void;
}

function kotak(): HTMLDialogElement {
  let d = document.getElementById('kotak-dialog') as HTMLDialogElement | null;
  if (!d) {
    d = el('dialog', undefined, { id: 'kotak-dialog', class: 'kotak-dialog', 'aria-label': 'Percakapan' });
    document.getElementById('game')!.append(d);
  }
  return d;
}

export function bukaPercakapan(baris: Baris[], o: OpsiPercakapan): void {
  const d = kotak();
  if (d.open || baris.length === 0) {
    o.tutup(baris.length === 0);
    return;
  }
  const ikon = el('span', '', { class: 'kotak-ikon', 'aria-hidden': 'true' });
  const nama = el('p', '', { class: 'kotak-nama' });
  const teks = el('p', '', { class: 'kotak-teks', 'aria-live': 'polite' });
  const lanjut = el('button', '', { type: 'button', class: 'kotak-lanjut' });
  const isi = el('div', undefined, { class: 'kotak-isi' });
  isi.append(nama, teks);
  d.replaceChildren(ikon, isi, lanjut);

  let i = 0;
  let tamat = false;
  // Abaikan tekanan dalam 250 ms pertama, supaya tombol yang membuka kotak tidak langsung melewati baris pertama.
  const dibuka = performance.now();
  const tampil = () => {
    const b = baris[i];
    const p = o.pembicara[b.siapa] ?? { nama: b.siapa, ikon: '' };
    // Tiko memakai gambar pixel art yang sama dengan rohnya di peta; pembicara lain memakai ikon dari naskah.
    if (b.siapa === 'tiko') ikon.replaceChildren(el('img', undefined, { src: potretTiko(), alt: '', class: 'kotak-ikon-tiko' }));
    else ikon.textContent = p.ikon;
    nama.textContent = p.nama;
    teks.textContent = b.teks;
    lanjut.textContent = i < baris.length - 1 ? 'Lanjut ▶' : 'Selesai';
    d.toggleAttribute('data-tiko', b.siapa === 'tiko');
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
      d.removeEventListener('click', maju);
      d.removeEventListener('keydown', tekan);
      o.tutup(tamat);
    },
    { once: true },
  );
  tampil();
  d.show();
  lanjut.focus();
}
