# Desa Tirta V3.4-A1.1 — Composition pass

Branch tetap `feature/world-aufa-pr`. Tidak commit, push, merge, reset/rebase,
mengubah `.env`, menambah dependency atau aset eksternal. A1, V3.3 dan V3.2 beserta
pekerjaan yang belum di-commit tetap tersimpan. Tahap ini hanya plaza, sumur, pasar
dan koneksi jalan terdekat; tidak melanjutkan permukiman atau empat wilayah misi.

## Rancangan dan review

Layout ditulis **sebelum penempatan tile** di [VILLAGE_A11_LAYOUT.md](VILLAGE_A11_LAYOUT.md),
setelah membaca screenshot A1 dan Sample Tiny Town/Tiny Farm lokal. Strukturnya:
pasar berkelompok di barat → pelataran sumur sebagai penghubung → plaza festival
kecil di timur. Rumah, kebun existing dan waypoint NPC tidak dipindah.

Buka [halaman perbandingan](previews/v34-a11/review.html) di browser, atau
`http://localhost:5173/world/previews/v34-a11/review.html` ketika dev server aktif.

| Review visual wajib | Hasil render |
| --- | --- |
| Plaza lama, A1 asli | [referensi](previews/v34-a11/plaza-a1-reference.png) |
| Plaza baru, A1.1 | [komposisi baru](previews/v34-a11/plaza-a11-current.png) |
| Kawasan pasar | [dua kios dan satu pelataran](previews/v34-a11/market-a11.png) |
| Sumur | [landmark penghubung](previews/v34-a11/well-a11.png) |
| Setelah Festival Hujan | [plaza pulih](previews/v34-a11/plaza-a11-festival.png) |
| Zoom-out pusat desa | [awal](previews/v34-a11/centre-a11-zoomout.png), [festival](previews/v34-a11/centre-a11-festival-zoomout.png) |
| Crop area yang sama | [A1](previews/v34-a11/centre-a1-reference.png), [A1.1](previews/v34-a11/centre-a11.png), [A1.1 pulih](previews/v34-a11/centre-a11-restored.png) |
| Navigasi browser | [rekaman rute](previews/v34-a11/village-a1-navigation.webm), [koordinat tercapai](previews/v34-a11/route-evidence.json) |
| Produksi offline | [screenshot](previews/v34-a11/gameplay-v34-a11-production-offline.png) |

**Kamera pembanding identik:** sebelum mengubah peta, browser merender A1 asli dan
memeriksa `worldVersion === 3.4-A1`. Camera follow dihentikan hanya pada profil capture,
lalu kamera dipusatkan pada tile (97,76), zoom 3, viewport browser 1440 × 900.
Capture A1.1 dan festival memakai parameter yang sama. Metadata `x=920`, `y=864`,
`zoom=3`, `width=1280`, `height=720` diperiksa `deepEqual` sebelum screenshot disimpan:
[A1](previews/v34-a11/camera-reference.json), [A1.1](previews/v34-a11/camera-current.json),
[festival](previews/v34-a11/camera-festival.json). Nilai x/y ini adalah scroll kamera
Phaser, bukan koordinat worldView setelah zoom. Gerak kamera gameplay tidak diubah.

Zoom-out merupakan render Phaser pada zoom 2, bukan hanya tile preview. Crop 464 ×
224 px memakai batas x79–107, y71–84 dan menggambar tile layer saja. Posisi NPC pada
gambar dapat berbeda karena waypoint berjalan; bandingkan geometry dengan slider.

## Perubahan komposisi

| Elemen | A1 | A1.1 |
| --- | --- | --- |
| Plaza | Bidang batu lebar dengan taman sudut yang hampir simetris | Court kecil dengan tepian tidak simetris sekitar x95–102, y77–82. Stage berukuran 4×3 tile tetap memuat titik Festival; spawn tetap aman. |
| Sumur | Di sisi barat plaza, terpisah dari pusat kegiatan | Digeser empat tile ke timur agar menjadi penghubung pasar/plaza. Pelataran batu, pohon di sisi dan bangku utara membingkai siluet tanpa menutup sumur. |
| Pasar | Dua kios berbeda baris, berjarak enam tile vertikal | Kios berdampingan pada (80,71) dan (83,71), sama-sama menghadap selatan ke satu pelataran tanah. Peti, tong, bak kayu dan hasil panen berada di tepi pelanggan. |
| Jalan | Beberapa jalur menyatu menjadi hamparan lebar | Koneksi sempit menuju rumah utara, balai, rumah barat/timur dan akses selatan. Lorong NPC dan jalur masuk pasar tetap terbuka. |
| Duduk/taman | Empat bangku dalam susunan berpasangan | Tiga bangku dalam kelompok tidak simetris: dekat sumur, taman barat daya dan sisi timur court. Rumput memisahkan ruang kegiatan. |
| Festival | Panji panjang di tepi plaza besar | Panji lebih pendek pada gerbang utara court, air sumur pulih dan bunga terlokalisasi. Dekorasi selatan di luar scope dipertahankan. |

Dalam rectangle perubahan 29×14 tile, jumlah tile `Paths` terisi turun dari **255
menjadi 196** (sekitar 23%). Hitungan ini mencakup lantai pasar dan jalan, bukan
skor kualitas art. Lantai inti kegiatan hanya satu court kecil; paving bukan lagi
satu bidang yang mencakup seluruh hubungan pasar/sumur/plaza.

Inspeksi screenshot awal menemukan tanaman mengganti separuh kanan bangku taman.
Tanaman dipindahkan dan tes menegaskan kedua frame semua bangku utuh. Inspeksi festival
juga menemukan panji melintasi wajah pemain pada framing plaza; panji dipindahkan
dari y76 ke y74 di gerbang utara. Render final diperiksa kembali sesudah perbaikan.

## Koordinat, collision dan NPC

- World tetap **192×144**, tile 16 px. `Spawn`, `Interactions`, `Regions`, `NPCSpawns`,
  `FuturePaths`, `DevelopmentAreas` serta kontrak misi existing tidak berubah.
- Spawn tetap **(1544,1272)** dan Festival **(1576,1272)** px. Tidak ada dekorasi/collider
  baru pada kedua titik tersebut.
- Semua tujuh rumah dan manifest A1 tetap sama. Atap/dinding/facade setiap rumah
  diuji identik dengan A1. Rumah Barat di dalam rectangle juga dipertahankan per tile.
- Sumur dekoratif berubah dari pusat landmark **(1432,1224)** ke **(1496,1224)** px
  (tile 93.5,76.5). Marker label, collider kaki dan overlay kering/pulih ikut bergeser.
  Sumur bukan objek `Interactions`; tidak ada perubahan mission API atau Festival.
- Semua waypoint NPC tetap identik dengan A1, termasuk lorong pasar (87,74) → (87,76)
  → (87,78) → (90,78). Validator segmen dan simulasi tiga menit tetap lulus.
- Collision objek yang dipindah mengikuti posisi baru; mask air dan collision di
  luar rectangle tetap sama. Recovery/festival tidak menambah collision runtime.
- Kode movement, kamera, input, living model, living renderer, dialog dan Tiko tidak
  diedit. Hash di `village-a11-baseline.json` memeriksa source gameplay dan arsip A1.

## Aset dan batas scope

Tidak menambah tileset atau placeholder baru. Ketujuh atlas A1 dan seluruh gambar
tetap identik. Tiny Town dipakai untuk pohon, papan dan bangunan existing; Tiny Farm
untuk stok/peti/bak/hasil panen. Kios, sumur, bangku, panji dan paving memakai
**placeholder lokal existing**, bukan sprite kios resmi Kenney. Atribusi yang sudah
tercatat di CREDITS tetap berlaku.

Generator bekerja hanya pada **x79–107, y71–84**. Ia menolak collider yang melintasi
batas dan memeriksa semua tile di luar rectangle sebelum menulis hasil. Unit test
membandingkan tile dan collision luar area dengan A1, serta memastikan rumah utuh.
Tidak mengubah pertanian, permukiman jauh, Puncak Kabut, Pantai Biru, Lembah Hujan
atau Hutan & Sungai. Screenshot/regresi wilayah lain tidak berarti art pass di sana.

Keterbatasan: grid jalan dan paving masih tampak berulang; tepi tanah pasar masih
geometris; kios/well placeholder perlu review gaya oleh tim. Gerak pemain masih
fallback satu pose dari V3.3, bukan spritesheet jalan empat arah. Tidak menyatakan
art final atau performa fisik 60 FPS hanya dari hasil build/video headless.

## File

Baru:

- `scripts/design-village-a11.mjs`: komposisi terarah dari sumber A1, tanpa random scatter.
- `world/maps/pulau_tirta_v34_a11.tmj` dan ekspor `public/maps/pulau-tirta-v34-a11.json`.
- `world/village-a11.json`: batas area, pusat landmark, framing dan metrik paving.
- `world/village-a11-baseline.json`, `tests/village-a11.test.ts`: preservation/scope,
  komposisi, bangku, navigasi, collision dan pemulihan.
- Layout sebelum tile pass, laporan ini, serta `world/previews/v34-a11/` termasuk
  referensi A1 yang diambil sebelum implementasi, review HTML dan video.

Diperbarui:

- `src/game/world-map.ts`: import map A1.1.
- `scripts/export-world.mjs`: menambah ekspor A1.1, mempertahankan semua versi lama.
- `vite.config.ts`: chunk data map A1.1.
- `scripts/check-world-browser.mjs`: stage A1.1, capture referensi bersumber A1,
  kamera fixed/deepEqual, capture sumur/pasar/zoom-out dan festival.
- README utama, world README dan public/maps README: versi aktif/panduan A1.1.

Tidak membuat manifest rumah baru karena seluruh rumah identik dengan A1.
Tidak mengubah atlas, `src/game/world.ts`, `map-data.ts`, `living-model.ts`,
`living-world.ts`, `server/`, `shared/`, `content/`, `src/ui/`, `src/tiko/`, atau dependency.

## Verifikasi yang dijalankan

```powershell
npm.cmd run world:check
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
# Dev/API lokal berjalan:
npm.cmd run world:browser
node scripts/check-world-browser.mjs --review
$env:WORLD_URL='http://localhost:3000'
node scripts/check-world-browser.mjs --production
```

- World validation dan TypeScript: lulus.
- **80/80 tes, sepuluh file**: seluruh 75 tes sebelumnya dan lima tes A1.1.
- Semua tujuh pintu dan kelima tujuan misi terjangkau dengan BFS yang menggunakan
  `bisaBerdiri` dan `langkahGerak` asli. Lorong pelanggan dan waypoint NPC aman.
- Browser benar-benar menjalani spawn → plaza → pelataran sumur → pasar → pintu
  Rumah Kebun melalui state WASD → `DuniaScene.update`, tanpa `setPosition` selama
  perjalanan. Koordinat akhir tiap target dicatat di `route-evidence.json`.
- Gerak/idle/flip pemain, NPC berjalan/pause/culling, efek air/kabut/angin/tanaman,
  fokus Tiko, dialog empat misi, Festival, recovery/reload, Enter/Spasi dan demo:
  lulus tanpa exception/HTTP error. Framing screenshot memakai teleport terpisah.
- Kamera old/new/festival diperiksa identik; screenshot dan video dinilai setelah
  render, termasuk koreksi bangku dan panji di atas.
- Rekaman rute diputar dan di-seek; frame gameplay diperiksa berisi gambar dan berubah.
- Production build, tujuh atlas, service worker dan reload offline: lulus. Chunk map
  sekitar **1.96 MB / 49 KB gzip**; app sekitar **34.8 KB / 13.5 KB gzip**. Precache
  menjadi 25 entri / sekitar **12.38 MiB** karena JSON map arsip tetap dipertahankan.
  Rekaman berada di luar `public`, tidak masuk precache.

Untuk edit artist berikutnya, buka TMJ A1.1 di Tiled lalu jalankan `world:export`.
Generator hanya manual; tidak dijalankan oleh dev/build dan menolak menimpa hasil
yang sudah ada tanpa `--force`. Simpan backup sebelum memakai opsi tersebut.

Pekerjaan berhenti di plaza, sumur, pasar dan koneksi terdekat.
