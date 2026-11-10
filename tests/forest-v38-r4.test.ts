import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import baseline from '../world/forest-v38-r4-baseline.json';
import design from '../world/forest-v38-r4.json';
import {bacaPeta,bisaBerdiri,interaksiTerdekat,langkahGerak,misiPemulihan,properti,type PetaTiled,type ObjekTiled} from '../src/game/map-data';
import {NPC_PLANS,validateNpcPlan} from '../src/game/living-model';
const old=JSON.parse(readFileSync('public/maps/pulau-tirta-v38-r3.json','utf8')) as PetaTiled;
const raw=JSON.parse(readFileSync('public/maps/pulau-tirta-v38-r4.json','utf8')) as PetaTiled;
// R4 remains an immutable world archive; the newest revision checks the active selection.
const PETA_RUNTIME=raw,DUNIA=bacaPeta(raw);
const previous=bacaPeta(old),L=(m:PetaTiled,n:string)=>m.layers.find(l=>l.name===n)!;
const regions=L(old,'Regions').objects!,forest=regions.find(r=>r.name==='Hutan & Sungai')!,others=regions.filter(r=>r!==forest);
const contains=(r:ObjekTiled,x:number,y:number)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x:number,y:number)=>contains(forest,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8));
describe('Hutan R4 native groves and proportional continuous river crossing',()=>{
 it('preserves team code, earlier uncommitted worlds and original art while activating only R4',()=>{
  for(const[file,hash]of Object.entries(baseline.hashes))expect(createHash('sha256').update(readFileSync(file)).digest('hex'),file).toBe(hash);
  expect(PETA_RUNTIME).toEqual(raw);expect(properti(raw,'worldVersion')).toBe('3.8-R4-Forest-Bridge');
  expect(raw.tilesets).toEqual(old.tilesets);expect([raw.width,raw.height,raw.tilewidth,raw.tileheight]).toEqual([192,144,16,16]);expect(design.usesNewAssets).toBe(false);
 });
 it('restricts every changed pixel and added trunk to Hutan, preserving all old objects and recovery layers',()=>{
  expect(raw.layers).toHaveLength(old.layers.length);
  for(const l of old.layers){const n=L(raw,l.name);
   if(l.name==='Collisions'){expect({...n,objects:n.objects!.slice(0,l.objects!.length)}).toEqual(l);expect(n.objects).toHaveLength(l.objects!.length+design.newTrees.length);continue;}
   if(!l.data){expect(n,l.name).toEqual(l);continue;}
   const{data:_,...meta}=l,{data:__,...next}=n;expect(next,l.name).toEqual(meta);
   for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data![i])expect(allowed(i%192,Math.floor(i/192)),l.name+':'+i).toBe(true);
   if(!['Objects','AbovePlayer','Paths','Water','Forest_Bridge_Water_Visual'].includes(l.name))expect(n,l.name).toEqual(l);
  }
  expect(DUNIA.interaksi).toEqual(previous.interaksi);expect(DUNIA.spawn).toEqual(previous.spawn);
  for(const[x,y]of design.protectedCells)for(const n of['Objects','Recovery_Plants_Hutan_Sungai'])expect(L(raw,n).data![y*192+x]).toBe(L(old,n).data![y*192+x]);
  for(let y=107;y<=110;y++)for(let x=138;x<=139;x++)for(const n of['Objects','AbovePlayer','Facades','Recovery_Plants_Hutan_Sungai','Recovery_Canopy_Hutan_Sungai'])expect(L(raw,n).data![y*192+x]).toBe(L(old,n).data![y*192+x]);
 });
 it('adds connected native masses and close trail shoulders with trunk-only bodies and no canopy overlap',()=>{
  expect(design.newTrees.length).toBeGreaterThanOrEqual(100);expect(design.metrics.interiorAfter-design.metrics.interiorBefore).toBeGreaterThan(100);
  expect(design.groups.filter(g=>g.positions.length).length).toBeGreaterThanOrEqual(15);
  const added=L(raw,'Collisions').objects!.slice(L(old,'Collisions').objects!.length),roots=new Set(design.newTrees.map(t=>`${t.x},${t.y}`));
  expect(added).toHaveLength(design.newTrees.length);
  const ids=(L(raw,'Collisions').objects! as (ObjekTiled & {id:number})[]).map(o=>o.id);expect(new Set(ids).size).toBe(ids.length);
  let nearTrail=0;const paths=L(old,'Paths').data!.flatMap((g,i)=>g&&allowed(i%192,Math.floor(i/192))?[[i%192,Math.floor(i/192)]]:[]);
  for(const t of design.newTrees){const{x,y}=t,b=added.find(o=>o.name===t.collider)!;
   expect([b.x,b.y,b.width,b.height]).toEqual([x*16+5,y*16+8,6,7]);expect(properti(b,'collides')).toBe(true);expect(allowed(x,y)).toBe(true);
   expect(bisaBerdiri(previous,x*16+8,y*16+11)).toBe(true);expect(bisaBerdiri(DUNIA,x*16+8,y*16+11)).toBe(false);
   expect(L(raw,'Objects').data![y*192+x]).toBe(t.gid);
   if(t.canopy){expect(roots.has(`${x},${y-1}`)).toBe(false);expect(L(raw,'AbovePlayer').data![(y-1)*192+x]).toBe(137);expect(bisaBerdiri(DUNIA,x*16+8,(y-1)*16+8)).toBe(true);}
   for(let yy=y-1;yy<=y;yy++)for(const n of['Paths','Water'])expect(L(old,n).data![yy*192+x],n).toBe(0);
   if(Math.min(...paths.map(([px,py])=>Math.hypot(px-x,py-y)))<=2.5)nearTrail++;
  }
  expect(nearTrail).toBeGreaterThanOrEqual(25);expect(design.newTrees.some(t=>t.gid===292)).toBe(true);
 });
 it('groups walkable native ground plants off paths, water, hut, mission and all physical props',()=>{
  expect(design.details.length).toBeGreaterThanOrEqual(70);expect(new Set(design.details.map(t=>t.gid)).size).toBeGreaterThanOrEqual(6);
  for(const t of design.details){expect(L(raw,'Objects').data![t.y*192+t.x]).toBe(t.gid);expect(bisaBerdiri(DUNIA,t.x*16+8,t.y*16+8)).toBe(true);expect(L(raw,'Paths').data![t.y*192+t.x]).toBe(0);expect(L(raw,'Water').data![t.y*192+t.x]).toBe(0);}
 });
 it('restores one continuous original-water bed through both dry gaps, keeping the physical river mask identical',()=>{
  expect(DUNIA.solid).toEqual(previous.solid);expect(DUNIA.penghalang.slice(0,previous.penghalang.length)).toEqual(previous.penghalang);
  const wet=L(raw,'Water').data!,q=[[154,102]],seen=new Set(['154,102']);
  for(let k=0;k<q.length;k++)for(const[dx,dy]of[[0,1],[0,-1],[1,0],[-1,0]]){const[x,y]=q[k],nx=x+dx,ny=y+dy,key=`${nx},${ny}`;if(nx<150||nx>158||ny<101||ny>111||seen.has(key)||!wet[ny*192+nx])continue;seen.add(key);q.push([nx,ny]);}
  expect(seen.has('153,110')).toBe(true);
  for(const[x,y]of design.river.repairedCells){expect(wet[y*192+x]).toBe(x===153?433:x===155?435:434);expect([601,602]).toContain(L(raw,'Paths').data![y*192+x]);}
  for(const[x,y]of[[153,104],[154,104],[153,108],[154,108]])expect(L(raw,'Forest_Bridge_Water_Visual').data![y*192+x]).toBe(0);
  for(let i=0;i<wet.length;i++)if(wet[i]!==L(old,'Water').data![i])expect(design.river.repairedCells.some(([x,y])=>i===y*192+x)).toBe(true);
  const restored=structuredClone(raw);for(const l of restored.layers)if(misiPemulihan(l)==='misi-4')l.visible=true;expect(bacaPeta(restored).solid).toEqual(DUNIA.solid);expect(bacaPeta(restored).penghalang).toEqual(DUNIA.penghalang);
 });
 it('shrinks the visible wooden span over dry land without invisible fences or movement-mask changes',()=>{
  const deck=(m:PetaTiled)=>L(m,'Paths').data!.flatMap((g,i)=>allowed(i%192,Math.floor(i/192))&&[601,602].includes(g)?[i]:[]);
  expect(deck(old)).toHaveLength(33);expect(deck(raw)).toHaveLength(15);
  for(let y=105;y<=107;y++)for(let x=156;x<=163;x++){expect(L(raw,'Paths').data![y*192+x]).toBe(764);expect(L(raw,'Water').data![y*192+x]).toBe(0);}
  for(const o of previous.penghalang.filter(o=>o.name.startsWith('bridge_rail_'))){expect(DUNIA.penghalang.find(n=>n.name===o.name)).toEqual(o);const i=Math.floor(o.y/16)*192+Math.floor(o.x/16);expect(L(raw,'Objects').data![i]).toBe(L(old,'Objects').data![i]);expect(L(raw,'Objects').data![i]).not.toBe(0);}
  for(let i=0;i<L(old,'Paths').data!.length;i++){if(L(old,'Paths').data![i])expect(L(raw,'Paths').data![i]).not.toBe(0);if(L(old,'Paths').data![i]!==L(raw,'Paths').data![i])expect(design.bridge.pathEdits.some(([x,y])=>i===y*192+x)).toBe(true);}
 });
 it('reaches all missions, old walkable forest routes, hut front and both bridge banks using real movement',()=>{
  const q=[[Math.floor(DUNIA.spawn.x/16),Math.floor(DUNIA.spawn.y/16)]],seen=new Set([q[0].join(',')]);
  for(let i=0;i<q.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const[x,y]=q[i],nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(seen.has(k)||!bisaBerdiri(DUNIA,nx*16+8,ny*16+8))continue;let p={x:x*16+8,y:y*16+8};for(let n=0;n<8;n++)p=langkahGerak(DUNIA,p,dx,dy,2000/86);if(Math.hypot(p.x-(nx*16+8),p.y-(ny*16+8))>.001)continue;seen.add(k);q.push([nx,ny]);}
  expect(design.validationTargets.filter(p=>!seen.has(p.join(',')))).toEqual([]);
  for(const p of DUNIA.interaksi)expect(q.some(([x,y])=>interaksiTerdekat(DUNIA,x*16+8,y*16+8)?.id===p.id),p.id).toBe(true);
  const inaccessible=L(old,'Paths').data!.flatMap((g,i)=>g&&allowed(i%192,Math.floor(i/192))&&bisaBerdiri(previous,(i%192)*16+8,Math.floor(i/192)*16+8)&&!seen.has(`${i%192},${Math.floor(i/192)}`)?[i]:[]);expect(inaccessible).toEqual([]);
  for(const p of NPC_PLANS)expect(validateNpcPlan(DUNIA,p)).toBe(true);
 });
 it('reproduces the stored editor map and placement manifest without rewriting files',()=>{
  expect(()=>execFileSync(process.execPath,['scripts/polish-hutan-v38-r4.mjs','--check'],{encoding:'utf8'})).not.toThrow();
 });
});
