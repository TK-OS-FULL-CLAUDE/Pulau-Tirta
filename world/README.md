# Gameplay & World Aufa

**Peta aktif V3.4-A5, seluruh Desa Tirta:** `world/maps/pulau_tirta_v34_a5.tmj`.
Panduan art pass, properti lokal, screenshot dan pengujian:
[VILLAGE_A5.md](VILLAGE_A5.md). Living system V3.3: [LIVING_WORLD_V33.md](LIVING_WORLD_V33.md). Arsip desain V3.2: [ENVIRONMENT_V32.md](ENVIRONMENT_V32.md). V3.1 tetap menjadi pembanding. Ukuran, spawn, dan koordinat misi V3 dipertahankan.

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
