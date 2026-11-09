/**
 * Mode demo untuk presentasi (PRD F-13). Aktif hanya dengan `?demo=1`, jadi anak tidak pernah melihatnya.
 * - `?demo=1&ke=misi-2` (atau `pembuka`, `festival`, `tamat`) langsung membuka tujuan itu.
 * - Tombol "Demo" di pojok layar game, atau Ctrl+Shift+D, membuka panel lompat.
 * Progres demo tidak disimpan, supaya progres asli di laptop itu tidak tertimpa.
 */
import { el } from './dom';

export const TUJUAN_DEMO = [
  { tujuan: 'pembuka', label: 'Pembuka desa' },
  { tujuan: 'misi-1', label: 'Pantai Biru' },
  { tujuan: 'misi-2', label: 'Puncak Kabut' },
  { tujuan: 'misi-3', label: 'Lembah Hujan' },
  { tujuan: 'misi-4', label: 'Hutan & Sungai' },
  { tujuan: 'festival', label: 'Festival Hujan' },
  { tujuan: 'tamat', label: 'Layar tamat' },
] as const;

export interface OpsiDemo {
  ke: (tujuan: string) => void;
  selesaikanMisi: () => void;
  reset: () => void;
}

export function pasangDemo(o: OpsiDemo): void {
  const buka = el('button', 'Demo', { type: 'button', class: 'tombol-demo', 'aria-expanded': 'false', title: 'Mode demo (Ctrl+Shift+D)' });
  const panel = el('div', undefined, { class: 'panel-demo', hidden: '' });
  const tutupPanel = () => {
    panel.hidden = true;
    buka.setAttribute('aria-expanded', 'false');
  };
  const ubah = () => {
    panel.hidden = !panel.hidden;
    buka.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) panel.querySelector('button')?.focus();
  };
  const aksi = (label: string, f: () => void) => {
    const t = el('button', label, { type: 'button', class: 'tombol-kecil' });
    t.addEventListener('click', () => {
      tutupPanel();
      f();
    });
    return t;
  };
  panel.append(
    el('p', 'Mode demo · progres tidak disimpan', { class: 'catatan' }),
    ...TUJUAN_DEMO.map((t) => aksi(t.label, () => o.ke(t.tujuan))),
    aksi('Selesaikan 4 misi', o.selesaikanMisi),
    aksi('Reset progres', o.reset),
  );
  buka.addEventListener('click', ubah);
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      ubah();
    }
  });
  document.getElementById('game')!.append(buka, panel);
}

/** Tujuan demo dari URL: `ke`, atau `misi` (cara lama). */
export function tujuanDariUrl(q: URLSearchParams): string | null {
  const t = q.get('ke') ?? q.get('misi');
  return t && TUJUAN_DEMO.some((x) => x.tujuan === t) ? t : null;
}
