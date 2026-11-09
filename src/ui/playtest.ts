/**
 * Mode playtest untuk pendamping (PRD bagian Validasi). Aktif hanya dengan `?playtest=1`.
 * - Anak bermain seperti biasa. Progres dan catatan anak yang sedang bermain disimpan di kunci sendiri,
 *   jadi progres asli laptop tidak tertimpa dan halaman boleh dimuat ulang di tengah permainan.
 * - Panel pendamping tersembunyi, dibuka dan ditutup dengan Ctrl+Shift+P. Tidak ada tombol yang terlihat oleh anak.
 * - Tanpa data pribadi: anak hanya diberi kode Anak 1, Anak 2, … Tidak ada isian teks bebas.
 * Logika hitungnya ada di shared/playtest.ts.
 */
import { MISI_UTAMA, cariMisi } from '../../shared/content';
import type { Progres } from '../../shared/missions';
import {
  bacaSkor,
  catatBingung,
  catatMulai,
  catatPerubahan,
  durasiTotal,
  hapusSemua,
  hapusSesi,
  hasilAnak,
  keCsv,
  kodeBerikut,
  muatHasil,
  muatSesi,
  ringkasMisi,
  sesiBaru,
  simpanHasil,
  simpanSesi,
  type HasilAnak,
  type SesiPlaytest,
} from '../../shared/playtest';
import { el } from './dom';
import { tombolYakin } from './layar';

export const ID_PANEL_PLAYTEST = 'panel-playtest';

export interface OpsiPlaytest {
  /** Nama tempat per id misi, untuk tabel. */
  namaTempat: Record<string, string>;
  /** Mulai ulang halaman untuk anak berikutnya. */
  muatUlang: () => void;
}

export interface Playtest {
  /** Progres anak yang sedang bermain: dari sesi tersimpan, atau kosong. */
  readonly progres: Progres;
  /** Anak menekan "Mulai/Lanjutkan petualangan". */
  catatMulai(): void;
  /** Dipanggil setiap kali progres berubah; sekaligus menyimpan sesi. */
  catatPerubahan(lama: Progres, baru: Progres): void;
  catatBingung(p: Progres, misiId: string): void;
  /** "Mulai dari awal" dari layar judul atau menu jeda: data anak ini dikosongkan, hasil yang tersimpan tidak. */
  ulangAnak(): void;
}

const yaTidak = (v: boolean | null) => (v === null ? '–' : v ? 'Ya' : 'Tidak');

function waktu(detik: number | null): string {
  if (detik === null) return '–';
  const m = Math.floor(detik / 60);
  const s = detik % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function labelPilihan(misiId: string, id: string | null): string {
  if (id === null) return '–';
  const p = cariMisi(misiId)?.pilihan?.find((x) => x.id === id);
  return p ? `${id} · ${p.benar ? 'benar' : (p.miskonsepsi ?? 'keliru')}` : id;
}

function tanggalHariIni(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tabel(kepala: string[], baris: string[][], kelas: string): HTMLTableElement {
  const t = el('table', undefined, { class: `pt-tabel ${kelas}` });
  const thead = el('thead');
  const tr = el('tr');
  for (const k of kepala) tr.append(el('th', k, { scope: 'col' }));
  thead.append(tr);
  const tbody = el('tbody');
  for (const b of baris) {
    const r = el('tr');
    b.forEach((isi, i) => r.append(i === 0 ? el('th', isi, { scope: 'row' }) : el('td', isi)));
    tbody.append(r);
  }
  t.append(thead, tbody);
  return t;
}

export function pasangPlaytest(o: OpsiPlaytest): Playtest {
  let sesi: SesiPlaytest = muatSesi();
  const simpan = () => simpanSesi(sesi);

  const api: Playtest = {
    get progres() {
      return sesi.progres;
    },
    catatMulai() {
      sesi = { ...sesi, catatan: catatMulai(sesi.catatan, Date.now()) };
      simpan();
    },
    catatPerubahan(lama, baru) {
      sesi = { ...sesi, progres: baru, catatan: catatPerubahan(sesi.catatan, lama, baru, Date.now()) };
      simpan();
    },
    catatBingung(p, misiId) {
      const catatan = catatBingung(sesi.catatan, p, misiId);
      if (catatan === sesi.catatan) return;
      sesi = { ...sesi, catatan };
      simpan();
    },
    ulangAnak() {
      sesi = sesiBaru();
      hapusSesi();
    },
  };

  function dialog(): HTMLDialogElement {
    let d = document.getElementById(ID_PANEL_PLAYTEST) as HTMLDialogElement | null;
    if (!d) {
      d = el('dialog', undefined, { id: ID_PANEL_PLAYTEST, class: 'layar layar-playtest', 'aria-label': 'Panel pendamping playtest' });
      document.body.append(d);
    }
    return d;
  }

  function isiPanel(d: HTMLDialogElement): void {
    const daftar = muatHasil();
    const kode = kodeBerikut(daftar);
    const kabar = el('p', '', { class: 'pt-kabar', role: 'status' });

    const kepala = el('div', undefined, { class: 'jurnal-kepala' });
    const tutup = el('button', 'Tutup', { type: 'button', class: 'tombol-kecil' });
    tutup.addEventListener('click', () => d.close());
    kepala.append(el('h2', 'Panel pendamping'), tutup);

    // Anak yang sedang bermain.
    const ringkas = MISI_UTAMA.map((m) => ringkasMisi(sesi.progres, sesi.catatan, m.id));
    const tabelAnak = tabel(
      ['Tempat', 'Pilihan pertama', 'Benar pertama', 'Tingkat tertinggi', 'Perbaiki sendiri', 'Dibantu penuh', 'Aku bingung', 'Durasi'],
      ringkas.map((r) => [
        o.namaTempat[r.misiId] ?? r.misiId,
        labelPilihan(r.misiId, r.pilihanPertama),
        yaTidak(r.benarPertama),
        String(r.tingkatTertinggi),
        yaTidak(r.perbaikiSendiri),
        yaTidak(r.dibantuPenuh),
        String(r.bingung),
        waktu(r.durasiDetik),
      ]),
      'pt-anak',
    );
    const total = durasiTotal(sesi.catatan);
    const ringkasTotal = el(
      'p',
      total === null ? 'Festival Hujan belum selesai.' : `Durasi total sampai Festival selesai: ${waktu(total)}`,
      { class: 'pt-total' },
    );

    // Skor tes sebelum dan sesudah.
    const skor = el('div', undefined, { class: 'pt-skor' });
    const isian: Record<'skorSebelum' | 'skorSesudah', HTMLInputElement> = {} as never;
    const salahSkor = () => Object.values(isian).some((i) => i.getAttribute('aria-invalid') === 'true');
    for (const [kunci, label] of [
      ['skorSebelum', 'Skor tes sebelum (0–5)'],
      ['skorSesudah', 'Skor tes sesudah (0–5)'],
    ] as const) {
      const id = `pt-${kunci}`;
      const nilai = sesi[kunci];
      const input = el('input', undefined, { id, type: 'number', min: '0', max: '5', step: '1', inputmode: 'numeric', autocomplete: 'off' });
      input.value = nilai === null ? '' : String(nilai);
      input.addEventListener('input', () => {
        const n = bacaSkor(input.value);
        input.setAttribute('aria-invalid', String(n === undefined));
        if (n === undefined) {
          kabar.textContent = 'Skor harus bilangan bulat 0 sampai 5.';
          return;
        }
        kabar.textContent = '';
        sesi = { ...sesi, [kunci]: n };
        simpan();
      });
      isian[kunci] = input;
      const baris = el('div', undefined, { class: 'pt-isian' });
      baris.append(el('label', label, { for: id }), input);
      skor.append(baris);
    }

    const berikut = el('button', 'Simpan & anak berikutnya', { type: 'button', class: 'tombol-besar' });
    berikut.addEventListener('click', () => {
      if (salahSkor()) {
        kabar.textContent = 'Perbaiki skor dulu: harus bilangan bulat 0 sampai 5.';
        return;
      }
      berikut.disabled = true;
      const semua = muatHasil();
      const kodeIni = kodeBerikut(semua);
      simpanHasil([...semua, hasilAnak(kodeIni, sesi)]);
      api.ulangAnak();
      kabar.textContent = `Hasil ${kodeIni} tersimpan. Menyiapkan game untuk anak berikutnya…`;
      setTimeout(o.muatUlang, 700);
    });

    // Hasil yang sudah tersimpan.
    const tabelHasil = daftar.length
      ? tabel(
          ['Anak', 'Skor sebelum', 'Skor sesudah', 'Misi selesai', 'Durasi total'],
          daftar.map((h: HasilAnak) => [
            h.anak,
            h.skorSebelum === null ? '–' : String(h.skorSebelum),
            h.skorSesudah === null ? '–' : String(h.skorSesudah),
            `${h.misi.filter((m) => m.durasiDetik !== null).length} dari ${MISI_UTAMA.length}`,
            waktu(h.durasiTotalDetik),
          ]),
          'pt-hasil',
        )
      : el('p', 'Belum ada hasil yang tersimpan.', { class: 'catatan' });

    const salin = el('button', 'Salin semua hasil', { type: 'button' });
    salin.addEventListener('click', async () => {
      const hasil = muatHasil();
      if (!hasil.length) {
        kabar.textContent = 'Belum ada hasil yang tersimpan.';
        return;
      }
      const ok = await salinTeks(keCsv(hasil), d);
      kabar.textContent = ok ? `CSV ${hasil.length} anak disalin. Tempel di spreadsheet.` : 'Gagal menyalin. Pakai tombol Unduh CSV.';
    });

    const unduh = el('button', 'Unduh CSV', { type: 'button' });
    unduh.addEventListener('click', () => {
      const hasil = muatHasil();
      if (!hasil.length) {
        kabar.textContent = 'Belum ada hasil yang tersimpan.';
        return;
      }
      unduhTeks(keCsv(hasil), `playtest-pulau-tirta-${tanggalHariIni()}.csv`, d);
      kabar.textContent = `CSV ${hasil.length} anak diunduh.`;
    });

    const hapus = tombolYakin(
      'Hapus semua',
      'Semua hasil yang tersimpan dan data anak yang sedang bermain akan dihapus.',
      () => {
        hapusSemua();
        sesi = sesiBaru();
        kabar.textContent = 'Semua hasil playtest dihapus.';
        setTimeout(o.muatUlang, 700);
      },
      'Ya, hapus semua',
    );

    const aksi = el('div', undefined, { class: 'pt-aksi' });
    aksi.append(salin, unduh, hapus);

    d.replaceChildren(
      kepala,
      el('p', 'Mode playtest. Panel ini hanya untuk pendamping. Buka atau tutup dengan Ctrl+Shift+P.', { class: 'catatan' }),
      el('h3', `Sedang bermain: ${kode}`),
      tabelAnak,
      ringkasTotal,
      skor,
      berikut,
      kabar,
      el('h3', `Hasil tersimpan (${daftar.length} anak)`),
      tabelHasil,
      el('p', 'Anak yang sedang bermain baru masuk ke CSV setelah tombol Simpan ditekan.', { class: 'catatan' }),
      aksi,
    );
  }

  function ubahPanel(): void {
    const d = dialog();
    if (d.open) {
      d.close();
      return;
    }
    isiPanel(d);
    d.showModal();
    d.querySelector<HTMLElement>('button')?.focus();
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      ubahPanel();
    }
  });

  return api;
}

async function salinTeks(teks: string, wadah: HTMLElement): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(teks);
    return true;
  } catch {
    // Cadangan untuk browser yang menolak Clipboard API. Textarea di dalam dialog, karena di luar dialog modal
    // elemen tidak bisa dipilih.
    const t = el('textarea', undefined, { 'aria-hidden': 'true', class: 'sr' });
    t.value = teks;
    wadah.append(t);
    t.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    t.remove();
    return ok;
  }
}

function unduhTeks(teks: string, nama: string, wadah: HTMLElement): void {
  const url = URL.createObjectURL(new Blob([teks], { type: 'text/csv;charset=utf-8' }));
  const a = el('a', undefined, { href: url, download: nama, class: 'sr' });
  wadah.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
