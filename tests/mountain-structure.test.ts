import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import old from '../public/maps/pulau-tirta-v37-r2.json';
import design from '../world/mountain-v36-r2-structure.json';
import forest from '../world/forest-v38-r4.json';
import valley from '../world/valley-v37-r2.json';
import structure from '../public/maps/pulau-tirta-v36-r2-structure.json';
import {bacaPeta,bisaBerdiri,langkahGerak,interaksiTerdekat,misiPemulihan,properti,RADIUS_PEMAIN,type ObjekTiled,type PetaTiled} from '../src/game/map-data';
import {NPC_PLANS,validateNpcPlan} from '../src/game/living-model';

// Frozen structure revision; R3 validates the active map and preservation independently.
const raw=structure as PetaTiled,DUNIA=bacaPeta(raw),previous=bacaPeta(old);
const L=(m:PetaTiled,n:string)=>m.layers.find(l=>l.name===n)!;
const regions=L(old,'Regions').objects!,mountain=regions.find(r=>r.name==='Puncak Kabut')!;
const contains=(r:ObjekTiled,x:number,y:number)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x:number,y:number)=>contains(mountain,x*16+8,y*16+8)&&!regions.some(r=>r!==mountain&&contains(r,x*16+8,y*16+8));
const overlap=(a:ObjekTiled,b:ObjekTiled)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;

// Conservative 2px, eight-direction flood over actual player-radius collision. If even this
// more permissive traversal cannot bypass a gate, the swept movement cannot cut the cliff.
const step=2,nx=mountain.width/step,ny=mountain.height/step,size=nx*ny,free=new Uint8Array(size);
for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)free[y*nx+x]=Number(bisaBerdiri(DUNIA,mountain.x+x*step+1,mountain.y+y*step+1));
function exteriorReach(closed?:typeof design.gates[number]){
 const seen=new Uint8Array(size),queue=new Int32Array(size),cells=new Set(design.playableCells.map(([x,y])=>y*192+x));
 let head=0,tail=0,inside=false,mission=false,summit=false;
 const add=(i:number)=>{if(!free[i]||seen[i])return;const x=mountain.x+i%nx*step+1,y=mountain.y+Math.floor(i/nx)*step+1;
  if(closed&&x+RADIUS_PEMAIN>closed.x&&x-RADIUS_PEMAIN<closed.x+closed.width&&y+RADIUS_PEMAIN>closed.y&&y-RADIUS_PEMAIN<closed.y+closed.height)return;
  seen[i]=1;queue[tail++]=i;};
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)if(!x||!y||x===nx-1||y===ny-1||regions.some(r=>r!==mountain&&contains(r,mountain.x+x*step+1,mountain.y+y*step+1)))add(y*nx+x);
 while(head<tail){const i=queue[head++],x=i%nx,y=Math.floor(i/nx),px=mountain.x+x*step+1,py=mountain.y+y*step+1;
  if(cells.has(Math.floor(py/16)*192+Math.floor(px/16)))inside=true;
  if(Math.hypot(px-design.mission.x,py-design.mission.y)<=design.mission.radius)mission=true;
  if(Math.hypot(px-(design.viewpoint[0]*16+8),py-(design.viewpoint[1]*16+8))<8)summit=true;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&x+dx>=0&&x+dx<nx&&y+dy>=0&&y+dy<ny)add((y+dy)*nx+x+dx);
 }return{inside,mission,summit};
}

describe('Puncak Kabut broad terraces and readable mountain ascent',()=>{
 it('activates the structure map without altering dimensions, location IDs, mission coordinates or tilesets',()=>{
  expect(properti(raw,'worldVersion')).toBe(design.version);
  expect([raw.width,raw.height,raw.tilewidth,raw.tileheight]).toEqual([192,144,16,16]);
  expect(raw.tilesets).toEqual(old.tilesets);expect(DUNIA.interaksi).toEqual(previous.interaksi);expect(DUNIA.spawn).toEqual(previous.spawn);
  expect(DUNIA.interaksi.find(i=>i.id==='puncak')).toMatchObject({misiId:'misi-2',x:968,y:696,radius:36});
 });
 it('changes only local mountain terrain and preserves every pixel and collider of all other regions',()=>{
  expect(raw.layers.map(l=>l.name)).toEqual(old.layers.map(l=>l.name));
  for(const l of old.layers){const n=L(raw,l.name);
   if(l.name==='Collisions')continue;
   if(!design.changedLayers.includes(l.name)){expect(n,l.name).toEqual(l);continue;}
   const {data:_,...meta}=l,{data:__,...next}=n;expect(next).toEqual(meta);
   for(let i=0;i<l.data!.length;i++)if(l.data![i]!==n.data![i])expect(allowed(i%192,Math.floor(i/192)),`${l.name}:${i}`).toBe(true);
  }
  const removed=new Set(design.removedTerrainBodies),kept=L(old,'Collisions').objects!.filter(b=>!removed.has(b.name));
  expect(L(raw,'Collisions').objects!.slice(0,kept.length)).toEqual(kept);
  for(const b of L(old,'Collisions').objects!.filter(b=>removed.has(b.name))){
   expect(b.name.startsWith('v36_r2_ridge_')||b.name.startsWith('v32_cliff_')).toBe(true);
   expect(allowed(Math.floor(b.x/16),Math.floor(b.y/16))).toBe(true);
   expect(allowed(Math.floor((b.x+b.width-.01)/16),Math.floor((b.y+b.height-.01)/16))).toBe(true);
  }
  for(const r of regions.filter(r=>r!==mountain))expect(L(raw,'Collisions').objects!.filter(b=>overlap(b,r)),r.name).toEqual(L(old,'Collisions').objects!.filter(b=>overlap(b,r)));
 });
 it('replaces trail-hugging walls with open terraces and only two internal cliff bands',()=>{
  const internal=design.walls.filter(w=>w.kind==='terrace');
  expect([...new Set(internal.map(w=>w.y))].sort()).toEqual([47,55]);
  expect(design.playableCells.length).toBeGreaterThan(650);
  expect(design.walls.length).toBeLessThan(design.removedTerrainBodies.length*.6);
  // Broad lateral clearings are deliberate: neither side of the primary route is a tight wall.
  for(const[y,left,right]of[[59,40,65],[51,40,66],[45,50,66]]){
   const open=Array.from({length:right-left+1},(_,k)=>Number(bisaBerdiri(DUNIA,(left+k)*16+8,y*16+8))).reduce((a,b)=>a+b,0);
   expect(open,`terrace y=${y}`).toBeGreaterThan((right-left)*.8);
  }
  const cells=new Set(design.playableCells.map(([x,y])=>y*192+x));
  for(const w of design.walls.filter(w=>w.kind==='outer-edge')){
   expect(cells.has(w.y*192+w.x)).toBe(false);
   expect([-1,0,1].some(dy=>[-1,0,1].some(dx=>cells.has((w.y+dy)*192+w.x+dx)))).toBe(true);
  }
  expect(L(raw,'Paths').data![42*192+38]).toBe(0); // old long west spur is no longer a competing route
 });
 it('walks the complete staged centreline through the station to the northern viewpoint using real movement',()=>{
  let p={x:design.stages[0].points[0][0]*16+8,y:design.stages[0].points[0][1]*16+8};
  for(const s of design.stages)for(const[x,y]of s.points){
   const target={x:x*16+8,y:y*16+8};
   for(let n=0;n<1200&&Math.hypot(p.x-target.x,p.y-target.y)>.01;n++){
    const dx=target.x-p.x,dy=target.y-p.y,dist=Math.hypot(dx,dy),next=langkahGerak(DUNIA,p,dx,dy,Math.min(2,dist)*1000/86);
    if(Math.hypot(next.x-p.x,next.y-p.y)<.001)break;p=next;
   }
   expect(Math.hypot(p.x-target.x,p.y-target.y),`${s.id}:${x},${y}`).toBeLessThan(.01);
   expect(L(raw,'Paths').data![y*192+x],`${s.id} visible trail`).toBeGreaterThan(0);
  }
  expect(design.stages.map(s=>s.id)).toEqual(['foothills','middle','checkpoint','summit']);
  expect(design.stages.at(-1)!.points.at(-1)).toEqual(design.viewpoint);
 });
 it('has exactly one exterior entrance and cannot bypass either stair through a cliff or diagonal seam',()=>{
  expect(exteriorReach()).toEqual({inside:true,mission:true,summit:true});
  expect(exteriorReach(design.gates[0])).toEqual({inside:false,mission:false,summit:false});
  for(const gate of design.gates.slice(1))expect(exteriorReach(gate),gate.id).toEqual({inside:true,mission:false,summit:false});
 });
 it('keeps every mission, forest bridge, valley basin approach and NPC route reachable from spawn',()=>{
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
 it('matches all new local bodies to visible cliff tiles and stops held input at their faces',()=>{
  let probes=0;
  for(const w of design.walls){const b=DUNIA.penghalang.find(b=>b.name===w.collider)!;
   expect([b.x,b.y,b.width,b.height]).toEqual([w.x*16,w.y*16,w.width*16,w.height*16]);
   expect(allowed(w.x,w.y)).toBe(true);expect(properti(b,'collides')).toBe(true);
   const layer=L(raw,w.kind==='terrace'?'Objects':'Mountain_V36R2_Ridges');
   for(let dy=0;dy<w.height;dy++){expect(layer.data![(w.y+dy)*192+w.x]).toBeGreaterThan(0);expect(L(raw,'Paths').data![(w.y+dy)*192+w.x]).toBe(0);}
   for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
    let p={x:(w.x+dx)*16+8,y:(w.y+dy)*16+8};if(!bisaBerdiri(DUNIA,p.x,p.y))continue;
    for(let n=0;n<45;n++)p=langkahGerak(DUNIA,p,-dx,-dy,40);
    expect(overlap({name:'feet',x:p.x-4.6,y:p.y-4.6,width:9.2,height:9.2},b)).toBe(false);probes++;
   }
  }expect(probes).toBeGreaterThan(100);
 });
 it('preserves experiment props, station deck, recovery and deterministic export with existing assets only',()=>{
  for(const n of['Objects','AbovePlayer','Mountain_V36_Detail'])for(let y=37;y<=41;y++)for(let x=55;x<=61;x++)expect(L(raw,n).data![y*192+x]).toBe(L(old,n).data![y*192+x]);
  for(const l of old.layers.filter(l=>misiPemulihan(l)))expect(L(raw,l.name),l.name).toEqual(l);
  const recovered=structuredClone(raw);for(const l of recovered.layers)if(misiPemulihan(l))l.visible=true;
  expect(bacaPeta(recovered).penghalang).toEqual(DUNIA.penghalang);expect(bacaPeta(recovered).solid).toEqual(DUNIA.solid);
  expect(()=>execFileSync(process.execPath,['scripts/structure-puncak-v36-r2.mjs','--check'],{encoding:'utf8'})).not.toThrow();
  expect(()=>execFileSync(process.execPath,['scripts/export-world.mjs','--check'],{encoding:'utf8'})).not.toThrow();
  expect(JSON.parse(readFileSync(design.source,'utf8')).layers).toEqual(old.layers);
 });
});
