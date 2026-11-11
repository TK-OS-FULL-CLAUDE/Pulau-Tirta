import Phaser from 'phaser';
import './style.css';
import { FESTIVAL, MISI_UTAMA, cariMisi } from '../shared/content';
import {
  jawab,
  mulaiMisi,
  muat,
  periksaFestival,
  petunjukFestival,
  progresAwal,
  simpan,
  type Progres,
} from '../shared/missions';
import { DuniaScene, LEBAR, LOKASI, TINGGI, type Lokasi } from './game/world';
import { PanelTiko } from './tiko/panel';
import { RohTiko } from './tiko/roh';
import { isiJurnal } from '../shared/jurnal';
import { WARGA, naskahDesa, naskahPenduduk, semuaPembicara } from '../shared/warga';
import { pasangDemo, tujuanDariUrl } from './ui/demo';
import { bukaFestival, bukaMisi } from './ui/dialog-misi';
import { ID_JURNAL, bukaJurnal } from './ui/jurnal';
import { bukaPercakapan } from './ui/kotak-dialog';
import { bukaJeda, bukaJudul, bukaTamat } from './ui/layar';
import { pasangPlaytest } from './ui/playtest';
import { Suara } from './ui/suara';

const q = new URLSearchParams(location.search);
/** Mode playtest untuk pendamping (lihat src/ui/playtest.ts). Mengalahkan mode demo. */
const PLAYTEST = q.has('playtest');
if (PLAYTEST && q.has('demo')) {
  // Panel Tiko menampilkan label sumber jawaban kalau URL berisi `demo`; saat playtest anak tidak boleh melihatnya.
  q.delete('demo');
  history.replaceState(history.state, '', `${location.pathname}?${q}${location.hash}`);
}
/** Mode demo untuk presentasi: mulai dari awal setiap kali, dan progres tidak disimpan (lihat src/ui/demo.ts). */
const DEMO = q.has('demo');

const playtest = PLAYTEST
  ? pasangPlaytest({
      namaTempat: Object.fromEntries(LOKASI.filter((l) => l.misiId).map((l) => [l.misiId!, l.nama])),
      muatUlang: () => location.reload(),
    })
  : null;

let progres: Progres = playtest ? playtest.progres : DEMO ? progresAwal() : muat();

/** Efek suara dan musik pelan (Web Audio). Baru berbunyi setelah interaksi pertama. */
const suara = new Suara();
suara.pasang();

let lokasiSekarang: Lokasi = LOKASI[0];
let terakhirMaju = Date.now();
let terakhirSapa = 0;
/** Ajakan Festival dari Kepala Desa cukup sekali per sesi; kunjungan berikutnya langsung membuka Festival. */
let sudahDiajakFestival = false;

const persenPulih = () => MISI_UTAMA.filter((m) => progres.status[m.id] === 'selesai').length / MISI_UTAMA.length;

function perbarui(p: Progres): void {
  const lama = progres;
  progres = p;
  // Playtest menyimpan progres di kuncinya sendiri (bersama catatan waktu), demo tidak menyimpan sama sekali.
  if (playtest) playtest.catatPerubahan(lama, p);
  else if (!DEMO) simpan(progres);
  terakhirMaju = Date.now();
  dunia.segarkan();
  perbaruiLencana();
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
);

/**
 * Petunjuk Festival dari template per peristiwa (tanpa memanggil model): spesifik ke peristiwanya,
 * selalu jalan saat offline, dan kebocorannya diuji otomatis.
 */
function beriPetunjukFestival(ids: string[]): string | undefined {
  const h = petunjukFestival(progres, ids);
  if (!h) return undefined;
  perbarui(h.progres);
  const teks = FESTIVAL.peristiwa.find((e) => e.id === h.peristiwaId)?.petunjuk?.[String(h.tingkat)];
  if (teks) panel.sapa(teks);
  return h.peristiwaId;
}

/** Sorakan singkat di atas area game saat sebuah tempat pulih (peta sendiri berubah lewat dunia.segarkan()). */
function sorak(teks: string): void {
  const el = document.createElement('div');
  el.className = 'sorak';
  el.setAttribute('role', 'status');
  el.textContent = `Hore! ${teks}`;
  document.getElementById('game')!.append(el);
  setTimeout(() => el.remove(), 3200);
}

// Phaser menahan fokus saat canvas diklik, sehingga fokus tertinggal di tombol atau kotak ketik Tiko dan WASD
// tidak jalan. Lepas fokus saat anak mengklik pulau (bukan dialog misi).
document.getElementById('game')!.addEventListener('pointerdown', (e) => {
  if (e.target instanceof Element && e.target.closest('dialog')) return;
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
});

function interaksi(lokasi: Lokasi): void {
    lokasiSekarang = lokasi;
    dunia.terkunci = true;
    // Jeda singkat sebelum dunia aktif lagi, supaya Enter/Spasi yang menutup dialog tidak langsung membukanya lagi.
    const lepas = () => {
      setTimeout(() => (dunia.terkunci = false), 150);
    };
    if (lokasi.misiId) {
      const misi = cariMisi(lokasi.misiId)!;
      const sudahSelesai = progres.status[misi.id] === 'selesai';
      if (!sudahSelesai) perbarui(mulaiMisi(progres, misi.id));
      bukaMisi(misi, {
        namaLokasi: lokasi.nama,
        sudahSelesai,
        pilih: (pilihanId) => {
          const hasil = jawab(progres, misi.id, pilihanId);
          perbarui(hasil.progres);
          suara.main(hasil.benar ? 'benar' : 'keliru');
          if (hasil.benar) {
            panel.sapa(`Kamu berhasil! ${lokasi.nama} pulih. Kartu Ilmu baru masuk ke Jurnal.`);
            return { benar: true };
          }
          const teks = misi.pilihan?.find((x) => x.id === pilihanId)?.teks ?? '';
          const petunjukTiba = hasil.tingkatPetunjuk
            ? panel.petunjuk(misi.id, hasil.tingkatPetunjuk, `Aku memilih: ${teks}`, pilihanId)
            : undefined;
          return { benar: false, tingkatPetunjuk: hasil.tingkatPetunjuk, petunjukTiba };
        },
        tutup: () => {
          lepas();
          if (!sudahSelesai && progres.status[misi.id] === 'selesai') {
            sorak(`${lokasi.nama} pulih!`);
            suara.main('pulih');
          }
        },
      });
    } else {
      // Desa Tirta: Kepala Desa mengarahkan ke tempat yang masih rusak, mengajak ke Festival, atau berterima kasih.
      const n = naskahDesa(progres);
      if (n.jenis === 'festival' && sudahDiajakFestival) {
        bukaFestivalDesa(lepas);
        return;
      }
      bukaPercakapan(n.baris, {
        pembicara: WARGA.pembicara,
        tutup: (tamat) => {
          if (n.jenis === 'festival') {
            sudahDiajakFestival = true;
            if (tamat) {
              bukaFestivalDesa(lepas);
              return;
            }
          }
          lepas();
        },
      });
    }
}

/** Penduduk desa (PRD F-03): menyebut tempat yang mereka pedulikan sampai tempat itu pulih. */
function ajakBicara(wargaId: string): void {
  const n = naskahPenduduk(progres, wargaId);
  if (!n) return;
  dunia.terkunci = true;
  bukaPercakapan(n.baris, { pembicara: semuaPembicara(), tutup: () => lepasKunci() });
}

function bukaFestivalDesa(lepas: () => void): void {
  bukaFestival({
    periksa: (jawaban) => {
      const salah = periksaFestival(jawaban);
      if (salah.length) suara.main('keliru');
      return salah;
    },
    petunjuk: beriPetunjukFestival,
    selesai: () => {
      const kartuDidapat = [...new Set([...progres.kartuDidapat, ...FESTIVAL.kartuMateri])].sort((a, b) => a - b);
      perbarui({ ...progres, festivalSelesai: true, kartuDidapat });
      suara.main('hujan');
      panel.sapa('Hujan turun! Terima kasih sudah memulihkan Pulau Tirta. Aku pulang ke awan dulu, ya. Sampai jumpa!');
    },
    tutup: () => {
      lepas();
      if (progres.festivalSelesai) {
        sorak('Hujan turun di Pulau Tirta!');
        setTimeout(tampilkanTamat, 2200);
      }
    },
  });
}

class SharpWorld extends DuniaScene {
  override create(): void {
    super.create();
    // These two fixed labels are drawn at 7–9 world pixels before camera zoom.
    // Rasterize their glyphs at the camera's 3× zoom for readable screen text.
    for (const object of this.children.list) {
      if (object instanceof Phaser.GameObjects.Text && object.scrollFactorX === 0 && object.scrollFactorY === 0 && object.style.backgroundColor === '#1c2a33') {
        object.setResolution(3);
      }
    }
    // Roh Tiko memutari pemain; panel memberi tahu kapan Tiko berpikir atau berbicara.
    // Sprite pemain adalah field privat DuniaScene, dan world.ts dikunci tes preservasi World, jadi dibaca dari sini.
    const pemain = () => (this as unknown as { pemain?: Phaser.GameObjects.Sprite }).pemain;
    const roh = new RohTiko(this, () => pemain());
    panel.pantau((s) => roh.atur(s));
  }
}

const dunia = new SharpWorld({
  statusMisi: (id) => progres.status[id] ?? 'belum',
  persenPulih,
  festivalSelesai: () => progres.festivalSelesai,
  bergerak: () => undefined,
  pindahWilayah: (lokasi) => { lokasiSekarang = lokasi; },
  interaksi,
  namaWarga: (id) => WARGA.penduduk[id]?.nama,
  bicara: ajakBicara,
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
  // Suara game dibuat sendiri di src/ui/suara.ts. Tanpa ini Phaser membuat AudioContext saat dimuat (sebelum
  // interaksi), dan browser menulis peringatan autoplay di console. Kalau dunia nanti butuh audio Phaser, hapus baris ini.
  audio: { noAudio: true },
  scene: [dunia],
});

const SALAM = 'Halo, aku Tiko! Aku tetes air yang tersesat. Pulau ini kekeringan. Jalan pakai WASD, tekan E di dekat tempat yang rusak.';

// Sapaan proaktif dari template: maksimal sekali dalam 3 menit, setelah ±90 detik tanpa kemajuan.
setInterval(() => {
  const kini = Date.now();
  if (dunia.terkunci || kini - terakhirMaju < 90_000 || kini - terakhirSapa < 180_000) return;
  const sisa = LOKASI.find((l) => l.misiId && progres.status[l.misiId] !== 'selesai');
  if (!sisa) return;
  terakhirSapa = kini;
  panel.sapa(`Mau coba lihat ke ${sisa.nama}? Kayaknya ada yang aneh di sana.`);
}, 5_000);

// ---- Layar judul, menu jeda, layar tamat ----

const kunci = () => (dunia.terkunci = true);
const lepasKunci = () => setTimeout(() => (dunia.terkunci = false), 150);
const tutupSemuaDialog = () => document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach((d) => d.close());

/**
 * Mulai dari awal. Di mode demo cukup di memori; selain itu progres dihapus lalu halaman dimuat ulang.
 * Di playtest hanya data anak yang sedang bermain yang dikosongkan; hasil anak yang sudah disimpan tetap ada.
 */
function ulang(): void {
  if (DEMO) {
    tutupSemuaDialog();
    perbarui(progresAwal());
    return;
  }
  if (playtest) playtest.ulangAnak();
  else simpan(progresAwal());
  location.reload();
}

function tampilkanTamat(): void {
  tutupSemuaDialog();
  kunci();
  bukaTamat({ jumlahKartu: progres.kartuDidapat.length, ulang, tutup: lepasKunci });
}

function bukaMenuJeda(): void {
  if (document.querySelector('dialog[open]')) return;
  kunci();
  bukaJeda({ ulang, tutup: lepasKunci, suara: { nyala: suara.nyala, ubah: (nyala) => suara.ubah(nyala) } });
}

const tombolJeda = document.createElement('button');
tombolJeda.type = 'button';
tombolJeda.className = 'tombol-jeda';
tombolJeda.textContent = 'Jeda';
tombolJeda.addEventListener('click', bukaMenuJeda);

// ---- Jurnal Petualangan ----

const NAMA_TEMPAT = Object.fromEntries(LOKASI.map((l) => [l.id, l.nama]));
/** Kartu yang sudah dilihat di Jurnal; kartu yang didapat sesudahnya ditandai angka di tombol Jurnal. */
let kartuTerlihat = progres.kartuDidapat.length;
const lencana = document.createElement('span');
lencana.className = 'lencana';
lencana.hidden = true;
const tombolJurnal = document.createElement('button');
tombolJurnal.type = 'button';
tombolJurnal.className = 'tombol-jurnal';
tombolJurnal.append('Jurnal', lencana);

function perbaruiLencana(): void {
  const baru = progres.kartuDidapat.length - kartuTerlihat;
  lencana.hidden = baru <= 0;
  lencana.textContent = String(baru);
  tombolJurnal.setAttribute('aria-label', baru > 0 ? `Jurnal, ${baru} Kartu Ilmu baru` : 'Jurnal');
}

function bukaJurnalDunia(): void {
  if (document.querySelector('dialog[open]')) return;
  kunci();
  kartuTerlihat = progres.kartuDidapat.length;
  perbaruiLencana();
  bukaJurnal(isiJurnal(progres, NAMA_TEMPAT), lepasKunci);
}
tombolJurnal.addEventListener('click', bukaJurnalDunia);

const tombolAtas = document.createElement('div');
tombolAtas.className = 'tombol-atas';
tombolAtas.append(tombolJurnal, tombolJeda);
document.getElementById('game')!.append(tombolAtas);

// J membuka atau menutup Jurnal (kecuali sedang mengetik atau ada dialog lain).
document.addEventListener('keydown', (e) => {
  if ((e.key !== 'j' && e.key !== 'J') || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const a = document.activeElement;
  if (a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement) return;
  const jurnal = document.getElementById(ID_JURNAL) as HTMLDialogElement | null;
  if (jurnal?.open) {
    e.preventDefault();
    jurnal.close();
  } else if (!document.querySelector('dialog[open]')) {
    e.preventDefault();
    bukaJurnalDunia();
  }
});

// Esc membuka menu jeda, kecuali sedang ada dialog (dialog misi menangani Esc-nya sendiri) atau sedang mengetik.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || e.defaultPrevented || e.repeat) return;
  const a = document.activeElement;
  if (a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement) {
    a.blur();
    return;
  }
  if (document.querySelector('dialog[open]')) return;
  e.preventDefault();
  bukaMenuJeda();
});

// ---- Mode demo ----

function semuaMisiSelesai(p: Progres): Progres {
  const status = { ...p.status };
  for (const m of MISI_UTAMA) status[m.id] = 'selesai';
  const kartuDidapat = [...new Set([...p.kartuDidapat, ...MISI_UTAMA.flatMap((m) => m.kartuMateri)])].sort((a, b) => a - b);
  return { ...p, status, kartuDidapat };
}

function keDemo(tujuan: string): void {
  tutupSemuaDialog();
  setTimeout(() => {
    if (tujuan === 'pembuka') {
      bukaPercakapan(WARGA.pembuka, { pembicara: WARGA.pembicara, tutup: () => undefined });
    } else if (tujuan === 'festival') {
      sudahDiajakFestival = true;
      const petunjuk = Object.fromEntries(Object.entries(progres.petunjuk).filter(([k]) => !k.startsWith('festival:')));
      perbarui({ ...semuaMisiSelesai(progres), petunjuk, festivalSelesai: false });
      interaksi(LOKASI.find((l) => l.id === 'desa') ?? LOKASI[0]);
    } else if (tujuan === 'tamat') {
      const p = semuaMisiSelesai(progres);
      perbarui({ ...p, festivalSelesai: true, kartuDidapat: [...new Set([...p.kartuDidapat, ...FESTIVAL.kartuMateri])].sort((a, b) => a - b) });
      tampilkanTamat();
    } else {
      const l = LOKASI.find((x) => x.misiId === tujuan);
      if (!l) return;
      // Misi yang diulang di demo dimulai bersih: status dan hitungan petunjuknya dikosongkan.
      perbarui({ ...progres, status: { ...progres.status, [tujuan]: 'belum' }, petunjuk: { ...progres.petunjuk, [tujuan]: 0 } });
      interaksi(l);
    }
  }, 200);
}

if (DEMO) {
  panel.sapa(SALAM);
  pasangDemo({ ke: keDemo, selesaikanMisi: () => perbarui(semuaMisiSelesai(progres)), reset: ulang });
  const tujuan = tujuanDariUrl(q);
  if (tujuan) setTimeout(() => keDemo(tujuan), 800);
} else {
  const adaProgres = Object.values(progres.status).some((s) => s !== 'belum') || progres.festivalSelesai;
  const sisaTempat = MISI_UTAMA.filter((m) => progres.status[m.id] !== 'selesai').length;
  kunci();
  bukaJudul({
    adaProgres,
    sisaTempat,
    ulang,
    mulai: (baru) => {
      playtest?.catatMulai();
      if (baru) {
        // Misi 0: Kepala Desa dan Tiko memperkenalkan masalahnya.
        bukaPercakapan(WARGA.pembuka, {
          pembicara: WARGA.pembicara,
          tutup: () => {
            lepasKunci();
            panel.sapa('Aku di sini kalau kamu bingung. Ketik pertanyaanmu soal air di kotak chat, ya.');
          },
        });
        return;
      }
      lepasKunci();
      if (sisaTempat) panel.sapa(`Selamat datang kembali! Masih ada ${sisaTempat} tempat yang perlu dipulihkan.`);
      else panel.sapa('Selamat datang kembali! Pulau Tirta sudah pulih. Jelajahi saja sesukamu.');
    },
  });
}
