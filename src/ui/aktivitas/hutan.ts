/**
 * Misi 4 · Hutan & Sungai (peresapan dan aliran), tiga langkah seperti di PRD:
 * 1. Bandingkan: anak menyiram lereng gundul dan lereng berpohon dengan hujan yang sama banyak. Gambar penampang
 *    tanah menunjukkan ke mana airnya pergi:
 *    - lereng gundul: sebagian besar air mengalir di permukaan ke sungai; sedikit yang masuk ke tanah, cepat habis;
 *    - lereng berpohon: sebagian besar air masuk ke tanah lewat bagian bawah pohon, air tanah naik, dan mata
 *      airnya tetap mengalir lama setelah hujan berhenti.
 * 2. Tanam: tiga bibit di lereng gundul. Sesudahnya lereng itu menahan lebih banyak air kalau disiram lagi.
 * 3. Buka sungai: angkat tiga sampah yang menyumbat alur, lalu airnya mengalir lagi ke sungai.
 * Pertanyaan alasan muncul setelah sungai mengalir; mata air lereng berpohon masih mengalir saat itu.
 *
 * Semua teks dan label yang tampil diambil dari `misi.aktivitas` di content/misi.json, supaya mudah diubah.
 * Kata "meresap", "akar", "gembur" dilarang di petunjuk tingkat 1, jadi akar digambar tanpa label.
 */
import type { Misi, Tingkat } from '../../../shared/content';
import { el, svg } from '../dom';
import type { Aktivitas } from './tipe';

const LEBAR = 800;
const TINGGI = 380;
const ALUR = { x0: 370, x1: 430, dasar: 330 };
const LAMA_HUJAN = 4;
/** Air hujan per detik yang jatuh ke satu lereng (satuan bebas; air tanah penuh = 1). */
const LAJU_HUJAN = 0.25;
const TINGGI_AIR_TANAH = 130;
const JEDA_SIAP = 3;
/** Tempat bibit di lereng gundul dan sampah di alur sungai. */
const BIBIT_X = [150, 215, 280];
const SAMPAH = [
  { x: 383, y: 282, jenis: 'botol' },
  { x: 402, y: 276, jenis: 'kantong' },
  { x: 418, y: 288, jenis: 'ranting' },
] as const;

/** Lereng kiri: gundul. Lereng kanan: cermin lereng kiri, berpohon. */
const SISI = [
  { kunci: 'gundul', masukTanah: 0.15, keluarMataAir: 0.5, tanah: '#b98d5e', cermin: false },
  { kunci: 'pohon', masukTanah: 0.8, keluarMataAir: 0.04, tanah: '#7a5b3f', cermin: true },
] as const;

/** Tinggi permukaan lereng kiri di x; lereng kanan memakai cerminnya. */
function permukaanKiri(x: number): number {
  if (x <= 60) return 118;
  if (x <= 340) return 118 + ((x - 60) / 280) * 144;
  return 262 + ((Math.min(x, ALUR.x0) - 340) / 30) * 8;
}
const permukaan = (cermin: boolean, x: number) => permukaanKiri(cermin ? LEBAR - x : x);
const cx = (cermin: boolean, x: number) => (cermin ? LEBAR - x : x);

/** Gradien linear vertikal dalam koordinat gambar. */
function gradien(id: string, y1: number, y2: number, warna: [number, string][]): SVGLinearGradientElement {
  const g = svg('linearGradient', { id, x1: 0, y1, x2: 0, y2, gradientUnits: 'userSpaceOnUse' });
  for (const [o, c] of warna) g.append(svg('stop', { offset: o, 'stop-color': c }));
  return g;
}

/** Pohon rindang berdiri di (x, y): batang dengan sisi teduh, tajuk bertumpuk, dan sorot cahaya. */
function pohon(x: number, y: number, s = 1): SVGGElement {
  const g = svg('g', { 'aria-hidden': 'true' });
  g.append(
    svg('ellipse', { cx: x + 4 * s, cy: y + 1, rx: 22 * s, ry: 4 * s, fill: '#1f3a1c', opacity: 0.25 }),
    svg('rect', { x: x - 5 * s, y: y - 42 * s, width: 10 * s, height: 44 * s, fill: '#7a4f2a' }),
    svg('rect', { x: x + 1 * s, y: y - 42 * s, width: 4 * s, height: 44 * s, fill: '#5e3b1f' }),
    svg('circle', { cx: x - 16 * s, cy: y - 40 * s, r: 16 * s, fill: '#2f7a48' }),
    svg('circle', { cx: x + 16 * s, cy: y - 42 * s, r: 16 * s, fill: '#276b3e' }),
    svg('circle', { cx: x, cy: y - 56 * s, r: 24 * s, fill: '#3c9a5f' }),
    svg('circle', { cx: x - 8 * s, cy: y - 64 * s, r: 12 * s, fill: '#5cb878' }),
    svg('circle', { cx: x - 18 * s, cy: y - 44 * s, r: 7 * s, fill: '#4fae6e' }),
  );
  return g;
}

/** Tunggul pohon yang sudah ditebang. */
function tunggul(x: number, y: number, s = 1): SVGGElement {
  const g = svg('g', { 'aria-hidden': 'true' });
  g.append(
    svg('rect', { x: x - 7 * s, y: y - 11 * s, width: 14 * s, height: 13 * s, fill: '#8a5f36', stroke: '#5e3b1f', 'stroke-width': 1.5 }),
    svg('ellipse', { cx: x, cy: y - 11 * s, rx: 7 * s, ry: 3 * s, fill: '#e2c08f', stroke: '#5e3b1f', 'stroke-width': 1.5 }),
    svg('ellipse', { cx: x, cy: y - 11 * s, rx: 3 * s, ry: 1.2 * s, fill: 'none', stroke: '#b08655', 'stroke-width': 1 }),
  );
  return g;
}

interface Butir {
  x: number;
  y: number;
  sisi: number;
  el: SVGCircleElement;
}

export function buatHutan(misi: Misi, siap: () => void): Aktivitas {
  const teks = misi.aktivitas;
  const label = (k: string, cadangan: string) => teks?.label?.[k] ?? cadangan;
  const akar = el('div', undefined, { class: 'aktivitas hutan' });

  const gambar = svg('svg', {
    viewBox: `0 0 ${LEBAR} ${TINGGI}`,
    role: 'img',
    'aria-label': `${label('gundul', 'Lereng gundul')} dan ${label('pohon', 'Lereng berpohon')}, dengan penampang tanah dan mata air di kakinya.`,
  });
  const defs = svg('defs');
  defs.append(
    gradien('ht-langit', -TINGGI, 270, [[0, '#4fa8d8'], [0.6, '#9fd6f0'], [1, '#e2f3f7']]),
    gradien('ht-jauh', 40, 270, [[0, '#9fc2d6'], [1, '#c9e0ea']]),
  );
  gambar.append(defs, svg('rect', { x: -LEBAR, y: -TINGGI, width: LEBAR * 3, height: TINGGI * 3, fill: 'url(#ht-langit)' }));
  // Punggung bukit jauh berhutan di belakang kedua lereng.
  gambar.append(svg('polygon', { points: '-800,270 -800,96 -420,70 -200,92 0,80 200,104 400,84 600,102 800,78 1000,96 1250,72 1600,90 1600,270', fill: 'url(#ht-jauh)' }));
  // Tajuk hutan jauh: deretan gumpalan dengan ukuran berbeda-beda, pudar karena jauh.
  const hutanJauh = svg('g', { fill: '#8fb5c8', 'aria-hidden': 'true' });
  for (let k = 0; k < 70; k++) {
    const x = -420 + k * 24 + ((k * 7) % 5) * 2;
    hutanJauh.append(svg('circle', { cx: x, cy: 104 - ((k * 5) % 7), r: 11 + ((k * 3) % 5) }));
  }
  gambar.append(hutanJauh);

  // Alur air di tengah, menuju sungai.
  const airAlur = svg('rect', { x: ALUR.x0, width: ALUR.x1 - ALUR.x0, fill: '#3d8fc4' });
  gambar.append(
    svg('rect', { x: ALUR.x0 - 2, y: 268, width: ALUR.x1 - ALUR.x0 + 4, height: TINGGI * 2, fill: '#5f6f78' }),
    svg('rect', { x: ALUR.x0, y: 268, width: ALUR.x1 - ALUR.x0, height: ALUR.dasar - 268, fill: '#cfe3ea' }),
    airAlur,
  );
  const labelSungai = svg('text', { x: 400, y: 258, 'text-anchor': 'middle', class: 'label-kecil', fill: '#1c2a33' }, `${label('sungai', 'ke sungai')} ↓`);
  // Arus di alur, tampil setelah sampahnya diangkat.
  const arusAlur = svg('path', { class: 'arus-alur', d: `M400,272 L400,${ALUR.dasar}`, opacity: 0 });

  const lapisButir = svg('g', { 'aria-hidden': 'true' });
  const bagian = SISI.map((s, i) => {
    const titik = [[-800, 118], [60, 118], [340, 262], [ALUR.x0, 270], [ALUR.x0, 760], [-800, 760]]
      .map(([x, y]) => `${cx(s.cermin, x)},${y}`)
      .join(' ');
    const klip = svg('clipPath', { id: `lereng-${s.kunci}` });
    klip.append(svg('polygon', { points: titik }));
    defs.append(klip);

    const g = svg('g', { class: `lereng lereng-${s.kunci}` });
    g.append(svg('polygon', { points: titik, fill: s.tanah }));
    // Penampang tanah berlapis: lapisan atas lebih gelap (berpohon) atau lebih kering (gundul), batu di dasar,
    // dan kerikil di dalam tanah. Semua terpotong bentuk lereng.
    const lapis = svg('g', { 'clip-path': `url(#lereng-${s.kunci})`, 'aria-hidden': 'true' });
    const garisAtas = titik.split(' ').slice(0, 4).join(' ');
    lapis.append(
      svg('polyline', { points: garisAtas, fill: 'none', stroke: s.cermin ? '#4a3524' : '#d0a877', 'stroke-width': 30, 'stroke-linejoin': 'round' }),
      svg('rect', { x: -LEBAR, y: 342, width: LEBAR * 3, height: TINGGI, fill: s.cermin ? '#5d5248' : '#8d7a66' }),
      svg('path', { d: `M-800,342 ${Array.from({ length: 50 }, (_, k) => `L${-800 + k * 50},${340 + ((k * 37) % 9)}`).join(' ')}`, fill: 'none', stroke: s.cermin ? '#463d35' : '#6f5f4f', 'stroke-width': 3 }),
    );
    for (let j = 0; j < 9; j++) {
      const x = cx(s.cermin, 30 + ((j * 97) % 330));
      lapis.append(svg('ellipse', { cx: x, cy: 352 + ((j * 13) % 22), rx: 9 + (j % 3) * 3, ry: 5, fill: s.cermin ? '#6f645a' : '#a39079', stroke: s.cermin ? '#463d35' : '#6f5f4f', 'stroke-width': 1.5 }));
    }
    for (let j = 0; j < 14; j++) {
      const x = cx(s.cermin, 20 + ((j * 71) % 340));
      lapis.append(svg('ellipse', { cx: x, cy: permukaan(s.cermin, x) + 30 + ((j * 41) % 60), rx: 3.5, ry: 2.5, fill: s.cermin ? '#8a7560' : '#9c7a52', opacity: 0.8 }));
    }
    g.append(lapis);
    // Air tanah: lapisan biru yang naik dari bawah, terpotong bentuk lereng.
    const airTanah = svg('rect', { class: 'air-tanah', x: -LEBAR, width: LEBAR * 3, y: TINGGI, height: TINGGI, 'clip-path': `url(#lereng-${s.kunci})` });
    g.append(airTanah);
    const garisPermukaan = svg('polyline', { points: titik.split(' ').slice(0, 4).join(' '), fill: 'none', stroke: s.cermin ? '#4f8f3a' : '#8a6a45', 'stroke-width': s.cermin ? 6 : 4 });
    g.append(garisPermukaan);

    if (s.cermin) {
      // Tanah berbutir dan pohon dengan bagian bawahnya.
      for (let j = 0; j < 26; j++) {
        const x = 470 + ((j * 53) % 320);
        const y = permukaan(true, x) + 18 + ((j * 29) % 90);
        g.append(svg('circle', { cx: x, cy: y, r: 2.5, fill: '#5b4330' }));
      }
      const bawahPohon = svg('g', { class: 'bawah-pohon' });
      for (const x of [500, 560, 620]) {
        const y = permukaan(true, x);
        for (const [dx, dy] of [[-26, 34], [-8, 52], [12, 46], [28, 30], [0, 66]]) {
          bawahPohon.append(svg('path', { class: 'akar', d: `M${x},${y} q ${dx / 2},${dy / 3} ${dx},${dy}` }));
        }
        g.append(pohon(x, y));
      }
      // Pohon di puncak lereng dan rumput di sepanjang permukaan.
      for (const [x, sk] of [[760, 0.8], [830, 0.9], [905, 0.75], [990, 0.85]] as const) g.append(pohon(x, permukaan(true, x), sk));
      for (const x of [452, 480, 530, 590, 650, 690, 720, 745, 800, 870, 950]) {
        const y = permukaan(true, x);
        g.append(svg('path', { d: `M${x - 4},${y} l 2,-7 M${x},${y} l 0,-9 M${x + 4},${y} l -2,-7`, stroke: '#3f7f3a', 'stroke-width': 1.8, 'stroke-linecap': 'round' }));
      }
      g.append(bawahPohon, svg('text', { class: 'label-sorot', x: 560, y: permukaan(true, 560) + 92, 'text-anchor': 'middle' }, label('bawahPohon', 'bagian bawah pohon')));
    } else {
      for (const x of [110, 170, 230, 290]) {
        const y = permukaan(false, x);
        g.append(svg('path', { d: `M${x},${y + 1} l6,7 l-3,6 l7,5`, stroke: '#7a5b3a', 'stroke-width': 2, fill: 'none' }));
      }
      // Tunggul pohon yang sudah ditebang: tanda lereng ini dulu juga berpohon. Tidak di tempat bibit (BIBIT_X).
      for (const [x, sk] of [[100, 1], [-60, 0.9], [-200, 1]] as const) g.append(tunggul(x, permukaan(false, x), sk));
      for (const [x, r] of [[80, 3], [200, 2.5], [318, 3], [-120, 3]] as const) {
        g.append(svg('ellipse', { cx: x, cy: permukaan(false, x) - 1, rx: r + 1, ry: r - 0.5, fill: '#a39079', stroke: '#6f5f4f', 'stroke-width': 1 }));
      }
    }

    // Aliran di permukaan lereng (garis putus-putus yang bergerak).
    const aliran = svg('path', {
      class: 'aliran',
      d: `M${cx(s.cermin, 70)},${permukaanKiri(70) - 4} L${cx(s.cermin, 340)},${permukaanKiri(340) - 4} L${cx(s.cermin, ALUR.x0 + 6)},${ALUR.dasar - 6}`,
      opacity: 0,
    });
    // Mata air di kaki lereng, mengalir ke alur.
    const mataAir = svg('path', {
      class: 'mata-air',
      d: `M${cx(s.cermin, 348)},${292} q ${s.cermin ? -14 : 14},2 ${s.cermin ? -26 : 26},${ALUR.dasar - 296}`,
      opacity: 0,
    });
    const labelLereng = svg('text', { x: cx(s.cermin, 90), y: 104, 'text-anchor': 'middle', class: 'label-kolam label-lereng' }, label(s.kunci, s.cermin ? 'Lereng berpohon' : 'Lereng gundul'));
    g.append(
      aliran,
      mataAir,
      svg('circle', { cx: cx(s.cermin, 348), cy: 292, r: 7, fill: '#5f6f78' }),
      svg('text', { x: cx(s.cermin, 340), y: 318, 'text-anchor': s.cermin ? 'start' : 'end', class: 'label-tanah' }, label('mataAir', 'mata air')),
      svg('text', { x: cx(s.cermin, 185), y: 368, 'text-anchor': 'middle', class: 'label-tanah' }, label('airTanah', 'air tanah')),
      labelLereng,
    );

    // Awan dan hujan di atas lereng ini (tampil saat disiram).
    const awan = svg('g', { class: 'awan-siram', opacity: 0 });
    const tengah = cx(s.cermin, 200);
    // Awan hujan: bagian bawah gelap, atas lebih terang.
    const gumpal = [[-60, 10, 26], [-25, -6, 34], [20, -4, 32], [58, 10, 24], [0, 14, 30]] as const;
    for (const [dx, dy, r] of gumpal) awan.append(svg('circle', { cx: tengah + dx, cy: 46 + dy, r, fill: '#7d909c' }));
    for (const [dx, dy, r] of gumpal) awan.append(svg('circle', { cx: tengah + dx, cy: 40 + dy, r: r - 3, fill: '#a9bac4' }));
    for (const [dx, dy, r] of [[-25, -12, 20], [20, -10, 18]] as const) awan.append(svg('circle', { cx: tengah + dx, cy: 40 + dy, r, fill: '#c6d3da' }));
    for (let j = 0; j < 12; j++) {
      const x = tengah - 80 + j * 15;
      const garis = svg('line', { class: 'garis-hujan', x1: x, y1: 70, x2: x - 4, y2: 84 });
      garis.style.animationDelay = `${(j % 4) * 0.12}s`;
      awan.append(garis);
    }
    gambar.append(g);
    return { ...s, i, g, airTanah, aliran, mataAir, awan, garisPermukaan, labelLereng };
  });

  // Langkah 2: tempat bibit di lereng gundul (lingkaran putus-putus sampai bibitnya ditanam).
  const lapisBibit = svg('g', { class: 'lapis-bibit', 'aria-hidden': 'true' });
  const tempatBibit = BIBIT_X.map((x) => {
    const t = svg('circle', { class: 'tempat-bibit', cx: x, cy: permukaan(false, x) - 10, r: 12 });
    t.style.display = 'none';
    lapisBibit.append(t);
    return t;
  });
  function bibit(x: number): SVGGElement {
    const y = permukaan(false, x);
    // Pohon muda: gaya sama dengan pohon di lereng berpohon, tapi kecil.
    const b = svg('g', { class: 'bibit' });
    b.append(pohon(x, y, 0.5));
    return b;
  }

  // Langkah 3: sampah yang menyumbat alur.
  const lapisSampah = svg('g', { class: 'lapis-sampah', 'aria-hidden': 'true' });
  lapisSampah.style.display = 'none';
  const sampah = SAMPAH.map((s) => {
    const g = svg('g', { class: 'sampah' });
    if (s.jenis === 'botol') {
      g.append(svg('rect', { x: s.x - 5, y: s.y - 12, width: 10, height: 22, rx: 3, fill: '#8fc7e0', stroke: '#2f5d73', 'stroke-width': 2, transform: `rotate(-28 ${s.x} ${s.y})` }));
    } else if (s.jenis === 'kantong') {
      g.append(svg('path', { d: `M${s.x - 12},${s.y + 8} q -2,-18 12,-20 q 14,2 12,20 z`, fill: '#ece7df', stroke: '#6b6258', 'stroke-width': 2 }));
    } else {
      g.append(svg('path', { d: `M${s.x - 14},${s.y + 6} L${s.x + 12},${s.y - 8} M${s.x},${s.y} l6,8`, fill: 'none', stroke: '#6b4a2b', 'stroke-width': 4, 'stroke-linecap': 'round' }));
    }
    lapisSampah.append(g);
    return g;
  });
  const labelSumbat = svg('text', { x: 400, y: 232, 'text-anchor': 'middle', class: 'label-tanah label-sumbat' }, label('tersumbat', 'tersumbat'));
  labelSumbat.style.display = 'none';

  gambar.append(lapisButir, lapisBibit, lapisSampah, arusAlur, labelSungai, labelSumbat, ...bagian.map((b) => b.awan));

  // Kendali.
  const kendali = el('div', undefined, { class: 'kendali' });
  const tombol = bagian.map((b) => {
    const t = el('button', label(b.cermin ? 'siramPohon' : 'siramGundul', b.cermin ? 'Siram lereng berpohon' : 'Siram lereng gundul'), { type: 'button', class: 'tombol-tahap' });
    t.addEventListener('click', () => siram(b.i));
    return t;
  });
  const tombolTanam = el('button', '', { type: 'button', class: 'tombol-tahap', hidden: '' });
  const tombolSampah = el('button', '', { type: 'button', class: 'tombol-tahap', hidden: '' });
  kendali.append(...tombol, tombolTanam, tombolSampah);
  const kabar = el('p', '', { class: 'kabar', 'aria-live': 'polite' });
  akar.append(el('p', teks?.arahan ?? '', { class: 'arahan' }), gambar, kendali, kabar);

  // Keadaan.
  let tahap: 'banding' | 'tanam' | 'sumbat' | 'mengalir' = 'banding';
  let ditanam = 0;
  let diangkat = 0;
  let sejakMengalir = 0;
  const masukTanah: number[] = SISI.map((s) => s.masukTanah);
  const keluarMataAir: number[] = SISI.map((s) => s.keluarMataAir);
  const hujan = [0, 0];
  const airTanah = [0, 0];
  const aliranPermukaan = [0, 0];
  const pernahDisiram = [false, false];
  let airDiAlur = 0;
  let sejakBerhenti = 0;
  let sudahSiap = false;
  let raf = 0;
  let lalu = performance.now();
  const butir: Butir[] = [];
  const tampung = [0, 0];

  function siram(i: number): void {
    if (hujan[i] > 0) return;
    hujan[i] = LAMA_HUJAN;
    pernahDisiram[i] = true;
    tombol[i].disabled = true;
  }

  const hitung = (teksTombol: string, n: number) => `${teksTombol} (${n}/3)`;

  function mulaiTanam(): void {
    tahap = 'tanam';
    if (teks?.tanam) kabar.textContent = teks.tanam;
    for (const t of tempatBibit) t.style.display = '';
    tombolTanam.textContent = hitung(label('tanamBibit', 'Tanam bibit'), 0);
    tombolTanam.hidden = false;
    tombolTanam.focus();
  }

  tombolTanam.addEventListener('click', () => {
    if (tahap !== 'tanam' || ditanam >= BIBIT_X.length) return;
    tempatBibit[ditanam].style.display = 'none';
    lapisBibit.append(bibit(BIBIT_X[ditanam]));
    ditanam++;
    tombolTanam.textContent = hitung(label('tanamBibit', 'Tanam bibit'), ditanam);
    if (ditanam < BIBIT_X.length) return;
    // Lereng yang baru ditanami menahan lebih banyak air kalau disiram lagi (belum sebanyak hutan yang sudah lama).
    masukTanah[0] = 0.55;
    keluarMataAir[0] = 0.12;
    bagian[0].garisPermukaan.setAttribute('stroke', '#6f9a3e');
    bagian[0].labelLereng.textContent = label('ditanami', 'Lereng baru ditanami');
    tombolTanam.hidden = true;
    mulaiSumbat();
  });

  function mulaiSumbat(): void {
    tahap = 'sumbat';
    if (teks?.sumbat) kabar.textContent = teks.sumbat;
    lapisSampah.style.display = '';
    labelSumbat.style.display = '';
    tombolSampah.textContent = hitung(label('angkatSampah', 'Angkat sampah'), 0);
    tombolSampah.hidden = false;
    tombolSampah.focus();
  }

  tombolSampah.addEventListener('click', () => {
    if (tahap !== 'sumbat' || diangkat >= sampah.length) return;
    const s = sampah[diangkat];
    s.classList.add('diangkat');
    setTimeout(() => s.remove(), 450);
    diangkat++;
    tombolSampah.textContent = hitung(label('angkatSampah', 'Angkat sampah'), diangkat);
    if (diangkat < sampah.length) return;
    tahap = 'mengalir';
    tombolSampah.hidden = true;
    labelSumbat.style.display = 'none';
    arusAlur.setAttribute('opacity', '1');
    airDiAlur = 1;
  });

  function langkah(kini: number): void {
    const dt = Math.min(0.05, (kini - lalu) / 1000);
    lalu = kini;
    for (const b of bagian) {
      const i = b.i;
      const sedangHujan = hujan[i] > 0;
      if (sedangHujan) {
        hujan[i] = Math.max(0, hujan[i] - dt);
        airTanah[i] = Math.min(1, airTanah[i] + LAJU_HUJAN * masukTanah[i] * dt);
        aliranPermukaan[i] = LAJU_HUJAN * (1 - masukTanah[i]) * 4;
        airDiAlur += LAJU_HUJAN * (1 - masukTanah[i]) * dt * 3;
        // Butir air yang masuk ke tanah, sebanyak bagian yang masuk.
        tampung[i] += dt * 14 * masukTanah[i];
        while (tampung[i] >= 1) {
          tampung[i]--;
          const x = cx(b.cermin, 70 + Math.random() * 270);
          const e = svg('circle', { class: 'butir-air', r: 2.6, cx: x, cy: permukaan(b.cermin, x) });
          lapisButir.append(e);
          butir.push({ x, y: permukaan(b.cermin, x) + 2, sisi: i, el: e });
        }
        if (hujan[i] === 0) tombol[i].disabled = false;
      } else {
        aliranPermukaan[i] = Math.max(0, aliranPermukaan[i] - dt * 1.5);
      }
      // Air tanah keluar pelan-pelan lewat mata air (lereng gundul jauh lebih cepat habis).
      const keluar = airTanah[i] * keluarMataAir[i] * dt;
      airTanah[i] -= keluar;
      airDiAlur += keluar * 2;

      b.airTanah.setAttribute('y', (TINGGI - airTanah[i] * TINGGI_AIR_TANAH).toFixed(1));
      b.aliran.setAttribute('opacity', Math.min(1, aliranPermukaan[i]).toFixed(2));
      b.mataAir.setAttribute('opacity', airTanah[i] > 0.03 ? Math.min(1, 0.3 + airTanah[i] * 2).toFixed(2) : '0');
      b.mataAir.setAttribute('stroke-width', (2 + Math.min(4, airTanah[i] * 8)).toFixed(1));
      b.awan.setAttribute('opacity', sedangHujan ? '1' : '0');
    }
    for (let k = butir.length - 1; k >= 0; k--) {
      const t = butir[k];
      t.y += 45 * dt;
      const batas = TINGGI - airTanah[t.sisi] * TINGGI_AIR_TANAH;
      if (t.y >= batas || t.y > permukaan(bagian[t.sisi].cermin, t.x) + 120) {
        t.el.remove();
        butir.splice(k, 1);
      } else {
        t.el.setAttribute('cy', t.y.toFixed(1));
      }
    }
    // Selama alur tersumbat, air tertahan di belakang sampah; sesudah dibuka, air mengalir pergi ke sungai.
    airDiAlur = tahap === 'sumbat' ? Math.max(0.55, Math.min(1, airDiAlur)) : Math.max(0, Math.min(1, airDiAlur - dt * 0.35));
    const yAlur = ALUR.dasar - airDiAlur * 40;
    airAlur.setAttribute('y', yAlur.toFixed(1));
    airAlur.setAttribute('height', (ALUR.dasar - yAlur).toFixed(1));

    const semuaBerhenti = hujan.every((h) => h === 0);
    sejakBerhenti = semuaBerhenti ? sejakBerhenti + dt : 0;
    if (tahap === 'banding' && pernahDisiram.every(Boolean) && semuaBerhenti && sejakBerhenti >= JEDA_SIAP) mulaiTanam();
    if (tahap === 'mengalir') sejakMengalir += dt;
    if (!sudahSiap && tahap === 'mengalir' && sejakMengalir >= 1.5) {
      sudahSiap = true;
      kabar.textContent = teks?.siap ?? '';
      siap();
    }
    raf = requestAnimationFrame(langkah);
  }

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
