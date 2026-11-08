# Rancangan sebelum tile pass — V3.4-A1.1

Scope: x79–107, y71–84. Semua rumah dan waypoint NPC dipertahankan.
Target: tiga ruang yang saling tersambung, bukan satu bidang paving besar.

```text
                    rumah dan kebun existing (tidak dipindah)
                         akses pintu / jalur utara
   ┌─────────────┐                │
   │ kios │ kios │      naungan   │
   └─────────────┘          bangku│
     pelataran pasar ──── [SUMUR] └────┐
   peti / hasil kebun       apron     │
        │     jalur NPC ────────── [plaza kecil]
  rumah │                        spawn / festival
  barat └──────── jalan ────────────┬──┘
              taman + duduk        │  taman timur
                                 akses selatan
```

| Elemen | Layout yang akan dipasang |
| --- | --- |
| Pasar | Kios existing 3×3 pada (80,71) dan (83,71), menghadap selatan ke satu pelataran. Peti di sisi, lorong pelanggan tetap terbuka. |
| Sumur | Dari (88,74) menjadi (92,74); landmark/collider/overlay kering-pulih ikut dipindah. Tidak mengubah Interactions/Spawn. |
| Plaza | Bidang tidak simetris sekitar x95–102, y77–82. Stage kecil tetap memuat spawn (1544,1272) dan Festival (1576,1272). |
| Jalur | Batu hanya pada koneksi rumah → sumur → plaza dan akses pasar/selatan; pelataran pasar memakai tanah. |
| Duduk/taman | Tiga bangku di pinggir, taman barat daya dan naungan timur. Tidak menutup sumur atau circle aksi Festival. |
| NPC | Waypoint V3.4-A1 tetap; terutama lorong (87,74)–(87,78)–(90,78) harus bebas. |

Referensi: screenshot A1, Kenney Tiny Town Sample.png, Tiny Farm Sample.png.
Gunakan atlas existing, tanpa paket atau placeholder baru. Penempatan eksplisit,
tanpa scatter acak. Setelah render, periksa rasio paving/rumput, akses pintu,
siluet sumur, pasangan kios, serta perubahan festival; perbaiki komposisi bila perlu.
