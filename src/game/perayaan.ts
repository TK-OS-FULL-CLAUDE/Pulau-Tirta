import Phaser from 'phaser';

/**
 * Efek perayaan di dunia (PRD: "tempat pulih, pulau berubah, warga bersorak"; Festival: "hujan turun").
 * Hanya gambar sementara di atas peta; tidak mengubah tile atau status apa pun.
 */

/** Anak yang memilih "kurangi gerakan" di sistemnya tetap melihat hasil akhirnya, tanpa animasi. */
export const kurangiGerak = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

const WARNA_KILAU = [0xffffff, 0xbfefff, 0x9be37a, 0xfff2a8];

/** Kilau kecil yang naik dari titik misi saat tempat itu pulih. */
export function kilau(scene: Phaser.Scene, x: number, y: number, jumlah = 22): void {
  if (kurangiGerak()) return;
  for (let i = 0; i < jumlah; i++) {
    const sudut = Math.random() * Math.PI * 2;
    const jarak = 8 + Math.random() * 56;
    const titik = scene.add
      .circle(x + Math.cos(sudut) * jarak, y + Math.sin(sudut) * jarak * 0.6, 1 + Math.random() * 1.2, WARNA_KILAU[i % WARNA_KILAU.length])
      .setDepth(35)
      .setAlpha(0);
    scene.tweens.add({
      targets: titik,
      alpha: { from: 1, to: 0 },
      y: titik.y - 14 - Math.random() * 16,
      delay: Math.random() * 700,
      duration: 900 + Math.random() * 600,
      ease: 'Sine.easeOut',
      onComplete: () => titik.destroy(),
    });
  }
}

/** Lapisan yang muncul pelan-pelan, supaya anak melihat tempatnya berubah, bukan tiba-tiba sudah berubah. */
export function munculPelan(scene: Phaser.Scene, layers: readonly Phaser.Tilemaps.TilemapLayer[], durasi = 1400): void {
  for (const layer of layers) {
    scene.tweens.killTweensOf(layer);
    if (kurangiGerak()) {
      layer.setAlpha(1);
      continue;
    }
    layer.setAlpha(0);
    scene.tweens.add({ targets: layer, alpha: 1, duration: durasi, ease: 'Sine.easeOut' });
  }
}

/** Hujan di sekitar layar selama Festival selesai. Tetesan digambar di dunia, di dalam pandangan kamera. */
export function hujan(scene: Phaser.Scene, durasi = 3200): void {
  if (kurangiGerak()) return;
  const kamera = scene.cameras.main;
  // Langit sedikit meredup selama hujan, lalu cerah lagi. Dibuat lebih besar dari layar karena ikut diperbesar kamera.
  const mendung = scene.add.rectangle(-kamera.width, -kamera.height, kamera.width * 3, kamera.height * 3, 0x1c3550, 0)
    .setOrigin(0).setScrollFactor(0).setDepth(34);
  scene.tweens.add({
    targets: mendung, fillAlpha: 0.22, duration: 500, hold: durasi - 900, yoyo: true, ease: 'Sine.easeInOut',
    onComplete: () => mendung.destroy(),
  });
  const tetes = () => {
    const r = kamera.worldView;
    const x = r.left + Math.random() * (r.width + 20);
    const y = r.top - 12 + Math.random() * r.height * 0.7;
    const garis = scene.add.rectangle(x, y, 1.2, 7, 0x8fd0ff, 0.95).setDepth(36).setAngle(12);
    scene.tweens.add({
      targets: garis,
      x: x - 8,
      y: y + 46 + Math.random() * 34,
      alpha: { from: 0.95, to: 0.1 },
      duration: 380 + Math.random() * 200,
      ease: 'Quad.easeIn',
      onComplete: () => garis.destroy(),
    });
  };
  scene.time.addEvent({ delay: 20, repeat: Math.floor(durasi / 20), callback: () => { tetes(); tetes(); tetes(); } });
}

/** Gelembung "Hore!" di atas warga yang terlihat. Posisinya diikutkan ke warga lewat ikuti() di update dunia. */
export class SorakWarga {
  private gelembung: { teks: Phaser.GameObjects.Text; ikut: () => { x: number; y: number; visible: boolean } }[] = [];

  constructor(private scene: Phaser.Scene) {}

  mulai(warga: readonly { image: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite }[], durasi = 2600): void {
    for (const w of warga) {
      if (!w.image.visible) continue;
      const teks = this.scene.add
        .text(w.image.x, w.image.y - 14, 'Hore!', {
          fontFamily: 'system-ui, sans-serif', fontSize: '7px', fontStyle: 'bold', color: '#1c2a33', backgroundColor: '#fff8dd', padding: { x: 3, y: 1 },
        })
        .setOrigin(0.5, 1)
        .setDepth(41);
      const isi = { teks, ikut: () => ({ x: w.image.x, y: w.image.y, visible: w.image.visible }) };
      this.gelembung.push(isi);
      if (!kurangiGerak()) {
        this.scene.tweens.add({ targets: teks, scale: { from: 0.6, to: 1.1 }, duration: 260, yoyo: true, repeat: 3, ease: 'Sine.easeInOut' });
      }
      this.scene.time.delayedCall(durasi, () => {
        teks.destroy();
        this.gelembung = this.gelembung.filter((g) => g !== isi);
      });
    }
  }

  ikuti(): void {
    for (const g of this.gelembung) {
      const p = g.ikut();
      g.teks.setPosition(p.x, p.y - 14).setVisible(p.visible);
    }
  }
}
