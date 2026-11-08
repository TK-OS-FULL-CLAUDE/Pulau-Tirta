/** Serialized into the isolated test browser, never bundled into the game. */
export async function walkVillageRoute(options = {}) {
  const scene=window.__worldCheck;
  const {DUNIA:world}=await import('/src/game/world-map.ts');
  const {bisaBerdiri,langkahGerak}=await import('/src/game/map-data.ts');
  const goals=options.goals??[[96,79],[98,79],[91,77],[87,76],[87,71]].map(tile=>({tile,pauseMs:0,label:tile.join(',')})),visited=[];
  const started=performance.now();let travelledPx=0,lastX=scene.pemain.x,lastY=scene.pemain.y;
  const roads=world.peta.layers.find(l=>l.name==='Paths').data;
  const desa=world.wilayah.find(w=>w.lokasi.id==='desa').batas,others=world.wilayah.filter(w=>w.lokasi.id!=='desa').map(w=>w.batas);
  const contains=(r,x,y)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
  const allowed=(x,y)=>options.tour?contains(desa,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8)):x>=78&&x<116&&y>=65&&y<85;
  document.activeElement?.blur();
  const keys=(dx,dy)=>{for(const k of scene.tombol.kiri)k.isDown=dx<0;for(const k of scene.tombol.kanan)k.isDown=dx>0;for(const k of scene.tombol.atas)k.isDown=dy<0;for(const k of scene.tombol.bawah)k.isDown=dy>0;};
  const go=(x,y)=>new Promise((resolve,reject)=>{
    const deadline=performance.now()+2500;
    const frame=()=>{travelledPx+=Math.hypot(scene.pemain.x-lastX,scene.pemain.y-lastY);lastX=scene.pemain.x;lastY=scene.pemain.y;const dx=x-scene.pemain.x,dy=y-scene.pemain.y;if(Math.hypot(dx,dy)<1.9){keys(0,0);resolve();return;}if(performance.now()>deadline){keys(0,0);reject(Error(`Route blocked at ${x},${y}`));return;}keys(Math.abs(dx)>1.2?Math.sign(dx):0,Math.abs(dy)>1.2?Math.sign(dy):0);requestAnimationFrame(frame);};frame();
  });
  try {
    for(const stop of goals){
      const goal=stop.tile;
      const start=[Math.floor(scene.pemain.x/16),Math.floor(scene.pemain.y/16)],queue=[start],parent=new Map([[start.join(','),null]]);
      for(let i=0;i<queue.length&&!parent.has(goal.join(','));i++){
        const[x,y]=queue[i];
        for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
          const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;
          if(!allowed(nx,ny)||parent.has(key)||options.tour&&!roads[ny*192+nx]||!bisaBerdiri(world,nx*16+8,ny*16+8))continue;
          let p={x:x*16+8,y:y*16+8};for(let n=0;n<8;n++)p=langkahGerak(world,p,dx,dy,2000/86);
          if(Math.hypot(p.x-(nx*16+8),p.y-(ny*16+8))>.001)continue;
          parent.set(key,`${x},${y}`);queue.push([nx,ny]);
        }
      }
      if(!parent.has(goal.join(',')))throw Error(`No route to ${goal}`);
      const path=[];let key=goal.join(',');while(key!==null){path.push(key.split(',').map(Number));key=parent.get(key);}
      for(const[x,y]of path.reverse())await go(x*16+8,y*16+8);
      visited.push({label:stop.label,target:goal,x:scene.pemain.x,y:scene.pemain.y,atMs:Math.round(performance.now()-started)});
      if(stop.pauseMs)await new Promise(resolve=>setTimeout(resolve,stop.pauseMs));
    }
    return {method:'WASD state → Scene.update → original movement; no setPosition',visited,elapsedMs:Math.round(performance.now()-started),travelledPx};
  } finally {keys(0,0);}
}
