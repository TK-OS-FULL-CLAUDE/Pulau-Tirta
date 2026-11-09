# Finishing A5 — Color Contrast & Flower Seeding

Tambahan ini dikerjakan pada working tree `feature/world-desa-a5` existing. Tidak mengganti basis branch, menarik perubahan tim ke working tree, commit, push atau merge. Pekerjaan A5 sebelumnya dipertahankan; snapshot map, atlas, screenshot dan walkthrough awal disimpan di `world/previews/v34-a5/color-polish/` sebelum perubahan.

## Komposisi warna

Rumput native Tiny Town diukur dari atlas existing dan tetap menjadi warna utama **#84c669**. Dua variasi melengkapinya: **#95c879** untuk taman/pekarangan segar, dan **#71ad61** untuk area peneduh serta tepi pohon. Palet dibuat dekat dengan warna Kenney existing, tanpa neon atau perubahan gaya rumah/karakter.

Tint dibentuk dari kelompok area yang saling menyambung di sekitar halaman, pohon dan kebun. Batas patch mempunyai tepian pixel yang tidak lurus sempurna; tidak menggunakan noise, pengacakan per tile, checkerboard atau perubahan menyeluruh ke semua rumput. Jalan tanah, court cobble dan bed kebun dipertahankan sehingga kontras datang dari rumput di sekelilingnya. Bunga kuning/merah/pink memberi aksen hangat terutama di pasar dan permukiman.

## Bunga dan rumput kecil

Frame lokal transparan menyediakan bunga **kuning, putih hangat, pink, ungu dan merah**, beserta tuft rumput dalam beberapa hijau. Bentuk mengikuti pixel-grid16; batang dipendekkan setelah inspeksi render pertama. Kelompok tetangga memakai warna dominan yang sama, sedangkan ujung kelompok memakai satu kuntum agar tidak tampak seperti barisan pasangan yang berulang.

Penempatan disusun eksplisit menurut fungsi ruang: taman Rumah Utara dan Balai, tepi pasar, halaman Rumah Barat, herbal/halaman keluarga timur, halaman petani, halaman komunal selatan dan tepi nursery. Kelompok liar lebih renggang di ruang rumput terbuka. Ukuran dan jarak kelompok berbeda; tidak menanam bunga merata pada seluruh map.

Filter penempatan menolak tile jalan, pintu/footprint rumah, objek existing, kanopi, tanah bed, air, collider, radius titik misi serta lintasan NPC. Bunga berada pada `TerrainDetails` di bawah objek, bukan objek solid atau interaksi baru. Tidak menambah layer, dependency, efek cahaya atau sistem animasi.

## Batas perubahan yang diperiksa

Hanya isi tile **`Ground` dan `TerrainDetails`** yang berubah dibanding A5 awal. Frame baru menggunakan slot yang sebelumnya kosong pada atlas A5 existing, sehingga jumlah tileset tetap9 dan layer tetap36. Semua geometri properti A5 sebelumnya tetap dipakai.

Baseline `world/village-a5-color-baseline.json` mencatat hash seluruh layer A5 awal, hash source gameplay/manifest NPC, dan hash collision mask hasil parsing A5 awal. Tes membandingkan seluruh layer selain Ground/TerrainDetails secara utuh dan memeriksa collision mask identik. Dengan demikian, Paths, Objects, AbovePlayer, Collisions, NPCSpawns, Interactions, Spawn, Regions, seluruh Recovery/celebration dan titik rumah tidak berubah.

Mask Desa tetap dikurangi overlap empat wilayah misi. Seluruh tile di luar mask dan collider wilayah lain dipertahankan. Tidak ada perubahan source misi, NPC, movement, UI, Tiko atau backend. Warna/vegetasi hanya dipasang melalui `scripts/village-a5-color.mjs`, dipanggil oleh generator A5; bukan edit yang hanya bertahan pada JSON export.

## Review

- [Halaman perbandingan warna](previews/v34-a5/color-polish/review.html): A4 → A5 final atau A5 awal → A5 final, dengan kamera overview/plaza/permukiman/kebun yang sama.
- [Screenshot A4 vs A5 final](previews/v34-a5/comparison-color-a4-a5.png): plaza, permukiman utara dan pertanian pada resolusi screenshot asli.
- [Overview A5 awal vs A5 final](previews/v34-a5/color-polish/comparison-a5-before-after.png).
- [Review A5 lengkap](previews/v34-a5/review.html), [laporan A5](VILLAGE_A5.md), [bukti verifikasi](previews/v34-a5/validation-evidence.json).

Screenshot A4 dan A5 awal tetap dipertahankan. Semua kamera setelah finishing dibandingkan dengan metadata sebelum: pusat/zoom/scroll identik. Sprite NPC dapat berada pada posisi berbeda karena gameplay tetap berjalan; gunakan preview tile untuk membandingkan geometri tanpa sprite runtime.

## Verifikasi

World validation, TypeScript, **129/129 unit test (16 file)** dan production build lulus. Browser gameplay desktop/mobile, empat aktivitas misi, Festival, penyimpanan progres, review video dan reload offline juga lulus. Halaman warna memuat16 pasangan gambar yang diperiksa. Tes baru memeriksa preservasi seluruh layer nonwarna, source NPC/misi, collision mask identik, kelima hue bunga, serta tidak ada bunga pada jalan/objek/radius interaksi. Browser capture digunakan untuk inspeksi komposisi, perbandingan kamera, pemulihan/Festival serta desktop/mobile.

Hasil akhir perintah dan bukti render terbaru dicatat dalam `world/previews/v34-a5/validation-evidence.json`. Walkthrough A5 diperbarui setelah finishing agar hash peta rekaman sesuai runtime final. Tidak ada klaim performa FPS dari pengujian headless.

**Berhenti setelah finishing A5. Tidak commit atau push.**
