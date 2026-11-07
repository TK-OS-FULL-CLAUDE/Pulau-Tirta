# Pulau Tirta V3.1 — art pass

Map aktif: **`world/maps/pulau_tirta_v3_1.tmj`**, 192 × 144 tile, 16 px.
V3, runtime V3, empat TSJ V3 dan generator V3 tidak diubah. Hash baseline
disimpan di `world/v31-baseline.json` dan diperiksa oleh unit test. Ukuran,
Spawn, Regions dan Interactions identik dengan V3. Kontrak koordinat tetap
`world/world-contract-v3.json`.

## Acuan dan komposisi

Sample.png, Preview.png dan tile individual Tiny Town/Farm/Battle diperiksa.
Tiny City legacy menyediakan atlas dan preview prototype; tidak memiliki Sample.png
resmi di folder itu. Tidak ada download atau perubahan pada folder referensi.

- Desa: tujuh rumah Tiny Town utuh dengan satu pintu per fasad, jendela di atas
  dinding, gable pada baris bawah atap, dan bagian atap di depan avatar yang berjalan
  di belakang rumah. Footprint badan rumah tetap collider. Halaman menjadi hijau,
  jalan cobblestone menuju pintu, tiga kebun rumah berpagar dan pertanian berbaris.
  Lumbung memakai rangkaian modul atap/badan/pintu. Plaza berupa ring paving dan
  lawn stage, dengan bangku, sumur dan bed tanaman; lantai abu-abu dihapus.
- Pantai: pasir terang dan tepian pasir khusus pada pesisir, dua basin batu utuh
  dengan garis air dangkal dan pola batu dasar yang terlihat. Cermin memiliki kaca
  dan dudukan sendiri. Tidak ada mekanik cermin baru.
- Puncak: pad abu-abu dihapus, diganti permukaan gravel, bibir teras berundak,
  windsock, kelompok batu dan vegetasi pinus. Ini ilusi visual, tanpa elevasi baru.
- Lembah: bidang abu-abu diganti drybed campuran tanah/gravel, tepian air pulih
  berlekuk, paving ringan menuju titik misi, dan ruang visual awan/hujan tetap kosong.
- Hutan: sungai dan jembatan tetap di posisi V3. Deck memiliki pola papan, tiga
  bed bibit tersusun di sisi jalur, serta log sumbatan terlihat dekat sungai. Tidak
  ada tambahan dekorasi acak untuk mengisi ruang.

Pemulihan tetap per `misi-1`–`misi-4`, empat layer per misi. Sumur/rumah/plaza
tidak berubah karena satu misi wilayah selesai. Tiga layer `Celebration_Desa_*`
baru mengikuti **flag `festivalSelesai` yang sudah ada**: bunga, vegetasi lawn dan
tali panji muncul sesudah Festival Hujan, juga setelah reload progres. Callback
opsional world hanya membaca flag itu; tidak menambah progres atau API backend.

## Properti tambahan dan batas art

Atlas asli Kenney tidak diubah atau digabung. Tileset kelima `tirta_props`, GID
595–754, adalah **SVG pixel-grid lokal**, bukan aset Kenney atau aset eksternal.
Source SVG memakai rect integer dan `shape-rendering="crispEdges"`, tile 16 px,
margin/spacing 0. Phaser memuatnya sebagai satu texture untuk tilemap.

Properti sumur, cermin, windsock, kolam batu, bangku dan panji dibuat karena pack
tidak menyediakan bentuk khusus yang dibutuhkan. Material pasir, ledge dan deck
dibuat dalam source yang sama agar biome terbaca jelas. Ini placeholder art lokal
yang bisa diganti tim; jangan mengatribusikannya ke Kenney. Pintu kastil, palu,
wadah sayur dan lantai abu-abu tidak dipakai sebagai pengganti landmark tersebut.

Air dangkal di kolam sengaja menampilkan pola batu di dasar; setelah pemulihan,
air mengisi lebih banyak area interior, rim batu tetap terlihat. Penilaian alasan
ilmiah tetap sistem Evan/Faza, bukan ditentukan oleh art pass ini.

Belum ada animasi berjalan empat arah, awan/hujan baru, atau minigame. Cliff/ledge
adalah ilustrasi sederhana, bukan aset alam final. Lisensi atlas legacy Tiny City
masih perlu konfirmasi seperti catatan V3. Tiga lisensi pack baru tetap tersedia.

## Edit dan ekspor

1. Buka `world/maps/pulau_tirta_v3_1.tmj` di Tiled.
2. Simpan edit, jalankan `npm.cmd run world:export`.
3. `npm.cmd run world:check` memeriksa hasil tanpa menulis ulang.
4. `npm.cmd run dev` menjalankan map aktif; build dan dev hanya mengekspor sumber,
   tidak menjalankan ulang resep art pass.

`scripts/polish-world-v31.mjs` menyimpan resep perubahan terarah dari V3. Script
menolak overwrite tanpa `--force`; gunakan Tiled untuk edit sehari-hari. Regenerasi
manual dengan `--force` akan mengganti edit V3.1 sehingga harus dilakukan dengan
sengaja. `scripts/create-tirta-props.mjs` membangun ulang source SVG lokal.

Layer baru: Facades (depth 13), Celebration_Desa_Terrain (2),
Celebration_Desa_Decor (14), Celebration_Desa_Banners (32). Roof/kanopi tetap 30,
avatar 20, terrain/air pemulihan di bawah objek. Collider kolam diperbarui sesuai
rim basin; gerbang, rumah, bangku dan sumur tidak menutup akses misi.

## Verifikasi dan preview

```powershell
npm.cmd run world:check
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
# Dev server aktif; profil browser pengujian terpisah:
npm.cmd run world:browser
```

Pengujian V3.1 mencakup hash backup V3, koordinat identik, GID, susunan rumah,
kolam, flag festival, collider statis sebelum/sesudah recovery, serta penelusuran
jalur ke lima interaksi, seluruh pintu rumah, dan jembatan menggunakan movement
runtime. Browser menguji callback, Tiko mock, dialog, recovery, festival, persistensi
dan demo dengan instrumentasi sementara; pengujian rute lengkap adalah unit test.
Belum ada klaim kualitas visual final atau benchmark 60 fps pada laptop fisik.

Hasil 7 November 2026: `world:check`, TypeScript, **60 tes**, production build,
serta browser Chrome headless lolos. Pemeriksaan browser meliputi lima atlas,
gerak/kamera, Tiko mock, empat dialog misi, recovery langsung/setelah reload,
festival yang terkunci/terbuka, dekorasi festival yang persisten, Spasi/Enter dan
demo. V3.1 memiliki 26 tile layer + 8 object layer; footprint collider menjadi
1.647 setelah koreksi rumah, pagar, kolam dan properti.

File baru utama: `world/maps/pulau_tirta_v3_1.tmj`, `world/maps/tilesets/v31_tirta_props.tsj`,
`world/assets/tirta_props/tileset.svg`, `public/maps/pulau-tirta-v3-1.json`,
`public/assets/world/tirta_props/tileset.svg`, `scripts/create-tirta-props.mjs`,
`scripts/polish-world-v31.mjs`, `tests/world-v31.test.ts`, `world/buildings-v31.json`,
`world/v31-baseline.json`, dokumen ini dan preview di `world/previews/v31/`.

File diperbarui: `src/game/world.ts`, `src/game/world-map.ts`, `src/game/map-data.ts`,
`src/main.ts` (satu pembaca flag festival), exporter dan browser checker,
`vite.config.ts`, README utama/world/maps, serta CREDITS. Tidak ada perubahan pada
server, guardrail, pertanyaan, penilaian, dialog UI, `.env`, dependency atau lockfile.

Preview V3.1 dibuat oleh renderer canvas di script browser agar SVG dan PNG memakai
sumber yang sama dengan aplikasi. Helper PowerShell lama tetap untuk preview V3.

| Perbandingan | Gambar |
| --- | --- |
| V3 desa | [Rumah](previews/gameplay-v3-desa-rumah.png), [plaza](previews/gameplay-v3-desa.png) |
| V3.1 sebelum festival | [Rumah](previews/v31/gameplay-v31-desa-rumah.png), [plaza](previews/v31/gameplay-v31-desa-plaza-before.png) |
| V3.1 sesudah festival | [Rumah](previews/v31/gameplay-v31-desa-rumah-after.png), [plaza](previews/v31/gameplay-v31-desa-plaza-after.png) |
| Pantai | [Kolam](previews/v31/gameplay-v31-pantai.png), [pesisir](previews/v31/gameplay-v31-pantai-pesisir.png) |
| Puncak | [Screenshot](previews/v31/gameplay-v31-puncak.png) |
| Lembah | [Screenshot](previews/v31/gameplay-v31-lembah.png) |
| Hutan | [Screenshot](previews/v31/gameplay-v31-hutan.png) |
| Seluruh V3.1 | [Before](previews/v31/world-before.png), [after pemulihan + festival](previews/v31/world-after.png) |

Koordinat, ID misi dan sistem jawaban tidak berubah. Koordinasikan art props
sementara dengan Aufa/tim art dan animasi eksperimen dengan Evan; Faza tetap memakai
payload Tiko dan flag progres yang sama.
