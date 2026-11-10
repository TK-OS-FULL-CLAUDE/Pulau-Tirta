import {describe,it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import baseline from '../world/valley-v37-baseline.json';
import design from '../world/valley-v37.json';
import {bacaPeta,bisaBerdiri,interaksiTerdekat,langkahGerak,misiPemulihan,properti,type PetaTiled,type ObjekTiled} from '../src/game/map-data';
import {NPC_PLANS,validateNpcPlan} from '../src/game/living-model';
import {villageActivity} from '../src/game/village-activity';
const old=JSON.parse(readFileSync('public/maps/pulau-tirta-v36.json','utf8')) as PetaTiled;
const raw=JSON.parse(readFileSync('public/maps/pulau-tirta-v37.json','utf8')) as PetaTiled;
// This stage checks its stored map. The V3.8 regression separately checks the active world.
const DUNIA=bacaPeta(raw);
const previous=bacaPeta(old),L=(m:PetaTiled,n:string)=>m.layers.find(l=>l.name===n)!;
const regions=L(old,'Regions').objects!,valley=regions.find(r=>r.name==='Lembah Hujan')!,others=regions.filter(r=>r!==valley);
const contains=(r:ObjekTiled,x:number,y:number)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x:number,y:number)=>contains(valley,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8));
function accessible(){const q=[[Math.floor(DUNIA.spawn.x/16),Math.floor(DUNIA.spawn.y/16)]],seen=new Set([q[0].join(',')]);
 for(let i=0;i<q.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const[x,y]=q[i],nx=x+dx,ny=y+dy,k=nx+','+ny;if(seen.has(k)||!bisaBerdiri(DUNIA,nx*16+8,ny*16+8))continue;let p={x:x*16+8,y:y*16+8};for(let n=0;n<8;n++)p=langkahGerak(DUNIA,p,dx,dy,2000/86);if(Math.hypot(p.x-(nx*16+8),p.y-(ny*16+8))>.001)continue;seen.add(k);q.push([nx,ny]);}return{q,seen};}
describe('Lembah V3.7 rainfall basin art and protected gameplay',()=>{
 it('protects all integrated team and earlier visual sources and activates the new editable export',()=>{
  for(const[file,hash]of Object.entries(baseline.hashes))expect(createHash('sha256').update(readFileSync(file)).digest('hex'),file).toBe(hash);
  expect(properti(raw,'worldVersion')).toBe('3.7-Rainfall-Basin');expect([raw.width,raw.height,raw.tilewidth,raw.tileheight]).toEqual([192,144,16,16]);expect(raw.tilesets.slice(0,12)).toEqual(old.tilesets);
 });
 it('changes no pixel outside Lembah and no object layer, metadata, other mission or Festival layer',()=>{
  expect(raw.layers).toHaveLength(old.layers.length);
  for(const l of old.layers){const n=L(raw,l.name);if(!l.data){expect(n,l.name).toEqual(l);continue;}const{data:_,...meta}=l,{data:__,...next}=n;expect(next,l.name).toEqual(meta);
   for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data![i])expect(allowed(i%192,Math.floor(i/192)),l.name+':'+i).toBe(true);
   if(l.name.startsWith('Recovery_')&&!l.name.endsWith('_Lembah_Hujan')||l.name.startsWith('Celebration_')||l.name==='Mountain_V36_Detail')expect(n,l.name).toEqual(l);
  }
 });
 it('preserves every collider, solid cell, route footprint and the misi-3 interaction coordinates',()=>{
  expect(DUNIA.solid).toEqual(previous.solid);expect(DUNIA.penghalang).toEqual(previous.penghalang);expect(DUNIA.interaksi).toEqual(previous.interaksi);
  expect(L(raw,'Paths').data!.map(Boolean)).toEqual(L(old,'Paths').data!.map(Boolean));expect(L(raw,'Water')).toEqual(L(old,'Water'));expect(L(raw,'Ground')).toEqual(L(old,'Ground'));
  expect(DUNIA.interaksi.find(i=>i.id==='lembah')).toMatchObject({misiId:'misi-3',x:2216,y:728,radius:36});
  for(const b of design.basins)for(let dy=0;dy<b.height;dy++)for(let dx=0;dx<b.width;dx++)expect(bisaBerdiri(DUNIA,(b.x+dx)*16+8,(b.y+dy)*16+8),b.id).toBe(false);
 });
 it('keeps all four existing recovery gates, changes the same bowls and limits new green growth to the banks',()=>{
  const layers=raw.layers.filter(l=>l.name.endsWith('_Lembah_Hujan'));expect(layers).toHaveLength(4);
  for(const l of layers){expect(l.properties).toEqual(L(old,l.name).properties);expect(l.visible).toBe(false);expect(misiPemulihan(l)).toBe('misi-3');expect(l.data!.some(Boolean)).toBe(true);}
  for(const b of design.basins)for(let dy=0;dy<b.height;dy++)for(let dx=0;dx<b.width;dx++){const i=(b.y+dy)*192+b.x+dx;expect(L(raw,'Objects').data![i]).toBe(2451+b.dry+dy*48+dx);expect(L(raw,'Recovery_Plants_Lembah_Hujan').data![i]).toBe(2451+b.wet+dy*48+dx);}
  expect(design.recovery.greenTiles).toBeLessThan(design.recovery.dampTiles/3);expect(design.recovery.dampTiles).toBeLessThan(design.patch.width*design.patch.height/8);
  const restored=structuredClone(raw);for(const l of restored.layers)if(misiPemulihan(l)==='misi-3')l.visible=true;expect(bacaPeta(restored).solid).toEqual(DUNIA.solid);
 });
 it('walks from village spawn to the observation point, basin banks and every original mission',()=>{
  const{q,seen}=accessible();expect(design.validationTargets.filter(p=>!seen.has(p.join(',')))).toEqual([]);
  for(const p of DUNIA.interaksi)expect(q.some(([x,y])=>interaksiTerdekat(DUNIA,x*16+8,y*16+8)?.id===p.id),p.id).toBe(true);expect(bisaBerdiri(DUNIA,2216,728)).toBe(true);
 });
 it('keeps Living World markers, existing NPC routes and anchored tree bodies intact',()=>{
  for(const[x,y]of design.protectedLivingAnchors)for(const n of['Objects','Recovery_Plants_Lembah_Hujan'])expect(L(raw,n).data![y*192+x]).toBe(L(old,n).data![y*192+x]);
  for(const t of design.trees){expect(DUNIA.penghalang.some(o=>o.name.startsWith('tree_')&&Math.floor(o.x/16)===t.x&&Math.floor(o.y/16)===t.y)).toBe(true);for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++)expect(L(raw,'Paths').data![(t.y-2+dy)*192+t.x-1+dx]).toBe(0);}
  for(const p of NPC_PLANS)expect(validateNpcPlan(DUNIA,p),p.id).toBe(true);for(const m of L(raw,'NPCSpawns').objects!){const p=villageActivity(m,NPC_PLANS.find(p=>p.id===m.name));if(p)expect(validateNpcPlan(DUNIA,p)).toBe(true);}
 });
 it('resolves all tiles/assets while keeping the new atlas nonphysical and export deterministic',()=>{
  const set=raw.tilesets.at(-1)!;expect(set.name).toBe('valley_v37');expect([set.columns,set.tilecount,set.tilewidth,set.tileheight]).toEqual([48,2304,16,16]);expect(set.tiles??[]).toEqual([]);
  for(const s of raw.tilesets)expect(existsSync(resolve('public/maps',s.image)),s.image).toBe(true);
  for(const l of raw.layers.filter(l=>l.data))for(const g of new Set(l.data))if(g)expect(raw.tilesets.some(s=>g!>=s.firstgid&&g!<s.firstgid+s.tilecount),l.name+':'+g).toBe(true);
  expect(readFileSync('public/assets/world/valley_v37/tileset.svg','utf8')).toBe(readFileSync('world/assets/valley_v37/tileset.svg','utf8'));
  expect(()=>execFileSync(process.execPath,['scripts/design-lembah-v37.mjs','--check'],{encoding:'utf8'})).not.toThrow();
 });
});
