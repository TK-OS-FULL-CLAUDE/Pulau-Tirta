/** Kontrak Tiled dan logika world murni, tanpa DOM/Phaser agar bisa diuji. */
export interface Lokasi {
  id: string;
  nama: string;
  misiId?: string;
  x: number;
  y: number;
}
interface Properti { name: string; value: unknown }
export interface ObjekTiled {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  point?: boolean;
  rotation?: number;
  properties?: Properti[];
}
export interface LayerTiled {
  name: string;
  type: string;
  width?: number;
  height?: number;
  visible?: boolean;
  data?: number[];
  objects?: ObjekTiled[];
  properties?: Properti[];
}
export interface PetaTiled {
  properties?: Properti[];
  orientation: string;
  infinite: boolean;
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: LayerTiled[];
  tilesets: {
    firstgid: number;
    name: string;
    source?: string;
    image: string;
    tilewidth: number;
    tileheight: number;
    tilecount: number;
    columns: number;
    margin: number;
    spacing: number;
    tiles?: { id: number; properties?: Properti[] }[];
  }[];
}
export interface InteraksiDunia extends Lokasi { radius: number; mechanic: string }
export interface WilayahDunia { batas: ObjekTiled; lokasi: Lokasi }
export interface DataDunia {
  peta: PetaTiled;
  lebar: number;
  tinggi: number;
  spawn: { x: number; y: number };
  lokasi: Lokasi[];
  interaksi: InteraksiDunia[];
  wilayah: WilayahDunia[];
  penghalang: ObjekTiled[];
  tileTerhalang: Set<number>;
  solid: Uint8Array;
  penghalangPerSel: Map<string, ObjekTiled[]>;
  penanda: ObjekTiled[];
  pemainTileset: string;
  pemainFrame: number;
}

const MISI: Record<string, { id: string; misiId?: string }> = {
  M1: { id: 'pantai', misiId: 'misi-1' },
  M2: { id: 'puncak', misiId: 'misi-2' },
  M3: { id: 'lembah', misiId: 'misi-3' },
  M4: { id: 'hutan', misiId: 'misi-4' },
  // Desa memanggil alur festival existing, bukan cariMisi('M5').
  M5: { id: 'desa' },
  'misi-1': { id: 'pantai', misiId: 'misi-1' },
  'misi-2': { id: 'puncak', misiId: 'misi-2' },
  'misi-3': { id: 'lembah', misiId: 'misi-3' },
  'misi-4': { id: 'hutan', misiId: 'misi-4' },
};
export const PEMULIHAN: Record<string, string> = {
  Recovery_Pantai_Biru: 'misi-1',
  Recovery_Puncak_Kabut: 'misi-2',
  Recovery_Lembah_Hujan: 'misi-3',
  Recovery_Hutan_Sungai: 'misi-4',
};
export const RADIUS_PEMAIN = 4.6;
export const properti = (objek: { properties?: Properti[] }, nama: string) => objek.properties?.find((p) => p.name === nama)?.value;

export function misiPemulihan(layer: LayerTiled): string | undefined {
  if (!layer.name.startsWith('Recovery_')) return undefined;
  const id = properti(layer, 'missionId');
  return PEMULIHAN[layer.name] ?? (typeof id === 'string' ? MISI[id]?.misiId : undefined);
}

export function kedalamanLayer(layer: LayerTiled): number {
  const depth = properti(layer, 'renderDepth');
  return typeof depth === 'number' && Number.isFinite(depth) ? depth : ({ Ground: 0, TerrainDetails: 1, Water: 3, Paths: 5, Objects: 10, AbovePlayer: 30 }[layer.name] ?? (layer.name.startsWith('Recovery_') ? 2 : 10));
}

function wajib(kondisi: unknown, pesan: string): asserts kondisi {
  if (!kondisi) throw new Error(`Peta Pulau Tirta: ${pesan}`);
}

export function bacaPeta(input: unknown): DataDunia {
  wajib(input && typeof input === 'object', 'data map tidak ditemukan.');
  const peta = input as PetaTiled;
  wajib(peta.orientation === 'orthogonal' && peta.infinite === false, 'harus orthogonal dan finite.');
  wajib([peta.width, peta.height, peta.tilewidth, peta.tileheight].every((n) => Number.isInteger(n) && n > 0), 'ukuran map/tile tidak valid.');
  wajib(peta.tilewidth === 16 && peta.tileheight === 16, 'avatar memerlukan tile 16 px.');
  wajib(Array.isArray(peta.layers) && Array.isArray(peta.tilesets) && peta.tilesets.length > 0, 'layer/tileset tidak tersedia.');
  wajib(new Set(peta.layers.map((l) => l.name)).size === peta.layers.length, 'nama layer harus unik.');
  for (const set of peta.tilesets) {
    wajib(!set.source && set.image && set.name, 'tileset runtime harus embedded; jalankan world:export.');
    wajib(Number.isInteger(set.firstgid) && set.firstgid > 0 && Number.isInteger(set.tilecount) && set.tilecount > 0, 'rentang tileset tidak valid.');
  }
  const rentang = [...peta.tilesets].sort((a, b) => a.firstgid - b.firstgid);
  wajib(new Set(peta.tilesets.map((s) => s.name)).size === peta.tilesets.length && rentang.every((s, i) => !i || s.firstgid >= rentang[i - 1].firstgid + rentang[i - 1].tilecount), 'nama/rentang GID tileset bertumpang tindih.');
  const layer = (nama: string, jenis: string): LayerTiled => {
    const hasil = peta.layers.find((l) => l.name === nama);
    wajib(hasil && hasil.type === jenis, `layer ${nama} (${jenis}) wajib tersedia.`);
    return hasil;
  };
  for (const nama of ['Ground', 'Paths', 'Objects', 'AbovePlayer', ...Object.keys(PEMULIHAN)]) layer(nama, 'tilelayer');
  for (const l of peta.layers.filter((l) => l.type === 'tilelayer')) {
    wajib(l.width === peta.width && l.height === peta.height && l.data?.length === peta.width * peta.height, `dimensi layer ${l.name} salah.`);
    wajib(l.data.every((gid) => {
      if (!Number.isInteger(gid) || gid < 0 || gid > 0xffffffff) return false;
      const id = (gid >>> 0) & 0x0fffffff;
      return id === 0 || peta.tilesets.some((s) => id >= s.firstgid && id < s.firstgid + s.tilecount);
    }), `GID layer ${l.name} tidak valid.`);
    if (l.name.startsWith('Recovery_')) wajib(misiPemulihan(l), `status recovery ${l.name} tidak dikenal.`);
  }
  const objek = (nama: string) => {
    const hasil = layer(nama, 'objectgroup').objects;
    wajib(Array.isArray(hasil), `objek ${nama} tidak tersedia.`);
    for (const o of hasil) {
      wajib([o.x, o.y, o.width, o.height].every(Number.isFinite) && o.width >= 0 && o.height >= 0 && !o.rotation, `bentuk objek ${o.name} tidak didukung.`);
    }
    return hasil;
  };
  const interaksi = objek('Interactions').map((o): InteraksiDunia => {
    const id = properti(o, 'missionId');
    wajib(typeof id === 'string' && Object.hasOwn(MISI, id), `ID interaksi ${String(id)} tidak dikenal.`);
    const nama = properti(o, 'region');
    const radius = properti(o, 'radiusPx');
    const mechanic = properti(o, 'mechanic');
    wajib(typeof nama === 'string' && typeof mechanic === 'string' && typeof radius === 'number' && Number.isFinite(radius) && radius > 0, `properti interaksi ${o.name} salah.`);
    return { ...MISI[id], nama, x: o.x + o.width / 2, y: o.y + o.height / 2, radius, mechanic };
  });
  wajib(interaksi.length === 5 && new Set(interaksi.map((i) => i.id)).size === 5, 'harus ada tepat lima tujuan unik M1–M5.');
  const lokasi = [...interaksi].sort((a, b) => Number(b.id === 'desa') - Number(a.id === 'desa'));
  const wilayah = objek('Regions').map((batas): WilayahDunia => {
    const id = properti(batas, 'missionId');
    const tujuan = id === 'hub' ? lokasi[0] : interaksi.find((i) => i.misiId === MISI[String(id)]?.misiId && i.id !== 'desa');
    wajib(tujuan && batas.width > 0 && batas.height > 0, `region ${batas.name} tidak cocok dengan misi.`);
    return { batas, lokasi: tujuan };
  });
  wajib(wilayah.length === 5 && new Set(wilayah.map((w) => w.lokasi.id)).size === 5, 'harus ada lima region unik.');
  const titik = objek('Spawn').filter((o) => o.name === 'player_spawn' && o.point);
  wajib(titik.length === 1, 'harus ada satu point player_spawn.');
  const penghalang = objek('Collisions').filter((o) => properti(o, 'collides') === true);
  const tileTerhalang = new Set<number>();
  const tileJembatan = new Set<number>();
  for (const s of peta.tilesets) {
    for (const t of s.tiles ?? []) {
      if (properti(t, 'collides') === true) tileTerhalang.add(s.firstgid + t.id);
      if (properti(t, 'bridge') === true) tileJembatan.add(s.firstgid + t.id);
    }
  }
  const solid = new Uint8Array(peta.width * peta.height);
  for (const l of peta.layers.filter((l) => l.data && !l.name.startsWith('Recovery_') && properti(l, 'festival') !== true)) {
    for (let i = 0; i < solid.length; i++) if (tileTerhalang.has((l.data![i] >>> 0) & 0x0fffffff)) solid[i] = 1;
  }
  // Deck jembatan boleh melintas air; collider objek tetap diperiksa terpisah.
  const jalan = peta.layers.find((l) => l.name === 'Paths')!;
  for (let i = 0; i < solid.length; i++) if (tileJembatan.has((jalan.data![i] >>> 0) & 0x0fffffff)) solid[i] = 0;
  const penghalangPerSel = new Map<string, ObjekTiled[]>();
  for (const o of penghalang) {
    for (let sy = Math.floor(o.y / 64); sy <= Math.floor((o.y + o.height) / 64); sy++) for (let sx = Math.floor(o.x / 64); sx <= Math.floor((o.x + o.width) / 64); sx++) {
      const key = `${sx},${sy}`;
      const isi = penghalangPerSel.get(key) ?? [];
      isi.push(o); penghalangPerSel.set(key, isi);
    }
  }
  const pemainTileset = properti(peta, 'playerTileset') ?? 'kenney_tiny_town';
  const pemainFrame = properti(peta, 'playerFrame') ?? 108;
  wajib(typeof pemainTileset === 'string' && typeof pemainFrame === 'number' && Number.isInteger(pemainFrame) && peta.tilesets.some((s) => s.name === pemainTileset && pemainFrame >= 0 && pemainFrame < s.tilecount), 'tileset/frame pemain tidak valid.');
  const penanda = peta.layers.find((l) => l.name === 'Landmarks')?.objects ?? [];
  const dunia: DataDunia = { peta, lebar: peta.width * peta.tilewidth, tinggi: peta.height * peta.tileheight, spawn: { x: titik[0].x, y: titik[0].y }, lokasi, interaksi, wilayah, penghalang, tileTerhalang, solid, penghalangPerSel, penanda, pemainTileset, pemainFrame };
  wajib(bisaBerdiri(dunia, dunia.spawn.x, dunia.spawn.y), 'spawn berada di penghalang atau di luar map.');
  return dunia;
}

/** Collider kecil di kaki avatar. Visual pohon/atap tidak otomatis menjadi tembok. */
export function bisaBerdiri(dunia: DataDunia, x: number, y: number, radius = RADIUS_PEMAIN): boolean {
  if (x - radius < 0 || y - radius < 0 || x + radius >= dunia.lebar || y + radius >= dunia.tinggi) return false;
  const peta = dunia.peta;
  for (const [dx, dy] of [[-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius]]) {
    const index = Math.floor((y + dy) / peta.tileheight) * peta.width + Math.floor((x + dx) / peta.tilewidth);
    if (dunia.solid[index]) return false;
  }
  for (let sy = Math.floor((y - radius) / 64); sy <= Math.floor((y + radius) / 64); sy++) for (let sx = Math.floor((x - radius) / 64); sx <= Math.floor((x + radius) / 64); sx++) {
    if (dunia.penghalangPerSel.get(`${sx},${sy}`)?.some((o) => x + radius > o.x && x - radius < o.x + o.width && y + radius > o.y && y - radius < o.y + o.height)) return false;
  }
  return true;
}

export function interaksiTerdekat(dunia: DataDunia, x: number, y: number): InteraksiDunia | undefined {
  return dunia.interaksi
    .filter((i) => Math.hypot(x - i.x, y - i.y) <= i.radius)
    .sort((a, b) => Math.hypot(x - a.x, y - a.y) - Math.hypot(x - b.x, y - b.y))[0];
}

/** Jalan penghubung di luar kotak region memakai konteks Desa, bukan lokasi lama. */
export function lokasiPada(dunia: DataDunia, x: number, y: number): Lokasi {
  return dunia.wilayah.find(({ batas: b }) => x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height)?.lokasi ?? dunia.lokasi[0];
}

export function langkahGerak(dunia: DataDunia, posisi: { x: number; y: number }, dx: number, dy: number, dtMs: number): { x: number; y: number } {
  const hasil = { x: posisi.x, y: posisi.y };
  const panjang = Math.hypot(dx, dy);
  if (!panjang || !Number.isFinite(dtMs)) return hasil;
  const jarak = 86 * Math.max(0, Math.min(dtMs, 40)) / 1000;
  // Substep mencegah melewati penghalang tipis ketika frame melambat.
  const langkah = Math.max(1, Math.ceil(jarak / 2));
  for (let i = 0; i < langkah; i++) {
    const nx = hasil.x + dx / panjang * jarak / langkah;
    if (bisaBerdiri(dunia, nx, hasil.y)) hasil.x = nx;
    const ny = hasil.y + dy / panjang * jarak / langkah;
    if (bisaBerdiri(dunia, hasil.x, ny)) hasil.y = ny;
  }
  return hasil;
}
