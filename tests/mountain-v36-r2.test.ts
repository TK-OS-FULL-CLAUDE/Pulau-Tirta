import{describe,it,expect}from'vitest';
import{readFileSync,existsSync}from'node:fs';
import{createHash}from'node:crypto';
import{execFileSync}from'node:child_process';
import{resolve}from'node:path';
import baseline from'../world/mountain-v36-r2-baseline.json';
import design from'../world/mountain-v36-r2.json';
import forest from'../world/forest-v38-r4.json';
import{bacaPeta,bisaBerdiri,interaksiTerdekat,langkahGerak,misiPemulihan,properti,RADIUS_PEMAIN,type PetaTiled,type ObjekTiled}from'../src/game/map-data';
import{NPC_PLANS,validateNpcPlan}from'../src/game/living-model';
const old=JSON.parse(readFileSync('public/maps/pulau-tirta-v36-r1.json','utf8'))as PetaTiled;
const raw=JSON.parse(readFileSync('public/maps/pulau-tirta-v36-r2.json','utf8'))as PetaTiled;
// Frozen R2 archive; the current revision verifies its own active map and preservation of R2.
const PETA_RUNTIME=raw,DUNIA=bacaPeta(raw);
const previous=bacaPeta(old),L=(m:PetaTiled,n:string)=>m.layers.find(l=>l.name===n)!;
const regions=L(old,'Regions').objects!,mountain=regions.find(r=>r.name==='Puncak Kabut')!,others=regions.filter(r=>r!==mountain);
const contains=(r:ObjekTiled,x:number,y:number)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x:number,y:number)=>contains(mountain,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8));
function walk(){const q=[[Math.floor(DUNIA.spawn.x/16),Math.floor(DUNIA.spawn.y/16)]],seen=new Set([q[0].join(',')]);
 for(let i=0;i<q.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const[x,y]=q[i],nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(seen.has(k)||!bisaBerdiri(DUNIA,nx*16+8,ny*16+8))continue;let p={x:x*16+8,y:y*16+8};for(let n=0;n<8;n++)p=langkahGerak(DUNIA,p,dx,dy,2000/86);if(Math.hypot(p.x-(nx*16+8),p.y-(ny*16+8))>.001)continue;seen.add(k);q.push([nx,ny]);}
 return{q,seen};
}
// Fine 2px traversal covers every region edge AND the overlapping Desa boundary. Eight-way
// adjacency deliberately overestimates possible corner motion: no path here means no bypass.
// The same real radius/colliders used by the game generate this bitmap, not a Paths-only flood.
const step=2,nx=mountain.width/step,ny=mountain.height/step,size=nx*ny,free=new Uint8Array(size);
for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)free[y*nx+x]=Number(bisaBerdiri(DUNIA,mountain.x+x*step+1,mountain.y+y*step+1));
function exteriorReach(closed?:typeof design.gates[number]){
 const seen=new Uint8Array(size),queue=new Int32Array(size);let head=0,tail=0;
 const blocked=(i:number)=>{if(!closed)return false;const px=mountain.x+(i%nx)*step+1,py=mountain.y+Math.floor(i/nx)*step+1;return px+RADIUS_PEMAIN>closed.x&&px-RADIUS_PEMAIN<closed.x+closed.width&&py+RADIUS_PEMAIN>closed.y&&py-RADIUS_PEMAIN<closed.y+closed.height;};
 const add=(i:number)=>{if(free[i]&&!seen[i]&&!blocked(i)){seen[i]=1;queue[tail++]=i;}};
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)if(!x||!y||x===nx-1||y===ny-1||others.some(r=>contains(r,mountain.x+x*step+1,mountain.y+y*step+1)))add(y*nx+x);
 let mission=false,inside=false,offTrailTerrain=false;const cells=new Set(design.playableCells.map(([x,y])=>y*192+x));
 while(head<tail){const i=queue[head++],x=i%nx,y=Math.floor(i/nx),px=mountain.x+x*step+1,py=mountain.y+y*step+1;
  if(Math.hypot(px-design.mission.x,py-design.mission.y)<=design.mission.radius)mission=true;
  if(cells.has(Math.floor(py/16)*192+Math.floor(px/16)))inside=true;
  const tx=Math.floor(px/16),ty=Math.floor(py/16),cell=ty*192+tx;
  if(allowed(tx,ty)&&L(raw,'Environment_V32').data![cell]&&!cells.has(cell))offTrailTerrain=true;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&x+dx>=0&&x+dx<nx&&y+dy>=0&&y+dy<ny)add((y+dy)*nx+x+dx);
 }
 return{mission,inside,offTrailTerrain,visited:tail};
}
describe('Puncak R2 single entrance and compulsory controlled ascent',()=>{
 it('preserves all previous local work, world archives and global engine while selecting R2',()=>{
  for(const[file,hash]of Object.entries(baseline.hashes))expect(createHash('sha256').update(readFileSync(file)).digest('hex'),file).toBe(hash);
  expect(PETA_RUNTIME).toEqual(raw);expect(properti(raw,'worldVersion')).toBe('3.6-R2-Controlled-Ascent');expect([raw.width,raw.height,raw.tilewidth,raw.tileheight]).toEqual([192,144,16,16]);expect(raw.tilesets.slice(0,old.tilesets.length)).toEqual(old.tilesets);
 });
 it('limits changes to local path pixels, visible ridge tiles and appended mountain colliders',()=>{
  for(const l of old.layers){const n=L(raw,l.name);
   if(l.name==='Collisions'){expect({...n,objects:n.objects!.slice(0,l.objects!.length)}).toEqual(l);expect(n.objects).toHaveLength(l.objects!.length+design.localColliders);continue;}
   if(l.name!=='Paths'){expect(n,l.name).toEqual(l);continue;}
   const{data:_,...meta}=l,{data:__,...next}=n;expect(next).toEqual(meta);for(let i=0;i<l.data!.length;i++)if(l.data![i]!==n.data![i])expect(allowed(i%192,Math.floor(i/192)),`path:${i}`).toBe(true);
  }
  const added=raw.layers.filter(l=>!old.layers.some(o=>o.name===l.name));expect(added.map(l=>l.name)).toEqual(['Mountain_V36R2_Ridges']);
  for(let i=0;i<added[0].data!.length;i++)if(added[0].data![i])expect(allowed(i%192,Math.floor(i/192))).toBe(true);
  expect(DUNIA.solid).toEqual(previous.solid);expect(DUNIA.interaksi).toEqual(previous.interaksi);expect(DUNIA.spawn).toEqual(previous.spawn);
 });
 it('gives every new physical block an exact visible rock tile, with no body outside Puncak or across a stair',()=>{
  const bodies=L(raw,'Collisions').objects!.slice(L(old,'Collisions').objects!.length),ridge=L(raw,'Mountain_V36R2_Ridges').data!;
  expect(bodies).toHaveLength(design.walls.length);expect(design.localColliders).toBeGreaterThan(0);
  for(const w of design.walls){const b=bodies.find(o=>o.name===w.collider)!;expect(b).toBeDefined();expect([b.x,b.y,b.width,b.height]).toEqual([w.x*16,w.y*16,16,16]);expect(properti(b,'collides')).toBe(true);expect(allowed(w.x,w.y)).toBe(true);expect(ridge[w.y*192+w.x]).toBeGreaterThanOrEqual(5267);expect(L(raw,'Paths').data![w.y*192+w.x]).toBe(0);expect(bisaBerdiri(DUNIA,b.x+8,b.y+8)).toBe(false);}
  expect(ridge.filter(Boolean)).toHaveLength(bodies.length);expect(properti(L(raw,'Mountain_V36R2_Ridges'),'renderDepth')).toBeLessThan(20);
  for(let i=0;i<L(raw,'Paths').data!.length;i++)if(L(raw,'Paths').data![i]&&allowed(i%192,Math.floor(i/192)))expect(L(raw,'AbovePlayer').data![i],`canopy over trail:${i}`).toBe(0);
  for(const[cx,cy]of[[39,55],[65,47]])for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){expect(L(raw,'Paths').data![(cy+dy)*192+cx+dx]).toBe(L(old,'Paths').data![(cy+dy)*192+cx+dx]);expect(ridge[(cy+dy)*192+cx+dx]).toBe(0);}
 });
 it('walks from spawn through the entrance, both stairs, summit and lookout, preserving every other mission',()=>{
  const{q,seen}=walk();expect([...design.validationTargets,...forest.validationTargets].filter(p=>!seen.has(p.join(',')))).toEqual([]);
  for(const p of DUNIA.interaksi)expect(q.some(([x,y])=>interaksiTerdekat(DUNIA,x*16+8,y*16+8)?.id===p.id),p.id).toBe(true);
  expect(bisaBerdiri(DUNIA,968,696)).toBe(true);for(const p of NPC_PLANS)expect(validateNpcPlan(DUNIA,p)).toBe(true);
 });
 it('permits exterior entry and mission access when the three official gates are open',()=>{
  const r=exteriorReach();expect(r.inside).toBe(true);expect(r.mission).toBe(true);expect(r.offTrailTerrain).toBe(false);
 });
 it('cannot enter the trail from any other mountain side when its sole entrance is sealed',()=>{
  const r=exteriorReach(design.gates.find(g=>g.id==='entrance')!);expect(r.inside).toBe(false);expect(r.mission).toBe(false);
 });
 it('cannot bypass either stair through grass, a cliff, a diagonal seam or the exterior, including interaction through a wall',()=>{
  for(const g of design.gates.filter(g=>g.id!=='entrance'))expect(exteriorReach(g).mission,g.id).toBe(false);
 });
 it('prevents a held movement input from crossing every exposed new ridge face',()=>{
  const ridge=new Set(design.walls.map(w=>`${w.x},${w.y}`));let probes=0;
  for(const w of design.walls)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){if(ridge.has(`${w.x+dx},${w.y+dy}`))continue;const start={x:(w.x+dx)*16+8,y:(w.y+dy)*16+8};if(!bisaBerdiri(DUNIA,start.x,start.y))continue;let p=start;for(let n=0;n<45;n++)p=langkahGerak(DUNIA,p,-dx,-dy,40);expect(bisaBerdiri(DUNIA,p.x,p.y)).toBe(true);expect(Math.floor(p.x/16)===w.x&&Math.floor(p.y/16)===w.y).toBe(false);probes++;}
  expect(probes).toBeGreaterThan(100);
 });
 it('keeps the station, deck, fog/wind and recovery identical, and exports reproducibly',()=>{
  const recovered=structuredClone(raw);for(const l of recovered.layers)if(misiPemulihan(l))l.visible=true;expect(bacaPeta(recovered).solid).toEqual(DUNIA.solid);expect(bacaPeta(recovered).penghalang).toEqual(DUNIA.penghalang);
  for(const l of old.layers.filter(l=>l.name.startsWith('Recovery_')||l.name.startsWith('Celebration_')||['Objects','AbovePlayer','Mountain_Mist_V32','Mountain_V36_Detail'].includes(l.name)))expect(L(raw,l.name)).toEqual(l);
  const s=raw.tilesets.at(-1)!;expect(s.name).toBe('mountain_v36_r2');expect(s.tiles).toEqual([]);for(const set of raw.tilesets)expect(existsSync(resolve('public/maps',set.image))).toBe(true);
  expect(()=>execFileSync(process.execPath,['scripts/polish-puncak-v36-r2.mjs','--check'],{encoding:'utf8'})).not.toThrow();
 });
});
