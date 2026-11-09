import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import baseline from '../world/coast-v351-baseline.json';
import additions from '../world/coast-v351.json';
import {bacaPeta,bisaBerdiri,properti,type PetaTiled} from '../src/game/map-data';
const old=JSON.parse(readFileSync('public/maps/pulau-tirta-v35.json','utf8')) as PetaTiled;
const raw=JSON.parse(readFileSync('public/maps/pulau-tirta-v351.json','utf8')) as PetaTiled;
// This stage's regression checks its stored map; the newest stage checks the active world separately.
const DUNIA=bacaPeta(raw);
const previous=bacaPeta(old),layer=(m:PetaTiled,n:string)=>m.layers.find(l=>l.name===n)!;
const pool=(x:number,y:number)=>y>=102&&y<=106&&((x>=50&&x<=54)||(x>=61&&x<=65));
describe('V3.5.1 pool/nature polish protects integrated world',()=>{
 it('keeps all team/A5/V3.5 sources and selects the new editable/exported map',()=>{
  for(const[file,hash]of Object.entries(baseline.hashes))expect(createHash('sha256').update(readFileSync(file)).digest('hex'),file).toBe(hash);
  expect([raw.width,raw.height,raw.tilewidth,raw.tileheight]).toEqual([192,144,16,16]);
  expect(raw.tilesets.slice(0,10)).toEqual(old.tilesets);expect(raw.layers).toHaveLength(old.layers.length);
 });
 it('preserves every collision, water mask, path, building, contract and pixel outside Pantai',()=>{
  expect(DUNIA.solid).toEqual(previous.solid);expect(DUNIA.penghalang).toEqual(previous.penghalang);expect(DUNIA.interaksi).toEqual(previous.interaksi);
  const regions=layer(old,'Regions').objects!,coast=regions.find(r=>r.name==='Pantai Biru')!,others=regions.filter(r=>r!==coast);
  const contains=(r:typeof coast,x:number,y:number)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
  for(const l of old.layers){const n=layer(raw,l.name);if(!l.data){expect(n,l.name).toEqual(l);continue;}
   if(!['Objects','TerrainDetails','Recovery_Plants_Pantai_Biru'].includes(l.name)){expect(n,l.name).toEqual(l);continue;}
   for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data![i]){
    const x=i%192,y=Math.floor(i/192);expect(contains(coast,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8)),l.name+':'+i).toBe(true);
    if(l.name==='Objects'&&!pool(x,y)){
     if(l.data[i])expect(l.data[i]>=1331&&l.data[i]<=1357,'only existing rock art can be replaced').toBe(true);
     else expect(additions.details.some(d=>x>=d.x&&x<d.x+d.width&&y>=d.y&&y<d.y+d.height),'new low nature detail').toBe(true);
    }
   }
  }
 });
 it('retains basin bounds, mission recovery gate, reflector, interaction and all access points',()=>{
  const recovery=layer(raw,'Recovery_Plants_Pantai_Biru');expect(recovery.properties).toEqual(layer(old,'Recovery_Plants_Pantai_Biru').properties);expect(recovery.visible).toBe(false);expect(properti(recovery,'missionId')).toBe('misi-1');
  const objects=layer(raw,'Objects').data!,previousObjects=layer(old,'Objects').data!;
  for(const x of[50,61])for(let dy=0;dy<5;dy++)for(let dx=0;dx<5;dx++){const i=(102+dy)*192+x+dx;expect(objects[i]).toBeGreaterThanOrEqual(1427);expect(recovery.data![i]).toBeGreaterThan(objects[i]);}
  for(let y=99;y<=101;y++)for(let x=58;x<=59;x++)expect(objects[y*192+x]).toBe(previousObjects[y*192+x]);
  for(const[x,y]of[[52,107],[63,107],[49,104],[66,104],[57,104],[31,120],[75,98]])expect(bisaBerdiri(DUNIA,x*16+8,y*16+8),x+','+y).toBe(true);
  expect(bisaBerdiri(DUNIA,920,1672)).toBe(true);
 });
 it('places low natural details off paths, water, solid props and the interaction lane',()=>{
  expect(additions.details.length).toBeGreaterThan(50);
  for(const d of additions.details)for(let dy=0;dy<d.height;dy++)for(let dx=0;dx<d.width;dx++){
   const x=d.x+dx,y=d.y+dy,i=y*192+x;expect(layer(raw,'Paths').data![i],d.kind).toBe(0);expect(layer(raw,'Water').data![i],d.kind).toBe(0);expect(layer(old,'Objects').data![i],d.kind).toBe(0);expect(Math.hypot(x*16+8-920,y*16+8-1672)).toBeGreaterThanOrEqual(54);
   if(d.kind!=='wind-sand')expect(layer(raw,'Objects').data![i],'nature remains above recovery ground').toBeGreaterThanOrEqual(1427);
  }
  const restored=structuredClone(raw);for(const l of restored.layers)if(l.name.startsWith('Recovery_'))l.visible=true;expect(bacaPeta(restored).solid).toEqual(DUNIA.solid);
 });
 it('reproduces stored Tiled map, atlas and placement manifest without rewriting them',()=>{
  expect(()=>execFileSync(process.execPath,['scripts/polish-pantai-v351.mjs','--check'],{encoding:'utf8'})).not.toThrow();
 });
});
