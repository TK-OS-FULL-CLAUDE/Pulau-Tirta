import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Tes World mengekspor ulang peta besar dan menghitung hash. Sendiri selesai ±3 detik, tetapi saat `npm test`
    // menjalankan semua berkas sekaligus di laptop biasa bisa melewati batas bawaan 5 detik dan gagal palsu.
    testTimeout: 30_000,
  },
});
