import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import baseline from '../world/forest-v38-r2-baseline.json';
import design from '../world/forest-v38-r2.json';
import {bacaPeta,bisaBerdiri,interaksiTerdekat,langkahGerak,misiPemulihan,properti,type PetaTiled,type ObjekTiled} from '../src/game/map-data';
import {NPC_PLANS,validateNpcPlan} from '../src/game/living-model';
const old=JSON.parse(readFileSync('public/maps/pulau-tirta-v38-r1.json','utf8')) as PetaTiled;
const raw=JSON.parse(readFileSync('public/maps/pulau-tirta-v38-r2.json','utf8')) as PetaTiled;
// R2 stays tested against its stored export; R3 separately checks the active world.
const DUNIA=bacaPeta(raw);
const previous=bacaPeta(old),L=(m:PetaTiled,n:string)=>m.layers.find(l=>l.name===n)!;
const regions=L(old,'Regions').objects!,forest=regions.find(r=>r.name==='Hutan & Sungai')!,others=regions.filter(r=>r!==forest);
const contains=(r:ObjekTiled,x:number,y:number)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x:number,y:number)=>contains(forest,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8));
describe('Hutan V3.8-R2 native density, water continuity and decorative hut',()=>{
 it('preserves every earlier source/art archive and selects an export using only the original tilesets',()=>{
  for(const[file,hash]of Object.entries(baseline.hashes))expect(createHash('sha256').update(readFileSync(file)).digest('hex'),file).toBe(hash);
  expect(properti(raw,'worldVersion')).toBe('3.8-R2-Forest-Hut');expect([raw.width,raw.height,raw.tilewidth,raw.tileheight]).toEqual([192,144,16,16]);expect(raw.tilesets).toEqual(old.tilesets);
 });
 it('changes no other region, object group, recovery gate or existing layer metadata',()=>{
  for(const l of old.layers){const n=L(raw,l.name);if(!l.data){expect(n,l.name).toEqual(l);continue;}const{data:_,...meta}=l,{data:__,...next}=n;expect(next,l.name).toEqual(meta);
   for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data![i])expect(allowed(i%192,Math.floor(i/192)),l.name+':'+i).toBe(true);
   if(l.name.startsWith('Recovery_')&&!l.name.endsWith('_Hutan_Sungai')||l.name.startsWith('Celebration_')||l.name==='Mountain_V36_Detail')expect(n,l.name).toEqual(l);
  }
  const added=raw.layers.filter(l=>!old.layers.some(b=>b.name===l.name));expect(added.map(l=>l.name)).toEqual(['Forest_Bridge_Water_Visual']);for(let i=0;i<added[0].data!.length;i++)if(added[0].data![i])expect(allowed(i%192,Math.floor(i/192))).toBe(true);
 });
 it('retains all collision, mission IDs, seeds/debris, original bridge boards and railings',()=>{
  expect(DUNIA.solid).toEqual(previous.solid);expect(DUNIA.penghalang).toEqual(previous.penghalang);expect(DUNIA.interaksi).toEqual(previous.interaksi);expect(DUNIA.interaksi.find(i=>i.id==='hutan')).toMatchObject({misiId:'misi-4',x:2264,y:1704,radius:36});
  for(let y=105;y<=107;y++)for(let x=153;x<=163;x++)expect(L(raw,'Paths').data![y*192+x]).toBe(L(old,'Paths').data![y*192+x]);
  for(const o of DUNIA.penghalang.filter(o=>o.name.startsWith('bridge_rail'))){const i=Math.floor(o.y/16)*192+Math.floor(o.x/16);expect(L(raw,'Objects').data![i]).toBe(L(old,'Objects').data![i]);}
  for(const[x,y]of design.protectedCells)for(const n of['Objects','Recovery_Plants_Hutan_Sungai'])expect(L(raw,n).data![y*192+x]).toBe(L(old,n).data![y*192+x]);
  const restored=structuredClone(raw);for(const l of restored.layers)if(misiPemulihan(l)==='misi-4')l.visible=true;expect(bacaPeta(restored).solid).toEqual(DUNIA.solid);
 });
 it('connects native water above/below the bridge using a hidden bed and nonphysical original shoreline pieces',()=>{
  const water=L(raw,'Water').data!,lip=L(raw,'Forest_Bridge_Water_Visual');expect(lip.visible).toBe(true);expect(misiPemulihan(lip)).toBeUndefined();expect(properti(lip,'renderDepth')).toBe(6);
  for(const[x,y]of design.river.underDeck){expect(water[y*192+x]).toBe(434);expect([601,602]).toContain(L(raw,'Paths').data![y*192+x]);expect(bisaBerdiri(DUNIA,x*16+8,y*16+8)).toBe(true);}
  for(const[x,y,g]of design.river.visualLips){expect(lip.data![y*192+x]).toBe(g);const s=raw.tilesets.find(s=>g>=s.firstgid&&g<s.firstgid+s.tilecount)!;expect(s.name).toBe('tiny_battle');expect(properti(s.tiles?.find(t=>t.id===g-s.firstgid)??{},'collides')).not.toBe(true);}
  const q=[[154,102]],seen=new Set(['154,102']);for(let i=0;i<q.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const[x,y]=q[i],nx=x+dx,ny=y+dy,k=nx+','+ny;if(nx<152||nx>156||ny<102||ny>110||seen.has(k)||!water[ny*192+nx]&&!lip.data![ny*192+nx])continue;seen.add(k);q.push([nx,ny]);}expect(seen.has('153,110')).toBe(true);
 });
 it('adds exactly one small native hut with an open approach while reusing the original boulder body',()=>{
  expect([design.hut.x,design.hut.y,design.hut.width,design.hut.height]).toEqual([138,107,2,3]);expect(DUNIA.penghalang.find(o=>o.name===design.hut.reusesCollider)).toEqual(previous.penghalang.find(o=>o.name===design.hut.reusesCollider));
  for(let y=107;y<=108;y++)for(let x=138;x<=139;x++){expect(L(raw,'AbovePlayer').data![y*192+x]).toBeGreaterThan(132);expect(L(old,'Paths').data![y*192+x]).toBe(0);}
  expect(L(raw,'Facades').data![109*192+139]).toBe(218);expect(bisaBerdiri(DUNIA,139*16+8,110*16+8)).toBe(true);expect(L(raw,'Paths').data![110*192+139]).toBe(764);
  for(let i=0;i<L(old,'Paths').data!.length;i++)if(i!==110*192+139)expect(L(raw,'Paths').data![i]).toBe(L(old,'Paths').data![i]);
 });
 it('keeps added trees native sized and off routes while retaining access to the hut, bridge and all missions',()=>{
  for(const t of design.trees){expect([t.width,t.height]).toEqual([1,2]);expect(DUNIA.penghalang.some(o=>o.name===t.reusesCollider)).toBe(true);expect(L(raw,'AbovePlayer').data![(t.y-1)*192+t.x]).toBe(137);expect(L(raw,'Paths').data![t.y*192+t.x]).toBe(0);}
  const q=[[Math.floor(DUNIA.spawn.x/16),Math.floor(DUNIA.spawn.y/16)]],seen=new Set([q[0].join(',')]);for(let i=0;i<q.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const[x,y]=q[i],nx=x+dx,ny=y+dy,k=nx+','+ny;if(seen.has(k)||!bisaBerdiri(DUNIA,nx*16+8,ny*16+8))continue;let p={x:x*16+8,y:y*16+8};for(let n=0;n<8;n++)p=langkahGerak(DUNIA,p,dx,dy,2000/86);if(Math.hypot(p.x-(nx*16+8),p.y-(ny*16+8))>.001)continue;seen.add(k);q.push([nx,ny]);}
  expect(design.validationTargets.filter(p=>!seen.has(p.join(',')))).toEqual([]);for(const p of DUNIA.interaksi)expect(q.some(([x,y])=>interaksiTerdekat(DUNIA,x*16+8,y*16+8)?.id===p.id),p.id).toBe(true);for(const p of NPC_PLANS)expect(validateNpcPlan(DUNIA,p)).toBe(true);
 });
 it('reproduces the editor source and manifest without new image files or rewriting previous work',()=>{
  expect(()=>execFileSync(process.execPath,['scripts/polish-hutan-v38-r2.mjs','--check'],{encoding:'utf8'})).not.toThrow();
 });
});
