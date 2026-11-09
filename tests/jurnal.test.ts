import { describe, expect, it } from 'vitest';
import { FESTIVAL, MISI_UTAMA } from '../shared/content';
import { isiJurnal } from '../shared/jurnal';
import { jawab, mulaiMisi, progresAwal, type Progres } from '../shared/missions';
import { WARGA } from '../shared/warga';

const NAMA = { desa: 'Desa Tirta', pantai: 'Pantai Biru', puncak: 'Puncak Kabut', lembah: 'Lembah Hujan', hutan: 'Hutan & Sungai' };
const benar = (id: string) => MISI_UTAMA.find((m) => m.id === id)!.pilihan!.find((x) => x.benar)!.id;
const selesaikan = (p: Progres, id: string) => jawab(mulaiMisi(p, id), id, benar(id)).progres;

describe('Jurnal Petualangan', () => {
  it('di awal: semua tempat belum, Festival terkunci, petunjuk dari Kepala Desa', () => {
    const j = isiJurnal(progresAwal(), NAMA);
    expect(j.misi.map((e) => e.status)).toEqual(['belum', 'belum', 'belum', 'belum', 'terkunci']);
    expect(j.misi[0]).toMatchObject({ tempat: 'Pantai Biru', petunjuk: WARGA.arahan['misi-1'].find((b) => b.siapa === 'kades')!.teks });
    expect(j.jumlahDidapat).toBe(0);
  });

  it('status mengikuti progres, dan tempat yang pulih tidak lagi diberi petunjuk', () => {
    let p = selesaikan(progresAwal(), 'misi-1');
    p = mulaiMisi(p, 'misi-2');
    const j = isiJurnal(p, NAMA);
    expect(j.misi.slice(0, 2).map((e) => e.status)).toEqual(['selesai', 'sedang']);
    expect(j.misi[0].petunjuk).toBeUndefined();
    expect(j.misi[1].petunjuk).toBeTruthy();
  });

  it('Festival siap setelah keempat tempat pulih, lalu selesai', () => {
    let p = progresAwal();
    for (const m of MISI_UTAMA) p = selesaikan(p, m.id);
    expect(isiJurnal(p, NAMA).misi[4].status).toBe('siap');
    expect(isiJurnal({ ...p, festivalSelesai: true }, NAMA).misi[4].status).toBe('selesai');
  });

  it('hanya menampilkan kartu yang bisa didapat; fakta muncul setelah didapat', () => {
    const bisa = new Set([...MISI_UTAMA.flatMap((m) => m.kartuMateri), ...FESTIVAL.kartuMateri]);
    const p = selesaikan(progresAwal(), 'misi-1');
    const j = isiJurnal(p, NAMA);
    expect(j.kartu.map((k) => k.no).sort((a, b) => a - b)).toEqual([...bisa].sort((a, b) => a - b));
    const k3 = j.kartu.find((k) => k.no === 3)!;
    expect(k3).toMatchObject({ didapat: true, sumber: 'Pantai Biru' });
    expect(k3.fakta).toBeTruthy();
    const k12 = j.kartu.find((k) => k.no === 12)!;
    expect(k12).toMatchObject({ didapat: false, sumber: 'Festival Hujan' });
    expect(k12.fakta).toBeUndefined();
    expect(j.jumlahDidapat).toBe(MISI_UTAMA[0].kartuMateri.length);
  });
});
