import { describe, expect, it } from 'vitest';
import { KUNCI_SUARA, Suara, muatPilihanSuara, simpanPilihanSuara } from '../src/ui/suara';
import { KUNCI_HASIL, KUNCI_SESI } from '../shared/playtest';

function penyimpanan() {
  const data = new Map<string, string>();
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

const diblokir = {
  getItem: (): string | null => {
    throw new Error('diblokir');
  },
  setItem: () => {
    throw new Error('diblokir');
  },
};

describe('pilihan suara', () => {
  it('bawaannya nyala, dan pilihan Mati tetap tersimpan setelah dimuat ulang', () => {
    const store = penyimpanan();
    expect(muatPilihanSuara(store)).toBe(true);
    simpanPilihanSuara(false, store);
    expect(store.data.get(KUNCI_SUARA)).toBe('mati');
    expect(muatPilihanSuara(store)).toBe(false);
    simpanPilihanSuara(true, store);
    expect(muatPilihanSuara(store)).toBe(true);
  });

  it('kuncinya terpisah dari progres dan hasil playtest', () => {
    expect([KUNCI_HASIL, KUNCI_SESI, 'pulau-tirta:progres:v1']).not.toContain(KUNCI_SUARA);
  });

  it('penyimpanan yang diblokir atau tidak ada tidak membuat game berhenti', () => {
    expect(muatPilihanSuara(diblokir)).toBe(true);
    expect(muatPilihanSuara(undefined)).toBe(true);
    expect(() => simpanPilihanSuara(false, diblokir)).not.toThrow();
  });
});

describe('Suara sebelum interaksi pertama', () => {
  it('tidak membuat AudioContext dan tidak error saat diminta berbunyi', () => {
    const store = penyimpanan();
    const s = new Suara(store);
    expect(s.nyala).toBe(true);
    // Belum ada interaksi: tidak ada AudioContext, jadi semua permintaan bunyi diabaikan tanpa error.
    for (const j of ['klik', 'benar', 'keliru', 'pulih', 'hujan'] as const) expect(() => s.main(j)).not.toThrow();
  });

  it('mematikan suara menyimpan pilihan walau AudioContext belum ada', () => {
    const store = penyimpanan();
    const s = new Suara(store);
    s.ubah(false);
    expect(s.nyala).toBe(false);
    expect(new Suara(store).nyala).toBe(false);
  });
});
