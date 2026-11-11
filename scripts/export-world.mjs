import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Sumber editor tetap memakai TSJ eksternal; Phaser menerima hasil embedded.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(root, 'world');
const check = process.argv.includes('--check');

function publish(path, data) {
  const bytes = Buffer.from(data);
  if (existsSync(path) && readFileSync(path).equals(bytes)) return;
  if (check) throw new Error(`Ekspor world belum diperbarui: ${relative(root, path)}. Jalankan npm run world:export.`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
}

for (const [editor, runtime] of [['pulau_tirta_forest_final.tmj', 'pulau-tirta-forest-final.json'], ['pulau_tirta_v36_r3.tmj', 'pulau-tirta-v36-r3.json'], ['pulau_tirta_v36_r2_structure.tmj', 'pulau-tirta-v36-r2-structure.json'], ['pulau_tirta.tmj', 'pulau-tirta.json'], ['pulau_tirta_v3.tmj', 'pulau-tirta-v3.json'], ['pulau_tirta_v3_1.tmj', 'pulau-tirta-v3-1.json'], ['pulau_tirta_v3_2.tmj', 'pulau-tirta-v3-2.json'], ['pulau_tirta_v34_a1.tmj', 'pulau-tirta-v34-a1.json'], ['pulau_tirta_v34_a11.tmj', 'pulau-tirta-v34-a11.json'], ['pulau_tirta_v34_a2.tmj', 'pulau-tirta-v34-a2.json'], ['pulau_tirta_v34_a3.tmj', 'pulau-tirta-v34-a3.json'], ['pulau_tirta_v34_a4.tmj', 'pulau-tirta-v34-a4.json'], ['pulau_tirta_v34_a5.tmj', 'pulau-tirta-v34-a5.json'], ['pulau_tirta_v35.tmj', 'pulau-tirta-v35.json'], ['pulau_tirta_v351.tmj', 'pulau-tirta-v351.json'], ['pulau_tirta_v36.tmj', 'pulau-tirta-v36.json'], ['pulau_tirta_v37.tmj', 'pulau-tirta-v37.json'], ['pulau_tirta_v38.tmj', 'pulau-tirta-v38.json'], ['pulau_tirta_v38_r1.tmj', 'pulau-tirta-v38-r1.json'], ['pulau_tirta_v38_r2.tmj', 'pulau-tirta-v38-r2.json'], ['pulau_tirta_v38_r3.tmj', 'pulau-tirta-v38-r3.json'], ['pulau_tirta_v38_r4.tmj', 'pulau-tirta-v38-r4.json'], ['pulau_tirta_v36_r1.tmj', 'pulau-tirta-v36-r1.json'], ['pulau_tirta_v36_r2.tmj', 'pulau-tirta-v36-r2.json'], ['pulau_tirta_v37_r1.tmj', 'pulau-tirta-v37-r1.json'], ['pulau_tirta_v37_r2.tmj', 'pulau-tirta-v37-r2.json']]) {
  const source = resolve(sourceRoot, 'maps', editor);
  const output = resolve(root, 'public/maps', runtime);
  const map = JSON.parse(readFileSync(source, 'utf8'));
  map.tilesets = map.tilesets.map(({ firstgid, source: tilesetSource }) => {
    const tilesetPath = resolve(dirname(source), tilesetSource);
    const tileset = JSON.parse(readFileSync(tilesetPath, 'utf8'));
    const imagePath = resolve(dirname(tilesetPath), tileset.image);
    const asset = relative(resolve(sourceRoot, 'assets'), imagePath);
    if (asset.startsWith('..') || resolve(sourceRoot, 'assets', asset) !== imagePath) {
      throw new Error('Gambar tileset harus berada dalam world/assets.');
    }
    const publishedImage = resolve(root, 'public/assets/world', asset);
    publish(publishedImage, readFileSync(imagePath));
    return { ...tileset, firstgid, image: relative(dirname(output), publishedImage).split(sep).join('/') };
  });

  publish(output, `${JSON.stringify(map)}\n`);
}
console.log(check ? 'World aktif termasuk Hutan final (basis R4), Puncak R3 dan Lembah R2 sesuai sumber Tiled.' : 'World aktif termasuk Hutan final (basis R4), Puncak R3 dan Lembah R2 diekspor (tileset embedded).');
