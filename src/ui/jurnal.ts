/** Jurnal Petualangan (PRD F-09): status tiap tempat dan Kartu Ilmu yang sudah dikumpulkan. */
import type { IsiJurnal, StatusJurnal } from '../../shared/jurnal';
import { el } from './dom';

const LABEL_STATUS: Record<StatusJurnal, string> = {
  belum: 'Belum dikunjungi',
  sedang: 'Sedang dikerjakan',
  selesai: 'Pulih ✓',
  terkunci: 'Terkunci',
  siap: 'Siap dimulai',
};

export const ID_JURNAL = 'layar-jurnal';

export function bukaJurnal(isi: IsiJurnal, tutup: () => void): void {
  let d = document.getElementById(ID_JURNAL) as HTMLDialogElement | null;
  if (!d) {
    d = el('dialog', undefined, { id: ID_JURNAL, class: 'layar layar-jurnal', 'aria-label': 'Jurnal Petualangan' });
    document.body.append(d);
  }
  const dialog = d;
  const kepala = el('div', undefined, { class: 'jurnal-kepala' });
  const tutupTombol = el('button', 'Tutup', { type: 'button', class: 'tombol-kecil', autofocus: '' });
  tutupTombol.addEventListener('click', () => dialog.close());
  kepala.append(el('h2', 'Jurnal Petualangan'), tutupTombol);

  const daftar = el('ol', undefined, { class: 'jurnal-misi' });
  for (const e of isi.misi) {
    const li = el('li', undefined, { 'data-status': e.status });
    li.append(
      el('span', e.tempat, { class: 'tempat' }),
      el('span', LABEL_STATUS[e.status], { class: 'status' }),
      el('span', e.judul, { class: 'judul-misi' }),
    );
    if (e.petunjuk) li.append(el('p', e.petunjuk, { class: 'petunjuk' }));
    daftar.append(li);
  }

  const kartu = el('div', undefined, { class: 'jurnal-kartu' });
  for (const k of isi.kartu) {
    const c = el('div', undefined, { class: 'kartu-jurnal' });
    if (!k.didapat) c.setAttribute('data-terkunci', '');
    c.append(
      el('span', `Kartu ${k.no}`, { class: 'nomor' }),
      el('p', k.didapat ? k.fakta! : 'Belum ditemukan.', { class: 'fakta' }),
      el('span', `Dari: ${k.sumber}`, { class: 'sumber' }),
    );
    kartu.append(c);
  }

  dialog.replaceChildren(
    kepala,
    el('h3', 'Tempat yang perlu dipulihkan'),
    daftar,
    el('h3', `Kartu Ilmu (${isi.jumlahDidapat} dari ${isi.kartu.length})`),
    kartu,
  );
  dialog.addEventListener('close', tutup, { once: true });
  dialog.showModal();
  tutupTombol.focus();
}
