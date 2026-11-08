import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import raw from '../public/maps/pulau-tirta-v34-a4.json';
import before from '../public/maps/pulau-tirta-v34-a3.json';
import baseline from '../world/village-a4-baseline.json';
import layout from '../world/village-a4.json';
import buildings from '../world/buildings-v34-a1.json';
import {bacaPeta,bisaBerdiri,langkahGerak,interaksiTerdekat,properti,type ObjekTiled} from '../src/game/map-data';
import {NPC_PLANS,validateNpcPlan,makeNpc,tickNpc} from '../src/game/living-model';
import {villageActivity} from '../src/game/village-activity';
const world=bacaPeta(raw),regions=before.layers.find(l=>l.name==='Regions')!.objects!,desa=regions.find(o=>o.name==='Desa Tirta')!;
const inside=(o:ObjekTiled,x:number,y:number)=>x>=o.x&&x<o.x+o.width&&y>=o.y&&y<o.y+o.height;
const village=(x:number,y:number)=>inside(desa,x*16+8,y*16+8)&&!regions.some(o=>o!==desa&&inside(o,x*16+8,y*16+8));
const overlap=(a:ObjekTiled,b:ObjekTiled)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
function reachable(roadsOnly=false){const roads=raw.layers.find(l=>l.name==='Paths')!.data!,q=[[96,79]],seen=new Set(['96,79']);
 for(let i=0;i<q.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
  const[x,y]=q[i],nx=x+dx,ny=y+dy,k=`${nx},${ny}`;
  if(seen.has(k)||(roadsOnly&&(!village(nx,ny)||!roads[ny*192+nx]))||!bisaBerdiri(world,nx*16+8,ny*16+8))continue;
  let p={x:x*16+8,y:y*16+8};for(let n=0;n<8;n++)p=langkahGerak(world,p,dx,dy,2000/86);
  if(Math.hypot(p.x-(nx*16+8),p.y-(ny*16+8))>.001)continue;seen.add(k);q.push([nx,ny]);
 }return{seen,q};}
describe('Desa A4 scoped polish and navigation',()=>{
 it('preserves A3, backend, mission, movement and the old renderer except its map-data adapter',()=>{
  for(const[f,h]of Object.entries(baseline))expect(createHash('sha256').update(readFileSync(f)).digest('hex'),f).toBe(h);
  const archive=readFileSync('world/archives/living-world-through-a3.ts.txt','utf8');
  const active=readFileSync('src/game/living-world.ts','utf8').replace("import { villageActivity } from './village-activity';\n",'').replace('villageActivity(marker, NPC_PLANS.find(p => p.id === marker.name))','NPC_PLANS.find(p => p.id === marker.name)');
  expect(active).toBe(archive);expect([raw.width,raw.height,raw.tilewidth,raw.tileheight]).toEqual([192,144,16,16]);
  expect(raw.tilesets.slice(0,7)).toEqual(before.tilesets);expect(raw.layers).toHaveLength(before.layers.length);
  for(const n of ['Spawn','Interactions','Regions','FuturePaths','DevelopmentAreas'])expect(raw.layers.find(l=>l.name===n)).toEqual(before.layers.find(l=>l.name===n));
 });
 it('preserves all pixels and colliders outside the village, including mission overlaps',()=>{
  for(const l of before.layers.filter(l=>l.data)){const n=raw.layers.find(n=>n.name===l.name)!;for(let i=0;i<l.data!.length;i++)if(!village(i%192,Math.floor(i/192))&&l.data![i]!==n.data![i])throw Error(`scope leak ${l.name}:${i}`);}
  for(const r of regions.filter(o=>o!==desa))expect(raw.layers.find(l=>l.name==='Collisions')!.objects!.filter(o=>overlap(o,r)),r.name).toEqual(before.layers.find(l=>l.name==='Collisions')!.objects!.filter(o=>overlap(o,r)));
 });
 it('reaches all seven unchanged houses, all missions and all 24 tour stops with real collision movement',()=>{
  expect(buildings).toHaveLength(7);const {seen,q}=reachable(),road=reachable(true).seen;
  for(const b of buildings){for(const n of ['Objects','AbovePlayer','Facades'])for(let dy=0;dy<4;dy++)for(let dx=0;dx<b.width;dx++){const i=(b.y+dy)*192+b.x+dx;expect(raw.layers.find(l=>l.name===n)!.data![i],b.name).toBe(before.layers.find(l=>l.name===n)!.data![i]);}expect(seen.has(`${b.door.x},${b.door.y+1}`),b.name).toBe(true);}
  expect(layout.tour.filter(t=>!road.has(t.tile.join(','))).map(t=>t.label)).toEqual([]);
  for(const t of [[106,88],[103,82],[101,63],[77,63],[119,60],[76,97],[120,97]])expect(road.has(t.join(',')),`service/bench/orchard/gate ${t}`).toBe(true);
  for(const t of world.interaksi)expect(q.some(([x,y])=>interaksiTerdekat(world,x*16+8,y*16+8)?.id===t.id),t.nama).toBe(true);
 });
 it('runs all four map-authored activities for three minutes without collision, stalling or mission intrusion',()=>{
  const markers=raw.layers.find(l=>l.name==='NPCSpawns')!.objects!;expect(markers).toHaveLength(4);
  for(const m of markers){const p=villageActivity(m,NPC_PLANS.find(p=>p.id===m.name))!;expect(validateNpcPlan(world,p),m.name).toBe(true);const s=makeNpc(p),targets=new Set<number>();
   for(let n=0;n<4500;n++){tickNpc(s,p,world,40,true,{x:0,y:0});targets.add(s.target);if(!bisaBerdiri(world,s.x,s.y)||world.interaksi.some(i=>Math.hypot(i.x-s.x,i.y-s.y)<i.radius+12))throw Error(`unsafe ${m.name}`);}
   if(p.waypoints.length>1){expect(targets.size,m.name).toBeGreaterThan(1);expect(s.distance).toBeGreaterThan(40);}else expect(s.distance).toBe(0);
  }
  for(const value of ['bad','{}','{"tiles":[[null,4]],"pauseMs":2000}','{"tiles":[[4,4]],"pauseMs":-1}'])expect(villageActivity({...markers[0],properties:[{name:'villageActivity',value}]},NPC_PLANS[0])).toBe(NPC_PLANS[0]);
 });
 it('retains the well overlay and Festival stage, while recovery never changes collision',()=>{
  for(const name of ['Objects','AbovePlayer','Facades','Celebration_Desa_Decor'])for(let y=74;y<=76;y++)for(let x=92;x<=94;x++){const i=y*192+x;expect(raw.layers.find(l=>l.name===name)!.data![i]).toBe(before.layers.find(l=>l.name===name)!.data![i]);}
  for(const name of ['Celebration_Desa_Banners'])expect(raw.layers.find(l=>l.name===name)).toEqual(before.layers.find(l=>l.name===name));
  const after=structuredClone(raw);for(const l of after.layers)if(l.name.startsWith('Recovery_')||properti(l,'festival'))l.visible=true;
  expect(bacaPeta(after).solid).toEqual(world.solid);expect(raw.layers.filter(l=>properti(l,'festival'))).toHaveLength(3);expect(bisaBerdiri(world,1544,1272)).toBe(true);
  for(const o of world.penghalang.filter(o=>o.name.startsWith('a4_')))expect(bisaBerdiri(world,o.x+o.width/2,o.y+o.height/2),o.name).toBe(false);
 });
 it('removes the empty perimeter loops, reduces paving and keeps distinct working gardens',()=>{
  const paths=raw.layers.find(l=>l.name==='Paths')!.data!,old=before.layers.find(l=>l.name==='Paths')!.data!;
  expect(paths[58*192+112]).toBe(0);expect(paths[89*192+119]).toBe(0);
  const paved=(d:number[])=>d.filter((g,i)=>village(i%192,Math.floor(i/192))&&[883,884].includes(g)).length;
  expect(paved(paths)).toBeLessThan(paved(old)*.65);
  expect(new Set(paths.filter(g=>g>=899)).size).toBeGreaterThan(8);
 });
});
