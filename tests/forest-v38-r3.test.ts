import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import baseline from '../world/forest-v38-r3-baseline.json';
import design from '../world/forest-v38-r3.json';
import {bacaPeta,bisaBerdiri,interaksiTerdekat,langkahGerak,misiPemulihan,properti,type PetaTiled,type ObjekTiled} from '../src/game/map-data';
import {NPC_PLANS,validateNpcPlan} from '../src/game/living-model';
const old=JSON.parse(readFileSync('public/maps/pulau-tirta-v38-r2.json','utf8')) as PetaTiled;
const raw=JSON.parse(readFileSync('public/maps/pulau-tirta-v38-r3.json','utf8')) as PetaTiled;
// R3 is an immutable archive; active-map selection is checked by the current revision's suite.
const PETA_RUNTIME=raw,DUNIA=bacaPeta(raw);
const previous=bacaPeta(old),L=(m:PetaTiled,n:string)=>m.layers.find(l=>l.name===n)!;
const regions=L(old,'Regions').objects!,forest=regions.find(r=>r.name==='Hutan & Sungai')!,others=regions.filter(r=>r!==forest);
const contains=(r:ObjekTiled,x:number,y:number)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x:number,y:number)=>contains(forest,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8));
describe('Hutan R3 native massing with approved local trunk colliders',()=>{
 it('preserves all earlier world and team source, with no new image or tileset',()=>{
  for(const[file,hash]of Object.entries(baseline.hashes))expect(createHash('sha256').update(readFileSync(file)).digest('hex'),file).toBe(hash);
  expect(PETA_RUNTIME).toEqual(raw);expect(properti(raw,'worldVersion')).toBe('3.8-R3-Native-Stands');expect(raw.tilesets).toEqual(old.tilesets);expect([raw.width,raw.height,raw.tilewidth,raw.tileheight]).toEqual([192,144,16,16]);
 });
 it('changes only forest pixels and appends new trunks without editing old objects or layer metadata',()=>{
  expect(raw.layers).toHaveLength(old.layers.length);
  for(const l of old.layers){const n=L(raw,l.name);if(l.name==='Collisions'){expect({...n,objects:n.objects!.slice(0,l.objects!.length)}).toEqual(l);expect(n.objects).toHaveLength(l.objects!.length+design.newTrees.length);continue;}if(!l.data){expect(n,l.name).toEqual(l);continue;}const{data:_,...meta}=l,{data:__,...next}=n;expect(next,l.name).toEqual(meta);
   for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data![i])expect(allowed(i%192,Math.floor(i/192)),l.name+':'+i).toBe(true);
   if(!['Objects','AbovePlayer','Recovery_Plants_Hutan_Sungai','Recovery_Canopy_Hutan_Sungai'].includes(l.name))expect(n,l.name).toEqual(l);
  }
 });
 it('keeps river, bridge, paths, hut, planting areas and mission contract completely intact',()=>{
  for(const n of['Water','Forest_Bridge_Water_Visual','Paths','Ground','Environment_V32','Facades'])expect(L(raw,n)).toEqual(L(old,n));
  for(let y=107;y<=110;y++)for(let x=138;x<=139;x++)for(const n of['Objects','AbovePlayer','Facades','Recovery_Plants_Hutan_Sungai','Recovery_Canopy_Hutan_Sungai'])expect(L(raw,n).data![y*192+x],n).toBe(L(old,n).data![y*192+x]);
  for(const[x,y]of design.protectedCells)for(const n of['Objects','Recovery_Plants_Hutan_Sungai'])expect(L(raw,n).data![y*192+x]).toBe(L(old,n).data![y*192+x]);
  expect(DUNIA.interaksi).toEqual(previous.interaksi);
 });
 it('reuses old bodies for crown upgrades and preserves the complete original collision grid',()=>{
  expect(design.upgrades.length).toBeGreaterThan(50);expect(design.metrics.fullSizeAfter-design.metrics.fullSizeBefore).toBe(design.upgrades.length+design.newTrees.length);
  expect(DUNIA.penghalang.slice(0,previous.penghalang.length)).toEqual(previous.penghalang);expect(DUNIA.penghalang).toHaveLength(previous.penghalang.length+design.newTrees.length);expect(DUNIA.solid).toEqual(previous.solid);
  for(const t of design.upgrades){expect([t.width,t.height]).toEqual([1,2]);expect(DUNIA.penghalang.some(o=>o.name===t.reusesCollider)).toBe(true);expect([136,137]).toContain(L(raw,'AbovePlayer').data![(t.y-1)*192+t.x]);expect(L(raw,'Paths').data![(t.y-1)*192+t.x]).toBe(0);}
  const restored=structuredClone(raw);for(const l of restored.layers)if(misiPemulihan(l)==='misi-4')l.visible=true;expect(bacaPeta(restored).solid).toEqual(DUNIA.solid);
 });
 it('activates clustered trees with only 6x7 trunk bodies, keeping canopies and trail buffers unblocked',()=>{
  expect(design.newTreeCollidersActivated).toBe(true);expect(design.collisionMode).toBe('approved-local-trunks');const planned=design.plannedNewTreeGroups.flatMap(g=>g.positions);expect(planned).toHaveLength(93);expect(design.newTrees.map(t=>[t.x,t.y])).toEqual(planned);expect(design.metrics.interiorIncreasePercent).toBeGreaterThanOrEqual(40);expect(design.metrics.interiorIncreasePercent).toBeLessThanOrEqual(60);
  const added=L(raw,'Collisions').objects!.slice(L(old,'Collisions').objects!.length),ids=(L(raw,'Collisions').objects! as (ObjekTiled & {id:number})[]).map(o=>o.id);expect(new Set(ids).size).toBe(ids.length);
  for(const[x,y]of planned){const b=added.find(o=>o.name===`v38_r3_tree_${x}_${y}`)!;expect(b).toBeDefined();expect([b.x,b.y,b.width,b.height]).toEqual([x*16+5,y*16+8,6,7]);expect(properti(b,'collides')).toBe(true);expect(allowed(x,y)).toBe(true);expect(allowed(x,y-1)).toBe(true);
   expect(bisaBerdiri(previous,x*16+8,y*16+8)).toBe(true);expect(bisaBerdiri(DUNIA,x*16+8,y*16+11)).toBe(false);expect(bisaBerdiri(DUNIA,x*16+8,(y-1)*16+8)).toBe(true);expect(L(raw,'Objects').data![y*192+x]).toBe(149);expect(L(raw,'AbovePlayer').data![(y-1)*192+x]).toBe(137);
   for(let yy=y-1;yy<=y;yy++)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)for(const n of['Paths','Water'])expect(L(raw,n).data![(yy+dy)*192+x+dx],`${n} buffer ${x},${y}`).toBe(0);
  }
 });
 it('retains actual movement access from spawn through the hut, bridge and all mission points',()=>{
  const q=[[Math.floor(DUNIA.spawn.x/16),Math.floor(DUNIA.spawn.y/16)]],seen=new Set([q[0].join(',')]);for(let i=0;i<q.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const[x,y]=q[i],nx=x+dx,ny=y+dy,k=nx+','+ny;if(seen.has(k)||!bisaBerdiri(DUNIA,nx*16+8,ny*16+8))continue;let p={x:x*16+8,y:y*16+8};for(let n=0;n<8;n++)p=langkahGerak(DUNIA,p,dx,dy,2000/86);if(Math.hypot(p.x-(nx*16+8),p.y-(ny*16+8))>.001)continue;seen.add(k);q.push([nx,ny]);}
  expect(design.validationTargets.filter(p=>!seen.has(p.join(',')))).toEqual([]);for(const p of DUNIA.interaksi)expect(q.some(([x,y])=>interaksiTerdekat(DUNIA,x*16+8,y*16+8)?.id===p.id),p.id).toBe(true);for(const p of NPC_PLANS)expect(validateNpcPlan(DUNIA,p)).toBe(true);
  const blockedPaths=L(raw,'Paths').data!.flatMap((g,i)=>g&&allowed(i%192,Math.floor(i/192))&&bisaBerdiri(previous,(i%192)*16+8,Math.floor(i/192)*16+8)&&!seen.has(`${i%192},${Math.floor(i/192)}`)?[i]:[]);expect(blockedPaths).toEqual([]);
 });
 it('reproduces the editor source and stand plan deterministically without rewriting files',()=>{
  expect(()=>execFileSync(process.execPath,['scripts/polish-hutan-v38-r3.mjs','--check'],{encoding:'utf8'})).not.toThrow();
 });
});
