import Phaser from 'phaser';
import type { StatusMisi } from '../../shared/missions';

export const LEBAR = 1280;
export const TINGGI = 720;

export interface Lokasi {
  id: string;
  nama: string;
  misiId?: string;
  x: number;
  y: number;
}

/** Posisi sementara; diganti peta Tiled (public/maps/pulau-tirta.json) saat peta jadi. */
export const LOKASI: Lokasi[] = [
  { id: 'desa', nama: 'Desa Tirta', x: 640, y: 380 },
  { id: 'pantai', nama: 'Pantai Biru', misiId: 'misi-1', x: 330, y: 560 },
  { id: 'puncak', nama: 'Puncak Kabut', misiId: 'misi-2', x: 330, y: 180 },
  { id: 'lembah', nama: 'Lembah Hujan', misiId: 'misi-3', x: 950, y: 180 },
  { id: 'hutan', nama: 'Hutan & Sungai', misiId: 'misi-4', x: 950, y: 560 },
];

const PULAU = new Phaser.Geom.Ellipse(640, 370, 1040, 600);
const JARAK_INTERAKSI = 90;
const KECEPATAN = 260;

export interface PengaitDunia {
  statusMisi: (misiId: string) => StatusMisi;
  persenPulih: () => number;
  interaksi: (lokasi: Lokasi) => void;
  bergerak: () => void;
}

export class DuniaScene extends Phaser.Scene {
  private pemain!: Phaser.GameObjects.Rectangle;
  private pulau!: Phaser.GameObjects.Ellipse;
  private tanda = new Map<string, Phaser.GameObjects.Arc>();
  private label!: Phaser.GameObjects.Text;
  private tombol!: Record<'atas' | 'bawah' | 'kiri' | 'kanan', Phaser.Input.Keyboard.Key[]>;
  private aksi!: Phaser.Input.Keyboard.Key[];
  terkunci = false;

  constructor(private kait: PengaitDunia) {
    super('dunia');
  }

  create(): void {
    this.add.rectangle(LEBAR / 2, TINGGI / 2, LEBAR, TINGGI, 0x1f6f8b);
    this.pulau = this.add.ellipse(PULAU.x, PULAU.y, PULAU.width, PULAU.height, 0xc9b37a);
    this.add.ellipse(PULAU.x, PULAU.y, PULAU.width + 24, PULAU.height + 24).setStrokeStyle(6, 0xf2e3b3);

    for (const l of LOKASI) {
      const t = this.add.circle(l.x, l.y, 46, 0x9aa5a8).setStrokeStyle(4, 0x1c2a33);
      this.tanda.set(l.id, t);
      this.add
        .text(l.x, l.y + 62, l.nama, { fontFamily: 'system-ui, sans-serif', fontSize: '22px', color: '#1c2a33', fontStyle: 'bold' })
        .setOrigin(0.5);
    }

    this.pemain = this.add.rectangle(640, 470, 32, 32, 0xf08a2c).setStrokeStyle(3, 0x1c2a33);
    this.label = this.add
      .text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#ffffff', backgroundColor: '#1c2a33', padding: { x: 8, y: 4 } })
      .setOrigin(0.5)
      .setVisible(false);

    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.tombol = {
      atas: [kb.addKey(K.W), kb.addKey(K.UP)],
      bawah: [kb.addKey(K.S), kb.addKey(K.DOWN)],
      kiri: [kb.addKey(K.A), kb.addKey(K.LEFT)],
      kanan: [kb.addKey(K.D), kb.addKey(K.RIGHT)],
    };
    this.aksi = [kb.addKey(K.E), kb.addKey(K.SPACE), kb.addKey(K.ENTER)];
    // Biarkan HTML (kotak ketik Tiko) tetap menerima spasi dan panah.
    kb.disableGlobalCapture();
    this.segarkan();
  }

  /** Warnai lokasi sesuai status misi dan buat pulau makin hijau saat pulih. */
  segarkan(): void {
    for (const l of LOKASI) {
      const s = l.misiId ? this.kait.statusMisi(l.misiId) : 'belum';
      const warna = l.misiId ? { belum: 0x9aa5a8, sedang: 0xf0b45c, selesai: 0x3c9a5f }[s] : 0x5b8fb0;
      this.tanda.get(l.id)?.setFillStyle(warna);
    }
    const kering = Phaser.Display.Color.ValueToColor(0xc9b37a);
    const hijau = Phaser.Display.Color.ValueToColor(0x6fbf73);
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(kering, hijau, 100, Math.round(this.kait.persenPulih() * 100));
    this.pulau.setFillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
  }

  lokasiTerdekat(): Lokasi | undefined {
    return LOKASI.find((l) => Phaser.Math.Distance.Between(l.x, l.y, this.pemain.x, this.pemain.y) < JARAK_INTERAKSI);
  }

  update(_t: number, dtMs: number): void {
    if (this.terkunci) return;
    const tekan = (ks: Phaser.Input.Keyboard.Key[]) => ks.some((k) => k.isDown);
    const dx = (tekan(this.tombol.kanan) ? 1 : 0) - (tekan(this.tombol.kiri) ? 1 : 0);
    const dy = (tekan(this.tombol.bawah) ? 1 : 0) - (tekan(this.tombol.atas) ? 1 : 0);
    if (dx || dy) {
      const pjg = Math.hypot(dx, dy);
      const langkah = (KECEPATAN * dtMs) / 1000;
      const nx = this.pemain.x + (dx / pjg) * langkah;
      const ny = this.pemain.y + (dy / pjg) * langkah;
      // Tidak bisa menembus air: tetap di dalam pulau.
      if (PULAU.contains(nx, ny)) this.pemain.setPosition(nx, ny);
      else if (PULAU.contains(nx, this.pemain.y)) this.pemain.x = nx;
      else if (PULAU.contains(this.pemain.x, ny)) this.pemain.y = ny;
      this.kait.bergerak();
    }

    const dekat = this.lokasiTerdekat();
    if (dekat) {
      this.label.setText(`E · ${dekat.nama}`).setPosition(dekat.x, dekat.y - 70).setVisible(true);
      if (this.aksi.some((k) => Phaser.Input.Keyboard.JustDown(k))) this.kait.interaksi(dekat);
    } else {
      this.label.setVisible(false);
    }
  }
}
