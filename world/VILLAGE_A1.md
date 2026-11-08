# V3.4-A1 — Pusat Desa Tirta

Pekerjaan pada `feature/world-aufa-pr`, tanpa commit, push, merge, reset atau rebase.
Perubahan V3.2/V3.3 yang belum di-commit dipertahankan, termasuk peta, aset dan preview
sebelumnya. Tidak menambah dependency atau mengubah `.env`, backend, Tiko maupun
sistem misi Evan.

## Review visual

Buka [halaman perbandingan](previews/v34-a1/review.html) di browser, atau gunakan
`http://localhost:5173/world/previews/v34-a1/review.html` ketika dev server berjalan.
Slider membandingkan plaza, preview pusat desa, serta kondisi sebelum/sesudah festival.

| Hasil wajib | Artefak |
| --- | --- |
| Plaza sebelum redesign | [V3.3, kamera (97,76)](previews/v33/gameplay-v33-desa-plaza-before.png) |
| Plaza setelah redesign | [A1, kamera (97,76)](previews/v34-a1/gameplay-v34-a1-desa-plaza-before.png) |
| Kawasan pasar | [dua kios dan sumur](previews/v34-a1/gameplay-v34-a1-desa-pasar.png) |
| Rumah dan pekarangan | [rumah, kebun, jalan ke plaza](previews/v34-a1/gameplay-v34-a1-desa-pekarangan.png) |
| Sesudah Festival Hujan | [plaza pulih dan panji](previews/v34-a1/gameplay-v34-a1-desa-plaza-after.png) |
| Preview area yang sama | [V3.3](previews/v34-a1/centre-v33.png), [A1 awal](previews/v34-a1/centre-a1.png), [A1 festival](previews/v34-a1/centre-festival.png) |
| Rekaman perjalanan pemain | [spawn–plaza–sumur–pasar–rumah](previews/v34-a1/village-a1-navigation.webm) |
| Produksi offline | [screenshot](previews/v34-a1/gameplay-v34-a1-production-offline.png) |

Kedua screenshot plaza memakai target kamera tile (97,76). NPC bergerak sehingga
posisinya dapat berbeda antargambar. Preview area memakai crop yang persis sama:
**608 × 320 px**, x78–115, y65–84. Preview menggambar tile layer, bukan pose sprite
runtime; gunakan screenshot dan video untuk melihat karakter/NPC sebenarnya.

## Batas perubahan dan komposisi

Area A1 hanya **38 × 20 tile**, mulai (78,65), berakhir sebelum (116,85). Ini meliputi
plaza, sumur, pasar dan empat rumah terdekat, sekitar dua sampai tiga framing kamera.
Seluruh tile di luar rectangle tersebut diperiksa identik dengan sumber V3.3/V3.2.
Collision di luar area juga identik; generator menolak perubahan collider yang
melintasi batas. Spawn, Interactions, Regions, NPCSpawns dan kontrak integrasi tetap.
Empat wilayah misi dan rumah utara/permukiman selatan tidak didesain ulang.

Desain mengikuti hubungan elemen pada Sample Tiny Town/Tiny Farm yang tersedia:

- **Plaza:** hamparan cobble hangat tersambung, sudut dipotong, empat kantong rumput
  dengan bangku/tanaman di tepi. Lantai tengah tetap lapang untuk spawn dan festival.
  Tile paving putih berbintik Tiny Town 43 dihilangkan hanya di area A1.
- **Sumur:** koordinat landmark (89.5,76.5) tetap. Pelataran batu menyambungkannya
  langsung dengan plaza dan pasar; kursi ditempatkan di sisi ruang berkumpul.
- **Pasar:** dua kios awning existing dipindahkan menjadi kelompok di barat sumur,
  pada (83,71) dan (84,77). Terdapat counter hasil panen, peti, wadah hasil kebun,
  bak kayu, papan pasar dan jalur pelanggan yang terbuka ke plaza.
- **Rumah:** jumlah tetap tujuh. Rumah Kebun, Balai Desa dan Rumah Timur tetap di
  tempatnya, dirakit ulang utuh dengan atap, dinding, pintu, jendela dan jalan masuk.
  Rumah Barat bergeser dua tile ke barat dan satu tile ke selatan, dari (81,76) ke
  (79,77), untuk memberi ruang bagi kios dan lorong pasar. Manifest dan collision
  diperbarui. Tiga rumah di luar pusat tetap identik.
- **Pekarangan:** kebun berpagar tetap terhubung dengan pintu gerbang; jalur menuju
  rumah utara melewati sisi kebun, bukan memotong baris tanaman. Pohon peneduh,
  bunga dan wadah hasil kebun ditempatkan sebagai kelompok kecil, tanpa sebaran acak.
- **Festival:** tetap tiga layer dan flag existing. Sumur awal kering, beberapa
  petak tanaman belum subur; setelah festival air sumur terlihat pulih, bunga muncul
  dan panji utara tampil. Panji selatan existing pada y85 dipertahankan agar tidak
  menambahkan dua baris panji yang bertumpuk di tepi bawah.

Tidak menambah NPC, progres, minigame atau dialog. Vegetasi/paving di luar A1 masih
memakai desain sebelumnya; penyelesaian seluruh desa merupakan tahap berikutnya.

## NPC dan living world

Sistem V3.3 tetap dipakai. Hanya waypoint warga pasar yang berubah menjadi
(87,74) → (87,76) → (87,78) → (90,78), bolak-balik dengan jeda yang sama. Rute ini
berada di lorong pelanggan, tidak memotong kios atau sumur. Tiga plan NPC lainnya
tidak berubah. Waypoint diperiksa memakai collision A1 dan simulasi tiga menit.

Import manifest bangunan mengikuti A1 agar pembersihan tile NPC dekoratif tidak
merusak dinding. Satu anchor animasi tanaman bergeser dari (90,79) ke bed (90,82).
Jumlah efek tetap: empat NPC, lima fog, 36 slot riak dan sepuluh tanaman. Player
animation fallback, culling, pause saat dialog/chat, angin dan air tetap berfungsi.
Pengecekan wilayah lain hanya regresi, tanpa perubahan art/terrain di sana.

## Aset dan keterbatasan visual

Sample Tiny Town dan Tiny Farm, atlas berindeks, serta screenshot V3.3 ditinjau ulang.
Tiny City lokal tidak memiliki Sample Kenney asli; yang tersedia adalah MAP_PREVIEW
prototype. Tidak mengambil paket aset baru.

- Rumah, jendela/pintu, pagar, pohon, papan dan bunga memakai Tiny Town yang ada.
- Peti, hasil kebun, bak kayu dan tong memakai Tiny Farm yang ada.
- Kios adalah **placeholder pixel-grid lokal V3.2**, bukan sprite kios resmi Kenney.
  Sumur, bangku, panji dan overlay sumur juga memakai properti lokal existing.
- Satu tileset lokal baru `village_a1`, GID **883–898**, 16 slot 16 × 16, SVG 128 × 32.
  Frame 0 cobble, 1 cobble moss tepi, 2 lantai pasar warna tanah, 3 tanah bed, 4 lantai
  tengah festival; frame 5 material cadangan dan slot lain belum dipakai. Atlas lama
  tidak direcolor atau ditimpa. Sumber ada di `world/assets/village_a1/tileset.svg`.

Paving masih berulang pada grid dan kios lokal belum mempunyai variasi detail/animasi
pedagang. Transisi ke jalan desa lama di luar batas A1 masih tampak berbeda. Taman
awal sengaja memiliki beberapa petak kering. Tidak mengklaim kualitas art final atau
kesetaraan dengan Sample resmi hanya berdasarkan build; reviewer perlu menilai
proporsi paving, ruang festival dan gaya placeholder lewat halaman perbandingan.
Spritesheet jalan empat arah dan pengukuran 60 FPS fisik masih belum tersedia.

## File baru dan perubahan

File baru A1:

- `scripts/design-village-a1.mjs`: penempatan terarah, penjagaan batas dan atlas lokal.
- `scripts/village-route-browser.mjs`: instrumen uji browser yang diserialisasi;
  tidak masuk bundle aplikasi.
- `world/maps/pulau_tirta_v34_a1.tmj`, `world/maps/tilesets/v34_a1_village.tsj`.
- `world/assets/village_a1/tileset.svg` beserta salinan `public/assets/world/village_a1/tileset.svg`.
- `public/maps/pulau-tirta-v34-a1.json`: hasil ekspor embedded Phaser.
- `world/buildings-v34-a1.json`, `world/village-a1.json`: manifest rumah, batas area,
  framing kamera dan titik rute uji.
- `tests/village-a1.test.ts`: empat pengujian scope, rumah, navigasi dan festival.
- Laporan ini serta `world/previews/v34-a1/`: screenshot, crop, video, evidence dan review HTML.

File existing yang diperbarui untuk A1:

- `src/game/world-map.ts`: peta aktif A1.
- `src/game/living-model.ts`: satu rute NPC pasar.
- `src/game/living-world.ts`: manifest rumah aktif dan satu anchor tanaman.
- `scripts/export-world.mjs`: ekspor tambahan A1, semua versi lama tetap tersedia.
- `scripts/check-world-browser.mjs`: profil A1, capture pasar/pekarangan, crop area,
  perjalanan tanpa teleport dan review video. Arsip screenshot/video V3.3 tidak ditimpa.
- `vite.config.ts`: chunk data peta A1.
- README, world README, public/maps README dan CREDITS: peta aktif dan atribusi.

`src/game/world.ts`, movement/camera/input, `server/`, `shared/`, `content/`, UI,
panel Tiko dan dependency tidak diubah pada tahap A1. TMJ/JSON V3.2, manifest lama,
atlas lama, serta arsip V3.3 tetap tersedia dan hash V3.3/V3.2 lama tetap lulus.

## Pengujian

```powershell
npm.cmd run world:check
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
# Dengan dev server dan API lokal aktif:
npm.cmd run world:browser
node scripts/check-world-browser.mjs --review
# Express juga melayani dist:
$env:WORLD_URL='http://localhost:3000'
node scripts/check-world-browser.mjs --production
```

- Validasi world dan TypeScript: lulus.
- **75/75 tes, sembilan file**: seluruh 71 tes sebelumnya dan empat tes A1.
- Batas scope: semua tile/collision di luar rectangle identik. Koordinat spawn,
  titik misi, Regions, NPCSpawns dan kontrak existing dipertahankan.
- BFS memakai `bisaBerdiri` dan `langkahGerak` asli mencapai semua tujuh pintu,
  tujuan misi, plaza, pelataran sumur dan kedua akses pasar. Semua collider A1
  menolak posisi kaki pada bagian tengahnya. Festival tidak mengubah solid mask.
- **Perjalanan browser nyata:** alat uji menggerakkan state tombol WASD dan membiarkan
  `DuniaScene.update` menjalankan movement/collision. Tidak memanggil `setPosition`
  selama rute spawn → plaza → sumur → pasar → Rumah Kebun. Koordinat yang berhasil
  dicapai dicatat di `previews/v34-a1/route-evidence.json`, dengan toleransi <1.9 px.
  Teleport tetap dipakai terpisah untuk framing screenshot dan regresi misi lain.
- Chrome: render tujuh atlas, gerak/idle/flip pemain, NPC/pause/culling, kabut, kedua
  frame windsock, riak laut/kolam/sungai, tanaman, prompt layar sempit, konteks Tiko
  mock, empat dialog misi, festival, recovery/reload, Enter/Spasi dan demo: lulus.
- Production build dan PWA offline: lulus. Bundle map sekitar 1.96 MB / 49 KB gzip;
  precache bertambah menjadi 24 entri / sekitar 10.51 MiB karena runtime map arsip
  V3.2 dipertahankan bersama A1. Video review berada di luar public/precache.
- Rekaman navigasi diputar dan di-seek di browser; frame gameplay diperiksa tidak
  kosong dan berubah. `browser-evidence.json` dan `video-evidence.json` mencatat hasil.

Generator hanya manual dan menolak menimpa sumber A1 tanpa `--force`. Dev/build hanya
mengekspor Tiled, tidak menjalankan desain ulang. Untuk edit artist berikutnya buka
TMJ A1, simpan, kemudian `npm run world:export`; jangan menimpa edit Tiled dengan
generator sebelum membuat backup.

Tahap A1 berhenti pada pusat desa. Belum mengerjakan A2, permukiman jauh atau empat
wilayah misi lainnya.
