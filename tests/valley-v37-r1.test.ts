import{describe,it,expect}from'vitest';
import{readFileSync,existsSync}from'node:fs';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';import{resolve}from'node:path';
import baseline from'../world/valley-v37-r1-baseline.json';import design from'../world/valley-v37-r1.json';
import mountain from'../world/mountain-v36-r2.json';import forest from'../world/forest-v38-r4.json';
import{bacaPeta,bisaBerdiri,interaksiTerdekat,langkahGerak,misiPemulihan,properti,type PetaTiled,type ObjekTiled}from'../src/game/map-data';
import{NPC_PLANS,validateNpcPlan}from'../src/game/living-model';
const old=JSON.parse(readFileSync('public/maps/pulau-tirta-v36-r2.json','utf8'))as PetaTiled,raw=JSON.parse(readFileSync('public/maps/pulau-tirta-v37-r1.json','utf8'))as PetaTiled;
// Stored R1 remains immutable; the current revision tests active map selection separately.
const PETA_RUNTIME=raw,DUNIA=bacaPeta(raw);
const previous=bacaPeta(old),L=(m:PetaTiled,n:string)=>m.layers.find(l=>l.name===n)!;
const regions=L(old,'Regions').objects!,valley=regions.find(r=>r.name==='Lembah Hujan')!,others=regions.filter(r=>r!==valley);
const contains=(r:ObjekTiled,x:number,y:number)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x:number,y:number)=>contains(valley,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8));
const area=(p:number[][])=>Math.abs(p.reduce((n,[x,y],i)=>{const[a,b]=p[(i+1)%p.length];return n+x*b-a*y;},0))/2;
const insidePolygon=(p:number[][],x:number,y:number)=>{let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const[a,b]=p[i],[c,d]=p[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;}return inside;};
describe('Lembah R1 connected catchment over the protected Puncak R2 world',()=>{
 it('preserves all old art, world revisions and team systems while selecting the combined R1 map',()=>{
  for(const[file,hash]of Object.entries(baseline.hashes))expect(createHash('sha256').update(readFileSync(file)).digest('hex'),file).toBe(hash);
  expect(PETA_RUNTIME).toEqual(raw);expect(properti(raw,'worldVersion')).toBe('3.7-R1-Connected-Catchment');expect([raw.width,raw.height,raw.tilewidth,raw.tileheight]).toEqual([192,144,16,16]);expect(raw.tilesets.slice(0,old.tilesets.length)).toEqual(old.tilesets);
 });
 it('changes no pixel outside Lembah, object group, layer metadata, other recovery state or existing canopy',()=>{
  expect(raw.layers).toHaveLength(old.layers.length);
  for(const l of old.layers){const n=L(raw,l.name);if(!l.data){expect(n,l.name).toEqual(l);continue;}const{data:_,...meta}=l,{data:__,...next}=n;expect(next,l.name).toEqual(meta);
   for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data![i])expect(allowed(i%192,Math.floor(i/192)),l.name+':'+i).toBe(true);
   if(!['Environment_V32','Paths','Objects','Recovery_Plants_Lembah_Hujan','Recovery_Lembah_Hujan','Recovery_Water_Lembah_Hujan'].includes(l.name))expect(n,l.name).toEqual(l);
  }
  const objects=new Set(design.basins.flatMap(b=>Array.from({length:b.height},(_,dy)=>Array.from({length:b.width},(_,dx)=>(b.y+dy)*192+b.x+dx)).flat()).concat((design.details as {x:number;y:number}[]).map(d=>d.y*192+d.x)));
  for(let i=0;i<L(old,'Objects').data!.length;i++)if(L(old,'Objects').data![i]!==L(raw,'Objects').data![i])expect(objects.has(i),`prop changed:${i}`).toBe(true);
 });
 it('keeps all collision, deep water envelopes, routes, mission coordinates and Puncak restrictions identical',()=>{
  expect(DUNIA.solid).toEqual(previous.solid);expect(DUNIA.penghalang).toEqual(previous.penghalang);expect(DUNIA.interaksi).toEqual(previous.interaksi);expect(DUNIA.spawn).toEqual(previous.spawn);
  expect(L(raw,'Paths').data!.map(Boolean)).toEqual(L(old,'Paths').data!.map(Boolean));expect(L(raw,'Water')).toEqual(L(old,'Water'));
  for(const b of design.basins){expect(DUNIA.penghalang.some(o=>o.x===b.x*16&&o.y===b.y*16&&o.width===b.width*16&&o.height===b.height*16)).toBe(true);for(let dy=0;dy<b.height;dy++)for(let dx=0;dx<b.width;dx++)expect(bisaBerdiri(DUNIA,(b.x+dx)*16+8,(b.y+dy)*16+8),b.id).toBe(false);}
  expect(DUNIA.interaksi.find(i=>i.id==='lembah')).toMatchObject({misiId:'misi-3',x:2216,y:728,radius:36});
  for(const w of mountain.walls)expect(L(raw,'Mountain_V36R2_Ridges').data![w.y*192+w.x]).toBe(L(old,'Mountain_V36R2_Ridges').data![w.y*192+w.x]);
 });
 it('gives the main basin a dominant organic water area and expands existing residual water after rain',()=>{
  const main=design.basins.find(b=>b.id==='main')!;
  for(const b of design.basins){expect(area(b.after)).toBeGreaterThan(area(b.before)*2);if(b!==main)expect(area(main.after)).toBeGreaterThan(area(b.after)*3);
   for(const[x,y]of b.before)expect(insidePolygon(b.after,x,y),b.id+': before water escaped after shore').toBe(true);
   for(let dy=0;dy<b.height;dy++)for(let dx=0;dx<b.width;dx++){expect(L(raw,'Objects').data![(b.y+dy)*192+b.x+dx]).toBe(5331+b.dry+dy*48+dx);expect(L(raw,'Recovery_Plants_Lembah_Hujan').data![(b.y+dy)*192+b.x+dx]).toBe(5331+b.wet+dy*48+dx);}
  }
  expect(new Set(design.basins.map(b=>b.role)).size).toBe(3);
 });
 it('routes both headwaters through their secondary basins into the main bowl with curved, shallow reaches',()=>{
  const reaches=new Map(design.drainage.map(d=>[d.from,d.to]));for(const start of['west-slope','north-slope']){let n=start;const seen=new Set();while(n!=='main'){expect(seen.has(n)).toBe(false);seen.add(n);expect(reaches.has(n)).toBe(true);n=reaches.get(n)!;}}
  for(const d of design.drainage){expect(d.points.at(-1)![1]).toBeGreaterThan(d.points[0][1]);expect(d.width[1]).toBeGreaterThanOrEqual(d.width[0]);expect(d.width[1]).toBeLessThanOrEqual(4);expect(d.points.some((p,i)=>i&&p[0]!==d.points[i-1][0]&&p[1]!==d.points[i-1][1])).toBe(true);}
  for(const[x,y]of design.channelCells)expect(bisaBerdiri(DUNIA,x*16+8,y*16+8)).toBe(bisaBerdiri(previous,x*16+8,y*16+8));
 });
 it('uses exactly the original four misi-3 recovery gates, keeping topography and physics stable in both states',()=>{
  const layers=raw.layers.filter(l=>l.name.endsWith('_Lembah_Hujan'));expect(layers).toHaveLength(4);
  for(const l of layers){expect(l.properties).toEqual(L(old,l.name).properties);expect(l.visible).toBe(false);expect(misiPemulihan(l)).toBe('misi-3');}
  for(const[x,y]of design.protectedLivingAnchors)for(const n of['Objects','Recovery_Plants_Lembah_Hujan'])expect(L(raw,n).data![y*192+x]).toBe(L(old,n).data![y*192+x]);
  expect(design.recovery.greenTiles).toBeLessThan(design.recovery.dampTiles*.3);expect(design.recovery.dampTiles).toBeLessThan(design.patch.width*design.patch.height*.1);
  const restored=structuredClone(raw);for(const l of restored.layers)if(misiPemulihan(l)==='misi-3')l.visible=true;expect(bacaPeta(restored).solid).toEqual(DUNIA.solid);expect(bacaPeta(restored).penghalang).toEqual(DUNIA.penghalang);
 });
 it('walks to the observation, basin banks, Puncak stairs and forest bridge with the actual game movement',()=>{
  const q=[[Math.floor(DUNIA.spawn.x/16),Math.floor(DUNIA.spawn.y/16)]],seen=new Set([q[0].join(',')]);for(let i=0;i<q.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const[x,y]=q[i],nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(seen.has(k)||!bisaBerdiri(DUNIA,nx*16+8,ny*16+8))continue;let p={x:x*16+8,y:y*16+8};for(let n=0;n<8;n++)p=langkahGerak(DUNIA,p,dx,dy,2000/86);if(Math.hypot(p.x-(nx*16+8),p.y-(ny*16+8))>.001)continue;seen.add(k);q.push([nx,ny]);}
  expect([...design.validationTargets,...mountain.validationTargets,...forest.validationTargets].filter(p=>!seen.has(p.join(',')))).toEqual([]);for(const p of DUNIA.interaksi)expect(q.some(([x,y])=>interaksiTerdekat(DUNIA,x*16+8,y*16+8)?.id===p.id),p.id).toBe(true);for(const p of NPC_PLANS)expect(validateNpcPlan(DUNIA,p)).toBe(true);
 });
 it('loads every asset, embeds unmodified existing water pixels and reproduces source/export without new dependencies',()=>{
  const s=raw.tilesets.at(-1)!;expect(s.name).toBe('valley_v37_r1');expect(s.tiles).toEqual([]);expect([s.tilecount,s.columns,s.tilewidth,s.tileheight]).toEqual([2688,48,16,16]);for(const set of raw.tilesets)expect(existsSync(resolve('public/maps',set.image))).toBe(true);
  const svg=readFileSync('world/assets/valley_v37_r1/tileset.svg','utf8');expect(svg).toContain(readFileSync(design.waterSource.image).toString('base64'));expect(svg).toBe(readFileSync('public/assets/world/valley_v37_r1/tileset.svg','utf8'));
  expect(()=>execFileSync(process.execPath,['scripts/polish-lembah-v37-r1.mjs','--check'],{encoding:'utf8'})).not.toThrow();
 });
});
