# World V3.5 — Pantai Biru Complete Coastal Overhaul

Branch kerja **`feature/world-pantai-b1`**, basis **`2458a76` / origin/main**. Fetch dilakukan sebelum pekerjaan dan working tree awal bersih. A5 sudah digabung melalui PR6; branch Pantai tidak bergantung pada PR A5 yang belum masuk main. Basis juga mempertahankan integrasi playtest/audio dari tim. Tidak commit, push, merge, rebase, reset, menghapus pekerjaan, mengubah `.env`, atau memasang dependency.

## Empat zona dan hasil komposisi

[Rancangan ruang](PANTAI_V35_LAYOUT.md) dibuat sebelum pemasangan tile, berdasarkan screenshot Phaser dan source Tiled A5. Fokus pada hubungan struktur besar dan properti medium, bukan jumlah dekorasi.

| Zona | Hasil |
| --- | --- |
| A · Dermaga nelayan | Jejak deck asli dipertahankan dengan material kayu hangat. Perahu kayu tertambat pada sisi laut, jaring menggantung, peti ikan, tong, tali dan papan bongkar muat berada pada kelompok kerja. Naungan kanvas biru/creme menjadi landmark di daratan, dibingkai palem. Lajur deck dan sambungan daratan tetap terbuka. |
| B · Stasiun eksperimen | Kedua kolam5×5 dan cermin asli tidak diubah. Apron batu terang serta jalur pendek menghubungkan keduanya; papan1/2 memperjelas orientasi. Meja bowl/kertas dan cart perlengkapan berada di samping, tidak di atas kolam atau radius interaksi. Tidak menambah penjelasan sains, minigame atau callback misi. |
| C · Pantai alami | Pasir cerah, hangat dan lembap dibentuk sebagai kelompok bidang yang tersambung. Palem berbeda arah/tinggi, kelompok batu, dunegrass, kayu hanyut, kerang serta bunga pantai ditempatkan pada kantong tertentu. Dune utara menjadi penyeimbang komposisi; ruang kosong tetap disisakan untuk suasana pantai dan berjalan. |
| D · Masuk pesisir | Jalur dari batas Desa berubah menjadi jejak pasir dengan dunegrass, papan arah, palem dan bangku. Semua perubahan transisi berada di sisi Pantai; bagian Region yang overlap Desa tidak disentuh. |

Satu atlas lokal baru menyediakan pixel-grid16 atau kelipatannya: perahu80×48, naungan80×48, jaring64×32, palem48×64/48×48, meja48×32, batu48×32 dan detail kecil. Palet memakai kayu hangat, air dangkal biru muda, pasir krem/ochre, hijau pesisir serta aksen kanvas. Tidak mengambil gambar eksternal atau mengubah atlas Kenney/A5. Laut terbuka existing tetap memakai atlas asal; hanya band dekat pesisir diberi varian dangkal dan buih tipis.

## Iterasi visual

Render pertama mengungkap pasir lama banyak berada pada `TerrainDetails` di atas Ground rumput. Menghapus detail tanpa mengonversi mask pasir menampakkan petak rumput besar. Mask pasir diperbaiki memakai sumber visual A5 sehingga hamparan kembali menyambung dan bidang warna membentuk pantai, bukan checkerboard. Frame pool/cermin tetap dibekukan.

Render berikutnya dipakai untuk merenggangkan tiang tali dermaga, memperjelas tambatan perahu, membuat jaring menggantung, memvariasikan arah palem dan menambahkan kelompok batu/palem di dune utara. Benda kecil mengikuti kelompok kerja/tidal tersebut. Tidak menebar dekorasi acak sebagai pengganti review.

## Kontrak yang dipertahankan

- Map tetap **192×144 tile**, tile16, layer36. Tileset lama9 tetap identik; atlas Pantai menjadi yang kesepuluh.
- Seluruh layer pixel di luar Region Pantai dikurangi overlap Region lain identik dengan A5. Desa A5, Puncak Kabut, Lembah Hujan serta Hutan & Sungai tidak didesain ulang. Collider wilayah lain juga identik.
- Kedua kolam x50–54 dan61–65/y102–106, seluruh frame recovery di dalamnya, cermin x58–59/y100–101 dan collider aslinya identik. Interaksi `pantai` / `misi-1` tetap pada **`(920,1672)`**, dengan ID, radius serta properti yang sama.
- Water mask dan jejak bridge/deck existing dipertahankan. Tile air baru mempunyai `collides:true`; deck baru mempunyai `bridge:true`. Laut di luar deck tetap tidak dapat dilewati. Perahu dekoratif tidak membuka jalur atau mekanik naik perahu.
- Vegetasi pemulihan yang sebelumnya menjadi pohon hutan acak di pasir ditata menjadi kelompok pesisir. Footprint recovery terrain existing dipertahankan dengan material dunegrass; tidak mengubah status/progres. Kondisi air kolam tetap memakai frame dan flag existing.
- Source `src/main.ts`, UI misi/aktivitas Evan, Tiko/backend, playtest/audio, movement, camera, Living World dan hooks tidak diubah. **97 berkas** basis main dibekukan dengan hash, termasuk source/data/aset/generator A5.
- Empat NPC Desa tetap memakai rute existing. NPC Pantai tidak ditambahkan karena limit4 masih digunakan; tidak membuat sistem NPC/AI/dialog baru. Dua anchor vegetasi bergerak `(33,110)` dan `(55,115)` serta pool riak air Living World dipertahankan.

Kontrak `PengaitDunia` aktual pada main tetap digunakan apa adanya. Tidak menambah atau mengganti hook `bicara`/`rayakan` yang tidak tersedia pada interface basis. Penguncian, interaksi, status misi, persentase pulih, refresh dan perayaan tetap milik kode tim.

## File yang diubah / ditambahkan

| Berkas | Peran |
| --- | --- |
| `scripts/design-pantai-v35.mjs` | Sumber generator deterministik empat zona; menurunkan A5 tanpa menjalankan ulang generator A5 |
| `scripts/coast-v35-art.mjs` | Geometri atlas lokal dan palet pesisir |
| `world/maps/pulau_tirta_v35.tmj` | Sumber editable Tiled |
| `world/maps/tilesets/v35_coast.tsj`, `world/assets/coast_v35/tileset.svg` | Tileset baru, GID1043–1426,384 frame384×256 |
| `public/maps/pulau-tirta-v35.json`, `public/assets/world/coast_v35/` | Export embedded runtime |
| `world/coast-v35.json` | Pembagian zona, properti, target tur, jejak deck dan batas source |
| `world/coast-v35-baseline.json` | Hash97 berkas main terbaru yang dilindungi |
| `src/game/world-map.ts`, `vite.config.ts`, `scripts/export-world.mjs` | Pemilihan map/chunk dan export V3.5 |
| `scripts/world-browser-session.mjs` | Helper CDP sementara; tidak dibundel ke aplikasi |
| `scripts/check-pantai-v35.mjs`, `scripts/coast-route-browser.mjs` | Screenshot, walkthrough, kontrol UI, tes Pantai, mobile dan offline |
| `tests/coast-v35.test.ts` | Scope, preservasi source, kolam, navigasi, deck/laut, recovery dan determinisme |
| `tests/village-a5.test.ts`, `world/a5-integration-archive.json`, `world/archives/a5-before-playtest/` | Koreksi tes historis A5 setelah integrasi UI tim; tidak mengubah UI aktif |
| README, `public/maps/README.md`, CREDITS dan dokumen world | Petunjuk runtime, aset dan laporan |

Setelah edit Tiled: `npm.cmd run world:export`. Generator desain hanya dijalankan manual; tanpa `--force` menolak menimpa map existing. `node scripts/design-pantai-v35.mjs --check` membandingkan hasil deterministik tanpa menulis file. Jangan menjalankan `--force` jika edit manual Tiled masih perlu dipertahankan.

## Kegagalan tes existing pada main

Sebelum implementasi, baseline main menghasilkan146 lulus/1 gagal. Tes A5 masih membandingkan hash `src/main.ts`, `src/style.css` dan `src/ui/layar.ts` dari sebelum penambahan playtest/audio. Versi A5 ketiga berkas diambil dari commit basis A5 dan disimpan di arsip, dengan hash lama tetap diperiksa. Dokumentasi historis `public/maps/README.md` juga diarsipkan agar petunjuk runtime aktif dapat diperbarui ke V3.5. Tes historis membaca empat snapshot tersebut; berkas lain tetap diperiksa langsung. Baseline V3.5 secara terpisah membekukan seluruh kode tim terbaru, termasuk tambahan playtest/audio. Tidak mengembalikan atau menimpa kode UI tim, dan tidak mengganti hash lama dengan hash baru.

## Artefak review

Buka [review HTML](previews/v35-pantai/review.html), atau `http://localhost:5173/world/previews/v35-pantai/review.html`. Preview berada dalam folder lokal yang mengikuti `.gitignore` existing.

| Keluaran | Berkas |
| --- | --- |
| Dermaga sebelum/sesudah | [sebelum](previews/v35-pantai/before-pier.png), [V3.5](previews/v35-pantai/after-pier.png) |
| Dua kolam sebelum/sesudah | [sebelum](previews/v35-pantai/before-pools.png), [V3.5](previews/v35-pantai/after-pools.png) |
| Garis pantai | [pesisir](previews/v35-pantai/after-shoreline.png), [pantai alami](previews/v35-pantai/after-natural-beach.png) |
| Transisi menuju pesisir | [jalur masuk](previews/v35-pantai/after-transition.png) |
| Overview Pantai Biru | [sebelum](previews/v35-pantai/before-overview.png), [V3.5](previews/v35-pantai/after-overview.png) |
| Perbandingan kamera identik | Slider per kawasan di review; [berdampingan](previews/v35-pantai/comparison-before-after.png); [crop source](previews/v35-pantai/after-tiles.png) |
| Walkthrough1–2 menit | [WebM](previews/v35-pantai/pantai-v35-walkthrough.webm), [rute/durasi/jarak](previews/v35-pantai/walkthrough-evidence.json), [hash map rekaman](previews/v35-pantai/walkthrough-source.json) |
| Halaman review | [HTML](previews/v35-pantai/review.html) |
| Laporan file/perubahan | Dokumen ini dan [salinan preview](previews/v35-pantai/REPORT.md) |
| Hasil tes | [Bukti verifikasi](previews/v35-pantai/validation-evidence.json), [browser](previews/v35-pantai/browser-evidence.json), [video](previews/v35-pantai/video-evidence.json) |
| Recovery | [kolam setelah misi](previews/v35-pantai/restored-pools.png), [crop setelah misi1](previews/v35-pantai/restored-tiles.png) |

Referensi diambil langsung dari game main/A5 sebelum pergantian map, dengan versi dan hash diperiksa. Metadata kamera seluruh kawasan sebelum/sesudah/recovery dibandingkan identik. Crop Pantai992×816 px. Screenshot adalah render Phaser; preview tile digunakan sebagai pembanding geometri tanpa sprite runtime yang bergerak.

## Pengujian

| Pemeriksaan | Hasil |
| --- | --- |
| World validation/export dan generator `--check` |Lulus |
| TypeScript |Lulus |
| Unit test |**154/154 lulus,19 file**, termasuk playtest/audio tim dan regresi A5 |
| Production build |Lulus; chunk `world-v35` dan service worker dihasilkan |
| Scope / kolam / deck |Pixel luar Pantai, collider wilayah lain, kolam/cermin/recovery, water mask dan jejak bridge diperiksa |
| Jalur |BFS dengan substep movement asli dari spawn; semua target tur, dermaga, dua kolam dan seluruh lokasi misi dapat dicapai |
| Collision / NPC |Properti solid tidak dapat ditembus; laut di luar deck terhalang; plan NPC existing tetap valid; state pulih tidak mengubah collision |
| Browser |Lulus: title/intro, movement, kamera, collision laut, fokus chat, Tiko dengan respons mock, interaksi E, slider/alasan M1, recovery dan reload; jurnal, jeda, audio dan panel playtest |
| Mobile390×844 |Lulus: Pantai, aktivitas penguapan dan jurnal; teks prompt minimal13 CSS px |
| Festival / simpanan |Demo Festival lulus; progres M1 normal tetap tersimpan dan Festival normal tetap terkunci |
| Walkthrough / review |18 titik,71.228 detik,3233.30 px; input WASD aktual. Video berbeda pada awal/2detik/68.228detik, hash map sesuai; seluruh gambar review termuat |
| Production / offline |Chunk `world-v35`,10 atlas dan service worker termuat; reload offline berhasil |

Browser memakai profil Chrome sementara sendiri dan helper CDP tanpa dependency tambahan. Walkthrough menggunakan input WASD → update/collision game, tanpa teleport selama tur; framing screenshot menggunakan posisi kamera yang ditetapkan. Aktivitas penguapan dioperasikan melalui slider dan pilihan alasan UI asli, tanpa memanggil callback selesai secara langsung.

Metadata kamera sebelum/sesudah/pulih identik untuk tujuh sudut. Video diperiksa sampai dekat akhir dan thumbnail tidak kosong. Uji browser ini mencakup aktivitas M1 serta demo Festival; tidak mengklaim pengujian ulang seluruh aktivitas misi lain. Tiko diuji dengan respons mock untuk memeriksa integrasi UI/payload, bukan kualitas jawaban layanan AI eksternal.

## Keterbatasan aset dan pengujian

Perahu, jaring, naungan, palem serta perlengkapan adalah placeholder SVG pixel-grid lokal yang dapat disempurnakan art pass berikutnya. Perahu tidak bergerak/dinaiki; tidak ada animasi jaring, sistem memancing atau dialog nelayan baru. Palem statis; gerak air dan beberapa tanaman memakai pool V3.3 existing. Riak tidak diganti efek berat.

Garis pulau dan bentuk tile collision laut dipertahankan untuk keselamatan navigasi; tampilan pasang diperkuat melalui material dangkal/pasir lembap, bukan perubahan besar bentuk pulau. Kode penjelasan penguapan tetap milik aktivitas Evan. Uji headless bukan pengukuran FPS laptop fisik. Distribusi build masih memuat arsip map lama; optimasi ukuran cache tidak menjadi lingkup Pantai.

**Berhenti setelah Pantai Biru V3.5 untuk review. Tidak commit, push atau merge.**
