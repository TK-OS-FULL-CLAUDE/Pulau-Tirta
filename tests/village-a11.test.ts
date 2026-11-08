import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import raw from '../public/maps/pulau-tirta-v34-a11.json';
import old from '../public/maps/pulau-tirta-v34-a1.json';
import baseline from '../world/village-a11-baseline.json';
import buildings from '../world/buildings-v34-a1.json';
import layout from '../world/village-a11.json';
import {bacaPeta,bisaBerdiri,langkahGerak,interaksiTerdekat,properti} from '../src/game/map-data';
import {NPC_PLANS,validateNpcPlan} from '../src/game/living-model';
const world=bacaPeta(raw),inside=(x:number,y:number)=>x>=79&&x<108&&y>=71&&y<85;
describe('Village A1.1 composition and preserved gameplay',()=>{
  it('preserves A1 archives and the complete movement, camera, NPC and living code',()=>{
    for(const[file,hash]of Object.entries(baseline))expect(createHash('sha256').update(readFileSync(file)).digest('hex'),file).toBe(hash);
  });
  it('limits every terrain/collision change to the centre and preserves all houses and mission contracts',()=>{
    expect([raw.width,raw.height]).toEqual([192,144]);expect(raw.tilesets).toEqual(old.tilesets);
    for(const name of ['Spawn','Interactions','Regions','NPCSpawns','FuturePaths','DevelopmentAreas'])expect(raw.layers.find(l=>l.name===name)).toEqual(old.layers.find(l=>l.name===name));
    for(const source of old.layers.filter(l=>l.data)){
      const next=raw.layers.find(l=>l.name===source.name)!;
      for(let i=0;i<source.data!.length;i++)if(!inside(i%192,Math.floor(i/192))&&source.data![i]!==next.data![i])throw Error(`scope leak ${source.name}:${i}`);
    }
    const outside=(o:{x:number;y:number;width:number;height:number})=>o.x>=108*16||o.x+o.width<=79*16||o.y>=85*16||o.y+o.height<=71*16;
    expect(raw.layers.find(l=>l.name==='Collisions')!.objects!.filter(outside)).toEqual(old.layers.find(l=>l.name==='Collisions')!.objects!.filter(outside));
    for(const b of buildings)for(const name of ['Objects','AbovePlayer','Facades']){
      const a=old.layers.find(l=>l.name===name)!.data!,n=raw.layers.find(l=>l.name===name)!.data!;
      for(let dy=0;dy<4;dy++)for(let dx=0;dx<b.width;dx++)expect(n[(b.y+dy)*192+b.x+dx],`${name} ${b.name}`).toBe(a[(b.y+dy)*192+b.x+dx]);
    }
  });
  it('reduces paving and clusters two south-facing kiosks next to one shared customer court',()=>{
    expect(layout.metrics.afterPaved).toBeLessThan(layout.metrics.beforePaved*.8);
    const o=raw.layers.find(l=>l.name==='Objects')!.data!,roof=raw.layers.find(l=>l.name==='AbovePlayer')!.data!;
    for(const x of [80,83]){expect(roof[71*192+x]).toBe(755+80);expect(o[72*192+x]).toBe(755+96);expect(bisaBerdiri(world,(x+1.5)*16,73*16)).toBe(false);}
    expect(bisaBerdiri(world,84*16+8,74*16+8)).toBe(true);
    for(const[x,y]of[[94,73],[90,81],[102,81]])expect(o.slice(y*192+x,y*192+x+2),`bench ${x},${y}`).toEqual([595+11,595+12]);
    expect(raw.layers.find(l=>l.name==='Landmarks')!.objects!.find(o=>o.name==='Sumur Desa')).toMatchObject({x:93.5*16,y:76.5*16});
  });
  it('reaches all house doors and missions, and leaves all original NPC waypoint segments navigable',()=>{
    const queue=[[96,79]],seen=new Set(['96,79']);
    for(let i=0;i<queue.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
      const[x,y]=queue[i],nx=x+dx,ny=y+dy,k=`${nx},${ny}`;
      if(seen.has(k)||!bisaBerdiri(world,nx*16+8,ny*16+8))continue;
      let p={x:x*16+8,y:y*16+8};for(let n=0;n<8;n++)p=langkahGerak(world,p,dx,dy,2000/86);
      if(Math.hypot(p.x-(nx*16+8),p.y-(ny*16+8))>.001)continue;
      seen.add(k);queue.push([nx,ny]);
    }
    for(const[x,y]of layout.routeTargets)expect(seen.has(`${x},${y}`),`${x},${y}`).toBe(true);
    for(const b of buildings)expect(seen.has(`${b.door.x},${b.door.y+1}`),b.name).toBe(true);
    for(const t of world.interaksi)expect(queue.some(([x,y])=>interaksiTerdekat(world,x*16+8,y*16+8)?.id===t.id),t.nama).toBe(true);
    for(const p of NPC_PLANS)expect(validateNpcPlan(world,p),p.id).toBe(true);
  });
  it('keeps the well recovery aligned, festival decorations gated, and new solid props collidable',()=>{
    const f=raw.layers.find(l=>l.name==='Facades')!.data!,festival=raw.layers.find(l=>l.name==='Celebration_Desa_Decor')!.data!;
    expect(f[75*192+92]).toBe(755+44);expect(festival[75*192+92]).toBe(755+86);
    expect(raw.layers.filter(l=>properti(l,'festival'))).toHaveLength(3);
    for(const o of world.penghalang.filter(o=>o.name.startsWith('a11_')))expect(bisaBerdiri(world,o.x+o.width/2,o.y+o.height/2),o.name).toBe(false);
    const after=structuredClone(raw);for(const l of after.layers)if(l.name.startsWith('Recovery_')||properti(l,'festival'))l.visible=true;
    expect(bacaPeta(after).solid).toEqual(world.solid);expect(bisaBerdiri(world,1544,1272)).toBe(true);
  });
});
