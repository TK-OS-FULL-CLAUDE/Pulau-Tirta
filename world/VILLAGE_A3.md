# Desa Tirta V3.4 — A2 + A3

A2 dan A3 selesai pada `feature/world-aufa-pr`. Pekerjaan berhenti pada Desa Tirta.
Tidak mengerjakan ulang Puncak Kabut, Pantai Biru, Lembah Hujan atau Hutan & Sungai.

## Checkpoint dan status Git

Sebelum perubahan baru, seluruh 176 file existing diaudit: daftar path, isi teks,
JSON/map dan pola secret. Tidak ditemukan `.env`, API key terdeteksi, node_modules,
dist atau file sensitif dalam calon commit. World check, TypeScript dan 80 tes
existing lulus sebelum checkpoint.

Commit lokal **`0ecc0fb`** menyimpan V3.2 sampai A1.1. Commit ini dibuat atas instruksi
checkpoint pada tugas ini, **tidak di-push**. Perubahan A2/A3 setelah checkpoint
tetap belum di-commit. Tidak melakukan merge, rebase atau reset. Tidak mengubah
`.env`, dependency, backend Faza, Tiko, atau sistem misi Evan.

## Review hasil

Buka [review HTML](previews/v34-a3/review.html) di browser, atau
`http://localhost:5173/world/previews/v34-a3/review.html` saat dev server berjalan.
Halaman berisi slider sebelum/sesudah, kondisi festival, screenshot per kawasan,
dan walkthrough dengan tombol chapter.

| Output | Artefak |
| --- | --- |
| Seluruh Desa sebelum A2 | [A1.1 asli](previews/v34-a3/village-before-a2.png) |
| Seluruh Desa sesudah A3 | [A3](previews/v34-a3/village-after-a3.png) |
| Plaza dan pasar | [pusat desa](previews/v34-a3/plaza-market.png) |
| Permukiman utara | [tiga rumah dan kebun dapur](previews/v34-a3/homes-north.png) |
| Permukiman selatan | [rumah petani/sungai dan halaman](previews/v34-a3/homes-south.png) |
| Pertanian | [sayur, bibit, stok dan peralatan](previews/v34-a3/farming.png) |
| Jalur penghubung | [spine selatan](previews/v34-a3/road-spine.png), [gerbang timur laut](previews/v34-a3/road-north-east.png) |
| Sebelum/sesudah Festival | [awal](previews/v34-a3/village-after-a3.png), [pulih](previews/v34-a3/village-festival.png) |
| Preview tile dengan crop identik | [sebelum](previews/v34-a3/village-before-a2-tiles.png), [A3](previews/v34-a3/village-after-a3-tiles.png), [festival](previews/v34-a3/village-festival-tiles.png) |
| Walkthrough panjang | [video WebM](previews/v34-a3/village-a3-walkthrough.webm), [evidence](previews/v34-a3/walkthrough-evidence.json) |
| Build produksi offline | [screenshot](previews/v34-a3/gameplay-v34-a3-production-offline.png) |

Screenshot overview sebelum A2 direkam dari game A1.1 **sebelum** peta diubah,
dengan versi sumber diperiksa. Overview A3/festival memakai kamera yang sama:
pusat (1528,1224) px, zoom 1, viewport browser 1440×900. Metadata scroll x888/y864,
zoom1, width1280/height720 dibandingkan identik. Crop tile adalah 816×688 px, sesuai
Region Desa (51×43 tile); crop tidak menggambar sprite runtime yang berjalan.

Walkthrough berdurasi **113.518 detik**, sekitar **1 menit 54 detik**, melewati
**25 titik** dengan **6.958 px** pergerakan. Rute menyambangi ketujuh rumah, pasar,
sumur, kebun, penyimpanan panen dan gerbang. Kamera mengikuti pemain pada zoom
gameplay 3. Instrumen hanya mengubah state tombol WASD lalu membiarkan update game
dan collision existing bekerja; **tidak memakai setPosition selama tur**.
Rute hanya melalui tile jalan dan tetap di sisi Desa, termasuk tidak masuk rectangle
misi yang overlap. Jeda 1.3 detik tiap titik membantu melihat lingkungan.

Rekaman memakai canvas postrender VP8, target15FPS, ukuran sekitar 4.98MB. Video
berada di luar `public`, tidak ikut precache PWA. Rekaman ini bukan benchmark FPS
perangkat fisik. Hash layer visual awal dan collision disimpan dalam
`walkthrough-initial-state.json`: koreksi tanaman sesudah festival tidak mengubah
tampilan awal atau collision yang direkam.

## A2 — permukiman dan pertanian

Layout ditetapkan di [VILLAGE_A2_A3_LAYOUT.md](VILLAGE_A2_A3_LAYOUT.md).
Ketujuh rumah dan seluruh pixel atap/dinding/facade tetap sama. Kepadatan diarahkan
melalui aktivitas di sekitarnya, bukan menambah rumah.

- **Utara:** Rumah Utara, Rumah Kebun dan Balai dihubungkan dengan halaman depan,
  kebun kecil, pagar gerbang, area stok, pohon dan tempat duduk. Jalan mengitari
  bangunan dan kebun, bukan memotong dinding atau baris tanaman.
- **Barat:** Rumah Barat berhubungan dengan pasar existing dan jalan servis menuju
  kebun kampung. Halaman teduh dan beberapa peti memberi fungsi tanpa menutup pintu.
- **Timur:** Rumah Timur mendapat pekarangan herbal dan jalan depan. Kebun keluarga
  dekat Rumah Sungai terhubung melalui pintu pagar yang jelas.
- **Selatan:** Rumah Petani dan Rumah Sungai berbagi jalan halaman. Ruang terbuka
  antarrumah dipertahankan sebagai ruang berjalan, berhenti dan pengangkutan hasil
  panen; tepinya diberi pohon, bangku dan bunga.
- **Pertanian:** bed sayur dan bed bibit dipisah, dengan lorong servis tengah,
  pagar berpintu di kedua ujung, bak kayu, tong, peti hasil panen dan peralatan.
  Kebun dapur utara dan kebun keluarga timur memakai campuran tanaman berbeda.

A2 dibuat sebagai sumber terpisah, diekspor, lalu lulus empat tes scope/rumah/
navigasi/NPC sebelum A3 dijalankan. Ketika ada koreksi gabungan berikutnya, validasi
A2 dijalankan lagi sebelum generator A3; tidak meminta review di antara tahap.

## A3 — jalan dan kehidupan desa

Jalan tanah mengikat plaza/pasar dengan rumah, kebun dan empat sisi desa. Paving
A1.1 di pusat tetap utuh; di luar pusat, bintik paving lama diganti jalan tanah
yang lebih tersambung. Transisi permukaan terjadi pada sambungan jalan dan halaman,
tanpa mewarnai seluruh wilayah.

Gerbang barat laut terhubung ke rute Puncak, timur laut ke rute Lembah, pesisir ke
rute Pantai, dan tenggara ke rute Hutan. Semua perubahan tetap di sisi Desa.
Di tepi tenggara ada kelompok vegetasi yang menyatu dengan vegetasi existing;
sisi pesisir memakai rumput/semak rendah. Tidak membentuk hutan pinus baru di pantai.

Tes konektivitas jalan menemukan beberapa sambungan yang awalnya memotong pagar,
rumah atau pohon. Jalur diperbaiki mengitari hambatan; pohon transisi baru tidak
boleh menimpa tile jalan. Tes tambahan memeriksa seluruh tujuan walkthrough melalui
graf jalan yang menggunakan langkah gerak asli.

Empat NPC V3.3 dipertahankan tanpa penambahan: warga pasar, warga diam dekat kebun,
warga berjalan di halaman selatan dan warga plaza. Waypoint, speed, pause, culling,
player yield dan batas jumlah tetap sama. Lingkungan dibentuk untuk mengakomodasi
rute tersebut. Tidak ada AI API, jadwal harian atau dialog NPC baru.

## Pemulihan dan inspeksi visual

Pertanian memakai tiga layer Festival existing. Setelah flag festival selesai,
sebagian bibit/turnip tampak lebih segar, soil patch berubah lokal dan bunga muncul.
Tanaman yang sudah produktif pada kondisi awal tetap terlihat produktif; desa tidak
dibuat ditinggalkan atau rusak total.

Inspeksi hasil render dilakukan untuk overview, permukiman utara/selatan,
pertanian dan jalan. Area kosong diklasifikasikan sebagai halaman servis, ruang
berjalan NPC, kebun atau transisi tepi. Tidak ada scatter dekorasi acak. Beberapa
frame panen sempat terlihat seperti batang kering pada kondisi festival; varian
tersebut diganti dengan tanaman yang tetap segar. Tampilan awal dan collision
diverifikasi identik dengan yang direkam dalam walkthrough.

Pusat A1.1, sumur dan pasar tidak didesain ulang pada tahap ini. Tidak ada placeholder
atau atlas baru: Tiny Town/Tiny Farm existing, Tiny City untuk karakter, Tiny Battle
untuk air existing, serta paving/props lokal yang sudah tersedia. Lisensi/atribusi
di CREDITS tidak berubah.

## Proteksi empat wilayah dan integrasi

Mask edit adalah Region Desa **dikurangi seluruh rectangle empat Region misi**.
Bagian Puncak/Pantai yang overlap dengan rectangle Desa tetap dilindungi. Pusat
A1.1 x79–107,y71–84 juga dipertahankan seluruh tile-nya. Collider lintas batas tidak
dihapus; canopy/trunk lama di batas dipertahankan bersama.

Tes membandingkan setiap tile dan collider yang bersinggungan dengan empat Region
misi sebelum/sesudah, termasuk overlap. Seluruhnya identik. `Spawn`, `Interactions`,
`Regions`, `NPCSpawns`, FuturePaths, DevelopmentAreas dan kontrak integrasi tetap.
Spawn (1544,1272), Festival (1576,1272) dan titik misi tidak dipindah.

Tidak mengubah kode movement, kamera, input, NPC/living renderer, backend, Tiko,
UI maupun sistem misi. Baseline SHA pada `village-a2-a3-baseline.json` memverifikasi
source tersebut dan arsip A1.1. Status recovery tetap empat misi / 16 layer dan
Festival / tiga layer, dengan localStorage existing.

## File baru dan diperbarui

Baru:

- `scripts/design-village-a2-a3.mjs`: pass A2 dan A3 terarah, proteksi scope dan output
  manifest tur. Tidak dijalankan otomatis oleh dev/build.
- `world/maps/pulau_tirta_v34_a2.tmj`, `world/maps/pulau_tirta_v34_a3.tmj` serta kedua
  ekspor `public/maps/pulau-tirta-v34-a2.json` / `pulau-tirta-v34-a3.json`.
- `world/village-a2.json`, `world/village-a3.json`: bounds, manifest tujuh pintu,
  25 titik walkthrough dan checkpoint.
- `world/village-a2-a3-baseline.json`, `tests/village-a2-a3.test.ts`: sembilan tes
  untuk dua tahap, termasuk graf jalan A3.
- Layout, laporan ini dan folder `world/previews/v34-a3/`.

Diperbarui:

- `src/game/world-map.ts`: import data A3.
- `scripts/export-world.mjs`: ekspor A2/A3 bersama seluruh arsip sebelumnya.
- `vite.config.ts`: chunk data A3.
- `scripts/village-route-browser.mjs`: rute panjang berlabel/waktu, batas Desa dan
  mode road-only; mode rute pendek lama tetap tersedia.
- `scripts/check-world-browser.mjs`: capture referensi Desa, overview/festival,
  timeout khusus tur panjang, rekaman/evidence dan pengujian browser. Attach setelah
  reload diperkuat untuk menunggu resource modul dalam dokumen yang baru.
- README utama, world README dan public/maps README: peta aktif A3.

Manifest bangunan A1 tetap dipakai karena seluruh tujuh bangunan tidak berubah.
Tidak ada dependency baru atau perubahan `.env`. Setelah checkpoint, pekerjaan
A2/A3 tetap sebagai perubahan workspace untuk review; belum di-stage/commit lagi.

## Hasil pengujian

```powershell
npm.cmd run world:check
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
# Dengan dev/API existing aktif:
node scripts/check-world-browser.mjs --walkthrough
node scripts/check-world-browser.mjs
node scripts/check-world-browser.mjs --review
$env:WORLD_URL='http://localhost:3000'
node scripts/check-world-browser.mjs --production
```

- World check, TypeScript, unit tests, production build: lulus.
- **89/89 tes, 11 file**, termasuk seluruh 80 tes sebelum tugas ini dan sembilan
  tes A2/A3. Validasi A2 dijalankan sebelum A3 dan diulang setelah koreksi.
- Tujuh pintu, kebun dan seluruh tujuan misi terjangkau dengan collision/gerak asli.
  Semua 25 titik tur juga tersambung hanya melalui tile jalan di dalam Desa.
- Simulasi NPC tiga menit tiap plan: aman dan tidak menutup tujuan interaksi.
- Browser: walkthrough 113.518s / 25 titik / 6.958px, movement/camera, idle/flip,
  NPC/pause/culling, efek atmosfer/air/tanaman, input Tiko, empat dialog misi,
  festival, recovery/reload, Enter/Spasi dan demo diperiksa.
- Kamera overview before/after/festival dibandingkan identik. Bukti di
  `camera-before-a2.json`, `camera-after-a3.json`, `camera-festival.json`.
- Produksi: tujuh atlas, service worker aktif dan reload offline lulus. Data map
  sekitar 1.97MB / 50KB gzip; app sekitar 34.8KB / 13.5KB gzip. Arsip JSON ikut
  precache existing sehingga total 27 entri / sekitar 16.14MiB.
- Video diputar dan di-seek di halaman review sampai detik **110.518**, mendekati
  akhir; ukuran/frame gameplay diverifikasi, bukan gambar kosong atau statis.
  Metadata ada di `video-evidence.json`.

Keterbatasan yang tersisa: pola grid pada jalan/pagar masih terlihat, sebagian props
masih placeholder lokal existing, dan halaman bersama tetap cukup terbuka untuk
mobilitas/panen. Gerak karakter masih fallback satu pose. Belum melakukan benchmark
60FPS pada laptop fisik, Tiled desktop review atau playtest pedagogis panjang.
Keberhasilan build/test tidak dianggap sebagai penetapan kualitas visual final.

Edit artist berikutnya memakai TMJ A3 dan `world:export`. Generator menolak
menimpa output tanpa `--force`; simpan backup Tiled sebelum regenerasi manual.
Pekerjaan berhenti setelah A2 dan A3, menunggu review Desa Tirta.
