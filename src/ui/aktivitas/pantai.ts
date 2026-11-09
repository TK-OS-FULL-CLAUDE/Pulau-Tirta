/**
 * Misi 1 · Pantai Biru (penguapan).
 * Anak menggeser cermin supaya sinar matahari jatuh ke salah satu dari dua kolam air laut berdasar batu.
 * Air kolam yang kena sinar turun lebih jauh dari garis awal; helai tipis di atasnya lebih banyak.
 *
 * Aturan sains: helai digambar tipis dari permukaan air, tidak pernah seperti asap, dan tidak diberi label
 * sebelum anak menjawab (kata "uap" dilarang di petunjuk tingkat 1–2). Penjelasan bahwa uap air tidak
 * terlihat muncul di layar pulih (`aktivitas.catatanSesudah`) dan di petunjuk tingkat 3.
 */
import type { Misi, Tingkat } from '../../../shared/content';
import { el, svg } from '../dom';
import type { Aktivitas } from './tipe';

const LEBAR = 800;
const TINGGI = 380;
const TANAH_Y = 232;
const BIBIR_Y = 244;
const DASAR_Y = 340;
const TINGGI_AIR = 90;

const LEVEL_AWAL = 0.85;
const LEVEL_MIN = 0.2;
/** Laju turun per detik. Kolam teduh tetap turun pelan: air tetap menguap tanpa sinar langsung, hanya lebih lambat. */
const LAJU_TERANG = 0.035;
const LAJU_TEDUH = 0.003;
/** Selisih garis air yang dianggap "sudah terlihat bedanya" (sekitar 6 detik disinari). */
const SELISIH_SIAP = 0.2;

const SURYA = { x: 70, y: 70 };
const CERMIN = { x: 400, y: 70 };
/** Rentang titik jatuh sinar di tanah, dari slider 0–100. */
const SINAR_MIN_X = 110;
const SINAR_MAKS_X = 690;
const KOLAM = [
  { nama: 'Kolam 1', x: 150, w: 180 },
  { nama: 'Kolam 2', x: 470, w: 180 },
];

const yAir = (level: number) => DASAR_Y - level * TINGGI_AIR;
const keX = (v: number) => SINAR_MIN_X + (v / 100) * (SINAR_MAKS_X - SINAR_MIN_X);
const keNilai = (x: number) => Math.round(Math.min(100, Math.max(0, ((x - SINAR_MIN_X) / (SINAR_MAKS_X - SINAR_MIN_X)) * 100)));

export function buatPantai(misi: Misi, siap: () => void): Aktivitas {
  const teks = misi.aktivitas;
  const akar = el('div', undefined, { class: 'aktivitas pantai' });

  const gambar = svg('svg', {
    viewBox: `0 0 ${LEBAR} ${TINGGI}`,
    role: 'img',
    'aria-label': 'Pantai dengan matahari, cermin, dan dua kolam air laut berdasar batu',
  });

  // Langit, pasir, matahari. Latar dibuat lebih lebar dari viewBox supaya penuh di layar lebar.
  gambar.append(
    svg('rect', { x: -LEBAR, y: -TINGGI, width: LEBAR * 3, height: TINGGI + TANAH_Y, fill: '#bfe6f5' }),
    svg('rect', { x: -LEBAR, y: TANAH_Y, width: LEBAR * 3, height: TINGGI * 2, fill: '#f2e3b3' }),
  );
  const matahari = svg('g', { 'aria-hidden': 'true' });
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    matahari.append(
      svg('line', {
        x1: SURYA.x + Math.cos(a) * 50,
        y1: SURYA.y + Math.sin(a) * 50,
        x2: SURYA.x + Math.cos(a) * 62,
        y2: SURYA.y + Math.sin(a) * 62,
        stroke: '#f5b301',
        'stroke-width': 5,
        'stroke-linecap': 'round',
      }),
    );
  }
  matahari.append(svg('circle', { cx: SURYA.x, cy: SURYA.y, r: 40, fill: '#ffd23f', stroke: '#f5b301', 'stroke-width': 4 }));
  gambar.append(matahari);

  // Kolam: dinding batu, ruang kosong, air, kilau sinar, garis ukur, garis awal, dasar batu, helai.
  const kolam = KOLAM.map((k, i) => {
    const g = svg('g', { class: 'kolam' });
    g.append(
      svg('rect', { x: k.x - 12, y: BIBIR_Y - 8, width: k.w + 24, height: DASAR_Y - BIBIR_Y + 30, rx: 10, fill: '#8f9aa0', stroke: '#5b6b75', 'stroke-width': 3 }),
      svg('rect', { x: k.x, y: BIBIR_Y, width: k.w, height: DASAR_Y - BIBIR_Y, fill: '#d5dee2' }),
    );
    const air = svg('rect', { x: k.x, width: k.w, fill: '#2f8fb5' });
    const kilau = svg('rect', { class: 'kilau', x: k.x, width: k.w, fill: '#fff8d6' });
    g.append(air, kilau);
    for (let j = 1; j <= 6; j++) {
      const y = DASAR_Y - j * 15;
      g.append(svg('line', { x1: k.x, x2: k.x + 14, y1: y, y2: y, stroke: '#1c2a33', 'stroke-width': 2, opacity: 0.45 }));
    }
    const yAwal = yAir(LEVEL_AWAL);
    g.append(svg('line', { x1: k.x - 4, x2: k.x + k.w + 4, y1: yAwal, y2: yAwal, stroke: '#d9534f', 'stroke-width': 3, 'stroke-dasharray': '8 6' }));
    g.append(
      svg(
        'text',
        { x: i === 0 ? k.x - 18 : k.x + k.w + 18, y: yAwal + 5, 'text-anchor': i === 0 ? 'end' : 'start', class: 'label-kecil', fill: '#b03a36' },
        'garis awal',
      ),
    );

    const dasar = svg('g', { class: 'dasar' });
    dasar.append(svg('rect', { class: 'batas', x: k.x, y: DASAR_Y, width: k.w, height: 14, fill: '#6f7b81', stroke: '#4a555b', 'stroke-width': 2 }));
    for (let j = 0; j < 8; j++) {
      dasar.append(svg('ellipse', { cx: k.x + 12 + j * 22.5, cy: DASAR_Y + 7, rx: 10, ry: 5, fill: '#a9b3b7', stroke: '#4a555b', 'stroke-width': 1.5 }));
    }
    dasar.append(svg('text', { class: 'label-sorot', x: k.x + k.w / 2, y: DASAR_Y + 38, 'text-anchor': 'middle' }, 'dasar batu'));
    g.append(dasar);

    const helai = svg('g', { class: 'helai', 'aria-hidden': 'true' });
    for (let j = 0; j < 4; j++) {
      const p = svg('path', { d: `M${k.x + k.w * (0.2 + 0.2 * j)},0 c -7,-8 7,-16 0,-24 c -7,-8 7,-16 0,-24` });
      p.style.animationDelay = `${j * 0.6}s`;
      helai.append(p);
    }
    g.append(helai);
    gambar.append(g);
    return { ...k, g, air, kilau, helai };
  });

  // Sinar dan cermin (di atas kolam supaya terlihat jatuh ke air).
  const sinarMasuk = svg('polygon', {
    class: 'sinar',
    points: `${SURYA.x + 40},${SURYA.y - 9} ${CERMIN.x},${CERMIN.y - 5} ${CERMIN.x},${CERMIN.y + 5} ${SURYA.x + 40},${SURYA.y + 9}`,
  });
  const sinarPantul = svg('polygon', { class: 'sinar' });
  const tiang = svg('line', { x1: CERMIN.x, y1: CERMIN.y, x2: CERMIN.x, y2: TANAH_Y + 6, stroke: '#8a6d3b', 'stroke-width': 6, 'stroke-linecap': 'round' });
  const cermin = svg('g', { class: 'cermin' });
  cermin.append(
    svg('rect', { x: -40, y: -7, width: 80, height: 14, rx: 4, fill: '#e8f8ff', stroke: '#5b6b75', 'stroke-width': 3 }),
    svg('line', { x1: -28, y1: -2, x2: -8, y2: -2, stroke: '#ffffff', 'stroke-width': 3, 'stroke-linecap': 'round' }),
  );
  gambar.append(
    tiang,
    sinarMasuk,
    sinarPantul,
    cermin,
    svg('text', { x: CERMIN.x + 56, y: CERMIN.y - 26, class: 'label-kolam' }, 'Cermin'),
    // Nama kolam di atas lapisan sinar supaya tetap terbaca.
    ...KOLAM.map((k) => svg('text', { x: k.x + k.w / 2, y: TANAH_Y - 8, 'text-anchor': 'middle', class: 'label-kolam' }, k.nama)),
  );

  // Kendali.
  const kendali = el('div', undefined, { class: 'kendali' });
  const slider = el('input', undefined, {
    id: 'arah-cermin',
    type: 'range',
    min: '0',
    max: '100',
    step: '1',
    value: '50',
  });
  const isiUlang = el('button', 'Isi ulang kolam', { type: 'button', class: 'tombol-kecil' });
  kendali.append(el('label', 'Arah cermin', { for: 'arah-cermin' }), slider, isiUlang);

  const kabar = el('p', '', { class: 'kabar', 'aria-live': 'polite' });
  akar.append(el('p', teks?.arahan ?? '', { class: 'arahan' }), gambar, kendali, kabar);

  // Keadaan.
  let level = [LEVEL_AWAL, LEVEL_AWAL];
  let terang: number | null = null;
  let sinarX = keX(50);
  let sudahSiap = false;
  let raf = 0;
  let lalu = performance.now();

  function arahkan(v: number): void {
    sinarX = keX(v);
    const idx = kolam.findIndex((k) => sinarX >= k.x && sinarX <= k.x + k.w);
    terang = idx >= 0 ? idx : null;
    kolam.forEach((k, i) => k.g.toggleAttribute('data-terang', i === terang));
    slider.setAttribute('aria-valuetext', terang === null ? 'sinar jatuh ke pasir' : `sinar jatuh ke ${kolam[terang].nama}`);
  }

  function gambarUlang(): void {
    kolam.forEach((k, i) => {
      const y = yAir(level[i]);
      for (const r of [k.air, k.kilau]) {
        r.setAttribute('y', String(y));
        r.setAttribute('height', String(DASAR_Y - y));
      }
      k.helai.setAttribute('transform', `translate(0 ${y})`);
    });
    // Sinar pantul berakhir di permukaan air kalau kena kolam, atau di pasir.
    const ujungY = terang === null ? TANAH_Y + 4 : yAir(level[terang]);
    sinarPantul.setAttribute(
      'points',
      `${CERMIN.x - 6},${CERMIN.y} ${CERMIN.x + 6},${CERMIN.y} ${sinarX + 26},${ujungY} ${sinarX - 26},${ujungY}`,
    );
    // Normal cermin membagi dua arah sinar datang dan sinar pantul.
    const masuk = { x: CERMIN.x - SURYA.x, y: CERMIN.y - SURYA.y };
    const keluar = { x: sinarX - CERMIN.x, y: ujungY - CERMIN.y };
    const pm = Math.hypot(masuk.x, masuk.y);
    const pk = Math.hypot(keluar.x, keluar.y);
    const n = { x: keluar.x / pk - masuk.x / pm, y: keluar.y / pk - masuk.y / pm };
    const sudut = (Math.atan2(n.y, n.x) * 180) / Math.PI + 90;
    cermin.setAttribute('transform', `translate(${CERMIN.x} ${CERMIN.y}) rotate(${sudut.toFixed(1)})`);
  }

  function langkah(kini: number): void {
    const dt = Math.min(0.1, (kini - lalu) / 1000);
    lalu = kini;
    level = level.map((l, i) => Math.max(LEVEL_MIN, l - (i === terang ? LAJU_TERANG : LAJU_TEDUH) * dt));
    gambarUlang();
    if (!sudahSiap && Math.abs(level[0] - level[1]) >= SELISIH_SIAP) {
      sudahSiap = true;
      kabar.textContent = teks?.siap ?? '';
      siap();
    }
    raf = requestAnimationFrame(langkah);
  }

  slider.addEventListener('input', () => arahkan(Number(slider.value)));
  isiUlang.addEventListener('click', () => {
    level = [LEVEL_AWAL, LEVEL_AWAL];
  });

  // Anak juga bisa menekan atau menyeret langsung di gambar ke arah kolam.
  const arahDariPointer = (e: PointerEvent) => {
    const m = gambar.getScreenCTM();
    if (!m) return;
    const titik = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    slider.value = String(keNilai(titik.x));
    arahkan(Number(slider.value));
  };
  gambar.addEventListener('pointerdown', (e) => {
    gambar.setPointerCapture(e.pointerId);
    arahDariPointer(e);
  });
  gambar.addEventListener('pointermove', (e) => {
    if (gambar.hasPointerCapture(e.pointerId)) arahDariPointer(e);
  });

  arahkan(50);
  gambarUlang();
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
