import{describe,it,expect}from'vitest';import{readFileSync,existsSync}from'node:fs';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';import{resolve}from'node:path';
import baseline from'../world/valley-v37-r2-baseline.json';import design from'../world/valley-v37-r2.json';import prior from'../world/valley-v37-r1.json';import mountain from'../world/mountain-v36-r2.json';import forest from'../world/forest-v38-r4.json';
import{DUNIA as ACTIVE_DUNIA,PETA_RUNTIME as ACTIVE_MAP}from'../src/game/world-map';
import{bacaPeta,bisaBerdiri,interaksiTerdekat,langkahGerak,misiPemulihan,properti,RADIUS_PEMAIN,type PetaTiled,type ObjekTiled}from'../src/game/map-data';import{NPC_PLANS,validateNpcPlan}from'../src/game/living-model';
const old=JSON.parse(readFileSync('public/maps/pulau-tirta-v37-r1.json','utf8'))as PetaTiled,raw=JSON.parse(readFileSync('public/maps/pulau-tirta-v37-r2.json','utf8'))as PetaTiled;
// Archived valley revision; the active mountain structure revision checks preservation separately.
const PETA_RUNTIME=raw,DUNIA=bacaPeta(raw);
const previous=bacaPeta(old),L=(m:PetaTiled,n:string)=>m.layers.find(l=>l.name===n)!;
const regions=L(old,'Regions').objects!,valley=regions.find(r=>r.name==='Lembah Hujan')!,others=regions.filter(r=>r!==valley);
const contains=(r:ObjekTiled,x:number,y:number)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x:number,y:number)=>contains(valley,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8));
// A 2px bitmap built from the real runtime radius and collision index, not the visual Paths.
// Eight-neighbour flood conservatively permits more diagonal motion than the engine's sweeps.
const step=2,nx=valley.width/step,ny=valley.height/step,size=nx*ny;
function exteriorReach(closeEntrance:boolean,world=DUNIA){
 const free=new Uint8Array(size);for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)free[y*nx+x]=Number(bisaBerdiri(world,valley.x+x*step+1,valley.y+y*step+1));
 const seen=new Uint8Array(size),q=new Int32Array(size);let head=0,tail=0,inside=false,mission=false;const cells=new Set(design.playableCells.map(([x,y])=>y*192+x)),gate=design.entrance;
 const add=(i:number)=>{if(!free[i]||seen[i])return;const x=valley.x+i%nx*step+1,y=valley.y+Math.floor(i/nx)*step+1;
  if(closeEntrance&&x+RADIUS_PEMAIN>gate.x&&x-RADIUS_PEMAIN<gate.x+gate.width&&y+RADIUS_PEMAIN>gate.y&&y-RADIUS_PEMAIN<gate.y+gate.height)return;seen[i]=1;q[tail++]=i;};
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)if(!x||!y||x===nx-1||y===ny-1||others.some(r=>contains(r,valley.x+x*step+1,valley.y+y*step+1)))add(y*nx+x);
 while(head<tail){const i=q[head++],x=i%nx,y=Math.floor(i/nx),px=valley.x+x*step+1,py=valley.y+y*step+1;
  if(cells.has(Math.floor(py/16)*192+Math.floor(px/16)))inside=true;if(Math.hypot(px-design.mission.x,py-design.mission.y)<=design.mission.radius)mission=true;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&x+dx>=0&&x+dx<nx&&y+dy>=0&&y+dy<ny)add((y+dy)*nx+x+dx);
 }return{inside,mission,visited:tail};
}
describe('Lembah R2 single-entry lower catchment with safe local cut banks',()=>{
 it('preserves all prior local work, original assets and team/global systems while activating R2',()=>{
  for(const[file,hash]of Object.entries(baseline.hashes))expect(createHash('sha256').update(readFileSync(file)).digest('hex'),file).toBe(hash);
  expect(PETA_RUNTIME).toEqual(raw);expect(properti(raw,'worldVersion')).toBe('3.7-R2-Single-Entry-Valley');expect([raw.width,raw.height,raw.tilewidth,raw.tileheight]).toEqual([192,144,16,16]);expect(raw.tilesets.slice(0,old.tilesets.length)).toEqual(old.tilesets);
 });
 it('changes only scoped paths, basin graphics and appended visible bank bodies, preserving every old object',()=>{
  for(const l of old.layers){const n=L(raw,l.name);if(l.name==='Collisions'){expect({...n,objects:n.objects!.slice(0,l.objects!.length)}).toEqual(l);expect(n.objects).toHaveLength(l.objects!.length+design.localColliders);continue;}
   if(!l.data){expect(n,l.name).toEqual(l);continue;}const{data:_,...meta}=l,{data:__,...next}=n;expect(next,l.name).toEqual(meta);
   for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data![i])expect(allowed(i%192,Math.floor(i/192)),l.name+':'+i).toBe(true);
   if(!['Paths','Objects','Recovery_Plants_Lembah_Hujan'].includes(l.name))expect(n,l.name).toEqual(l);
  }
  const added=raw.layers.filter(l=>!old.layers.some(o=>o.name===l.name));expect(added.map(l=>l.name)).toEqual(['Valley_V37R2_Cut_Banks']);for(let i=0;i<added[0].data!.length;i++)if(added[0].data![i])expect(allowed(i%192,Math.floor(i/192))).toBe(true);
  expect(DUNIA.penghalang.slice(0,previous.penghalang.length)).toEqual(previous.penghalang);expect(DUNIA.solid).toEqual(previous.solid);expect(DUNIA.interaksi).toEqual(previous.interaksi);expect(DUNIA.spawn).toEqual(previous.spawn);
 });
 it('matches each local bank collider to an exact 16px rock silhouette, with no invisible road barrier',()=>{
  const bank=L(raw,'Valley_V37R2_Cut_Banks').data!,bodies=L(raw,'Collisions').objects!.slice(L(old,'Collisions').objects!.length);expect(bodies).toHaveLength(design.localColliders);expect(bank.filter(Boolean)).toHaveLength(bodies.length);
  for(const w of design.walls){const b=bodies.find(o=>o.name===w.collider)!;expect([b.x,b.y,b.width,b.height]).toEqual([w.x*16,w.y*16,16,16]);expect(properti(b,'collides')).toBe(true);expect(allowed(w.x,w.y)).toBe(true);expect(bank[w.y*192+w.x]).toBeGreaterThanOrEqual(8019);expect(L(raw,'Paths').data![w.y*192+w.x]).toBe(0);}
  expect(properti(L(raw,'Valley_V37R2_Cut_Banks'),'renderDepth')).toBeLessThan(20);expect(design.steps.length).toBeGreaterThan(10);
  for(const[x,y]of design.steps){expect(L(old,'Paths').data![y*192+x]).not.toBe(0);expect(bank[y*192+x]).toBe(0);}
 });
 it('retains basin roles, residual/full water geometry and the complete R1 shallow drainage/recovery',()=>{
  for(const b of design.basins){const p=prior.basins.find(p=>p.id===b.id)!;expect([b.x,b.y,b.width,b.height,b.before,b.after]).toEqual([p.x,p.y,p.width,p.height,p.before,p.after]);
   for(let dy=0;dy<b.height;dy++)for(let dx=0;dx<b.width;dx++){const i=(b.y+dy)*192+b.x+dx;expect(L(raw,'Objects').data![i]).toBe(8019+b.dry+dy*32+dx);expect(L(raw,'Recovery_Plants_Lembah_Hujan').data![i]).toBe(8019+b.wet+dy*32+dx);expect(bisaBerdiri(DUNIA,(b.x+dx)*16+8,(b.y+dy)*16+8)).toBe(false);}
  }
  const basinCells=new Set(design.basins.flatMap(b=>Array.from({length:b.height},(_,dy)=>Array.from({length:b.width},(_,dx)=>(b.y+dy)*192+b.x+dx)).flat()));
  for(const name of['Objects','Recovery_Plants_Lembah_Hujan'])for(let i=0;i<L(old,name).data!.length;i++)if(L(old,name).data![i]!==L(raw,name).data![i])expect(basinCells.has(i),name+':'+i).toBe(true);
  for(const name of['Recovery_Water_Lembah_Hujan','Recovery_Lembah_Hujan','Recovery_Canopy_Lembah_Hujan','Water','Environment_V32'])expect(L(raw,name)).toEqual(L(old,name));
 });
 it('reaches the lower valley through its southwest mouth when open',()=>{const r=exteriorReach(false);expect(r.inside).toBe(true);expect(r.mission).toBe(true);});
 it('cannot cut in from any other side or interact through the bank when the sole descent is blocked',()=>{
  const r=exteriorReach(true);expect(r.inside).toBe(false);expect(r.mission).toBe(false);
 });
 it('walks from spawn through the descent to all basin banks and missions, preserving mountain/forest access',()=>{
  const q=[[Math.floor(DUNIA.spawn.x/16),Math.floor(DUNIA.spawn.y/16)]],seen=new Set([q[0].join(',')]);for(let i=0;i<q.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const[x,y]=q[i],nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(seen.has(k)||!bisaBerdiri(DUNIA,nx*16+8,ny*16+8))continue;let p={x:x*16+8,y:y*16+8};for(let n=0;n<8;n++)p=langkahGerak(DUNIA,p,dx,dy,2000/86);if(Math.hypot(p.x-(nx*16+8),p.y-(ny*16+8))>.001)continue;seen.add(k);q.push([nx,ny]);}
  expect([...design.validationTargets,...mountain.validationTargets,...forest.validationTargets].filter(p=>!seen.has(p.join(',')))).toEqual([]);for(const p of DUNIA.interaksi)expect(q.some(([x,y])=>interaksiTerdekat(DUNIA,x*16+8,y*16+8)?.id===p.id),p.id).toBe(true);for(const p of NPC_PLANS)expect(validateNpcPlan(DUNIA,p)).toBe(true);
 });
 it('stops held movement input at every exposed new bank face without walking through cliffs',()=>{
  const wall=new Set(design.walls.map(w=>`${w.x},${w.y}`));let probes=0;for(const w of design.walls)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){if(wall.has(`${w.x+dx},${w.y+dy}`))continue;let p={x:(w.x+dx)*16+8,y:(w.y+dy)*16+8};if(!bisaBerdiri(DUNIA,p.x,p.y))continue;for(let n=0;n<45;n++)p=langkahGerak(DUNIA,p,-dx,-dy,40);expect(bisaBerdiri(DUNIA,p.x,p.y)).toBe(true);expect(Math.floor(p.x/16)===w.x&&Math.floor(p.y/16)===w.y).toBe(false);probes++;}expect(probes).toBeGreaterThan(100);
 });
 it('retains mission IDs/gates and both physical recovery states, loads local assets and exports deterministically',()=>{
  expect(DUNIA.interaksi.find(i=>i.id==='lembah')).toMatchObject({misiId:'misi-3',x:2216,y:728,radius:36});for(const l of raw.layers.filter(l=>l.name.endsWith('_Lembah_Hujan'))){expect(l.properties).toEqual(L(old,l.name).properties);expect(l.visible).toBe(false);expect(misiPemulihan(l)).toBe('misi-3');}
  for(const[x,y]of design.protectedLivingAnchors)for(const name of['Objects','Recovery_Plants_Lembah_Hujan'])expect(L(raw,name).data![y*192+x]).toBe(L(old,name).data![y*192+x]);
  const recovered=structuredClone(raw);for(const l of recovered.layers)if(misiPemulihan(l)==='misi-3')l.visible=true;expect(bacaPeta(recovered).penghalang).toEqual(DUNIA.penghalang);expect(bacaPeta(recovered).solid).toEqual(DUNIA.solid);
  const set=raw.tilesets.at(-1)!;expect([set.name,set.columns,set.tilecount,set.tilewidth,set.tileheight]).toEqual(['valley_v37_r2',32,512,16,16]);expect(set.tiles).toEqual([]);for(const s of raw.tilesets)expect(existsSync(resolve('public/maps',s.image))).toBe(true);
  expect(()=>execFileSync(process.execPath,['scripts/polish-lembah-v37-r2.mjs','--check'],{encoding:'utf8'})).not.toThrow();
 });
 it('keeps the active R3 runtime valley entrance open, seals every other side, and preserves its bank colliders',()=>{
  expect(ACTIVE_MAP).not.toEqual(raw);
  expect(ACTIVE_DUNIA.interaksi.find(i=>i.id==='lembah')).toMatchObject({misiId:'misi-3',x:2216,y:728,radius:36});
  const activeBank=L(ACTIVE_MAP,'Valley_V37R2_Cut_Banks');expect(activeBank).toEqual(L(raw,'Valley_V37R2_Cut_Banks'));
  for(const w of design.walls)expect(ACTIVE_DUNIA.penghalang.find(b=>b.name===w.collider)).toEqual(DUNIA.penghalang.find(b=>b.name===w.collider));
  const open=exteriorReach(false,ACTIVE_DUNIA),closed=exteriorReach(true,ACTIVE_DUNIA);
  expect(open.inside).toBe(true);expect(open.mission).toBe(true);
  expect(closed.inside).toBe(false);expect(closed.mission).toBe(false);
  for(const[x,y]of design.validationTargets)expect(bisaBerdiri(ACTIVE_DUNIA,x*16+8,y*16+8),`${x},${y}`).toBe(true);
 });
 it('stops held movement at every exposed valley bank face in the active R3 runtime',()=>{
  const wall=new Set(design.walls.map(w=>`${w.x},${w.y}`));let probes=0;
  for(const w of design.walls)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
   if(wall.has(`${w.x+dx},${w.y+dy}`))continue;
   let p={x:(w.x+dx)*16+8,y:(w.y+dy)*16+8};if(!bisaBerdiri(ACTIVE_DUNIA,p.x,p.y))continue;
   for(let n=0;n<45;n++)p=langkahGerak(ACTIVE_DUNIA,p,-dx,-dy,40);
   expect(bisaBerdiri(ACTIVE_DUNIA,p.x,p.y)).toBe(true);
   expect(Math.floor(p.x/16)===w.x&&Math.floor(p.y/16)===w.y).toBe(false);probes++;
  }expect(probes).toBeGreaterThan(100);
 });
});
