import type { Misi } from '../../../shared/content';
import { el } from '../dom';
import { buatHutan } from './hutan';
import { buatLembah } from './lembah';
import { buatPantai } from './pantai';
import { buatPuncak } from './puncak';
import type { Aktivitas, PembuatAktivitas } from './tipe';

export type { Aktivitas } from './tipe';

/** Aktivitas per misi. Misi yang belum punya aktivitas memakai tombol sementara supaya alur tetap bisa tamat. */
const DAFTAR: Record<string, PembuatAktivitas> = {
  'misi-1': buatPantai,
  'misi-2': buatPuncak,
  'misi-3': buatLembah,
  'misi-4': buatHutan,
};

function sementara(_misi: Misi, siap: () => void): Aktivitas {
  const akar = el('div', undefined, { class: 'aktivitas aktivitas-sementara' });
  const tombol = el('button', 'Aktivitas selesai (sementara)', { type: 'button' });
  tombol.addEventListener('click', () => {
    tombol.remove();
    siap();
  });
  akar.append(el('p', 'Aktivitas misi ini belum dibuat.', { class: 'catatan' }), tombol);
  return { el: akar, sorot: () => undefined, hentikan: () => undefined };
}

export function buatAktivitas(misi: Misi, siap: () => void): Aktivitas {
  return (DAFTAR[misi.id] ?? sementara)(misi, siap);
}
