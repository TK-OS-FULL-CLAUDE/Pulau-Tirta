/**
 * Misi 4 · Hutan & Sungai (peresapan dan aliran). Versi sederhana: satu mekanik.
 * Anak menyiram lereng gundul dan lereng berpohon dengan hujan yang sama banyak. Gambar penampang tanah
 * menunjukkan ke mana airnya pergi:
 * - lereng gundul: sebagian besar air mengalir di permukaan ke sungai; sedikit yang masuk ke tanah, cepat habis;
 * - lereng berpohon: sebagian besar air masuk ke tanah lewat bagian bawah pohon, air tanah naik, dan mata
 *   airnya tetap mengalir lama setelah hujan berhenti.
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

/** Lereng kiri: gundul. Lereng kanan: cermin lereng kiri, berpohon. */
const SISI = [
  { kunci: 'gundul', masukTanah: 0.15, keluarMataAir: 0.5, tanah: '#b98d5e', cermin: false },
  { kunci: 'pohon', masukTanah: 0.8, keluarMataAir: 0.06, tanah: '#7a5b3f', cermin: true },
] as const;

/** Tinggi permukaan lereng kiri di x; lereng kanan memakai cerminnya. */
function permukaanKiri(x: number): number {
  if (x <= 60) return 118;
  if (x <= 340) return 118 + ((x - 60) / 280) * 144;
  return 262 + ((Math.min(x, ALUR.x0) - 340) / 30) * 8;
}
const permukaan = (cermin: boolean, x: number) => permukaanKiri(cermin ? LEBAR - x : x);
const cx = (cermin: boolean, x: number) => (cermin ? LEBAR - x : x);

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
  gambar.append(defs, svg('rect', { x: -LEBAR, y: -TINGGI, width: LEBAR * 3, height: TINGGI * 3, fill: '#bfe6f5' }));

  // Alur air di tengah, menuju sungai.
  const airAlur = svg('rect', { x: ALUR.x0, width: ALUR.x1 - ALUR.x0, fill: '#3d8fc4' });
  gambar.append(
    svg('rect', { x: ALUR.x0 - 2, y: 268, width: ALUR.x1 - ALUR.x0 + 4, height: TINGGI * 2, fill: '#5f6f78' }),
    svg('rect', { x: ALUR.x0, y: 268, width: ALUR.x1 - ALUR.x0, height: ALUR.dasar - 268, fill: '#cfe3ea' }),
    airAlur,
    svg('text', { x: 400, y: 258, 'text-anchor': 'middle', class: 'label-kecil', fill: '#1c2a33' }, `${label('sungai', 'ke sungai')} ↓`),
  );

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
    // Air tanah: lapisan biru yang naik dari bawah, terpotong bentuk lereng.
    const airTanah = svg('rect', { class: 'air-tanah', x: -LEBAR, width: LEBAR * 3, y: TINGGI, height: TINGGI, 'clip-path': `url(#lereng-${s.kunci})` });
    g.append(airTanah);
    g.append(svg('polyline', { points: titik.split(' ').slice(0, 4).join(' '), fill: 'none', stroke: s.cermin ? '#4f8f3a' : '#8a6a45', 'stroke-width': s.cermin ? 6 : 4 }));

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
        g.append(
          svg('rect', { x: x - 5, y: y - 42, width: 10, height: 44, fill: '#7a4f2a' }),
          svg('circle', { cx: x, cy: y - 54, r: 24, fill: '#3c9a5f' }),
          svg('circle', { cx: x - 16, cy: y - 42, r: 16, fill: '#4fae6e' }),
          svg('circle', { cx: x + 16, cy: y - 44, r: 16, fill: '#4fae6e' }),
        );
      }
      g.append(bawahPohon, svg('text', { class: 'label-sorot', x: 560, y: permukaan(true, 560) + 92, 'text-anchor': 'middle' }, label('bawahPohon', 'bagian bawah pohon')));
    } else {
      for (const x of [110, 170, 230, 290]) {
        const y = permukaan(false, x);
        g.append(svg('path', { d: `M${x},${y + 1} l6,7 l-3,6 l7,5`, stroke: '#7a5b3a', 'stroke-width': 2, fill: 'none' }));
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
    g.append(
      aliran,
      mataAir,
      svg('circle', { cx: cx(s.cermin, 348), cy: 292, r: 7, fill: '#5f6f78' }),
      svg('text', { x: cx(s.cermin, 340), y: 318, 'text-anchor': s.cermin ? 'start' : 'end', class: 'label-tanah' }, label('mataAir', 'mata air')),
      svg('text', { x: cx(s.cermin, 185), y: 368, 'text-anchor': 'middle', class: 'label-tanah' }, label('airTanah', 'air tanah')),
      svg('text', { x: cx(s.cermin, 120), y: 96, 'text-anchor': 'middle', class: 'label-kolam' }, label(s.kunci, s.cermin ? 'Lereng berpohon' : 'Lereng gundul')),
    );

    // Awan dan hujan di atas lereng ini (tampil saat disiram).
    const awan = svg('g', { class: 'awan-siram', opacity: 0 });
    const tengah = cx(s.cermin, 200);
    for (const [dx, dy, r] of [[-60, 10, 26], [-25, -6, 34], [20, -4, 32], [58, 10, 24], [0, 14, 30]]) {
      awan.append(svg('circle', { cx: tengah + dx, cy: 42 + dy, r, fill: '#9fb3bf' }));
    }
    for (let j = 0; j < 12; j++) {
      const x = tengah - 80 + j * 15;
      const garis = svg('line', { class: 'garis-hujan', x1: x, y1: 70, x2: x - 4, y2: 84 });
      garis.style.animationDelay = `${(j % 4) * 0.12}s`;
      awan.append(garis);
    }
    gambar.append(g);
    return { ...s, i, g, airTanah, aliran, mataAir, awan };
  });
  gambar.append(lapisButir, ...bagian.map((b) => b.awan));

  // Kendali.
  const kendali = el('div', undefined, { class: 'kendali' });
  const tombol = bagian.map((b) => {
    const t = el('button', label(b.cermin ? 'siramPohon' : 'siramGundul', b.cermin ? 'Siram lereng berpohon' : 'Siram lereng gundul'), { type: 'button', class: 'tombol-tahap' });
    t.addEventListener('click', () => siram(b.i));
    return t;
  });
  kendali.append(...tombol);
  const kabar = el('p', '', { class: 'kabar', 'aria-live': 'polite' });
  akar.append(el('p', teks?.arahan ?? '', { class: 'arahan' }), gambar, kendali, kabar);

  // Keadaan.
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

  function langkah(kini: number): void {
    const dt = Math.min(0.05, (kini - lalu) / 1000);
    lalu = kini;
    for (const b of bagian) {
      const i = b.i;
      const sedangHujan = hujan[i] > 0;
      if (sedangHujan) {
        hujan[i] = Math.max(0, hujan[i] - dt);
        airTanah[i] = Math.min(1, airTanah[i] + LAJU_HUJAN * b.masukTanah * dt);
        aliranPermukaan[i] = LAJU_HUJAN * (1 - b.masukTanah) * 4;
        airDiAlur += LAJU_HUJAN * (1 - b.masukTanah) * dt * 3;
        // Butir air yang masuk ke tanah, sebanyak bagian yang masuk.
        tampung[i] += dt * 14 * b.masukTanah;
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
      const keluar = airTanah[i] * b.keluarMataAir * dt;
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
    airDiAlur = Math.max(0, Math.min(1, airDiAlur - dt * 0.35));
    const yAlur = ALUR.dasar - airDiAlur * 40;
    airAlur.setAttribute('y', yAlur.toFixed(1));
    airAlur.setAttribute('height', (ALUR.dasar - yAlur).toFixed(1));

    const semuaBerhenti = hujan.every((h) => h === 0);
    sejakBerhenti = semuaBerhenti ? sejakBerhenti + dt : 0;
    if (!sudahSiap && pernahDisiram.every(Boolean) && semuaBerhenti && sejakBerhenti >= JEDA_SIAP) {
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
