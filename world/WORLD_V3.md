# World Map V3 — Aufa

World aktif adalah satu map orthogonal berukuran **192 × 144 tile**, 16 × 16 px
per tile, total **3072 × 2304 px**. Kelima wilayah memakai scene yang sama tanpa
loading antarlokasi. Map V1 tidak dihapus. Folder referensi tidak dimodifikasi.

## Menjalankan dan mengedit

```powershell
cd C:\Users\user\Documents\logicodixfinal\Pulau-Tirta
npm.cmd run dev
```

Buka URL Vite yang dicetak terminal (biasanya `http://localhost:5173`). Untuk
mengedit, buka **`world/maps/pulau_tirta_v3.tmj`** di Tiled, simpan, lalu jalankan:

```powershell
npm.cmd run world:export
npm.cmd run world:check
```

Sumber Tiled memakai empat TSJ eksternal; script menanam definisi tileset ke
`public/maps/pulau-tirta-v3.json` dan menyalin PNG asli ke `public/assets/world/`.
Ekspor otomatis sebelum dev/build; ekspor manual diperlukan bila editor Tiled
disimpan saat dev server sudah hidup. JSON runtime bukan file untuk diedit.

`scripts/create-world-v3.mjs` menyimpan resep komposisi awal deterministik (seed
20261107). Script ini **tidak** dijalankan oleh dev/build. Bila map sudah ada,
script menolak regenerasi tanpa `--force`; regenerasi menggantikan edit artist
pada V3. Gunakan Tiled untuk perubahan sehari-hari. V1 selalu tetap terpisah.

## Komposisi dan navigasi

| Wilayah | Isi utama | Area eksplorasi / ruang lanjutan |
| --- | --- | --- |
| Desa Tirta | 7 rumah dengan roof/ukuran bervariasi, halaman bunga, gang, sumur kering, lapangan festival, kebun berpagar dan lumbung | 4 penempatan NPC dekoratif, pekarangan dan persimpangan arah |
| Pantai Biru | Pesisir organik, dermaga, dua kolam batu dan pad eksperimen cermin | Jalur pesisir melingkar, vegetasi pantai, kebun kecil di titik istirahat |
| Puncak Kabut | Jalur pendakian berkelok, teras dengan bibir batu, titik pengamatan dan pad eksperimen angin | Loop punggung bukit, vegetasi pinus dan kelompok batu |
| Lembah Hujan | Cekungan kering dengan air tersisa, rumput, pad eksperimen pembentukan hujan | Loop tepian lembah, ruang terbuka untuk efek awan/hujan |
| Hutan & Sungai | Kelompok pohon, tanah gundul, bibit tanam, sungai berkelok dan sumbatan ranting visual | Loop menyeberangi jembatan ke sisi timur sungai |

Empat rute utama berangkat dari hub; semua terbuka sejak awal. Jalan dilindungi
dari penempatan dekorasi otomatis. Dua object `FuturePaths` mencadangkan ruang
Puncak ↔ Lembah serta Pantai ↔ Hutan. Belum ada quest, gua, unlock atau akses
khusus untuk koridor tersebut.

Ada 1.116 pohon/bush bercollider dan 496 batu tanah dalam rancangan awal, di luar
dekorasi vegetasi kecil. Semua dirender sebagai tile; tidak ada sprite aktif per
pohon. Pengelompokan mengikuti pola organik, dengan hutan lebih padat daripada
lembah. Jalur utama, pintu rumah dan area interaksi diberi ruang kosong.

## Koordinat dan kontrak integrasi

Koordinat berikut adalah **pusat objek dalam pixel**, bukan sudut kiri atas tile.
Spawn: **(1544, 1272)**. Data terstruktur ada di `world/world-contract-v3.json`;
`pulautirtaprepaufa/docs/world_contract.json` di folder referensi tetap merupakan V1.

| Objek | ID aplikasi | Pusat px | mechanic |
| --- | --- | --- | --- |
| mission_beach | misi-1 | (920, 1672) | mirror |
| mission_mountain | misi-2 | (968, 696) | wind |
| mission_valley | misi-3 | (2216, 728) | droplets |
| mission_forest | misi-4 | (2264, 1704) | plant |
| festival | Alur festival existing / M5 | (1576, 1272) | matching |

Radius interaksi 36 px. `misi-1`–`misi-4` memakai callback dan penilaian existing.
M5 tetap direpresentasikan sebagai lokasi Desa tanpa `misiId`, sehingga hanya
`festivalTerbuka()` yang membuka Festival Hujan setelah empat misi selesai.
Nama objek interaksi V1 dipertahankan; koordinatnya berpindah untuk V3.

Region memperbarui konteks Tiko ketika pemain masuk wilayah. Area penghubung di
luar rectangle region memakai konteks Desa, mengikuti perilaku Tahap 1. Dialog,
input chat, dan fokus tombol menghentikan movement. Kontrak `PengaitDunia`,
`terkunci`, `segarkan()`, mode demo, dan kunci localStorage tidak berubah.

## Struktur layer dan pemulihan

Ada **30 layer: 22 tile layer dan 8 object layer**.

| Layer | Kedalaman / peran |
| --- | --- |
| Ground | 0; seluruh dasar map terisi |
| TerrainDetails | 1; patch tanah kering dan gravel |
| Recovery_[wilayah] | 2; tanah kembali hijau |
| Water | 3; laut, sungai dan sisa air |
| Recovery_Water_[wilayah] | 4; kolam/cekungan terisi kembali |
| Paths | 5; jalan, pad eksperimen, jembatan dan dermaga |
| Objects | 10; rumah, properti dan bagian bawah pohon |
| Recovery_Plants_[wilayah] | 12; tanaman segar / air menutup visual sumbatan |
| AbovePlayer | 30; bagian atas pohon |
| Recovery_Canopy_[wilayah] | 31; bagian atas pohon pulih |

Empat layer pemulihan untuk setiap misi memakai properti `missionId`; total 16
layer, awalnya tersembunyi. `segarkan()` memperbarui seluruh grup misi sekaligus,
termasuk ketika progres dimuat setelah reload. Air/terrain pemulihan tidak menutup
bangunan atau jalan. Kanopi sengaja berada di depan avatar.

Object layers: `Collisions`, `Interactions`, `Regions`, `Spawn`, `Landmarks`,
`NPCSpawns`, `FuturePaths`, dan `DevelopmentAreas`. Rectangle collider tanpa rotasi
memakai `collides: true`; tile air juga memiliki properti collision. Tile deck
`tiny_city:13` memiliki `bridge: true` pada Paths agar dermaga dapat melintasi air.
Collider objek tetap berlaku. Footprint kolam dijaga stabil sebelum/sesudah pulih
agar pemain tidak terjebak ketika air muncul.

## Atlas asli dan penggunaan frame

| Tileset runtime | Dimensi | GID | Penggunaan |
| --- | --- | --- | --- |
| tiny_city | 192 × 176; 132 frame | 1–132 | Infrastruktur legacy, jalan batu, railing, lampu, avatar 108 |
| tiny_town | 192 × 176; 132 frame | 133–264 | Rumah desa, pagar, jalur tanah, pohon dan sumur |
| tiny_farm | 192 × 176; 132 frame | 265–396 | Kebun, tanaman, pot, lumbung, dekorasi vegetasi |
| tiny_battle | 288 × 176; 198 frame | 397–594 | Air, tepian organik dan batu tanah; tanpa konten tempur |

Semua memakai `tilemap_packed.png`, tile 16 px, margin/spacing **0**. Keterangan
spacing 1 pada Tilesheet.txt berlaku untuk `tilemap.png` yang unpacked. Tidak ada
atlas digabung atau di-recolor. Tiny Town baru berbeda dari atlas legacy Tiny City.
Pohon pinus utuh mengikuti Sample.png Kenney: top 4 + bottom 16 (kering: 3 + 15).
Komponen autotile hutan tidak ditempel sebagai sprite 3 × 3 secara sembarangan.

Tiga paket Kenney baru menyertakan License.txt CC0, disalin ke `world/licenses/`.
Identitas/lisensi atlas legacy Tiny City masih mengikuti README prototype; berkas
lisensi aslinya perlu konfirmasi. Detail di `CREDITS.md`.

Representasi sementara yang masih perlu art pass: pasir memakai tanah terang
Tiny Town; ketinggian puncak memakai ilusi gravel dan susunan batu; alat eksperimen
memakai properti lingkungan yang tersedia. Belum ada sprite cermin/angin khusus,
animasi berjalan empat arah, atau efek awan/hujan baru. Ini tidak menambahkan
minigame. NPC hanya dekoratif/penempatan; sistem dialog NPC baru tidak dibuat.

## Performa dan pengujian

Phaser Tilemap melakukan culling; `insertNull: true` menghindari objek Tile untuk
sel kosong. Mask collision tile dihitung sekali, collider objek diindeks ke bucket
64 px, sehingga langkah pemain hanya memeriksa sel di dekat kakinya. Movement
normalisasi diagonal, delta 40 ms dan substep 2 px tetap dipertahankan. Build
memisahkan chunk Phaser, data V3, dan aplikasi; aset tetap masuk cache PWA.

```powershell
npm.cmd run world:check
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
# Dengan dev server aktif; Chrome/Edge lokal diperlukan:
npm.cmd run world:browser
```

Tes mencakup V1, GID/rentang atlas V3, dimensi/layer, kesesuaian ekspor, spawn,
recovery, indeks collision serta penelusuran jalur dengan movement runtime. Semua
titik interaksi harus dicapai dari spawn dalam kurang dari 30 detik pada kecepatan
86 px/detik melalui jalur terpendek. Durasi cerita 10–15 menit dalam PRD masih
memerlukan playtest setelah aktivitas misi Evan selesai; bukan klaim waktu tamat
build saat ini yang masih memakai tombol aktivitas placeholder.

Script browser memakai profil Chrome sementara, memeriksa rendering, input,
kamera, konteks Tiko mock, empat dialog, recovery langsung/reload, festival,
Spasi/Enter dan mode demo. Posisi pemain dipindahkan oleh instrumentasi pengujian
untuk memeriksa tiap interaksi; keterjangkauan rute lengkap diuji oleh unit test.
Profil pengguna dan `.env` tidak diubah. Target 60 fps pada laptop sekolah belum
dibuktikan lewat pengujian perangkat fisik.

Hasil verifikasi 7 November 2026: ekspor dan TypeScript lolos; **53 unit test
lolos**; production build berhasil tanpa peringatan ukuran chunk. Uji Chrome
headless dev lolos untuk alur di atas. Hasil produksi juga memuat keempat atlas,
service worker aktif, dan tetap merender world setelah reload offline tanpa
exception JavaScript atau respons HTTP error. Untuk mengulang pengujian produksi
dengan server di port 3000:

```powershell
$env:WORLD_URL = 'http://localhost:3000/'
npm.cmd run world:browser -- --production
Remove-Item Env:WORLD_URL
```

PRD lokal berhasil diekstrak/dibaca: F-01 (gerak/kamera/collision), F-02 (lima lokasi
tanpa loading) dan F-03 (interaksi/dialog) menjadi acuan. Perubahan ukuran V3
mengikuti instruksi Aufa terbaru. Pertanyaan, penilaian, backend dan guardrail tetap
milik implementasi Faza/Evan; tahap berikutnya koordinasikan posisi pad dan kontrak
selesai-aktivitas menggunakan ID di atas.

## Preview

Preview komposit seluruh map, tanpa avatar/UI:
[Before](previews/world-v3-before.png) · [After](previews/world-v3-after.png).
Render ulang di Windows tanpa dependency tambahan:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/render-world-preview.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/render-world-preview.ps1 -After
```

Screenshot browser nyata:
[Desa](previews/gameplay-v3-desa.png) · [Rumah desa](previews/gameplay-v3-desa-rumah.png) ·
[Pantai](previews/gameplay-v3-pantai.png) · [Pesisir](previews/gameplay-v3-pantai-pesisir.png) ·
[Puncak](previews/gameplay-v3-puncak.png) · [Lembah](previews/gameplay-v3-lembah.png) ·
[Hutan](previews/gameplay-v3-hutan.png) · [Hutan pulih](previews/gameplay-v3-hutan-after.png).
[Produksi offline](previews/gameplay-v3-production-offline.png).
