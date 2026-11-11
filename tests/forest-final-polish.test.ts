import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import active from '../public/maps/pulau-tirta-forest-final.json';
import previous from '../public/maps/pulau-tirta-v36-r3.json';
import plan from '../world/forest-final-polish.json';
import forestR4 from '../world/forest-v38-r4.json';
import {DUNIA,PETA_RUNTIME} from '../src/game/world-map';
import {bacaPeta,bisaBerdiri,langkahGerak,type PetaTiled} from '../src/game/map-data';
const a=active as PetaTiled,b=previous as PetaTiled,W=192,L=(m:PetaTiled,n:string)=>m.layers.find(l=>l.name===n)!;
const regions=L(b,'Regions').objects!,forest=regions.find(r=>r.name==='Hutan & Sungai')!;
const owned=(x:number,y:number)=>{const px=x*16+8,py=y*16+8;return px>=forest.x&&px<forest.x+forest.width&&py>=forest.y&&py<forest.y+forest.height&&!regions.some(r=>r!==forest&&px>=r.x&&px<r.x+r.width&&py>=r.y&&py<r.y+r.height)};
describe('Final forest bridge and trail on the active integrated world',()=>{
 it('preserves every tile and object outside Hutan and keeps all interaction metadata',()=>{
  expect(PETA_RUNTIME).toEqual(a);expect([a.width,a.height]).toEqual([192,144]);
  for(const old of b.layers){const now=L(a,old.name);if(old.name==='Collisions'){
   const removed=new Set(plan.bridge.removedRails);const kept=old.objects!.filter(o=>!removed.has(o.name));
   expect(now.objects!.slice(0,kept.length)).toEqual(kept);
   for(const o of now.objects!.slice(kept.length))expect(owned(Math.floor(o.x/16),Math.floor(o.y/16))).toBe(true);
   continue;
  }if(!old.data){expect(now).toEqual(old);continue;}
   for(let i=0;i<old.data.length;i++)if(old.data[i]!==now.data![i])expect(owned(i%W,Math.floor(i/W)),`${old.name}:${i}`).toBe(true);
  }
  expect(L(a,'Interactions')).toEqual(L(b,'Interactions'));
  expect(L(a,'Water')).toEqual(L(b,'Water'));
  expect(L(a,'Solid')).toEqual(L(b,'Solid'));
 });
 it('keeps one three-column deck and removes every visible dry rail with its local collider',()=>{
  for(let y=105;y<=107;y++)for(let x=153;x<=155;x++){
   expect(L(a,'Water').data![y*W+x]).toBeGreaterThan(0);
   expect([601,602]).toContain(L(a,'Paths').data![y*W+x]);
   expect(bisaBerdiri(DUNIA,x*16+8,y*16+8)).toBe(true);
  }
  for(let x=156;x<=163;x++)for(const y of [104,108]){
   expect(L(a,'Objects').data![y*W+x]).toBe(0);
   expect(L(a,'Collisions').objects!.some(o=>o.name===`bridge_rail_${y===104?'n':'s'}_${x}`)).toBe(false);
  }
  for(let y=101;y<=110;y++)for(let x=153;x<=155;x++)expect(L(a,'Water').data![y*W+x]).toBe(L(b,'Water').data![y*W+x]);
 });
 it('limits the measured main cream corridor to two tiles with only bank exceptions',()=>{
  const ground=L(a,'Ground').data!,path=L(a,'Paths').data!;
  for(const c of plan.trail.corridorColumns){
   const rows=[];for(let y=99;y<=107;y++)if(path[y*W+c.x]&&!L(a,'Water').data![y*W+c.x]&&![601,602].includes(path[y*W+c.x]))rows.push(y);
   expect(rows.length,`column ${c.x}`).toBe(c.after);
   if(c.x<152||c.x>158)expect(rows.length,`normal column ${c.x}`).toBe(2);
  }
  expect(plan.trail.corridorColumns.filter(c=>c.after===2).length).toBeGreaterThan(30);
  for(const [x,y] of plan.trail.trimmed){expect(path[y*W+x]).toBe(0);expect([133,134]).toContain(ground[y*W+x]);}
  expect(plan.trail.trimmed.length).toBeGreaterThan(60);
  const visual=(m:PetaTiled,x:number,y:number)=>{const i=y*W+x;return !!(L(m,'Paths').data![i]||L(m,'TerrainDetails').data![i]===599||L(m,'Environment_V32').data![i]===758)};
  for(const x of [122,123,124,126,128,130,132,134,136,138,140,142,144,146,148,150]){
   let before=0,after=0;for(let y=97;y<=107;y++){before+=Number(visual(b,x,y));after+=Number(visual(a,x,y));}
   expect(before,`old visual width ${x}`).toBeGreaterThan(2);
   expect(after,`new visual width ${x}`).toBe(2);
  }
  for(const [x,y] of plan.trail.clearedTerrain)if(!path[y*W+x]){
   expect(L(a,'TerrainDetails').data![y*W+x]).not.toBe(599);
   expect(L(a,'Environment_V32').data![y*W+x]).not.toBe(758);
  }
 });
 it('keeps the hut, infiltration mission, both banks and all other missions reachable',()=>{
  const q:[[number,number]]=[[Math.floor(DUNIA.spawn.x/16),Math.floor(DUNIA.spawn.y/16)]];const seen=new Set(q.map(p=>p.join(',')));
  for(let k=0;k<q.length;k++)for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
   const[x,y]=q[k],nx=x+dx,ny=y+dy,key=`${nx},${ny}`;
   if(seen.has(key)||!bisaBerdiri(DUNIA,nx*16+8,ny*16+8))continue;
   let p={x:x*16+8,y:y*16+8};for(let n=0;n<8;n++)p=langkahGerak(DUNIA,p,dx,dy,2000/86);
   if(Math.hypot(p.x-(nx*16+8),p.y-(ny*16+8))>.001)continue;
   seen.add(key);q.push([nx,ny]);
  }
  for(const [x,y] of [...forestR4.validationTargets,[152,106],[154,106],[156,106],[164,106],[139,110],[141,106],[49,55],[65,47]])expect(seen.has(`${x},${y}`),`${x},${y}`).toBe(true);
  for(const [x,y] of [[154,102],[154,110],[155,103]])expect(bisaBerdiri(DUNIA,x*16+8,y*16+8),`unbridged river ${x},${y}`).toBe(false);
  for(const p of DUNIA.interaksi)expect(q.some(([x,y])=>Math.hypot(x*16+8-p.x,y*16+8-p.y)<=p.radius),p.id).toBe(true);
  const prev=bacaPeta(b);expect(DUNIA.interaksi).toEqual(prev.interaksi);expect(DUNIA.solid).toEqual(prev.solid);
  for(const t of plan.trees){const root=L(a,'Collisions').objects!.find(o=>o.name===t.body)!;
   expect([root.width,root.height]).toEqual([6,7]);expect(bisaBerdiri(DUNIA,t.x*16+8,t.y*16+11)).toBe(false);
   expect(L(a,'Paths').data![t.y*W+t.x]).toBe(0);
   if(t.kind!=='sapling')expect(L(a,'AbovePlayer').data![(t.y-1)*W+t.x]).toBe(137);
  }
  let land=0,vegetated=0;
  for(let y=98;y<=115;y++)for(let x=128;x<=153;x++){
   const i=y*W+x;if(L(a,'Paths').data![i]||L(a,'Water').data![i]||Math.hypot(x-141,y-106)<4||x>=137&&x<=141&&y>=107&&y<=110)continue;
   land++;
   if(L(a,'AbovePlayer').data![i]||[138,148,149,160,161,292,305,306].includes(L(a,'Objects').data![i]))vegetated++;
  }
  expect(vegetated/land).toBeGreaterThanOrEqual(.65);
  expect(vegetated/land).toBeLessThanOrEqual(.8);
 });
 it('rebuilds the editor map and export deterministically',()=>{
  expect(()=>execFileSync(process.execPath,['scripts/final-hutan-v38.mjs','--check'])).not.toThrow();
  expect(readFileSync('public/maps/pulau-tirta-forest-final.json').length).toBeGreaterThan(0);
 });
});
