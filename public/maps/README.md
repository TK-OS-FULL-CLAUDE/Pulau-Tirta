# Peta runtime Pulau Tirta

Game aktif memakai `pulau-tirta-v3-1.json`, hasil ekspor dari
`world/maps/pulau_tirta_v3_1.tmj` (192 × 144 tile). V3 tetap tersimpan sebagai
`pulau-tirta-v3.json` / `world/maps/pulau_tirta_v3.tmj`. `pulau-tirta.json` dan
`world/maps/pulau_tirta.tmj` tetap tersedia sebagai arsip V1 (72 × 54 tile).
Jangan mengedit JSON runtime secara langsung. Petunjuk editor, ekspor, layer, dan
kontrak integrasi ada di [ART_PASS_V31.md](../../world/ART_PASS_V31.md).

Jalankan `npm run world:export` setelah mengedit sumber Tiled. Perintah ini juga
berjalan otomatis sebelum `npm run dev` dan `npm run build`. Jika dev server sudah
berjalan, ekspor ulang akan memicu pembaruan Vite. Tidak diperlukan dependency baru.
