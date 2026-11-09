# Sumber aset dan lisensi

Setiap aset pihak ketiga yang dipakai dicatat di sini: nama, pembuat, tautan, lisensi, dan file yang memakainya.

| Aset | Pembuat | Tautan | Lisensi | Dipakai di |
| --- | --- | --- | --- | --- |
| Ninja Adventure Asset Pack (rencana) | Pixel-boy & AAA | https://pixel-boy.itch.io/ninja-adventure-asset-pack | CC0 | Peta, karakter, efek suara |
| Ikon aplikasi (`public/icons`) | Tim | – | Buatan tim | PWA |
| Atlas legacy Tiny City | README prototype mengatribusikan kepada Kenney | Sumber lokal: `TINYCITYFINAL/public/assets/Tilemap/tilemap_packed.png`; identitas paket asli perlu dikonfirmasi | README menyebut CC0; paket legacy tidak memiliki License.txt. Atlas berbeda dari Tiny Town 1.1 | `world/assets/tiny_town/` (nama folder historis V1), `public/assets/world/tiny_town/`; V3 tileset `tiny_city`, infrastruktur dan avatar 108 |
| Tiny Town 1.1 | Kenney | Sumber lokal: `kenney_tiny-town`; situs pembuat tercantum dalam lisensi: https://www.kenney.nl | CC0, salinan asli: `world/licenses/Tiny-Town.txt` | `world/assets/kenney_tiny_town/`, `public/assets/world/kenney_tiny_town/`; rumah, pohon, pagar dan jalur V3 |
| Tiny Farm 1.0 | Kenney | Sumber lokal: `kenney_tiny-farm`; https://www.kenney.nl | CC0, salinan asli: `world/licenses/Tiny-Farm.txt` | `world/assets/kenney_tiny_farm/`, `public/assets/world/kenney_tiny_farm/`; kebun, barn, tanaman, pot dan dekorasi V3 |
| Tiny Battle 1.0 | Kenney | Sumber lokal: `kenney-tiny-battle`; https://www.kenney.nl | CC0, salinan asli: `world/licenses/Tiny-Battle.txt` | `world/assets/kenney_tiny_battle/`, `public/assets/world/kenney_tiny_battle/`; air, tepian dan batu/tanah V3; tidak memakai aset tempur |
| Terrain Tirta placeholder (arsip V1) | Pembuat paket persiapan Aufa; atribusi final perlu dikonfirmasi | Sumber paket: `pulautirtaprepaufa` | Placeholder perencanaan; asal dan izin distribusi perlu dikonfirmasi sebelum final | `world/assets/terrain/`, `public/assets/world/terrain/`; hanya V1, tidak digunakan V3 |
| Tirta Props V3.1, SVG pixel-grid | Dibuat lokal untuk proyek melalui `scripts/create-tirta-props.mjs` | Source: `world/assets/tirta_props/tileset.svg` | Buatan proyek; bukan bagian Kenney dan tanpa sumber aset eksternal | Sumur, cermin, windsock, bangku, panji, basin batu, material pasir/ledge/deck. Placeholder art yang bisa diganti tim; salinan runtime di `public/assets/world/tirta_props/` |
| Tirta Environment V3.2, SVG pixel-grid | Dibuat lokal melalui `scripts/detail-world-v32.mjs` | `world/assets/tirta_environment/tileset.svg` | Buatan proyek, tanpa aset eksternal tambahan; bukan Kenney | Material gunung/lembah, tebing, tangga visual, batu besar, kabut statis, palem, kios, meja pengembunan dan overlay sumur. Placeholder art; indeks dan keterbatasan di `world/ENVIRONMENT_V32.md` |
| Village Centre A1 pixel-grid | Dibuat lokal melalui `scripts/design-village-a1.mjs` | `world/assets/village_a1/tileset.svg` | Buatan proyek; bukan Kenney; tanpa aset eksternal baru | Paving cobble, lantai pasar dan bed pusat desa. Kios memakai placeholder V3.2 existing. Detail di `world/VILLAGE_A1.md` |

Sebelum menambah aset baru: pastikan lisensinya mengizinkan dipakai dan dibagikan di repo publik, lalu tambahkan barisnya di tabel ini.

## Desa Tirta A4

`world/assets/village_a4/paths.svg` adalah tekstur jalan tanah SVG pixel-grid lokal, dibuat melalui `scripts/design-village-a4.mjs` dengan palet tanah A1. Bukan aset Kenney dan tidak mengambil gambar eksternal. Enam belas varian tepian berbasis tetangga cardinal; ekspor runtime di `public/assets/world/village_a4/`. Seluruh atlas A3 tetap utuh.

## Desa Tirta A5

`world/assets/village_a5/props.svg` adalah properti SVG pixel-grid buatan lokal melalui `scripts/village-a5-props.mjs`: pohon peneduh, pergola, gerobak, rak panen beratap, meja kerja, planter dan jemuran. Palet kayu/hijau mengikuti atlas existing; tidak menyalin atau mengunduh gambar eksternal. Bukan aset resmi Kenney. Salinan runtime di `public/assets/world/village_a5/`. Atlas Kenney serta properti tahap sebelumnya tetap utuh. Detail komposisi dan batas penggunaan ada di `world/VILLAGE_A5.md`.

Finishing warna A5 menggunakan slot kosong atlas yang sama: bunga kuning/putih/pink/ungu/merah, tuft rumput dan dua keluarga tint rumput bertepian tersambung. Geometri ditulis lokal pada `scripts/village-a5-color.mjs`; tidak mengambil gambar luar atau mengubah atlas Kenney. Palet native rumput #84c669 dipertahankan.

## Pantai Biru V3.5

Polish V3.5.1 memakai atlas terpisah `world/assets/coast_v351/tileset.svg`, ditulis lokal melalui `scripts/pantai-pool-polish-art.mjs`: pasangan kolam batu sebelum/pulih, batu hangat, palem rendah, semak, bunga, kerang dan tekstur pasir. Atlas V3.5, bangunan dan dermaga tidak digambar ulang. Semua geometri memakai grid pixel 16 dan warna lokal; tidak ada aset/dependency eksternal baru. Laporan: `world/PANTAI_V351_POOL_POLISH.md`.

`world/assets/coast_v35/tileset.svg` dibuat lokal melalui `scripts/coast-v35-art.mjs`: material pasir/air dangkal/kayu, palem, perahu, jaring, naungan nelayan, perlengkapan eksperimen dan detail pesisir. Bukan aset resmi Kenney, tidak mengambil gambar eksternal atau memakai emoji. Gaya pixel-grid16 dan palet mengikuti lingkungan existing. Source Kenney serta atlas A5 tetap utuh. Salinan runtime di `public/assets/world/coast_v35/`. Keterbatasan placeholder ada di `world/PANTAI_V35.md`.

## Puncak Kabut V3.6

`world/assets/mountain_v36/tileset.svg` dibuat lokal melalui `scripts/puncak-v36-art.mjs`: material tiga teras, muka batu retak, tangga, konifer, platform terbuka dan perlengkapan observasi serta vegetasi rendah. Geometri pixel-grid16 mengikuti lingkungan Kenney; bukan aset resmi Kenney. Tidak mengunduh aset atau menambah dependency. Atlas wilayah lain tetap utuh. Komposisi disimpan di `world/mountain-v36.json`.

## Lembah Hujan V3.7

`world/assets/valley_v37/tileset.svg` adalah komposisi pixel-grid lokal melalui `scripts/valley-v37-art.mjs`: kontur lembah asimetris yang dipotong menjadi tile16, tiga cekungan kering/pulih, vegetasi, batu dan tanah lembap. Bukan screenshot atau aset resmi Kenney; tidak mengunduh gambar atau memakai dependency baru. Generator dan geometri komposisi berada di `scripts/design-lembah-v37.mjs` dan `world/valley-v37.json`. Semua atlas tahap sebelumnya dipertahankan.
