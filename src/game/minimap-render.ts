import type {Facing} from './living-model';
export interface MapView {left:number;top:number;width:number;height:number}
export interface MapLabel {name:string;x:number;y:number}
/** Both map sizes use the same cached terrain and world-to-canvas transform. */
export function drawMap(canvas:HTMLCanvasElement,cache:HTMLCanvasElement,view:MapView,player:{x:number;y:number},facing:Facing,labels:MapLabel[]=[],density=1){
 const ctx=canvas.getContext('2d')!,w=canvas.width,h=canvas.height;
 const project=(p:{x:number;y:number})=>({x:(p.x-view.left)/view.width*w,y:(p.y-view.top)/view.height*h});
 const marker=project(player);
 ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,w,h);
 ctx.drawImage(cache,view.left/4,view.top/4,view.width/4,view.height/4,0,0,w,h);
 ctx.font=`bold ${14*density}px monospace`;ctx.textAlign='center';
 for(const label of labels){
  const p=project(label),width=ctx.measureText(label.name).width+12*density,height=22*density;
  if(p.x<0||p.y<0||p.x>w||p.y>h||Math.abs(p.x-marker.x)<width/2+10*density&&Math.abs(p.y-marker.y)<height/2+10*density)continue;
  ctx.fillStyle='#382e25de';ctx.fillRect(Math.round(p.x-width/2),Math.round(p.y-height/2),width,height);
  ctx.fillStyle='#fff1ce';ctx.fillText(label.name,p.x,p.y+5*density);
 }
 if(marker.x>=0&&marker.x<=w&&marker.y>=0&&marker.y<=h){
  ctx.save();ctx.translate(Math.round(marker.x),Math.round(marker.y));ctx.scale(density,density);
  ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fillStyle='#fff1cecc';ctx.fill();
  ctx.rotate({up:0,right:Math.PI/2,down:Math.PI,left:-Math.PI/2}[facing]);
  ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(4,4);ctx.lineTo(0,2);ctx.lineTo(-4,4);ctx.closePath();ctx.fillStyle='#f6bc48';ctx.strokeStyle='#493525';ctx.lineWidth=2;ctx.stroke();ctx.fill();ctx.restore();
 }
 ctx.textAlign='left';ctx.font=`bold ${11*density}px monospace`;ctx.fillStyle='#fff1ce';ctx.strokeStyle='#493525';ctx.lineWidth=3*density;ctx.strokeText('N',5*density,13*density);ctx.fillText('N',5*density,13*density);
}
