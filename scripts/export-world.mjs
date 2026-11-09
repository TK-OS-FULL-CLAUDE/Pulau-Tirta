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

for (const [editor, runtime] of [['pulau_tirta.tmj', 'pulau-tirta.json'], ['pulau_tirta_v3.tmj', 'pulau-tirta-v3.json'], ['pulau_tirta_v3_1.tmj', 'pulau-tirta-v3-1.json'], ['pulau_tirta_v3_2.tmj', 'pulau-tirta-v3-2.json'], ['pulau_tirta_v34_a1.tmj', 'pulau-tirta-v34-a1.json'], ['pulau_tirta_v34_a11.tmj', 'pulau-tirta-v34-a11.json'], ['pulau_tirta_v34_a2.tmj', 'pulau-tirta-v34-a2.json'], ['pulau_tirta_v34_a3.tmj', 'pulau-tirta-v34-a3.json'], ['pulau_tirta_v34_a4.tmj', 'pulau-tirta-v34-a4.json'], ['pulau_tirta_v34_a5.tmj', 'pulau-tirta-v34-a5.json'], ['pulau_tirta_v35.tmj', 'pulau-tirta-v35.json'], ['pulau_tirta_v351.tmj', 'pulau-tirta-v351.json'], ['pulau_tirta_v36.tmj', 'pulau-tirta-v36.json'], ['pulau_tirta_v37.tmj', 'pulau-tirta-v37.json']]) {
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
console.log(check ? 'Ekspor V1–V3.7 Lembah sesuai sumber Tiled.' : 'V1–V3.7 Lembah diekspor (tileset embedded).');
