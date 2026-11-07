import { describe, expect, it } from 'vitest';
import { FESTIVAL, MISI_UTAMA, pilihanBenar } from '../shared/content';
import {
  dibantuPenuh,
  festivalTerbuka,
  jawab,
  mulaiMisi,
  muat,
  periksaFestival,
  progresAwal,
  simpan,
} from '../shared/missions';

describe('konten', () => {
  it('setiap misi utama punya tepat satu pilihan benar dan tiga petunjuk cadangan', () => {
    expect(MISI_UTAMA).toHaveLength(4);
    for (const m of MISI_UTAMA) {
      expect(m.pilihan?.filter((p) => p.benar)).toHaveLength(1);
      expect(Object.keys(m.petunjukCadangan ?? {})).toEqual(['1', '2', '3']);
    }
  });
});

describe('status misi', () => {
  it('belum → sedang → selesai', () => {
    let p = progresAwal();
    expect(p.status['misi-1']).toBe('belum');
    p = mulaiMisi(p, 'misi-1');
    expect(p.status['misi-1']).toBe('sedang');
    const benar = pilihanBenar(MISI_UTAMA[0])!;
    p = jawab(p, 'misi-1', benar.id).progres;
    expect(p.status['misi-1']).toBe('selesai');
    expect(p.kartuDidapat).toContain(3);
  });

  it('jawaban salah menaikkan tingkat petunjuk sampai 3 dan tidak menghukum', () => {
    let p = mulaiMisi(progresAwal(), 'misi-1');
    const tingkat: number[] = [];
    for (let i = 0; i < 4; i++) {
      const h = jawab(p, 'misi-1', 'b');
      tingkat.push(h.tingkatPetunjuk!);
      p = h.progres;
      expect(p.status['misi-1']).toBe('sedang');
    }
    expect(tingkat).toEqual([1, 2, 3, 3]);
    expect(p.pilihanPertama['misi-1']).toBe('b');
    p = jawab(p, 'misi-1', 'a').progres;
    expect(dibantuPenuh(p, 'misi-1')).toBe(true);
  });

  it('misi bisa diselesaikan dalam urutan apa pun; festival terbuka setelah keempatnya', () => {
    let p = progresAwal();
    for (const m of [...MISI_UTAMA].reverse()) {
      expect(festivalTerbuka(p)).toBe(false);
      p = jawab(p, m.id, pilihanBenar(m)!.id).progres;
    }
    expect(festivalTerbuka(p)).toBe(true);
  });
});

describe('Festival Hujan', () => {
  it('benar kalau semua peristiwa cocok dengan tahapnya', () => {
    const benar = Object.fromEntries(FESTIVAL.peristiwa.map((e) => [e.id, e.tahap]));
    expect(periksaFestival(benar)).toEqual([]);
  });

  it('mengembalikan peristiwa yang salah', () => {
    const jawaban = Object.fromEntries(FESTIVAL.peristiwa.map((e) => [e.id, e.tahap]));
    jawaban.f2 = 'penguapan';
    expect(periksaFestival(jawaban)).toEqual(['f2']);
  });
});

describe('simpan progres', () => {
  it('menyimpan dan memuat ulang dari penyimpanan browser', () => {
    const data = new Map<string, string>();
    const store = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
    const p = mulaiMisi(progresAwal(), 'misi-2');
    simpan(p, store);
    expect(muat(store).status['misi-2']).toBe('sedang');
  });

  it('tetap jalan kalau penyimpanan tidak tersedia', () => {
    const rusak = {
      getItem: () => {
        throw new Error('diblokir');
      },
    };
    expect(muat(rusak).status['misi-1']).toBe('belum');
  });
});
