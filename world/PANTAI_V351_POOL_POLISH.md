# Pantai Biru V3.5.1 — Kolam & Nature Polish

Implementasi dibatasi pada gambar dua kolam serta kelompok alam pesisir. Branch tetap `feature/world-pantai-b1`, HEAD `2458a76e36d8b6ba879b990601a8ac87cad92d59`. Seluruh pekerjaan V3.5 yang belum di-commit dipertahankan. Tidak commit, push, merge, reset, memasang dependency atau mengubah `.env`.

## Arti tinggi air sebelum perubahan

Kolam di map berasal dari gambar statis `scripts/create-tirta-props.mjs`: area dalam 48×48 px, tetapi air awal hanya digambar pada bagian bawah setinggi22 px. Ini tidak terhubung ke angka simulasi penguapan. Generator V3.1 menempatkan dua sprite tersebut pada x50/61,y102, masing-masing5×5 tile. Layer existing `Recovery_Plants_Pantai_Biru` menutup bagian tengah3×3 dengan gambar air setelah `misi-1` selesai.

Simulasi sebenarnya berada di `src/ui/aktivitas/pantai.ts`, terpisah dari map: kedua kolam mulai pada0.85; batas minimum0.2; laju terkena sinar0.035/detik dan teduh0.003/detik; observasi siap setelah selisih0.2. Tombol isi ulang mengembalikan kedua level. Seluruh angka, SVG/HTML, input, callback dan penjelasan Evan tersebut **tidak diubah**.

Gambar baru memakai permukaan air top-down yang menyatu, bayangan dinding bagian dalam yang sempit, tepi air dan garis ukur sisi kanan. Kedua kolam mempunyai tinggi awal yang sama, dengan inset satu/dua titik dan papan existing sebagai pembeda. Kondisi pulih memakai air lebih cerah dan penanda lebih tinggi, mengikuti pergantian visual existing. Penanda map merupakan ilustrasi keadaan world; bukan pembacaan langsung persentase atau level air selama aktivitas berlangsung.

## Hasil visual

- Kolam tetap80×80 px/5×5 tile: siluet sudut bertingkat, capstone berukuran berbeda, sambungan tidak seragam, highlight atas dan bayangan depan. Air biru muda/biru lebih dalam menjadi satu bidang tanpa kotak abu-abu kosong. Dua riak Living World existing tetap bergerak.
- Tepian eksperimen dibingkai batu rendah, semak, rumpun bunga, dunegrass dan palem rendah. Akses antara dua kolam, cermin, papan1/2 serta meja/cart tetap terbuka.
- Sebelas kantong alam mencakup pasir utara, sisi kolam, palem barat, area antara fasilitas, pesisir tenggara, palem selatan dan batu pasang.77 penempatan mencakup kelompok multi-tile serta detail kecil;38 kandidat yang menyentuh jalur/objek/area terlindungi dilewati. Tidak menggunakan RNG atau penyebaran seragam.
- Tiga kelompok batu solid existing memperoleh material abu-abu hangat, tanpa memindahkan atau memperbesar collider. Batu tambahan merupakan batu rendah tertanam yang dapat dilalui. Palem dewasa existing tetap; tambahan palem rendah adalah groundcover tanpa batang solid. Kerang, cabang kecil, bunga dan rumput menyambung kelompok tersebut, dengan hamparan pasir tetap terbuka.
- Pasir cerah/hangat/lembap dan air dangkal V3.5 dipertahankan; beberapa jejak angin lokal memperkaya bidang pasir. Tidak melakukan color grading global.

Inspeksi render awal memperlihatkan sebagian detail baru tertutup rumput recovery existing. Detail alam dipindahkan ke lapisan dekorasi di atas terrain recovery; tekstur pasir tetap di bawah agar tertutup rumput secara wajar. Render kondisi awal dan pulih kemudian diperiksa ulang. Bentuk palem rendah juga dirapikan agar lebih pendek dan berdaun lebar.

## Batas yang diverifikasi

Map tetap192×144, tile16,36 layer dan seluruh object layer identik dengan V3.5. Atlas lama10 tetap identik, atlas lokal polish menjadi yang kesebelas. Bangunan pesisir, shelter, meja/cart, perahu, dermaga, railing, jejak deck, palem dewasa, Paths, Water, Ground, Facades dan AbovePlayer tidak berubah. Pengecualian gambar Objects hanya kolam, tiga kelompok batu existing serta groundcover baru pada sel kosong.

**Seluruh collider dan solid mask world identik dengan V3.5**, termasuk setelah recovery. Tidak menambah penghalang atau mengubah navigasi. Seluruh tile di luar Pantai dan overlap Region Desa tetap identik. Desa A5, Puncak Kabut, Lembah Hujan serta Hutan & Sungai tetap utuh.

Interaksi `pantai` / `misi-1` tetap `(920,1672)`, radius dan ID sama. Cermin serta papan existing dipertahankan. Tidak mengubah source misi, backend, UI, Tiko, Jurnal, Festival, Living World, movement atau interface World.105 berkas tim/A5/V3.5 dibekukan dengan SHA256 dan diperiksa oleh tes.

## Sumber editor dan file implementasi

| Berkas | Peran |
| --- | --- |
| `scripts/polish-pantai-v351.mjs` | Delta deterministik atas sumber V3.5 yang disimpan; aturan kelompok dan perlindungan jalur |
| `scripts/pantai-pool-polish-art.mjs` | Atlas SVG pixel-grid lokal untuk kolam awal/pulih dan alam |
| `world/maps/pulau_tirta_v351.tmj` | Sumber Tiled aktif, editable |
| `world/maps/tilesets/v351_coast.tsj`, `world/assets/coast_v351/tileset.svg` | Atlas512×256 px,512 frame, firstgid1427 |
| `public/maps/pulau-tirta-v351.json`, `public/assets/world/coast_v351/tileset.svg` | Hasil export runtime |
| `world/coast-v351.json` | Manifest kantong alam/penempatan dan kontrak polish |
| `world/coast-v351-baseline.json` | Hash105 berkas yang dipertahankan |
| `src/game/world-map.ts`, `vite.config.ts`, `scripts/export-world.mjs` | Memilih map/chunk V3.5.1 dan menambahkan export |
| `tests/coast-pool-polish.test.ts` | Preservasi world, collider, kontrak kolam, layer recovery, penempatan dan determinisme |
| `scripts/check-pantai-pool-polish.mjs` | Screenshot Phaser dan uji gameplay/aktivitas kedua kolam |
| `scripts/review-pantai-pool-polish.mjs` | Memeriksa kamera, hash map, seluruh mode review dan membuat PNG perbandingan |
| README proyek/world/runtime, CREDITS, laporan ini | Dokumentasi sumber aktif, aset dan review |

Sumber, atlas, generator dan export **V3.5 lama tetap utuh**, sehingga bisa dijadikan pembanding. Buka `world/maps/pulau_tirta_v351.tmj` di Tiled, simpan, kemudian jalankan `npm.cmd run world:export`. Export/build tidak menjalankan generator desain sehingga edit Tiled tidak tertimpa. Generator manual menolak menimpa map existing tanpa `--force`; jalankan `--check` untuk pemeriksaan determinisme tanpa menulis. Jangan memakai `--force` jika edit manual belum dipertahankan.

## Screenshot dan halaman review

[Buka HTML review](previews/v35-pantai-pool-polish/review.html), atau `http://localhost:5173/world/previews/v35-pantai-pool-polish/review.html` ketika dev server aktif. Folder preview mengikuti `.gitignore` existing, bukan bagian commit.

| Keluaran | Berkas |
| --- | --- |
| Dua kolam sebelum/sesudah | [V3.5](previews/v35-pantai-pool-polish/before-pools.png), [V3.5.1](previews/v35-pantai-pool-polish/after-pools.png) |
| Close-up individual | [kolam1](previews/v35-pantai-pool-polish/after-pool-1.png), [kolam2](previews/v35-pantai-pool-polish/after-pool-2.png) |
| Seluruh area eksperimen | [screenshot](previews/v35-pantai-pool-polish/after-experiment.png) |
| Pasir dan batu | [screenshot](previews/v35-pantai-pool-polish/after-sand-rocks.png) |
| Vegetasi pesisir | [screenshot](previews/v35-pantai-pool-polish/after-vegetation.png) |
| Overview Pantai Biru | [screenshot](previews/v35-pantai-pool-polish/after-overview.png) |
| PNG berdampingan | [kolam](previews/v35-pantai-pool-polish/comparison-pools.png), [alam](previews/v35-pantai-pool-polish/comparison-nature.png) |
| Setelah M1 | [kolam](previews/v35-pantai-pool-polish/restored-pools.png), [overview](previews/v35-pantai-pool-polish/restored-overview.png) |
| Aktivitas asli Evan | [penguapan](previews/v35-pantai-pool-polish/mission-evaporation.png), [selesai](previews/v35-pantai-pool-polish/mission-complete.png) |
| Bukti pengujian | [browser](previews/v35-pantai-pool-polish/browser-evidence.json), [review](previews/v35-pantai-pool-polish/review-evidence.json), [verifikasi](previews/v35-pantai-pool-polish/validation-evidence.json) |

Gambar berasal dari render Phaser. Perbandingan PNG hanya menyandingkan screenshot asli. Tujuh kamera sebelum/sesudah/pulih memakai metadata identik, dan hash capture sesudah diverifikasi terhadap map runtime final. Karakter dan efek air bergerak dapat berbeda antarscreenshot.

## Pengujian yang dijalankan

| Pemeriksaan | Hasil |
| --- | --- |
| `npm.cmd run world:check` | Lulus; export sesuai sumber Tiled |
| `node scripts/polish-pantai-v351.mjs --check` | Lulus; deterministik, tidak menulis |
| `npm.cmd run typecheck` | Lulus |
| `npm.cmd test -- --reporter=dot` |159/159 lulus,20 file; termasuk regresi V3.5/A5 dan tes tim |
| `npm.cmd run build` | Lulus; chunk `world-v351` dan service worker dihasilkan |
| Preservasi physics/scope | Collider, solid mask, Paths, objek kontrak dan pixel di luar Pantai identik |
| Browser navigation | Input WASD melalui update/collision asli: gerbang, sisi selatan/barat kolam1, sisi timur/selatan kolam2, dermaga dan titik interaksi |
| Browser collision/ripple | Laut di luar deck menghentikan pemain; dua riak kolam bergerak; dialog mengunci movement |
| Browser eksperimen | E membuka aktivitas asli. Awal level sama; sinar kiri menurunkan air kiri lebih cepat; isi ulang; sinar kanan menurunkan kanan lebih cepat; alasan benar menyelesaikan M1 |
| Recovery / simpanan | Status selesai tersimpan normal, layer recovery terlihat, reload tetap pulih |
| Review | Tujuh kamera identik;14 kombinasi area/keadaan; seluruh gambar termuat; hash capture sesuai map final |

Chrome memakai profil sementara terisolasi; tidak mengubah save/profil Chrome pengguna. Tidak memanggil callback selesai untuk melewati aktivitas. Kedua kolam map membuka **satu interaksi Pantai existing**, bukan dua interaksi baru. Pengujian sisi kedua kolam dan kedua arah sinar dilakukan melalui mekanisme existing tersebut.

Uji mobile, offline reload dan seluruh misi lain tidak diulang pada V3.5.1; hasil historisnya tersedia di laporan V3.5. Build PWA berhasil, tetapi bukan klaim playtest offline baru. Tiko/backend tidak dipanggil khusus pada polish ini; source-nya diperiksa tetap identik.

## Batas aset

Atlas tambahan merupakan gambar SVG lokal pada grid pixel16, mengikuti palet Kenney tanpa menjadi aset resmi Kenney. Tidak ada download atau dependency tambahan. Batu rendah/palem rendah baru sengaja tidak menjadi collider. Tidak menambah pohon dewasa, NPC, AI, dialog, animasi sistem baru atau mekanik interaksi dekorasi. Bentuk pulau, wet-sand dan band air dangkal V3.5 dipertahankan.

**Berhenti setelah V3.5.1 kolam dan detail alam. Tidak commit atau push.**
