import {describe,it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import old from '../public/maps/pulau-tirta-v36-r2-structure.json';
import design from '../world/mountain-v36-r3.json';
import baseline from '../world/mountain-v36-r3-baseline.json';
import forest from '../world/forest-v38-r4.json';
import valley from '../world/valley-v37-r2.json';
import puncakArchive from '../public/maps/pulau-tirta-v36-r3.json';
import {bacaPeta,bisaBerdiri,langkahGerak,interaksiTerdekat,misiPemulihan,properti,RADIUS_PEMAIN,type ObjekTiled,type PetaTiled} from '../src/game/map-data';
import {NPC_PLANS,validateNpcPlan} from '../src/game/living-model';
// @ts-expect-error Repo-native graphics generator intentionally has no build dependency.
import {mountainAtlas,FIRST,PATH,STAIRS} from '../scripts/puncak-v36-r3-art.mjs';

const raw=puncakArchive as PetaTiled,DUNIA=bacaPeta(raw),previous=bacaPeta(old),L=(m:PetaTiled,n:string)=>m.layers.find(l=>l.name===n)!;
const regions=L(old,'Regions').objects!,mountain=regions.find(r=>r.name==='Puncak Kabut')!;
const contains=(r:ObjekTiled,x:number,y:number)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x:number,y:number)=>contains(mountain,x*16+8,y*16+8)&&!regions.some(r=>r!==mountain&&contains(r,x*16+8,y*16+8));
const overlap=(a:ObjekTiled,b:ObjekTiled)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
const step=2,nx=mountain.width/step,ny=mountain.height/step,size=nx*ny,free=new Uint8Array(size);
for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)free[y*nx+x]=Number(bisaBerdiri(DUNIA,mountain.x+x*step+1,mountain.y+y*step+1));
function exteriorReach(closed?:typeof design.gates[number]){
 const seen=new Uint8Array(size),queue=new Int32Array(size),cells=new Set(design.playableCells.map(([x,y])=>y*192+x));
 let head=0,tail=0,inside=false,mission=false,summit=false;
 const add=(i:number)=>{if(!free[i]||seen[i])return;const x=mountain.x+i%nx*step+1,y=mountain.y+Math.floor(i/nx)*step+1;
  if(closed&&x+RADIUS_PEMAIN>closed.x&&x-RADIUS_PEMAIN<closed.x+closed.width&&y+RADIUS_PEMAIN>closed.y&&y-RADIUS_PEMAIN<closed.y+closed.height)return;
  seen[i]=1;queue[tail++]=i;};
 // Include every boundary and the entire overlapping Desa edge, rather than a single spawn.
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)if(!x||!y||x===nx-1||y===ny-1||regions.some(r=>r!==mountain&&contains(r,mountain.x+x*step+1,mountain.y+y*step+1)))add(y*nx+x);
 while(head<tail){const i=queue[head++],x=i%nx,y=Math.floor(i/nx),px=mountain.x+x*step+1,py=mountain.y+y*step+1;
  if(cells.has(Math.floor(py/16)*192+Math.floor(px/16)))inside=true;
  if(Math.hypot(px-design.mission.x,py-design.mission.y)<=design.mission.radius)mission=true;
  if(Math.hypot(px-design.viewpoint[0]*16-8,py-design.viewpoint[1]*16-8)<8)summit=true;
  // This deliberately permits more diagonal motion than the swept runtime movement.
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&x+dx>=0&&x+dx<nx&&y+dy>=0&&y+dy<ny)add((y+dy)*nx+x+dx);
 }return{inside,mission,summit};
}
function follow(points:number[][]){let p={x:points[0][0]*16+8,y:points[0][1]*16+8};
 for(const[x,y]of points){const target={x:x*16+8,y:y*16+8};
  for(let n=0;n<1200&&Math.hypot(p.x-target.x,p.y-target.y)>.01;n++){
   const dx=target.x-p.x,dy=target.y-p.y,next=langkahGerak(DUNIA,p,dx,dy,Math.min(2,Math.hypot(dx,dy))*1000/86);
   if(Math.hypot(next.x-p.x,next.y-p.y)<.001)break;p=next;
  }expect(Math.hypot(p.x-target.x,p.y-target.y),`route ${x},${y}`).toBeLessThan(.01);
 }return p;
}

describe('Puncak R3 natural mountain art and safe integrated ascent',()=>{
 it('uses the latest integrated source and preserves all R2 structure work and existing team baselines',()=>{
  for(const[file,h]of Object.entries(baseline.hashes))expect(createHash('sha256').update(readFileSync(file)).digest('hex'),file).toBe(h);
  expect(design.source).toBe('world/maps/pulau_tirta_v36_r2_structure.tmj');
  expect(properti(raw,'worldVersion')).toBe(design.version);
  expect([raw.width,raw.height,raw.tilewidth,raw.tileheight]).toEqual([192,144,16,16]);
  expect(raw.tilesets.slice(0,-1)).toEqual(old.tilesets);expect(DUNIA.spawn).toEqual(previous.spawn);
  expect(DUNIA.interaksi).toEqual(previous.interaksi);expect(DUNIA.interaksi.find(i=>i.id==='puncak')).toMatchObject({misiId:'misi-2',x:968,y:696,radius:36});
 });
 it('changes no pixel or object outside the mountain, and preserves all other region collisions exactly',()=>{
  for(const l of old.layers){const n=L(raw,l.name);if(l.name==='Collisions')continue;
   if(!design.changedLayers.includes(l.name)){expect(n,l.name).toEqual(l);continue;}
   const {data:_,...meta}=l,{data:__,...next}=n;expect(next).toEqual(meta);
   for(let i=0;i<l.data!.length;i++)if(l.data![i]!==n.data![i])expect(allowed(i%192,Math.floor(i/192)),`${l.name}:${i}`).toBe(true);
  }
  const added=raw.layers.filter(l=>!old.layers.some(b=>b.name===l.name));expect(added.map(l=>l.name)).toEqual(['Mountain_V36R3_Natural_Rock']);
  for(let i=0;i<added[0].data!.length;i++)if(added[0].data![i])expect(allowed(i%192,Math.floor(i/192))).toBe(true);
  const removed=new Set(design.removedLocalBodies),retained=L(old,'Collisions').objects!.filter(b=>!removed.has(b.name));
  expect(L(raw,'Collisions').objects!.slice(0,retained.length)).toEqual(retained);
  for(const b of L(old,'Collisions').objects!.filter(b=>removed.has(b.name))){
   expect(allowed(Math.floor(b.x/16),Math.floor(b.y/16))).toBe(true);
   expect(allowed(Math.floor((b.x+b.width-.01)/16),Math.floor((b.y+b.height-.01)/16))).toBe(true);
  }
  for(const r of regions.filter(r=>r!==mountain))expect(L(raw,'Collisions').objects!.filter(b=>overlap(b,r)),r.name).toEqual(L(old,'Collisions').objects!.filter(b=>overlap(b,r)));
 });
 it('uses separate polygon plateaus and directional cliff faces, with an open western rest terrace',()=>{
  expect(design.plateaus.map(p=>p.id)).toEqual(['foot','middle','summit']);
  expect(design.walls.some(w=>w.kind==='south-face')).toBe(true);
  expect(design.walls.some(w=>w.kind==='west-face')).toBe(true);
  expect(design.walls.some(w=>w.kind==='scree')).toBe(true);
  for(const[y,left,right]of[[49,46,52],[42,55,64]]){
   const count=Array.from({length:right-left+1},(_,k)=>Number(bisaBerdiri(DUNIA,(left+k)*16+8,y*16+8))).reduce((a,b)=>a+b,0);
   expect(count).toBeGreaterThanOrEqual(6);
  }
  for(const name of['Mountain_V36R2_Ridges','Mountain_V36R1_Rim','Mountain_V36R1_Shadow'])expect(L(raw,name).data!.filter((g,i)=>g&&allowed(i%192,Math.floor(i/192)))).toEqual([]);
 });
 it('walks the official trail through rest/observation to the summit and returns along it without becoming trapped',()=>{
  const route=design.stages.flatMap(s=>s.points);follow(route);follow([...route].reverse());
  for(const[x,y]of route)expect(L(raw,'Paths').data![y*192+x],`visible path ${x},${y}`).toBeGreaterThan(0);
  expect(design.stages.map(s=>s.id)).toEqual(['foothills','rest','observation','summit']);
  expect(bisaBerdiri(DUNIA,45*16+8,51*16+8)).toBe(true);
  expect(DUNIA.penghalang.find(b=>b.name==='v36_r3_rest_bench')).toBeDefined();
 });
 it('has one exterior entrance and blocks both terrace shortcuts, diagonal seams and interaction through cliffs',()=>{
  expect(exteriorReach()).toEqual({inside:true,mission:true,summit:true});
  expect(exteriorReach(design.gates[0])).toEqual({inside:false,mission:false,summit:false});
  for(const gate of design.gates.slice(1))expect(exteriorReach(gate),gate.id).toEqual({inside:true,mission:false,summit:false});
 });
 it('matches every new rock collider to fully opaque visible rock and stops held movement at exposed faces',()=>{
  const atlas=mountainAtlas(),data=L(raw,'Mountain_V36R3_Natural_Rock').data!;
  expect(data.filter(Boolean)).toHaveLength(design.walls.length);let probes=0;
  for(const w of design.walls){const b=DUNIA.penghalang.find(b=>b.name===w.collider)!;
   expect([b.x,b.y,b.width,b.height]).toEqual([w.x*16,w.y*16,16,16]);expect(data[w.y*192+w.x]).toBe(w.gid);
   expect(L(raw,'Paths').data![w.y*192+w.x]).toBe(0);
   if(w.kind!=='scree')for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    const ax=w.frame%32*16+x,ay=Math.floor(w.frame/32)*16+y;expect(atlas.pixels[(ay*atlas.width+ax)*4+3]).toBe(255);
   }
   for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){let p={x:(w.x+dx)*16+8,y:(w.y+dy)*16+8};if(!bisaBerdiri(DUNIA,p.x,p.y))continue;
    for(let n=0;n<45;n++)p=langkahGerak(DUNIA,p,-dx,-dy,40);
    expect(overlap({name:'feet',x:p.x-4.6,y:p.y-4.6,width:9.2,height:9.2},b)).toBe(false);probes++;
   }
  }expect(probes).toBeGreaterThan(100);
 });
 it('shrinks only the timber platform while retaining station equipment, windsock, recovery and Living World anchors',()=>{
  expect(design.deck.cells).toHaveLength(13);expect(design.deck.previous.cells).toBe(35);
  for(const name of['Objects','AbovePlayer'])for(let y=38;y<=40;y++)for(let x=60;x<=61;x++)expect(L(raw,name).data![y*192+x]).toBe(L(old,name).data![y*192+x]);
  for(let y=39;y<=40;y++)for(let x=57;x<=58;x++)expect(L(raw,'Objects').data![y*192+x]).toBe(L(old,'Objects').data![y*192+x]);
  for(const name of['v32_experiment_table','v32_windsock'])expect(DUNIA.penghalang.find(b=>b.name===name)).toEqual(previous.penghalang.find(b=>b.name===name));
  for(const[x,y]of[[35,51],[47,44],[69,40]])expect(L(raw,'Objects').data![y*192+x]).toBe(L(old,'Objects').data![y*192+x]);
  expect(L(raw,'Mountain_Mist_V32')).toEqual(L(old,'Mountain_Mist_V32'));
  for(const l of old.layers.filter(l=>misiPemulihan(l)))expect(L(raw,l.name),l.name).toEqual(l);
  const recovered=structuredClone(raw);for(const l of recovered.layers)if(misiPemulihan(l))l.visible=true;
  expect(bacaPeta(recovered).solid).toEqual(DUNIA.solid);expect(bacaPeta(recovered).penghalang).toEqual(DUNIA.penghalang);
 });
 it('marks the reachable north viewpoint as a higher visual crown beyond the unchanged mission station',()=>{
  const E=L(raw,'Environment_V32').data!,P=L(raw,'Paths').data!,i=(x:number,y:number)=>y*192+x;
  expect(E[i(58,36)]).toBeGreaterThan(E[i(60,43)]);
  expect(design.viewpointCrown.some(([x,y])=>x===58&&y===36)).toBe(true);
  expect(design.summitTread.length).toBeGreaterThanOrEqual(2);
  for(const[x,y]of design.summitTread){expect(y).toBe(38);expect(P[i(x,y)]).toBeGreaterThan(0);expect(bisaBerdiri(DUNIA,x*16+8,y*16+8)).toBe(true);}
 });
 it('retains spawn access to every mission, forest crossing, valley basin and existing NPC plan',()=>{
  const q=[[Math.floor(DUNIA.spawn.x/16),Math.floor(DUNIA.spawn.y/16)]],seen=new Set([q[0].join(',')]);
  for(let i=0;i<q.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
   const[x,y]=q[i],nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(seen.has(k)||!bisaBerdiri(DUNIA,nx*16+8,ny*16+8))continue;
   let p={x:x*16+8,y:y*16+8};for(let n=0;n<8;n++)p=langkahGerak(DUNIA,p,dx,dy,2000/86);
   if(Math.hypot(p.x-(nx*16+8),p.y-(ny*16+8))>.001)continue;seen.add(k);q.push([nx,ny]);
  }
  expect([...design.validationTargets,...forest.validationTargets,...valley.validationTargets].filter(p=>!seen.has(p.join(',')))).toEqual([]);
  for(const p of DUNIA.interaksi)expect(q.some(([x,y])=>interaksiTerdekat(DUNIA,x*16+8,y*16+8)?.id===p.id),p.id).toBe(true);
  for(const p of NPC_PLANS)expect(validateNpcPlan(DUNIA,p),p.id).toBe(true);
 });
 it('exports a sharp local PNG identical to the SVG pixel source, with connected modular rock edges',()=>{
  const atlas=mountainAtlas(),png=readFileSync('world/assets/mountain_v36_r3/tileset.png');expect(png).toEqual(atlas.png);
  expect(readFileSync('world/assets/mountain_v36_r3/tileset.svg','utf8')).toBe(atlas.svg);
  expect([...png.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
  const idat:Buffer[]=[];for(let offset=8;offset<png.length;){const len=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8);if(type==='IDAT')idat.push(png.subarray(offset+8,offset+8+len));offset+=12+len;}
  const raster=inflateSync(Buffer.concat(idat));for(let y=0;y<atlas.height;y++)expect(raster.subarray(y*(atlas.width*4+1)+1,(y+1)*(atlas.width*4+1))).toEqual(atlas.pixels.subarray(y*atlas.width*4,(y+1)*atlas.width*4));
  const pixel=(frame:number,x:number,y:number)=>atlas.pixels.subarray(((Math.floor(frame/32)*16+y)*atlas.width+frame%32*16+x)*4,((Math.floor(frame/32)*16+y)*atlas.width+frame%32*16+x)*4+4);
  for(let tier=0;tier<3;tier++)for(let a=0;a<3;a++)for(let b=0;b<3;b++){
   for(const ns of[0,1,4,5])for(let y=0;y<16;y++)expect(pixel(tier*48+a*16+ns+2,15,y)).toEqual(pixel(tier*48+b*16+ns+8,0,y));
   for(const ew of[0,2,8,10])for(let x=0;x<16;x++)expect(pixel(tier*48+a*16+ew+4,x,15)).toEqual(pixel(tier*48+b*16+ew+1,x,0));
  }
  expect(L(raw,'Paths').data!.some(g=>g>=FIRST+PATH&&g<FIRST+PATH+32)).toBe(true);
  expect(L(raw,'Paths').data![54*192+48]).toBe(FIRST+STAIRS);
 });
 it('loads only local existing/new assets and reproduces map, raster, tileset and runtime export without writes',()=>{
  expect(raw.tilesets.at(-1)).toMatchObject({name:'mountain_v36_r3',firstgid:FIRST,tilewidth:16,tileheight:16,columns:32,tilecount:320,image:'../assets/world/mountain_v36_r3/tileset.png',tiles:[]});
  for(const set of raw.tilesets)expect(existsSync(resolve('public/maps',set.image)),set.name).toBe(true);
  expect(()=>execFileSync(process.execPath,['scripts/natural-puncak-v36-r3.mjs','--check'],{encoding:'utf8'})).not.toThrow();
  expect(()=>execFileSync(process.execPath,['scripts/export-world.mjs','--check'],{encoding:'utf8'})).not.toThrow();
 });
});
