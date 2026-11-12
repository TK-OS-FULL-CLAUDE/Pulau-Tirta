import {DUNIA} from './world-map';
import type {Facing} from './living-model';
import {worldMapView} from './minimap-model';
import {drawMap} from './minimap-render';

export class WorldMapDialog {
 readonly dialog=document.createElement('dialog');
 private canvas=document.createElement('canvas');
 private zoom=1;
 private center={x:DUNIA.lebar/2,y:DUNIA.tinggi/2};
 private player={x:0,y:0};
 private facing:Facing='down';
 private drag?:{id:number;x:number;y:number};
 constructor(private cache:HTMLCanvasElement,private resetKeys:()=>void){
  this.dialog.className='world-map-dialog';this.dialog.setAttribute('aria-labelledby','world-map-heading');
  const header=document.createElement('header'),heading=document.createElement('h2'),close=this.button('×','Tutup peta',()=>this.close());
  heading.id='world-map-heading';heading.textContent='Peta Pulau Tirta';header.append(heading,close);
  close.className='world-map-close';
  this.canvas.className='world-map-surface';this.canvas.width=768;this.canvas.height=576;this.canvas.setAttribute('role','img');this.canvas.setAttribute('aria-label','Peta dunia. Lima wilayah dan posisi pemain. Gunakan tombol zoom atau seret peta.');
  const controls=document.createElement('footer');controls.append(this.button('+','Perbesar peta',()=>this.changeZoom(1.25)),this.button('−','Perkecil peta',()=>this.changeZoom(.8)),this.button('Pusat pemain','Pusatkan peta pada pemain',()=>{this.zoom=Math.max(2,this.zoom);this.center={...this.player};this.clamp();this.paint();}),this.button('Seluruh pulau','Tampilkan seluruh pulau',()=>{this.zoom=1;this.clamp();this.paint();}));
  const hint=document.createElement('p');hint.textContent='Seret untuk menggeser · +/− untuk zoom · M/Esc untuk tutup';hint.className='world-map-hint';
  this.dialog.append(header,this.canvas,controls,hint);document.body.append(this.dialog);
  this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});
  this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.changeZoom(e.deltaY<0?1.25:.8);},{passive:false});
  this.canvas.addEventListener('pointerdown',e=>{if(this.drag||e.button!==0)return;this.drag={id:e.pointerId,x:e.clientX,y:e.clientY};this.canvas.setPointerCapture(e.pointerId);});
  this.canvas.addEventListener('pointermove',e=>{
   if(this.drag?.id!==e.pointerId)return;const rect=this.canvas.getBoundingClientRect(),view=worldMapView(this.center.x,this.center.y,this.zoom,DUNIA.lebar,DUNIA.tinggi);
   this.center.x-=(e.clientX-this.drag.x)/rect.width*view.width;this.center.y-=(e.clientY-this.drag.y)/rect.height*view.height;
   this.drag={id:e.pointerId,x:e.clientX,y:e.clientY};this.clamp();this.paint();
  });
  const end=(e:PointerEvent)=>{if(this.drag?.id===e.pointerId)this.drag=undefined;};
  this.canvas.addEventListener('pointerup',end);this.canvas.addEventListener('pointercancel',end);this.canvas.addEventListener('lostpointercapture',end);
 }
 private button(text:string,label:string,action:()=>void){const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',label);b.addEventListener('click',action);return b;}
 get open(){return this.dialog.open;}
 show(){this.zoom=1;this.center={x:DUNIA.lebar/2,y:DUNIA.tinggi/2};this.dialog.showModal();this.resetKeys();this.paint();}
 close(){this.drag=undefined;this.dialog.close();this.resetKeys();if(document.activeElement instanceof HTMLElement)document.activeElement.blur();}
 destroy(){if(this.open)this.close();this.dialog.remove();}
 private clamp(){const v=worldMapView(this.center.x,this.center.y,this.zoom,DUNIA.lebar,DUNIA.tinggi);this.center={x:v.left+v.width/2,y:v.top+v.height/2};}
 private changeZoom(factor:number){this.zoom=Math.max(1,Math.min(6,this.zoom*factor));this.clamp();this.paint();}
 update(player:{x:number;y:number},facing:Facing){this.player={...player};this.facing=facing;if(this.open)this.paint();}
 private paint(){
  if(!this.open)return;const rect=this.canvas.getBoundingClientRect(),density=Math.min(2,window.devicePixelRatio||1);
  const width=Math.max(1,Math.round(rect.width*density)),height=Math.round(width*.75);
  if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
  drawMap(this.canvas,this.cache,worldMapView(this.center.x,this.center.y,this.zoom,DUNIA.lebar,DUNIA.tinggi),this.player,this.facing,
   DUNIA.wilayah.map(r=>({name:r.batas.name,x:r.batas.x+r.batas.width/2,y:r.batas.y+r.batas.height/2})),density);
 }
}
