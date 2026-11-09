/**
 * Isi Jurnal Petualangan (PRD F-09 dan sistem arahan halus tingkat 3): status tiap tempat dan Festival,
 * satu kalimat petunjuk untuk tempat yang belum pulih, dan Kartu Ilmu yang sudah atau belum didapat.
 * Petunjuk memakai kalimat Kepala Desa di content/warga.json, jadi teksnya sudah lolos tes kebocoran.
 */
import { FESTIVAL, KARTU_MATERI, MISI_UTAMA } from './content';
import { festivalTerbuka, type Progres } from './missions';
import { WARGA, type NaskahWarga } from './warga';

export type StatusJurnal = 'belum' | 'sedang' | 'selesai' | 'terkunci' | 'siap';

export interface EntriJurnal {
  id: string;
  tempat: string;
  judul: string;
  status: StatusJurnal;
  petunjuk?: string;
}

export interface KartuJurnal {
  no: number;
  didapat: boolean;
  /** Fakta hanya diisi kalau kartu sudah didapat. */
  fakta?: string;
  /** Tempat kartu ini bisa didapat. */
  sumber: string;
}

export interface IsiJurnal {
  misi: EntriJurnal[];
  kartu: KartuJurnal[];
  jumlahDidapat: number;
}

/**
 * @param namaTempat nama tampilan lokasi per id (mis. `pantai` → "Pantai Biru"), dari peta.
 */
export function isiJurnal(p: Progres, namaTempat: Record<string, string>, naskah: NaskahWarga = WARGA): IsiJurnal {
  const misi: EntriJurnal[] = MISI_UTAMA.map((m) => {
    const status = p.status[m.id] ?? 'belum';
    const kades = naskah.arahan[m.id]?.find((b) => b.siapa === 'kades');
    return {
      id: m.id,
      tempat: namaTempat[m.lokasi] ?? m.lokasi,
      judul: m.judul,
      status,
      petunjuk: status === 'selesai' ? undefined : kades?.teks,
    };
  });
  const statusFestival: StatusJurnal = p.festivalSelesai ? 'selesai' : festivalTerbuka(p) ? 'siap' : 'terkunci';
  misi.push({
    id: 'festival',
    tempat: namaTempat.desa ?? 'Desa Tirta',
    judul: 'Festival Hujan',
    status: statusFestival,
    petunjuk:
      statusFestival === 'terkunci'
        ? 'Terbuka setelah keempat tempat pulih.'
        : statusFestival === 'siap'
          ? 'Semua tempat sudah pulih. Temui Kepala Desa di Desa Tirta.'
          : undefined,
  });

  // Hanya kartu yang memang bisa didapat di game, urut nomor.
  const sumber = new Map<number, string>();
  for (const m of MISI_UTAMA) for (const no of m.kartuMateri) if (!sumber.has(no)) sumber.set(no, namaTempat[m.lokasi] ?? m.lokasi);
  for (const no of FESTIVAL.kartuMateri) if (!sumber.has(no)) sumber.set(no, 'Festival Hujan');
  const didapat = new Set(p.kartuDidapat);
  const kartu: KartuJurnal[] = KARTU_MATERI.filter((k) => sumber.has(k.no)).map((k) => ({
    no: k.no,
    didapat: didapat.has(k.no),
    fakta: didapat.has(k.no) ? k.fakta : undefined,
    sumber: sumber.get(k.no)!,
  }));
  return { misi, kartu, jumlahDidapat: kartu.filter((k) => k.didapat).length };
}
