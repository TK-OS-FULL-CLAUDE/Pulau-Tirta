import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import baseline from '../world/forest-v38-r1-baseline.json';
import design from '../world/forest-v38-r1.json';
import {bacaPeta,bisaBerdiri,interaksiTerdekat,langkahGerak,misiPemulihan,properti,type PetaTiled,type ObjekTiled} from '../src/game/map-data';
import {NPC_PLANS,validateNpcPlan} from '../src/game/living-model';
const old=JSON.parse(readFileSync('public/maps/pulau-tirta-v37.json','utf8')) as PetaTiled;
const archived=JSON.parse(readFileSync('public/maps/pulau-tirta-v38.json','utf8')) as PetaTiled;
const raw=JSON.parse(readFileSync('public/maps/pulau-tirta-v38-r1.json','utf8')) as PetaTiled;
// Keep R1 restoration coverage on its archived map; R2 separately checks the active world.
const DUNIA=bacaPeta(raw);
const previous=bacaPeta(old),L=(m:PetaTiled,n:string)=>m.layers.find(l=>l.name===n)!;
const regions=L(old,'Regions').objects!,forest=regions.find(r=>r.name==='Hutan & Sungai')!,others=regions.filter(r=>r!==forest);
const contains=(r:ObjekTiled,x:number,y:number)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x:number,y:number)=>contains(forest,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8));
describe('Hutan V3.8-R1 original-style restoration',()=>{
 it('preserves previous world/team files and archives V3.8 without rewriting its artwork',()=>{
  for(const[file,hash]of Object.entries(baseline.hashes))expect(createHash('sha256').update(readFileSync(file)).digest('hex'),file).toBe(hash);
  expect(properti(raw,'worldVersion')).toBe('3.8-R1-Original-Forest');expect([raw.width,raw.height,raw.tilewidth,raw.tileheight]).toEqual([192,144,16,16]);
 });
 it('restores every original water/path tile and removes the V3.8 atlas from the active map',()=>{
  expect(raw.tilesets).toEqual(old.tilesets);expect(raw.tilesets.some(s=>s.name==='forest_v38')).toBe(false);
  for(const n of['Water','Paths','Environment_V32','TerrainDetails','Recovery_Water_Hutan_Sungai','Recovery_Hutan_Sungai'])expect(L(raw,n),n).toEqual(L(old,n));
  for(const l of raw.layers.filter(l=>l.data))expect(l.data!.some(g=>g>=4755),l.name).toBe(false);
 });
 it('changes no object contract or pixel outside Hutan compared with either earlier version',()=>{
  expect(raw.layers).toHaveLength(old.layers.length);
  for(const base of[old,archived])for(const l of base.layers){const n=L(raw,l.name);if(!l.data){expect(n,l.name).toEqual(l);continue;}const{data:_,...meta}=l,{data:__,...next}=n;expect(next,l.name).toEqual(meta);
   for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data![i])expect(allowed(i%192,Math.floor(i/192)),l.name+':'+i).toBe(true);
   if(l.name.startsWith('Recovery_')&&!l.name.endsWith('_Hutan_Sungai')||l.name.startsWith('Celebration_')||l.name==='Mountain_V36_Detail')expect(n,l.name).toEqual(l);
  }
 });
 it('keeps original small crowns dominant, with only sparse native 16x32 upgrades off the paths',()=>{
  expect(design.trees.length).toBeLessThanOrEqual(8);expect(design.grassTintTiles).toBeLessThan(150);
  const before=L(old,'AbovePlayer').data!,after=L(raw,'AbovePlayer').data!;
  for(let i=0;i<before.length;i++)if(before[i])expect(after[i],String(i)).toBe(before[i]);
  for(const t of design.trees){expect([t.width,t.height]).toEqual([1,2]);expect(after[(t.y-1)*192+t.x]).toBe(137);expect(L(raw,'Objects').data![t.y*192+t.x]).toBe(149);expect(DUNIA.penghalang.some(o=>o.name===t.existingCollider)).toBe(true);
   for(let y=t.y-2;y<=t.y+1;y++)for(let x=t.x-1;x<=t.x+1;x++)expect(L(raw,'Paths').data![y*192+x]).toBe(0);
  }
 });
 it('retains all collision, bridge, seed/debris states and existing misi-4 recovery behaviour',()=>{
  expect(DUNIA.solid).toEqual(previous.solid);expect(DUNIA.penghalang).toEqual(previous.penghalang);expect(DUNIA.interaksi).toEqual(previous.interaksi);expect(DUNIA.interaksi.find(i=>i.id==='hutan')).toMatchObject({misiId:'misi-4',x:2264,y:1704,radius:36});
  for(const[x,y]of[...design.protectedLivingAnchors,...design.protectedSeedlings,...design.protectedDebris])for(const n of['Objects','Recovery_Plants_Hutan_Sungai'])expect(L(raw,n).data![y*192+x]).toBe(L(old,n).data![y*192+x]);
  for(const l of raw.layers.filter(l=>l.name.endsWith('_Hutan_Sungai'))){expect(l.properties).toEqual(L(old,l.name).properties);expect(l.visible).toBe(false);expect(misiPemulihan(l)).toBe('misi-4');}
  for(const o of DUNIA.penghalang.filter(o=>o.name.startsWith('bridge_rail'))){const i=Math.floor(o.y/16)*192+Math.floor(o.x/16);expect(L(raw,'Objects').data![i]).toBe(L(old,'Objects').data![i]);}
  const restored=structuredClone(raw);for(const l of restored.layers)if(misiPemulihan(l)==='misi-4')l.visible=true;expect(bacaPeta(restored).solid).toEqual(DUNIA.solid);
  for(const d of design.details){const i=d.y*192+d.x;expect(L(raw,'Paths').data![i]).toBe(0);expect(L(raw,'Water').data![i]).toBe(0);expect(d.gid).toBeLessThan(4755);}
 });
 it('walks from spawn to mission, both bridge banks and all existing targets using original movement',()=>{
  const q=[[Math.floor(DUNIA.spawn.x/16),Math.floor(DUNIA.spawn.y/16)]],seen=new Set([q[0].join(',')]);
  for(let i=0;i<q.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const[x,y]=q[i],nx=x+dx,ny=y+dy,k=nx+','+ny;if(seen.has(k)||!bisaBerdiri(DUNIA,nx*16+8,ny*16+8))continue;let p={x:x*16+8,y:y*16+8};for(let n=0;n<8;n++)p=langkahGerak(DUNIA,p,dx,dy,2000/86);if(Math.hypot(p.x-(nx*16+8),p.y-(ny*16+8))>.001)continue;seen.add(k);q.push([nx,ny]);}
  expect(design.validationTargets.filter(p=>!seen.has(p.join(',')))).toEqual([]);for(const p of DUNIA.interaksi)expect(q.some(([x,y])=>interaksiTerdekat(DUNIA,x*16+8,y*16+8)?.id===p.id),p.id).toBe(true);for(const p of NPC_PLANS)expect(validateNpcPlan(DUNIA,p),p.id).toBe(true);
 });
 it('reproduces the editable map and manifest without generating new art or rewriting files',()=>{
  expect(()=>execFileSync(process.execPath,['scripts/polish-hutan-v38-r1.mjs','--check'],{encoding:'utf8'})).not.toThrow();
 });
});
