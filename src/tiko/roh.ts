import Phaser from 'phaser';
import { KILAU, TIKO_BUKA, TIKO_KEDIP, gambarCahaya, gambarPixel } from './gambar';

/**
 * - putar: melayang memutari pemain (biasa).
 * - pikir: menunggu jawaban; berputar lebih cepat dan cahayanya berdenyut.
 * - bicara: berhenti di samping kepala pemain dan memantul pelan selama kotak jawaban terbuka.
 */
export type Suasana = 'putar' | 'pikir' | 'bicara';

interface Titik {
  x: number;
  y: number;
}

const KUNCI = { buka: 'tiko-roh', kedip: 'tiko-roh-kedip', cahaya: 'tiko-cahaya', kilau: 'tiko-kilau' };
/** Lintasan elips di sekitar pemain, dalam pixel dunia (kamera memperbesar 3×). */
const ORBIT = { rx: 15, ry: 6, naik: 11 };
const PUTARAN_MS = { putar: 3400, pikir: 1100 };
/** Kedalaman sprite pemain di DuniaScene; Tiko di belakangnya saat berada di sisi atas lintasan. */
const KEDALAMAN_PEMAIN = 20;

function pasangTekstur(scene: Phaser.Scene): void {
  const t = scene.textures;
  if (!t.exists(KUNCI.buka)) t.addCanvas(KUNCI.buka, gambarPixel(TIKO_BUKA));
  if (!t.exists(KUNCI.kedip)) t.addCanvas(KUNCI.kedip, gambarPixel(TIKO_KEDIP));
  if (!t.exists(KUNCI.cahaya)) t.addCanvas(KUNCI.cahaya, gambarCahaya(10));
  if (!t.exists(KUNCI.kilau)) t.addCanvas(KUNCI.kilau, gambarPixel(KILAU));
}

/** Tiko sebagai roh air yang menemani pemain di peta. Hanya hiasan: tidak memengaruhi gerak atau collision. */
export class RohTiko {
  private sprite: Phaser.GameObjects.Image;
  private cahaya: Phaser.GameObjects.Image;
  private jejak?: Phaser.GameObjects.Particles.ParticleEmitter;
  private suasana: Suasana = 'putar';
  private sudut = Math.PI / 2;
  private kedipSampai = 0;
  private kedipBerikut = 2500;
  private x: number;
  private y: number;
  private readonly tenang = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  constructor(
    scene: Phaser.Scene,
    private pemain: () => Titik | undefined,
  ) {
    pasangTekstur(scene);
    const awal = pemain() ?? { x: 0, y: 0 };
    this.x = awal.x;
    this.y = awal.y - ORBIT.naik;
    this.cahaya = scene.add.image(this.x, this.y, KUNCI.cahaya).setBlendMode(Phaser.BlendModes.ADD);
    this.sprite = scene.add.image(this.x, this.y, KUNCI.buka);
    if (!this.tenang) {
      this.jejak = scene.add.particles(0, 0, KUNCI.kilau, {
        follow: this.sprite,
        lifespan: 650,
        frequency: 160,
        speed: { min: 2, max: 7 },
        alpha: { start: 0.9, end: 0 },
        quantity: 1,
        blendMode: Phaser.BlendModes.ADD,
      });
      this.jejak.setDepth(KEDALAMAN_PEMAIN - 0.5);
    }
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.perbarui, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.perbarui, this));
  }

  atur(s: Suasana): void {
    this.suasana = s;
  }

  private perbarui(waktu: number, dtMs: number): void {
    const p = this.pemain();
    if (!p) return;
    const dt = Math.min(dtMs, 50);
    const lambat = this.tenang ? 3 : 1;
    let tujuan: Titik;
    let depan: boolean;
    if (this.suasana === 'bicara') {
      // Berhenti di samping kepala pemain, menghadap ke arah pemain.
      const goyang = this.tenang ? 0 : Math.sin(waktu / 220) * 1.2;
      tujuan = { x: p.x + 12, y: p.y - 15 + goyang };
      depan = true;
      this.sprite.setFlipX(true);
    } else {
      this.sudut += ((Math.PI * 2) / (PUTARAN_MS[this.suasana] * lambat)) * dt;
      const ayun = this.tenang ? 0 : Math.sin(waktu / 450) * 1.5;
      tujuan = { x: p.x + Math.cos(this.sudut) * ORBIT.rx, y: p.y - ORBIT.naik + Math.sin(this.sudut) * ORBIT.ry + ayun };
      depan = Math.sin(this.sudut) > 0;
      // Menghadap ke arah geraknya di lintasan.
      this.sprite.setFlipX(Math.sin(this.sudut) > 0);
    }
    // Mengejar titik tujuan dengan halus, jadi Tiko sedikit tertinggal saat pemain berlari, seperti melayang.
    const k = 1 - Math.exp(-dt / 90);
    this.x += (tujuan.x - this.x) * k;
    this.y += (tujuan.y - this.y) * k;
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const kedalaman = depan ? KEDALAMAN_PEMAIN + 0.6 : KEDALAMAN_PEMAIN - 0.4;
    this.sprite.setPosition(x, y).setDepth(kedalaman).setAlpha(depan ? 1 : 0.85);

    const denyut = this.suasana === 'pikir' ? 0.75 + Math.sin(waktu / 120) * 0.25 : 0.85 + Math.sin(waktu / 700) * 0.15;
    this.cahaya.setPosition(x, y).setDepth(kedalaman - 0.05).setAlpha(this.tenang ? 0.9 : denyut);

    // Berkedip setiap beberapa detik.
    if (waktu > this.kedipBerikut) {
      this.kedipSampai = waktu + 140;
      this.kedipBerikut = waktu + 2600 + Math.random() * 2600;
    }
    this.sprite.setTexture(waktu < this.kedipSampai ? KUNCI.kedip : KUNCI.buka);
    if (this.jejak) this.jejak.frequency = this.suasana === 'pikir' ? 70 : 160;
  }
}
