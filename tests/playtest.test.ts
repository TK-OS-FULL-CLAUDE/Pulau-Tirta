import { describe, expect, it } from 'vitest';
import { MISI_UTAMA, pilihanBenar } from '../shared/content';
import { jawab, mintaPetunjuk, mulaiMisi, progresAwal, simpan, type Progres } from '../shared/missions';
import {
  KOLOM_CSV,
  KUNCI_HASIL,
  KUNCI_SESI,
  bacaSkor,
  barisCsv,
  catatBingung,
  catatMulai,
  catatPerubahan,
  catatanBaru,
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
  type CatatanSesi,
  type HasilAnak,
  type SesiPlaytest,
} from '../shared/playtest';

const benar = (id: string) => pilihanBenar(MISI_UTAMA.find((m) => m.id === id)!)!.id;
const salah = (id: string) => MISI_UTAMA.find((m) => m.id === id)!.pilihan!.filter((p) => !p.benar).map((p) => p.id);

function penyimpanan() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

/** Pemain tiruan: setiap perubahan progres dicatat lewat catatPerubahan, seperti perbarui() di src/main.ts. */
function pemain(mulai = 1_000_000) {
  let t = mulai;
  const s: SesiPlaytest = sesiBaru();
  s.catatan = catatMulai(s.catatan, t);
  const ubah = (baru: Progres) => {
    s.catatan = catatPerubahan(s.catatan, s.progres, baru, t);
    s.progres = baru;
  };
  return {
    s,
    tunggu: (detik: number) => void (t += detik * 1000),
    buka: (id: string) => ubah(mulaiMisi(s.progres, id)),
    jawab: (id: string, pilihan: string) => ubah(jawab(s.progres, id, pilihan).progres),
    bingung: (id: string) => {
      s.catatan = catatBingung(s.catatan, s.progres, id);
      ubah(mintaPetunjuk(s.progres, id).progres);
    },
    festival: () => ubah({ ...s.progres, festivalSelesai: true }),
  };
}

describe('catatan sesi', () => {
  it('mencatat waktu misi dimulai, selesai, dan Festival selesai tanpa menimpa waktu pertama', () => {
    let c: CatatanSesi = catatMulai(catatanBaru(), 100);
    expect(catatMulai(c, 999).mulai).toBe(100);
    const awal = progresAwal();
    const sedang = mulaiMisi(awal, 'misi-2');
    c = catatPerubahan(c, awal, sedang, 2_000);
    expect(c.misiMulai['misi-2']).toBe(2_000);
    // Membuka lagi misi yang sedang berjalan tidak mengubah waktu mulai.
    c = catatPerubahan(c, sedang, sedang, 5_000);
    expect(c.misiMulai['misi-2']).toBe(2_000);
    const selesai = jawab(sedang, 'misi-2', benar('misi-2')).progres;
    c = catatPerubahan(c, sedang, selesai, 9_400);
    expect(c.misiSelesai['misi-2']).toBe(9_400);
    c = catatPerubahan(c, selesai, { ...selesai, festivalSelesai: true }, 20_000);
    expect(c.festivalSelesai).toBe(20_000);
    expect(durasiTotal(c)).toBe(20);
  });

  it('"Aku bingung" dihitung per misi sampai misinya selesai, dan tidak untuk misi tanpa pertanyaan', () => {
    let p = mulaiMisi(progresAwal(), 'misi-1');
    let c = catatanBaru();
    c = catatBingung(c, p, 'misi-1');
    c = catatBingung(c, p, 'misi-1');
    c = catatBingung(c, p, 'misi-0');
    p = jawab(p, 'misi-1', benar('misi-1')).progres;
    c = catatBingung(c, p, 'misi-1');
    expect(c.bingung).toEqual({ 'misi-1': 2 });
  });
});

describe('ringkasan per misi', () => {
  it('satu playthrough lengkap menghasilkan angka yang benar untuk keempat misi', () => {
    const a = pemain();
    // Pantai Biru: keliru dua kali, lalu benar (petunjuk sampai tingkat 2) → memperbaiki sendiri.
    a.tunggu(10);
    a.buka('misi-1');
    a.tunggu(30);
    a.jawab('misi-1', salah('misi-1')[0]);
    a.jawab('misi-1', salah('misi-1')[1]);
    a.tunggu(15);
    a.jawab('misi-1', benar('misi-1'));
    // Puncak Kabut: benar di percobaan pertama.
    a.buka('misi-2');
    a.tunggu(42.4);
    a.jawab('misi-2', benar('misi-2'));
    // Lembah Hujan: keliru tiga kali → dibantu penuh.
    a.buka('misi-3');
    for (const x of salah('misi-3')) a.jawab('misi-3', x);
    a.tunggu(60);
    a.jawab('misi-3', benar('misi-3'));
    // Hutan & Sungai: menekan "Aku bingung" sekali, lalu benar.
    a.buka('misi-4');
    a.bingung('misi-4');
    a.tunggu(20.6);
    a.jawab('misi-4', benar('misi-4'));
    a.tunggu(100);
    a.festival();

    const r = Object.fromEntries(MISI_UTAMA.map((m) => [m.id, ringkasMisi(a.s.progres, a.s.catatan, m.id)]));
    expect(r['misi-1']).toEqual({
      misiId: 'misi-1',
      pilihanPertama: salah('misi-1')[0],
      benarPertama: false,
      tingkatTertinggi: 2,
      perbaikiSendiri: true,
      dibantuPenuh: false,
      bingung: 0,
      durasiDetik: 45,
    });
    expect(r['misi-2']).toMatchObject({ benarPertama: true, tingkatTertinggi: 0, perbaikiSendiri: false, dibantuPenuh: false, durasiDetik: 42 });
    expect(r['misi-3']).toMatchObject({ benarPertama: false, tingkatTertinggi: 3, perbaikiSendiri: false, dibantuPenuh: true, durasiDetik: 60 });
    expect(r['misi-4']).toMatchObject({ benarPertama: true, tingkatTertinggi: 1, bingung: 1, perbaikiSendiri: false, dibantuPenuh: false, durasiDetik: 21 });
    expect(durasiTotal(a.s.catatan)).toBe(10 + 30 + 15 + 42 + 60 + 21 + 100);
  });

  it('benar di percobaan pertama setelah "Aku bingung" tiga kali tetap dicatat dibantu penuh, bukan memperbaiki sendiri', () => {
    const a = pemain();
    a.buka('misi-1');
    for (let i = 0; i < 3; i++) a.bingung('misi-1');
    a.jawab('misi-1', benar('misi-1'));
    expect(ringkasMisi(a.s.progres, a.s.catatan, 'misi-1')).toMatchObject({
      benarPertama: true,
      tingkatTertinggi: 3,
      perbaikiSendiri: false,
      dibantuPenuh: true,
      bingung: 3,
    });
  });

  it('keliru lalu "Aku bingung" sampai tingkat 3 bukan memperbaiki sendiri', () => {
    const a = pemain();
    a.buka('misi-2');
    a.jawab('misi-2', salah('misi-2')[0]);
    a.bingung('misi-2');
    a.bingung('misi-2');
    a.jawab('misi-2', benar('misi-2'));
    expect(ringkasMisi(a.s.progres, a.s.catatan, 'misi-2')).toMatchObject({ perbaikiSendiri: false, dibantuPenuh: true });
  });

  it('misi yang belum dijawab atau belum selesai dibiarkan kosong, bukan dianggap gagal', () => {
    const a = pemain();
    a.buka('misi-3');
    a.jawab('misi-3', salah('misi-3')[0]);
    expect(ringkasMisi(a.s.progres, a.s.catatan, 'misi-3')).toMatchObject({
      pilihanPertama: salah('misi-3')[0],
      benarPertama: false,
      tingkatTertinggi: 1,
      perbaikiSendiri: null,
      dibantuPenuh: null,
      durasiDetik: null,
    });
    expect(ringkasMisi(a.s.progres, a.s.catatan, 'misi-4')).toMatchObject({ pilihanPertama: null, benarPertama: null, tingkatTertinggi: 0 });
    expect(durasiTotal(a.s.catatan)).toBeNull();
  });
});

describe('kode anak dan skor', () => {
  it('kode anonim berurutan dan melanjutkan dari nomor terbesar', () => {
    expect(kodeBerikut([])).toBe('Anak 1');
    const h = (anak: string) => ({ anak }) as HasilAnak;
    expect(kodeBerikut([h('Anak 1'), h('Anak 2')])).toBe('Anak 3');
    expect(kodeBerikut([h('Anak 4'), h('Anak 2')])).toBe('Anak 5');
  });

  it('skor hanya bilangan bulat 0–5; kosong boleh', () => {
    expect(bacaSkor('')).toBeNull();
    expect(bacaSkor(' 3 ')).toBe(3);
    expect(bacaSkor('0')).toBe(0);
    expect(bacaSkor('5')).toBe(5);
    for (const x of ['6', '-1', '2.5', 'tiga', '1e1']) expect(bacaSkor(x), x).toBeUndefined();
  });
});

describe('CSV', () => {
  it('kolomnya sesuai urutan yang disepakati', () => {
    const perMisi = ['pilihan_pertama', 'benar_pertama', 'tingkat_tertinggi', 'perbaiki_sendiri', 'dibantu_penuh', 'bingung', 'durasi_detik'];
    expect(KOLOM_CSV).toEqual([
      'anak',
      'skor_sebelum',
      'skor_sesudah',
      ...['misi1', 'misi2', 'misi3', 'misi4'].flatMap((m) => perMisi.map((k) => `${m}_${k}`)),
      'durasi_total_detik',
    ]);
  });

  it('satu anak menjadi satu baris; ya/tidak ditulis 1/0 dan data yang belum ada dikosongkan', () => {
    const a = pemain();
    a.buka('misi-1');
    a.jawab('misi-1', 'b');
    a.tunggu(12);
    a.jawab('misi-1', benar('misi-1'));
    const s = { ...a.s, skorSebelum: 2, skorSesudah: 4 };
    const csv = keCsv([hasilAnak('Anak 1', s)]);
    const baris = csv.trimEnd().split('\r\n');
    expect(baris).toHaveLength(2);
    expect(baris[0]).toBe(KOLOM_CSV.join(','));
    const sel = baris[1].split(',');
    expect(sel).toHaveLength(KOLOM_CSV.length);
    const nilai = Object.fromEntries(KOLOM_CSV.map((k, i) => [k, sel[i]]));
    expect(nilai).toMatchObject({
      anak: 'Anak 1',
      skor_sebelum: '2',
      skor_sesudah: '4',
      misi1_pilihan_pertama: 'b',
      misi1_benar_pertama: '0',
      misi1_tingkat_tertinggi: '1',
      misi1_perbaiki_sendiri: '1',
      misi1_dibantu_penuh: '0',
      misi1_bingung: '0',
      misi1_durasi_detik: '12',
      misi2_pilihan_pertama: '',
      misi2_benar_pertama: '',
      misi2_tingkat_tertinggi: '0',
      misi2_perbaiki_sendiri: '',
      misi2_durasi_detik: '',
      durasi_total_detik: '',
    });
  });

  it('nilai berisi koma atau tanda kutip di-escape', () => {
    const h = hasilAnak('Anak "1", uji', sesiBaru());
    expect(barisCsv(h)[0]).toBe('"Anak ""1"", uji"');
  });
});

describe('penyimpanan playtest', () => {
  it('hasil dan sesi disimpan dengan kunci sendiri, terpisah dari progres biasa', () => {
    const store = penyimpanan();
    simpan(progresAwal(), store);
    const kunciProgres = [...store.data.keys()][0];
    expect([KUNCI_HASIL, KUNCI_SESI]).not.toContain(kunciProgres);

    const a = pemain();
    a.buka('misi-2');
    simpanSesi({ ...a.s, skorSebelum: 3 }, store);
    simpanHasil([hasilAnak('Anak 1', a.s)], store);
    const sesi = muatSesi(store);
    expect(sesi.progres.status['misi-2']).toBe('sedang');
    expect(sesi.catatan.misiMulai['misi-2']).toBeTypeOf('number');
    expect(sesi.skorSebelum).toBe(3);
    expect(muatHasil(store).map((h) => h.anak)).toEqual(['Anak 1']);

    hapusSesi(store);
    expect(muatSesi(store).progres.status['misi-2']).toBe('belum');
    expect(muatHasil(store)).toHaveLength(1);

    hapusSemua(store);
    expect(muatHasil(store)).toEqual([]);
    expect(store.data.has(kunciProgres)).toBe(true);
  });

  it('data rusak atau penyimpanan diblokir tidak membuat game berhenti', () => {
    const store = penyimpanan();
    store.data.set(KUNCI_HASIL, '{rusak');
    store.data.set(KUNCI_SESI, 'null');
    expect(muatHasil(store)).toEqual([]);
    expect(muatSesi(store).progres.status['misi-1']).toBe('belum');
    const diblokir = {
      getItem: () => {
        throw new Error('diblokir');
      },
      setItem: () => {
        throw new Error('diblokir');
      },
      removeItem: () => {
        throw new Error('diblokir');
      },
    };
    expect(muatHasil(diblokir)).toEqual([]);
    expect(() => simpanHasil([], diblokir)).not.toThrow();
    expect(() => hapusSemua(diblokir)).not.toThrow();
  });
});
