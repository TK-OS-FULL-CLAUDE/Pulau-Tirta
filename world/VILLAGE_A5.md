# Desa Tirta V3.4-A5 — Density & Life Overhaul

A5 dikerjakan pada **`feature/world-desa-a5`**, berdasarkan kode tim terintegrasi **`d4d7d63`** (`origin/main`, hasil merge misi/Jurnal/dialog warga serta perbaikan mobile/offline). Fetch dilakukan sebelum pekerjaan; `cek-main-terbaru` identik dengan `origin/main` dan working tree awal bersih. Branch World lama tidak digunakan. Tidak ada commit, push, merge, rebase, reset, force push, atau perubahan dependency/`.env`.

Finishing warna terbaru: [Color Contrast & Flower Seeding](VILLAGE_A5_COLOR.md), [perbandingan warna A4/A5](previews/v34-a5/color-polish/review.html). NPC, collision, jalur dan misi A5 awal tetap identik.

## Diagnosis dan hasil komposisi

Masalah A4 terutama terdapat pada ruang di antara struktur: halaman tidak mempunyai fungsi, pohon sempit tidak membentuk tempat berteduh, dan stok kecil belum menghubungkan pasar dengan rumah. A5 berangkat dari [rancangan ruang sebelum pemasangan tile](VILLAGE_A5_LAYOUT.md), screenshot aktual A4 dari aplikasi terintegrasi, serta contoh dan atlas lokal Kenney Tiny Town/Tiny Farm.

| Kawasan | Perubahan dan fungsi ruang |
| --- | --- |
| Plaza, sumur dan pasar | Rak panen beratap di sisi kios menjadi tempat sortir. Gerobak hasil kebun dan kelompok penyimpanan menyambung aktivitas pasar ke Rumah Barat. Pohon pada anchor existing diperlebar; planter membingkai tepi. Kedua kios, sumur dan apron, serta pusat Festival tetap terbuka. |
| Permukiman utara | Rumah Utara memiliki halaman bersama yang terhubung setapak, peneduh, bangku dan pergola. Warga existing kini beraktivitas di sini. Rumah Kebun mempunyai sudut penyimpanan dan peneduh; belakang Balai mempunyai bangku tunggu di bawah pohon. |
| Permukiman barat | Meja, tong, peti dan planter pada sisi Rumah Barat melanjutkan cerita penyimpanan barang pasar. Bentuknya dibedakan dari rak beratap agar tidak semua rumah mendapat template yang sama. |
| Permukiman selatan | Rumah Petani memiliki rak panen dan meja kerja yang berkelompok dengan stok/wadah air existing. Halaman antara Rumah Petani dan Rumah Sungai menjadi tempat berkumpul dan mencuci, dinaungi pohon serta pergola; setapak menghubungkannya dengan jalur rumah. |
| Permukiman timur | Bangku existing menjadi bagian halaman keluarga dengan planter dan jemuran, dibatasi pohon di tepi. Pintu, akses herbal dan cabang gerbang tetap terbuka. |
| Kebun dan nursery | Susunan petak beragam dari A4 dipertahankan. Rak panen di tepi nursery dan meja kerja kebun keluarga memperjelas kegiatan menyiapkan bibit dan menyortir hasil. Aisle dan akses tanaman tidak ditutup. |

Tiga tingkatan tetap terbaca: rumah/kios/kebun sebagai struktur, pohon/rak/meja/pergola sebagai penghubung berukuran sedang, lalu bunga/rumput existing sebagai detail. Tidak memakai penempatan acak. Rumput tetap menjadi jeda di antara kelompok, bukan petak yang wajib dipenuhi. Jumlah objek tidak dipakai sebagai ukuran keberhasilan.

Properti lokal dibuat dalam SVG pixel-grid (`scripts/village-a5-props.mjs`) dengan palet kayu, hijau dan outline yang mengikuti lingkungan existing. Ukurannya16px atau kelipatannya: planter/meja32×16, pergola/gerobak32×32, rak48×32, jemuran48×32, pohon48×48. Bukan aset resmi Kenney dan tidak memakai gambar eksternal. Semua atlas lama tetap identik.

## Iterasi visual dan navigasi

Screenshot awal memperlihatkan planter dan gerobak menutup tile jalan existing. Planter dipindah ke sisi lane dan gerobak ke ruang rumput di tepi pasar. Meja panen dipindah dari lintasan diagonal utama ke sisi rak. Rak Rumah Barat diganti meja/tong/peti agar siluet rumah tidak berulang. Konifer yang menghalangi ruang komunal utara dihapus saat ruang peneduh disusun ulang. Jalur tunggu Balai dihubungkan melalui sisi belakang bangunan, dan halaman selatan diberi pijakan tanah yang menghubungkan meja/pergola ke jalan.

Semua penyesuaian dilakukan pada generator A5 lalu diekspor ulang. Render kawasan ditinjau kembali; pemeriksaan tidak berhenti pada keberhasilan generator. Kanopi bersifat menaungi, batang tetap solid. Jemuran mempunyai collider hanya pada dua tiangnya sehingga pemain dapat lewat di tengah. Ruang Festival tidak diisi benda baru.

## Kontrak tim yang dipertahankan

- World tetap **192×144 tile**, tile16, layer36. Ketujuh rumah tidak dipindah atau digambar ulang.
- Spawn tetap `(1544,1272)`; kelima interaksi misi/Festival mempertahankan ID, koordinat, radius dan properti existing.
- Seluruh pixel layer di luar mask Desa, termasuk overlap Puncak/Pantai, identik dengan A4. Collider yang menyentuh empat wilayah lain juga identik.
- Tile tanaman, seluruh layer Recovery dan Celebration, kondisi kering/pulih sumur, panji serta ruang Festival dipertahankan. Pergantian state tidak mengubah collision.
- Keempat identitas NPC tetap memakai Living World dan adapter `villageActivity` existing. Waypoint warga kedua dipindah ke halaman utara, tanpa AI, dialog, quest atau NPC tambahan. Rute NPC aktif dan rute legacy sama-sama diperiksa aman.
- Seluruh71 berkas dalam baseline integrasi—termasuk source UI, aktivitas edukasi, `src/main.ts`, world hooks, Tiko/backend, content/shared, map dan atlas lama—dibandingkan dengan hash awal. Tidak memperbarui baseline lama untuk menyembunyikan perubahan.

Kontrak aktual `PengaitDunia` pada basis ini tetap menyediakan `interaksi`, `statusMisi`, `persenPulih`, `bergerak`, `pindahWilayah?` dan `festivalSelesai?`. `dunia.terkunci`, `segarkan()` serta perilaku perayaan existing tidak diubah. Basis ini tidak menyediakan hook `bicara(wargaId)` yang terpisah; percakapan Kepala Desa menggunakan interaksi Desa existing. Tidak menambahkan interface atau nama/parameter hook baru.

## Sumber dan integrasi

| Berkas | Fungsi |
| --- | --- |
| `scripts/design-village-a5.mjs` | Sumber perubahan kelompok ruang, collision, setapak dan waypoint; turunan A4 |
| `scripts/village-a5-props.mjs` | Sumber geometri properti SVG pixel-grid lokal |
| `world/maps/pulau_tirta_v34_a5.tmj` | Peta editable di Tiled |
| `world/maps/tilesets/v34_a5_props.tsj` | Tileset kesembilan; frame GID915–1042 |
| `world/assets/village_a5/props.svg` | Atlas lokal256×128; transparan di frame yang tidak digunakan |
| `world/village-a5.json` | Nama/fungsi kelompok, akses halaman, aktivitas dan rute walkthrough |
| `world/village-a5-baseline.json` | Hash awal71 berkas integrasi yang dilindungi |
| `scripts/export-world.mjs` | Export embedded; build tidak menjalankan ulang generator desain |
| `public/maps/pulau-tirta-v34-a5.json`, `public/assets/world/village_a5/` | Output runtime |
| `src/game/world-map.ts`, `vite.config.ts` | Memilih map dan chunk A5 |
| `tests/village-a5.test.ts` | Scope, preservasi kode tim, rumah/gerbang, NPC, pemulihan dan collision |
| `scripts/check-village-a5.mjs` | Browser CDP khusus basis terintegrasi; screenshot, kontrol UI, video, mobile dan offline |

Setelah mengedit sumber Tiled, jalankan `npm.cmd run world:export`. Untuk meregenerasi rancangan dari generator: `node scripts/design-village-a5.mjs --force` hanya setelah memastikan edit manual Tiled tidak perlu dipertahankan. Tanpa `--force`, generator menolak menimpa sumber A5 yang sudah ada. Map, aset dan source generator A4 serta versi sebelumnya tidak ditimpa.

## Preview dan perbandingan

Buka [review HTML](previews/v34-a5/review.html) atau `http://localhost:5173/world/previews/v34-a5/review.html` saat dev server aktif. Folder preview mengikuti `.gitignore` existing dan tersedia lokal.

| Output | Berkas |
| --- | --- |
| Seluruh desa | [A4 sebelum](previews/v34-a5/before-overview.png), [A5](previews/v34-a5/after-overview.png) |
| Plaza / pasar | [pusat](previews/v34-a5/after-plaza-market.png), [detail kios](previews/v34-a5/after-market-detail.png), [detail sumur](previews/v34-a5/after-well-detail.png) |
| Permukiman utara | [utara](previews/v34-a5/after-homes-north.png), [halaman komunal](previews/v34-a5/after-north-courtyard.png) |
| Permukiman selatan / timur | [selatan](previews/v34-a5/after-homes-south.png), [timur](previews/v34-a5/after-homes-east.png) |
| Kebun | [pertanian dan nursery](previews/v34-a5/after-farming.png) |
| Jalan | [penghubung](previews/v34-a5/after-road-spine.png) |
| Perbandingan A4/A5 | Slider per kawasan pada review, [berdampingan](previews/v34-a5/comparison-a4-a5.png), [crop A4](previews/v34-a5/before-tiles.png), [crop A5](previews/v34-a5/after-tiles.png) |
| Walkthrough | [WebM](previews/v34-a5/village-a5-walkthrough.webm), [rute/durasi/jarak](previews/v34-a5/walkthrough-evidence.json), [hash peta yang direkam](previews/v34-a5/walkthrough-source.json) |
| Kondisi Festival | [overview](previews/v34-a5/festival-overview.png), [crop tile](previews/v34-a5/festival-tiles.png) |
| Review dan laporan | [HTML](previews/v34-a5/review.html), [salinan laporan](previews/v34-a5/REPORT.md), [bukti tes](previews/v34-a5/validation-evidence.json) |

Referensi A4 dirender langsung dari basis integrasi sebelum pergantian runtime, dengan worldVersion dan hash sumber diperiksa. Setiap kamera kawasan sebelum/sesudah identik: overview pusat `(1528,1224)` px, zoom1, scroll `(888,864)`, viewport game1280×720, browser1440×900. Kamera kawasan memakai zoom2/3 yang sama pada kedua versi. Crop tile816×688 sesuai Region Desa. Posisi NPC bisa berbeda karena aktivitas berjalan; crop tile menghilangkan perbedaan sprite runtime tersebut.

Walkthrough final melewati **26 titik** selama **110.849 detik** (sekitar1 menit51 detik), dengan **7.439 px** pergerakan. Rekaman hanya memuat canvas game; pergerakan memakai input WASD dan collision existing, tanpa teleport. Frame awal, frame2 detik, dan frame mendekati akhir diperiksa. Hash runtime yang direkam sama dengan map final.

## Pengujian yang dilakukan

| Pemeriksaan | Hasil |
| --- | --- |
| Baseline sebelum implementasi |121/121 tes,15 file, lulus pada basis terintegrasi |
| `npm.cmd run world:check` |Lulus, seluruh ekspor sesuai source Tiled |
| `npm.cmd run typecheck` |Lulus |
| `npm.cmd test -- --reporter=dot` |**129/129 lulus,16 file** |
| `npm.cmd run build` |Lulus; chunk map A5 dan service worker dihasilkan |
| Rumah / misi / gerbang / halaman |BFS menggunakan substep movement asli; semua pintu, lima tujuan misi, akses kelompok halaman dan empat sambungan gerbang dapat dicapai |
| NPC dan collision |Keempat plan aktif disimulasikan3 menit, rute legacy tetap valid, pusat collider solid tidak bisa ditembus, celah jemuran/kanopi dapat dilalui |
| Scope / recovery |Hash71 berkas basis, semua pixel luar Desa, collider wilayah misi, seluruh footprint rumah dan state pemulihan/Festival diperiksa identik |
| Browser integrasi |Lulus: intro, gerak/kamera/fokus canvas, input Tiko, Jurnal/Jeda dengan lock, aktivitas NPC utara, dialog warga, keempat aktivitas misi melalui UI, pemulihan tersimpan/reload, Festival dan layar tamat, demo tanpa menimpa progres, desktop/mobile390?844 |
| Review video / produksi offline |Lulus: seluruh gambar terbaca, video1280?720 berisi frame gameplay berubah, seek sampai107.849 detik; chunk A5,9 atlas, service worker dan reload offline berhasil |

Perintah browser: `node scripts/check-village-a5.mjs --walkthrough`. `--capture-only` memperbarui screenshot untuk inspeksi visual; `--reference` hanya dipakai saat runtime masih A4. Pemeriksaan review: `node scripts/check-village-a5.mjs --review`. Uji produksi menggunakan `WORLD_URL=http://localhost:3000/` dan flag `--production`.

Uji browser menggunakan profil Chrome sementara sendiri, tanpa menambah dependency atau global debug pada aplikasi produksi. Screenshot perbandingan menempatkan kamera/pemain hanya untuk framing; selama walkthrough, posisi pemain berubah melalui input WASD, update game, dan collision asli. Kontrol aktivitas misi dioperasikan melalui slider/tombol UI yang tersedia, bukan dengan memanggil callback penyelesaian atau mengganti implementasi edukasi.

Pemeriksaan visual/headless tidak mengukur FPS pada laptop fisik. Properti baru tetap dekorasi/collision, tanpa interior, sistem pencahayaan baru atau gameplay tambahan. Build masih menyertakan arsip map lama; optimasi distribusi arsip tidak dilakukan pada A5.

**Berhenti pada Desa Tirta A5 untuk review. Tidak commit, push atau merge.**
