/** Visual catchment refinement over Puncak R2; no collision, gameplay or other-region changes. */
import assert from'node:assert/strict';import{readFileSync,writeFileSync,mkdirSync,existsSync}from'node:fs';import{dirname}from'node:path';
import{FIRST,COLS,COUNT,K,PATCH,RUNNEL_PATCH,BASINS,DRAINS,rounded,insidePolygon,valleyRefinementSvg}from'./valley-v37-r1-art.mjs';
import{VALLEY as OLD,SHAPES}from'./valley-v37-art.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8')),check=process.argv.includes('--check'),file='world/maps/pulau_tirta_v37_r1.tmj';
const publish=(p,s)=>{if(existsSync(p)&&readFileSync(p).equals(Buffer.from(s)))return;if(check)throw Error('Lembah R1 differs: '+p);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,s);};
if(existsSync(file)&&!check&&!process.argv.includes('--force'))throw Error('Preserve Tiled edits; explicit --force required to regenerate Lembah R1.');
const old=read('world/maps/pulau_tirta_v36_r2.tmj'),map=structuredClone(old),W=192,L=n=>map.layers.find(l=>l.name===n),B=n=>old.layers.find(l=>l.name===n);
const E=L('Environment_V32'),P=L('Paths'),O=L('Objects'),RP=L('Recovery_Plants_Lembah_Hujan'),RT=L('Recovery_Lembah_Hujan'),RW=L('Recovery_Water_Lembah_Hujan');
const regions=L('Regions').objects,valley=regions.find(r=>r.name==='Lembah Hujan'),others=regions.filter(r=>r!==valley),contains=(r,x,y)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x,y)=>contains(valley,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8)),put=(l,x,y,g)=>{assert(allowed(x,y),`${l.name} outside Lembah ${x},${y}`);l.data[y*W+x]=g;};
const inBasin=(x,y)=>BASINS.some(b=>x>=b.x&&x<b.x+b.width&&y>=b.y&&y<b.y+b.height),anchors=read('world/valley-v37.json').protectedLivingAnchors;
const inPatch=(x,y)=>x>=PATCH.x&&x<PATCH.x+PATCH.width&&y>=PATCH.y&&y<PATCH.y+PATCH.height;
// PASS 1/2. Keep the established rim, trees, buildings and water envelopes; replace the shallow
// closed rings with broad inclined banks and a connected low silt plain.
for(let dy=0;dy<PATCH.height;dy++)for(let dx=0;dx<PATCH.width;dx++){const x=PATCH.x+dx,y=PATCH.y+dy;put(E,x,y,FIRST+dy*COLS+dx);put(RT,x,y,0);put(RW,x,y,0);}
for(const b of BASINS)for(let dy=0;dy<b.height;dy++)for(let dx=0;dx<b.width;dx++){put(O,b.x+dx,b.y+dy,FIRST+b.dry+dy*COLS+dx);put(RP,b.x+dx,b.y+dy,FIRST+b.wet+dy*COLS+dx);}
// Graded stone treads mark the old path's descent over the broad bank; still the SAME route.
const ramps=[];for(let y=39;y<=45;y++)for(let x=134;x<=157;x++)if(P.data[y*W+x]&&insidePolygon([[134,42],[136,39.5],[141,37.8],[147,38.3],[153,39.2],[157,40.2],[156,43.4],[152.5,42.5],[147,42.2],[141,41.8],[137,42.5],[135,44.3]],x+.5,y+.5)){put(P,x,y,FIRST+K.ramp);ramps.push([x,y]);}
// PASS 3. Runnels use one smoothly rounded, shallow composition beneath the existing dry crossings.
// Only tiles touched by a curve are exported: transparent filler is not added to the tilemap.
const channelCells=new Set(),samples=[];
for(const d of DRAINS){const pts=rounded(d.points);for(let j=1;j<pts.length;j++){const[a,b]=[pts[j-1],pts[j]],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*32));for(let k=0;k<=n;k++){
 const x=a[0]+(b[0]-a[0])*k/n,y=a[1]+(b[1]-a[1])*k/n;samples.push([x,y]);
 // Eight-pixel wet margin: include neighbouring tiles crossed by the actual curved graphic.
 for(const dx of[-.3,0,.3])for(const dy of[-.3,0,.3]){const tx=Math.floor(x+dx),ty=Math.floor(y+dy);if(allowed(tx,ty)&&tx>=RUNNEL_PATCH.x&&tx<RUNNEL_PATCH.x+RUNNEL_PATCH.width&&ty>=RUNNEL_PATCH.y&&ty<RUNNEL_PATCH.y+RUNNEL_PATCH.height&&!inBasin(tx,ty))channelCells.add(ty*W+tx);}
 }}}
for(const i of channelCells){const x=i%W,y=Math.floor(i/W);put(RW,x,y,FIRST+K.runnels+(y-RUNNEL_PATCH.y)*COLS+x-RUNNEL_PATCH.x);}
const damp=new Set(),green=new Set(),wetFans=[[[143,49],[146,47.8],[150,48.3],[153,50],[153,52.5],[151,55],[148,55],[144,53.5],[143,51]],[[140,49],[143,48.8],[145.2,50],[144,52],[141,51.5]],[[151,46.5],[154,47],[153.2,49.5],[150,50],[149.5,48.6]]];
for(let y=PATCH.y;y<PATCH.y+PATCH.height;y++)for(let x=PATCH.x;x<PATCH.x+PATCH.width;x++)if(allowed(x,y)&&!inBasin(x,y)&&insidePolygon(SHAPES.floor,x+.5,y+.5)&&
 (wetFans.some(a=>insidePolygon(a,x+.5,y+.5))||samples.some(([px,py])=>Math.hypot(px-x-.5,py-y-.5)<.85)))damp.add(y*W+x);
for(const[cx,cy]of[[142,50],[153,49],[148,54]])for(const i of damp)if(Math.hypot(i%W+.5-cx,Math.floor(i/W)+.5-cy)<1.2)green.add(i);
const mask=(cells,x,y)=>[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]].reduce((m,[dx,dy,b])=>m|(cells.has((y+dy)*W+x+dx)?b:0),0);
for(const i of damp){const x=i%W,y=Math.floor(i/W),cells=green.has(i)?green:damp;put(RT,x,y,2451+(green.has(i)?OLD.green:OLD.mud)+mask(cells,x,y));}
// PASS 4. A few dormant bank plants recover; old trees/rock groups stay intact.
const details=[];for(const[x,y,frame,wet]of[[143,53,OLD.tuftDry,OLD.tuftWet],[144,55,OLD.tuftDry,OLD.white],[151,55,OLD.tuftDry,OLD.yellow],[143,54,OLD.tuftDry,OLD.yellow],[153,53,OLD.tuftDry,OLD.tuftWet],[142,51,OLD.tuftDry,OLD.white],[140,52,OLD.tuftDry,OLD.tuftWet],[149,55,OLD.tuftDry,OLD.yellow]]){
 const i=y*W+x;if(!allowed(x,y)||P.data[i]||O.data[i]||RP.data[i]||L('AbovePlayer').data[i]||inBasin(x,y)||map.layers.find(l=>l.name==='Collisions').objects.some(o=>o.x<(x+1)*16&&o.x+o.width>x*16&&o.y<(y+1)*16&&o.y+o.height>y*16))continue;
 put(O,x,y,2451+frame);put(RP,x,y,2451+wet);details.push({x,y,before:2451+frame,after:2451+wet,walkable:true});
}
for(const l of old.layers){const n=L(l.name);if(!l.data){assert.deepEqual(n,l,l.name);continue;}for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data[i])assert(allowed(i%W,Math.floor(i/W)),`${l.name} outside Lembah`);
 if(!['Environment_V32','Paths','Objects','Recovery_Plants_Lembah_Hujan','Recovery_Lembah_Hujan','Recovery_Water_Lembah_Hujan'].includes(l.name))assert.deepEqual(n,l,l.name);
}
assert.deepEqual(P.data.map(Boolean),B('Paths').data.map(Boolean));for(const[x,y]of anchors)for(const n of['Objects','Recovery_Plants_Lembah_Hujan'])assert.equal(L(n).data[y*W+x],B(n).data[y*W+x]);
const water='world/assets/kenney_tiny_battle/tilemap_packed.png';publish('world/assets/valley_v37_r1/tileset.svg',valleyRefinementSvg(readFileSync(water).toString('base64')));
publish('world/maps/tilesets/v37_r1_catchment.tsj',JSON.stringify({type:'tileset',version:'1.10',tiledversion:'1.11.2',name:'valley_v37_r1',tilewidth:16,tileheight:16,tilecount:COUNT,columns:COLS,image:'../../assets/valley_v37_r1/tileset.svg',imagewidth:768,imageheight:896,margin:0,spacing:0,tiles:[]},null,2)+'\n');
map.tilesets.push({firstgid:FIRST,source:'tilesets/v37_r1_catchment.tsj'});map.properties.find(p=>p.name==='worldVersion').value='3.7-R1-Connected-Catchment';publish(file,JSON.stringify(map)+'\n');
publish('world/valley-v37-r1.json',JSON.stringify({version:'3.7-R1-Connected-Catchment',source:'world/maps/pulau_tirta_v36_r2.tmj',patch:PATCH,basins:BASINS,drainage:DRAINS,channelCells:[...channelCells].map(i=>[i%W,Math.floor(i/W)]),recovery:{mission:'misi-3',dampTiles:damp.size,greenTiles:green.size,shallowChannels:true},ramps,details,waterSource:{image:water,tile:37,modified:false},protectedLivingAnchors:anchors,collisionChanged:false,routeFootprintChanged:false,validationTargets:read('world/valley-v37.json').validationTargets,limitation:'Deep basins stay inside their old fixed collision envelopes. Inclined banks are visual terrain, runnels are shallow/passable; no new cliff collider or gameplay elevation is introduced.'},null,2)+'\n');
console.log(`Lembah R1: one large low basin, two distinct secondary pockets, four curved drainage reaches; ${channelCells.size} wet channel tiles, ${damp.size} damp soil tiles, ${ramps.length} graded route tiles; collision and all other regions unchanged.`);
