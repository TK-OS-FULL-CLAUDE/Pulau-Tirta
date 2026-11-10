# Gameplay & World Aufa

**Peta aktif Lembah V3.7-R2, berbasis world Puncak R2 dan Hutan R4 terbaru:** `world/maps/pulau_tirta_v37_r2.tmj`.
Sumber manual: `scripts/polish-lembah-v37-r2.mjs`; atlas lokal: `scripts/valley-v37-r2-art.mjs`; manifest: `world/valley-v37-r2.json`. Satu bukaan di tile(128,56..58) menghubungkan pendekatan Desa ke jalur turun melengkung dan dasar lembah terbuka. Dua puluh satu tile jalur memakai treads menurun; 32 tile bekas lintasan sisi ditutup oleh bank terlihat. Ada 187 collider bank lokal16 x 16, mengikuti kontur asimetris dengan bidang lebih tebal di utara/timur. Semua collider lama tetap utuh. Penutupan sementara entrance dalam tes grid2px delapan arah dari seluruh tepi wilayah meniadakan akses ke dasar dan radius interaksi misi; tidak ada pintu/progres baru dalam game. Genangan tetap pada koordinat/bentuk air R1, dengan lumpur berupa endapan parsial, bukan cincin gelap. Layer alur basah, tanah lembap, vegetasi, canopy, misi dan wilayah lain tetap utuh. Dev/build mengekspor Tiled tersimpan; generator menolak overwrite tanpa `--force`. Gunakan `node scripts/polish-lembah-v37-r2.mjs --check` dan `npm run world:export` sesudah edit Tiled.

**Arsip Lembah V3.7-R1, berbasis world Puncak R2/Hutan R4:** `world/maps/pulau_tirta_v37_r1.tmj`.
Sumber manual: `scripts/polish-lembah-v37-r1.mjs`; komposisi terrain: `scripts/valley-v37-r1-art.mjs`; manifest: `world/valley-v37-r1.json`. Cekungan utama7 x 5, rembesan barat5 x 3 dan tampungan utara5 x 3 tetap dalam collider lama, dengan tepian terbuka/asimetris. Empat alur dangkal menghubungkan lereng ke kantong sekunder lalu cekungan utama; air memakai piksel tile37 Tiny Battle existing, tanpa mengubah PNG. Bidang lereng lebar, dataran rendah bersilt dan lima tile transisi jalan menggantikan garis tebing tipis dan hamparan krem. Recovery misi-3 memakai empat layer lama: air meluas, 34 tile alur basah, 44 tile tanah lembap, tujuh tile hijau lokal dan tiga rumpun kecil yang pulih. Semua collider, jejak jalur, objek kontrak dan wilayah lain identik Puncak R2. Lereng bersifat visual; alur dangkal dapat dilintasi sesuai navigasi existing. Tidak ada collider atau sistem gameplay baru. Dev/build hanya mengekspor sumber tersimpan; generator memerlukan `--force` untuk overwrite. Jalankan `node scripts/polish-lembah-v37-r1.mjs --check` dan `npm run world:export` setelah edit Tiled.

**Arsip Puncak V3.6-R2, berbasis world Hutan R4:** `world/maps/pulau_tirta_v36_r2.tmj`.
Sumber manual: `scripts/polish-puncak-v36-r2.mjs`; atlas ridge lokal: `scripts/puncak-v36-r2-art.mjs`; manifest: `world/mountain-v36-r2.json`. Entrance tetap di batas Desa, tile(69,60..61). Dua tangga tile(39,55) dan(65,47) menjadi lintasan wajib antarteras, tanpa pintu/progres/mekanik tambahan. Jalur pandang barat dicapai dari puncak; jalan palsu dan paving berlebih dirapikan. Ada 350 collider ridge lokal16 x 16 yang sama persis dengan tile batu terlihat pada `Mountain_V36R2_Ridges`; semua objek/collider lama, engine, misi, recovery dan wilayah lain tetap utuh. Uji navigasi memakai collider runtime dan flood-fill2px delapan arah dari seluruh tepi wilayah serta overlap Desa: penutupan entrance atau salah satu tangga membuat misi tidak dapat dicapai, termasuk radius interaksinya. Seluruh permukaan gunung di luar koridor dan tempat istirahat tertutup dari akses pemain. Dev/build hanya mengekspor Tiled tersimpan; gunakan `node scripts/polish-puncak-v36-r2.mjs --check` untuk determinisme dan `npm run world:export` sesudah menyimpan edit Tiled.

**Arsip Puncak V3.6-R1:** `world/maps/pulau_tirta_v36_r1.tmj`.
Sumber manual: `scripts/polish-puncak-v36-r1.mjs`; atlas lokal: `scripts/puncak-v36-r1-art.mjs`; manifest: `world/mountain-v36-r1.json`. Tiga material besar membedakan kaki, lereng dan puncak; 38 kolom tebing dua tile memakai bidang vertikal gelap, rim terang dan bayangan jatuh. Dua tangga existing dan ambang pendek ke gardu tetap pada rute lama; pos, deck, windsock, kabut dan recovery tidak berubah. Seluruh collider dan solid mask identik R4. Tidak ada dinding tambahan pada ruang yang bisa dilalui; kolom tebing di luar batas Puncak tetap utuh. Dev/build hanya mengekspor Tiled tersimpan; generator menolak overwrite tanpa `--force`. Jalankan `node scripts/polish-puncak-v36-r1.mjs --check` untuk determinisme dan `npm run world:export` setelah menyimpan edit Tiled.

**Arsip V3.8-R4, Hutan & Sungai bergaya original:** `world/maps/pulau_tirta_v38_r4.tmj`.
Sumber manual: `scripts/polish-hutan-v38-r4.mjs`; manifest: `world/forest-v38-r4.json`. Tambahan 121 pohon dalam 17 kelompok menebalkan kedua sisi jalur, pondok dan interior; 87 detail rendah membentuk lapisan semak/rumput/bunga. Interior meningkat 334 menjadi 451 pohon. Collider baru hanya pada batang 6 x 7 piksel. Sambungan air original di baris104/108 diperbaiki; bentang papan di atas air dipersingkat 11 menjadi 3 tile, sementara pagar bercollider lama dipertahankan sebagai pagar jalan tanah pendekatan. Mask collision air/jembatan, seluruh collider lama, pondok, recovery dan wilayah lain tetap identik R3. Memperpendek pagar fisik memerlukan perubahan collider terpisah. Tidak ada atlas/gambar baru. Tes R4 memeriksa jalur dari spawn, seluruh interaksi, pondok, kedua sisi jembatan, seluruh jalur hutan lama yang dapat dilalui dan waypoint NPC. Setelah edit Tiled jalankan `npm run world:export`; dev/build hanya mengekspor sumber tersimpan. Generator menolak overwrite tanpa `--force`; `node scripts/polish-hutan-v38-r4.mjs --check` memeriksa determinisme tanpa menulis.

Arsip R3: `world/maps/pulau_tirta_v38_r3.tmj`, `scripts/polish-hutan-v38-r3.mjs`, `world/forest-v38-r3.json`; 93 batang baru dan 66 peningkatan tajuk native tetap tersimpan utuh.

Arsip R2: `world/maps/pulau_tirta_v38_r2.tmj`, `scripts/polish-hutan-v38-r2.mjs`, `world/forest-v38-r2.json`. Pondok32×48, tile(138,107), tetap dekoratif; sambungan air original dan 33 tile papan jembatan dipertahankan.

Arsip R1: `world/maps/pulau_tirta_v38_r1.tmj`, `scripts/polish-hutan-v38-r1.mjs` dan `world/forest-v38-r1.json` tetap utuh.

Arsip V3.8 (`world/maps/pulau_tirta_v38.tmj`, `scripts/design-hutan-v38.mjs`, `scripts/forest-v38-art.mjs`, `world/forest-v38.json` dan atlas `forest_v38`) tetap disimpan utuh dan tidak dipakai renderer aktif.

Arsip V3.7: `world/maps/pulau_tirta_v37.tmj`, `scripts/design-lembah-v37.mjs`, `scripts/valley-v37-art.mjs` dan `world/valley-v37.json` tetap utuh.

Arsip V3.6: `world/maps/pulau_tirta_v36.tmj`, `scripts/design-puncak-v36.mjs`, `scripts/puncak-v36-art.mjs` dan `world/mountain-v36.json` tetap utuh.

Arsip panduan art pass, properti lokal, screenshot dan pengujian:
[PANTAI_V351_POOL_POLISH.md](PANTAI_V351_POOL_POLISH.md). Arsip V3.5: [PANTAI_V35.md](PANTAI_V35.md). Living system V3.3: [LIVING_WORLD_V33.md](LIVING_WORLD_V33.md). Arsip desain V3.2: [ENVIRONMENT_V32.md](ENVIRONMENT_V32.md). V3.1 tetap menjadi pembanding. Ukuran, spawn, dan koordinat misi V3 dipertahankan.

Bagian berikut mendokumentasikan V3 dan arsip V1; keduanya tetap tersimpan.

World V3 cadangan: **192 × 144 tile, 3072 × 2304 px**.
Buka `world/maps/pulau_tirta_v3.tmj` di Tiled. Panduan map aktif, koordinat,
aset, verifikasi dan preview ada di [WORLD_V3.md](WORLD_V3.md).

`world/maps/pulau_tirta.tmj` dan `public/maps/pulau-tirta.json` tetap disimpan
sebagai V1. `npm run world:export` mengekspor kedua versi; `npm run dev` dan
`npm run build` tidak membuat ulang rancangan V3 atau menimpa edit Tiled.

Catatan berikut merupakan arsip implementasi **Tahap 1 / V1**, bukan ukuran
dan koordinat map aktif.

## Arsip Tahap 1

Sumber awal disalin dari `pulautirtaprepaufa`; atlas Tiny Town sama dengan
`TINYCITYFINAL/public/assets/Tilemap/tilemap_packed.png`. Folder referensi di luar
repo tidak diperlukan untuk menjalankan atau mengedit world setelah clone.

## Edit dan ekspor map

1. Buka `world/maps/pulau_tirta.tmj` dengan Tiled. Pertahankan susunan relatif
   `maps/tilesets/*.tsj` menuju `world/assets/`.
2. Edit terrain, jalan, dekorasi, atau posisi objek. Simpan sumber Tiled.
3. Dari root repo jalankan `npm.cmd run world:export` (PowerShell Windows), atau
   `npm run world:export` di shell lain.
4. Ekspor menghasilkan `public/maps/pulau-tirta.json` dengan tileset embedded dan
   menyalin gambar yang dirujuk ke `public/assets/world/`. Hasil ekspor disertakan
   di Git bersama sumbernya; jangan mengedit hasil ekspor secara manual.
5. Jalankan `npm.cmd run world:check`, `npm.cmd run typecheck`, `npm.cmd test`, dan
   `npm.cmd run build`. `world:check` hanya memeriksa kesesuaian, tanpa menulis file.

Ekspor berjalan otomatis sebelum dev/build. Ketika Tiled disimpan saat dev server
sedang hidup, jalankan ekspor lagi agar Vite memuat hasil terbaru. Script memakai
Node bawaan, tidak memerlukan Tiled CLI atau dependency tambahan. JSON runtime
diimpor satu kali untuk metadata dan loader Phaser; collision memakai data yang
sama. File JSON dan PNG juga masuk precache PWA yang sudah ada.

## Kontrak world

- Orthogonal, finite, tile 16 × 16; map saat ini 72 × 54 (1152 × 864 px).
- `Spawn`: satu point `player_spawn`, saat ini `(584, 488)` px.
- `Ground`, `Paths`, `Objects`, `AbovePlayer`: tile layer wajib.
- `Collisions`: rectangle tanpa rotasi, properti boolean `collides: true`.
  Saat ini ada 4 bangunan dan 56 batang pohon. Objek visual lain tidak otomatis
  menjadi collider. Tile berproperti `collides: true` juga menghalangi pemain;
  tambahkan properti ini di tileset untuk tebing/penghalang baru.
- `Interactions`: rectangle; titik aksi dihitung dari pusat objek. Wajib memiliki
  `missionId`, `region`, `mechanic`, `radiusPx`. Radius saat ini 30 px.
- `Regions`: lima rectangle dengan `missionId` M1–M4 atau `hub` untuk desa.
  Masuk region memperbarui konteks Tiko tanpa memulai misi. Jalan di luar region
  menggunakan konteks Desa Tirta. Hindari region saling menimpa; region pertama
  dalam urutan map menang ketika terjadi tumpang tindih.

| ID map | ID aplikasi | Lokasi / alur |
| --- | --- | --- |
| M1 | misi-1 | Pantai Biru |
| M2 | misi-2 | Puncak Kabut |
| M3 | misi-3 | Lembah Hujan |
| M4 | misi-4 | Hutan & Sungai |
| M5 | tanpa misiId pada Lokasi desa | Festival Hujan melalui pemeriksaan existing |

M5 tidak dikirim ke `cariMisi()` sebagai misi biasa. Empat misi tetap bebas urutan;
festival hanya dibuka oleh `festivalTerbuka()` setelah keempatnya selesai.

`Recovery_Pantai_Biru`, `Recovery_Puncak_Kabut`, `Recovery_Lembah_Hujan`, dan
`Recovery_Hutan_Sungai` mengikuti status `selesai` misi 1–4. `segarkan()` membaca
status existing, termasuk progres yang dimuat dari localStorage. Urutan render:
Ground → Recovery → Paths → Objects → avatar → AbovePlayer → indikator/HUD.
Karena itu overlay pemulihan tidak menutup rumah, pohon, atau jalan. Overlay hanya
visual dan tidak mengubah collider. `AbovePlayer` saat ini kosong; pecah kanopi/
atap ke layer itu bila dibutuhkan pada tahap perapian visual.

## Kontrol dan batas integrasi

WASD/panah berjalan dengan kecepatan 86 px/detik, diagonal dinormalisasi, delta
dibatasi 40 ms, dan perpindahan dipecah menjadi langkah maksimal 2 px. Collider
di kaki avatar beradius 4,6 px. Sprite sementara memakai frame statis 108 dengan
flip horizontal; animasi berjalan empat arah belum tersedia pada aset ini.
Kamera mengikuti pemain pada zoom 3 dengan bounds sesuai map.

E, Spasi, atau Enter memanggil callback `interaksi` ketika berada dalam radius.
`PengaitDunia`, `terkunci`, `segarkan()`, `statusMisi`, dan callback lama tetap ada.
Callback opsional `pindahWilayah` menambahkan pembaruan konteks lokasi. Input game
berhenti saat dialog terbuka atau fokus berada pada input/textarea/select/button/
contenteditable, agar chat dan kontrol dialog tetap berfungsi.

Penilaian, pertanyaan, petunjuk Tiko, localStorage, dan festival tetap milik sistem
Faza/Evan. Minigame masih placeholder existing. Tidak ada perubahan backend,
guardrail, `.env`, atau dependency. Untuk tahap berikutnya, koordinasikan kontrak
selesai-aktivitas dengan Evan dan pertahankan ID misi/payload konteks bersama Faza.

## Verifikasi

`tests/world.test.ts` memeriksa ekspor, keberadaan gambar, layer wajib, dimensi/GID,
pemetaan ID, spawn, collision, movement, konteks region, serta keterjangkauan lima
interaksi. Penelusuran jalur memakai fungsi movement/collision yang sama dengan
game, bukan sekadar menganggap semua tile tanah dapat dilalui.

Uji browser lokal Tahap 1 menggunakan Chrome headless dengan profil sementara dan
input keyboard melalui DevTools Protocol, tanpa dependency baru. Diperiksa:
render, spawn, kamera, collision bangunan, input Tiko, modal, payload lokasi chat,
empat dialog misi, recovery langsung/setelah reload, festival terkunci/terbuka,
Spasi/Enter, dan deep link demo. Penempatan di titik misi pada uji browser memakai
instrumentasi scene sementara; keterjangkauan rute lengkap diverifikasi oleh tes
otomatis. Playtest manusia dan perangkat sentuh masih diperlukan pada tahap lanjut.
Hasil produksi juga diperiksa di browser: kedua atlas termuat, service worker aktif,
dan world tetap dirender setelah reload dengan jaringan dimatikan melalui CDP.

## Aset sementara

Terrain adalah placeholder buatan paket persiapan Aufa, bukan Kenney. Tiny Town
dipakai sebagai referensi desa/avatar; README referensi menyatakan Kenney CC0,
tetapi berkas lisensi asli belum disertakan. Lengkapi verifikasi sumber sebelum
distribusi final. Catatan aset juga ada di `CREDITS.md`.
