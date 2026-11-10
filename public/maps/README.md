# Peta runtime Pulau Tirta

Game aktif memakai `pulau-tirta-v37-r2.json`, hasil ekspor dari
`world/maps/pulau_tirta_v37_r2.tmj` (192 × 144 tile, satu akses turun ke Lembah di atas world Puncak R2/Hutan R4; collider bank lokal ditambahkan, semua collider lama dan wilayah lain dipertahankan). Lembah R1, Puncak R2/R1, Hutan R4, R3, R2, R1, V3.8, V3.7, V3.6, V3.5.1 dan V3.5 tetap tersimpan utuh sebagai pembanding. V3.1 tetap tersedia di `pulau-tirta-v3-1.json` / `world/maps/pulau_tirta_v3_1.tmj`. V3 tetap tersimpan sebagai
`pulau-tirta-v3.json` / `world/maps/pulau_tirta_v3.tmj`. `pulau-tirta.json` dan
`world/maps/pulau_tirta.tmj` tetap tersedia sebagai arsip V1 (72 × 54 tile).
Jangan mengedit JSON runtime secara langsung. Petunjuk editor, ekspor, layer, dan
kontrak integrasi ada di [panduan world](../../world/README.md).

Jalankan `npm run world:export` setelah mengedit sumber Tiled. Perintah ini juga
berjalan otomatis sebelum `npm run dev` dan `npm run build`. Jika dev server sudah
berjalan, ekspor ulang akan memicu pembaruan Vite. Tidak diperlukan dependency baru.

V3.2/V3.3 terrain backup: `pulau-tirta-v3-2.json` / `world/maps/pulau_tirta_v3_2.tmj`.

Arsip A1 tetap tersedia: `pulau-tirta-v34-a1.json` / `world/maps/pulau_tirta_v34_a1.tmj`.

Arsip A1.1 dan A2 tetap disimpan sebagai `pulau-tirta-v34-a11.json` dan `pulau-tirta-v34-a2.json`.

Arsip A3 tetap tersedia di `pulau-tirta-v34-a3.json` / `world/maps/pulau_tirta_v34_a3.tmj`.

Desa Tirta A5 berwarna tetap dipertahankan; arsip lengkap A5 tersedia di `pulau-tirta-v34-a5.json` dan `world/maps/pulau_tirta_v34_a5.tmj`.
