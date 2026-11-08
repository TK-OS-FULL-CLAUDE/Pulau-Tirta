import { FESTIVAL, kartuUntuk, type Misi, type Tingkat } from '../../shared/content';
import { acak } from '../../shared/missions';
import { buatAktivitas, type Aktivitas } from './aktivitas';
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
  (d.querySelector<HTMLElement>('[autofocus]') ?? d.querySelector<HTMLElement>('input, button'))?.focus();
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

/** Festival Hujan: cocokkan peristiwa dengan tahap. `periksa` mengembalikan id yang salah. */
export function bukaFestival(periksa: (jawaban: Record<string, string>) => string[], selesai: () => void, tutup: () => void): void {
  const d = dialog();
  d.replaceChildren(kepala('Festival Hujan', 'Desa Tirta'), el('p', 'Cocokkan setiap peristiwa dengan tahap siklus airnya.'));
  const kotak = el('div', undefined, { class: 'pilihan' });
  const pilihan: Record<string, HTMLSelectElement> = {};
  for (const e of FESTIVAL.peristiwa) {
    const label = el('label', e.teks);
    const s = el('select', undefined, { 'aria-label': e.teks });
    s.append(el('option', 'Pilih tahap…', { value: '' }));
    for (const t of FESTIVAL.tahap) s.append(el('option', t, { value: t }));
    pilihan[e.id] = s;
    label.append(s);
    kotak.append(label);
  }
  const cek = el('button', 'Periksa', { type: 'button' });
  const pesan = el('p', '', { class: 'umpan', 'aria-live': 'polite' });
  cek.addEventListener('click', () => {
    const jawaban = Object.fromEntries(Object.entries(pilihan).map(([id, s]) => [id, s.value]));
    const salah = periksa(jawaban);
    Object.entries(pilihan).forEach(([id, s]) => s.toggleAttribute('data-salah', salah.includes(id)));
    if (salah.length === 0) {
      pesan.textContent = 'Semua cocok! Hujan turun di Pulau Tirta.';
      selesai();
    } else {
      pesan.textContent = `${salah.length} peristiwa belum cocok. Tanya Tiko kalau bingung.`;
    }
  });
  d.append(kotak, cek, pesan);
  buka(d, tutup);
}
