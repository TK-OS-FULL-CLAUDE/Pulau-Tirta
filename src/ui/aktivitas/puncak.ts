/**
 * Misi 2 · Puncak Kabut (pengembunan).
 * Udara lembap naik pelan dari laut. Anak mengatur arah angin:
 * - tenang atau ke laut: udara tetap rendah di atas laut dan pantai yang hangat, dan tidak jadi awan;
 * - ke gunung: udara terdorong naik lereng, melewati termometer yang angkanya makin kecil, lalu di puncak
 *   muncul titik-titik air kecil yang berkumpul menjadi awan.
 *
 * Aturan sains: udara lembap digambar sebagai helai tipis (uap air sebenarnya tidak terlihat; dijelaskan di
 * layar pulih). Awan digambar sebagai kumpulan titik air, bukan asap. Kata "dingin" dilarang di petunjuk
 * tingkat 1, jadi suhu hanya ditunjukkan lewat angka dan warna termometer.
 */
import type { Misi, Tingkat } from '../../../shared/content';
import { el, svg } from '../dom';
import type { Aktivitas } from './tipe';

const LEBAR = 800;
const TINGGI = 380;
const LAUT_Y = 300;
/** Permukaan tanah: laut dan pantai datar, lalu lereng naik ke puncak dan turun di sisi lain. */
const TANAH: [number, number][] = [
  [-800, 300],
  [380, 300],
  [470, 250],
  [560, 165],
  [640, 92],
  [700, 110],
  [800, 175],
  [1600, 175],
];
const PUNCAK = { x: 632, y: 46 };
const PANTAI = { x0: 250, x1: 380 };

const JUMLAH_UDARA = 7;
/** px/detik saat angin penuh. */
const KECEPATAN_ANGIN = 80;
/** Angin laut lemah yang selalu ada, supaya udara lembap ikut menyebar ke atas pantai (tanpa sampai ke puncak). */
const ANGIN_DASAR = 10;
/** Udara hangat naik pelan dari permukaan laut, tapi tanpa dorongan lereng tetap rendah. */
const NAIK_SENDIRI = 10;
const BATAS_NAIK_SENDIRI = 238;
const JARAK_TANAH = 16;
const UMUR_MAKS = 14;
/** Udara yang sampai setinggi ini di sekitar puncak berubah menjadi titik-titik air. */
const ZONA_AWAN = { x0: 560, x1: 720, yMaks: 142 };
const AWAN_SIAP = 5;
const AWAN_MAKS = 14;
const TETES_PER_UDARA = 6;
/** Ukuran awan (setengah lebar dan tinggi) untuk massa tertentu. */
const ukuranAwan = (massa: number) => ({ rx: 52 + massa * 4.5, ry: 20 + massa * 1.8 });
/** Bentuk awan dalam satuan ukuranAwan: [dx, dy, r]. */
const GUMPAL: [number, number, number][] = [
  [-0.55, 0.2, 0.5],
  [-0.2, -0.15, 0.7],
  [0.25, -0.05, 0.65],
  [0.6, 0.22, 0.45],
  [0, 0.3, 0.55],
];

const TERMOMETER = [
  { x: 330, c: 31, warna: '#e0533d', labelKiri: false },
  { x: 515, c: 24, warna: '#f08a2c', labelKiri: false },
  { x: 760, c: 17, warna: '#3f8fd2', labelKiri: true },
];

function tanahY(x: number): number {
  for (let i = 1; i < TANAH.length; i++) {
    const [x0, y0] = TANAH[i - 1];
    const [x1, y1] = TANAH[i];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return TANAH[TANAH.length - 1][1];
}

interface Udara {
  x: number;
  y: number;
  umur: number;
  fase: number;
  g: SVGGElement;
}

function termometer(x: number, c: number, warna: string, labelKiri: boolean): SVGGElement {
  const dasar = tanahY(x);
  const g = svg('g', { class: 'termometer' });
  const tinggiIsi = (c / 40) * 52;
  g.append(
    svg('rect', { x: x - 7, y: dasar - 72, width: 14, height: 62, rx: 7, fill: '#ffffff', stroke: '#5b6b75', 'stroke-width': 2 }),
    svg('rect', { x: x - 3, y: dasar - 14 - tinggiIsi, width: 6, height: tinggiIsi, fill: warna }),
    svg('circle', { cx: x, cy: dasar - 9, r: 9, fill: warna, stroke: '#5b6b75', 'stroke-width': 2 }),
  );
  const kotakX = labelKiri ? x - 72 : x + 14;
  g.append(
    svg('rect', { class: 'kotak', x: kotakX, y: dasar - 60, width: 58, height: 28, rx: 6, fill: '#ffffff', stroke: '#5b6b75', 'stroke-width': 2 }),
    svg('text', { class: 'label-suhu', x: kotakX + 29, y: dasar - 40, 'text-anchor': 'middle' }, `${c}°C`),
  );
  return g;
}

export function buatPuncak(misi: Misi, siap: () => void): Aktivitas {
  const teks = misi.aktivitas;
  const akar = el('div', undefined, { class: 'aktivitas puncak' });

  const gambar = svg('svg', {
    viewBox: `0 0 ${LEBAR} ${TINGGI}`,
    role: 'img',
    'aria-label': 'Laut, pantai, dan gunung dengan tiga termometer. Angin bisa diarahkan ke laut atau ke gunung.',
  });

  // Langit, matahari, laut, pantai, gunung. Latar dibuat lebih lebar dari viewBox supaya penuh di layar lebar.
  gambar.append(svg('rect', { x: -LEBAR, y: -TINGGI, width: LEBAR * 3, height: TINGGI * 3, fill: '#bfe6f5' }));
  gambar.append(
    svg('circle', { cx: 60, cy: 55, r: 30, fill: '#ffd23f', stroke: '#f5b301', 'stroke-width': 4 }),
    svg('rect', { x: -LEBAR, y: LAUT_Y, width: LEBAR + PANTAI.x0, height: TINGGI * 2, fill: '#2f8fb5' }),
    svg('rect', { x: PANTAI.x0, y: LAUT_Y, width: LEBAR * 2, height: TINGGI * 2, fill: '#f2e3b3' }),
  );
  for (const [x, y] of [[40, 322], [140, 340], [90, 362], [190, 318]]) {
    gambar.append(svg('path', { d: `M${x},${y} q 10,-6 20,0 t 20,0`, fill: 'none', stroke: '#d8f1fb', 'stroke-width': 2.5, 'stroke-linecap': 'round' }));
  }
  const titikGunung = TANAH.filter(([x]) => x >= 380).map(([x, y]) => `${x},${y}`).join(' ');
  gambar.append(
    svg('polygon', { points: `380,${TINGGI * 2} ${titikGunung} 1600,${TINGGI * 2}`, fill: '#8fbf7a', stroke: '#5e8f4c', 'stroke-width': 3 }),
    svg('polygon', { points: '588,140 640,92 700,110 728,128 690,134 650,124 615,142', fill: '#b7b2a6' }),
  );

  for (const t of TERMOMETER) gambar.append(termometer(t.x, t.c, t.warna, t.labelKiri));

  // Kantong angin di pantai: menggantung saat tenang, berkibar ke arah angin.
  const tiangX = 280;
  const tiangAtas = LAUT_Y - 78;
  gambar.append(svg('line', { x1: tiangX, y1: LAUT_Y, x2: tiangX, y2: tiangAtas, stroke: '#5b6b75', 'stroke-width': 4, 'stroke-linecap': 'round' }));
  const kantong = svg('g', { 'aria-hidden': 'true' });
  kantong.append(
    svg('polygon', { points: '0,-8 16,-7 16,7 0,8', fill: '#e0533d' }),
    svg('polygon', { points: '16,-7 30,-6 30,6 16,7', fill: '#ffffff' }),
    svg('polygon', { points: '30,-6 44,-4 44,4 30,6', fill: '#e0533d' }),
  );
  gambar.append(kantong);

  // Udara lembap.
  const lapisUdara = svg('g', { 'aria-hidden': 'true' });
  gambar.append(lapisUdara);
  const udara: Udara[] = [];
  const lahir = (u: Partial<Udara> = {}): Udara => {
    const g = u.g ?? svg('g', { class: 'udara' });
    if (!u.g) {
      g.append(svg('path', { d: 'M0,0 c -5,-6 5,-12 0,-18 c -5,-6 5,-12 0,-18' }));
      lapisUdara.append(g);
    }
    return { x: 20 + Math.random() * 240, y: LAUT_Y - 4, umur: 0, fase: Math.random() * Math.PI * 2, g };
  };
  for (let i = 0; i < JUMLAH_UDARA; i++) {
    const u = lahir();
    u.umur = Math.random() * 6; // sebar supaya tidak muncul bersamaan
    u.y = LAUT_Y - 4 - Math.random() * 50;
    udara.push(u);
  }

  // Awan: latar lembut dan titik-titik air yang bertambah.
  const awan = svg('g', { class: 'awan' });
  const latarAwan = svg('g', { opacity: 0 });
  for (const [dx, dy, r] of GUMPAL) latarAwan.append(svg('circle', { cx: dx, cy: dy, r, fill: '#ffffff' }));
  const tetesAwan = svg('g');
  awan.append(
    latarAwan,
    tetesAwan,
    svg('text', { class: 'label-sorot', x: PUNCAK.x - 84, y: 28, 'text-anchor': 'end' }, 'titik-titik air kecil ▸'),
  );
  gambar.append(awan);

  gambar.append(
    svg('text', { x: 120, y: 350, 'text-anchor': 'middle', class: 'label-kolam', fill: '#ffffff', style: 'fill:#ffffff' }, 'Laut'),
    svg('text', { x: 330, y: 352, 'text-anchor': 'middle', class: 'label-kolam' }, 'Pantai'),
    svg('text', { x: 652, y: 132, 'text-anchor': 'middle', class: 'label-kolam' }, 'Puncak'),
  );

  // Kendali.
  const kendali = el('div', undefined, { class: 'kendali' });
  const slider = el('input', undefined, { id: 'arah-angin', type: 'range', min: '-100', max: '100', step: '1', value: '0' });
  const ulangi = el('button', 'Ulangi', { type: 'button', class: 'tombol-kecil' });
  kendali.append(
    el('label', 'Arah angin', { for: 'arah-angin' }),
    el('span', '← ke laut', { class: 'ujung', 'aria-hidden': 'true' }),
    slider,
    el('span', 'ke gunung →', { class: 'ujung', 'aria-hidden': 'true' }),
    ulangi,
  );
  const kabar = el('p', '', { class: 'kabar', 'aria-live': 'polite' });
  akar.append(el('p', teks?.arahan ?? '', { class: 'arahan' }), gambar, kendali, kabar);

  // Keadaan.
  let angin = 0;
  let massaAwan = 0;
  let sudahSiap = false;
  let raf = 0;
  let lalu = performance.now();

  function aturAngin(v: number): void {
    angin = Math.max(-100, Math.min(100, v));
    const sudut = 80 - angin * 0.8; // 80° = menggantung, 0° = ke gunung, 160° = ke laut
    kantong.setAttribute('transform', `translate(${tiangX} ${tiangAtas + 6}) rotate(${sudut.toFixed(1)})`);
    slider.setAttribute('aria-valuetext', angin > 15 ? 'angin ke gunung' : angin < -15 ? 'angin ke laut' : 'angin tenang');
  }

  function tambahAwan(): void {
    if (massaAwan >= AWAN_MAKS) return;
    massaAwan++;
    const { rx, ry } = ukuranAwan(massaAwan);
    for (let i = 0; i < TETES_PER_UDARA; i++) {
      const t = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random());
      tetesAwan.append(
        svg('circle', {
          class: 'tetes',
          cx: (PUNCAK.x + Math.cos(t) * r * rx * 0.85).toFixed(1),
          cy: (PUNCAK.y + 4 + Math.sin(t) * r * ry * 0.7).toFixed(1),
          r: 3.4,
        }),
      );
    }
    latarAwan.setAttribute('transform', `translate(${PUNCAK.x} ${PUNCAK.y}) scale(${rx} ${ry})`);
    latarAwan.setAttribute('opacity', String(Math.min(0.85, massaAwan * 0.09)));
    if (!sudahSiap && massaAwan >= AWAN_SIAP) {
      sudahSiap = true;
      kabar.textContent = teks?.siap ?? '';
      siap();
    }
  }

  function langkah(kini: number): void {
    const dt = Math.min(0.1, (kini - lalu) / 1000);
    lalu = kini;
    for (const u of udara) {
      u.umur += dt;
      u.fase += dt * 2.2;
      u.x += ((angin / 100) * KECEPATAN_ANGIN + ANGIN_DASAR + Math.sin(u.fase) * 6) * dt;
      // Naik sendiri hanya sampai batas rendah; lebih tinggi dari itu hanya kalau terdorong lereng.
      if (u.y > BATAS_NAIK_SENDIRI) u.y = Math.max(BATAS_NAIK_SENDIRI, u.y - NAIK_SENDIRI * dt);
      u.y = Math.min(u.y, tanahY(u.x) - JARAK_TANAH);
      if (u.y <= ZONA_AWAN.yMaks && u.x >= ZONA_AWAN.x0 && u.x <= ZONA_AWAN.x1) {
        tambahAwan();
        Object.assign(u, lahir({ g: u.g }));
      } else if (u.umur > UMUR_MAKS || u.x < -20 || u.x > LEBAR + 20) {
        Object.assign(u, lahir({ g: u.g }));
      }
      const muncul = Math.min(1, u.umur / 0.8) * Math.min(1, (UMUR_MAKS - u.umur) / 0.8);
      u.g.setAttribute('transform', `translate(${u.x.toFixed(1)} ${u.y.toFixed(1)}) rotate(${(angin * 0.3).toFixed(1)})`);
      u.g.setAttribute('opacity', Math.max(0, muncul).toFixed(2));
    }
    raf = requestAnimationFrame(langkah);
  }

  slider.addEventListener('input', () => aturAngin(Number(slider.value)));
  ulangi.addEventListener('click', () => {
    massaAwan = 0;
    tetesAwan.replaceChildren();
    latarAwan.setAttribute('opacity', '0');
    for (const u of udara) Object.assign(u, lahir({ g: u.g }));
  });

  // Anak juga bisa menekan atau menyeret di gambar: kiri = ke laut, kanan = ke gunung.
  const arahDariPointer = (e: PointerEvent) => {
    const m = gambar.getScreenCTM();
    if (!m) return;
    const titik = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    slider.value = String(Math.round(((titik.x - LEBAR / 2) / (LEBAR / 2)) * 100));
    aturAngin(Number(slider.value));
  };
  gambar.addEventListener('pointerdown', (e) => {
    gambar.setPointerCapture(e.pointerId);
    arahDariPointer(e);
  });
  gambar.addEventListener('pointermove', (e) => {
    if (gambar.hasPointerCapture(e.pointerId)) arahDariPointer(e);
  });

  aturAngin(0);
  raf = requestAnimationFrame(langkah);

  return {
    el: akar,
    sorot(tingkat: Tingkat) {
      if (tingkat < 2) return;
      akar.classList.add('sorot');
      if (teks?.sorot) kabar.textContent = teks.sorot;
    },
    hentikan() {
      cancelAnimationFrame(raf);
    },
  };
}
