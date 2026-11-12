import {describe,it,expect} from 'vitest';
import {minimapView,worldMapView} from '../src/game/minimap-model';
import {DUNIA} from '../src/game/world-map';
describe('Read-only minimap coordinates',()=>{
 it('shows the entire island initially and clamps zoom/pan at every scale',()=>{
  expect(worldMapView(0,0,1,DUNIA.lebar,DUNIA.tinggi)).toEqual({left:0,top:0,width:DUNIA.lebar,height:DUNIA.tinggi});
  for(const zoom of [.1,1,2,6,100])for(const x of [-99999,0,1500,99999])for(const y of [-99999,0,1000,99999]){
   const v=worldMapView(x,y,zoom,DUNIA.lebar,DUNIA.tinggi);
   expect(v.width).toBeGreaterThanOrEqual(DUNIA.lebar/6);expect(v.width).toBeLessThanOrEqual(DUNIA.lebar);
   expect(v.left).toBeGreaterThanOrEqual(0);expect(v.top).toBeGreaterThanOrEqual(0);
   expect(v.left+v.width).toBeLessThanOrEqual(DUNIA.lebar);expect(v.top+v.height).toBeLessThanOrEqual(DUNIA.tinggi);
   const px=(DUNIA.spawn.x-v.left)/v.width;
   expect(v.left+px*v.width).toBeCloseTo(DUNIA.spawn.x);
  }
 });
 it('centres the player away from world boundaries and preserves north-up axes',()=>{
  const v=minimapView(1500,1100,DUNIA.lebar,DUNIA.tinggi);
  expect(v.playerX).toBe(.5);expect(v.playerY).toBe(.5);
  expect(minimapView(1516,1100,DUNIA.lebar,DUNIA.tinggi).left-v.left).toBe(16);
  expect(minimapView(1500,1116,DUNIA.lebar,DUNIA.tinggi).top-v.top).toBe(16);
 });
 it('clamps the cached crop at all edges without moving the marker off its real position',()=>{
  for(const x of [0,8,DUNIA.lebar-8,DUNIA.lebar])for(const y of [0,8,DUNIA.tinggi-8,DUNIA.tinggi]){
   const v=minimapView(x,y,DUNIA.lebar,DUNIA.tinggi);
   expect(v.left).toBeGreaterThanOrEqual(0);expect(v.top).toBeGreaterThanOrEqual(0);
   expect(v.left+v.width).toBeLessThanOrEqual(DUNIA.lebar);expect(v.top+v.height).toBeLessThanOrEqual(DUNIA.tinggi);
   expect(v.left+v.playerX*v.width).toBeCloseTo(x);expect(v.top+v.playerY*v.height).toBeCloseTo(y);
  }
 });
 it('handles worlds smaller than the minimap viewport',()=>{
  expect(minimapView(50,40,100,80)).toEqual({left:0,top:0,width:100,height:80,playerX:.5,playerY:.5});
 });
});
