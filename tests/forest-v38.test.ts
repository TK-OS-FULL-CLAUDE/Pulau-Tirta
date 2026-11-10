import {describe,it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import baseline from '../world/forest-v38-baseline.json';
import design from '../world/forest-v38.json';
import {bacaPeta,bisaBerdiri,interaksiTerdekat,langkahGerak,misiPemulihan,properti,type PetaTiled,type ObjekTiled} from '../src/game/map-data';
import {NPC_PLANS,validateNpcPlan} from '../src/game/living-model';
import {villageActivity} from '../src/game/village-activity';
const old=JSON.parse(readFileSync('public/maps/pulau-tirta-v37.json','utf8')) as PetaTiled;
const raw=JSON.parse(readFileSync('public/maps/pulau-tirta-v38.json','utf8')) as PetaTiled;
// Preserve regression coverage of the archived V3.8; R1 separately checks the active restoration.
const DUNIA=bacaPeta(raw);
const previous=bacaPeta(old),L=(m:PetaTiled,n:string)=>m.layers.find(l=>l.name===n)!;
const regions=L(old,'Regions').objects!,forest=regions.find(r=>r.name==='Hutan & Sungai')!,others=regions.filter(r=>r!==forest);
const contains=(r:ObjekTiled,x:number,y:number)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x:number,y:number)=>contains(forest,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8));
function accessible(){const q=[[Math.floor(DUNIA.spawn.x/16),Math.floor(DUNIA.spawn.y/16)]],seen=new Set([q[0].join(',')]);
 for(let i=0;i<q.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const[x,y]=q[i],nx=x+dx,ny=y+dy,k=nx+','+ny;if(seen.has(k)||!bisaBerdiri(DUNIA,nx*16+8,ny*16+8))continue;let p={x:x*16+8,y:y*16+8};for(let n=0;n<8;n++)p=langkahGerak(DUNIA,p,dx,dy,2000/86);if(Math.hypot(p.x-(nx*16+8),p.y-(ny*16+8))>.001)continue;seen.add(k);q.push([nx,ny]);}return{q,seen};}
describe('Hutan V3.8 forest composition and protected river gameplay',()=>{
 it('preserves all team and earlier world sources and activates the V3.8 editable export',()=>{
  for(const[file,hash]of Object.entries(baseline.hashes))expect(createHash('sha256').update(readFileSync(file)).digest('hex'),file).toBe(hash);
  expect(properti(raw,'worldVersion')).toBe('3.8-Forest-River');expect([raw.width,raw.height,raw.tilewidth,raw.tileheight]).toEqual([192,144,16,16]);expect(raw.tilesets.slice(0,13)).toEqual(old.tilesets);
 });
 it('changes no tile outside Hutan and no object contract or other region recovery/Festival layer',()=>{
  expect(raw.layers).toHaveLength(old.layers.length);
  for(const l of old.layers){const n=L(raw,l.name);if(!l.data){expect(n,l.name).toEqual(l);continue;}const{data:_,...meta}=l,{data:__,...next}=n;expect(next,l.name).toEqual(meta);
   for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data![i])expect(allowed(i%192,Math.floor(i/192)),l.name+':'+i).toBe(true);
   if(l.name.startsWith('Recovery_')&&!l.name.endsWith('_Hutan_Sungai')||l.name.startsWith('Celebration_')||l.name==='Mountain_V36_Detail')expect(n,l.name).toEqual(l);
  }
 });
 it('retains every collider/solid cell, water silhouette, path cell and all 33 bridge tiles and railings',()=>{
  expect(DUNIA.solid).toEqual(previous.solid);expect(DUNIA.penghalang).toEqual(previous.penghalang);expect(DUNIA.interaksi).toEqual(previous.interaksi);
  expect(L(raw,'Paths').data!.map(Boolean)).toEqual(L(old,'Paths').data!.map(Boolean));expect(L(raw,'Water').data!.map(Boolean)).toEqual(L(old,'Water').data!.map(Boolean));expect(L(raw,'Ground')).toEqual(L(old,'Ground'));
  expect(design.bridgeCells).toHaveLength(33);for(const[x,y]of design.bridgeCells)expect(L(raw,'Paths').data![y*192+x]).toBe(L(old,'Paths').data![y*192+x]);
  for(const b of DUNIA.penghalang.filter(o=>o.name.startsWith('bridge_rail'))){const x=Math.floor(b.x/16),y=Math.floor(b.y/16);expect(L(raw,'Objects').data![y*192+x]).toBe(L(old,'Objects').data![y*192+x]);}
  expect(DUNIA.interaksi.find(i=>i.id==='hutan')).toMatchObject({misiId:'misi-4',x:2264,y:1704,radius:36});
 });
 it('grows varied overlapping crowns from old tree bodies while keeping foliage off the paths',()=>{
  expect(design.trees.filter(t=>t.width===3).length).toBeGreaterThan(100);expect(new Set(design.trees.map(t=>t.style)).size).toBe(5);expect(design.canopyTiles).toBeGreaterThan(700);
  for(const t of design.trees){expect(DUNIA.penghalang.some(o=>o.name===t.collider)).toBe(true);
   for(let dy=0;dy<t.height-1;dy++)for(let dx=0;dx<t.width;dx++){const x=t.x-Math.floor(t.width/2)+dx,y=t.y-t.height+1+dy,i=y*192+x,f=(y-82)*128+x-122;
    expect(L(raw,'Paths').data![i]).toBe(0);expect(L(raw,'Water').data![i]).toBe(0);expect(L(raw,'AbovePlayer').data![i]).toBe(4755+f);expect(L(raw,'Recovery_Canopy_Hutan_Sungai').data![i]).toBe(4755+64+f);
   }
  }
 });
 it('preserves mission seed/debris/Living markers and existing recovery gates without changing physics',()=>{
  for(const[x,y]of[...design.protectedLivingAnchors,...design.protectedSeedlings,...design.protectedDebris])for(const n of['Objects','Recovery_Plants_Hutan_Sungai'])expect(L(raw,n).data![y*192+x]).toBe(L(old,n).data![y*192+x]);
  for(const l of raw.layers.filter(l=>l.name.endsWith('_Hutan_Sungai'))){expect(l.properties).toEqual(L(old,l.name).properties);expect(l.visible).toBe(false);expect(misiPemulihan(l)).toBe('misi-4');}
  expect(L(raw,'Recovery_Hutan_Sungai').data!.map(Boolean)).toEqual(L(old,'Recovery_Hutan_Sungai').data!.map(Boolean));expect(L(raw,'Recovery_Water_Hutan_Sungai')).toEqual(L(old,'Recovery_Water_Hutan_Sungai'));
  const recovered=structuredClone(raw);for(const l of recovered.layers)if(misiPemulihan(l)==='misi-4')l.visible=true;expect(bacaPeta(recovered).solid).toEqual(DUNIA.solid);
  for(const d of design.details)for(let dy=0;dy<d.height;dy++)for(let dx=0;dx<d.width;dx++){const i=(d.y+dy)*192+d.x+dx;expect(L(raw,'Paths').data![i]).toBe(0);expect(L(raw,'Water').data![i]).toBe(0);}
 });
 it('walks from village spawn to the clearing, both bridge banks, the planting beds and all missions',()=>{
  const{q,seen}=accessible();expect(design.validationTargets.filter(p=>!seen.has(p.join(',')))).toEqual([]);for(const p of DUNIA.interaksi)expect(q.some(([x,y])=>interaksiTerdekat(DUNIA,x*16+8,y*16+8)?.id===p.id),p.id).toBe(true);
  for(const p of NPC_PLANS)expect(validateNpcPlan(DUNIA,p),p.id).toBe(true);for(const m of L(raw,'NPCSpawns').objects!){const p=villageActivity(m,NPC_PLANS.find(p=>p.id===m.name));if(p)expect(validateNpcPlan(DUNIA,p)).toBe(true);}
 });
 it('resolves all tile images and reproduces editor map, composited atlas and manifest without writing',()=>{
  const set=raw.tilesets.at(-1)!;expect(set.name).toBe('forest_v38');expect([set.columns,set.tilecount,set.tilewidth,set.tileheight]).toEqual([128,16384,16,16]);
  for(const s of raw.tilesets)expect(existsSync(resolve('public/maps',s.image)),s.image).toBe(true);for(const l of raw.layers.filter(l=>l.data))for(const g of new Set(l.data))if(g)expect(raw.tilesets.some(s=>g!>=s.firstgid&&g!<s.firstgid+s.tilecount),l.name+':'+g).toBe(true);
  expect(readFileSync('public/assets/world/forest_v38/tileset.svg','utf8')).toBe(readFileSync('world/assets/forest_v38/tileset.svg','utf8'));
  expect(()=>execFileSync(process.execPath,['scripts/design-hutan-v38.mjs','--check'],{encoding:'utf8'})).not.toThrow();
 });
});
