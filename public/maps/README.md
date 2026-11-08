# Peta runtime Pulau Tirta

Game aktif memakai `pulau-tirta-v34-a11.json`, hasil ekspor dari
`world/maps/pulau_tirta_v34_a11.tmj` (192 × 144 tile). V3.1 tetap tersedia di `pulau-tirta-v3-1.json` / `world/maps/pulau_tirta_v3_1.tmj`. V3 tetap tersimpan sebagai
`pulau-tirta-v3.json` / `world/maps/pulau_tirta_v3.tmj`. `pulau-tirta.json` dan
`world/maps/pulau_tirta.tmj` tetap tersedia sebagai arsip V1 (72 × 54 tile).
Jangan mengedit JSON runtime secara langsung. Petunjuk editor, ekspor, layer, dan
kontrak integrasi ada di [VILLAGE_A11.md](../../world/VILLAGE_A11.md).

Jalankan `npm run world:export` setelah mengedit sumber Tiled. Perintah ini juga
berjalan otomatis sebelum `npm run dev` dan `npm run build`. Jika dev server sudah
berjalan, ekspor ulang akan memicu pembaruan Vite. Tidak diperlukan dependency baru.

V3.2/V3.3 terrain backup: `pulau-tirta-v3-2.json` / `world/maps/pulau_tirta_v3_2.tmj`.

Arsip A1 tetap tersedia: `pulau-tirta-v34-a1.json` / `world/maps/pulau_tirta_v34_a1.tmj`.
