import Phaser from 'phaser';
import { kurangiGerak } from '../game/perayaan';

/**
 * Suasana Puncak Kabut di peta (hiasan di atas peta; tile dan collision tidak diubah).
 *
 * Cerita warga: "Dulu Puncak Kabut selalu tertutup awan. Sekarang langit di atasnya kosong." Jadi:
 * - sebelum misi selesai: hanya angin yang bertiup naik lereng, langit di atas puncak kosong;
 * - saat misi selesai: titik-titik air kecil naik dan berkumpul, lalu awan terbentuk menyelimuti puncak
 *   (pengembunan, sama dengan yang anak lihat di layar misi);
 * - sesudahnya: awan di puncak, kabut tipis melayang di lereng, dan bayangan awan lewat pelan.
 * Awan memudar saat pemain berada di bawahnya, supaya pemain dan tempat misi tetap terlihat.
 */

interface Kotak {
  x: number;
  y: number;
  width: number;
  height: number;
}

const KUNCI = { awanBesar: 'pk-awan-besar', awanKecil: 'pk-awan-kecil', angin: 'pk-angin', titik: 'pk-titik' };

/** Kedalaman: kabut dan awan di atas pemain dan kanopi, di bawah HUD (40+). */
const DALAM = { kabut: 31, awan: 32, titik: 33 };

/** Pos cuaca di puncak dan lereng, relatif terhadap sudut kiri atas wilayah Puncak Kabut di peta. */
const PUNCAK = { dx: 680, dy: 490 };
const LERENG = { dx0: 400, dx1: 900, dy0: 560, dy1: 830 };

/** Awan pixel: gumpalan lingkaran dengan sisi bawah lebih gelap, digambar per pixel supaya serasi dengan peta. */
function gambarAwan(lebar: number, tinggi: number, gumpal: [number, number, number][]): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = lebar;
  c.height = tinggi;
  const ctx = c.getContext('2d')!;
  const dalam = (x: number, y: number) => gumpal.some(([gx, gy, r]) => (x - gx) ** 2 + (y - gy) ** 2 <= r * r);
  for (let y = 0; y < tinggi; y++) {
    for (let x = 0; x < lebar; x++) {
      if (!dalam(x + 0.5, y + 0.5)) continue;
      const tepiBawah = !dalam(x + 0.5, y + 1.5);
      const tepiAtas = !dalam(x + 0.5, y - 0.5);
      ctx.fillStyle = tepiBawah ? '#a9c4d3' : y > tinggi * 0.62 ? '#dcebf3' : tepiAtas ? '#ffffff' : '#f4fafd';
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

function gambarGaris(panjang: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = panjang;
  c.height = 1;
  const ctx = c.getContext('2d')!;
  for (let x = 0; x < panjang; x++) {
    ctx.fillStyle = `rgba(255,255,255,${(0.25 + 0.75 * (x / panjang)).toFixed(2)})`;
    ctx.fillRect(x, 0, 1, 1);
  }
  return c;
}

function pasangTekstur(scene: Phaser.Scene): void {
  const t = scene.textures;
  const tambah = (kunci: string, buat: () => HTMLCanvasElement) => {
    if (!t.exists(kunci)) t.addCanvas(kunci, buat());
  };
  tambah(KUNCI.awanBesar, () => gambarAwan(56, 26, [[12, 17, 9], [24, 11, 11], [36, 12, 10], [46, 17, 8], [28, 18, 9]]));
  tambah(KUNCI.awanKecil, () => gambarAwan(36, 18, [[9, 11, 7], [18, 8, 8], [27, 11, 7], [18, 13, 6]]));
  tambah(KUNCI.angin, () => gambarGaris(14));
  tambah(KUNCI.titik, () => gambarAwan(3, 3, [[1.5, 1.5, 1.6]]));
}

// ---- Tekstur gunung ----

interface PetaRingkas {
  width: number;
  tilesets: { firstgid: number; name: string }[];
  layers: { name: string; type: string; data?: number[] }[];
}

/** Lantai teras gunung di peta: tiga warna polos dari tileset mountain_v36_r1. Nilai = tingkat (makin tinggi makin atas). */
const LANTAI: Record<number, number> = { 15: 1, 31: 2, 47: 3 };

/** Angka acak tetap per sel, supaya teksturnya sama setiap kali dimuat. */
function acakSel(x: number, y: number): () => number {
  let s = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ 0x5bd1e995) >>> 0;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0x100000000;
  };
}

type Kuas = (x: number, y: number, warna: string, alfa?: number) => void;

/** Isi satu sel 16×16 sesuai tingkatnya: lumut dan rumput (bawah), batu dan retakan (tengah), embun beku (atas). */
function isiSel(titik: Kuas, tingkat: number, acak: () => number): void {
  const r = (n: number) => Math.floor(acak() * n);
  const bintik = (gelap: string, terang: string, jumlah: number) => {
    for (let i = 0; i < jumlah; i++) titik(r(16), r(16), acak() < 0.5 ? gelap : terang);
  };
  const kerikil = (isi: string, kilap: string, teduh: string) => {
    const x = 1 + r(13);
    const y = 1 + r(13);
    titik(x, y, kilap);
    titik(x + 1, y, isi);
    titik(x, y + 1, isi);
    titik(x + 1, y + 1, teduh);
    titik(x + 2, y + 1, teduh, 0.5);
  };
  if (tingkat === 1) {
    bintik('#6d8566', '#91a688', 12);
    if (acak() < 0.35) {
      const x = 2 + r(12);
      const y = 3 + r(11);
      titik(x, y, '#56704f');
      titik(x, y - 1, '#5f7a56');
      titik(x - 1, y, '#6b8660');
      titik(x + 1, y - 1, '#6b8660');
      titik(x, y - 2, '#a9b98e');
      titik(x + 1, y - 2, '#9bb083', 0.8);
    }
    if (acak() < 0.12) kerikil('#9ea8a0', '#c4ccc5', '#62705f');
  } else if (tingkat === 2) {
    bintik('#83918c', '#a7b4af', 14);
    if (acak() < 0.28) {
      let x = 2 + r(10);
      let y = 2 + r(10);
      for (let i = 0; i < 4 + r(3); i++) {
        titik(x, y, '#738079');
        titik(x + 1, y, '#b2bdb8', 0.5);
        x += acak() < 0.6 ? 1 : 0;
        y += acak() < 0.6 ? 1 : 0;
      }
    }
    if (acak() < 0.16) kerikil('#aab5b0', '#d2d9d5', '#6f7c76');
    if (acak() < 0.08) {
      const x = 2 + r(12);
      const y = 2 + r(12);
      titik(x, y, '#a3ab78');
      titik(x + 1, y, '#b5bb88');
      titik(x, y + 1, '#97a06e', 0.8);
    }
  } else if (tingkat === 4) {
    // Lempeng batu biru-abu (mountain_v36 #79).
    bintik('#899ba1', '#aabbc0', 14);
    if (acak() < 0.3) {
      let x = 2 + r(10);
      let y = 2 + r(10);
      for (let i = 0; i < 4 + r(4); i++) {
        titik(x, y, '#788a90');
        titik(x, y + 1, '#b9c8cc', 0.45);
        x += 1;
        y += acak() < 0.4 ? 1 : acak() < 0.2 ? -1 : 0;
      }
    }
    if (acak() < 0.16) kerikil('#b0bfc3', '#d6e0e2', '#6c7d83');
    if (acak() < 0.1) {
      const x = 2 + r(12);
      const y = 2 + r(12);
      titik(x, y, '#8ea489');
      titik(x + 1, y, '#9fb394');
      titik(x + 1, y + 1, '#83987e', 0.8);
    }
  } else {
    bintik('#a9bcc1', '#e2edf0', 12);
    if (acak() < 0.22) {
      const x = 2 + r(12);
      const y = 2 + r(12);
      titik(x, y, '#ffffff');
      titik(x - 1, y, '#e6f2f5');
      titik(x + 1, y, '#e6f2f5');
      titik(x, y - 1, '#e6f2f5');
      titik(x, y + 1, '#e6f2f5');
    }
    if (acak() < 0.12) {
      const x = 1 + r(12);
      const y = 2 + r(12);
      for (let i = 0; i < 3; i++) titik(x + i, y, '#eef6f8');
      titik(x + 1, y - 1, '#f6fbfc');
      for (let i = 0; i < 3; i++) titik(x + i, y + 1, '#cfdfe3');
    }
  }
}

/**
 * Lapisan tekstur di atas lantai teras gunung (kedalaman lantai 1.5, tebing 9, jalan 5): bintik, rumput, retakan,
 * embun beku, bayangan di kaki tebing, dan bibir terang di tepi yang menurun. Dihitung dari data peta, jadi
 * mengikuti bentuk gunung apa adanya tanpa mengubah tile, collision, atau gameplay.
 */
function pasangTeksturGunung(scene: Phaser.Scene, peta: PetaRingkas, wilayah: Kotak): void {
  const lantai = peta.layers.find((l) => l.name === 'Environment_V32' && l.data);
  const batu = peta.layers.find((l) => l.name === 'Mountain_V36R3_Natural_Rock' && l.data);
  const ts = peta.tilesets.find((t) => t.name === 'mountain_v36_r1');
  const tsBatu = peta.tilesets.find((t) => t.name === 'mountain_v36');
  if (!lantai?.data || !ts) return;
  const T = 16;
  const tx0 = Math.floor(wilayah.x / T);
  const ty0 = Math.floor(wilayah.y / T);
  const tx1 = Math.ceil((wilayah.x + wilayah.width) / T);
  const ty1 = Math.ceil((wilayah.y + wilayah.height) / T);
  const gidBatu = (x: number, y: number): number => (batu?.data ? (batu.data[y * peta.width + x] ?? 0) & 0x1fffffff : 0);
  /** Lempeng batu datar (mountain_v36 #79) di lapisan batu; digambar di atas lantai teras. */
  const lempeng = (x: number, y: number): boolean => Boolean(tsBatu) && gidBatu(x, y) === tsBatu!.firstgid + 79;
  const tingkat = (x: number, y: number): number => {
    if (x < 0 || y < 0 || x >= peta.width) return 0;
    if (lempeng(x, y)) return 2;
    const gid = (lantai.data![y * peta.width + x] ?? 0) & 0x1fffffff;
    return LANTAI[gid - ts.firstgid] ?? 0;
  };
  const tebing = (x: number, y: number): boolean => gidBatu(x, y) !== 0 && !lempeng(x, y);

  // Dua lapisan: lantai teras (di bawah jalan dan tebing) dan lempeng batu (tepat di atas lapisan batu, di bawah objek).
  for (const atas of [false, true]) {
    const c = gambarLapisan(atas);
    if (!c) continue;
    const kunci = atas ? 'pk-tekstur-lempeng' : 'pk-tekstur-gunung';
    if (!scene.textures.exists(kunci)) scene.textures.addCanvas(kunci, c);
    scene.add.image(tx0 * T, ty0 * T, kunci).setOrigin(0).setDepth(atas ? 9.05 : 1.6);
  }

  function gambarLapisan(atas: boolean): HTMLCanvasElement | undefined {
  const c = document.createElement('canvas');
  c.width = (tx1 - tx0) * T;
  c.height = (ty1 - ty0) * T;
  const ctx = c.getContext('2d')!;
  let ada = false;
  for (let ty = ty0; ty < ty1; ty++) {
    for (let tx = tx0; tx < tx1; tx++) {
      const t = tingkat(tx, ty);
      if (!t || lempeng(tx, ty) !== atas) continue;
      ada = true;
      const ox = (tx - tx0) * T;
      const oy = (ty - ty0) * T;
      const titik: Kuas = (x, y, warna, alfa = 1) => {
        if (x < 0 || y < 0 || x >= T || y >= T) return;
        ctx.globalAlpha = alfa;
        ctx.fillStyle = warna;
        ctx.fillRect(ox + x, oy + y, 1, 1);
      };
      isiSel(titik, atas ? 4 : t, acakSel(tx, ty));

      // Bayangan jatuh di kaki tebing atau teras yang lebih tinggi di utaranya (cahaya dari kiri atas).
      if (tebing(tx, ty - 1) || tingkat(tx, ty - 1) > t) {
        for (let y = 0; y < 5; y++) {
          const alfa = [0.26, 0.19, 0.13, 0.08, 0.05][y];
          for (let x = 0; x < T; x++) if (y < 2 || (x + y) % 2 === 0) titik(x, y, '#1f2e26', alfa);
        }
      }
      // Bibir terang di tepi selatan yang menurun; di teras atas berupa salju tipis yang tidak rata.
      if (tebing(tx, ty + 1) || tingkat(tx, ty + 1) < t) {
        const acak = acakSel(tx + 991, ty + 313);
        for (let x = 0; x < T; x++) {
          if (t === 3) {
            titik(x, 15, '#f4fafc', 0.95);
            if (acak() < 0.55) titik(x, 14, '#e8f3f6', 0.85);
          } else titik(x, 15, '#d6ded3', 0.45);
        }
      }
      // Sisi barat menurun: sedikit terang; sisi timur menurun: sedikit teduh.
      if (tingkat(tx - 1, ty) < t && !tebing(tx - 1, ty)) for (let y = 0; y < T; y++) titik(0, y, '#ffffff', t === 3 ? 0.4 : 0.18);
      if (tingkat(tx + 1, ty) < t && !tebing(tx + 1, ty)) for (let y = 0; y < T; y++) titik(15, y, '#1f2e26', 0.14);
    }
  }
  ctx.globalAlpha = 1;
  return ada ? c : undefined;
  }
}

// ---- Padang rumput pegunungan di sekitar gunung ----

const RUMPUT = { dasar: '#84c669', terang: '#93d57a', gelap: '#72b75c', kering: '#a4c56f', keringGelap: '#93b463' };

/** Noise nilai 2D halus (dua oktaf), 0–1, untuk bercak rumput yang bentuknya tidak beraturan. */
function noise(x: number, y: number): number {
  const kisi = (ix: number, iy: number) => acakSel(ix * 7 + 3, iy * 13 + 5)();
  const halus = (t: number) => t * t * (3 - 2 * t);
  const oktaf = (s: number) => {
    const gx = x / s;
    const gy = y / s;
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    const fx = halus(gx - ix);
    const fy = halus(gy - iy);
    const a = kisi(ix, iy) + (kisi(ix + 1, iy) - kisi(ix, iy)) * fx;
    const b = kisi(ix, iy + 1) + (kisi(ix + 1, iy + 1) - kisi(ix, iy + 1)) * fx;
    return a + (b - a) * fy;
  };
  return oktaf(11) * 0.7 + oktaf(4) * 0.3;
}

/**
 * Transisi alami dari padang ke gunung, seperti pasir ke laut di Pantai Biru: rumput kering dan serpihan batu di
 * kaki gunung, padang berbunga lebih jauh, bercak rumput tak beraturan, dan rumpun rumput yang memecah tepi
 * gunung yang lurus. Hanya di sel rumput polos (tanpa jalan, air, atau objek), jadi tidak menutupi apa pun.
 */
function pasangPadangAlpin(scene: Phaser.Scene, peta: PetaRingkas, wilayah: Kotak): void {
  const T = 16;
  const W = peta.width;
  const tx0 = Math.floor(wilayah.x / T);
  const ty0 = Math.floor(wilayah.y / T);
  const tx1 = Math.ceil((wilayah.x + wilayah.width) / T);
  const ty1 = Math.ceil((wilayah.y + wilayah.height) / T);
  const layer = (n: string) => peta.layers.find((l) => l.name === n && l.data)?.data;
  const tanah = layer('Ground');
  const lantai = layer('Environment_V32');
  const ts = peta.tilesets.find((t) => t.name === 'mountain_v36_r1');
  const tsKota = peta.tilesets.find((t) => t.name === 'kenney_tiny_town' || t.name === 'tiny_town');
  if (!tanah || !lantai || !ts) return;
  const gid = (d: number[] | undefined, x: number, y: number) => (d ? (d[y * W + x] ?? 0) & 0x1fffffff : 0);
  const lapisGunung = ['Mountain_V36_Detail', 'Mountain_V36R3_Natural_Rock', 'Mountain_V36R1_Rim', 'Mountain_V36R2_Ridges'].map(layer);
  const gunung = (x: number, y: number) => LANTAI[gid(lantai, x, y) - ts.firstgid] !== undefined || lapisGunung.some((d) => gid(d, x, y));
  // Sel berumput di lapisan Ground. Padang digambar tepat di atas Ground dan di bawah semua lapisan lain
  // (detail tanah, jalan, air, objek), jadi tidak ada yang tertutup.
  const rumput = (x: number, y: number) => {
    const g = gid(tanah, x, y);
    return Boolean(g) && (!tsKota || g - tsKota.firstgid <= 1);
  };
  /** Rumput yang benar-benar terlihat: tidak tertutup jalan, air, atau gunung. Rumpun tepi hanya tumbuh ke arah ini. */
  const penutup = ['Paths', 'Water', 'Facades', 'Environment_V32'].map(layer);
  const rumputTerlihat = (x: number, y: number) => rumput(x, y) && !gunung(x, y) && penutup.every((d) => !gid(d, x, y));

  // Jarak (dalam tile) dari gunung, sampai 7.
  const lebar = tx1 - tx0;
  const tinggi = ty1 - ty0;
  const jarak = new Array<number>(lebar * tinggi).fill(99);
  const antre: [number, number][] = [];
  for (let y = ty0; y < ty1; y++) for (let x = tx0; x < tx1; x++) if (gunung(x, y)) { jarak[(y - ty0) * lebar + (x - tx0)] = 0; antre.push([x, y]); }
  for (let i = 0; i < antre.length; i++) {
    const [x, y] = antre[i];
    const d = jarak[(y - ty0) * lebar + (x - tx0)];
    if (d >= 7) continue;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < tx0 || ny < ty0 || nx >= tx1 || ny >= ty1) continue;
      const k = (ny - ty0) * lebar + (nx - tx0);
      if (jarak[k] > d + 1) { jarak[k] = d + 1; antre.push([nx, ny]); }
    }
  }
  const jarakDi = (x: number, y: number) => (x < tx0 || y < ty0 || x >= tx1 || y >= ty1 ? 99 : jarak[(y - ty0) * lebar + (x - tx0)]);

  // Dua kanvas: padang (di atas Ground, di bawah detail) dan rumpun tepi (di atas lantai gunung).
  const buat = () => {
    const c = document.createElement('canvas');
    c.width = lebar * T;
    c.height = tinggi * T;
    return c;
  };
  const kanvasPadang = buat();
  const kanvasTepi = buat();
  let ctx = kanvasPadang.getContext('2d')!;
  const ctxPadang = ctx;
  const ctxTepi = kanvasTepi.getContext('2d')!;
  const px = (x: number, y: number, warna: string, alfa = 1) => {
    ctx.globalAlpha = alfa;
    ctx.fillStyle = warna;
    ctx.fillRect(x, y, 1, 1);
  };
  const batu = (x: number, y: number, besar: boolean) => {
    px(x, y, '#c9d1d3'); px(x + 1, y, '#a3adb0'); px(x, y + 1, '#a3adb0'); px(x + 1, y + 1, '#717d80');
    if (besar) { px(x + 2, y, '#a3adb0'); px(x + 2, y + 1, '#717d80'); px(x + 1, y + 2, '#5f6a6c', 0.6); px(x + 2, y + 2, '#5f6a6c', 0.6); }
  };
  const bunga = (x: number, y: number, kelopak: string, tengah: string) => {
    px(x, y + 2, '#5f9a4f');
    px(x - 1, y, kelopak); px(x + 1, y, kelopak); px(x, y - 1, kelopak); px(x, y + 1, kelopak);
    px(x, y, tengah);
  };
  const WARNA_BUNGA: [string, string][] = [['#b9a2ee', '#7d5cc4'], ['#f7f7f0', '#f2cf45'], ['#f5cf3f', '#e38628'], ['#f2a7c3', '#d0607f']];

  for (let ty = ty0; ty < ty1; ty++) {
    for (let tx = tx0; tx < tx1; tx++) {
      const d = jarakDi(tx, ty);
      const ox = (tx - tx0) * T;
      const oy = (ty - ty0) * T;
      // Rumpun rumput yang memecah tepi gunung yang lurus (di sel gunung yang bersebelahan dengan rumput).
      if (d === 0) {
        if (LANTAI[gid(lantai, tx, ty) - ts.firstgid] === undefined) continue;
        ctx = ctxTepi;
        const acak = acakSel(tx + 401, ty + 77);
        for (const [nx, ny, sisi] of [[tx, ty - 1, 'u'], [tx, ty + 1, 's'], [tx - 1, ty, 'b'], [tx + 1, ty, 't']] as const) {
          if (!rumputTerlihat(nx, ny)) continue;
          for (let i = 0; i < 16; i++) {
            const masuk = Math.floor(acak() * 3.2);
            for (let k = 0; k <= masuk; k++) {
              const x = sisi === 'b' ? k : sisi === 't' ? 15 - k : i;
              const y = sisi === 'u' ? k : sisi === 's' ? 15 - k : i;
              px(ox + x, oy + y, k === masuk ? RUMPUT.gelap : RUMPUT.dasar);
            }
          }
        }
        continue;
      }
      if (d > 7 || !rumput(tx, ty)) continue;
      ctx = ctxPadang;
      const kekuatan = 1 - (d - 1) / 7;
      const acak = acakSel(tx + 17, ty + 911);
      // Ambang bercak naik menjauhi gunung, jadi bercak makin jarang dan memudar alami (tanpa garis batas).
      const ambangKering = d <= 1 ? 0.36 : d === 2 ? 0.46 : d === 3 ? 0.58 : 2;
      const ambangGelap = 0.64 + (1 - kekuatan) * 0.14;
      const ambangTerang = 0.3 - (1 - kekuatan) * 0.12;
      for (let y = 0; y < T; y++) {
        for (let x = 0; x < T; x++) {
          const n = noise(tx * T + x, ty * T + y);
          // Kaki gunung: rumput kering kekuningan; lebih jauh: bercak hijau tua dan muda yang padat.
          if (n > ambangKering) px(ox + x, oy + y, n > ambangKering + 0.2 ? RUMPUT.keringGelap : RUMPUT.kering);
          else if (n > ambangGelap) px(ox + x, oy + y, RUMPUT.gelap);
          else if (n < ambangTerang) px(ox + x, oy + y, RUMPUT.terang);
        }
      }
      // Serpihan batu di kaki tebing.
      const jumlahBatu = d === 1 ? 3 : d === 2 ? 1 : 0;
      for (let i = 0; i < jumlahBatu; i++) if (acak() < 0.6) batu(ox + 1 + Math.floor(acak() * 12), oy + 1 + Math.floor(acak() * 12), acak() < 0.35);
      // Rumput tinggi dan kelompok bunga liar di padang.
      if (acak() < 0.35 * kekuatan) {
        const x = ox + 2 + Math.floor(acak() * 12);
        const y = oy + 4 + Math.floor(acak() * 10);
        px(x, y, '#5d9c4d'); px(x, y - 1, '#5d9c4d'); px(x - 1, y - 1, '#6fae5b'); px(x + 1, y - 2, '#6fae5b'); px(x, y - 2, '#9bd67e');
      }
      if (d >= 2 && acak() < 0.22 * kekuatan) {
        const [kelopak, tengah] = WARNA_BUNGA[Math.floor(acak() * WARNA_BUNGA.length)];
        const n = 2 + Math.floor(acak() * 4);
        const cx = ox + 4 + Math.floor(acak() * 8);
        const cy = oy + 4 + Math.floor(acak() * 8);
        for (let i = 0; i < n; i++) bunga(cx + Math.round((acak() - 0.5) * 9), cy + Math.round((acak() - 0.5) * 7), kelopak, tengah);
      }
    }
  }
  ctxPadang.globalAlpha = 1;
  ctxTepi.globalAlpha = 1;
  for (const [kunci, kanvas, dalam] of [['pk-padang-alpin', kanvasPadang, 0.5], ['pk-tepi-gunung', kanvasTepi, 1.55]] as const) {
    if (!scene.textures.exists(kunci)) scene.textures.addCanvas(kunci, kanvas);
    scene.add.image(tx0 * T, ty0 * T, kunci).setOrigin(0).setDepth(dalam);
  }
}

/** Dua elang yang melayang berputar pelan di atas puncak. */
function elang(scene: Phaser.Scene, pusat: { x: number; y: number }): void {
  const kunci = 'pk-elang';
  if (!scene.textures.exists(kunci)) {
    const c = document.createElement('canvas');
    c.width = 11;
    c.height = 5;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3b3530';
    for (const [x, y] of [[0, 1], [1, 1], [2, 2], [3, 2], [4, 3], [5, 3], [6, 3], [7, 2], [8, 2], [9, 1], [10, 1], [5, 4], [4, 2], [6, 2]]) ctx.fillRect(x, y, 1, 1);
    ctx.fillStyle = '#6b5f55';
    ctx.fillRect(5, 2, 1, 1);
    scene.textures.addCanvas(kunci, c);
  }
  const tenang = kurangiGerak();
  [0, Math.PI].forEach((awal, i) => {
    const burung = scene.add.image(pusat.x, pusat.y, kunci).setDepth(34).setAlpha(0.85);
    const jari = 70 + i * 26;
    if (tenang) {
      burung.setPosition(pusat.x + Math.cos(awal) * jari, pusat.y - 40 + Math.sin(awal) * jari * 0.45);
      return;
    }
    scene.tweens.addCounter({
      from: 0,
      to: Math.PI * 2,
      duration: 16000 + i * 5000,
      repeat: -1,
      onUpdate: (tw) => {
        const s = awal + (tw.getValue() ?? 0) * (i ? -1 : 1);
        burung.setPosition(Math.round(pusat.x + Math.cos(s) * jari), Math.round(pusat.y - 40 + Math.sin(s) * jari * 0.45));
        // Kepakan sayap sesekali: sayap sedikit menutup.
        burung.setScale(1, 0.8 + 0.2 * Math.abs(Math.sin(s * 9)));
      },
    });
  });
}

/** Kilau embun beku yang sesekali berkedip di teras paling atas. */
function kilauEmbun(scene: Phaser.Scene, peta: PetaRingkas, wilayah: Kotak): void {
  if (kurangiGerak()) return;
  const lantai = peta.layers.find((l) => l.name === 'Environment_V32' && l.data);
  const ts = peta.tilesets.find((t) => t.name === 'mountain_v36_r1');
  if (!lantai?.data || !ts) return;
  const sel: [number, number][] = [];
  for (let ty = Math.floor(wilayah.y / 16); ty < Math.ceil((wilayah.y + wilayah.height) / 16); ty++) {
    for (let tx = Math.floor(wilayah.x / 16); tx < Math.ceil((wilayah.x + wilayah.width) / 16); tx++) {
      const gid = (lantai.data[ty * peta.width + tx] ?? 0) & 0x1fffffff;
      if (LANTAI[gid - ts.firstgid] === 3) sel.push([tx, ty]);
    }
  }
  const acak = acakSel(7, 11);
  for (let i = 0; i < Math.min(18, sel.length); i++) {
    const [tx, ty] = sel[Math.floor(acak() * sel.length)];
    const k = scene.add.image(tx * 16 + 2 + acak() * 12, ty * 16 + 2 + acak() * 12, KUNCI.titik).setDepth(1.7).setAlpha(0);
    scene.tweens.add({ targets: k, alpha: { from: 0, to: 0.95 }, duration: 260, yoyo: true, hold: 120, repeat: -1, repeatDelay: 2200 + acak() * 4200, delay: acak() * 5000 });
  }
}

interface Melayang {
  obj: Phaser.GameObjects.Image;
  x0: number;
  y0: number;
  laju: number;
  fase: number;
  /** Alfa penuh; dikurangi saat pemain di bawahnya (awan) atau bernapas pelan (kabut). */
  alfa: number;
}

export class SuasanaPuncak {
  private awan: Melayang[] = [];
  private kabut: Melayang[] = [];
  private angin: Melayang[] = [];
  private pulih = false;
  /** 0 → 1 selama awan terbentuk. */
  private muncul = 0;
  private readonly tenang = kurangiGerak();

  constructor(
    private scene: Phaser.Scene,
    private wilayah: Kotak,
    private pemain: () => { x: number; y: number } | undefined,
    sudahPulih: boolean,
    peta?: PetaRingkas,
  ) {
    pasangTekstur(scene);
    if (peta) {
      pasangPadangAlpin(scene, peta, wilayah);
      pasangTeksturGunung(scene, peta, wilayah);
      kilauEmbun(scene, peta, wilayah);
    }
    elang(scene, this.titik(PUNCAK.dx, PUNCAK.dy));
    this.buatAngin();
    this.buatSuasanaPulih();
    this.sesuaikan(sudahPulih);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.perbarui, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.perbarui, this));
  }

  /** Langsung ke keadaan yang sesuai progres (memuat permainan, mode demo, atau mulai dari awal). */
  sesuaikan(pulih: boolean): void {
    this.pulih = pulih;
    this.muncul = pulih ? 1 : 0;
  }

  /** Misi Puncak Kabut baru selesai: titik air naik dan berkumpul, lalu awan terbentuk di puncak. */
  pulihkan(): void {
    if (this.pulih) return;
    this.pulih = true;
    if (this.tenang) {
      this.muncul = 1;
      return;
    }
    this.muncul = 0;
    const p = this.titik(PUNCAK.dx, PUNCAK.dy);
    for (let i = 0; i < 46; i++) {
      const x = p.x + (Math.random() - 0.5) * 280;
      const y = p.y + 20 + Math.random() * 150;
      const t = this.scene.add.image(x, y, KUNCI.titik).setDepth(DALAM.titik).setAlpha(0);
      // Naik dan berkumpul di tempat awan akan terbentuk (melingkari pos cuaca).
      this.scene.tweens.add({
        targets: t,
        x: p.x + (Math.random() - 0.5) * 260,
        y: p.y - 70 + (Math.random() - 0.5) * 70,
        alpha: { from: 0.95, to: 0 },
        delay: Math.random() * 900,
        duration: 1500 + Math.random() * 700,
        ease: 'Sine.easeIn',
        onComplete: () => t.destroy(),
      });
    }
    this.scene.tweens.addCounter({ from: 0, to: 1, delay: 900, duration: 2200, ease: 'Sine.easeOut', onUpdate: (tw) => (this.muncul = tw.getValue() ?? 1) });
  }

  private titik(dx: number, dy: number): { x: number; y: number } {
    return { x: this.wilayah.x + dx, y: this.wilayah.y + dy };
  }

  private tambah(daftar: Melayang[], kunci: string, dx: number, dy: number, alfa: number, dalam: number, laju = 0): Melayang {
    const { x, y } = this.titik(dx, dy);
    const obj = this.scene.add.image(x, y, kunci).setDepth(dalam).setAlpha(0);
    const m = { obj, x0: x, y0: y, laju, fase: Math.random() * Math.PI * 2, alfa };
    daftar.push(m);
    return m;
  }

  /** Angin yang bertiup naik lereng: ada sejak awal, petunjuk halus bahwa udara bergerak ke gunung. */
  private buatAngin(): void {
    for (let i = 0; i < 6; i++) {
      this.tambah(this.angin, KUNCI.angin, LERENG.dx0 + Math.random() * 300, LERENG.dy0 + 40 + Math.random() * 230, 0.7, DALAM.kabut, 26 + Math.random() * 14);
    }
  }

  private buatSuasanaPulih(): void {
    // Awan melingkari pos cuaca di puncak. Bagian tengah dibiarkan terbuka supaya tempat bermain tetap terlihat.
    for (const [dx, dy, kunci, a] of [
      [-40, -95, KUNCI.awanBesar, 0.95],
      [30, -110, KUNCI.awanBesar, 0.97],
      [100, -80, KUNCI.awanBesar, 0.95],
      [-125, -40, KUNCI.awanBesar, 0.92],
      [150, -20, KUNCI.awanKecil, 0.9],
      [-150, 30, KUNCI.awanKecil, 0.88],
      [-70, -60, KUNCI.awanKecil, 0.85],
      [70, -55, KUNCI.awanKecil, 0.85],
    ] as const) {
      this.tambah(this.awan, kunci, PUNCAK.dx + dx, PUNCAK.dy + dy, a, DALAM.awan, 0);
    }
    // Gumpalan kabut tipis yang melayang pelan di lereng.
    for (let i = 0; i < 9; i++) {
      const dy = LERENG.dy0 + 20 + i * 30;
      const kunci = i % 3 === 0 ? KUNCI.awanBesar : KUNCI.awanKecil;
      this.tambah(this.kabut, kunci, LERENG.dx0 + Math.random() * (LERENG.dx1 - LERENG.dx0), dy, 0.38, DALAM.kabut, 4 + Math.random() * 5);
    }
  }

  private perbarui(waktu: number, dtMs: number): void {
    const dt = Math.min(dtMs, 50) / 1000;
    const p = this.pemain();
    const kiri = this.wilayah.x + LERENG.dx0 - 60;
    const kanan = this.wilayah.x + LERENG.dx1 + 60;
    const geser = (m: Melayang) => {
      if (this.tenang) return m.x0;
      let x = m.obj.x + m.laju * dt;
      if (x > kanan) x = kiri;
      return x;
    };

    for (const m of this.angin) {
      // Garis angin bergerak naik lereng (ke kanan atas), muncul dan hilang pelan.
      if (this.tenang) {
        m.obj.setPosition(m.x0, m.y0).setAlpha(0.35);
        continue;
      }
      const t = ((waktu / 1000) * 0.35 + m.fase) % 1;
      const x = m.x0 + t * 90;
      const y = m.y0 - t * 45;
      m.obj.setPosition(Math.round(x), Math.round(y)).setRotation(-0.46).setAlpha(Math.sin(t * Math.PI) * m.alfa);
    }

    const m = this.muncul;
    for (const a of this.awan) {
      const ayun = this.tenang ? 0 : Math.sin(waktu / 1600 + a.fase) * 2;
      const naik = (1 - m) * 10;
      a.obj.setPosition(Math.round(a.x0 + ayun), Math.round(a.y0 + naik)).setScale(0.6 + 0.4 * m);
      // Memudar saat pemain berada di bawahnya.
      const jauh = p ? Math.hypot(p.x - a.x0, p.y - a.y0) : 999;
      const dekat = Math.min(1, Math.max(0, (jauh - 30) / 70));
      a.obj.setAlpha(a.alfa * m * (0.3 + 0.7 * dekat));
    }
    for (const k of this.kabut) {
      const x = geser(k);
      const napas = this.tenang ? 1 : 0.7 + 0.3 * Math.sin(waktu / 2200 + k.fase);
      // Kabut juga menipis di sekitar pemain, supaya pemain tidak hilang di dalamnya.
      const jauh = p ? Math.hypot(p.x - x, p.y - k.y0) : 999;
      const dekat = Math.min(1, Math.max(0, (jauh - 20) / 60));
      k.obj.setPosition(Math.round(x), k.y0).setAlpha(k.alfa * napas * m * (0.35 + 0.65 * dekat));
    }
  }
}
