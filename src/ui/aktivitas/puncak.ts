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
/** Di bawah kekuatan ini udara lembap jarang sampai ke puncak sebelum hilang (lihat UMUR_MAKS). */
const AMBANG_ANGIN_CUKUP = 55;
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
  // Kotak angka cukup lebar untuk label-suhu 23px (tetap ≥18px di layar 1366x768).
  const kotakX = labelKiri ? x - 90 : x + 14;
  g.append(
    svg('rect', { class: 'kotak', x: kotakX, y: dasar - 64, width: 76, height: 34, rx: 6, fill: '#ffffff', stroke: '#5b6b75', 'stroke-width': 2 }),
    svg('text', { class: 'label-suhu', x: kotakX + 38, y: dasar - 39, 'text-anchor': 'middle' }, `${c}°C`),
  );
  return g;
}

/** Gradien linear vertikal dalam koordinat gambar. */
function gradien(id: string, y1: number, y2: number, warna: [number, string][]): SVGLinearGradientElement {
  const g = svg('linearGradient', { id, x1: 0, y1, x2: 0, y2, gradientUnits: 'userSpaceOnUse' });
  for (const [o, c] of warna) g.append(svg('stop', { offset: o, 'stop-color': c }));
  return g;
}

/** Pohon pinus kecil berdiri di permukaan tanah. */
function pinus(x: number, skala = 1): SVGGElement {
  const y = tanahY(x);
  const s = skala;
  const g = svg('g', { 'aria-hidden': 'true' });
  g.append(
    svg('rect', { x: x - 2 * s, y: y - 6 * s, width: 4 * s, height: 7 * s, fill: '#6b4a2f' }),
    svg('polygon', { points: `${x - 11 * s},${y - 5 * s} ${x},${y - 22 * s} ${x + 11 * s},${y - 5 * s}`, fill: '#2f6b46' }),
    svg('polygon', { points: `${x - 8 * s},${y - 14 * s} ${x},${y - 30 * s} ${x + 8 * s},${y - 14 * s}`, fill: '#3b8156' }),
    svg('polygon', { points: `${x},${y - 30 * s} ${x + 8 * s},${y - 14 * s} ${x + 11 * s},${y - 5 * s} ${x},${y - 5 * s}`, fill: '#1f4f36', opacity: 0.35 }),
  );
  return g;
}

/**
 * Latar: langit bergradasi, matahari bercahaya, pegunungan jauh, laut berombak dengan buih di tepi pantai,
 * dan gunung dengan sisi teduh, pinus, serta puncak berbatu. Hanya hiasan; bentuk tanah (TANAH) tetap sama,
 * jadi gerak udara dan zona awan tidak berubah. Sengaja tanpa awan di langit, supaya satu-satunya awan
 * adalah yang terbentuk di puncak.
 */
function latar(): SVGGElement {
  const g = svg('g', { 'aria-hidden': 'true' });
  const defs = svg('defs');
  const cahaya = svg('radialGradient', { id: 'pk-surya' });
  cahaya.append(
    svg('stop', { offset: 0, 'stop-color': '#fff6c2', 'stop-opacity': 0.95 }),
    svg('stop', { offset: 1, 'stop-color': '#fff6c2', 'stop-opacity': 0 }),
  );
  defs.append(
    gradien('pk-langit', -TINGGI, LAUT_Y, [[0, '#4fa8d8'], [0.55, '#8fd0f0'], [1, '#e4f5fc']]),
    gradien('pk-laut', LAUT_Y, TINGGI, [[0, '#3aa3cc'], [0.35, '#2380ad'], [1, '#165f86']]),
    gradien('pk-pasir', LAUT_Y, TINGGI, [[0, '#f6e8bd'], [1, '#e2cc8e']]),
    gradien('pk-gunung', 80, 320, [[0, '#6c9f5d'], [0.5, '#82b86c'], [1, '#9ccc7f']]),
    gradien('pk-jauh', 100, 300, [[0, '#9cc2d8'], [1, '#c9e2ef']]),
    cahaya,
  );
  g.append(defs);

  // Langit dan matahari. Latar dibuat lebih lebar dari viewBox supaya penuh di layar lebar.
  g.append(
    svg('rect', { x: -LEBAR, y: -TINGGI, width: LEBAR * 3, height: TINGGI + LAUT_Y, fill: 'url(#pk-langit)' }),
    svg('circle', { cx: 60, cy: 55, r: 70, fill: 'url(#pk-surya)' }),
  );
  const sinar = svg('g', { stroke: '#ffd23f', 'stroke-width': 4, 'stroke-linecap': 'round' });
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    sinar.append(svg('line', { x1: 60 + Math.cos(a) * 38, y1: 55 + Math.sin(a) * 38, x2: 60 + Math.cos(a) * 48, y2: 55 + Math.sin(a) * 48 }));
  }
  g.append(
    sinar,
    svg('circle', { cx: 60, cy: 55, r: 30, fill: '#ffd23f', stroke: '#f5b301', 'stroke-width': 4 }),
    svg('circle', { cx: 50, cy: 46, r: 9, fill: '#fff2a8', opacity: 0.8 }),
  );

  // Pegunungan jauh, biru pudar, di belakang gunung utama.
  g.append(
    svg('polygon', { points: '700,300 760,170 820,205 880,120 950,180 1010,140 1600,140 1600,300', fill: 'url(#pk-jauh)' }),
    svg('polygon', { points: '860,140 880,120 900,138 890,134 880,128 870,138', fill: '#eef7fb', opacity: 0.8 }),
  );

  // Laut dengan ombak dan buih di tepi pantai; pasir dengan sedikit butiran.
  g.append(
    svg('rect', { x: -LEBAR, y: LAUT_Y, width: LEBAR + PANTAI.x0, height: TINGGI * 2, fill: 'url(#pk-laut)' }),
    svg('rect', { x: -LEBAR, y: LAUT_Y, width: LEBAR + PANTAI.x0, height: 3, fill: '#bfe9f7', opacity: 0.9 }),
    svg('rect', { x: PANTAI.x0, y: LAUT_Y, width: LEBAR * 2, height: TINGGI * 2, fill: 'url(#pk-pasir)' }),
  );
  for (const [x, y] of [[30, 318], [140, 336], [80, 358], [195, 322], [10, 372], [170, 368]]) {
    g.append(svg('path', { d: `M${x},${y} q 10,-6 20,0 t 20,0`, fill: 'none', stroke: '#d8f1fb', 'stroke-width': 2.5, 'stroke-linecap': 'round', opacity: 0.85 }));
  }
  g.append(svg('path', { d: `M${PANTAI.x0},${LAUT_Y} q -6,10 0,20 q -6,10 0,20 q -6,10 0,20 q -6,10 0,20`, fill: 'none', stroke: '#ffffff', 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.9 }));
  for (const [x, y] of [[275, 330], [300, 365], [352, 340], [372, 368], [262, 356]]) {
    g.append(svg('circle', { cx: x, cy: y, r: 1.8, fill: '#c9ad6a' }));
  }

  // Gunung utama: badan bergradasi, sisi teduh di balik puncak, garis lapisan batuan, pinus, dan puncak berbatu.
  const titikGunung = TANAH.filter(([x]) => x >= 380).map(([x, y]) => `${x},${y}`).join(' ');
  g.append(
    svg('polygon', { points: `380,${TINGGI * 2} ${titikGunung} 1600,${TINGGI * 2}`, fill: 'url(#pk-gunung)', stroke: '#4f7f41', 'stroke-width': 3, 'stroke-linejoin': 'round' }),
    svg('polygon', { points: `640,92 700,110 800,175 1600,175 1600,${TINGGI * 2} 690,${TINGGI * 2}`, fill: '#2f5a2a', opacity: 0.18 }),
  );
  for (const [x1, y1, x2, y2] of [[420, 292, 470, 280], [480, 262, 520, 255], [575, 190, 610, 184], [610, 140, 630, 136], [735, 150, 770, 160]]) {
    g.append(svg('line', { x1, y1, x2, y2, stroke: '#5f8f4f', 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.6 }));
  }
  g.append(
    svg('polygon', { points: '588,140 640,92 700,110 728,128 690,134 650,124 615,142', fill: '#b7b2a6', stroke: '#8d887d', 'stroke-width': 2, 'stroke-linejoin': 'round' }),
    svg('polygon', { points: '610,124 640,92 652,104 628,118', fill: '#d8d4ca' }),
    svg('polygon', { points: '640,92 700,110 728,128 690,134 668,116', fill: '#8f8a7f', opacity: 0.5 }),
  );
  for (const [x, s] of [[418, 0.9], [440, 1], [458, 0.85], [792, 0.9]] as const) g.append(pinus(x, s));
  for (const x of [395, 480, 492, 600, 785]) {
    const y = tanahY(x);
    g.append(svg('path', { d: `M${x - 4},${y} l 2,-6 M${x},${y} l 0,-8 M${x + 4},${y} l -2,-6`, stroke: '#5f9a4f', 'stroke-width': 1.6, 'stroke-linecap': 'round' }));
  }
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

  gambar.append(latar());

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

  // Label dengan tepi terang supaya tetap terbaca di atas gambar yang berwarna.
  const halo = 'paint-order:stroke;stroke:#ffffff;stroke-width:5px;stroke-linejoin:round';
  gambar.append(
    svg('text', { x: 120, y: 350, 'text-anchor': 'middle', class: 'label-kolam', style: 'fill:#ffffff;paint-order:stroke;stroke:#0f4f72;stroke-width:5px;stroke-linejoin:round' }, 'Laut'),
    svg('text', { x: 330, y: 352, 'text-anchor': 'middle', class: 'label-kolam', style: halo }, 'Pantai'),
    svg('text', { x: 652, y: 148, 'text-anchor': 'middle', class: 'label-kolam', style: halo }, 'Puncak'),
  );

  // Kendali.
  const kendali = el('div', undefined, { class: 'kendali' });
  const slider = el('input', undefined, { id: 'arah-angin', type: 'range', min: '-100', max: '100', step: '5', value: '0' });
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
  /** Detik angin sudah ke arah gunung tapi belum cukup kuat membawa udara lembap ke puncak. */
  let sejakLemah = 0;
  let kabarLemah = false;
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
    if (kabarLemah) {
      kabarLemah = false;
      kabar.textContent = '';
    }
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
    // Angin sudah ke gunung tapi terlalu lemah: beri tahu anak, jangan biarkan ia menunggu tanpa petunjuk.
    sejakLemah = !sudahSiap && massaAwan === 0 && angin > 10 && angin < AMBANG_ANGIN_CUKUP ? sejakLemah + dt : 0;
    if (sejakLemah > 5 && !kabarLemah && teks?.lemah) {
      kabarLemah = true;
      kabar.textContent = teks.lemah;
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
