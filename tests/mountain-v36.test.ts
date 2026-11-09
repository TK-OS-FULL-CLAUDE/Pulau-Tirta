import {describe,it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import baseline from '../world/mountain-v36-baseline.json';
import design from '../world/mountain-v36.json';
import {bacaPeta,bisaBerdiri,interaksiTerdekat,langkahGerak,properti,type PetaTiled,type ObjekTiled} from '../src/game/map-data';
import {NPC_PLANS,validateNpcPlan} from '../src/game/living-model';
import {villageActivity} from '../src/game/village-activity';
const old=JSON.parse(readFileSync('public/maps/pulau-tirta-v351.json','utf8')) as PetaTiled;
const raw=JSON.parse(readFileSync('public/maps/pulau-tirta-v36.json','utf8')) as PetaTiled;
// This historical stage keeps checking its stored map; V3.7 separately checks the active world.
const DUNIA=bacaPeta(raw);
const previous=bacaPeta(old),L=(m:PetaTiled,n:string)=>m.layers.find(l=>l.name===n)!;
const regions=L(old,'Regions').objects!,mountain=regions.find(r=>r.name==='Puncak Kabut')!,others=regions.filter(r=>r!==mountain);
const contains=(r:ObjekTiled,x:number,y:number)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x:number,y:number)=>contains(mountain,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8));
function accessible(){
 const q=[[Math.floor(DUNIA.spawn.x/16),Math.floor(DUNIA.spawn.y/16)]],seen=new Set([q[0].join(',')]);
 for(let i=0;i<q.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
  const[x,y]=q[i],nx=x+dx,ny=y+dy,k=nx+','+ny;if(seen.has(k)||!bisaBerdiri(DUNIA,nx*16+8,ny*16+8))continue;
  let p={x:x*16+8,y:y*16+8};for(let step=0;step<8;step++)p=langkahGerak(DUNIA,p,dx,dy,2000/86);
  if(Math.hypot(p.x-(nx*16+8),p.y-(ny*16+8))>.001)continue;seen.add(k);q.push([nx,ny]);
 }return{q,seen};
}
describe('Puncak V3.6 visual ownership, assets and unchanged gameplay',()=>{
 it('keeps integrated team/A5/coast sources byte-identical in the stored V3.6 map',()=>{
  for(const[file,hash]of Object.entries(baseline.hashes))expect(createHash('sha256').update(readFileSync(file)).digest('hex'),file).toBe(hash);
  expect(properti(raw,'worldVersion')).toBe('3.6-Puncak-Visual');
  expect([raw.width,raw.height,raw.tilewidth,raw.tileheight]).toEqual([192,144,16,16]);expect(raw.tilesets.slice(0,11)).toEqual(old.tilesets);
 });
 it('changes no object contract or tile outside Puncak, including the overlap owned by Desa',()=>{
  for(const l of old.layers){const n=L(raw,l.name);expect(n).toBeDefined();
   if(!l.data){expect(n,l.name).toEqual(l);continue;}
   const{data:_,...metadata}=l,{data:__,...newMetadata}=n;expect(newMetadata,l.name).toEqual(metadata);
   for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data![i])expect(allowed(i%192,Math.floor(i/192)),l.name+':'+i).toBe(true);
   if(l.name.startsWith('Recovery_')&&!l.name.endsWith('_Puncak_Kabut')||l.name.startsWith('Celebration_'))expect(n,l.name).toEqual(l);
  }
  const added=raw.layers.filter(l=>!old.layers.some(n=>n.name===l.name));expect(added.map(l=>l.name)).toEqual(['Mountain_V36_Detail']);
  for(const l of added)for(let i=0;i<l.data!.length;i++)if(l.data![i])expect(allowed(i%192,Math.floor(i/192)),l.name+':'+i).toBe(true);
 });
 it('preserves all collision, route cells, mission coordinates, recovery gates and existing fog/windsock anchors',()=>{
  expect(DUNIA.solid).toEqual(previous.solid);expect(DUNIA.penghalang).toEqual(previous.penghalang);expect(DUNIA.interaksi).toEqual(previous.interaksi);
  expect(L(raw,'Paths').data!.map(Boolean)).toEqual(L(old,'Paths').data!.map(Boolean));expect(L(raw,'Water')).toEqual(L(old,'Water'));
  expect(L(raw,'Mountain_Mist_V32')).toEqual(L(old,'Mountain_Mist_V32'));
  expect(DUNIA.interaksi.find(i=>i.id==='puncak')).toMatchObject({misiId:'misi-2',x:968,y:696,radius:36});
  for(const l of old.layers.filter(l=>l.name.endsWith('_Puncak_Kabut'))){expect(L(raw,l.name).properties).toEqual(l.properties);expect(L(raw,l.name).visible).toBe(l.visible);}
  for(const[x,y]of design.protectedLivingAnchors)expect(L(raw,'Objects').data![y*192+x]).toBe(L(old,'Objects').data![y*192+x]);
  for(let y=38;y<=40;y++)for(let x=60;x<=61;x++)for(const n of['Objects','AbovePlayer'])expect(L(raw,n).data![y*192+x]).toBe(L(old,n).data![y*192+x]);
 });
 it('walks the existing switchback from village spawn through both stairs to the observation mission and all other missions',()=>{
  const{q,seen}=accessible();expect(design.validationTargets.filter(p=>!seen.has(p.join(',')))).toEqual([]);
  for(const target of DUNIA.interaksi)expect(q.some(([x,y])=>interaksiTerdekat(DUNIA,x*16+8,y*16+8)?.id===target.id),target.id).toBe(true);
  expect(bisaBerdiri(DUNIA,968,696)).toBe(true);
 });
 it('anchors tall conifers to old tree bodies and leaves route/mission visibility and existing NPC plans intact',()=>{
  expect(design.trees.length).toBeGreaterThanOrEqual(8);
  for(const t of design.trees){expect(DUNIA.penghalang.some(o=>o.name===`v32_tree_${t.x}_${t.y}`)).toBe(true);
   for(let dy=0;dy<t.height;dy++)for(let dx=0;dx<t.width;dx++){const x=t.x-1+dx,y=t.y-t.height+1+dy;expect(L(raw,'Paths').data![y*192+x]).toBe(0);expect(Math.hypot(x*16+8-968,y*16+8-696)).toBeGreaterThanOrEqual(72);}
  }
  for(const p of NPC_PLANS)expect(validateNpcPlan(DUNIA,p),p.id).toBe(true);
  for(const m of L(raw,'NPCSpawns').objects!){const p=villageActivity(m,NPC_PLANS.find(p=>p.id===m.name));if(p)expect(validateNpcPlan(DUNIA,p)).toBe(true);}
  const recovered=structuredClone(raw);for(const l of recovered.layers)if(l.name.startsWith('Recovery_'))l.visible=true;expect(bacaPeta(recovered).solid).toEqual(DUNIA.solid);
 });
 it('resolves every map GID and runtime asset without introducing new solid tile properties',()=>{
  const newSet=raw.tilesets.at(-1)!;expect(newSet.name).toBe('mountain_v36');expect([newSet.columns*newSet.tilewidth,newSet.tilecount/newSet.columns*newSet.tileheight,newSet.tilewidth,newSet.tileheight]).toEqual([512,256,16,16]);expect(newSet.tiles??[]).toEqual([]);
  for(const s of raw.tilesets)expect(existsSync(resolve('public/maps',s.image)),s.image).toBe(true);
  for(const l of raw.layers.filter(l=>l.data))for(const g of new Set(l.data))if(g)expect(raw.tilesets.some(s=>g!>=s.firstgid&&g!<s.firstgid+s.tilecount),l.name+' gid'+g).toBe(true);
  expect(readFileSync('public/assets/world/mountain_v36/tileset.svg','utf8')).toBe(readFileSync('world/assets/mountain_v36/tileset.svg','utf8'));
 });
 it('reproduces editor map, local atlas and composition data without writing files',()=>{
  expect(()=>execFileSync(process.execPath,['scripts/design-puncak-v36.mjs','--check'],{encoding:'utf8'})).not.toThrow();
 });
});
