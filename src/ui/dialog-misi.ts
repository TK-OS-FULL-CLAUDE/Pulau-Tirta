import { FESTIVAL, KARTU_MATERI, kartuUntuk, type Misi, type Tingkat } from '../../shared/content';
import { acak } from '../../shared/missions';
import { buatAktivitas, type Aktivitas } from './aktivitas';
import { potretTiko } from '../tiko/gambar';
import { el, tunggu } from './dom';

const dialog = () => document.getElementById('dialog-misi') as HTMLDialogElement;

/** Aktivitas di dialog misi yang sedang terbuka, supaya petunjuk dari "Aku bingung" juga bisa menyorot bukti. */
let aktivitasAktif: Aktivitas | null = null;

/** Sorot bukti di aktivitas yang sedang terbuka (tidak melakukan apa-apa kalau tidak ada misi terbuka). */
export function sorotMisiAktif(tingkat: Tingkat): void {
  aktivitasAktif?.sorot(tingkat);
}

/** Pilihan ditahan paling lama selama ini kalau petunjuk Tiko tidak kunjung muncul. */
const BATAS_TAHAN_MS = 10_000;

export interface HasilPilih {
  benar: boolean;
  tingkatPetunjuk?: Tingkat;
  /** Selesai saat petunjuk Tiko sudah tampil. Pilihan ditahan sampai saat itu supaya anak membacanya dulu. */
  petunjukTiba?: Promise<unknown>;
}

export interface OpsiMisi {
  namaLokasi: string;
  /** Tempat ini sudah pulih sebelumnya: langsung tampilkan layar pulih. */
  sudahSelesai: boolean;
  pilih: (pilihanId: string) => HasilPilih;
  tutup: () => void;
}

function kepala(judul: string, sub: string): HTMLElement {
  const h = el('header', undefined, { class: 'dialog-kepala' });
  const t = el('div');
  t.append(el('h2', judul), el('p', sub, { class: 'catatan' }));
  const x = el('button', 'Kembali ke pulau', { type: 'button', class: 'tombol-kecil' });
  x.addEventListener('click', () => dialog().close());
  h.append(t, x);
  return h;
}

/**
 * Dialog dibuka non-modal di atas area game, sehingga panel Tiko di sampingnya tetap bisa dibaca dan dipakai.
 * Esc tetap menutup dialog.
 */
function buka(d: HTMLDialogElement, tutup: () => void, bersihkan?: () => void): void {
  const tekan = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      d.close();
    }
  };
  d.addEventListener('keydown', tekan);
  d.addEventListener(
    'close',
    () => {
      d.removeEventListener('keydown', tekan);
      bersihkan?.();
      tutup();
    },
    { once: true },
  );
  d.show();
  d.scrollTop = 0;
  // Fokus ke kendali aktivitas (bukan tombol "Kembali ke pulau"), supaya Spasi/Enter tidak langsung menutup misi.
  (
    d.querySelector<HTMLElement>('[autofocus]') ??
    d.querySelector<HTMLElement>('.aktivitas input, .aktivitas button') ??
    d.querySelector<HTMLElement>('input, button')
  )?.focus();
}

function layarPulih(misi: Misi, namaLokasi: string, sudahDulu: boolean): HTMLElement {
  const s = el('section', undefined, { class: 'pulih' });
  s.append(el('p', sudahDulu ? `${namaLokasi} sudah pulih.` : `${namaLokasi} pulih! Warga bersorak.`, { class: 'pulih-judul' }));
  const kartu = kartuUntuk(misi);
  if (kartu.length) {
    const daftar = el('div', undefined, { class: 'kartu-ilmu' });
    daftar.append(el('h3', sudahDulu ? 'Kartu Ilmu dari tempat ini' : 'Kartu Ilmu baru'));
    for (const k of kartu) daftar.append(el('p', k.fakta));
    s.append(daftar);
  }
  if (misi.aktivitas?.catatanSesudah) s.append(el('p', misi.aktivitas.catatanSesudah, { class: 'catatan-sains' }));
  const kembali = el('button', 'Kembali ke pulau', { type: 'button', autofocus: '' });
  kembali.addEventListener('click', () => dialog().close());
  s.append(kembali);
  return s;
}

/** Dialog misi: aktivitas di atas, lalu pertanyaan alasan setelah anak melihat akibat percobaannya. */
export function bukaMisi(misi: Misi, opsi: OpsiMisi): void {
  const d = dialog();
  d.replaceChildren(kepala(misi.judul, opsi.namaLokasi));

  if (opsi.sudahSelesai) {
    d.append(layarPulih(misi, opsi.namaLokasi, true));
    buka(d, opsi.tutup);
    return;
  }

  const tanya = el('section', undefined, { class: 'tanya', hidden: '' });
  let pertanyaanTampil = false;
  const aktivitas = buatAktivitas(misi, () => tampilkanPertanyaan());
  aktivitasAktif = aktivitas;
  d.append(aktivitas.el, tanya);

  function tampilkanPertanyaan(): void {
    if (pertanyaanTampil) return;
    pertanyaanTampil = true;
    const umpan = el('p', '', { class: 'umpan', 'aria-live': 'polite' });
    const kotak = el('div', undefined, { class: 'pilihan pilihan-alasan' });
    const tombol: HTMLButtonElement[] = [];
    const tahan = (ya: boolean) => tombol.forEach((b) => (b.disabled = ya || b.hasAttribute('data-salah')));

    for (const p of acak(misi.pilihan ?? [])) {
      const b = el('button', p.teks, { type: 'button' });
      b.addEventListener('click', async () => {
        const hasil = opsi.pilih(p.id);
        if (hasil.benar) {
          aktivitas.hentikan();
          aktivitasAktif = null;
          aktivitas.el.remove();
          const pulih = layarPulih(misi, opsi.namaLokasi, false);
          tanya.replaceWith(pulih);
          d.scrollTop = 0;
          pulih.querySelector('button')?.focus();
          return;
        }
        // Salah tidak menghukum: pilihan itu ditandai, bukti disorot, Tiko memberi petunjuk.
        b.setAttribute('data-salah', '');
        if (hasil.tingkatPetunjuk) aktivitas.sorot(hasil.tingkatPetunjuk);
        umpan.textContent = 'Belum tepat. Baca petunjuk Tiko, lalu lihat lagi gambarnya.';
        tahan(true);
        await Promise.race([Promise.resolve(hasil.petunjukTiba).catch(() => undefined), tunggu(BATAS_TAHAN_MS)]);
        tahan(false);
        tombol.find((x) => !x.disabled)?.focus();
      });
      tombol.push(b);
      kotak.append(b);
    }
    tanya.append(el('h3', misi.pertanyaan ?? ''), kotak, umpan);
    tanya.hidden = false;
    tanya.scrollIntoView({ block: 'nearest' });
  }

  buka(d, opsi.tutup, () => {
    aktivitas.hentikan();
    if (aktivitasAktif === aktivitas) aktivitasAktif = null;
  });
}

export interface OpsiFestival {
  /** Mengembalikan id peristiwa yang salah (kosong = semua benar). */
  periksa: (jawaban: Record<string, string>) => string[];
  /** Minta petunjuk Tiko untuk peristiwa pertama di `salah`; mengembalikan id peristiwa yang dibantu. */
  petunjuk: (salah: string[]) => string | undefined;
  selesai: () => void;
  tutup: () => void;
}

const kapital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Festival yang sedang terbuka, supaya "Aku bingung" di panel Tiko bisa membantu peristiwa yang sedang dipilih. */
let festivalAktif: { pilihan: () => string | null; tandai: (id: string) => void } | null = null;

/** Peristiwa Festival yang sedang dipilih anak, kalau dialog Festival terbuka dan belum selesai. */
export function peristiwaFestivalAktif(): string | null {
  return festivalAktif?.pilihan() ?? null;
}

/** Tandai kartu peristiwa yang sedang dibantu petunjuk Tiko. */
export function tandaiPetunjukFestival(id: string): void {
  festivalAktif?.tandai(id);
}

/**
 * Festival Hujan: anak memilih satu kartu peristiwa, lalu memilih tahap siklus airnya.
 * "Periksa" aktif kalau keempatnya terisi dan yang ditandai salah sudah diganti. Yang benar dikunci,
 * yang salah ditandai dan Tiko memberi petunjuk untuk salah satunya. Semua cocok → hujan turun, Tiko pulang.
 */
export function bukaFestival(opsi: OpsiFestival): void {
  const d = dialog();
  d.replaceChildren(kepala('Festival Hujan', 'Desa Tirta'));
  const arahan = el('p', 'Pilih satu peristiwa, lalu pilih tahap siklus airnya. Cocokkan keempatnya.', { class: 'arahan' });
  const wadah = el('div', undefined, { class: 'festival' });
  const kolomPeristiwa = el('div', undefined, { class: 'festival-peristiwa', role: 'group', 'aria-label': 'Peristiwa' });
  const kolomTahap = el('div', undefined, { class: 'festival-tahap', role: 'group', 'aria-label': 'Tahap siklus air' });
  const periksa = el('button', 'Periksa', { type: 'button', class: 'tombol-periksa' });
  const umpan = el('p', '', { class: 'umpan', 'aria-live': 'polite' });

  const jawaban: Record<string, string> = {};
  const benar = new Set<string>();
  let aktif: string | null = FESTIVAL.peristiwa[0]?.id ?? null;
  const kartu = new Map<string, { tombol: HTMLButtonElement; slot: HTMLElement }>();

  for (const e of FESTIVAL.peristiwa) {
    const tombol = el('button', undefined, { type: 'button', class: 'kartu-peristiwa' });
    if (e === FESTIVAL.peristiwa[0]) tombol.setAttribute('autofocus', '');
    const slot = el('span', '?', { class: 'slot' });
    tombol.append(
      el('span', e.ikon ?? '', { class: 'ikon', 'aria-hidden': 'true' }),
      el('span', e.teks, { class: 'teks' }),
      slot,
      el('span', '💧 Lihat petunjuk Tiko', { class: 'tanda-tiko' }),
    );
    tombol.addEventListener('click', () => {
      aktif = e.id;
      segarkan();
    });
    kartu.set(e.id, { tombol, slot });
    kolomPeristiwa.append(tombol);
  }

  kolomTahap.append(el('p', 'Tahap siklus air', { class: 'judul-kolom' }));
  for (const t of FESTIVAL.tahap) {
    const tombol = el('button', kapital(t), { type: 'button', class: 'tombol-tahap' });
    tombol.addEventListener('click', () => pilihTahap(t));
    kolomTahap.append(tombol);
  }
  kolomTahap.append(periksa);

  function berikutnya(dari: string | null): string | null {
    const ids = FESTIVAL.peristiwa.map((e) => e.id);
    const mulai = dari ? ids.indexOf(dari) + 1 : 0;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[(mulai + i) % ids.length];
      if (!benar.has(id) && (!jawaban[id] || kartu.get(id)!.tombol.hasAttribute('data-salah'))) return id;
    }
    return null;
  }

  function segarkan(): void {
    for (const e of FESTIVAL.peristiwa) {
      const { tombol, slot } = kartu.get(e.id)!;
      const t = jawaban[e.id];
      slot.textContent = t ? kapital(t) : '?';
      tombol.toggleAttribute('data-terisi', Boolean(t));
      tombol.toggleAttribute('data-benar', benar.has(e.id));
      tombol.disabled = benar.has(e.id);
      tombol.setAttribute('aria-pressed', String(aktif === e.id));
      tombol.setAttribute('aria-label', `${e.teks}. Tahap: ${t ?? 'belum dipilih'}${benar.has(e.id) ? ', sudah cocok' : ''}`);
    }
    const adaSalah = [...kartu.values()].some((k) => k.tombol.hasAttribute('data-salah'));
    periksa.disabled = FESTIVAL.peristiwa.some((e) => !jawaban[e.id]) || adaSalah;
  }

  function pilihTahap(t: string): void {
    if (!aktif) {
      umpan.textContent = 'Pilih peristiwanya dulu, ya.';
      return;
    }
    const dipilih = aktif;
    jawaban[dipilih] = t;
    const k = kartu.get(dipilih)!;
    k.tombol.removeAttribute('data-salah');
    k.tombol.removeAttribute('data-petunjuk');
    aktif = berikutnya(dipilih);
    umpan.textContent = '';
    segarkan();
    (aktif ? kartu.get(aktif)!.tombol : periksa.disabled ? null : periksa)?.focus();
  }

  function tandai(id: string): void {
    for (const [kid, k] of kartu) k.tombol.toggleAttribute('data-petunjuk', kid === id);
  }

  periksa.addEventListener('click', () => {
    const salah = opsi.periksa(jawaban);
    for (const e of FESTIVAL.peristiwa) {
      if (!salah.includes(e.id)) benar.add(e.id);
      kartu.get(e.id)!.tombol.toggleAttribute('data-salah', salah.includes(e.id));
    }
    if (salah.length === 0) {
      tampilkanPerayaan();
      return;
    }
    const dibantu = opsi.petunjuk(salah);
    if (dibantu) tandai(dibantu);
    aktif = salah[0];
    umpan.textContent = `${salah.length} peristiwa belum cocok. Lihat petunjuk Tiko, lalu ganti tahapnya.`;
    segarkan();
    kartu.get(aktif)!.tombol.focus();
  });

  function tampilkanPerayaan(): void {
    festivalAktif = null;
    opsi.selesai();
    const s = el('section', undefined, { class: 'pulih festival-selesai' });
    const langit = el('div', undefined, { class: 'langit-hujan', 'aria-hidden': 'true' });
    for (let i = 0; i < 40; i++) {
      const r = el('span', undefined, { class: 'rintik' });
      r.style.left = `${(i * 97) % 100}%`;
      r.style.animationDelay = `${((i * 37) % 120) / 100}s`;
      r.style.animationDuration = `${0.7 + ((i * 13) % 50) / 100}s`;
      langit.append(r);
    }
    langit.append(el('span', '☁️', { class: 'awan-rumah' }), el('img', undefined, { class: 'tiko-pulang', src: potretTiko(), alt: '' }));
    s.append(
      langit,
      el('p', 'Semua cocok! Hujan turun di Pulau Tirta.', { class: 'pulih-judul' }),
      el('p', 'Siklus airnya jalan lagi, jadi Tiko bisa pulang ke awan.', { class: 'catatan-sains' }),
    );
    const kartuIlmu = KARTU_MATERI.filter((k) => FESTIVAL.kartuMateri.includes(k.no));
    if (kartuIlmu.length) {
      const daftar = el('div', undefined, { class: 'kartu-ilmu' });
      daftar.append(el('h3', 'Kartu Ilmu baru'));
      for (const k of kartuIlmu) daftar.append(el('p', k.fakta));
      s.append(daftar);
    }
    const kembali = el('button', 'Kembali ke pulau', { type: 'button' });
    kembali.addEventListener('click', () => d.close());
    s.append(kembali);
    arahan.remove();
    wadah.replaceWith(s);
    d.scrollTop = 0;
    kembali.focus();
  }

  wadah.append(kolomPeristiwa, kolomTahap);
  d.append(arahan, wadah, umpan);
  festivalAktif = { pilihan: () => aktif, tandai };
  segarkan();
  buka(d, opsi.tutup, () => {
    festivalAktif = null;
  });
}
