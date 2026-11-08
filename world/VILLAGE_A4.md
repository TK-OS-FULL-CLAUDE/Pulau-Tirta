# Desa Tirta V3.4-A4 — Final Polish

A4 dikerjakan di `feature/world-aufa-pr` sebagai delta atas A3. Lingkup berhenti pada Desa Tirta. Tidak ada commit, push, merge, reset, pemasangan dependency, atau pengambilan aset eksternal pada tahap ini. HEAD tetap checkpoint lokal sebelumnya `0ecc0fb`; perubahan A2/A3 dan A4 tetap berada di working tree.

## Review dan keluaran

Buka [halaman review A4](previews/v34-a4/review.html), atau `http://localhost:5173/world/previews/v34-a4/review.html` saat dev server aktif. Slider membandingkan A3/A4 serta awal/Festival. Preview tile membandingkan geometri tanpa perbedaan posisi NPC bergerak.

| Keluaran | Berkas |
| --- | --- |
| Overview seluruh desa | [A4](previews/v34-a4/village-after-a4.png) |
| A3 vs A4 | [A3 asli](previews/v34-a4/village-before-a4.png), [perbandingan berdampingan](previews/v34-a4/comparison-a3-a4.png), slider pada review |
| Plaza dan pasar | [pusat desa](previews/v34-a4/plaza-market.png) |
| Permukiman utara dan selatan | [utara](previews/v34-a4/homes-north.png), [selatan](previews/v34-a4/homes-south.png) |
| Pertanian | [sayur, bibit, bed kerja dan penyimpanan](previews/v34-a4/farming.png) |
| Jalan penghubung | [selatan](previews/v34-a4/road-spine.png), [timur laut](previews/v34-a4/road-north-east.png) |
| Awal / sesudah Festival | [awal](previews/v34-a4/village-after-a4.png), [Festival](previews/v34-a4/village-festival.png) |
| Walkthrough | [video WebM](previews/v34-a4/village-a4-walkthrough.webm), [rute dan waktu](previews/v34-a4/walkthrough-evidence.json), [hash peta yang direkam](previews/v34-a4/walkthrough-source.json) |
| Halaman review | [HTML](previews/v34-a4/review.html) |
| Laporan dan bukti tes | Dokumen ini, [salinan dalam folder preview](previews/v34-a4/REPORT.md), [hasil browser](previews/v34-a4/browser-evidence.json), [pemutaran video](previews/v34-a4/video-evidence.json) |

Referensi A3 diambil dari game aktif **sebelum** pergantian runtime, dengan `worldVersion=3.4-A3` diperiksa. Kamera overview A3, A4 dan Festival identik: pusat `(1528,1224)` px, zoom 1, scroll `(888,864)`, viewport game `1280×720`; viewport browser `1440×900`. Metadata di `camera-before-a4.json`, `camera-after-a4.json`, dan `camera-festival.json` diperiksa sama. Crop desa `816×688` px sesuai Region `(70,55,51,43)` tile.

Tur final berdurasi **112.419 detik** (sekitar 1 menit 52 detik), melewati **24 titik** dan **6.980 px** perjalanan. Tile jalan berkurang **465 ? 411**, dan cobble **142 ? 42**. Semua waypoint tur berada di jaringan jalan Desa, dengan collision dan movement asli; tidak ada teleport selama tur.

## Perubahan komposisi

**Jalan.** Putaran panjang di utara dihapus. Jalur gerbang Lembah kini turun langsung menuju simpang Balai dan pusat desa. Jalan sisi timur menjadi cabang untuk pekarangan herbal/gerbang timur dan cabang tenggara untuk gerbang Hutan; tidak lagi mengelilingi rumput kosong. Ruas buntu bekas patroli selatan dan putaran kecil di barat dipangkas. Akses servis rumah selatan menghindari papan kebun, sementara kios memiliki pintu masuk pelanggan yang tersambung ke jalan.

Jalan tanah memakai 16 varian SVG pixel-grid lokal, memakai palet tanah A1. Tepian luar sedikit tidak rata, sedangkan sisi antartile saling tersambung. Garis kisi antartile yang terlihat pada render awal diperbaiki sebelum rekaman final. Ini tambahan aset **lokal**, bukan paket eksternal. Tujuh atlas lama tetap identik.

**Kebun.** Lokasi kawasan pertanian dipertahankan. Kebun produksi barat mempunyai baris wortel panjang dan bed turnip pendek. Nursery memakai bed bibit yang digeser, petak tanah kerja dan wadah air. Kebun keluarga berbentuk L dengan sudut penyimpanan, sementara kebun dapur mempunyai satu baris campuran dan sisi servis terbuka. Pekarangan herbal lebih kecil dan terbuka. Pagar hanya membingkai pekerjaan; aisle dan pintu akses tetap bebas.

**Plaza dan pasar.** Letak dua kios, sumur, bangku utama dan ruang Festival A1.1 dipertahankan. Cobble dipusatkan pada apron sumur serta court Festival; jalur penghubung menjadi tanah. Kios kiri membawa sayur/hasil kebun, kios kanan gandum/benih dan peti panen. Barang dikelompokkan pada muka dan sisi kios, dengan akses pelanggan sampai tile `(84,74)`. Wadah di sisi sumur memperjelas aktivitas mengambil air tanpa menutup pendekatan.

**Warga.** Empat identitas NPC V3.3 tetap dipakai. Pedagang menata area kios; seorang warga idle dekat herbal; petani bergerak antara bibit, penyimpanan dan halaman Rumah Petani; warga plaza tetap memakai rute aman dengan jeda lebih panjang. Tidak menambah NPC, AI, dialog, quest, atau collider dinamis. Kecepatan, batas pool, pause dialog, culling dan aturan mengalah pada pemain tetap memakai Living World existing.

**Cerita air.** Sumur kering/pulih dan semua panji Festival existing tetap berada pada posisi yang sama. Tujuh wadah existing dari Tiny Farm dipakai sebagai detail kebutuhan air; sprite wadah terisi hanya muncul lewat layer Festival yang sudah ada. Tidak ada mekanik pengisian air atau perubahan progres misi.

## Batas perubahan dan integrasi

Ukuran tetap **192×144 tile**, tile16. Ketujuh rumah, spawn `(1544,1272)`, empat interaksi misi dan Festival `(1576,1272)` dipertahankan. Semua pixel layer di luar Desa, termasuk bagian Region Desa yang overlap Puncak/Pantai, dibandingkan dengan A3 dan identik. Collider yang menyentuh empat wilayah misi juga identik. Jumlah layer tetap36; layer recovery16 dan Festival3 tetap memakai kontrak existing.

| Berkas | Fungsi |
| --- | --- |
| `world/maps/pulau_tirta_v34_a4.tmj` | Sumber Tiled A4 terpisah dari A3 |
| `public/maps/pulau-tirta-v34-a4.json` | Ekspor embedded runtime |
| `world/village-a4.json`, `world/village-a4-baseline.json` | Tur, aktivitas dan hash sumber yang dilindungi |
| `world/assets/village_a4/paths.svg`, `world/maps/tilesets/v34_a4_paths.tsj` | Tekstur tanah lokal dan indeks tileset kedelapan |
| `src/game/world-map.ts`, `vite.config.ts`, `scripts/export-world.mjs` | Pemilihan dan ekspor peta A4 |
| `src/game/village-activity.ts` | Membaca waypoint opsional dari properti `NPCSpawns`, memakai rencana lama jika data tidak valid |
| `src/game/living-world.ts` | Satu import dan satu pemilihan plan melalui adapter; mesin Living World tidak diganti |
| `scripts/design-village-a4.mjs` | Delta komposisi dan pemeriksaan scope, tidak dijalankan otomatis saat build |
| `tests/village-a4.test.ts`, `scripts/check-world-browser.mjs` | Regresi scope, jalur, collision, NPC, rendering dan video |
| `README.md`, `world/README.md`, `public/maps/README.md`, `CREDITS.md` | Dokumentasi runtime dan asal tekstur lokal |

Arsip Tiled/runtime/aset A3 dan seluruh versi sebelumnya tidak ditimpa. Karena A4 secara eksplisit mengizinkan perubahan waypoint, baseline A1.1 dan A2/A3 kini memeriksa salinan renderer lama di `world/archives/living-world-through-a3.ts.txt` dengan **hash lama yang sama**. Tes A4 juga menghapus tepat import dan pemanggilan adapter yang diizinkan lalu membandingkan sisa renderer aktif dengan arsip byte demi byte. Baseline backend, Tiko, misi, model Living World, movement dan scene utama tetap memeriksa sumber aktif.

Tidak mengubah `.env`, `package.json`, lockfile, backend, Tiko, struktur UI atau logika misi. Map/aset wilayah Puncak Kabut, Pantai Biru, Lembah Hujan, dan Hutan & Sungai tidak didesain ulang.

## Verifikasi

| Pemeriksaan | Hasil |
| --- | --- |
| `npm.cmd run world:check` | Lulus; hasil ekspor sesuai sumber Tiled |
| `npm.cmd run typecheck` | Lulus |
| `npm.cmd test -- --reporter=dot` | **95/95 lulus, 12 file** |
| `npm.cmd run build` | Lulus; bundle A4 dan service worker dibuat |
| Scope dan tujuh rumah | Pixel luar desa/overlap, collider wilayah misi, footprint rumah, spawn/interaksi identik |
| Jalur dan collision | BFS memakai langkah movement asli; tujuh pintu, 24 titik tur, empat misi, plaza/sumur/kios/kebun/gerbang, cabang servis/bangku/pekarangan dapat dicapai |
| NPC | Empat plan aktif divalidasi dan disimulasikan tiga menit; tidak macet, menabrak, atau memasuki radius misi |
| Recovery / Festival | Sumur, panji dan progres dipertahankan; menyalakan layer recovery/Festival tidak mengubah solid/collision |
| Browser | Movement, kamera, chat focus, animasi existing, NPC, pause/culling, pool tetap, empat dialog, recovery, reload, Festival, demo dan prompt mobile diuji |
| Video dan review | Pemeriksaan frame awal/berubah dan seek mendekati akhir; hash peta rekaman dibandingkan dengan runtime final |
| Produksi offline | Seluruh atlas, service worker aktif, reload offline, tanpa exception/HTTP error |

Percobaan unit test yang berbagi beban render/build mengalami timeout5s pada tes ekspor. Pengulangan final setelah seluruh proses browser selesai lulus95/95 dalam1.99s; timeout tes tidak dilonggarkan.

Inspeksi visual dilakukan pada overview, plaza/pasar, pertanian, permukiman utara/selatan dan kondisi Festival. Perbaikan meliputi sambungan jalan yang terputus setelah pemangkasan loop, jalur yang mengenai bangku/papan/pohon, kisi pada tekstur tanah, akses kios, dan potongan jalan tanpa tujuan yang jelas. Rekaman final dibuat setelah koreksi tersebut.

Kios dan sumur tetap memakai gaya atlas/placeholder proyek existing. A4 tidak mengganti pack karakter atau menambah walk-cycle yang tidak tersedia. Browser headless memvalidasi render dan fungsi, bukan jaminan FPS pada perangkat fisik. Precache produksi mencakup arsip peta lama sehingga ukurannya sekitar18.2MiB; optimasi distribusi arsip berada di luar lingkup A4.

**Berhenti pada A4. Tidak melanjutkan wilayah lain.**
