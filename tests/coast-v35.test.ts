import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import old from '../public/maps/pulau-tirta-v34-a5.json';
import baseline from '../world/coast-v35-baseline.json';
import layout from '../world/coast-v35.json';
import {bacaPeta,bisaBerdiri,langkahGerak,interaksiTerdekat,properti,type ObjekTiled,type PetaTiled} from '../src/game/map-data';
import {NPC_PLANS,validateNpcPlan} from '../src/game/living-model';
import {villageActivity} from '../src/game/village-activity';
const raw=JSON.parse(readFileSync('public/maps/pulau-tirta-v35.json','utf8')) as PetaTiled,world=bacaPeta(raw),previous=bacaPeta(old);
const regions=old.layers.find(l=>l.name==='Regions')!.objects!,coast=regions.find(o=>o.name==='Pantai Biru')!,others=regions.filter(o=>o!==coast);
const contains=(o:ObjekTiled,x:number,y:number)=>x>=o.x&&x<o.x+o.width&&y>=o.y&&y<o.y+o.height;
const allowed=(x:number,y:number)=>contains(coast,x*16+8,y*16+8)&&!others.some(o=>contains(o,x*16+8,y*16+8));
const fixed=(x:number,y:number)=>(y>=102&&y<=106&&((x>=50&&x<=54)||(x>=61&&x<=65)))||(x>=58&&x<=59&&y>=100&&y<=101)||(x===58&&y===99);
const overlap=(a:ObjekTiled,b:ObjekTiled)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
function reachable(){const q=[[96,79]],seen=new Set(['96,79']);for(let i=0;i<q.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const[x,y]=q[i],nx=x+dx,ny=y+dy,k=nx+','+ny;if(seen.has(k)||!bisaBerdiri(world,nx*16+8,ny*16+8))continue;let p={x:x*16+8,y:y*16+8};for(let n=0;n<8;n++)p=langkahGerak(world,p,dx,dy,2000/86);if(Math.hypot(p.x-(nx*16+8),p.y-(ny*16+8))>.001)continue;seen.add(k);q.push([nx,ny]);}return{q,seen};}
describe('Pantai V3.5 composition, integration and navigation',()=>{
 it('protects all current team source, A5 maps/assets/generators and original hooks',()=>{
  for(const[file,hash]of Object.entries(baseline.hashes))expect(createHash('sha256').update(readFileSync(file)).digest('hex'),file).toBe(hash);
  expect([raw.width,raw.height,raw.tilewidth,raw.tileheight]).toEqual([192,144,16,16]);expect(raw.layers).toHaveLength(old.layers.length);expect(raw.tilesets.slice(0,9)).toEqual(old.tilesets);
  for(const name of ['Spawn','Interactions','Regions','NPCSpawns','FuturePaths','DevelopmentAreas'])expect(raw.layers.find(l=>l.name===name)).toEqual(old.layers.find(l=>l.name===name));
 });
 it('changes no tile, collision or solid mask outside Pantai, including the overlap with A5',()=>{
  for(const l of old.layers.filter(l=>l.data)){const n=raw.layers.find(n=>n.name===l.name)!;for(let i=0;i<l.data!.length;i++)if(!allowed(i%192,Math.floor(i/192))&&l.data![i]!==n.data![i])throw Error(`Scope ${l.name}:${i}`);}
  for(const r of others)expect(world.penghalang.filter(o=>overlap(o,r)),r.name).toEqual(previous.penghalang.filter(o=>overlap(o,r)));
  for(let i=0;i<world.solid.length;i++)if(!allowed(i%192,Math.floor(i/192)))expect(world.solid[i]).toBe(previous.solid[i]);
 });
 it('retains both five-tile basins, their exact recovery, reflector and mission contract',()=>{
  for(const l of old.layers.filter(l=>l.data)){const n=raw.layers.find(n=>n.name===l.name)!;for(let y=99;y<=106;y++)for(let x=49;x<=66;x++)if(fixed(x,y))expect(n.data![y*192+x],l.name+' '+x+','+y).toBe(l.data![y*192+x]);}
  for(const name of ['Kolam batu 50','Kolam batu 61','Cermin pajangan'])expect(world.penghalang.find(o=>o.name===name)).toEqual(previous.penghalang.find(o=>o.name===name));
  expect(world.interaksi.find(i=>i.id==='pantai')).toEqual(previous.interaksi.find(i=>i.id==='pantai'));expect(bisaBerdiri(world,920,1672)).toBe(true);
 });
 it('walks from village spawn to the pier, both pool sides, all coastal tour stops and all missions',()=>{
  const {q,seen}=reachable();expect(layout.tour.filter(t=>!seen.has(t.tile.join(','))).map(t=>t.label)).toEqual([]);
  for(const p of [[52,107],[63,107],[49,104],[66,104],[31,120],[32,119],[38,119],[42,120],[75,98]])expect(seen.has(p.join(',')),p.join(',')).toBe(true);
  for(const i of world.interaksi)expect(q.some(([x,y])=>interaksiTerdekat(world,x*16+8,y*16+8)?.id===i.id),i.nama).toBe(true);
 });
 it('preserves the water silhouette and old bridge footprint while blocking all sea outside decks',()=>{
  const water=raw.layers.find(l=>l.name==='Water')!.data!,oldWater=old.layers.find(l=>l.name==='Water')!.data!,paths=raw.layers.find(l=>l.name==='Paths')!.data!;
  expect(water.map(Boolean)).toEqual(oldWater.map(Boolean));
  const bridges=new Set(raw.tilesets.flatMap(s=>(s.tiles??[]).filter(t=>properti(t,'bridge')===true).map(t=>s.firstgid+t.id))),cells=new Set(layout.oldDeckCells.map(p=>p.join(',')));
  for(let y=82;y<133;y++)for(let x=14;x<76;x++)if(allowed(x,y)){const i=y*192+x;expect(bridges.has(paths[i]),'bridge '+x+','+y).toBe(cells.has(x+','+y));if(water[i]&&!cells.has(x+','+y))expect(bisaBerdiri(world,x*16+8,y*16+8),'sea '+x+','+y).toBe(false);}
 });
 it('keeps decorative props collision-safe, original NPC plans valid and restoration nonphysical',()=>{
  for(const o of world.penghalang.filter(o=>o.name.startsWith('v35_')))expect(bisaBerdiri(world,o.x+o.width/2,o.y+o.height/2),o.name).toBe(false);
  for(const p of NPC_PLANS)expect(validateNpcPlan(world,p),p.id).toBe(true);
  for(const m of raw.layers.find(l=>l.name==='NPCSpawns')!.objects!){const p=villageActivity(m,NPC_PLANS.find(p=>p.id===m.name))!;expect(validateNpcPlan(world,p)).toBe(true);}
  const recovered=structuredClone(raw);for(const l of recovered.layers)if(l.name.startsWith('Recovery_')||properti(l,'festival'))l.visible=true;expect(bacaPeta(recovered).solid).toEqual(world.solid);
  for(const[x,y]of layout.animationAnchors)expect(raw.layers.find(l=>l.name==='Objects')!.data![y*192+x]).toBe(old.layers.find(l=>l.name==='Objects')!.data![y*192+x]);
 });
 it('reproduces the authored Tiled map, local atlas and manifest without changing files',()=>{
  expect(()=>execFileSync(process.execPath,['scripts/design-pantai-v35.mjs','--check'],{encoding:'utf8'})).not.toThrow();
 });
});
