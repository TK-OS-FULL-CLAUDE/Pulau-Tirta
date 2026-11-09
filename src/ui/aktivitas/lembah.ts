/**
 * Misi 3 · Lembah Hujan (presipitasi).
 * Awan di atas lembah ditampilkan dari dekat: isinya titik-titik air kecil yang ukurannya sama dan tidak jatuh.
 * Anak menggerakkan angin di dalam awan (slider, atau menyeret di dalam awan). Titik air bergerak, saling
 * bertemu, dan menyatu jadi lebih besar. Yang sudah cukup besar jatuh sebagai hujan ke sawah yang kering.
 *
 * Bukti yang membantah pilihan keliru ada di layar: awan tidak pecah, tidak turun, dan tidak menyentuh gunung.
 * Kata "bergabung" dan "berat" dilarang di petunjuk tingkat 1, jadi teks aktivitas tidak memakainya.
 * Ukuran titik air sengaja dibesarkan; penjelasannya ada di layar pulih (`catatanSesudah`).
 */
import type { Misi, Tingkat } from '../../../shared/content';
import { el, svg } from '../dom';
import type { Aktivitas } from './tipe';

const LEBAR = 800;
const TINGGI = 380;
const LEMBAH_Y = 300;
const TANAH_HUJAN = 316;
const SAWAH = { x0: 175, x1: 625 };
/** Ruang titik air di dalam awan (elips). */
const AWAN = { x: 400, y: 108, a: 168, b: 58 };

const JUMLAH_AWAL = 54;
const MIN_KECIL = 44;
const R_AWAL = 3.4;
/** Titik air yang sudah sebesar ini disorot di tingkat 2. */
const R_BESAR = 5;
/** Titik air sebesar ini (≈ 6 titik kecil menyatu) jatuh sebagai hujan. */
const R_JATUH = 6.2;
const GRAVITASI = 260;
const LAJU_JATUH_MAKS = 240;
const HUJAN_SIAP = 4;
const HUJAN_PENUH = 10;

interface Tetes {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  jatuh: boolean;
  el: SVGEllipseElement;
}

function dalamAwan(x: number, y: number): number {
  return ((x - AWAN.x) / AWAN.a) ** 2 + ((y - AWAN.y) / AWAN.b) ** 2;
}

function campur(a: string, b: string, t: number): string {
  const ha = a.match(/\w\w/g)!.map((h) => parseInt(h, 16));
  const hb = b.match(/\w\w/g)!.map((h) => parseInt(h, 16));
  return `#${ha.map((v, i) => Math.round(v + (hb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

export function buatLembah(misi: Misi, siap: () => void): Aktivitas {
  const teks = misi.aktivitas;
  const akar = el('div', undefined, { class: 'aktivitas lembah' });

  const gambar = svg('svg', {
    viewBox: `0 0 ${LEBAR} ${TINGGI}`,
    role: 'img',
    'aria-label': 'Awan di atas lembah, dilihat dari dekat, berisi titik-titik air kecil. Di bawahnya sawah kering di antara dua bukit.',
  });

  // Langit, matahari, bukit kiri dan kanan, sawah.
  gambar.append(
    svg('rect', { x: -LEBAR, y: -TINGGI, width: LEBAR * 3, height: TINGGI * 3, fill: '#bfe6f5' }),
    svg('circle', { cx: 742, cy: 46, r: 26, fill: '#ffd23f', stroke: '#f5b301', 'stroke-width': 4 }),
    svg('polygon', { points: `-800,${TINGGI * 2} -800,150 40,150 90,170 150,240 ${SAWAH.x0},${LEMBAH_Y} ${SAWAH.x0},${TINGGI * 2}`, fill: '#8fbf7a', stroke: '#5e8f4c', 'stroke-width': 3 }),
    svg('polygon', { points: `${SAWAH.x1},${TINGGI * 2} ${SAWAH.x1},${LEMBAH_Y} 650,240 705,165 760,145 1600,145 1600,${TINGGI * 2}`, fill: '#8fbf7a', stroke: '#5e8f4c', 'stroke-width': 3 }),
  );
  const sawah = svg('rect', { x: SAWAH.x0, y: LEMBAH_Y, width: SAWAH.x1 - SAWAH.x0, height: TINGGI * 2, fill: '#c9a274' });
  const retakan = svg('g', { stroke: '#8a6a45', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' });
  for (const [x, y] of [[215, 322], [300, 344], [372, 318], [455, 340], [540, 324], [258, 362], [500, 366], [590, 352]]) {
    retakan.append(svg('path', { d: `M${x},${y} l8,6 l-4,7 l9,5 M${x + 8},${y + 6} l10,-3` }));
  }
  const genangan = [svg('ellipse', { cx: 290, cy: 352, rx: 0, ry: 0, fill: '#4aa3cf' }), svg('ellipse', { cx: 505, cy: 334, rx: 0, ry: 0, fill: '#4aa3cf' })];
  const tunas = svg('g', { stroke: '#3c9a5f', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0 });
  for (let x = 205; x < 600; x += 34) {
    for (const [baris, y] of [[0, 330], [1, 358]]) {
      const tx = x + baris * 17;
      tunas.append(svg('path', { d: `M${tx},${y} l-4,-9 M${tx},${y} l4,-10` }));
    }
  }
  gambar.append(sawah, retakan, ...genangan, tunas, svg('text', { x: 400, y: 374, 'text-anchor': 'middle', class: 'label-kolam' }, 'Sawah'));

  // Awan dilihat dari dekat.
  const awan = svg('g', { class: 'awan-besar' });
  for (const [dx, dy, r] of [
    [-150, 18, 52],
    [-95, -18, 66],
    [-20, -36, 72],
    [60, -26, 70],
    [130, -4, 60],
    [165, 26, 42],
    [0, 26, 80],
    [-60, 30, 60],
    [90, 30, 58],
  ]) {
    awan.append(svg('circle', { cx: AWAN.x + dx, cy: AWAN.y + dy, r, fill: '#ffffff' }));
  }
  gambar.append(awan, svg('text', { x: AWAN.x, y: 24, 'text-anchor': 'middle', class: 'label-kecil', fill: '#4a5b66' }, 'awan dilihat dari dekat'));

  const lapisCincin = svg('g', { 'aria-hidden': 'true' });
  const lapisTetes = svg('g', { 'aria-hidden': 'true' });
  gambar.append(lapisCincin, lapisTetes);

  // Kendali.
  const kendali = el('div', undefined, { class: 'kendali' });
  const slider = el('input', undefined, { id: 'angin-awan', type: 'range', min: '0', max: '100', step: '1', value: '0' });
  kendali.append(
    el('label', 'Angin di dalam awan', { for: 'angin-awan' }),
    el('span', 'tenang', { class: 'ujung', 'aria-hidden': 'true' }),
    slider,
    el('span', 'kencang', { class: 'ujung', 'aria-hidden': 'true' }),
  );
  const kabar = el('p', '', { class: 'kabar', 'aria-live': 'polite' });
  akar.append(el('p', teks?.arahan ?? '', { class: 'arahan' }), gambar, kendali, kabar);

  // Keadaan.
  const tetes: Tetes[] = [];
  let angin = 0;
  let dorongan = 0;
  let hujan = 0;
  let sudahSiap = false;
  let raf = 0;
  let lalu = performance.now();
  let tambahan = 0;

  function lahirkan(): Tetes {
    let x = 0;
    let y = 0;
    do {
      x = AWAN.x + (Math.random() * 2 - 1) * AWAN.a;
      y = AWAN.y + (Math.random() * 2 - 1) * AWAN.b;
    } while (dalamAwan(x, y) > 0.9);
    const e = svg('ellipse', { class: 'tetes-awan', rx: R_AWAL, ry: R_AWAL });
    lapisTetes.append(e);
    const t: Tetes = { x, y, vx: 0, vy: 0, r: R_AWAL, jatuh: false, el: e };
    tetes.push(t);
    return t;
  }
  for (let i = 0; i < JUMLAH_AWAL; i++) lahirkan();

  function sekali(kelas: string, attrs: Record<string, string | number>, lapis: SVGGElement, ms: number): void {
    const e = svg('circle', { class: kelas, ...attrs });
    lapis.append(e);
    setTimeout(() => e.remove(), ms);
  }

  function aturAngin(v: number): void {
    angin = Math.max(0, Math.min(100, v)) / 100;
    slider.setAttribute('aria-valuetext', angin < 0.15 ? 'angin tenang' : angin < 0.6 ? 'angin sedang' : 'angin kencang');
  }

  function basahi(): void {
    hujan++;
    const w = Math.min(1, hujan / HUJAN_PENUH);
    sawah.setAttribute('fill', campur('#c9a274', '#7d5b3a', w));
    retakan.setAttribute('opacity', String(1 - w));
    genangan.forEach((g, i) => {
      g.setAttribute('rx', String(w * (34 - i * 6)));
      g.setAttribute('ry', String(w * (8 - i)));
    });
    tunas.setAttribute('opacity', String(Math.max(0, (w - 0.45) / 0.55)));
    if (!sudahSiap && hujan >= HUJAN_SIAP) {
      sudahSiap = true;
      kabar.textContent = teks?.siap ?? '';
      siap();
    }
  }

  function langkah(kini: number): void {
    const dt = Math.min(0.05, (kini - lalu) / 1000);
    lalu = kini;
    dorongan = Math.max(0, dorongan - dt * 1.5);
    const aduk = Math.max(angin, dorongan);
    const dorong = 30 + 220 * aduk;
    const lajuMaks = 8 + 80 * aduk;

    for (const t of tetes) {
      if (t.jatuh) {
        t.vy = Math.min(LAJU_JATUH_MAKS, t.vy + GRAVITASI * dt);
        t.x += t.vx * dt;
        t.y += t.vy * dt;
        continue;
      }
      t.vx += (Math.random() * 2 - 1) * dorong * dt;
      t.vy += (Math.random() * 2 - 1) * dorong * dt;
      t.vx *= 1 - 1.2 * dt;
      t.vy *= 1 - 1.2 * dt;
      const laju = Math.hypot(t.vx, t.vy);
      if (laju > lajuMaks) {
        t.vx *= lajuMaks / laju;
        t.vy *= lajuMaks / laju;
      }
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      // Tetap di dalam awan: pantulkan kembali ke tengah.
      if (dalamAwan(t.x, t.y) > 0.92) {
        const nx = (t.x - AWAN.x) / AWAN.a ** 2;
        const ny = (t.y - AWAN.y) / AWAN.b ** 2;
        const n = Math.hypot(nx, ny) || 1;
        const dot = (t.vx * nx + t.vy * ny) / n;
        if (dot > 0) {
          t.vx -= (2 * dot * nx) / n;
          t.vy -= (2 * dot * ny) / n;
        }
        t.x -= (nx / n) * 1.5;
        t.y -= (ny / n) * 1.5;
      }
    }

    // Titik air yang bertemu: menyatu kalau ada angin; kalau tenang, hanya bersinggungan.
    const peluang = Math.min(1, aduk * 1.2);
    for (let i = 0; i < tetes.length; i++) {
      const a = tetes[i];
      if (a.jatuh) continue;
      for (let j = i + 1; j < tetes.length; j++) {
        const b = tetes[j];
        if (b.jatuh) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const jarak = Math.hypot(dx, dy);
        if (jarak >= a.r + b.r) continue;
        if (Math.random() < peluang) {
          const va = a.r ** 3;
          const vb = b.r ** 3;
          a.x = (a.x * va + b.x * vb) / (va + vb);
          a.y = (a.y * va + b.y * vb) / (va + vb);
          a.vx = (a.vx * va + b.vx * vb) / (va + vb);
          a.vy = (a.vy * va + b.vy * vb) / (va + vb);
          a.r = Math.cbrt(va + vb);
          b.el.remove();
          tetes.splice(j, 1);
          j--;
          sekali('cincin', { cx: a.x.toFixed(1), cy: a.y.toFixed(1), r: a.r + 3 }, lapisCincin, 500);
          if (a.r >= R_BESAR) a.el.classList.add('besar');
          if (a.r >= R_JATUH) {
            a.jatuh = true;
            a.el.classList.add('hujan');
            a.vx *= 0.15;
            a.vy = 20;
            break;
          }
        } else {
          // Bersinggungan saja: dorong menjauh.
          const n = jarak || 1;
          const tumpang = (a.r + b.r - jarak) / 2;
          a.x -= (dx / n) * tumpang;
          a.y -= (dy / n) * tumpang;
          b.x += (dx / n) * tumpang;
          b.y += (dy / n) * tumpang;
        }
      }
    }

    // Hujan yang sampai ke tanah membasahi sawah.
    for (let i = tetes.length - 1; i >= 0; i--) {
      const t = tetes[i];
      if (t.jatuh && t.y >= TANAH_HUJAN) {
        t.el.remove();
        tetes.splice(i, 1);
        if (t.x > SAWAH.x0 && t.x < SAWAH.x1) {
          sekali('cipratan', { cx: t.x.toFixed(1), cy: TANAH_HUJAN, r: 9 }, lapisCincin, 500);
          basahi();
        }
      }
    }

    // Awan terus terisi titik air kecil baru, pelan-pelan.
    const kecil = tetes.filter((t) => !t.jatuh).length;
    if (kecil < MIN_KECIL) {
      tambahan += dt * 8;
      while (tambahan >= 1) {
        tambahan--;
        lahirkan().el.classList.add('baru');
      }
    }

    for (const t of tetes) {
      t.el.setAttribute('cx', t.x.toFixed(1));
      t.el.setAttribute('cy', t.y.toFixed(1));
      t.el.setAttribute('rx', (t.jatuh ? t.r * 0.8 : t.r).toFixed(2));
      t.el.setAttribute('ry', (t.jatuh ? t.r * 1.25 : t.r).toFixed(2));
    }
    raf = requestAnimationFrame(langkah);
  }

  slider.addEventListener('input', () => aturAngin(Number(slider.value)));

  // Menyeret di dalam awan mengaduk angin di sekitar jari atau mouse.
  let terakhir: { x: number; y: number } | null = null;
  const titikDari = (e: PointerEvent) => {
    const m = gambar.getScreenCTM();
    return m ? new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()) : null;
  };
  gambar.addEventListener('pointerdown', (e) => {
    gambar.setPointerCapture(e.pointerId);
    const p = titikDari(e);
    terakhir = p ? { x: p.x, y: p.y } : null;
  });
  gambar.addEventListener('pointermove', (e) => {
    if (!gambar.hasPointerCapture(e.pointerId)) return;
    const p = titikDari(e);
    if (!p || !terakhir) return;
    const dx = p.x - terakhir.x;
    const dy = p.y - terakhir.y;
    terakhir = { x: p.x, y: p.y };
    if (dalamAwan(p.x, p.y) > 1.3) return;
    dorongan = Math.min(1, dorongan + Math.hypot(dx, dy) / 120);
    for (const t of tetes) {
      if (t.jatuh) continue;
      const d = Math.hypot(t.x - p.x, t.y - p.y);
      if (d < 80) {
        const f = (1 - d / 80) * 4;
        t.vx += dx * f;
        t.vy += dy * f;
      }
    }
  });
  gambar.addEventListener('pointerup', () => (terakhir = null));

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
