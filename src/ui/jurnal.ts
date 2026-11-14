/**
 * Layar Misi (PRD F-09, dulu "Jurnal Petualangan"): status tiap tempat, satu kalimat petunjuk, dan Kartu Ilmu.
 * Dua tab supaya muat tanpa scroll di layar 1366x768. Nama tahap siklus air baru ditampilkan setelah tempatnya
 * pulih, karena nama tahap adalah jawaban misinya.
 */
import { cariMisi } from '../../shared/content';
import type { EntriJurnal, IsiJurnal, KartuJurnal, StatusJurnal } from '../../shared/jurnal';
import { el } from './dom';

const LABEL_STATUS: Record<StatusJurnal, string> = {
  belum: 'Belum dikunjungi',
  sedang: 'Sedang dikerjakan',
  selesai: 'Pulih',
  terkunci: 'Terkunci',
  siap: 'Siap dimulai',
};

const TANDA_STATUS: Record<StatusJurnal, string> = {
  belum: '○',
  sedang: '●',
  selesai: '✓',
  terkunci: '–',
  siap: '★',
};

export const ID_JURNAL = 'layar-jurnal';

type Tab = 'misi' | 'kartu';

export function bukaJurnal(isi: IsiJurnal, tutup: () => void, opsi: { kartuBaru?: number } = {}): void {
  let d = document.getElementById(ID_JURNAL) as HTMLDialogElement | null;
  if (!d) {
    d = el('dialog', undefined, { id: ID_JURNAL, class: 'layar layar-jurnal', 'aria-label': 'Misi' });
    document.body.append(d);
  }
  const dialog = d;

  const tempat = isi.misi.filter((e) => e.id !== 'festival');
  const pulih = tempat.filter((e) => e.status === 'selesai').length;

  // Kepala: judul, ringkasan kemajuan, tombol tutup.
  const kepala = el('div', undefined, { class: 'jurnal-kepala' });
  const judul = el('div', undefined, { class: 'misi-judul' });
  judul.append(el('h2', 'Misi'), el('p', `${pulih} dari ${tempat.length} tempat pulih`, { class: 'misi-ringkas' }));
  const tutupTombol = el('button', 'Tutup', { type: 'button', class: 'tombol-kecil' });
  tutupTombol.addEventListener('click', () => dialog.close());
  kepala.append(judul, tutupTombol);

  const kemajuan = el('div', undefined, { class: 'misi-kemajuan', 'aria-hidden': 'true' });
  for (const e of isi.misi) kemajuan.append(el('span', undefined, { 'data-status': e.status, title: e.tempat }));

  // Tab.
  const daftarTab = el('div', undefined, { class: 'misi-tab', role: 'tablist', 'aria-label': 'Isi layar Misi' });
  const tabMisi = el('button', 'Tempat', { type: 'button', role: 'tab', id: 'tab-misi', 'aria-controls': 'isi-misi' });
  const tabKartu = el('button', `Kartu Ilmu ${isi.jumlahDidapat}/${isi.kartu.length}`, {
    type: 'button',
    role: 'tab',
    id: 'tab-kartu',
    'aria-controls': 'isi-kartu',
  });
  if (opsi.kartuBaru && opsi.kartuBaru > 0) {
    tabKartu.append(el('span', `+${opsi.kartuBaru} baru`, { class: 'misi-baru' }));
  }
  daftarTab.append(tabMisi, tabKartu);

  const isiMisi = el('div', undefined, { class: 'misi-isi', role: 'tabpanel', id: 'isi-misi', 'aria-labelledby': 'tab-misi' });
  const grid = el('ol', undefined, { class: 'jurnal-misi' });
  for (const e of isi.misi) grid.append(kartuTempat(e));
  isiMisi.append(grid);

  const isiKartu = el('div', undefined, { class: 'misi-isi', role: 'tabpanel', id: 'isi-kartu', 'aria-labelledby': 'tab-kartu' });
  const kartu = el('div', undefined, { class: 'jurnal-kartu' });
  for (const k of isi.kartu) kartu.append(kartuIlmu(k));
  isiKartu.append(kartu);

  const pilih = (t: Tab) => {
    for (const [tab, panel, nama] of [
      [tabMisi, isiMisi, 'misi'],
      [tabKartu, isiKartu, 'kartu'],
    ] as const) {
      const aktif = nama === t;
      tab.setAttribute('aria-selected', String(aktif));
      tab.tabIndex = aktif ? 0 : -1;
      panel.hidden = !aktif;
    }
  };
  tabMisi.addEventListener('click', () => pilih('misi'));
  tabKartu.addEventListener('click', () => pilih('kartu'));
  daftarTab.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const keKartu = tabMisi.getAttribute('aria-selected') === 'true';
    pilih(keKartu ? 'kartu' : 'misi');
    (keKartu ? tabKartu : tabMisi).focus();
  });
  pilih('misi');

  dialog.replaceChildren(kepala, kemajuan, daftarTab, isiMisi, isiKartu);
  dialog.addEventListener('close', tutup, { once: true });
  dialog.showModal();
  tutupTombol.focus();
}

function kartuTempat(e: EntriJurnal): HTMLLIElement {
  const li = el('li', undefined, { 'data-status': e.status, 'data-id': e.id });
  const atas = el('div', undefined, { class: 'misi-atas' });
  atas.append(
    el('span', e.tempat, { class: 'tempat' }),
    el('span', `${TANDA_STATUS[e.status]} ${LABEL_STATUS[e.status]}`, { class: 'status' }),
  );
  li.append(atas, el('span', e.judul, { class: 'judul-misi' }));
  if (e.status === 'selesai') {
    // Nama tahap boleh tampil sekarang: misinya sudah terjawab.
    const konsep = cariMisi(e.id)?.konsep;
    li.append(el('p', konsep ? `Tahap siklus air: ${konsep}` : 'Festival selesai. Hujan turun lagi!', { class: 'petunjuk' }));
  } else if (e.petunjuk) {
    li.append(el('p', e.petunjuk, { class: 'petunjuk' }));
  }
  return li;
}

function kartuIlmu(k: KartuJurnal): HTMLDivElement {
  const c = el('div', undefined, { class: 'kartu-jurnal' });
  if (!k.didapat) c.setAttribute('data-terkunci', '');
  c.append(el('span', `Kartu ${k.no}`, { class: 'nomor' }));
  if (k.didapat) {
    c.append(el('p', k.fakta!, { class: 'fakta' }), el('span', `Dari ${k.sumber}`, { class: 'sumber' }));
  } else {
    c.append(el('span', '?', { class: 'tanya', 'aria-hidden': 'true' }), el('p', k.sumber === 'Festival Hujan' ? 'Selesaikan Festival Hujan untuk membukanya.' : `Pulihkan ${k.sumber} untuk membukanya.`, { class: 'sumber' }));
  }
  return c;
}
