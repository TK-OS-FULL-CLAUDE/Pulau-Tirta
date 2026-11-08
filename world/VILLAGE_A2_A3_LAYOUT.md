# Desa Tirta A2 → A3 — layout sebelum tile pass

Checkpoint lokal sebelum pekerjaan: `0ecc0fb` (tidak di-push).

Tujuh rumah tetap pada koordinat A1.1; kesatuan desa dibangun melalui pekarangan,
kebun, jalan dan ruang kerja. Pusat A1.1 (x79–107,y71–84) dipertahankan.

| Kelompok | Fungsi dan hubungan |
| --- | --- |
| Utara | Rumah Utara, Rumah Kebun, Balai; halaman gerbang dan kebun kecil dihubungkan lewat jalan di sisi pagar, bukan melintasi tanaman. |
| Barat | Rumah Barat menghadap akses pasar; halaman teduh dan jalan servis menuju kebun kampung. |
| Timur | Rumah Timur, pekarangan herbal dan kebun keluarga; rute ke balai dan plaza melewati sisi bangunan. |
| Selatan | Rumah Petani dan Rumah Sungai berbagi jalan halaman; kebun produksi, bed bibit dan area stok hasil panen di barat, kebun sayur di timur. |

A2 mengerjakan empat kelompok tersebut, mempertahankan tujuh bangunan dan empat
NPC. Setelah validation/reachability A2 lulus, A3 menyatukan jalan menuju plaza,
pasar, rumah, kebun dan empat gerbang desa, lalu membuat transisi vegetasi di tepi.

Mask perubahan: rectangle Regions Desa Tirta (x70–120,y55–97) **dikurangi semua
rectangle Regions misi lain**. Bagian Desa yang overlap Puncak/Pantai tetap tidak
disentuh. Collider lintas batas dibiarkan; setiap tile/collider misi dibandingkan
dengan A1.1. Spawn, Interactions, Regions dan kontrak integrasi tidak berubah.

Pertanian memakai native Tiny Farm: bed sayur, bed biji/bibit, jalur servis, pagar
berpintu, peti, bak dan tong. Pemulihan memakai flag Festival existing pada tiga
layer yang sama. Tidak menambah aset/dependency/dialog/AI/NPC baru.

Ruang terbuka pusat festival, lorong pintu dan waypoint warga menjadi ruang yang
sengaja kosong. Dekorasi hanya di tepi aktivitas, bukan sebaran acak.

Walkthrough akhir akan mengunjungi ketujuh rumah, pasar/sumur, kebun barat/timur,
halaman selatan dan empat gerbang desa, memakai movement/collision game asli.
