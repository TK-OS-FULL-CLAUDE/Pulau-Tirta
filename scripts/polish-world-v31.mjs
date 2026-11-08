/** Art pass pada salinan V3. Tidak menjalankan generator V3 atau mengubah koordinat.
 * Hasil tetap sumber Tiled editable. Jalankan manual; dev/build hanya ekspor. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'world/maps/pulau_tirta_v3_1.tmj');
if (existsSync(out) && !process.argv.includes('--force')) throw new Error('V3.1 sudah ada. Simpan edit Tiled sebelum memakai --force.');
const map = JSON.parse(readFileSync(resolve(root, 'world/maps/pulau_tirta_v3.tmj'), 'utf8'));
const W = map.width, H = map.height, T = 16;
const prop = (name, value) => ({ name, value, type: typeof value === 'boolean' ? 'bool' : typeof value === 'number' ? 'int' : 'string' });
const index = (x, y) => y * W + x;
const inMap = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const layer = (name) => map.layers.find((l) => l.name === name);
const put = (l, x, y, tile) => { if (inMap(x, y)) l.data[index(x, y)] = tile; };
const city = (n) => 1 + n, town = (n) => 133 + n, farm = (n) => 265 + n, battle = (n) => 397 + n, tirta = (n) => 595 + n;
const property = (o, name) => o.properties?.find((p) => p.name === name)?.value;
const ground = layer('Ground'), details = layer('TerrainDetails'), paths = layer('Paths'), water = layer('Water'), objects = layer('Objects'), above = layer('AbovePlayer');
function addLayer(name, depth, festival = false) {
  const result = { id: map.nextlayerid++, name, type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: !festival, properties: [prop('renderDepth', depth), ...(festival ? [prop('festival', true)] : [])], data: Array(W * H).fill(0) };
  map.layers.splice(map.layers.findIndex((l) => l.type === 'objectgroup'), 0, result); return result;
}
const facades = addLayer('Facades', 13);
const festivalGround = addLayer('Celebration_Desa_Terrain', 2, true);
const festivalObjects = addLayer('Celebration_Desa_Decor', 14, true);
const festivalAbove = addLayer('Celebration_Desa_Banners', 32, true);
const collision = layer('Collisions');
function obstacle(name, x, y, width, height) {
  collision.objects.push({ id: map.nextobjectid++, name, type: 'obstacle', x, y, width, height, rotation: 0, visible: true, properties: [prop('collides', true)] });
}
const rect = (l, x, y, w, h, tile) => { for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) put(l, x + dx, y + dy, typeof tile === 'function' ? tile(dx, dy) : tile); };
const ellipse = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1;
const hash = (x, y) => ((x * 17 + y * 29 + x * y * 3) >>> 0) % 11;
function clearDecor(x, y, w, h) {
  for (const l of map.layers.filter((l) => l.name === 'Objects' || l.name === 'AbovePlayer' || l.name.startsWith('Recovery_Plants_') || l.name.startsWith('Recovery_Canopy_'))) rect(l, x, y, w, h, 0);
  collision.objects = collision.objects.filter((o) => !((o.name.startsWith('tree_') || o.name.startsWith('rock_')) && o.x / T >= x && o.x / T < x + w && o.y / T >= y && o.y / T < y + h));
}
function paving(points, radius = 1, stone = true) {
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i], count = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 2));
    for (let step = 0; step <= count; step++) {
      const cx = ax + (bx - ax) * step / count, cy = ay + (by - ay) * step / count;
      for (let y = Math.floor(cy - radius); y <= cy + radius; y++) for (let x = Math.floor(cx - radius); x <= cx + radius; x++) {
        if (inMap(x, y) && Math.hypot(x - cx, y - cy) <= radius) put(paths, x, y, stone ? town(43) : tirta(hash(x, y) < 5 ? 4 : 0));
      }
    }
  }
}
// Hapus hamparan oranye besar, pertahankan jalan utama V3 serta patch kering kecil.
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = index(x, y), id = details.data[i];
  if (id >= town(12) && id <= town(42)) {
    const beach = ellipse(x, y, 47, 109, 30, 24);
    const dryPatches = ellipse(x, y, 148, 50, 10, 7) || ellipse(x, y, 143, 113, 8, 6);
    details.data[i] = beach ? tirta(hash(x, y) % 4) : dryPatches ? tirta(4) : 0;
  }
  if (id === city(35)) details.data[i] = tirta(5);
}
// Biome pesisir memakai pasir dan tepian pasir, tanpa mengganti seluruh laut.
for (let y = 83; y < 134; y++) for (let x = 14; x < 77; x++) {
  const i = index(x, y);
  if (!water.data[i] && ellipse(x, y, 45, 109, 30, 25)) {
    details.data[i] = tirta(hash(x, y) % 4);
    if (paths.data[i] >= town(12) && paths.data[i] <= town(42)) paths.data[i] = tirta(hash(x, y) % 4);
  }
}
const coastLookup = new Map([[18, 16], [19, 17], [20, 18], [36, 19], [37, 20], [38, 21], [54, 22], [55, 23], [56, 24]]);
for (let y = 83; y < 139; y++) for (let x = 10; x < 79; x++) {
  const i = index(x, y), frame = water.data[i] - battle(0);
  if (!coastLookup.has(frame)) continue;
  const nearSand = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inMap(x + dx, y + dy) && details.data[index(x + dx, y + dy)] >= tirta(0) && details.data[index(x + dx, y + dy)] <= tirta(3));
  if (nearSand) water.data[i] = tirta(coastLookup.get(frame));
}

// Desa: taman hijau, rumah utuh, pintu/jendela overlay di atas dinding asli.
clearDecor(71, 54, 52, 44);
rect(paths, 71, 54, 52, 44, 0); rect(details, 71, 54, 52, 44, 0);
const houseNames = ['Rumah Kebun', 'Balai Desa', 'Rumah Barat', 'Rumah Timur', 'Rumah Petani', 'Rumah Sungai', 'Rumah Utara', 'Lumbung', 'Sumur kering'];
collision.objects = collision.objects.filter((o) => !houseNames.includes(o.name));
const buildings = [];
function fence(x, y, w, h, gate = Math.floor(w / 2)) {
  for (let dx = 0; dx < w; dx++) {
    put(objects, x + dx, y, town(dx === 0 ? 44 : dx === w - 1 ? 46 : 45));
    if (dx !== gate && dx !== gate + 1) put(objects, x + dx, y + h - 1, town(dx === 0 ? 68 : dx === w - 1 ? 70 : 81));
  }
  for (let dy = 1; dy < h - 1; dy++) { put(objects, x, y + dy, town(56)); put(objects, x + w - 1, y + dy, town(58)); }
  obstacle(`fence_top_${x}_${y}`, x * T, y * T + 5, w * T, 5);
  obstacle(`fence_left_${x}_${y}`, x * T + 3, (y + 1) * T, 5, (h - 2) * T);
  obstacle(`fence_right_${x}_${y}`, (x + w - 1) * T + 8, (y + 1) * T, 5, (h - 2) * T);
}
function house(name, x, y, w, red, coolWall = false) {
  const top = red ? [52, 53, 54] : [48, 49, 50], roof = red ? [64, 65, 66] : [60, 61, 62];
  const walls = coolWall ? [76, 77, 79] : [72, 73, 75], middle = Math.floor(w / 2);
  for (let dx = 0; dx < w; dx++) {
    const edge = dx === 0 ? 0 : dx === w - 1 ? 2 : 1;
    put(above, x + dx, y, town(top[edge]));
    put(above, x + dx, y + 1, town(dx === middle ? red ? 67 : 63 : roof[edge]));
    put(objects, x + dx, y + 2, town(walls[edge])); put(objects, x + dx, y + 3, town(walls[edge]));
  }
  put(facades, x + middle, y + 3, town(coolWall ? 89 : 85));
  put(facades, x + 1, y + 2, town(coolWall ? 88 : 84));
  if (w > 4) put(facades, x + w - 2, y + 2, town(coolWall ? 90 : 86));
  obstacle(name, x * T + 2, (y + 2) * T, w * T - 4, 2 * T - 2);
  buildings.push({ name, x, y, width: w, height: 4, door: { x: x + middle, y: y + 3 }, roof: { red }, coolWall });
  paving([[x + middle, y + 4], [x + middle, y + 6]], 0.7);
}
house('Rumah Kebun', 85, 65, 4, true);
house('Balai Desa', 101, 63, 6, false, true);
house('Rumah Barat', 78, 75, 4, false);
house('Rumah Timur', 112, 75, 5, true, true);
house('Rumah Petani', 83, 87, 5, true);
house('Rumah Sungai', 103, 89, 4, false);
house('Rumah Utara', 94, 56, 4, true, true);
// Jalur cobblestone menyambungkan pintu dan rute V3, dengan plaza membulat.
for (const route of [ [[70, 56], [74, 65], [83, 68], [89, 72], [94, 76]], [[124, 57], [119, 68], [110, 70], [104, 69], [100, 76]], [[69, 95], [77, 93], [85, 93], [90, 90], [92, 84]], [[124, 101], [117, 91], [108, 87], [102, 82]], [[80, 79], [87, 80], [92, 80]], [[114, 79], [108, 80], [102, 80]], [[85, 93], [90, 88], [94, 83]], [[105, 95], [103, 88], [100, 83]], [[96, 60], [96, 69], [96, 75]], [[87, 69], [89, 72]], [[104, 67], [104, 69]] ]) paving(route, 0.85);
for (let y = 73; y <= 86; y++) for (let x = 87; x <= 107; x++) if (ellipse(x, y, 97.5, 79.5, 9, 6)) {
  const ring = ellipse(x, y, 97.5, 79.5, 8, 5) && !ellipse(x, y, 97.5, 79.5, 6.1, 3.1);
  const stage = ellipse(x, y, 98, 79.5, 2.3, 1.8);
  put(paths, x, y, ring || stage ? town(43) : 0);
}
// Sumur khusus dengan siluet batu dan tiang; bukan pintu kastil V3.
function stamp(l, x, y, frames) { frames.forEach((row, dy) => row.forEach((id, dx) => put(l, x + dx, y + dy, tirta(id)))); }
stamp(above, 88, 74, [[48, 49, 50]]);
stamp(objects, 88, 75, [[64, 65, 66], [80, 81, 82]]);
obstacle('Sumur Desa V31', 88 * T + 6, 76 * T, 36, 12);
for (const marker of layer('Landmarks').objects) if (marker.name === 'Sumur Desa') { marker.x = 89.5 * T; marker.y = 76.5 * T; marker.properties = [prop('label', 'Sumur Desa'), prop('radiusPx', 44)]; }
// Dua kebun rumah yang ditata sebagai bed, bukan sayur acak tersebar di halaman.
for (const [x, y, w, h] of [[90, 64, 6, 5], [108, 62, 6, 5], [107, 90, 6, 5]]) {
  fence(x, y, w, h);
  for (let dy = 1; dy < h - 1; dy++) for (let dx = 1; dx < w - 1; dx++) put(objects, x + dx, y + dy, farm(dy === 1 ? 17 : dy === 2 ? 18 : 20));
}
// Kebun produksi: baris tanaman berbeda, satu jalur servis dan gerbang lebar.
fence(72, 83, 10, 9, 6);
for (let y = 85; y <= 89; y += 2) for (let x = 74; x <= 79; x++) put(objects, x, y, farm(y === 85 ? 17 : y === 87 ? 66 : 30));
paving([[79, 91], [79, 93], [83, 93]], 0.8);
// Lumbung lengkap 3×5 dari modul atap segitiga, badan, dan pintu Tiny Farm.
for (let dy = 0; dy < 5; dy++) for (let dx = 0; dx < 3; dx++) {
  const rows = [[93, 94, 95], [105, 106, 107], [117, 118, 119], [102, 103, 104], [126, 127, 128]];
  put(dy < 3 ? above : objects, 74 + dx, 93 + dy, farm(rows[dy][dx]));
}
obstacle('Lumbung', 74 * T, 96 * T, 48, 32);
// Pohon desa diletakkan berpasangan di gerbang, taman dan sisi balai.
function pine(x, y, dry = false, mission) {
  put(above, x, y - 1, town(dry ? 3 : 4)); put(objects, x, y, town(dry ? 15 : 16));
  obstacle(`v31_pine_${x}_${y}`, x * T + 5, y * T + 8, 6, 7);
  if (mission) { put(layer(`Recovery_Canopy_${mission}`), x, y - 1, town(4)); put(layer(`Recovery_Plants_${mission}`), x, y, town(16)); }
}
for (const [x, y] of [[76, 70], [78, 68], [82, 64], [111, 67], [118, 73], [117, 82], [109, 96], [99, 93], [80, 86], [86, 60], [99, 60]]) pine(x, y);
for (const [x, y] of [[92, 73], [104, 74], [106, 84], [89, 84]]) { put(objects, x, y, farm(78)); put(objects, x + 1, y, town(29)); }
for (const [x, y] of [[92, 75], [103, 79], [94, 84]]) { stamp(objects, x, y, [[11, 12]]); obstacle(`Bangku ${x}`, x * T + 2, y * T + 8, 28, 6); }
for (const npc of layer('NPCSpawns').objects) put(objects, Math.floor(npc.x / T), Math.floor(npc.y / T), city(Number(npc.name.slice(-1)) % 2 ? 120 : 121));
// Papan arah memakai papan Tiny Town, bukan sprite palu.
for (const marker of layer('Landmarks').objects.filter((o) => o.type === 'sign')) put(objects, Math.floor(marker.x / T), Math.floor(marker.y / T), town(83));

// Pantai: dua basin utuh, lantai batu dan air dangkal terlihat sejak awal.
clearDecor(49, 100, 18, 12);
rect(paths, 49, 100, 18, 12, 0);
const basinFrames = Array.from({ length: 5 }, (_, y) => Array.from({ length: 5 }, (_, x) => 58 + y * 16 + x));
collision.objects = collision.objects.filter((o) => !o.name.startsWith('basin_1_') && !o.name.startsWith('basin_2_'));
for (const x of [50, 61]) {
  stamp(objects, x, 102, basinFrames);
  obstacle(`Kolam batu ${x}`, x * T + 4, 102 * T + 4, 72, 72);
  rect(layer('Recovery_Water_Pantai_Biru'), x - 2, 100, 9, 10, 0);
  stamp(layer('Recovery_Plants_Pantai_Biru'), x + 1, 103, [[96, 97, 98], [112, 113, 114], [128, 129, 130]]);
}
stamp(objects, 58, 100, [[52, 53], [68, 69]]);
obstacle('Cermin pajangan', 58 * T + 5, 101 * T + 9, 23, 5);
paving([[57, 100], [57, 104], [57, 110]], 0.7, false);
// Tepi kolam tidak ditutupi rumput pemulihan; perubahan terlokalisasi.
rect(layer('Recovery_Pantai_Biru'), 49, 100, 18, 9, 0);

// Puncak: hilangkan pad abu-abu, buat teras batu berundak dan ruang angin.
clearDecor(54, 37, 14, 13); rect(paths, 54, 37, 14, 13, 0);
for (const [cx, cy, rx, ry] of [[48, 31, 9, 5], [61, 42, 7, 4], [35, 48, 6, 3], [54, 48, 11, 3]]) {
  for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) if (ellipse(x, y, cx, cy, rx, ry)) put(details, x, y, tirta(32));
  for (let x = cx - rx + 1; x < cx + rx; x++) {
    const yy = cy + Math.floor(ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2)));
    if (x < cx - 1 || x > cx + 2) put(details, x, yy, tirta(33 + (x % 3)));
  }
}
paving([[60, 37], [57, 39], [60, 43], [62, 48], [63, 51]], 0.85, false);
stamp(objects, 63, 39, [[55, 56], [71, 72], [87, 88]]);
obstacle('Tiang windsock', 63 * T + 6, 41 * T + 8, 8, 5);
for (const [x, y] of [[54, 39], [56, 46], [66, 43], [65, 48]]) { put(objects, x, y, farm(89)); obstacle(`batu_puncak_${x}`, x * T + 3, y * T + 8, 10, 7); }
for (const [x, y] of [[53, 37], [53, 38], [67, 45], [68, 44]]) pine(x, y, true, 'Puncak_Kabut');

// Lembah: cekungan berlekuk, tanpa lantai abu-abu luas atau plaza persegi.
clearDecor(136, 42, 7, 7); rect(paths, 136, 42, 7, 7, 0);
for (let y = 43; y <= 57; y++) for (let x = 144; x <= 163; x++) {
  if (details.data[index(x, y)] === tirta(5)) details.data[index(x, y)] = tirta(hash(x, y) < 6 ? 4 : 5);
}
paving([[136, 42], [138, 45], [143, 47]], 0.75);
for (const [x, y] of [[134, 44], [135, 47], [140, 48], [142, 44]]) put(objects, x, y, farm(83));
// Recovery lembah: air mengikuti bentuk basin V3, tepi bergravel dipertahankan.
const valleyAfter = layer('Recovery_Water_Lembah_Hujan');
rect(valleyAfter, 144, 49, 3, 4, 0); rect(valleyAfter, 159, 44, 3, 3, 0);
for (let y = 43; y <= 57; y++) for (let x = 144; x <= 163; x++) if (valleyAfter.data[index(x, y)]) {
  const has = (xx, yy) => inMap(xx, yy) && Boolean(valleyAfter.data[index(xx, yy)]);
  const n = !has(x, y - 1), s = !has(x, y + 1), w = !has(x - 1, y), e = !has(x + 1, y);
  put(valleyAfter, x, y, battle(n ? w ? 18 : e ? 20 : 19 : s ? w ? 54 : e ? 56 : 55 : w ? 36 : e ? 38 : 37));
}

// Hutan: lokasi tanam dibaca sebagai bed bibit, bukan pad tanah persegi.
rect(paths, 139, 104, 5, 5, 0);
paving([[136, 103], [141, 106], [149, 106]], 1, false);
for (const [x, y] of [[138, 110], [140, 111], [143, 110]]) { put(objects, x, y, 0); put(layer('Recovery_Plants_Hutan_Sungai'), x, y, 0); }
for (const [x, y] of [[138, 111], [142, 111], [146, 111]]) {
  put(details, x - 1, y, farm(48)); put(details, x, y, farm(49)); put(details, x + 1, y, farm(50));
  put(objects, x, y, farm(16)); put(layer('Recovery_Plants_Hutan_Sungai'), x, y, farm(40));
}
// Sumbatan: beberapa batang utuh, bukan potongan pohon yang terpencar di darat.
for (const [x, y] of [[158, 91], [159, 92], [160, 93]]) { put(objects, x, y, town(106)); put(layer('Recovery_Plants_Hutan_Sungai'), x, y, battle(37)); }
for (let x = 153; x <= 163; x++) for (let y = 105; y <= 107; y++) put(paths, x, y, tirta(6 + ((x + y) % 2)));
for (let x = 30; x < 40; x++) put(paths, x, 119, tirta(6 + (x % 2)));

// Festival memakai flag existing festivalSelesai; tidak membuat status baru.
for (let y = 73; y <= 86; y++) for (let x = 87; x <= 107; x++) if (ellipse(x, y, 97.5, 79.5, 9.5, 6.5) && !paths.data[index(x, y)]) put(festivalGround, x, y, town(hash(x, y) < 3 ? 2 : 1));
for (const [x, y] of [[91, 74], [104, 75], [91, 84], [104, 84]]) { put(festivalObjects, x, y, farm(83)); put(festivalObjects, x + 1, y, town(29)); }
for (let x = 91; x <= 104; x++) put(festivalAbove, x, 71, tirta(x === 91 ? 8 : x === 104 ? 10 : 9));

const tileset = { type: 'tileset', version: '1.10', tiledversion: '1.11.2', name: 'tirta_props', tilewidth: 16, tileheight: 16, tilecount: 160, columns: 16, margin: 0, spacing: 0, image: '../../assets/tirta_props/tileset.svg', imagewidth: 256, imageheight: 160,
  tiles: [...Array.from({ length: 9 }, (_, i) => ({ id: 16 + i, properties: [prop('collides', true)] })), ...[6, 7].map((id) => ({ id, properties: [prop('bridge', true)] }))] };
writeFileSync(resolve(root, 'world/maps/tilesets/v31_tirta_props.tsj'), JSON.stringify(tileset, null, 2) + '\n');
map.tilesets.push({ firstgid: 595, source: 'tilesets/v31_tirta_props.tsj' });
map.properties = map.properties.filter((p) => p.name !== 'worldVersion'); map.properties.push(prop('worldVersion', '3.1'));
writeFileSync(out, JSON.stringify(map) + '\n');
writeFileSync(resolve(root, 'world/buildings-v31.json'), JSON.stringify(buildings, null, 2) + '\n');
console.log('V3.1 art pass tersimpan; V3 tidak diubah. Jalankan world:export.');
