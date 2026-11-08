# World V3.3 — Living World Aufa

Implementasi runtime pada `feature/world-aufa-pr`. Perubahan V3.2 yang belum di-commit
dipertahankan. Tidak commit, push, merge, reset/rebase, mengubah `.env`, mengunduh aset
atau menambah dependency. Backend Faza, sistem misi Evan dan panel Tiko tidak diedit.

## Review gerak dan screenshot

Buka [review.html](previews/v33/review.html) di browser, atau melalui dev server di
`http://localhost:5173/world/previews/v33/review.html`. Putar video untuk menilai gerak;
screenshot hanya menunjukkan komposisi dan indikator interaksi.

| Demonstrasi rekaman canvas | File |
| --- | --- |
| Pemain berjalan kanan/kiri lalu idle, warga bergerak di plaza | [desa-walk-npc.webm](previews/v33/living-v33-desa-walk-npc.webm) |
| Kabut pixel dan kain windsock | [puncak-fog-wind.webm](previews/v33/living-v33-puncak-fog-wind.webm) |
| Riak dua kolam pantai | [pantai-water.webm](previews/v33/living-v33-pantai-water.webm) |
| Riak sungai di sekitar jembatan | [river.webm](previews/v33/living-v33-river.webm) |

Video dibuat melalui `MediaRecorder` VP8 dari salinan canvas saat `postrender`,
bertarget 15 FPS, berdurasi sekitar 3–5 detik. Salinan 2D ini hanya untuk alat rekam,
bukan jalur render aplikasi. Browser juga memutar dan melakukan seek video untuk
memeriksa frame berisi gameplay dan berubah. Hasilnya di `previews/v33/video-evidence.json`.
Ini rekaman headless dengan software renderer; bukan benchmark laptop fisik.

| Screenshot | File |
| --- | --- |
| Warga plaza | [desa](previews/v33/gameplay-v33-desa.png) |
| Permukiman | [rumah desa](previews/v33/gameplay-v33-desa-rumah.png) |
| Sebelum/sesudah festival | [sebelum](previews/v33/gameplay-v33-desa-plaza-before.png), [sesudah](previews/v33/gameplay-v33-desa-plaza-after.png) |
| Puncak Kabut | [pos](previews/v33/gameplay-v33-puncak.png), [pendakian](previews/v33/gameplay-v33-puncak-jalur.png) |
| Pantai | [kolam](previews/v33/gameplay-v33-pantai.png), [pesisir](previews/v33/gameplay-v33-pantai-pesisir.png) |
| Hutan & sungai | [sebelum](previews/v33/gameplay-v33-hutan.png), [pulih](previews/v33/gameplay-v33-hutan-after.png) |
| Lembah | [sebelum](previews/v33/gameplay-v33-lembah.png), [pulih](previews/v33/gameplay-v33-lembah-after.png) |
| Prompt pada viewport 390 px | [layar sempit](previews/v33/gameplay-v33-mobile-prompt.png) |
| Produksi setelah reload offline | [offline](previews/v33/gameplay-v33-production-offline.png) |

## Karakter: fallback satu pose

Atlas Tiny City legacy menyediakan karakter berbeda pada frame 108, 120, 121; bukan
urutan gerak orang yang sama. Tiny Farm 108/109 dan 120/121 adalah orang/hewan berbeda;
Tiny Town berisi karakter/alat/objek statis; Tiny Battle berisi unit militer dan
lingkungan. Tidak ditemukan spritesheet arah/jalan yang cocok. Prototype Tiny City
lama memakai satu gambar pemain dan tween NPC, bukan frame walk cycle.

- Posisi kaki `pemain` tetap hasil `langkahGerak`: **86 px/detik**, diagonal ternormalisasi,
  delta maksimum 40 ms, radius kaki 4.6 px dan substep collision yang sama.
- Sprite logis disembunyikan; `visualPemain` mengikuti kaki dengan bob vertikal maksimum
  **0.55 px**, berfase menurut jarak yang benar-benar ditempuh. Menekan tembok menghasilkan
  idle, bukan langkah di tempat. Kamera dan bayangan mengikuti kaki tanpa bob.
- Saat diam, offset vertikal nol; breathing berupa scaleY ±0.8%. Saat dialog/fokus input,
  visual kembali netral, NPC dan efek berhenti. Tidak ada tween berulang yang tertinggal.
- Kiri/kanan memakai flip. Arah atas/bawah dicatat dari input tetapi tetap memakai pose
  depan yang sama. Ini **bukan animasi empat arah**, tidak mengganti frame ke orang berbeda.
- Transisi jalan ke idle langsung mengembalikan offset maksimal setengah pixel ke nol;
  tidak membuat lompatan tinggi. Animasi interaksi khusus tidak ditambahkan: dialog
  tetap terbuka langsung melalui handler misi existing.

Untuk walk cycle lengkap dibutuhkan spritesheet karakter yang sama dengan idle dan
beberapa frame langkah untuk depan, belakang dan samping. Tidak mengambil paket baru
atau membuat frame tambahan palsu dalam tahap ini.

## NPC lokal

Empat marker `NPCSpawns` existing yang memiliki `decorative: true` digunakan kembali.
Marker fungsional atau yang tidak punya plan tidak disentuh. Tile NPC lama diganti
oleh sprite runtime; satu marker lama berada di dinding rumah sehingga tile dinding
dipulihkan dari manifest bangunan sebelum menggambar NPC di waypoint aman. Sumber
TMJ, koordinat marker dan collision tidak ditulis ulang.

| Warga | Aktivitas | Waypoint tile |
| --- | --- | --- |
| village_npc_1 | Pasar menuju jalan desa | (84,72) → (86,72) → (88,73), bolak-balik |
| village_npc_2 | Diam dekat kebun | (107,85) |
| village_npc_3 | Depan rumah menuju jalan | (104,92) → (104,94) → (100,94), bolak-balik |
| village_npc_4 | Berjalan di sisi plaza | (94,78) → (94,80) → (93,81), bolak-balik |

Kecepatan **23 px/detik**, jeda waypoint 1.6–2.6 detik. Setiap segmen diperiksa dengan
collision asli saat inisialisasi; plan tidak valid tidak diaktifkan. Pergerakan memakai
`langkahGerak` yang sama dengan pemain melalui skala delta. Tidak ada pathfinding,
jadwal harian, API AI, dialog NPC, atau wandering ke seluruh peta.

NPC menjaga jarak minimal radius interaksi + 12 px dan mengalah ketika pemain berjarak
kurang dari 14 px. NPC dekoratif bukan collider sehingga tidak menutup jalan/misi.
Di luar viewport + margin 32 px, simulasi, timer tunggu dan visual NPC dibekukan;
kembali aktif tanpa teleport atau mengejar waktu yang terlewat. Semua NPC berhenti
saat dialog, chat input, button HTML atau lock world aktif. Tidak memaksakan warga
tambahan di gunung, pantai atau hutan.

## Efek atmosfer dan pemulihan

- **Kabut:** lima cloud pixel kecil, bergeser lambat sekitar ±10 px horizontal dan
  ±2 px vertikal. Lebih banyak di sisi puncak daripada kaki gunung. Depth 18 berada
  di bawah visual pemain (20) dan prompt (40), dengan alpha rendah. Layer kabut statis
  V3.2 disembunyikan hanya pada runtime agar tidak menumpuk.
- **Angin:** dua texture cache turunan windsock lokal V3.1. Hanya ujung kain berubah
  satu pixel tiap 420 ms; tiang dan base tetap sama. Enam tile windsock diganti satu
  gambar runtime tanpa mengganti collision atau koordinat landmark.
- **Air:** pool tetap maksimum 36 overlay riak 12 × 3 px. Lima titik dicadangkan untuk
  dua kolam pantai dan tiga kantong air lembah; sisanya menyampel air terbuka di
  sekitar kamera pada grid 32 px. Tidak ada sprite per tile laut/sungai. Tepian dan
  deck jembatan tidak dipilih sebagai permukaan riak. Alpha dan posisi berubah halus.
- **M4:** riak pada koridor sungai menjadi sedikit lebih aktif setelah status existing
  `misi-4 === selesai`. Tidak menambah volume air global atau mengubah model ilmiah.
- **Vegetasi:** sepuluh tuft/bunga/semak terpilih bergerak horizontal maksimal 0.4 px.
  Tidak menganimasikan setiap pohon. Jika lokasi mempunyai tile recovery/festival,
  texture sprite mengikuti tile pengganti ketika `segarkan()` membaca progres existing.

Efek diperbarui **10 Hz**, hanya yang dekat kamera. Tidak ada blur, shader seluruh
map atau emitter partikel. Seluruh overlay bersifat visual; TMJ/JSON terrain, spawn,
koordinat misi, mask air, bangunan, dan collider V3.2 tetap identik. Recovery tetap
16 layer / empat misi dan tiga layer festival, tanpa sistem progres baru.

Texture riak/kabut dibuat sekali lewat Graphics Phaser; windsock dibuat sekali dari
aset SVG proyek yang sudah ada. Tidak ada download atau lisensi pihak ketiga baru.

## Indikator interaksi

Label world besar diganti prompt ringkas di bagian bawah viewport: `E · Kolam Pantai`,
`E · Pos Kabut`, `E · Cekungan Hujan`, `E · Bibit & Sungai`, `E · Festival Hujan`.
Prompt tidak mengikuti kepala pemain dan tidak menutupi karakter di tengah layar.

Ukuran dasar 7 world-px disesuaikan oleh ResizeObserver sehingga minimal **13 CSS px**
setelah canvas FIT pada layar sempit. Font dan word wrap mengikuti viewport. Prompt
memakai hysteresis: muncul pada radius asli 36 px dan bertahan sampai keluar 44 px.
Di ring luar tertulis `Dekati` agar tidak mengesankan tombol sudah aktif. **Radius
aksi tetap 36 px** melalui `interaksiTerdekat`, dengan E/Spasi/Enter existing. Jika
dialog/fokus HTML aktif, prompt disembunyikan dan tombol world tidak diproses.
Landmark non-misi juga memakai bilah bawah; tidak mendapat handler misi baru.

## File dan konfigurasi

File baru V3.3:

- `src/game/living-model.ts`: pose, arah, NPC state/waypoint/validasi dan prompt hysteresis,
  tanpa Phaser/DOM agar dapat diuji.
- `src/game/living-world.ts`: sprite NPC, penggantian tile dekoratif saat runtime, efek
  yang dibatasi kamera, pool riak dan sinkronisasi recovery.
- `tests/living-world.test.ts`: enam pengujian living world.
- `world/v33-baseline.json`: hash sumber/runtime V3.2 dan aset/manifestnya.
- Laporan ini serta `world/previews/v33/`: screenshot, empat rekaman WebM, evidence
  JSON dan HTML review. Rekaman berada di luar `public`, tidak memperbesar precache.

File existing yang diperbarui untuk V3.3:

- `src/game/world.ts`: visual pemain terpisah dari kaki, hook living world, prompt
  ringkas/responsif dan lifecycle ResizeObserver.
- `scripts/check-world-browser.mjs`: pengujian temporal NPC/pose/efek, pause/culling,
  viewport sempit, rekaman postrender, playback review, screenshot V3.3 dan offline.
- `README.md`, `world/README.md`: menunjuk fitur aktif V3.3 di atas terrain V3.2.

Konfigurasi terpusat `LIVING` pada `living-model.ts`: batas NPC, kecepatan/jeda, margin
kamera, jumlah kabut, kapasitas riak, batas tanaman, interval efek dan amplitudo bob.
Waypoint dan jeda tiap warga berada di `NPC_PLANS`. Konfigurasi tidak mengubah save.

**Tidak membuat map V3.3 duplikat:** V3.3 adalah versi fitur runtime; geometry masih
`pulau_tirta_v3_2.tmj` / `pulau-tirta-v3-2.json`, metadata map tetap 3.2, chunk map
tetap `world-v32`. Hash baseline memastikan perubahan V3.2 tidak tertimpa.

## Pengujian yang dijalankan

```powershell
npm.cmd run world:check
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
# Dengan dev server localhost:5173 dan API localhost:3000 yang sudah berjalan:
npm.cmd run world:browser
node scripts/check-world-browser.mjs --review
# Build produksi dilayani Express existing:
$env:WORLD_URL='http://localhost:3000'
node scripts/check-world-browser.mjs --production
```

- World validation / TypeScript / production build: lulus.
- **71/71 tes, delapan file**, mencakup 65 tes sebelum V3.3. Simulasi tiga menit
  setiap NPC memeriksa bounds lokal, collision, jeda/bergerak dan area misi.
- Tes pose menjaga amplitudo, idle, pause dan arah. Tes prompt memastikan hysteresis
  tidak memperluas radius interaksi. Hash memastikan terrain/aset V3.2 tetap utuh.
- Chrome: posisi kaki dan kamera bergerak, visual berjalan/idle/flip teramati,
  input W/S mengubah state arah dengan frame yang sama (108), NPC bergerak lalu
  dibekukan oleh dialog dan saat kamera berpindah, tidak ada pertambahan scene object.
- Perubahan posisi kabut, riak dan tanaman diukur lintas waktu; kedua frame kain
  windsock bergantian, riak laut aktif di pesisir, dan fog berada di bawah pemain.
  Pool teramati: **4 NPC, 5 fog, 36 riak, 10 tanaman**;
  scene total **98 game object** dan tetap sama setelah berjalan di beberapa wilayah.
  Rincian observasi ada di `browser-evidence.json`.
- Viewport 390 × 844: ukuran prompt minimal 13 CSS px diperiksa dari ukuran font,
  zoom dan skala canvas aktual. Pemeriksaan ini tidak menambahkan kontrol sentuh.
- Seluruh empat dialog misi dan festival, lock input, Tiko mock/context, recovery,
  reload, Enter/Spasi, gating festival dan demo: lulus tanpa exception/HTTP error.
- Produksi: keenam atlas dan service worker termuat; reload offline berhasil tanpa
  exception/HTTP error. Texture efek dibangun dari kode/aset yang sudah tercache.
- Rekaman diputar di browser dan frame lintas waktu dibandingkan; kualitas gerak
  tetap perlu dinilai Aufa melalui video, bukan dinyatakan final dari screenshot.

Build app sekitar **34.8 KB / 13.5 KB gzip**; chunk map tetap sekitar **1.96 MB / 49 KB
gzip**. Precache tetap 22 entri, sekitar **8.63 MiB**. Tidak mengukur jaminan 60 FPS
pada perangkat fisik, tidak menambah minigame/quest/dialog NPC, dan belum menyediakan
spritesheet jalan/interaksi empat arah.
