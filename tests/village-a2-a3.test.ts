import {describe,it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import old from '../public/maps/pulau-tirta-v34-a11.json';
import buildings from '../world/buildings-v34-a1.json';
import baseline from '../world/village-a2-a3-baseline.json';
import {bacaPeta,bisaBerdiri,langkahGerak,interaksiTerdekat,properti,type PetaTiled,type ObjekTiled} from '../src/game/map-data';
import {NPC_PLANS,validateNpcPlan,makeNpc,tickNpc} from '../src/game/living-model';
const stages=['a2','a3'].filter(s=>existsSync(`public/maps/pulau-tirta-v34-${s}.json`));
const regions=old.layers.find(l=>l.name==='Regions')!.objects!,desa=regions.find(o=>o.name==='Desa Tirta')!,missions=regions.filter(o=>o!==desa);
const contains=(o:ObjekTiled,x:number,y:number)=>x>=o.x&&x<o.x+o.width&&y>=o.y&&y<o.y+o.height;
const village=(x:number,y:number)=>contains(desa,x*16+8,y*16+8)&&!missions.some(o=>contains(o,x*16+8,y*16+8));
const core=(x:number,y:number)=>x>=79&&x<108&&y>=71&&y<85;
const overlap=(a:ObjekTiled,b:ObjekTiled)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
describe.each(stages)('Village %s',stage=>{
 const raw=JSON.parse(readFileSync(`public/maps/pulau-tirta-v34-${stage}.json`,'utf8')) as PetaTiled,world=bacaPeta(raw);
 const manifest=JSON.parse(readFileSync(`world/village-${stage}.json`,'utf8')) as {tour:{label:string;tile:number[]}[]};
 it('preserves prior work, gameplay, NPC and mission/backend sources',()=>{
  for(const[file,hash]of Object.entries(baseline))expect(createHash('sha256').update(readFileSync(file)).digest('hex'),file).toBe(hash);
  expect([raw.width,raw.height]).toEqual([192,144]);expect(raw.tilesets).toEqual(old.tilesets);
  for(const name of ['Spawn','Interactions','Regions','NPCSpawns','FuturePaths','DevelopmentAreas'])expect(raw.layers.find(l=>l.name===name)).toEqual(old.layers.find(l=>l.name===name));
 });
 it('keeps every tile and collision of all four mission regions identical, including overlaps',()=>{
  for(const l of old.layers.filter(l=>l.data)){
   const n=raw.layers.find(n=>n.name===l.name)!;
   for(let i=0;i<l.data!.length;i++)if((!village(i%192,Math.floor(i/192))||core(i%192,Math.floor(i/192)))&&l.data![i]!==n.data![i])throw Error(`scope ${l.name} ${i}`);
  }
  const before=old.layers.find(l=>l.name==='Collisions')!.objects!,after=raw.layers.find(l=>l.name==='Collisions')!.objects!;
  for(const region of missions)expect(after.filter(o=>overlap(o,region)),region.name).toEqual(before.filter(o=>overlap(o,region)));
 });
 it('preserves seven complete houses and reaches every door, garden and mission using real movement',()=>{
  expect(buildings).toHaveLength(7);
  for(const b of buildings)for(const name of ['Objects','AbovePlayer','Facades'])for(let dy=0;dy<4;dy++)for(let dx=0;dx<b.width;dx++){
   const i=(b.y+dy)*192+b.x+dx;expect(raw.layers.find(l=>l.name===name)!.data![i],b.name).toBe(old.layers.find(l=>l.name===name)!.data![i]);
  }
  const q=[[96,79]],seen=new Set(['96,79']);
  for(let i=0;i<q.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
   const[x,y]=q[i],nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(seen.has(k)||!bisaBerdiri(world,nx*16+8,ny*16+8))continue;
   let p={x:x*16+8,y:y*16+8};for(let n=0;n<8;n++)p=langkahGerak(world,p,dx,dy,2000/86);
   if(Math.hypot(p.x-(nx*16+8),p.y-(ny*16+8))>.001)continue;seen.add(k);q.push([nx,ny]);
  }
  for(const b of buildings)expect(seen.has(`${b.door.x},${b.door.y+1}`),b.name).toBe(true);
  const local=manifest.tour.filter(t=>!t.label.startsWith('Gerbang')&&t.label!=='Jalan utara');
  for(const t of stage==='a3'?manifest.tour:local)expect(seen.has(t.tile.join(',')),t.label).toBe(true);
  for(const t of world.interaksi)expect(q.some(([x,y])=>interaksiTerdekat(world,x*16+8,y*16+8)?.id===t.id),t.nama).toBe(true);
 });
 it('keeps bounded waypoint NPCs collision-safe for three minutes and retains the recovery contract',()=>{
  for(const p of NPC_PLANS){expect(validateNpcPlan(world,p),p.id).toBe(true);const s=makeNpc(p);for(let n=0;n<4500;n++){tickNpc(s,p,world,40,true,{x:0,y:0});if(!bisaBerdiri(world,s.x,s.y))throw Error(`NPC collision ${p.id}`);}}
  expect(raw.layers.filter(l=>l.name.startsWith('Recovery_'))).toHaveLength(16);expect(raw.layers.filter(l=>properti(l,'festival'))).toHaveLength(3);
  const after=structuredClone(raw);for(const l of after.layers)if(l.name.startsWith('Recovery_')||properti(l,'festival'))l.visible=true;
  expect(bacaPeta(after).solid).toEqual(world.solid);
  for(const o of world.penghalang.filter(o=>o.name.startsWith(stage+'_')))expect(bisaBerdiri(world,o.x+o.width/2,o.y+o.height/2),o.name).toBe(false);
 });
 if(stage==='a3')it('connects the complete walkthrough through road cells without entering another mission region',()=>{
  const roads=raw.layers.find(l=>l.name==='Paths')!.data!,q=[[96,79]],seen=new Set(['96,79']);
  for(let i=0;i<q.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
   const[x,y]=q[i],nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(!village(nx,ny)||!roads[ny*192+nx]||seen.has(k)||!bisaBerdiri(world,nx*16+8,ny*16+8))continue;
   let p={x:x*16+8,y:y*16+8};for(let n=0;n<8;n++)p=langkahGerak(world,p,dx,dy,2000/86);
   if(Math.hypot(p.x-(nx*16+8),p.y-(ny*16+8))>.001)continue;seen.add(k);q.push([nx,ny]);
  }
  expect(manifest.tour.filter(t=>!seen.has(t.tile.join(','))).map(t=>t.label)).toEqual([]);
 });
});
