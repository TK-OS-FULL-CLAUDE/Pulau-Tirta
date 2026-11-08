import Phaser from 'phaser';
import buildings from '../../world/buildings-v34-a1.json';
import { properti, type DataDunia } from './map-data';
import { actorPose, LIVING, makeNpc, NPC_PLANS, tickNpc, validateNpcPlan, type Feet } from './living-model';

/** Bounded runtime overlays over the unchanged V3.2 terrain. No AI, timers or physics bodies. */
export class LivingWorld {
  readonly npcs: { plan: typeof NPC_PLANS[number]; state: ReturnType<typeof makeNpc>; image: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Ellipse }[] = [];
  readonly fog: Phaser.GameObjects.Image[] = [];
  readonly water: Phaser.GameObjects.Image[] = [];
  readonly plants: { image: Phaser.GameObjects.Image; x: number; y: number; gid: number; alternates: { mission?: string; festival: boolean; gid: number }[] }[] = [];
  readonly wind: Phaser.GameObjects.Image;
  readonly stats = { activeNpcs: 0, activeFog: 0, activeWater: 0, activePlants: 0, effectTicks: 0 };
  private lastEffects = -Infinity;
  private waterCells = new Set<number>();
  private frameFor(gid: number) {
    const set = this.world.peta.tilesets.find(s => gid >= s.firstgid && gid < s.firstgid + s.tilecount)!;
    const id = gid - set.firstgid, name = `living-${id}`;
    const tex = this.scene.textures.get(set.name);
    if (!tex.has(name)) tex.add(name, 0, id % set.columns * 16, Math.floor(id / set.columns) * 16, 16, 16);
    return { key: set.name, frame: name };
  }
  constructor(private scene: Phaser.Scene, private world: DataDunia, map: Phaser.Tilemaps.Tilemap,
    private completed: (mission: string) => boolean, private festival: () => boolean) {
    const objects = map.getLayer('Objects')!.tilemapLayer;
    // Replace only explicitly decorative NPC markers. Never remove a functional NPC.
    const markers = world.peta.layers.find(l => l.name === 'NPCSpawns')?.objects ?? [];
    for (const marker of markers) {
      if (properti(marker, 'decorative') !== true) continue;
      const plan = NPC_PLANS.find(p => p.id === marker.name);
      if (!plan || this.npcs.length >= LIVING.npcLimit || !validateNpcPlan(world, plan)) continue;
      const x = Math.floor(marker.x / 16), y = Math.floor(marker.y / 16);
      if ([121, 122].includes(objects.getTileAt(x, y)?.index ?? 0)) {
        const b = buildings.find(b => x >= b.x && x < b.x + b.width && y >= b.y + 2 && y < b.y + 4);
        if (b) objects.putTileAt(133 + (b.coolWall ? [76, 77, 79] : [72, 73, 75])[x === b.x ? 0 : x === b.x + b.width - 1 ? 2 : 1], x, y);
        else objects.removeTileAt(x, y);
      }
      const state = makeNpc(plan);
      const shadow = scene.add.ellipse(state.x, state.y + 2, 8, 3, 0x253d35, 0.24).setDepth(18);
      const image = scene.add.sprite(state.x, state.y, world.pemainTileset, plan.frame).setOrigin(0.5, 0.75).setDepth(19);
      this.npcs.push({ plan, state, image, shadow });
    }
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xd3f1e9, 0.8); g.fillRect(0, 0, 5, 1); g.fillRect(8, 2, 4, 1); g.generateTexture('living-ripple', 12, 3); g.clear();
    g.fillStyle(0xe3eddb, 0.15); g.fillRect(3, 4, 56, 4); g.fillRect(12, 2, 38, 2); g.fillStyle(0xe3eddb, 0.07); g.fillRect(0, 8, 64, 3); g.generateTexture('living-fog', 64, 12); g.destroy();
    for (let i = 0; i < LIVING.waterCount; i++) this.water.push(scene.add.image(0, 0, 'living-ripple').setDepth(15).setVisible(false));
    for (const [x, y] of [[31, 36], [45, 29], [69, 30], [30, 50], [57, 34]].slice(0, LIVING.fogCount)) this.fog.push(scene.add.image(x * 16, y * 16, 'living-fog').setOrigin(0).setDepth(18).setData({ baseX: x * 16, baseY: y * 16 }));
    map.getLayer('Mountain_Mist_V32')?.tilemapLayer.setVisible(false);
    const water = world.peta.layers.find(l => l.name === 'Water')!.data!, paths = world.peta.layers.find(l => l.name === 'Paths')!.data!;
    for (let y = 1; y < world.peta.height - 1; y++) for (let x = 1; x < world.peta.width - 1; x++) {
      const i = y * world.peta.width + x;
      if ([i, i - 1, i + 1, i - world.peta.width, i + world.peta.width].every(n => water[n] > 0) && !paths[i]) this.waterCells.add(i);
    }
    // Pool has two reserved basin ripples; remaining slots sample only open water near camera.
    for (const [x, y] of [[35,51],[47,44],[69,40],[33,110],[55,115],[92,87],[90,82],[105,75],[135,47],[152,43],[138,104],[144,114]].slice(0, LIVING.plantCount)) {
      const tile = objects.getTileAt(x, y); if (!tile || ![765, 766, 767, 785, 305, 306].includes(tile.index)) continue;
      const gid = tile.index, f = this.frameFor(gid), alternates: typeof this.plants[number]['alternates'] = [];
      for (const layer of world.peta.layers.filter(l => l.name.startsWith('Recovery_Plants_') || l.name === 'Celebration_Desa_Decor')) {
        const replacement = layer.data?.[y * world.peta.width + x];
        if (!replacement) continue;
        alternates.push({ mission: properti(layer, 'missionId') as string | undefined, festival: properti(layer, 'festival') === true, gid: replacement });
        map.getLayer(layer.name)?.tilemapLayer.removeTileAt(x, y);
      }
      objects.removeTileAt(x, y);
      this.plants.push({ image: scene.add.image(x * 16 + 8, y * 16 + 16, f.key, f.frame).setOrigin(0.5, 1).setDepth(14), x, y, gid, alternates });
    }
    // Two cached whole-prop frames: preserve the pole/base and change only windsock cloth.
    const source = scene.textures.get('tirta_props').getSourceImage() as HTMLImageElement;
    for (let frame = 0; frame < 2; frame++) {
      const tex = scene.textures.createCanvas(`living-wind-${frame}`, 32, 48)!;
      const ctx = tex.getContext(); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(source, 112, 48, 32, 48, 0, 0, 32, 48); ctx.clearRect(10, 4, 21, 11);
      ctx.fillStyle = '#49333b'; ctx.fillRect(10, 5, 17, 8);
      ctx.fillStyle = '#d97059'; ctx.fillRect(11, 6, 14, 6); ctx.fillRect(23, 7 + frame, 5, 3);
      ctx.fillStyle = '#f8efd7'; ctx.fillRect(16, 6, 3, 6); tex.refresh();
    }
    for (let y = 38; y <= 40; y++) for (let x = 60; x <= 61; x++) {
      map.getLayer(y === 40 ? 'Objects' : 'AbovePlayer')!.tilemapLayer.removeTileAt(x, y);
    }
    this.wind = scene.add.image(60 * 16, 38 * 16, 'living-wind-0').setOrigin(0).setDepth(30);
    this.refresh();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const name of ['living-ripple', 'living-fog', 'living-wind-0', 'living-wind-1']) scene.textures.remove(name);
    });
  }
  refresh(): void {
    for (const p of this.plants) {
      const alternate = p.alternates.find(a => a.festival ? this.festival() : a.mission && this.completed(a.mission));
      const f = this.frameFor(alternate?.gid ?? p.gid); p.image.setTexture(f.key, f.frame);
    }
  }
  private near(x: number, y: number): boolean {
    const r = this.scene.cameras.main.worldView, m = LIVING.cameraMargin;
    return x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m;
  }
  update(time: number, dt: number, blocked: boolean, player: Feet): void {
    this.stats.activeNpcs = 0;
    for (const npc of this.npcs) {
      const active = this.near(npc.state.x, npc.state.y);
      npc.image.setVisible(active); npc.shadow.setVisible(active);
      tickNpc(npc.state, npc.plan, this.world, dt, active && !blocked, player);
      if (!active) continue;
      this.stats.activeNpcs++;
      const pose = actorPose(npc.state.distance, time, npc.state.moving, blocked);
      npc.image.setPosition(npc.state.x, npc.state.y + pose.y).setScale(1, pose.scaleY);
      if (npc.state.facing === 'left' || npc.state.facing === 'right') npc.image.setFlipX(npc.state.facing === 'left');
      npc.shadow.setPosition(npc.state.x, npc.state.y + 2);
    }
    if (blocked || time - this.lastEffects < LIVING.effectTickMs) return;
    this.lastEffects = time; this.stats.effectTicks++;
    this.stats.activeFog = this.stats.activeWater = this.stats.activePlants = 0;
    for (let i = 0; i < this.fog.length; i++) {
      const image = this.fog[i], x = image.getData('baseX') + Math.sin(time / 11000 + i) * 10, y = image.getData('baseY');
      const visible = this.near(x, y); image.setVisible(visible);
      if (visible) { image.setPosition(x, y + Math.sin(time / 15000 + i) * 2); this.stats.activeFog++; }
    }
    this.wind.setVisible(this.near(this.wind.x, this.wind.y));
    if (this.wind.visible) this.wind.setTexture(`living-wind-${Math.floor(time / 420) % 2}`);
    for (let i = 0; i < this.plants.length; i++) {
      const p = this.plants[i], visible = this.near(p.x * 16, p.y * 16); p.image.setVisible(visible);
      if (visible) { p.image.x = p.x * 16 + 8 + Math.sin(time / 1400 + i) * 0.4; this.stats.activePlants++; }
    }
    let slot = 0;
    const ripple = (x: number, y: number, river: boolean) => {
      if (slot >= this.water.length || !this.near(x, y)) return;
      const image = this.water[slot++], phase = time / (river && this.completed('misi-4') ? 800 : 1700) + slot;
      image.setPosition(x + Math.sin(phase) * 2, y + (river ? Math.sin(phase * 0.5) * 2 : 0)).setAlpha(0.18 + (Math.sin(phase) + 1) * 0.12).setVisible(true);
      this.stats.activeWater++;
    };
    ripple(52 * 16 + 8, 105 * 16 + 7, false); ripple(63 * 16 + 8, 105 * 16 + 7, false);
    ripple(148 * 16 + 8, 51 * 16 + 8, false); ripple(139 * 16 + 8, 49 * 16 + 8, false); ripple(152 * 16 + 8, 46 * 16 + 8, false);
    const r = this.scene.cameras.main.worldView, w = this.world.peta.width;
    for (let y = Math.max(1, Math.floor(r.top / 32) * 2); y < Math.min(this.world.peta.height - 1, r.bottom / 16 + 1); y += 2) for (let x = Math.max(1, Math.floor(r.left / 32) * 2); x < Math.min(w - 1, r.right / 16 + 1); x += 2) {
      if (this.waterCells.has(y * w + x)) ripple(x * 16 + 8, y * 16 + 8, x >= 150 && x <= 170 && y >= 63 && y <= 130);
    }
    for (; slot < this.water.length; slot++) this.water[slot].setVisible(false);
  }
}
