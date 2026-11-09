import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import before from '../public/maps/pulau-tirta-v34-a4.json';
import layout from '../world/village-a5.json';
import buildings from '../world/buildings-v34-a1.json';
import baseline from '../world/village-a5-baseline.json';
import colorBaseline from '../world/village-a5-color-baseline.json';
import colorLayout from '../world/village-a5-color.json';
import integrationArchive from '../world/a5-integration-archive.json';
import {bacaPeta,bisaBerdiri,langkahGerak,interaksiTerdekat,properti,type PetaTiled,type ObjekTiled} from '../src/game/map-data';
import {NPC_PLANS,validateNpcPlan,makeNpc,tickNpc} from '../src/game/living-model';
import {villageActivity} from '../src/game/village-activity';
const raw=JSON.parse(readFileSync('public/maps/pulau-tirta-v34-a5.json','utf8')) as PetaTiled,world=bacaPeta(raw);
const regions=before.layers.find(l=>l.name==='Regions')!.objects!,desa=regions.find(o=>o.name==='Desa Tirta')!;
const contains=(o:ObjekTiled,x:number,y:number)=>x>=o.x&&x<o.x+o.width&&y>=o.y&&y<o.y+o.height;
const village=(x:number,y:number)=>contains(desa,x*16+8,y*16+8)&&!regions.some(o=>o!==desa&&contains(o,x*16+8,y*16+8));
const overlap=(a:ObjekTiled,b:ObjekTiled)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
function reach(road=false){const roads=raw.layers.find(l=>l.name==='Paths')!.data!,q=[[96,79]],seen=new Set(['96,79']);
 for(let i=0;i<q.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const[x,y]=q[i],nx=x+dx,ny=y+dy,k=nx+','+ny;
  if(seen.has(k)||(road&&(!village(nx,ny)||!roads[ny*192+nx]))||!bisaBerdiri(world,nx*16+8,ny*16+8))continue;
  let p={x:x*16+8,y:y*16+8};for(let n=0;n<8;n++)p=langkahGerak(world,p,dx,dy,2000/86);if(Math.hypot(p.x-(nx*16+8),p.y-(ny*16+8))>.001)continue;seen.add(k);q.push([nx,ny]);
 }return{q,seen};}
describe('A5 density on integrated team code',()=>{
 it('limits color finishing to ground/detail, preserving the exact A5 NPCs, collisions, missions and paths',()=>{
  for(const l of raw.layers)if(!['Ground','TerrainDetails'].includes(l.name))expect(createHash('sha256').update(JSON.stringify(l)).digest('hex'),l.name).toBe(colorBaseline.layerHashes[l.name as keyof typeof colorBaseline.layerHashes]);
  for(const[file,hash]of Object.entries(colorBaseline.sourceSha256))expect(createHash('sha256').update(readFileSync(file)).digest('hex'),file).toBe(hash);
  expect(createHash('sha256').update(JSON.stringify(world.solid)).digest('hex')).toBe(colorBaseline.solidHash);
  const frames=new Set(colorLayout.planted.flatMap(g=>g.placed.map(p=>p.frame)));for(const f of [64,65,66,67,70])expect(frames.has(f),`flower hue ${f}`).toBe(true);
  const paths=raw.layers.find(l=>l.name==='Paths')!.data!,objects=raw.layers.find(l=>l.name==='Objects')!.data!;
  for(const p of colorLayout.planted.flatMap(g=>g.placed)){expect(paths[p.y*192+p.x]).toBe(0);expect(objects[p.y*192+p.x]).toBe(0);expect(bisaBerdiri(world,p.x*16+8,p.y*16+8)).toBe(true);for(const i of world.interaksi)expect(Math.hypot(i.x-(p.x*16+8),i.y-(p.y*16+8))).toBeGreaterThan(i.radius+20);}
 });
 it('freezes integrated UI, mission activities, hooks, Tiko/backend, old maps and assets',()=>{
  expect(baseline.commit).toBe('d4d7d63cd56e09ff9ee670de1190dfbb1c6647e9');
  // UI evolved in main after A5, and runtime docs now describe V3.5; verify historical A5 bytes.
  // Current integrated UI is independently frozen by coast-v35-baseline and its regression test.
  for(const[file,hash]of Object.entries(baseline.hashes))expect(createHash('sha256').update(readFileSync(integrationArchive[file as keyof typeof integrationArchive]??file)).digest('hex'),file).toBe(hash);
  expect([raw.width,raw.height,raw.tilewidth,raw.tileheight]).toEqual([192,144,16,16]);expect(raw.layers).toHaveLength(before.layers.length);expect(raw.tilesets.slice(0,8)).toEqual(before.tilesets);
  for(const name of ['Spawn','Interactions','Regions','FuturePaths','DevelopmentAreas'])expect(raw.layers.find(l=>l.name===name)).toEqual(before.layers.find(l=>l.name===name));
 });
 it('changes no pixel outside the village mask and no collision of any other region',()=>{
  for(const l of before.layers.filter(l=>l.data)){const n=raw.layers.find(n=>n.name===l.name)!;for(let i=0;i<l.data!.length;i++)if(!village(i%192,Math.floor(i/192))&&l.data![i]!==n.data![i])throw Error(`Scope ${l.name}:${i}`);}
  for(const r of regions.filter(r=>r!==desa))expect(raw.layers.find(l=>l.name==='Collisions')!.objects!.filter(o=>overlap(o,r)),r.name).toEqual(before.layers.find(l=>l.name==='Collisions')!.objects!.filter(o=>overlap(o,r)));
 });
 it('preserves all seven complete houses and can walk to every door, mission and household activity area',()=>{
  const {q,seen}=reach();expect(buildings).toHaveLength(7);
  for(const b of buildings){for(const l of before.layers.filter(l=>l.data))for(let dy=0;dy<4;dy++)for(let dx=0;dx<b.width;dx++){const i=(b.y+dy)*192+b.x+dx;expect(raw.layers.find(n=>n.name===l.name)!.data![i],b.name+'/'+l.name).toBe(l.data![i]);}expect(seen.has(`${b.door.x},${b.door.y+1}`),b.name).toBe(true);}
  expect(layout.clusters.filter(c=>!seen.has(c.access.join(','))).map(c=>c.id)).toEqual([]);
  for(const i of world.interaksi)expect(q.some(([x,y])=>interaksiTerdekat(world,x*16+8,y*16+8)?.id===i.id),i.nama).toBe(true);
 });
 it('keeps the tour and all four exit connections on continuous roads',()=>{
  const {seen}=reach(true);expect(layout.tour.filter(t=>!seen.has(t.tile.join(','))).map(t=>t.label)).toEqual([]);
  for(const p of [[77,63],[119,60],[76,97],[120,97],[99,61]])expect(seen.has(p.join(',')),p.join(',')).toBe(true);
 });
 it('simulates bounded current and legacy NPC routes without collision or mission intrusion',()=>{
  const markers=raw.layers.find(l=>l.name==='NPCSpawns')!.objects!;expect(markers).toHaveLength(4);
  for(const old of NPC_PLANS)expect(validateNpcPlan(world,old),'legacy '+old.id).toBe(true);
  for(const m of markers){const p=villageActivity(m,NPC_PLANS.find(p=>p.id===m.name))!;expect(validateNpcPlan(world,p),m.name).toBe(true);const s=makeNpc(p),targets=new Set<number>();
   for(let n=0;n<4500;n++){tickNpc(s,p,world,40,true,{x:0,y:0});targets.add(s.target);if(!bisaBerdiri(world,s.x,s.y)||world.interaksi.some(i=>Math.hypot(i.x-s.x,i.y-s.y)<i.radius+12))throw Error(`Unsafe ${m.name}`);}
   if(p.waypoints.length>1){expect(targets.size,m.name).toBeGreaterThan(1);expect(s.distance).toBeGreaterThan(20);}
  }
 });
 it('retains every crop/recovery tile, the well and Festival clearing',()=>{
  for(const l of before.layers.filter(l=>l.name.startsWith('Recovery_')||l.name.startsWith('Celebration_')))expect(raw.layers.find(n=>n.name===l.name)).toEqual(l);
  for(const name of ['Objects','AbovePlayer','Facades'])for(let y=74;y<=76;y++)for(let x=92;x<=94;x++){const i=y*192+x;expect(raw.layers.find(l=>l.name===name)!.data![i]).toBe(before.layers.find(l=>l.name===name)!.data![i]);}
  for(let y=78;y<=80;y++)for(let x=97;x<=100;x++)expect(bisaBerdiri(world,x*16+8,y*16+8)).toBe(true);
  const restored=structuredClone(raw);for(const l of restored.layers)if(l.name.startsWith('Recovery_')||properti(l,'festival'))l.visible=true;expect(bacaPeta(restored).solid).toEqual(world.solid);
 });
 it('gives new solid props colliders while leaving canopy and laundry passages walkable',()=>{
  for(const o of world.penghalang.filter(o=>o.name.startsWith('a5_')))expect(bisaBerdiri(world,o.x+o.width/2,o.y+o.height/2),o.name).toBe(false);
  expect(bisaBerdiri(world,118*16+8,82*16+8)).toBe(true);
  expect(bisaBerdiri(world,100*16+8,56*16+8)).toBe(true);
  const svg=readFileSync('world/assets/village_a5/props.svg','utf8');expect(svg).not.toMatch(/<image|https?:\/\/(?!www.w3.org\/2000\/svg)/);
 });
});
