import Phaser from 'phaser';
import type { StatusMisi } from '../../shared/missions';
import { interaksiTerdekat, langkahGerak, lokasiPada, kedalamanLayer, misiPemulihan, properti, type Lokasi } from './map-data';
import { DUNIA, PETA_RUNTIME } from './world-map';
import { LivingWorld } from './living-world';
import { actorPose, facingFor, promptTarget, type Facing } from './living-model';
import type { InteraksiDunia } from './map-data';

export type { Lokasi } from './map-data';
export const LEBAR = 1280;
export const TINGGI = 720;
export const LOKASI: Lokasi[] = DUNIA.lokasi;
const NAMA_OBJEK: Record<string, string> = { pantai: 'Kolam Pantai', puncak: 'Pos Kabut', lembah: 'Cekungan Hujan', hutan: 'Bibit & Sungai', desa: 'Festival Hujan' };

export interface PengaitDunia {
  statusMisi: (misiId: string) => StatusMisi;
  persenPulih: () => number;
  interaksi: (lokasi: Lokasi) => void;
  bergerak: () => void;
  /** Opsional agar pemakai kontrak lama tetap kompatibel. */
  pindahWilayah?: (lokasi: Lokasi) => void;
  /** Hanya membaca flag festival existing untuk dekorasi desa. */
  festivalSelesai?: () => boolean;
}

export class DuniaScene extends Phaser.Scene {
  private pemain!: Phaser.GameObjects.Sprite;
  private visualPemain!: Phaser.GameObjects.Sprite;
  private living!: LivingWorld;
  private facing: Facing = 'down';
  private walkDistance = 0;
  private prompt?: InteraksiDunia;
  private bayangan!: Phaser.GameObjects.Ellipse;
  private tanda = new Map<string, Phaser.GameObjects.Arc>();
  private pemulihan = new Map<string, Phaser.Tilemaps.TilemapLayer[]>();
  private perayaan: Phaser.Tilemaps.TilemapLayer[] = [];
  private label!: Phaser.GameObjects.Text;
  private judulWilayah!: Phaser.GameObjects.Text;
  private wilayahId?: string;
  private tombol!: Record<'atas' | 'bawah' | 'kiri' | 'kanan', Phaser.Input.Keyboard.Key[]>;
  private aksi!: Phaser.Input.Keyboard.Key[];
  terkunci = false;

  constructor(private kait: PengaitDunia) { super('dunia'); }

  preload(): void {
    this.load.tilemapTiledJSON('pulau-tirta', structuredClone(PETA_RUNTIME));
    for (const set of DUNIA.peta.tilesets) {
      const url = new URL(set.image, new URL('/maps/pulau-tirta.json', window.location.href)).pathname;
      if (set.name === DUNIA.pemainTileset) {
        this.load.spritesheet(set.name, url, { frameWidth: set.tilewidth, frameHeight: set.tileheight, margin: set.margin, spacing: set.spacing });
      } else this.load.image(set.name, url);
    }
  }

  create(): void {
    // Layer jarang memakai null untuk tile kosong, bukan ratusan ribu objek Tile.
    const map = this.make.tilemap({ key: 'pulau-tirta', insertNull: true });
    const sets = DUNIA.peta.tilesets.map((s) => {
      const hasil = map.addTilesetImage(s.name, s.name);
      if (!hasil) throw new Error(`Tileset tidak terbaca: ${s.name}`);
      return hasil;
    });
    for (const l of DUNIA.peta.layers.filter((l) => l.type === 'tilelayer')) {
      const layer = map.createLayer(l.name, sets);
      if (!layer) throw new Error(`Layer tidak terbaca: ${l.name}`);
      // Terrain pulih selalu di bawah objek, terlepas dari urutan layer di Tiled.
      layer.setDepth(kedalamanLayer(l)).setVisible(l.visible !== false);
      const misi = misiPemulihan(l);
      if (misi) this.pemulihan.set(misi, [...(this.pemulihan.get(misi) ?? []), layer]);
      if (properti(l, 'festival') === true) this.perayaan.push(layer);
    }

    for (const l of DUNIA.interaksi) {
      this.tanda.set(l.id, this.add.circle(l.x, l.y, 4, 0x9aa5a8).setStrokeStyle(1, 0x1c2a33).setDepth(11));
    }
    const { x, y } = DUNIA.spawn;
    this.bayangan = this.add.ellipse(x, y + 2, 9, 4, 0x130f16, 0.35).setDepth(19);
    this.pemain = this.add.sprite(x, y, DUNIA.pemainTileset, DUNIA.pemainFrame).setOrigin(0.5, 0.75).setDepth(20);
    // Logical feet/camera target never bob. Only this separate visual is animated.
    this.pemain.setVisible(false);
    this.visualPemain = this.add.sprite(x, y, DUNIA.pemainTileset, DUNIA.pemainFrame).setOrigin(0.5, 0.75).setDepth(20);
    this.label = this.add.text(0, 0, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '7px', color: '#fff8dd', backgroundColor: '#1c2a33', padding: { x: 5, y: 3 },
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(40).setVisible(false);
    this.judulWilayah = this.add.text(20, 16, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '9px', color: '#ffffff', backgroundColor: '#1c2a33', padding: { x: 4, y: 3 },
    }).setScrollFactor(0).setDepth(50);

    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    // addKey(..., false) mempertahankan input HTML, termasuk spasi dan panah.
    this.tombol = {
      atas: [kb.addKey(K.W, false), kb.addKey(K.UP, false)],
      bawah: [kb.addKey(K.S, false), kb.addKey(K.DOWN, false)],
      kiri: [kb.addKey(K.A, false), kb.addKey(K.LEFT, false)],
      kanan: [kb.addKey(K.D, false), kb.addKey(K.RIGHT, false)],
    };
    this.aksi = [kb.addKey(K.E, false), kb.addKey(K.SPACE, false), kb.addKey(K.ENTER, false)];
    kb.disableGlobalCapture();
<<<<<<< Updated upstream
    const hanyaGame = (event: KeyboardEvent) => {
      if (!this.inputTerhalang() && [...Object.values(this.tombol).flat(), ...this.aksi].some((k) => k.keyCode === event.keyCode)) event.preventDefault();
    };
    window.addEventListener('keydown', hanyaGame);
    const reset = () => kb.resetKeys();
    document.addEventListener('focusin', reset);
    document.addEventListener('focusout', reset);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', hanyaGame);
      document.removeEventListener('focusin', reset);
      document.removeEventListener('focusout', reset);
    });
    const camera = this.cameras.main;
    camera.setBounds(0, 0, DUNIA.lebar, DUNIA.tinggi).setZoom(3);
    camera.roundPixels = true;
    camera.startFollow(this.pemain, true, 0.14, 0.14);
    // scrollFactor(0) tetap terkena zoom; letakkan HUD pada sudut viewport.
    this.judulWilayah.setPosition((LEBAR - LEBAR / camera.zoom) / 2 + 8, (TINGGI - TINGGI / camera.zoom) / 2 + 8);
    this.label.setPosition(LEBAR / 2, (TINGGI + TINGGI / camera.zoom) / 2 - 8);
    const resizePrompt = () => {
      const rect = this.game.canvas.getBoundingClientRect();
      const cssScale = Math.max(0.05, Math.min(rect.width / LEBAR, rect.height / TINGGI));
      // Keep at least 13 CSS pixels after canvas FIT scaling on narrow screens.
      this.label.setFontSize(Math.max(7, Math.ceil(13 / (camera.zoom * cssScale))));
      this.label.setWordWrapWidth(LEBAR / camera.zoom - 24);
    };
    const promptObserver = new ResizeObserver(resizePrompt);
    promptObserver.observe(this.game.canvas); resizePrompt();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => promptObserver.disconnect());
    this.living = new LivingWorld(this, DUNIA, map, id => this.kait.statusMisi(id) === 'selesai', () => this.kait.festivalSelesai?.() === true);
    this.perbaruiWilayah();
=======
    // Phaser menahan fokus saat canvas diklik; lepas fokus dari kotak ketik Tiko supaya WASD kembali menggerakkan pemain.
    this.input.on('pointerdown', () => {
      const a = document.activeElement;
      if (a instanceof HTMLElement) a.blur();
    });
>>>>>>> Stashed changes
    this.segarkan();
  }

  private inputTerhalang(): boolean {
    const fokus = document.activeElement;
    return this.terkunci || document.querySelector('dialog[open]') !== null || (fokus instanceof HTMLElement && (fokus.matches('input, textarea, select, button') || fokus.isContentEditable));
  }

  private perbaruiWilayah(): void {
    const lokasi = lokasiPada(DUNIA, this.pemain.x, this.pemain.y);
    if (this.wilayahId === lokasi.id) return;
    this.wilayahId = lokasi.id;
    this.judulWilayah.setText(lokasi.nama);
    this.kait.pindahWilayah?.(lokasi);
  }

  segarkan(): void {
    for (const [misi, layers] of this.pemulihan) for (const layer of layers) layer.setVisible(this.kait.statusMisi(misi) === 'selesai');
    for (const layer of this.perayaan) layer.setVisible(this.kait.festivalSelesai?.() === true);
    this.living?.refresh();
    for (const l of LOKASI) {
      const status = l.misiId ? this.kait.statusMisi(l.misiId) : undefined;
      const warna = status ? { belum: 0x9aa5a8, sedang: 0xf0b45c, selesai: 0x3c9a5f }[status] : 0x5b8fb0;
      this.tanda.get(l.id)?.setFillStyle(warna);
    }
  }

  lokasiTerdekat(): Lokasi | undefined {
    return this.pemain ? interaksiTerdekat(DUNIA, this.pemain.x, this.pemain.y) : undefined;
  }

<<<<<<< Updated upstream
  update(time: number, dtMs: number): void {
    if (!this.pemain) return;
    const blocked = this.inputTerhalang();
    this.living.update(time, dtMs, blocked, this.pemain);
    if (blocked) {
      this.input.keyboard?.resetKeys();
=======
  /** Warga bersorak di lokasi yang baru pulih. */
  rayakan(lokasiId: string, teks: string): void {
    const l = LOKASI.find((x) => x.id === lokasiId);
    const t = this.tanda.get(lokasiId);
    if (!l || !t) return;
    this.tweens.add({ targets: t, scale: 1.3, duration: 220, yoyo: true, repeat: 2 });
    const sorak = this.add
      .text(l.x, l.y - 110, `Hore! ${teks}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#3c9a5f',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: sorak, y: l.y - 150, alpha: 0, delay: 1600, duration: 900, onComplete: () => sorak.destroy() });
  }

  update(_t: number, dtMs: number): void {
    const a = document.activeElement;
    const mengetik = a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement || a instanceof HTMLSelectElement;
    if (this.terkunci || mengetik) {
      // Buang tekanan E/Spasi/Enter selama dialog terbuka atau anak mengetik ke Tiko,
      // supaya tidak membuka misi tanpa sengaja (mis. huruf "e" saat menulis pesan).
      this.aksi.forEach((k) => Phaser.Input.Keyboard.JustDown(k));
      return;
    }
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
>>>>>>> Stashed changes
      this.label.setVisible(false);
      this.visualPemain.setPosition(this.pemain.x, this.pemain.y).setScale(1).setData('motion', 'paused');
      return;
    }
    const tekan = (ks: Phaser.Input.Keyboard.Key[]) => ks.some((k) => k.isDown);
    const dx = Number(tekan(this.tombol.kanan)) - Number(tekan(this.tombol.kiri));
    const dy = Number(tekan(this.tombol.bawah)) - Number(tekan(this.tombol.atas));
    const posisi = langkahGerak(DUNIA, this.pemain, dx, dy, dtMs);
    const moved = Math.hypot(posisi.x - this.pemain.x, posisi.y - this.pemain.y);
    this.facing = facingFor(dx, dy, this.facing);
    if (moved > 0) {
      this.walkDistance += moved;
      this.pemain.setPosition(posisi.x, posisi.y);
      this.bayangan.setPosition(posisi.x, posisi.y + 2);
      if (dx) this.pemain.setFlipX(dx < 0);
      this.kait.bergerak();
      this.perbaruiWilayah();
    }
    const pose = actorPose(this.walkDistance, time, moved > 0);
    this.visualPemain.setPosition(posisi.x, posisi.y + pose.y).setScale(1, pose.scaleY).setData('motion', moved > 0 ? 'walking' : 'idle').setData('facing', this.facing);
    if (this.facing === 'left' || this.facing === 'right') this.visualPemain.setFlipX(this.facing === 'left');
    const dekat = this.lokasiTerdekat();
    this.prompt = promptTarget(DUNIA, this.pemain, this.prompt);
    const penanda = DUNIA.penanda.filter((p) => Math.hypot(p.x - this.pemain.x, p.y - this.pemain.y) < Number(properti(p, 'radiusPx') ?? 40)).sort((a, b) => Math.hypot(a.x - this.pemain.x, a.y - this.pemain.y) - Math.hypot(b.x - this.pemain.x, b.y - this.pemain.y))[0];
    this.label.setVisible(Boolean(this.prompt || penanda));
    if (this.prompt) {
      this.label.setText(`${dekat?.id === this.prompt.id ? 'E' : 'Dekati'} · ${NAMA_OBJEK[this.prompt.id]}`);
    } else if (penanda) this.label.setText(String(properti(penanda, 'label') ?? penanda.name));
    const aksi = this.aksi.map((k) => Phaser.Input.Keyboard.JustDown(k)).some(Boolean);
    if (dekat && aksi) this.kait.interaksi(dekat);
  }
}
