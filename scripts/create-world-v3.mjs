/** Rancangan awal V3 yang deterministik. Jalankan manual; dev/build hanya mengekspor
 * map yang disimpan Tiled, sehingga edit artist tidak ditimpa generator ini. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (existsSync(resolve(root, 'world/maps/pulau_tirta_v3.tmj')) && !process.argv.includes('--force')) {
  throw new Error('V3 sudah ada. Generator mengganti rancangan awal; simpan edit Tiled sebelum memakai --force. Dev/build tidak menjalankan generator.');
}
const W = 192, H = 144, T = 16;
let seed = 20261107;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (a) => a[Math.floor(random() * a.length)];
const index = (x, y) => y * W + x;
const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const layers = [], objectLayers = {};
let nextObject = 1;
const props = (p) => Object.entries(p).map(([name, value]) => ({ name, type: typeof value === 'boolean' ? 'bool' : typeof value === 'number' ? 'int' : 'string', value }));
function tileLayer(name, depth, missionId) {
  const l = { id: layers.length + 1, name, type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: !missionId, properties: props({ renderDepth: depth, ...(missionId ? { missionId } : {}) }), data: Array(W * H).fill(0) };
  layers.push(l); return l;
}
const ground = tileLayer('Ground', 0);
const detail = tileLayer('TerrainDetails', 1);
const water = tileLayer('Water', 3);
const paths = tileLayer('Paths', 5);
const objects = tileLayer('Objects', 10);
const above = tileLayer('AbovePlayer', 30);
const regionDefs = [
  { id: 'pantai', title: 'Pantai Biru', mission: 'misi-1', suffix: 'Pantai_Biru', x: 14, y: 82, w: 62, h: 51, target: [57, 104], mechanic: 'mirror' },
  { id: 'puncak', title: 'Puncak Kabut', mission: 'misi-2', suffix: 'Puncak_Kabut', x: 16, y: 10, w: 65, h: 53, target: [60, 43], mechanic: 'wind' },
  { id: 'lembah', title: 'Lembah Hujan', mission: 'misi-3', suffix: 'Lembah_Hujan', x: 122, y: 16, w: 61, h: 51, target: [138, 45], mechanic: 'droplets' },
  { id: 'hutan', title: 'Hutan & Sungai', mission: 'misi-4', suffix: 'Hutan_Sungai', x: 122, y: 82, w: 62, h: 54, target: [141, 106], mechanic: 'plant' },
];
const recovery = Object.fromEntries(regionDefs.map((r) => [r.id, {
  terrain: tileLayer(`Recovery_${r.suffix}`, 2, r.mission),
  water: tileLayer(`Recovery_Water_${r.suffix}`, 4, r.mission),
  plants: tileLayer(`Recovery_Plants_${r.suffix}`, 12, r.mission),
  above: tileLayer(`Recovery_Canopy_${r.suffix}`, 31, r.mission),
}]));
const sets = [
  { name: 'tiny_city', folder: 'tiny_town', columns: 12, count: 132, first: 1 },
  { name: 'tiny_town', folder: 'kenney_tiny_town', columns: 12, count: 132, first: 133 },
  { name: 'tiny_farm', folder: 'kenney_tiny_farm', columns: 12, count: 132, first: 265 },
  { name: 'tiny_battle', folder: 'kenney_tiny_battle', columns: 18, count: 198, first: 397 },
];
const gid = (name, frame) => {
  const s = sets.find((s) => s.name === name);
  if (!s || frame < 0 || frame >= s.count) throw new Error(`Frame tidak valid ${name}:${frame}`);
  return s.first + frame;
};
const city = (f) => gid('tiny_city', f), town = (f) => gid('tiny_town', f), farm = (f) => gid('tiny_farm', f), battle = (f) => gid('tiny_battle', f);
const put = (layer, x, y, tile) => { if (inside(x, y)) layer.data[index(x, y)] = tile; };
function object(layer, name, type, x, y, width = 0, height = 0, properties = {}, point = false) {
  (objectLayers[layer] ??= []).push({ id: nextObject++, name, type, x, y, width, height, rotation: 0, visible: true, ...(point ? { point: true } : {}), properties: props(properties) });
}
const collide = (name, x, y, w, h) => object('Collisions', name, 'obstacle', x, y, w, h, { collides: true });
const land = new Uint8Array(W * H), road = new Uint8Array(W * H), wet = new Uint8Array(W * H), occupied = new Uint8Array(W * H), dry = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const nx = (x - 96) / 88, ny = (y - 73) / 65;
  const angle = Math.atan2(ny, nx);
  const rim = 1 + 0.035 * Math.sin(angle * 7) + 0.024 * Math.cos(angle * 11) + 0.017 * Math.sin(x * 0.47 + y * 0.39);
  land[index(x, y)] = Number(Math.hypot(nx, ny) < rim && x > 5 && x < W - 6 && y > 5 && y < H - 5);
  if (land[index(x, y)]) put(ground, x, y, town(random() < 0.24 ? 1 : 0));
  else { put(ground, x, y, battle(37)); wet[index(x, y)] = 1; }
}
const at = (mask, x, y) => inside(x, y) && mask[index(x, y)] !== 0;
function disk(mask, cx, cy, rx, ry = rx) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    if (inside(x, y) && land[index(x, y)] && ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 + 0.06 * Math.sin(x + y * 2)) mask[index(x, y)] = 1;
  }
}
function rect(layer, x, y, w, h, tile) { for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) put(layer, x + dx, y + dy, typeof tile === 'function' ? tile(dx, dy) : tile); }
function route(points, radius = 1.6) {
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i];
    const length = Math.hypot(x1 - x0, y1 - y0);
    for (let t = 0; t <= length * 2; t++) disk(road, x0 + (x1 - x0) * t / (length * 2), y0 + (y1 - y0) * t / (length * 2), radius);
  }
}
// Empat rute utama pendek berkelok; putaran panjang untuk eksplorasi.
route([[96, 79], [89, 76], [83, 68], [74, 65], [70, 56], [62, 51], [60, 43]]);
route([[99, 77], [109, 71], [119, 68], [124, 57], [135, 53], [138, 45]]);
route([[93, 80], [83, 84], [77, 93], [65, 96], [57, 104]]);
route([[99, 81], [108, 87], [117, 91], [124, 101], [134, 103], [141, 106]]);
route([[74, 65], [52, 64], [41, 56], [35, 46], [39, 34], [51, 29], [60, 43]], 1.2);
route([[138, 45], [153, 37], [166, 41], [174, 53], [166, 64], [153, 67], [124, 57]], 1.2);
route([[57, 104], [44, 101], [34, 108], [29, 118], [41, 125], [57, 121], [67, 113], [65, 96]], 1.3);
route([[141, 106], [151, 106], [163, 106], [165, 110], [159, 117], [148, 123], [138, 120], [141, 106]], 1.3);
// Ruang koridor masa depan, tanpa quest atau sistem unlock.
object('FuturePaths', 'Corridor nord réservé', 'reserved', 73 * T, 25 * T, 50 * T, 6 * T, { connects: 'puncak-lembah', implemented: false });
object('FuturePaths', 'Corridor sud réservé', 'reserved', 75 * T, 123 * T, 49 * T, 7 * T, { connects: 'pantai-hutan', implemented: false });

// Area kering organik; bukan pembesaran V1.
for (const [x, y, rx, ry] of [[47, 108, 30, 24], [55, 40, 24, 20], [149, 47, 24, 19], [145, 115, 18, 13], [98, 78, 20, 17]]) disk(dry, x, y, rx, ry);
function soilTile(mask, x, y) {
  const n = at(mask, x, y - 1), s = at(mask, x, y + 1), e = at(mask, x + 1, y), w = at(mask, x - 1, y);
  return !n ? (!w ? 12 : !e ? 14 : 13) : !s ? (!w ? 36 : !e ? 38 : 37) : !w ? 24 : !e ? 26 : 25;
}
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(dry, x, y)) put(detail, x, y, town(soilTile(dry, x, y)));

// Sungai berkelok; akses jembatan dipertahankan setelah pemulihan.
for (let y = 65; y < 141; y++) {
  const cx = Math.round(157 + Math.sin((y - 68) / 9) * 5 + Math.sin(y / 4) * 1.4);
  for (let dx = -1; dx <= 1; dx++) if (inside(cx + dx, y) && land[index(cx + dx, y)]) wet[index(cx + dx, y)] = 1;
}
function pond(cx, cy, rx, ry, active = true, floor = city(35)) {
  const basin = new Uint8Array(W * H); disk(basin, cx, cy, rx, ry);
  for (let y = cy - ry - 1; y <= cy + ry + 1; y++) for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
    if (!inside(x, y) || !at(basin, x, y)) continue;
    if (active) wet[index(x, y)] = 1;
    else put(detail, x, y, floor);
  }
  return basin;
}
const valleyBasin = pond(153, 50, 8, 5, false);
pond(153, 50, 3, 2);
const beachBasins = [pond(52, 105, 2, 3, false, city(88)), pond(63, 105, 2, 3, false, city(88))];
// Kolam batu: collision stabil pada keadaan kering dan pulih.
for (const [bi, mask] of [valleyBasin, ...beachBasins].entries()) {
  for (let y = 0; y < H; y++) {
    let begin = -1;
    for (let x = 0; x <= W; x++) {
      if (x < W && at(mask, x, y)) { if (begin < 0) begin = x; }
      else if (begin >= 0) { collide(`basin_${bi}_${y}`, begin * T, y * T, (x - begin) * T, T); begin = -1; }
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(mask, x, y)) occupied[index(x, y)] = 1;
}
// Jembatan pada loop hutan, dengan pagar di kedua tepi.
for (let y = 104; y <= 108; y++) for (let x = 149; x <= 166; x++) {
  if (land[index(x, y)]) { wet[index(x, y)] = 0; if (y >= 105 && y <= 107) road[index(x, y)] = 1; }
}
function waterTile(mask, x, y) {
  const n = inside(x, y - 1) && !at(mask, x, y - 1), s = inside(x, y + 1) && !at(mask, x, y + 1), w = inside(x - 1, y) && !at(mask, x - 1, y), e = inside(x + 1, y) && !at(mask, x + 1, y);
  return n ? (w ? 18 : e ? 20 : 19) : s ? (w ? 54 : e ? 56 : 55) : w ? 36 : e ? 38 : 37;
}
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (at(wet, x, y)) put(water, x, y, battle(waterTile(wet, x, y)));
  if (at(road, x, y) && !at(wet, x, y)) put(paths, x, y, town(soilTile(road, x, y)));
}
for (let x = 153; x <= 163; x++) {
  for (let y = 105; y <= 107; y++) put(paths, x, y, city(13));
  put(objects, x, 104, city(94)); put(objects, x, 108, city(94));
  collide(`bridge_rail_n_${x}`, x * T, 104 * T + 3, T, 5);
  collide(`bridge_rail_s_${x}`, x * T, 108 * T + 9, T, 5);
}

function reserve(x, y, w, h) { for (let dy = -1; dy <= h; dy++) for (let dx = -1; dx <= w; dx++) if (inside(x + dx, y + dy)) occupied[index(x + dx, y + dy)] = 1; }
function house(name, x, y, w, warm, legacy = false) {
  reserve(x, y, w, 4);
  if (legacy) {
    for (let j = 0; j < 4; j++) for (let i = 0; i < w; i++) put(objects, x + i, y + j, city(j === 0 ? i === 0 ? 0 : i === w - 1 ? 2 : 1 : j === 3 ? i === 0 ? 24 : i === w - 1 ? 26 : i === Math.floor(w / 2) ? 17 : 25 : i === 0 ? 12 : i === w - 1 ? 14 : 13));
  } else {
    const rows = warm ? [[52, 53, 54], [64, 65, 66], [72, 73, 75], [84, 85, 87]] : [[48, 49, 50], [60, 61, 62], [76, 77, 79], [88, 89, 91]];
    for (let j = 0; j < 4; j++) for (let i = 0; i < w; i++) {
      const frame = j === 3 ? i === Math.floor(w / 2) ? warm ? 85 : 89 : warm ? i % 2 ? 86 : 84 : i % 2 ? 90 : 88 : rows[j][i === 0 ? 0 : i === w - 1 ? 2 : 1];
      put(objects, x + i, y + j, town(frame));
    }
  }
  collide(name, x * T + 2, (y + 2) * T, w * T - 4, 2 * T - 2);
  object('Landmarks', name, 'house', (x + w / 2) * T, (y + 4) * T, 0, 0, { label: name, radiusPx: 35 }, true);
  // Halaman bertanaman dan pagar pendek; pintu menghadap gang.
  for (let i = 0; i < w; i++) put(paths, x + i, y + 4, town(25));
  put(objects, x - 1, y + 3, farm(78)); put(objects, x + w, y + 3, town(29));
  for (let i = 0; i < 3; i++) put(objects, x - 2, y + i, town(56));
  // Kebun bunga kecil milik tiap rumah, di sisi yang tidak menghalangi pintu.
  rect(detail, x + w, y, 3, 2, town(1));
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) put(objects, x + w + i, y + j, farm([7, 18, 20, 42, 43, 44][j * 3 + i]));
  for (let i = 0; i < 3; i++) put(objects, x + w + i, y - 1, town(81));
}
house('Rumah Kebun', 85, 65, 4, true);
house('Balai Desa', 101, 63, 6, false);
house('Rumah Barat', 78, 75, 4, false, true);
house('Rumah Timur', 112, 75, 5, true);
house('Rumah Petani', 83, 87, 5, true);
house('Rumah Sungai', 103, 89, 4, false);
house('Rumah Utara', 94, 56, 4, false);
// Gang menyambungkan pintu rumah ke jalan umum tanpa melewati bangunan.
route([[87, 69], [89, 72], [93, 76]], 1);
route([[104, 67], [104, 72], [99, 77]], 1);
route([[80, 79], [85, 79], [93, 80]], 1);
route([[114, 79], [109, 80], [100, 79]], 1);
route([[85, 91], [89, 89], [93, 82]], 1);
route([[105, 93], [104, 88], [99, 81]], 1);
route([[96, 60], [96, 69], [96, 76]], 1);
// Lapangan festival dan sumur: halaman pusat yang mudah dikenali.
rect(paths, 92, 75, 10, 9, town(43));
rect(paths, 94, 77, 6, 5, city(88));
put(objects, 90, 76, town(125)); collide('Sumur kering', 90 * T + 2, 76 * T + 6, 12, 10);
object('Landmarks', 'Sumur Desa', 'well', 90.5 * T, 76.5 * T, 0, 0, { label: 'Sumur Desa · air menipis', radiusPx: 42 }, true);
for (const [x, y] of [[93, 74], [101, 74], [93, 84], [101, 84]]) put(objects, x, y, city(86));
for (const [x, y, frame] of [[91, 81, 108], [102, 80, 109], [91, 82, 123], [102, 81, 124]]) put(objects, x, y, farm(frame));
// Kebun berpetak kecil, jalur irigasi, lumbung dan halaman berpagar.
rect(detail, 73, 84, 8, 7, town(25));
for (let y = 85; y <= 89; y += 2) for (let x = 74; x <= 79; x++) put(objects, x, y, farm(pick([7, 18, 19, 20, 42, 43])));
for (let x = 72; x <= 81; x++) { put(objects, x, 83, town(81)); put(objects, x, 91, town(81)); }
reserve(72, 83, 10, 9);
for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) put(objects, 74 + i, 94 + j, farm([[102, 103, 104], [114, 115, 116], [126, 127, 128]][j][i]));
collide('Lumbung', 74 * T, 95 * T, 48, 32); reserve(73, 93, 5, 5);

// Landmark misi: area eksperimen dan ruang interaksi bebas penghalang.
function landmark(name, x, y, label, radius = 45) {
  object('Landmarks', name, 'sign', (x + 0.5) * T, (y + 0.5) * T, 0, 0, { label, radiusPx: radius }, true);
  put(objects, x, y, town(115)); reserve(x, y, 1, 1);
}
landmark('Persimpangan barat', 84, 78, '↖ Puncak Kabut   ↙ Pantai Biru', 75);
landmark('Persimpangan timur', 110, 84, '↗ Lembah Hujan   ↘ Hutan & Sungai', 75);
landmark('Pantai', 58, 99, 'Pantai Biru · dua kolam batu', 65);
landmark('Puncak', 63, 44, 'Puncak Kabut · pos pengamatan', 65);
landmark('Lembah', 136, 41, 'Lembah Hujan · cekungan kering', 65);
landmark('Hutan', 139, 102, 'Hutan & Sungai · lahan tanam', 65);
// Pantai: dermaga, dua kolam kedap, dan area cermin.
rect(paths, 55, 102, 5, 6, city(88));
put(objects, 58, 102, town(106)); put(objects, 59, 103, city(91));
for (let x = 30; x < 40; x++) { put(paths, x, 119, city(13)); put(objects, x, 118, city(94)); }
reserve(29, 117, 12, 4);
// Puncak: teras batu dan jalur berkelok, tanpa sistem ketinggian.
for (const [cx, cy, rx, ry] of [[48, 31, 9, 5], [61, 42, 7, 4], [35, 48, 6, 3], [54, 48, 11, 3]]) {
  for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (land[index(x, y)] && d < 1) put(detail, x, y, d > 0.70 && y >= cy ? city(35) : town(25));
  }
}
rect(paths, 58, 41, 5, 4, city(88)); put(objects, 64, 40, farm(86)); put(objects, 63, 39, town(104));
// Lembah: ruang terbuka untuk efek awan dan hujan pada tahap berikutnya.
object('DevelopmentAreas', 'Ruang efek awan dan hujan', 'reserved', 134 * T, 31 * T, 18 * T, 9 * T, { purpose: 'future rain/cloud visual; no gameplay' });
rect(paths, 136, 43, 5, 5, town(43)); put(objects, 142, 45, town(106));
// Hutan: tanah gundul, bibit pohon, dan sumbatan sungai visual.
rect(paths, 139, 104, 5, 5, town(25));
for (const [x, y] of [[138, 110], [140, 111], [143, 110]]) put(objects, x, y, farm(2));
for (const [x, y] of [[158, 91], [159, 92], [160, 93]]) { put(objects, x, y, farm(26)); put(recovery.hutan.plants, x, y, battle(37)); }
object('Landmarks', 'Sungai tersumbat', 'river', 159 * T, 92 * T, 0, 0, { label: 'Ranting menumpuk di sungai', radiusPx: 45 }, true);

// Area misi dan koridor pengembangan bebas dekorasi yang menghalangi.
for (const r of regionDefs) reserve(r.target[0] - 2, r.target[1] - 2, 5, 5);
reserve(94, 77, 6, 5);
reserve(73, 25, 50, 6); reserve(75, 123, 49, 7);
function nearRoad(x, y, radius = 2) { for (let yy = y - radius; yy <= y + radius; yy++) for (let xx = x - radius; xx <= x + radius; xx++) if (at(road, xx, yy) || (inside(xx, yy) && paths.data[index(xx, yy)])) return true; return false; }
function regionAt(x, y) {
  if (x > 70 && x < 121 && y > 54 && y < 98) return undefined;
  return regionDefs.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)
    ?? [...regionDefs].sort((a, b) => Math.hypot(x - a.target[0], y - a.target[1]) - Math.hypot(x - b.target[0], y - b.target[1]))[0];
}
function free(x, y, w = 1, h = 1) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (!inside(xx, yy) || !at(land, xx, yy) || at(wet, xx, yy) || occupied[index(xx, yy)] || nearRoad(xx, yy, 1)) return false;
  return true;
}
// Kelompok pohon mengikuti pola organik dan kepadatan tiap biome.
let trees = 0, rocks = 0;
for (let i = 0; i < 36000; i++) {
  const x = 9 + Math.floor(random() * 175), y = 8 + Math.floor(random() * 128);
  const region = regionAt(x, y);
  if (!region || !free(x - 1, y - 2, 3, 3)) continue;
  const grove = Math.sin(x * 0.24) + Math.cos(y * 0.28) + Math.sin((x + y) * 0.13);
  const outskirts = y < 22 || y > 126 || x < 29 || x > 169;
  const density = region.id === 'hutan' ? 0.95 : region.id === 'puncak' ? 0.5 : region.id === 'lembah' ? 0.25 : 0.28;
  if (random() > density || grove < (region.id === 'hutan' || outskirts ? -1.8 : -0.1)) continue;
  const isDry = random() < (region.id === 'hutan' ? 0.48 : 0.28);
  const large = random() < 0.8;
  if (large) {
    // Pine utuh dua tile seperti Sample.png Kenney: atas 4 + bawah 16.
    // Frame 6–35 lainnya merupakan komponen autotile hutan, bukan sprite 3×3.
    put(above, x, y - 1, town(isDry ? 3 : 4));
    put(objects, x, y, town(isDry ? 15 : 16));
    if (isDry) { put(recovery[region.id].above, x, y - 1, town(4)); put(recovery[region.id].plants, x, y, town(16)); }
  } else {
    put(objects, x, y, town(isDry ? 27 : pick([5, 28])));
    if (isDry) put(recovery[region.id].plants, x, y, town(28));
  }
  collide(`tree_${trees++}`, x * T + 5, y * T + 8, 6, 7);
  occupied[index(x, y)] = 1;
  if (large) occupied[index(x, y - 1)] = 1;
}
for (let i = 0; i < 7500; i++) {
  const x = Math.floor(random() * W), y = Math.floor(random() * H);
  if (!free(x, y)) continue;
  const r = regionAt(x, y); if (!r) continue;
  const n = random();
  if (n < (r.id === 'puncak' ? 0.36 : 0.11)) {
    put(objects, x, y, battle(5)); collide(`rock_${rocks++}`, x * T + 3, y * T + 7, 10, 8); occupied[index(x, y)] = 1;
  } else if (n < 0.52) put(objects, x, y, r.id === 'pantai' ? farm(pick([52, 64, 79])) : farm(pick([3, 15, 27, 39, 40, 52, 53, 64, 65, 66, 78, 79])));
  else if (n < 0.62) put(detail, x, y, town(2));
}
// Kelompok bunga di dekat tempat istirahat, di luar jalan.
for (const [cx, cy] of [[47, 121], [166, 58], [44, 35], [134, 123]]) for (let j = 0; j < 28; j++) {
  const x = cx + Math.floor(random() * 9) - 4, y = cy + Math.floor(random() * 7) - 3;
  if (free(x, y)) put(objects, x, y, farm(pick([7, 18, 20, 42, 43, 44])));
}

// Pemulihan memakai tanaman asli, tanpa recolor seluruh atlas.
for (const r of regionDefs) {
  const [cx, cy] = r.target;
  const fresh = new Uint8Array(W * H); disk(fresh, cx, cy, 14, 10);
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
    if (at(fresh, x, y) && !at(wet, x, y)) put(recovery[r.id].terrain, x, y, town((x + y) % 7 ? 0 : 1));
    if (at(fresh, x, y) && !occupied[index(x, y)] && !nearRoad(x, y) && random() < 0.08) put(recovery[r.id].plants, x, y, farm(pick([7, 18, 20, 42])));
  }
}
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (at(valleyBasin, x, y)) put(recovery.lembah.water, x, y, battle(waterTile(valleyBasin, x, y)));
  for (const mask of beachBasins) if (at(mask, x, y)) put(recovery.pantai.water, x, y, battle(waterTile(mask, x, y)));
}
// Gang rumah digambar setelah jalan utama.
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(road, x, y) && !at(wet, x, y) && !paths.data[index(x, y)]) put(paths, x, y, town(soilTile(road, x, y)));

// Siluet NPC dekoratif; tidak menambahkan sistem dialog baru.
for (const [i, x, y] of [[0, 89, 70], [1, 109, 78], [2, 84, 93], [3, 98, 72]]) {
  put(objects, x, y, city(i % 2 ? 121 : 120));
  object('NPCSpawns', `village_npc_${i + 1}`, 'npc_spawn', (x + 0.5) * T, (y + 0.5) * T, 0, 0, { decorative: true, role: ['pekebun', 'warga', 'petani', 'panitia'][i] }, true);
}
object('Regions', 'Desa Tirta', 'region', 70 * T, 55 * T, 51 * T, 43 * T, { region: 'Desa Tirta', missionId: 'hub' });
for (const r of regionDefs) {
  object('Regions', r.title, 'region', r.x * T, r.y * T, r.w * T, r.h * T, { region: r.title, missionId: r.mission });
  const interactionName = { pantai: 'mission_beach', puncak: 'mission_mountain', lembah: 'mission_valley', hutan: 'mission_forest' }[r.id];
  object('Interactions', interactionName, 'interaction', r.target[0] * T, r.target[1] * T, T, T, { region: r.title, missionId: r.mission, mechanic: r.mechanic, radiusPx: 36 });
}
object('Interactions', 'festival', 'interaction', 98 * T, 79 * T, T, T, { region: 'Desa Tirta', missionId: 'M5', mechanic: 'matching', radiusPx: 36 });
object('Spawn', 'player_spawn', 'spawn', 96.5 * T, 79.5 * T, 0, 0, { direction: 'down' }, true);
for (const [name, objects] of Object.entries(objectLayers)) layers.push({ id: layers.length + 1, name, type: 'objectgroup', draworder: 'topdown', objects, opacity: 1, visible: !['FuturePaths', 'DevelopmentAreas', 'NPCSpawns', 'Collisions', 'Regions', 'Spawn'].includes(name), x: 0, y: 0 });

const waterFrames = [18, 19, 20, 36, 37, 38, 54, 55, 56];
for (const s of sets) {
  const image = `../../assets/${s.folder}/tilemap_packed.png`;
  const bitmap = readFileSync(resolve(root, 'world/assets', s.folder, 'tilemap_packed.png'));
  const tileset = { type: 'tileset', version: '1.10', tiledversion: '1.11.2', name: s.name, tilewidth: T, tileheight: T, tilecount: s.count, columns: s.columns, margin: 0, spacing: 0, image, imagewidth: bitmap.readUInt32BE(16), imageheight: bitmap.readUInt32BE(20), ...(s.name === 'tiny_city' ? { tiles: [{ id: 13, properties: props({ bridge: true }) }] } : {}), ...(s.name === 'tiny_battle' ? { tiles: waterFrames.map((id) => ({ id, properties: props({ collides: true }) })) } : {}) };
  mkdirSync(resolve(root, 'world/maps/tilesets'), { recursive: true });
  writeFileSync(resolve(root, `world/maps/tilesets/v3_${s.name}.tsj`), JSON.stringify(tileset, null, 2) + '\n');
}
const map = { type: 'map', version: '1.10', tiledversion: '1.11.2', orientation: 'orthogonal', renderorder: 'right-down', compressionlevel: -1, width: W, height: H, tilewidth: T, tileheight: T, infinite: false, nextlayerid: layers.length + 1, nextobjectid: nextObject, properties: props({ project: 'Petualangan Pulau Tirta', worldVersion: 3, playerTileset: 'tiny_city', playerFrame: 108, designSeed: 20261107 }), tilesets: sets.map((s) => ({ firstgid: s.first, source: `tilesets/v3_${s.name}.tsj` })), layers };
writeFileSync(resolve(root, 'world/maps/pulau_tirta_v3.tmj'), JSON.stringify(map) + '\n');
writeFileSync(resolve(root, 'world/world-contract-v3.json'), JSON.stringify({ version: 3, tileSize: T, width: W, height: H, spawn: { x: 96.5 * T, y: 79.5 * T }, interactions: objectLayers.Interactions, reservedCorridors: objectLayers.FuturePaths, notes: ['Sources editable in Tiled; generator is manual only.', 'NPCs decorative; no additional quests.', 'Before/after changes visual only; collider remains stable.'] }, null, 2) + '\n');
console.log(`V3: ${W}×${H}, ${trees} pohon, ${rocks} batu, ${layers.length} layers. Run world:export.`);
