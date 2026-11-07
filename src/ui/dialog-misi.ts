import { FESTIVAL, type Misi } from '../../shared/content';

const dialog = () => document.getElementById('dialog-misi') as HTMLDialogElement;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, teks?: string, attrs: Record<string, string> = {}) {
  const e = document.createElement(tag);
  if (teks) e.textContent = teks;
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

/**
 * Dialog misi: aktivitas (sementara berupa tombol), lalu pertanyaan alasan.
 * `pilih` mengembalikan true kalau benar.
 */
export function bukaMisi(misi: Misi, pilih: (pilihanId: string) => boolean, tutup: () => void): void {
  const d = dialog();
  d.replaceChildren();
  d.append(el('h2', misi.judul), el('p', `Konsep: ${misi.konsep}`, { class: 'catatan' }));

  const isi = el('div');
  const aktivitas = el('p', 'Aktivitas misi dibuat di sini (lihat PRD bagian Desain dunia dan misi).', { class: 'catatan' });
  const lanjut = el('button', 'Aktivitas selesai (sementara)', { type: 'button' });
  isi.append(aktivitas, lanjut);
  d.append(isi);

  lanjut.addEventListener('click', () => {
    isi.replaceChildren(el('p', misi.pertanyaan ?? ''));
    const kotak = el('div', undefined, { class: 'pilihan' });
    for (const p of misi.pilihan ?? []) {
      const b = el('button', p.teks, { type: 'button' });
      b.addEventListener('click', () => {
        if (pilih(p.id)) {
          d.close();
        } else {
          b.setAttribute('data-salah', '');
        }
      });
      kotak.append(b);
    }
    isi.append(kotak);
  });

  const tutupBtn = el('button', 'Kembali ke pulau', { type: 'button', class: 'tombol-kecil' });
  tutupBtn.addEventListener('click', () => d.close());
  d.append(tutupBtn);
  d.addEventListener('close', tutup, { once: true });
  d.showModal();
}

/** Festival Hujan: cocokkan peristiwa dengan tahap. `periksa` mengembalikan id yang salah. */
export function bukaFestival(periksa: (jawaban: Record<string, string>) => string[], selesai: () => void, tutup: () => void): void {
  const d = dialog();
  d.replaceChildren();
  d.append(el('h2', 'Festival Hujan'), el('p', 'Cocokkan setiap peristiwa dengan tahap siklus airnya.'));
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
  const pesan = el('p', '', { class: 'catatan', 'aria-live': 'polite' });
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
  const tutupBtn = el('button', 'Kembali ke pulau', { type: 'button', class: 'tombol-kecil' });
  tutupBtn.addEventListener('click', () => d.close());
  d.append(tutupBtn);
  d.addEventListener('close', tutup, { once: true });
  d.showModal();
}
