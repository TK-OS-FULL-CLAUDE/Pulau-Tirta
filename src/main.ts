import Phaser from 'phaser';
import './style.css';
import { MISI_UTAMA, cariMisi } from '../shared/content';
import { festivalTerbuka, jawab, mulaiMisi, muat, periksaFestival, simpan, type Progres } from '../shared/missions';
import { DuniaScene, LEBAR, LOKASI, TINGGI, type Lokasi } from './game/world';
import { PanelTiko } from './tiko/panel';
import { bukaFestival, bukaMisi } from './ui/dialog-misi';

let progres: Progres = muat();
let lokasiSekarang: Lokasi = LOKASI[0];
let terakhirMaju = Date.now();
let terakhirSapa = 0;

const persenPulih = () => MISI_UTAMA.filter((m) => progres.status[m.id] === 'selesai').length / MISI_UTAMA.length;

function perbarui(p: Progres): void {
  progres = p;
  simpan(progres);
  terakhirMaju = Date.now();
  dunia.segarkan();
}

const panel = new PanelTiko(
  () => {
    const misi = lokasiSekarang.misiId ? cariMisi(lokasiSekarang.misiId) : undefined;
    return {
      lokasi: lokasiSekarang.nama,
      misiId: misi?.id,
      statusMisi: misi ? progres.status[misi.id] : undefined,
      kartuDidapat: progres.kartuDidapat,
      konsep: misi?.konsep,
    };
  },
  () => {
    const sisa = LOKASI.find((l) => l.misiId && progres.status[l.misiId] !== 'selesai');
    if (!sisa) return festivalTerbuka(progres) && !progres.festivalSelesai ? 'Semua tempat sudah pulih! Ayo ke Desa Tirta untuk Festival Hujan.' : 'Kamu sudah menyelesaikan semuanya. Hebat!';
    return `Coba ke ${sisa.nama}. Kayaknya ada yang aneh di sana.`;
  },
);

function interaksi(lokasi: Lokasi): void {
    lokasiSekarang = lokasi;
    dunia.terkunci = true;
    const lepas = () => {
      dunia.terkunci = false;
    };
    if (lokasi.misiId) {
      const misi = cariMisi(lokasi.misiId)!;
      perbarui(mulaiMisi(progres, misi.id));
      bukaMisi(
        misi,
        (pilihanId) => {
          const hasil = jawab(progres, misi.id, pilihanId);
          perbarui(hasil.progres);
          if (hasil.benar) {
            panel.sapa(`Kamu berhasil! ${lokasi.nama} pulih. Kartu Ilmu baru masuk ke Jurnal.`);
          } else if (hasil.tingkatPetunjuk) {
            const teks = misi.pilihan?.find((x) => x.id === pilihanId)?.teks ?? '';
            void panel.petunjuk(misi.id, hasil.tingkatPetunjuk, `Aku memilih: ${teks}`, pilihanId);
          }
          return hasil.benar;
        },
        lepas,
      );
    } else if (festivalTerbuka(progres) && !progres.festivalSelesai) {
      bukaFestival(periksaFestival, () => perbarui({ ...progres, festivalSelesai: true }), lepas);
    } else {
      panel.sapa(progres.festivalSelesai ? 'Hujan sudah turun. Terima kasih sudah memulihkan Pulau Tirta!' : 'Warga cemas. Perbaiki empat tempat yang rusak dulu, ya.');
      lepas();
    }
}

const dunia = new DuniaScene({
  statusMisi: (id) => progres.status[id] ?? 'belum',
  persenPulih,
  festivalSelesai: () => progres.festivalSelesai,
  bergerak: () => undefined,
  pindahWilayah: (lokasi) => { lokasiSekarang = lokasi; },
  interaksi,
});

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: LEBAR,
  height: TINGGI,
  backgroundColor: '#1f6f8b',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [dunia],
});

panel.sapa('Halo, aku Tiko! Aku tetes air yang tersesat. Pulau ini kekeringan. Jalan pakai WASD, tekan E di dekat tempat yang rusak.');

// Sapaan proaktif dari template: maksimal sekali dalam 3 menit, setelah ±90 detik tanpa kemajuan.
setInterval(() => {
  const kini = Date.now();
  if (dunia.terkunci || kini - terakhirMaju < 90_000 || kini - terakhirSapa < 180_000) return;
  const sisa = LOKASI.find((l) => l.misiId && progres.status[l.misiId] !== 'selesai');
  if (!sisa) return;
  terakhirSapa = kini;
  panel.sapa(`Mau coba lihat ke ${sisa.nama}? Kayaknya ada yang aneh di sana.`);
}, 5_000);

// Mode demo: ?demo=1&misi=misi-1 membuka misi langsung saat presentasi.
const q = new URLSearchParams(location.search);
const misiDemo = q.get('misi');
if (q.has('demo') && misiDemo) {
  const l = LOKASI.find((x) => x.misiId === misiDemo);
  if (l) setTimeout(() => interaksi(l), 800);
}
