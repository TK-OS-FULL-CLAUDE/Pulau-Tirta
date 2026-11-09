/** Serialized into the isolated browser. Positions only move through the existing Scene.update. */
export async function walkCoastRoute(goals){
 const scene=window.__worldCheck,{DUNIA:world}=await import('/src/game/world-map.ts'),{bisaBerdiri,langkahGerak}=await import('/src/game/map-data.ts');
 const coast=world.wilayah.find(w=>w.lokasi.id==='pantai').batas,others=world.wilayah.filter(w=>w.lokasi.id!=='pantai').map(w=>w.batas);
 const contains=(r,x,y)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
 const permitted=(x,y)=>(x===76&&(y===97||y===98))||(contains(coast,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8)));
 const paths=world.peta.layers.find(l=>l.name==='Paths').data,canopy=world.peta.layers.find(l=>l.name==='AbovePlayer').data;
 const started=performance.now(),visited=[];let travelledPx=0,lastX=scene.pemain.x,lastY=scene.pemain.y;
 document.activeElement?.blur();const keys=(dx,dy)=>{for(const k of scene.tombol.kiri)k.isDown=dx<0;for(const k of scene.tombol.kanan)k.isDown=dx>0;for(const k of scene.tombol.atas)k.isDown=dy<0;for(const k of scene.tombol.bawah)k.isDown=dy>0;};
 const go=(x,y)=>new Promise((yes,no)=>{const deadline=performance.now()+3000;const frame=()=>{travelledPx+=Math.hypot(scene.pemain.x-lastX,scene.pemain.y-lastY);lastX=scene.pemain.x;lastY=scene.pemain.y;const dx=x-scene.pemain.x,dy=y-scene.pemain.y;if(Math.hypot(dx,dy)<1.9){keys(0,0);yes();return;}if(performance.now()>deadline){keys(0,0);no(Error(`Coast route blocked ${x},${y}`));return;}keys(Math.abs(dx)>1.2?Math.sign(dx):0,Math.abs(dy)>1.2?Math.sign(dy):0);requestAnimationFrame(frame);};frame();});
 try{
  for(const stop of goals){const target=stop.tile.join(','),start=[Math.floor(scene.pemain.x/16),Math.floor(scene.pemain.y/16)],q=[{tile:start,cost:0}],costs=new Map([[start.join(','),0]]),parents=new Map([[start.join(','),null]]);
   while(q.length){q.sort((a,b)=>b.cost-a.cost);const cur=q.pop(),[x,y]=cur.tile,ck=x+','+y;if(cur.cost!==costs.get(ck))continue;if(ck===target)break;
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(!permitted(nx,ny)||!bisaBerdiri(world,nx*16+8,ny*16+8))continue;let p={x:x*16+8,y:y*16+8};for(let n=0;n<8;n++)p=langkahGerak(world,p,dx,dy,2000/86);if(Math.hypot(p.x-(nx*16+8),p.y-(ny*16+8))>.001)continue;
     const cost=cur.cost+(paths[ny*192+nx]?0.65:1)+(canopy[ny*192+nx]?0.8:0);if(cost>=(costs.get(k)??Infinity))continue;costs.set(k,cost);parents.set(k,ck);q.push({tile:[nx,ny],cost});
    }
   }
   if(!parents.has(target))throw Error('No coastal route to '+stop.label);const route=[];let k=target;while(k!==null){route.push(k.split(',').map(Number));k=parents.get(k);}for(const[x,y]of route.reverse())await go(x*16+8,y*16+8);
   visited.push({label:stop.label,target:stop.tile,x:scene.pemain.x,y:scene.pemain.y,atMs:Math.round(performance.now()-started)});if(stop.pauseMs)await new Promise(r=>setTimeout(r,stop.pauseMs));
  }
  return{method:'WASD state → original Scene.update and collision; no teleport during tour',visited,elapsedMs:Math.round(performance.now()-started),travelledPx};
 }finally{keys(0,0);}
}
