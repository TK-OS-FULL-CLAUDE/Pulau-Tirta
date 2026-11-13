/**
 * Layar penuh di luar permainan: layar judul, menu jeda, dan layar tamat.
 * Semuanya dialog modal yang dibuat dari kode (tidak perlu mengubah index.html).
 * Panel "Tentang Tiko" bisa dibuka dari layar judul dan menu jeda (PRD F-17).
 */
import { potretTiko } from '../tiko/gambar';
import { svg, el } from './dom';

function layar(id: string, kelas: string): HTMLDialogElement {
  let d = document.getElementById(id) as HTMLDialogElement | null;
  if (!d) {
    d = el('dialog', undefined, { id, class: `layar ${kelas}` });
    document.body.append(d);
  }
  d.replaceChildren();
  return d;
}

export function bukaTentang(): void {
  (document.getElementById('dialog-tentang') as HTMLDialogElement).showModal();
}

/** Tombol dengan konfirmasi dua langkah, untuk aksi yang menghapus progres atau data. */
export function tombolYakin(teks: string, peringatan: string, aksi: () => void, teksYa = 'Ya, mulai dari awal'): HTMLElement {
  const wadah = el('div', undefined, { class: 'yakin' });
  const awal = el('button', teks, { type: 'button', class: 'tombol-kecil' });
  awal.addEventListener('click', () => {
    const ya = el('button', teksYa, { type: 'button', class: 'tombol-bahaya' });
    const batal = el('button', 'Batal', { type: 'button', class: 'tombol-kecil' });
    ya.addEventListener('click', aksi);
    batal.addEventListener('click', () => {
      wadah.replaceChildren(awal);
      awal.focus();
    });
    wadah.replaceChildren(el('p', peringatan, { class: 'peringatan' }), ya, batal);
    batal.focus();
  });
  wadah.append(awal);
  return wadah;
}

function tombolTentang(): HTMLButtonElement {
  const t = el('button', 'Tentang Tiko', { type: 'button', class: 'tombol-kecil' });
  t.addEventListener('click', bukaTentang);
  return t;
}

function buka(d: HTMLDialogElement, tutup?: () => void, bisaDibatalkan = true): void {
  if (!bisaDibatalkan) d.addEventListener('cancel', (e) => e.preventDefault());
  if (tutup) d.addEventListener('close', tutup, { once: true });
  d.showModal();
  d.querySelector<HTMLElement>('[autofocus]')?.focus();
}

export interface OpsiJudul {
  adaProgres: boolean;
  sisaTempat: number;
  /** `baru` = permainan baru (belum ada progres). */
  mulai: (baru: boolean) => void;
  ulang: () => void;
}

export function bukaJudul(o: OpsiJudul): void {
  const d = layar('layar-judul', 'layar-judul');
  const utama = el('button', o.adaProgres ? 'Lanjutkan petualangan' : 'Mulai petualangan', {
    type: 'button',
    class: 'tombol-besar',
    autofocus: '',
  });
  utama.addEventListener('click', () => {
    d.close();
    o.mulai(!o.adaProgres);
  });
  d.append(
    el('img', undefined, { class: 'judul-tiko', src: potretTiko(), alt: '', width: '88', height: '104' }),
    el('h1', 'Petualangan Pulau Tirta'),
    el('p', 'Hujan sudah lama tidak turun. Bantu Tiko memperbaiki siklus air di pulau ini!', { class: 'judul-sub' }),
    utama,
  );
  if (o.adaProgres) {
    d.append(
      el('p', o.sisaTempat ? `Masih ada ${o.sisaTempat} tempat yang perlu dipulihkan.` : 'Semua tempat sudah pulih.', { class: 'catatan' }),
      tombolYakin('Mulai dari awal', 'Semua progres akan hilang.', o.ulang),
    );
  }
  const bawah = el('div', undefined, { class: 'judul-bawah' });
  bawah.append(tombolTentang(), el('span', 'Tiko adalah AI di dalam game ini.', { class: 'catatan' }));
  d.append(bawah);
  buka(d, undefined, false);
}

export interface OpsiJeda {
  ulang: () => void;
  tutup: () => void;
  /** Tombol "Suara: Nyala/Mati" (PRD F-12). */
  suara?: { nyala: boolean; ubah: (nyala: boolean) => void };
}

/** Tombol sakelar suara; teksnya selalu menyebut keadaan sekarang. */
function tombolSuara(awal: boolean, ubah: (nyala: boolean) => void): HTMLButtonElement {
  let nyala = awal;
  const t = el('button', '', { type: 'button', class: 'tombol-suara' });
  const tampil = () => {
    t.textContent = nyala ? '🔊 Suara: Nyala' : '🔇 Suara: Mati';
    t.setAttribute('aria-pressed', String(nyala));
  };
  t.addEventListener('click', () => {
    nyala = !nyala;
    ubah(nyala);
    tampil();
  });
  tampil();
  return t;
}

export function bukaJeda(o: OpsiJeda): void {
  const d = layar('menu-jeda', 'layar-jeda');
  const lanjut = el('button', 'Lanjutkan', { type: 'button', class: 'tombol-besar', autofocus: '' });
  lanjut.addEventListener('click', () => d.close());
  d.append(el('h2', 'Jeda'), lanjut);
  if (o.suara) d.append(tombolSuara(o.suara.nyala, o.suara.ubah));
  d.append(tombolTentang(), tombolYakin('Mulai dari awal', 'Semua progres akan hilang.', o.ulang));
  buka(d, o.tutup);
}

/** Diagram siklus air: empat tahap, tempat anak mempelajarinya, dan panah yang berputar. */
function diagramSiklus(): SVGSVGElement {
  const g = svg('svg', { viewBox: '0 0 420 300', class: 'siklus', role: 'img', 'aria-label': 'Siklus air: penguapan, pengembunan, hujan, peresapan, lalu kembali ke penguapan.' });
  const panah = svg('marker', { id: 'ujung-panah', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
  panah.append(svg('path', { d: 'M0,0 L10,5 L0,10 z', fill: '#1f6f8b' }));
  const defs = svg('defs');
  defs.append(panah);
  g.append(defs);
  const simpul = [
    { x: 100, y: 212, ikon: '☀️', nama: 'Penguapan', tempat: 'Pantai Biru' },
    { x: 100, y: 92, ikon: '☁️', nama: 'Pengembunan', tempat: 'Puncak Kabut' },
    { x: 320, y: 92, ikon: '🌧️', nama: 'Hujan', tempat: 'Lembah Hujan' },
    { x: 320, y: 212, ikon: '🌱', nama: 'Peresapan', tempat: 'Hutan & Sungai' },
  ];
  simpul.forEach((a, i) => {
    const b = simpul[(i + 1) % simpul.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const p = Math.hypot(dx, dy);
    const r = 40;
    g.append(svg('line', { x1: a.x + (dx / p) * r, y1: a.y + (dy / p) * r, x2: b.x - (dx / p) * r, y2: b.y - (dy / p) * r, stroke: '#1f6f8b', 'stroke-width': 4, 'marker-end': 'url(#ujung-panah)' }));
  });
  for (const s of simpul) {
    g.append(
      svg('circle', { cx: s.x, cy: s.y, r: 32, fill: '#ffffff', stroke: '#1f6f8b', 'stroke-width': 3 }),
      svg('text', { x: s.x, y: s.y + 10, 'text-anchor': 'middle', 'font-size': 28 }, s.ikon),
      svg('text', { x: s.x, y: s.y + (s.y < 150 ? -58 : 56), 'text-anchor': 'middle', class: 'siklus-nama' }, s.nama),
      svg('text', { x: s.x, y: s.y + (s.y < 150 ? -41 : 73), 'text-anchor': 'middle', class: 'siklus-tempat' }, s.tempat),
    );
  }
  return g;
}

export interface OpsiTamat {
  jumlahKartu: number;
  ulang: () => void;
  tutup: () => void;
}

export function bukaTamat(o: OpsiTamat): void {
  const d = layar('layar-tamat', 'layar-tamat');
  const jelajah = el('button', 'Jelajahi pulau lagi', { type: 'button', class: 'tombol-besar', autofocus: '' });
  jelajah.addEventListener('click', () => d.close());
  d.append(
    el('p', 'Tamat!', { class: 'judul-kecil' }),
    el('h1', 'Pulau Tirta pulih lagi'),
    el('p', `Kamu memulihkan 4 tempat dan mengumpulkan ${o.jumlahKartu} Kartu Ilmu. Air di bumi terus berputar seperti ini, tanpa awal dan akhir.`, { class: 'judul-sub' }),
    diagramSiklus(),
    jelajah,
    tombolYakin('Main lagi dari awal', 'Semua progres akan hilang.', o.ulang),
    el('p', 'Dibuat oleh Aufa, Evan, Faza, dan Sabri untuk LOGICODIX 2026.', { class: 'catatan' }),
  );
  buka(d, o.tutup);
}
