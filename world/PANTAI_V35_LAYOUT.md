# Pantai Biru V3.5 — rancangan sebelum pemasangan tile

Basis: `origin/main` / `2458a76`, sudah memuat A5 berwarna dan integrasi misi, playtest serta audio tim. Branch kerja `feature/world-pantai-b1`; kondisi awal bersih. A5 sudah digabung sehingga PR Pantai dapat ditujukan ke main tanpa menumpuk pada branch A5. Tidak commit/push/merge.

## Diagnosis screenshot awal

Pasir memakai satu tekstur berbintik yang berulang hampir di seluruh area. Benda kecil tampak terpencar; palem existing sangat tipis sehingga tidak membentuk ruang. Dermaga berupa bidang kayu tanpa area bongkar muat. Kedua kolam dan cermin berdiri sendiri. Transisi rerumputan ke pasir belum mempunyai tujuan dan komposisi yang jelas.

## Empat zona

| Zona | Focal point dan hubungan ruang | Akses yang disisakan |
| --- | --- | --- |
| A · Dermaga | Jejak deck existing dipertahankan. Perahu kecil ditambatkan di sisi laut, jaring dikeringkan dekat pangkal, peti ikan/keranjang dikelompokkan dekat area bongkar muat. Naungan kerja pada daratan di belakang dermaga menjadi pusat aktivitas. | Lajur deck dua tile; ujung dermaga; sambungan daratan. Perahu dekoratif tidak dapat dinaiki. |
| B · Stasiun eksperimen | Dua kolam5×5 dan cermin existing menjadi fokus. Apron batu terang dan jalur pendek menyatukan kolam; papan1/2, meja perlengkapan dan cart kecil berada di sisi, bukan di atas kolam. | `(57,104)` / `(920,1672)` dan radius misi, tepi kedua kolam, ruang di depan cermin. Tidak memberi naungan yang menyembunyikan kolam atau menambah penjelasan sains baru. |
| C · Pantai alami | Kelompok palem, dunegrass dan batu pada beberapa titik pesisir; kayu hanyut dan kerang hanya pada kantong pasang tertentu. Pasir cerah, hangat dan lembap membentuk bidang natural. Band air dangkal/foam tetap memakai bentuk water mask existing. | Ruang terbuka untuk menjelajah, jalan ke dermaga dan area kolam; laut tetap tidak dapat dilalui kecuali deck existing. |
| D · Masuk pesisir | Jalur dari batas Desa menyempit menjadi jejak pasir. Papan arah, palem, bench dan dunegrass menjadi titik orientasi sebelum masuk ke kolam. | Sambungan Desa di sisi Pantai; tidak menggambar ulang Desa pada area Region yang overlap. |

Properti medium menjadi prioritas: perahu, rak jaring, naungan, peti ikan dan meja. Bunga/kerang/jejak hanya mendukung kelompok ini. Tidak menggunakan random scatter atau target jumlah objek.

## Kontrak teknis

- Ukuran192×144, tile16, dan36 layer dipertahankan. Sumber baru diturunkan dari `pulau_tirta_v34_a5.tmj`; generator A5 tidak dijalankan ulang.
- Mask edit adalah Region Pantai `(14,82,62,51)` dikurangi setiap Region lain, khususnya overlap Desa pada x70–75/y82–97. Semua pixel/collider wilayah lain dibekukan.
- Pool kiri x50–54/y102–106, pool kanan x61–65/y102–106, cermin x58–59/y100–101 dan collider aslinya dibekukan. ID `pantai`, `misi-1`, titik interaksi, radius dan aktivitas HTML/SVG tetap sama.
- Bentuk water mask, sumber collision air dan jejak bridge/deck existing tetap stabil. Material air/kayu boleh diganti lokal dengan properti `collides`/`bridge` yang sesuai; tidak memperluas jalan di laut.
- Seluruh source UI, audio/playtest, backend, Tiko, misi, Living World dan source/data/aset A5 dipertahankan dengan baseline hash main terbaru.
- Dua anchor vegetasi berayun V3.3 pada `(33,110)` dan `(55,115)` dipertahankan; riak air existing tetap dipakai. Tidak menambah NPC karena limit4 masih dipakai warga Desa, dan tidak mengganti sistemnya.
- Recovery kolam tetap identik. Vegetasi pemulihan yang sebelumnya berupa pohon hutan acak di pasir hanya ditata pada sisi Pantai menjadi kelompok pesisir; source/progres misi tidak diubah.

## Verifikasi dan review

Referensi A5/main diambil dari Phaser sebelum pergantian map; metadata kamera disimpan. Screenshot final: overview, dermaga, kolam, garis pantai, transisi, pantai alami dan area kerja. Setelah inspeksi pertama, koreksi overlap/akses dan komposisi sebelum rekaman final1–2 menit.

Jalankan world validation, TypeScript, unit test, build, browser: akses dari Desa, deck/laut, dua kolam, tombolE, aktivitas penguapan dengan slider asli, Tiko, Jurnal/Jeda, pemulihan/reload, desktop/mobile dan PWA offline. Keterbatasan aset dicatat; properti baru adalah SVG pixel-grid lokal, bukan gambar eksternal.

Kegagalan awal main: tes historis A5 masih memeriksa hash UI sebelum penambahan playtest/audio. Tiga versi UI A5 diarsipkan dengan hash lama; tes historis membaca arsip tersebut, sedangkan baseline V3.5 membekukan seluruh kode tim terbaru. Tidak mengembalikan UI tim ke versi lama.
