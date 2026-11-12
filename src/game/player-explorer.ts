import type {Facing} from './living-model';
export const PLAYER_SPEED_FACTOR=0.85;
/** Row 17 is the last opaque shoe row in every 20px frame; use its pixel centre. */
export function explorerShadow(sprite:{x:number;y:number;width:number;height:number;originX:number;originY:number;scaleX:number;scaleY:number}) {
 return {
  x:sprite.x+(sprite.width*.5-sprite.originX*sprite.width)*sprite.scaleX,
  y:sprite.y+(sprite.height*.9-.5-sprite.originY*sprite.height)*sprite.scaleY,
  width:sprite.width*.5*Math.abs(sprite.scaleX),
  height:sprite.height*.1*Math.abs(sprite.scaleY),
 };
}
export function playerMovementDelta(dt:number):number {
 return Number.isFinite(dt)?Math.max(0,Math.min(dt,40))*PLAYER_SPEED_FACTOR:0;
}
/** Frame selection follows existing feet distance; never writes movement/camera state. */
export function explorerFrame(facing:Facing,moving:boolean,distance:number,time:number):number{
 const row={down:0,up:1,left:2,right:3}[facing];
 const frame=moving?3+Math.floor(distance/4)%4:time%4800>4620?2:time%2400>1200?1:0;
 return row*7+frame;
}
