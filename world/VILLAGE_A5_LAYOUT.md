# Rancangan ruang Desa Tirta A5

Disusun sebelum pemasangan tile. Basis integrasi `origin/main` / `d4d7d63`, branch kerja `feature/world-desa-a5`, working tree awal bersih. Baseline121 tes lulus. Map aktif A4; artefak preview lama tersedia dalam folder backup workspace dan tidak ditimpa.

## Diagnosis dari A4 dan referensi Kenney

Kekosongan bukan karena kurang bunga: rumah terpisah oleh halaman tanpa batas atau fungsi, dan objek kecil tidak cukup membentuk ruang. Jalan tanah sudah lebih baik, tetapi sebagian lebar persimpangan tidak mempunyai tepi yang jelas. Dua kios berfungsi namun belum mempunyai halaman servis yang terasa digunakan. Mayoritas pohon desa sempit sehingga tidak membentuk tempat berteduh. Contoh lokal Kenney Tiny Town/Tiny Farm memperlihatkan kelompok pagar, tanaman dan stok dekat bangunan; lingkungan tersebut lebih penting daripada menebar ornamen mikro.

## Pembagian ruang yang akan dibangun

| Kelompok | Rancangan | Ruang bebas yang dipertahankan |
| --- | --- | --- |
| A · Pasar / sumur | Rak panen beratap di sisi kios; gerobak hasil kebun; pohon peneduh di titik pohon existing; planter di tepi court. Sumur tetap di lokasi dan apron existing. | Depan kedua kios, pintu rumah dekat pasar, pendekatan sumur, pusat Festival97–100/78–80 |
| B · Halaman utara | Halaman komunal kecil dekat Rumah Utara: pohon, tempat duduk, pergola dan planter. Rumah Kebun memiliki sudut penyimpanan dan peneduh; belakang Balai berupa tempat tunggu yang terhubung halaman. | Pintu95,65 /87,71 /104,70, jalur utama99,65–71 dan sambungan gerbang |
| C · Barat pasar | Rumah Barat mempunyai rak penyimpanan kompak dan tanaman pot, melanjutkan fungsi pasar. | Pintu81,81 dan jalan di depannya |
| C · Petani / sungai | Rumah Petani: rak panen, peralatan dan wadah air. Ruang antara rumah selatan menjadi halaman komunal dengan meja cuci, bangku dan pohon; Rumah Sungai tetap mempunyai jalur pintu yang terbuka. | Pintu88,91 /104,92; lintasan utama dari plaza ke pertanian dan jalur servis106 |
| C · Keluarga timur | Bangku existing menjadi bagian halaman keluarga dengan planter, tempat menjemur dan pohon pembatas di tepi halaman. | Pintu111,80, kebun herbal116,78, gerbang timur119,84 |
| D · Pertanian | Petak A4 yang beragam dipertahankan. Tambahkan titik sortir/naungan panen pada tepi nursery, peralatan dan tempat kerja kebun keluarga. | Aisle80 dan86,94, akses kebun111,94, empat gerbang keluar |

Pohon dan properti sedang digambar sebagai SVG pixel-grid lokal bila atlas native tidak menyediakan ukuran yang sesuai. Palet kayu, outline cokelat gelap dan tiga tingkat hijau mengikuti aset existing. Tidak mengambil gambar eksternal. Properti hanya visual/collision; tidak ada bangunan interaktif, AI, quest, dialog atau mekanik edukasi baru.

## Kontrak dan cara kerja

Sumber generator baru `scripts/design-village-a5.mjs` menurunkan map A4 menjadi sumber Tiled A5 terpisah; export menghasilkan JSON runtime. Build hanya mengekspor sumber, tidak menimpa desain lewat generator. Seluruh tile di luar mask Desa dikurangi overlap wilayah misi dilindungi. Footprint tujuh rumah, Spawn, Regions, Interactions dan layer pemulihan wilayah lain harus identik.

Sumber `src/main.ts`, UI, aktivitas Evan, backend/Tiko dan semua modul gameplay selain pemilihan map dibekukan pada basis integrasi. Kontrak `PengaitDunia` yang benar-benar tersedia digunakan apa adanya; tidak mengarang hook `bicara` atau `rayakan` baru. Empat NPC dekoratif tetap memakai adapter `villageActivity` dan Living World existing.

Setiap footprint baru mempunyai collision sesuai bentuk solidnya; daun/awning dapat menaungi dan tidak mempunyai collider sebesar bounding box. Keberhasilan dinilai dari screenshot gameplay sebelum/sesudah dengan kamera yang sama, keterbacaan fungsi setiap kelompok dan kenyamanan navigasi. Jumlah objek bukan target.

## Urutan review

1. Ambil A4 dari kode terintegrasi, kamera tetap dan referensi atlas berindeks.
2. Implementasikan kelompok ruang; validasi scope, seluruh pintu, gerbang, kios, sumur, dan NPC.
3. Render A5; tinjau overlap, jalan buntu dan tempat terlalu padat; koreksi sumber generator.
4. Jalankan world validation, TypeScript, unit test, production build, gameplay desktop/mobile, Jurnal/Jeda/Tiko, dialog warga, empat aktivitas dan Festival.
5. Rekam walkthrough final sekitar1–2 menit dan halaman review di `world/previews/v34-a5/`. Tidak commit/push/merge; berhenti pada A5.
