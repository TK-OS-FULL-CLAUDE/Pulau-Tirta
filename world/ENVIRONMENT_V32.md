# World V3.2 — Environment overhaul Aufa

Implementasi untuk review pada branch `feature/world-aufa-pr`. Tidak melakukan commit,
push, merge, rebase, reset, perubahan `.env`, maupun instalasi dependency.

Peta aktif: [maps/pulau_tirta_v3_2.tmj](maps/pulau_tirta_v3_2.tmj).
Runtime: `public/maps/pulau-tirta-v3-2.json`. Ukuran tetap **192 × 144**, tile **16 × 16**,
3072 × 2304 px. V1, V3, V3.1, atlas dan screenshot terdahulu tetap tersimpan utuh.
Hash V3.1 dan kontrak dicatat di `v32-baseline.json`, diperiksa unit test.

## Review visual

Buka [halaman perbandingan lokal](previews/v32/review.html) di browser. Halaman ini
memakai gambar lokal tanpa server/dependency, dengan slider V3.1/V3.2, full map,
dan pemulihan V3.2. Ini alat review terpisah; tidak dimasukkan ke UI permainan.

| Area | Screenshot V3.2 |
| --- | --- |
| Puncak — kaki gunung | [kaki gunung](previews/v32/gameplay-v32-puncak-kaki.png) |
| Puncak — tikungan pendakian | [jalur](previews/v32/gameplay-v32-puncak-jalur.png) |
| Puncak — pos eksperimen | [pos pengembunan](previews/v32/gameplay-v32-puncak.png) |
| Puncak — teras pengamatan | [teras pandang](previews/v32/gameplay-v32-puncak-pandang.png) |
| Desa — permukiman | [rumah dan kebun](previews/v32/gameplay-v32-desa-rumah.png) |
| Desa — plaza dan sumur | [sebelum](previews/v32/gameplay-v32-desa-plaza-before.png), [festival](previews/v32/gameplay-v32-desa-plaza-after.png) |
| Pantai — dua kolam | [kolam](previews/v32/gameplay-v32-pantai.png), [pulih](previews/v32/gameplay-v32-pantai-after.png) |
| Pantai — dermaga | [pesisir](previews/v32/gameplay-v32-pantai-pesisir.png) |
| Lembah | [kering](previews/v32/gameplay-v32-lembah.png), [pulih](previews/v32/gameplay-v32-lembah-after.png) |
| Hutan dan sungai | [sebelum](previews/v32/gameplay-v32-hutan.png), [pulih](previews/v32/gameplay-v32-hutan-after.png) |
| Seluruh pulau | [V3.1](previews/v31/world-before.png), [V3.2 awal](previews/v32/world-before.png), [V3.2 pulih](previews/v32/world-after.png) |
| Build produksi offline | [screenshot](previews/v32/gameplay-v32-production-offline.png) |

Preview penuh berukuran 3072 × 2304 dan menggambar tile layer menurut depth/opacity;
tidak menggambar avatar bergerak, label dan penanda Phaser. Screenshot gameplay
diambil dari canvas game. Lokasi screenshot antardaerah tidak semuanya dapat dipakai
sebagai posisi berdiri; pengambilan gambar melakukan teleport untuk framing kamera.
Reachability diperiksa terpisah dengan algoritma gerak game dari spawn.

## Perubahan komposisi dari V3.1

| Wilayah | V3.1 | V3.2 |
| --- | --- | --- |
| Puncak Kabut | Pad gravel/ledge kecil, jalur melingkar, windsock | Tiga teras tanah/batu yang bergeser, muka tebing bertingkat dengan celah jalur, switchback, tangga visual, petunjuk, bangku istirahat, teras pandang berpagar, meja eksperimen dan windsock. Pinus kecil, boulder, semak dan kabut tipis membingkai ruang eksperimen yang tetap terbuka. |
| Desa Tirta | Tujuh rumah berjauhan, kebun terpisah | Tujuh rumah dengan lebar/atap/dinding bervariasi dirapatkan ke kelompok permukiman. Jalur ke pintu/plaza/kebun, dua kios kecil, pagar berpintu, empat kebun, bangku, papan informasi, pohon dan bunga. Sumur tampak kering lalu berair setelah festival; panji dan bunga memakai flag festival existing. |
| Pantai Biru | Basin bagus, vegetasi campuran termasuk pinus | Kedua basin batu serta cermin dipertahankan. Pohon dan tanaman kebun lama di hamparan pasir dibersihkan; kelompok palem, rumput pesisir, batu dan kerang ditempatkan di sisi rute. Dermaga bersambung dengan kepala dermaga, pembatas, tong dan petunjuk. |
| Lembah Hujan | Satu pad gravel dan air kecil | Cekungan tanah berlapis, tanah retak, kelompok batu tepi dan tiga kantong air dengan dasar/tepi kerikil. Setelah misi, kantong air meluas, tanaman pulih dan beberapa patch tanah lebih segar. |
| Hutan & Sungai | Hutan dan satu jembatan | Jalur woodland berkelok dengan loop, kelompok pinus/semak, batu besar, patch bibit, penanda dan kayu hanyut di tepi sungai. Deck jembatan asli dipertahankan penuh. Bibit dan tanaman tepian pulih mengikuti M4. |

Koordinat kelompok, jalur dan landmark ditentukan eksplisit dalam script; tidak ada
`Math.random` maupun sebaran dekorasi baru berdasarkan noise/seed. Script hanya alat
penulisan sumber Tiled. Area wilderness di luar komposisi yang disentuh masih mewarisi
V3.1; perubahan ini bukan penggantian semua vegetasi seluruh pulau.

## Kontrak dan gameplay

`Spawn`, `Interactions`, `Regions`, `NPCSpawns` dan `world-contract-v3.json` tetap identik.
Rumah dekoratif dipindah; posisi baru dan pintunya dicatat dalam `buildings-v32.json`.
Rute pendakian, titik pandang, pintu dan target eksplorasi ada di `environment-v32.json`.

| Tujuan | Pusat interaksi px |
| --- | --- |
| Spawn | 1544, 1272 |
| Pantai / misi-1 | 920, 1672 |
| Puncak / misi-2 | 968, 696 |
| Lembah / misi-3 | 2216, 728 |
| Hutan / misi-4 | 2264, 1704 |
| Festival | 1576, 1272 |

Movement, kamera, pemrosesan input, `PengaitDunia`, scoring, lock dialog, mode demo,
Tiko, backend dan konten misi tidak diubah. Perubahan runtime game hanya import map
aktif di `src/game/world-map.ts`. Tidak menambahkan mekanik pengembunan/awan/hujan.
Recovery tetap **16 layer / empat misi** dan **tiga layer festival** existing. Puncak
mendapat tiga patch padang rumput kecil dan bunga pulih di sekitar teras. Tidak
menambah progres atau kunci localStorage. Collision sebelum/sesudah pemulihan identik.
Tepi kantong air lembah tetap menjadi penghalang; air yang pulih tidak membuka atau
menutup akses baru. Kayu hanyut merupakan dekorasi; tidak ada mekanik membuka sumbatan.

Collision benda besar ditulis sebagai rectangle sesuai kaki bangunan, batang pohon,
boulder, pagar, bangku, kios dan muka tebing. Celah tangga dapat dilalui. Elevasi tetap
ilusi visual, tanpa perhitungan naik/turun atau scene tambahan.

## Aset dan placeholder

Sample/Preview Tiny Town, Tiny Farm dan Tiny Battle lokal ditinjau bersama preview
Tiny City lama dan atlas berindeks. Folder Tiny City yang tersedia tidak menyertakan
`Sample.png`/`Preview.png` Kenney asli; referensinya `TINYCITYFINAL/MAP_PREVIEW.png` dan
atlas legacy. Tidak mengunduh paket baru. Identitas/lisensi asli atlas legacy masih
memerlukan konfirmasi seperti yang sudah dicatat di `CREDITS.md`.

Empat atlas Kenney/legacy dan Tirta Props V3.1 tidak diedit. Aset baru berupa SVG
pixel-grid lokal, berkoordinat bulat dan `shape-rendering="crispEdges"`, terpisah dari
atlas Kenney: `world/assets/tirta_environment/tileset.svg` (256 × 128, 128 slot).
Tileset `v32_environment.tsj` menggunakan GID **755–882**, tanpa overlap.
Setiap slot 16 × 16; properti multi-tile dirakit di peta.

| Frame lokal | Placeholder yang dipakai |
| --- | --- |
| 0, 1, 2 | Tanah kaki gunung, gravel kehijauan, batu teras puncak |
| 3, 4, 29 | Tanah kering, patch tanah pulih, tanah retak |
| 5, 6, 8, 9 | Muka tebing atas/bawah, tangga visual, jalur pendakian |
| 10, 11, 12, 15, 30 | Rumput pesisir, tuft gunung, bunga pulih, kerang, tanaman kering |
| 16, 17 / 32, 33 | Boulder 2 × 2 |
| 24–27 | Kabut 4 × 1 dengan alpha rendah; layer opacity 0.5 |
| 28, 38 | Air kantong lembah, kerikil tepi kolam |
| 36, 37 | Meja batu dan alat pengembunan 2 × 1 |
| 40, 41 / 56, 57 / 72, 73 | Palem pesisir 2 × 3 |
| 44–46 / 60–62 | Overlay interior sumur kering 3 × 2 |
| 86–88 / 102–104 | Overlay air sumur festival 3 × 2 |
| 80–82 / 96–98 / 112–114 | Kios hasil kebun 3 × 3 |

Placeholder V3.1 yang tetap digunakan: basin batu, cermin, sumur, windsock, bangku,
panji dan dek kayu. Palem, tebing, boulder dan kios lokal masih perlu penilaian visual
tim agar gaya/palet benar-benar menyatu. Kabut statis dan tangga belum animasi;
tidak ada elevasi nyata, NPC baru atau dialog baru. Beberapa batas terrain dan kantong
air masih geometris pada grid. Penilaian kualitas final tetap memerlukan review Aufa.

## Struktur, performa dan file

Map aktif memiliki **36 layer (28 tile layer + 8 object group), enam atlas**, serta
**1631 rectangle collision**. Perubahan statis tetap berupa tilemap dengan culling;
tidak membuat sprite per dekorasi atau filter/partikel seluruh layar. Collision tetap
memakai spatial hash dan langkah gerak existing. Dua layer baru: `Environment_V32`
depth 1.5 (di bawah recovery), `Mountain_Mist_V32` depth 33. Recovery/festival dapat
menimpa detail tertentu tanpa menambah sistem runtime.

File baru:

- `scripts/detail-world-v32.mjs`: komposisi terarah dan atlas lokal; hanya dijalankan manual.
- `world/maps/pulau_tirta_v3_2.tmj`, `world/maps/tilesets/v32_environment.tsj`.
- `world/assets/tirta_environment/tileset.svg` dan salinan `public/assets/world/tirta_environment/tileset.svg`.
- `public/maps/pulau-tirta-v3-2.json`: ekspor embedded Phaser.
- `world/buildings-v32.json`, `world/environment-v32.json`, `world/v32-baseline.json`.
- `tests/world-v32.test.ts`, laporan ini, dan `world/previews/v32/` termasuk `review.html`.

File existing yang dimodifikasi:

- `src/game/world-map.ts`: import runtime V3.2.
- `scripts/export-world.mjs`: menambahkan ekspor V3.2 sambil mempertahankan versi lama.
- `scripts/check-world-browser.mjs`: validasi/screenshot V3.2, sudut gunung tambahan,
  gambar recovery seluruh wilayah, dan menghormati opacity saat membuat preview penuh.
- `vite.config.ts`: chunk data map V3.2.
- `README.md`, `world/README.md`, `public/maps/README.md`, `CREDITS.md`: panduan map aktif dan atribusi.

Backend `server/`, konten `content/`, kontrak `shared/`, UI, Tiko, dependency dan `.env`
tidak diubah. Hasil build berada di `dist` yang diabaikan Git.

## Edit dan pengujian

Buka TMJ V3.2 di Tiled, edit lalu ekspor. `dev` dan `build` hanya menjalankan exporter,
tidak pernah menjalankan generator/detailer. Untuk membuat versi komposisi dari awal,
`node scripts/detail-world-v32.mjs` menolak menimpa sumber yang sudah ada; `--force`
hanya untuk penggunaan manual setelah menyimpan backup edit artist. Jangan menjalankan
`--force` pada hasil edit Tiled yang ingin dipertahankan.

```powershell
npm.cmd run world:export
npm.cmd run world:check
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
# Terminal dev terpisah:
npm.cmd run dev
npm.cmd run world:browser
# Express pada localhost:3000 juga melayani dist yang sudah dibangun:
$env:WORLD_URL='http://localhost:3000'
node scripts/check-world-browser.mjs --production
```

Hasil verifikasi lokal:

- World export/check dan TypeScript: lulus.
- Unit test: **65/65, tujuh file**, termasuk seluruh 60 tes sebelumnya.
- BFS memakai `bisaBerdiri` dan `langkahGerak` asli: lima tujuan misi, semua pintu,
  titik switchback/pandang, dermaga, loop hutan dan sisi timur sungai terjangkau.
- Tes regresi menjaga seluruh tile deck jembatan V3.1. Satu ujung deck yang sempat
  hilang selama art pass ditemukan oleh tes tambahan dan diperbaiki sebelum review.
- Browser Chrome headless: enam atlas, spawn, gerak/kamera, input Tiko tidak menggerakkan
  pemain, konteks Tiko mock, dialog empat misi, lock input, recovery 16 layer, reload,
  gating festival, tiga layer perayaan, Enter/Spasi dan demo: lulus tanpa exception/HTTP error.
- Pengujian browser memakai teleport untuk membuka kelima interaksi; bukan rekaman
  berjalan manual sepanjang semua jalan. Akses fisik rute diperiksa melalui BFS di atas.
- Production build: lulus. Data map terpisah sekitar **1.96 MB / 49 KB gzip**; seluruh
  precache sekitar **8.63 MiB** termasuk peta arsip. Produksi memuat seluruh atlas dan
  service worker, lalu reload offline berhasil tanpa exception/HTTP error.

Screenshot dilihat kembali untuk mengecek komposisi, sambungan jembatan, kolam, dan
perbedaan pemulihan. Belum mengukur 60 FPS pada laptop fisik menengah, menyelesaikan
playtest pedagogis 10–15 menit, atau menguji tampilan lewat Tiled desktop. Build dan
tes fungsional tidak membuktikan kualitas visual sudah final.
