import { describe, it, expect } from 'vitest';
import raw from '../public/maps/pulau-tirta-v34-a1.json';
import old from '../public/maps/pulau-tirta-v3-2.json';
import buildings from '../world/buildings-v34-a1.json';
import previousBuildings from '../world/buildings-v32.json';
import plan from '../world/village-a1.json';
import { bacaPeta, bisaBerdiri, langkahGerak, interaksiTerdekat, properti } from '../src/game/map-data';
import { NPC_PLANS, validateNpcPlan } from '../src/game/living-model';
const world=bacaPeta(raw), inside=(x:number,y:number)=>x>=78&&x<116&&y>=65&&y<85;
describe('Village V3.4-A1 limited centre',()=>{
  it('keeps all tiles outside the centre, mission regions and integration objects identical',()=>{
    expect([raw.width,raw.height]).toEqual([192,144]);
    for(const source of old.layers.filter(l=>l.data)){
      const next=raw.layers.find(l=>l.name===source.name)!;
      for(let i=0;i<source.data!.length;i++)if(!inside(i%192,Math.floor(i/192))&&next.data![i]!==source.data![i])throw Error(`scope leak ${source.name} ${i}`);
    }
    for(const name of ['Spawn','Interactions','Regions','NPCSpawns','FuturePaths','DevelopmentAreas'])expect(raw.layers.find(l=>l.name===name)).toEqual(old.layers.find(l=>l.name===name));
    const outside=(o:{x:number;y:number;width:number;height:number})=>o.x+o.width<=78*16||o.x>=116*16||o.y+o.height<=65*16||o.y>=85*16;
    expect(raw.layers.find(l=>l.name==='Collisions')!.objects!.filter(outside)).toEqual(old.layers.find(l=>l.name==='Collisions')!.objects!.filter(outside));
  });
  it('retains seven houses, restores complete central facades, and leaves remote houses unchanged',()=>{
    expect(buildings).toHaveLength(7);
    for(const b of buildings){
      if(!inside(b.x,b.y)){expect(b).toEqual(previousBuildings.find(p=>p.name===b.name));continue;}
      const walls=raw.layers.find(l=>l.name==='Objects')!.data!,roof=raw.layers.find(l=>l.name==='AbovePlayer')!.data!,front=raw.layers.find(l=>l.name==='Facades')!.data!;
      expect(roof[(b.y+1)*192+b.door.x]).toBe(133+(b.roof.red?67:63));
      expect(front[b.door.y*192+b.door.x]).toBe(133+(b.coolWall?89:85));
      for(let dy=2;dy<4;dy++)for(let dx=0;dx<b.width;dx++)expect(walls[(b.y+dy)*192+b.x+dx]).toBeGreaterThan(0);
    }
  });
  it('walks spawn → plaza → well apron → market → homes and reaches every mission/door',()=>{
    const queue=[[96,79]],seen=new Set(['96,79']);
    for(let i=0;i<queue.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
      const[x,y]=queue[i],nx=x+dx,ny=y+dy,k=`${nx},${ny}`;
      if(seen.has(k)||!bisaBerdiri(world,nx*16+8,ny*16+8))continue;
      let p={x:x*16+8,y:y*16+8};for(let n=0;n<8;n++)p=langkahGerak(world,p,dx,dy,2000/86);
      if(Math.hypot(p.x-(nx*16+8),p.y-(ny*16+8))>.001)continue;
      seen.add(k);queue.push([nx,ny]);
    }
    for(const[x,y]of plan.routeTargets)expect(seen.has(`${x},${y}`),`A1 route ${x},${y}`).toBe(true);
    for(const b of buildings)expect(seen.has(`${b.door.x},${b.door.y+1}`),b.name).toBe(true);
    for(const t of world.interaksi)expect(queue.some(([x,y])=>interaksiTerdekat(world,x*16+8,y*16+8)?.id===t.id),t.nama).toBe(true);
  });
  it('keeps NPC routes safe, festival collision stable, and the centre clear of speckled paving',()=>{
    for(const p of NPC_PLANS)expect(validateNpcPlan(world,p),p.id).toBe(true);
    const paths=raw.layers.find(l=>l.name==='Paths')!.data!;
    for(let y=65;y<85;y++)for(let x=78;x<116;x++)expect(paths[y*192+x]).not.toBe(176);
    const after=structuredClone(raw);for(const l of after.layers)if(l.name.startsWith('Recovery_')||properti(l,'festival'))l.visible=true;
    expect(bacaPeta(after).solid).toEqual(world.solid);
    expect(bisaBerdiri(world,world.spawn.x,world.spawn.y)).toBe(true);
    for(const o of world.penghalang.filter(o=>o.name.startsWith('a1_')))expect(bisaBerdiri(world,o.x+o.width/2,o.y+o.height/2),o.name).toBe(false);
    expect(raw.layers.filter(l=>properti(l,'festival'))).toHaveLength(3);
  });
});
