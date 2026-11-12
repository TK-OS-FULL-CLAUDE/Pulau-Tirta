import Phaser from 'phaser';
import {DUNIA} from './world-map';
import type {Facing} from './living-model';
import {minimapView} from './minimap-model';
import {drawMap} from './minimap-render';
import {WorldMapDialog} from './world-map-dialog';

/** A cached raster of actual visible tile layers. No second world camera/render. */
export class WorldMinimap {
 private panel=document.createElement('section');
 private toggle=document.createElement('button');
 private canvas=document.createElement('canvas');
 private cache=document.createElement('canvas');
 private layers:Phaser.Tilemaps.TilemapLayer[];
 private signature='';
 private last=-Infinity;
 private worldMap:WorldMapDialog;
 private observer:ResizeObserver;
 private onKey=(event:KeyboardEvent)=>{
  const focused=document.activeElement;
  if(event.code!=='KeyM'||event.repeat||event.ctrlKey||event.altKey||event.metaKey||this.blocked()&&!this.worldMap.open||focused instanceof HTMLElement&&(focused.matches('input,textarea,select')||focused.isContentEditable))return;
  event.preventDefault();this.expand();
 };
 constructor(private scene:Phaser.Scene,private title:Phaser.GameObjects.Text,private blocked:()=>boolean){
  this.layers=scene.children.list.filter((o):o is Phaser.Tilemaps.TilemapLayer=>o instanceof Phaser.Tilemaps.TilemapLayer).sort((a,b)=>a.depth-b.depth);
  this.cache.width=DUNIA.peta.width*4;this.cache.height=DUNIA.peta.height*4;
  this.canvas.width=200;this.canvas.height=150;
  this.worldMap=new WorldMapDialog(this.cache,()=>scene.input.keyboard?.resetKeys());
  this.panel.className='world-minimap';this.panel.setAttribute('aria-label','Peta sekitar pemain');
  this.canvas.id='world-minimap-view';this.canvas.setAttribute('role','img');this.canvas.setAttribute('aria-label','Peta sekitar pemain, utara di atas. Panah menunjukkan posisi dan arah pemain.');
  this.toggle.type='button';this.toggle.className='world-minimap-toggle';this.toggle.textContent='Peta Pulau ↗';this.toggle.setAttribute('aria-label','Buka peta besar (M)');this.toggle.setAttribute('aria-haspopup','dialog');
  this.toggle.addEventListener('click',()=>this.expand());
  this.canvas.tabIndex=0;this.canvas.setAttribute('role','button');this.canvas.setAttribute('aria-label','Buka peta besar Pulau Tirta');this.canvas.setAttribute('aria-haspopup','dialog');
  this.canvas.addEventListener('click',()=>this.expand());
  this.canvas.addEventListener('keydown',e=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();e.stopPropagation();this.expand();}});
  this.panel.append(this.toggle,this.canvas);scene.game.canvas.parentElement!.append(this.panel);
  window.addEventListener('keydown',this.onKey);
  this.observer=new ResizeObserver(()=>this.layout());this.observer.observe(scene.game.canvas);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.observer.disconnect();window.removeEventListener('keydown',this.onKey);this.worldMap.destroy();this.panel.remove();this.cache.width=0;});
  this.layout();
 }
 private expand(){if(this.worldMap.open)this.worldMap.close();else if(!this.blocked())this.worldMap.show();this.last=-Infinity;}
 private layout(){
  const canvas=this.scene.game.canvas,rect=canvas.getBoundingClientRect(),parent=canvas.parentElement!.getBoundingClientRect(),camera=this.scene.cameras.main;
  const sx=rect.width/camera.width,sy=rect.height/camera.height;
  // Fixed World text has scrollFactor 0, but still receives the camera zoom.
  const left=camera.x+camera.width/2+(this.title.x-camera.width/2)*camera.zoom;
  const bottom=camera.y+camera.height/2+(this.title.y+this.title.height-camera.height/2)*camera.zoom;
  this.panel.style.left=`${Math.round(rect.left-parent.left+left*sx)}px`;
  this.panel.style.top=`${Math.round(rect.top-parent.top+bottom*sy+8)}px`;
  this.panel.style.visibility=rect.width&&rect.height&&!this.blocked()?'visible':'hidden';
 }
 private rebuild(){
  const ctx=this.cache.getContext('2d')!;ctx.imageSmoothingEnabled=false;ctx.fillStyle='#377e94';ctx.fillRect(0,0,this.cache.width,this.cache.height);
  const sets=DUNIA.peta.tilesets.map(set=>({set,image:this.scene.textures.get(set.name).getSourceImage() as HTMLImageElement}));
  for(const layer of this.layers){
   if(!layer.visible)continue;
   // Use authored opacity: the minimap changes immediately when a recovery fade
   // becomes visible, rather than caching the first transparent animation frame.
   ctx.globalAlpha=layer.layer.alpha;
   for(const row of layer.layer.data)for(const tile of row){
    if(!tile||tile.index<=0)continue;
    const asset=sets.find(({set})=>tile.index>=set.firstgid&&tile.index<set.firstgid+set.tilecount);if(!asset)continue;
    const {set,image}=asset,id=tile.index-set.firstgid,margin=set.margin??0,spacing=set.spacing??0;
    const x=margin+id%set.columns*(set.tilewidth+spacing),y=margin+Math.floor(id/set.columns)*(set.tileheight+spacing);
    ctx.save();ctx.translate(tile.x*4+2,tile.y*4+2);ctx.rotate(tile.rotation);ctx.scale(tile.flipX?-1:1,tile.flipY?-1:1);
    ctx.drawImage(image,x,y,set.tilewidth,set.tileheight,-2,-2,4,4);ctx.restore();
   }
  }
  ctx.globalAlpha=1;
 }
 update(time:number,player:{x:number;y:number},facing:Facing){
  if(time-this.last<100)return;this.last=time;this.layout();if(this.blocked()&&!this.worldMap.open)return;
  const signature=this.layers.map(l=>Number(l.visible)).join('');
  if(signature!==this.signature){this.rebuild();this.signature=signature;}
  drawMap(this.canvas,this.cache,minimapView(player.x,player.y,DUNIA.lebar,DUNIA.tinggi),player,facing);
  this.worldMap.update(player,facing);
 }
}
