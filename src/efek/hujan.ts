import Phaser from 'phaser';
import { kurangiGerak } from '../game/perayaan';

/**
 * Hujan yang datang dan pergi setelah Pulau Tirta pulih (Festival Hujan selesai): bukti bahwa siklus air
 * berjalan lagi. Lebih ringan dari hujan perayaan Festival: tetes lebih jarang, percikan kecil di tanah,
 * dan langit hanya sedikit meredup, supaya anak tetap nyaman menjelajah.
 */
const HUJAN_MS = 35_000;
const CERAH_MS = 50_000;
/** Jeda sebelum hujan pertama, supaya hujan perayaan Festival dan layar tamat selesai dulu. */
const JEDA_AWAL_MS = 20_000;

export class HujanPulau {
  private hujanSampai = 0;
  private berikutnya = 0;
  private mendung: Phaser.GameObjects.Rectangle;
  private redup = 0;
  private sisaTetes = 0;
  private readonly tenang = kurangiGerak();

  constructor(
    private scene: Phaser.Scene,
    private aktif: () => boolean,
  ) {
    const k = scene.cameras.main;
    this.mendung = scene.add
      .rectangle(-k.width, -k.height, k.width * 3, k.height * 3, 0x1c3550, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(34);
    pasangTekstur(scene);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.perbarui, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.perbarui, this));
  }

  private perbarui(waktu: number, dtMs: number): void {
    if (!this.aktif()) {
      this.berikutnya = 0;
      this.hujanSampai = 0;
    } else if (!this.berikutnya) {
      this.berikutnya = waktu + JEDA_AWAL_MS;
    } else if (waktu >= this.berikutnya && waktu >= this.hujanSampai) {
      this.hujanSampai = waktu + HUJAN_MS;
      this.berikutnya = this.hujanSampai + CERAH_MS;
    }
    const hujan = waktu < this.hujanSampai;
    // Langit meredup pelan di awal hujan dan cerah pelan di akhirnya.
    const tujuan = hujan ? 0.12 : 0;
    this.redup += (tujuan - this.redup) * Math.min(1, dtMs / 1500);
    this.mendung.setFillStyle(0x1c3550, this.redup);
    if (!hujan || this.tenang) return;
    // Sekitar 60 tetes per detik, tidak bergantung pada laju frame.
    this.sisaTetes += (dtMs / 1000) * 60;
    while (this.sisaTetes >= 1) {
      this.sisaTetes -= 1;
      this.tetes();
    }
  }

  private tetes(): void {
    const r = this.scene.cameras.main.worldView;
    const x = r.left + Math.random() * (r.width + 30);
    const y = r.top - 10 + Math.random() * r.height * 0.75;
    const jatuh = 40 + Math.random() * 40;
    const garis = this.scene.add.image(x, y, 'hp-tetes').setDepth(36).setAlpha(0.8);
    this.scene.tweens.add({
      targets: garis,
      x: x - 7,
      y: y + jatuh,
      duration: 360 + Math.random() * 160,
      ease: 'Quad.easeIn',
      onComplete: () => {
        garis.destroy();
        // Percikan kecil saat tetes sampai di tanah.
        const cincin = this.scene.add.image(x - 7, y + jatuh, 'hp-percik').setDepth(2).setAlpha(0.7).setScale(0.5);
        this.scene.tweens.add({ targets: cincin, scale: 1.2, alpha: 0, duration: 320, ease: 'Sine.easeOut', onComplete: () => cincin.destroy() });
      },
    });
  }
}

function pasangTekstur(scene: Phaser.Scene): void {
  const buat = (kunci: string, lebar: number, tinggi: number, gambar: (ctx: CanvasRenderingContext2D) => void) => {
    if (scene.textures.exists(kunci)) return;
    const c = document.createElement('canvas');
    c.width = lebar;
    c.height = tinggi;
    gambar(c.getContext('2d')!);
    scene.textures.addCanvas(kunci, c);
  };
  // Garis hujan miring 1 pixel, ujung bawah lebih terang.
  buat('hp-tetes', 3, 7, (ctx) => {
    const titik: [number, number, string][] = [[2, 0, '#bfe6ff'], [2, 1, '#bfe6ff'], [1, 2, '#9fd8ff'], [1, 3, '#9fd8ff'], [1, 4, '#d8f1ff'], [0, 5, '#d8f1ff'], [0, 6, '#ffffff']];
    for (const [x, y, w] of titik) {
      ctx.fillStyle = w;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  // Cincin percikan kecil.
  buat('hp-percik', 7, 3, (ctx) => {
    ctx.fillStyle = '#d8f1ff';
    for (const [x, y] of [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [0, 1], [6, 1], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2]]) ctx.fillRect(x, y, 1, 1);
  });
}
