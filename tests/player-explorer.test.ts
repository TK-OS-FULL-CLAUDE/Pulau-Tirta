import {describe,it,expect} from 'vitest';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {explorerFrame,explorerShadow,playerMovementDelta} from '../src/game/player-explorer';
import {langkahGerak,RADIUS_PEMAIN} from '../src/game/map-data';
import {DUNIA} from '../src/game/world-map';
describe('Tirta Explorer visual-only character',()=>{
 it('centres the shallow shadow on the planted shoe pixels in world coordinates',()=>{
  for(const scale of [1,2])for(const origin of [.75,.9]){
   const sprite={x:123.25,y:456.75,width:20,height:20,originX:.5,originY:origin,scaleX:scale,scaleY:scale};
   const foot=explorerShadow(sprite),shoeBottom=sprite.y+(18-origin*20)*scale;
   expect(foot.x).toBe(sprite.x);
   expect(foot.y).toBeCloseTo(shoeBottom-.5*scale);
   // Shadow straddles the shoe baseline rather than merely touching below it.
   expect(foot.y-foot.height/2).toBeLessThan(shoeBottom);
   expect(foot.y+foot.height/2).toBeGreaterThan(shoeBottom);
   expect(foot.height).toBe(2*scale);
  }
 });
 it('keeps direction rows separate and selects four steps by feet distance',()=>{
  for(const [row,facing] of (['down','up','left','right'] as const).entries()){
   expect([0,4,8,12].map(d=>explorerFrame(facing,true,d,0))).toEqual([3,4,5,6].map(f=>row*7+f));
   expect(explorerFrame(facing,false,0,0)).toBe(row*7);
   expect(explorerFrame(facing,false,0,1500)).toBe(row*7+1);
   expect(explorerFrame(facing,false,0,4700)).toBe(row*7+2);
  }
 });
 it('reduces player speed by 15% with unchanged normalized collision movement',()=>{
  const start=DUNIA.spawn;
  const normal=langkahGerak(DUNIA,start,1,0,40),slow=langkahGerak(DUNIA,start,1,0,playerMovementDelta(40));
  const diagonal=langkahGerak(DUNIA,start,1,1,playerMovementDelta(40));
  const distance=(p:{x:number;y:number})=>Math.hypot(p.x-start.x,p.y-start.y);
  expect(distance(normal)).toBeCloseTo(86*.04);
  expect(distance(slow)).toBeCloseTo(73.1*.04);
  expect(distance(diagonal)).toBeCloseTo(distance(slow));
  expect(playerMovementDelta(5000)).toBe(34);expect(playerMovementDelta(-1)).toBe(0);
  expect(RADIUS_PEMAIN).toBe(4.6);
 });
 it('walks both ways on the two-tile forest trail and bridge at the reduced speed',()=>{
  for(const [a,b] of [[[129,101],[130,101]],[[152,106],[156,106]]])for(const reverse of [false,true]){
   const [from,to]=reverse?[b,a]:[a,b];let p={x:from[0]*16+8,y:from[1]*16+8};
   const target={x:to[0]*16+8,y:to[1]*16+8};
   for(let n=0;n<100;n++){
    const remaining=Math.hypot(target.x-p.x,target.y-p.y);if(remaining<.001)break;
    p=langkahGerak(DUNIA,p,target.x-p.x,target.y-p.y,playerMovementDelta(Math.min(16,remaining/73.1*1000)));
   }
   expect(Math.hypot(target.x-p.x,target.y-p.y)).toBeLessThan(.001);
  }
 });
 it('reproduces the sharp PNG with 28 aligned 20px frames and a constant foot baseline',()=>{
  execFileSync(process.execPath,['scripts/player-explorer-art.mjs','--check']);
  const png=readFileSync('public/assets/player/tirta-explorer.png');
  expect([png.readUInt32BE(16),png.readUInt32BE(20)]).toEqual([140,80]);
  const chunks:Buffer[]=[];for(let offset=8;offset<png.length;){const n=png.readUInt32BE(offset);if(png.toString('ascii',offset+4,offset+8)==='IDAT')chunks.push(png.subarray(offset+8,offset+8+n));offset+=n+12;}
  const data=inflateSync(Buffer.concat(chunks)),stride=140*4+1;
  for(let y=0;y<80;y++)for(let x=0;x<140;x++){
   const alpha=data[y*stride+1+x*4+3];expect([0,255]).toContain(alpha);
   if(y%20>=18)expect(alpha).toBe(0);
  }
  for(let row=0;row<4;row++)for(let frame=0;frame<7;frame++){
   expect(Array.from({length:20},(_,x)=>data[(row*20+17)*stride+1+(frame*20+x)*4+3]).some(a=>a===255)).toBe(true);
  }
 });
});
