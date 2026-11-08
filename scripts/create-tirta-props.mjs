/** Properti pixel-grid SVG lokal: tidak memakai aset eksternal atau merecolor Kenney.
 * Bagian yang tidak ada di pack (sumur, cermin, windsock, basin batu) diberi bentuk
 * eksplisit, bukan memakai jendela, pintu kastil atau alat pertanian sebagai pengganti. */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const parts = [];
const C = { outline: '#49333b', stone: '#a9afba', light: '#d0d5dc', shade: '#787e90', sand: '#edcf91', grain: '#d6b97d', foam: '#f8efd7', water: '#84deed', deep: '#59bfd7', wood: '#a46f50', woodLight: '#ca9565', woodDark: '#724d45', green: '#88c568' };
const rect = (x, y, w, h, c) => parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C[c] ?? c}"/>`);
const tile = (id, draw) => draw((id % 16) * 16, Math.floor(id / 16) * 16);
for (let id = 0; id < 4; id++) tile(id, (x, y) => {
  rect(x, y, 16, 16, 'sand');
  for (const [dx, dy] of [[2 + id, 4], [10, 12 - id], [7, 8]]) { rect(x + dx, y + dy, 2, 1, 'grain'); rect(x + dx, y + dy - 1, 1, 1, 'foam'); }
});
tile(4, (x, y) => { rect(x, y, 16, 16, '#c7bb96'); rect(x + 2, y + 5, 3, 1, '#a69c83'); rect(x + 11, y + 12, 2, 2, '#b3a68a'); });
tile(5, (x, y) => { rect(x, y, 16, 16, '#b6b098'); rect(x + 1, y + 2, 3, 2, '#cfc8af'); rect(x + 9, y + 10, 3, 1, '#8b8e82'); });
for (const id of [6, 7]) tile(id, (x, y) => {
  rect(x, y, 16, 16, 'wood');
  for (let dy = 0; dy < 16; dy += 4) { rect(x, y + dy, 16, 1, 'woodDark'); rect(x, y + dy + 1, 16, 1, 'woodLight'); }
  rect(x + (id === 6 ? 3 : 12), y + 6, 1, 1, 'woodDark'); rect(x + 9, y + 14, 1, 1, 'woodDark');
});
// Tali dan panji festival; tidak memakai bendera kastil sebagai dekorasi.
for (const id of [8, 9, 10]) tile(id, (x, y) => {
  rect(x, y + 3, 16, 1, 'woodDark');
  for (const [dx, color] of [[2, '#d97059'], [10, '#ebc663']]) { rect(x + dx, y + 4, 5, 3, color); rect(x + dx + 1, y + 7, 3, 2, color); rect(x + dx + 2, y + 9, 1, 1, color); }
  if (id !== 9) { rect(x + (id === 8 ? 1 : 13), y + 1, 2, 15, 'outline'); rect(x + (id === 8 ? 2 : 14), y + 1, 1, 15, 'woodLight'); }
});
// Bangku taman dua tile (11,12), dengan sandaran, dudukan dan kaki.
{
  const x = 176, y = 0;
  rect(x + 2, y + 2, 28, 5, 'outline'); rect(x + 3, y + 3, 26, 2, 'woodLight');
  rect(x + 1, y + 8, 30, 4, 'outline'); rect(x + 2, y + 8, 28, 2, 'wood');
  rect(x + 4, y + 12, 3, 3, 'woodDark'); rect(x + 25, y + 12, 3, 3, 'woodDark');
}
// Pasangan tepian air ke pasir, orientasi sama dengan Battle 18..56.
const shores = [[1, 0, 1, 0], [1, 0, 0, 0], [1, 0, 0, 1], [0, 0, 1, 0], [0, 0, 0, 0], [0, 0, 0, 1], [0, 1, 1, 0], [0, 1, 0, 0], [0, 1, 0, 1]];
shores.forEach(([n, s, w, e], k) => tile(16 + k, (x, y) => {
  rect(x, y, 16, 16, 'water');
  rect(x + 4, y + 8, 3, 1, '#c7f4f5'); rect(x + 12, y + 13, 2, 1, '#b4edf2');
  if (n) { rect(x, y, 16, 3, 'sand'); rect(x, y + 3, 16, 1, 'foam'); rect(x, y + 4, 16, 1, 'deep'); }
  if (s) { rect(x, y + 13, 16, 3, 'sand'); rect(x, y + 12, 16, 1, 'foam'); rect(x, y + 11, 16, 1, 'deep'); }
  if (w) { rect(x, y, 3, 16, 'sand'); rect(x + 3, y, 1, 16, 'foam'); rect(x + 4, y, 1, 16, 'deep'); }
  if (e) { rect(x + 13, y, 3, 16, 'sand'); rect(x + 12, y, 1, 16, 'foam'); rect(x + 11, y, 1, 16, 'deep'); }
}));
// Material tebing stylized, bukan simulasi elevasi.
tile(32, (x, y) => { rect(x, y, 16, 16, '#b9b69d'); rect(x + 3, y + 5, 2, 1, '#d4ceb5'); rect(x + 11, y + 10, 3, 1, '#999d8b'); });
for (const id of [33, 34, 35]) tile(id, (x, y) => {
  rect(x, y, 16, 3, '#d4ceb5'); rect(x, y + 3, 16, 2, '#858576'); rect(x, y + 5, 16, 8, '#a19e88'); rect(x, y + 13, 16, 2, '#757a6c'); rect(x, y + 15, 16, 1, '#5c6258');
  rect(x + (id === 34 ? 4 : 10), y + 6, 1, 5, '#858576'); rect(x + 2, y + 7, 4, 1, '#b9b69d');
});
// Sumur 3×3, frame 48..50 / 64..66 / 80..82.
{
  const x = 0, y = 48;
  rect(x + 8, y + 4, 32, 2, 'outline'); rect(x + 4, y + 6, 40, 3, 'woodDark');
  rect(x + 7, y + 9, 34, 2, 'woodLight'); rect(x + 10, y + 11, 3, 23, 'outline'); rect(x + 11, y + 11, 2, 21, 'wood');
  rect(x + 35, y + 11, 3, 23, 'outline'); rect(x + 35, y + 11, 2, 21, 'woodLight'); rect(x + 24, y + 11, 1, 13, 'woodDark');
  rect(x + 9, y + 28, 30, 13, 'outline'); rect(x + 6, y + 31, 36, 7, 'outline'); rect(x + 9, y + 26, 30, 12, 'light'); rect(x + 6, y + 29, 36, 5, 'stone');
  rect(x + 12, y + 28, 24, 6, 'outline'); rect(x + 15, y + 30, 18, 3, 'deep'); rect(x + 9, y + 35, 30, 6, 'stone');
  for (const dx of [16, 25, 34]) rect(x + dx, y + 35, 1, 6, 'shade'); rect(x + 9, y + 40, 30, 2, 'shade');
}
// Cermin 2×2 (52,53 / 68,69), kaca dan kaki khusus.
{
  const x = 64, y = 48;
  rect(x + 4, y + 2, 22, 20, 'outline'); rect(x + 6, y + 4, 18, 16, 'woodLight'); rect(x + 8, y + 5, 14, 13, '#d5f3f5');
  rect(x + 9, y + 7, 4, 2, '#ffffff'); rect(x + 12, y + 9, 4, 2, '#ffffff'); rect(x + 16, y + 11, 4, 2, '#ffffff');
  rect(x + 14, y + 22, 3, 5, 'woodDark'); rect(x + 8, y + 27, 15, 3, 'outline'); rect(x + 10, y + 26, 11, 2, 'wood');
}
// Windsock 2×3 (55,56 /71,72 /87,88), mengisyaratkan angin.
{
  const x = 112, y = 48;
  rect(x + 7, y + 4, 3, 39, 'outline'); rect(x + 8, y + 4, 1, 38, 'woodLight'); rect(x + 5, y + 42, 9, 3, 'shade');
  rect(x + 10, y + 5, 17, 8, 'outline'); rect(x + 11, y + 6, 14, 6, '#d97059'); rect(x + 16, y + 6, 3, 6, 'foam'); rect(x + 23, y + 7, 5, 4, '#d97059');
}
// Kolam batu 5×5, frame 58..62 /74..78 /90..94 /106..110 /122..126.
{
  const x = 160, y = 48;
  rect(x + 8, y + 4, 64, 72, 'outline'); rect(x + 4, y + 8, 72, 64, 'outline');
  rect(x + 8, y + 6, 64, 68, 'stone'); rect(x + 6, y + 9, 68, 60, 'stone'); rect(x + 10, y + 8, 60, 3, 'light');
  rect(x + 14, y + 14, 52, 52, 'shade'); rect(x + 16, y + 16, 48, 48, '#b7c0ca');
  for (let dy = 20; dy < 60; dy += 10) for (let dx = 20; dx < 60; dx += 10) { rect(x + dx, y + dy, 4, 2, '#8e9baa'); rect(x + dx, y + dy - 1, 4, 1, '#d0d5dc'); }
  rect(x + 16, y + 42, 48, 22, '#8ed4df'); rect(x + 17, y + 42, 46, 1, 'foam');
  for (const [dx, dy] of [[22, 49], [42, 57], [54, 48]]) { rect(x + dx, y + dy, 5, 1, '#d3edef'); rect(x + dx + 1, y + dy + 5, 3, 1, '#829faa'); }
  for (const dx of [20, 40, 60]) { rect(x + dx, y + 6, 1, 8, 'shade'); rect(x + dx, y + 66, 1, 8, 'shade'); }
  for (const dy of [20, 40, 60]) { rect(x + 6, y + dy, 8, 1, 'shade'); rect(x + 66, y + dy, 8, 1, 'shade'); }
}
// Air pulih 3×3, tetap memperlihatkan batu dasar melalui detail air dangkal.
{
  const x = 0, y = 96;
  rect(x, y, 48, 48, '#8ed4df');
  for (const [dx, dy] of [[4, 4], [23, 7], [35, 26], [9, 35], [29, 39]]) { rect(x + dx, y + dy, 6, 1, '#dbf1ef'); rect(x + dx + 2, y + dy + 4, 3, 1, '#829faa'); }
}
writeFileSync(resolve(root, 'world/assets/tirta_props/tileset.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="160" viewBox="0 0 256 160" shape-rendering="crispEdges">${parts.join('')}</svg>\n`);
console.log('Properti Tirta SVG pixel-grid diperbarui (256×160).');
