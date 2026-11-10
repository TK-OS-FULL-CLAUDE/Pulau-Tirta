import {describe,it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import baseline from '../world/mountain-v36-r1-baseline.json';
import design from '../world/mountain-v36-r1.json';
import forest from '../world/forest-v38-r4.json';
import {bacaPeta,bisaBerdiri,interaksiTerdekat,kedalamanLayer,langkahGerak,misiPemulihan,properti,type PetaTiled,type ObjekTiled} from '../src/game/map-data';
import {NPC_PLANS,validateNpcPlan} from '../src/game/living-model';
const old=JSON.parse(readFileSync('public/maps/pulau-tirta-v38-r4.json','utf8')) as PetaTiled;
const raw=JSON.parse(readFileSync('public/maps/pulau-tirta-v36-r1.json','utf8')) as PetaTiled;
// R1 stays frozen as an archive; active world selection belongs to the current revision.
const PETA_RUNTIME=raw,DUNIA=bacaPeta(raw);
const previous=bacaPeta(old),L=(m:PetaTiled,n:string)=>m.layers.find(l=>l.name===n)!;
const regions=L(old,'Regions').objects!,mountain=regions.find(r=>r.name==='Puncak Kabut')!,others=regions.filter(r=>r!==mountain);
const contains=(r:ObjekTiled,x:number,y:number)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x:number,y:number)=>contains(mountain,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8));
describe('Puncak V3.6-R1 visual elevation over the complete R4 world',()=>{
 it('preserves every earlier source, team system and original asset while activating the combined world',()=>{
  for(const[file,hash]of Object.entries(baseline.hashes))expect(createHash('sha256').update(readFileSync(file)).digest('hex'),file).toBe(hash);
  expect(PETA_RUNTIME).toEqual(raw);expect(properti(raw,'worldVersion')).toBe('3.6-R1-Elevation');
  expect([raw.width,raw.height,raw.tilewidth,raw.tileheight]).toEqual([192,144,16,16]);expect(raw.tilesets.slice(0,old.tilesets.length)).toEqual(old.tilesets);
 });
 it('changes only Puncak pixels and no old layer metadata, object, recovery state, fog or other region',()=>{
  for(const l of old.layers){const n=L(raw,l.name);if(!l.data){expect(n,l.name).toEqual(l);continue;}
   const{data:_,...meta}=l,{data:__,...next}=n;expect(next,l.name).toEqual(meta);
   for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data![i])expect(allowed(i%192,Math.floor(i/192)),l.name+':'+i).toBe(true);
   if(!['Environment_V32','Objects','Paths','Mountain_V36_Detail'].includes(l.name))expect(n,l.name).toEqual(l);
  }
  const added=raw.layers.filter(l=>!old.layers.some(o=>o.name===l.name));expect(added.map(l=>l.name)).toEqual(['Mountain_V36R1_Rim','Mountain_V36R1_Shadow']);
  for(const l of added)for(let i=0;i<l.data!.length;i++)if(l.data![i])expect(allowed(i%192,Math.floor(i/192)),l.name+':'+i).toBe(true);
  for(const l of raw.layers.filter(l=>l.name.startsWith('Recovery_')||l.name.startsWith('Celebration_')||l.name==='Mountain_Mist_V32'||l.name==='Water'))expect(l).toEqual(L(old,l.name));
 });
 it('keeps every collider and solid cell unchanged, including both recovery states and the R4 river crossing',()=>{
  expect(DUNIA.solid).toEqual(previous.solid);expect(DUNIA.penghalang).toEqual(previous.penghalang);expect(DUNIA.interaksi).toEqual(previous.interaksi);expect(DUNIA.spawn).toEqual(previous.spawn);
  expect(L(raw,'Paths').data!.map(Boolean)).toEqual(L(old,'Paths').data!.map(Boolean));expect(L(raw,'Forest_Bridge_Water_Visual')).toEqual(L(old,'Forest_Bridge_Water_Visual'));
  const recovered=structuredClone(raw);for(const l of recovered.layers)if(misiPemulihan(l))l.visible=true;expect(bacaPeta(recovered).solid).toEqual(DUNIA.solid);expect(bacaPeta(recovered).penghalang).toEqual(DUNIA.penghalang);
  expect(DUNIA.interaksi.find(p=>p.id==='puncak')).toMatchObject({misiId:'misi-2',x:968,y:696,radius:36});
 });
 it('confines tall shaded faces to original cliff footprints and keeps rims clear of paths and players',()=>{
  expect(design.terraces.map(t=>t.cells).every(n=>n>300)).toBe(true);expect(design.cliffColumns.length).toBeGreaterThanOrEqual(30);
  const changed=new Set(design.cliffColumns.flatMap(c=>[c.y*192+c.x,(c.y+1)*192+c.x]));
  for(let i=0;i<L(old,'Objects').data!.length;i++)if(L(raw,'Objects').data![i]!==L(old,'Objects').data![i])expect(changed.has(i),`new wall at ${i}`).toBe(true);
  for(const c of design.cliffColumns){const body=DUNIA.penghalang.find(o=>o.name===c.collider)!;expect(body).toBeDefined();expect([Math.floor(body.x/16),Math.floor(body.y/16)]).toEqual([c.x,c.y]);expect(c.height).toBe(2);expect(bisaBerdiri(DUNIA,body.x+body.width/2,body.y+body.height/2)).toBe(false);expect(L(raw,'Objects').data![c.y*192+c.x]).toBe(4755+c.frame);expect(L(raw,'Objects').data![(c.y+1)*192+c.x]).toBe(4755+c.frame+32);}
  const feet=design.cliffColumns.filter(c=>c.tier===0),summit=design.cliffColumns.filter(c=>c.tier===2);expect(Math.min(...feet.map(c=>c.capPixels))).toBeGreaterThan(Math.max(...summit.map(c=>c.capPixels)));
  for(const[x,y]of design.rimCells){expect(L(raw,'Paths').data![y*192+x]).toBe(0);expect(L(raw,'AbovePlayer').data![y*192+x]).toBe(0);}
  expect(kedalamanLayer(L(raw,'Mountain_V36R1_Shadow'))).toBeLessThan(kedalamanLayer(L(raw,'Objects')));expect(kedalamanLayer(L(raw,'Mountain_V36R1_Rim'))).toBeLessThan(20);
 });
 it('keeps the observation station, open deck, windsock, trees and original living markers intact',()=>{
  for(const[x,y]of design.protectedLivingAnchors)expect(L(raw,'Objects').data![y*192+x]).toBe(L(old,'Objects').data![y*192+x]);
  for(let y=38;y<=40;y++)for(let x=60;x<=61;x++)for(const n of['Objects','AbovePlayer'])expect(L(raw,n).data![y*192+x]).toBe(L(old,n).data![y*192+x]);
  for(let y=37;y<=41;y++)for(let x=55;x<=61;x++)expect(L(raw,'Mountain_V36_Detail').data![y*192+x]).toBe(L(old,'Mountain_V36_Detail').data![y*192+x]);
  for(let y=39;y<=40;y++)for(let x=57;x<=58;x++)expect(L(raw,'Objects').data![y*192+x]).toBe(L(old,'Objects').data![y*192+x]);
  expect(design.summitCrown.length).toBeGreaterThan(100);expect(design.finalSteps).toHaveLength(3);expect(design.stairs).toHaveLength(2);
  for(const s of design.stairs){expect(s.cells).toHaveLength(9);for(const[x,y]of s.cells)expect(L(old,'Paths').data![y*192+x]).not.toBe(0);}
 });
 it('walks both stairs to condensation, all missions and the protected forest hut and bridge',()=>{
  const q=[[Math.floor(DUNIA.spawn.x/16),Math.floor(DUNIA.spawn.y/16)]],seen=new Set([q[0].join(',')]);
  for(let i=0;i<q.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const[x,y]=q[i],nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(seen.has(k)||!bisaBerdiri(DUNIA,nx*16+8,ny*16+8))continue;let p={x:x*16+8,y:y*16+8};for(let n=0;n<8;n++)p=langkahGerak(DUNIA,p,dx,dy,2000/86);if(Math.hypot(p.x-(nx*16+8),p.y-(ny*16+8))>.001)continue;seen.add(k);q.push([nx,ny]);}
  expect([...design.validationTargets,...forest.validationTargets,...design.finalSteps].filter(p=>!seen.has(p.join(',')))).toEqual([]);
  for(const p of DUNIA.interaksi)expect(q.some(([x,y])=>interaksiTerdekat(DUNIA,x*16+8,y*16+8)?.id===p.id),p.id).toBe(true);expect(bisaBerdiri(DUNIA,968,696)).toBe(true);
  for(const p of NPC_PLANS)expect(validateNpcPlan(DUNIA,p)).toBe(true);
 });
 it('resolves the nonphysical 16px local atlas and reproduces editor map and assets without rewriting',()=>{
  const s=raw.tilesets.at(-1)!;expect(s.name).toBe('mountain_v36_r1');expect(s.tiles).toEqual([]);expect([s.columns,s.tilecount,s.tilewidth,s.tileheight]).toEqual([32,512,16,16]);
  for(const set of raw.tilesets)expect(existsSync(resolve('public/maps',set.image)),set.image).toBe(true);
  expect(readFileSync('world/assets/mountain_v36_r1/tileset.svg','utf8')).toBe(readFileSync('public/assets/world/mountain_v36_r1/tileset.svg','utf8'));
  expect(()=>execFileSync(process.execPath,['scripts/polish-puncak-v36-r1.mjs','--check'],{encoding:'utf8'})).not.toThrow();
 });
});
