/** Four visual passes over stored V3.6: terrain, structural art, ecology, and mission-gated recovery.
 * Collision, movement, mission/UI logic and other regions stay unchanged. Manual generator only. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {VALLEY as K,VALLEY_FIRST as FIRST,VALLEY_COLS as COLS,PATCH,BASINS,SHAPES,CHANNELS,insidePolygon,valleySvg} from './valley-v37-art.mjs';
const check=process.argv.includes('--check'),file='world/maps/pulau_tirta_v37.tmj',read=p=>JSON.parse(readFileSync(p,'utf8'));
const publish=(p,bytes)=>{if(existsSync(p)&&readFileSync(p).equals(Buffer.from(bytes)))return;if(check)throw Error('Valley differs: '+p);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,bytes);};
if(existsSync(file)&&!check&&!process.argv.includes('--force'))throw Error('V3.7 exists. Preserve artist Tiled edits before explicitly using --force.');
const old=read('world/maps/pulau_tirta_v36.tmj'),map=structuredClone(old),W=192,L=n=>map.layers.find(l=>l.name===n),B=n=>old.layers.find(l=>l.name===n);
const E=L('Environment_V32'),D=L('TerrainDetails'),P=L('Paths'),O=L('Objects'),A=L('AbovePlayer'),RT=L('Recovery_Lembah_Hujan'),RW=L('Recovery_Water_Lembah_Hujan'),RP=L('Recovery_Plants_Lembah_Hujan'),RA=L('Recovery_Canopy_Lembah_Hujan');
const regions=L('Regions').objects,valley=regions.find(r=>r.name==='Lembah Hujan'),others=regions.filter(r=>r!==valley),contains=(r,x,y)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x,y)=>contains(valley,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8)),inPatch=(x,y)=>x>=128&&x<170&&y>=32&&y<64;
const gid=f=>FIRST+f,put=(l,x,y,g)=>{assert(allowed(x,y),`Outside Lembah ${l.name}:${x},${y}`);l.data[y*W+x]=g;};
const protectedPlants=[[135,47],[152,43]],anchor=(x,y)=>protectedPlants.some(p=>p[0]===x&&p[1]===y),inBasin=(x,y)=>BASINS.some(b=>x>=b.x&&x<b.x+b.width&&y>=b.y&&y<b.y+b.height);
const collision=L('Collisions').objects,intersects=(o,x,y)=>o.x<(x+1)*16&&o.x+o.width>x*16&&o.y<(y+1)*16&&o.y+o.height>y*16;
const features=[],trees=[],skipped=[];
const treeBodies=collision.filter(o=>o.name.startsWith('tree_')&&inPatch(Math.floor(o.x/16),Math.floor(o.y/16))),treeCells=new Set(treeBodies.map(o=>Math.floor(o.y/16)*W+Math.floor(o.x/16)));
// PASS 1 — One continuous, asymmetric terrain composition replaces the three old concentric ellipses.
// The atlas is a hand-drawn landform sliced into editable 16px tiles, not a pre-rendered game screenshot.
for(let dy=0;dy<PATCH.height;dy++)for(let dx=0;dx<PATCH.width;dx++){
 const x=PATCH.x+dx,y=PATCH.y+dy,i=y*W+x;put(E,x,y,gid(dy*COLS+dx));put(D,x,y,0);put(RT,x,y,0);put(RW,x,y,0);
 if(!anchor(x,y)&&!treeCells.has(i))put(RP,x,y,0);
 // Keep every existing solid body's graphic. Remove loose old dry scatter in the new lower terrain only.
 if(!anchor(x,y)&&!inBasin(x,y)&&!collision.some(o=>intersects(o,x,y))&&!A.data[i]&&!RA.data[i])put(O,x,y,0);
}
function neighbors(cells,x,y){let n=0;for(const[dx,dy,b]of[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]])if(cells.has((y+dy)*W+x+dx))n|=b;return n;}
const pathCells=new Set(B('Paths').data.flatMap((g,i)=>g&&allowed(i%W,Math.floor(i/W))?[i]:[]));
for(const i of pathCells)put(P,i%W,Math.floor(i/W),gid(K.trail+neighbors(pathCells,i%W,Math.floor(i/W))));
function stamp(l,x,y,w,h,frame){for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)put(l,x+dx,y+dy,gid(frame+dy*COLS+dx));}
// PASS 2 — The main water bowl is larger visually than the secondary pockets, inside the old physics envelopes.
for(const b of BASINS){stamp(O,b.x,b.y,b.width,b.height,b.dry);stamp(RP,b.x,b.y,b.width,b.height,b.wet);}
for(const o of collision.filter(o=>o.name.startsWith('v32_boulder_'))){const x=Math.floor(o.x/16),y=Math.floor(o.y/16);if(inPatch(x,y))stamp(O,x,y,2,2,y>=52?K.boulderMoss:K.boulder);}
stamp(O,154,48,2,1,K.bench);put(O,137,45,gid(K.sign));
// Broadleaf groups use the existing tree-body positions. No additional solid trees are introduced.
for(const[x,y,style]of[[131,42,0],[133,39,1],[137,39,0],[136,33,1],[138,32,0],[161,45,0],[163,46,1],[164,48,0],[163,52,1],[165,53,0],[162,55,0],[140,59,1],[142,59,0],[146,60,1],[156,63,0],[158,63,1]]){
 if(!treeCells.has(y*W+x))continue;let safe=true;
 for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++){const tx=x-1+dx,ty=y-2+dy,i=ty*W+tx,own=(tx===x&&(ty===y||ty===y-1));if(!allowed(tx,ty)||P.data[i]||inBasin(tx,ty)||anchor(tx,ty)||Math.hypot(tx*16+8-2216,ty*16+8-728)<72||!own&&(A.data[i]||O.data[i]||RA.data[i]))safe=false;}
 if(!safe){skipped.push({kind:'rim-tree',x,y});continue;}
 const dry=style?K.tree2Dry:K.treeDry,wet=style?K.tree2Wet:K.treeWet;
 for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++){const tx=x-1+dx,ty=y-2+dy;put(dy===2?O:A,tx,ty,gid(dry+dy*COLS+dx));put(dy===2?RP:RA,tx,ty,gid(wet+dy*COLS+dx));}
 trees.push({x,y,width:3,height:3,existingCollider:true});
}
// PASS 3 — Medium low vegetation and stones follow wetness and rim/slope/floor zones.
function detail(kind,x,y,frame,w=1,recovered){
 for(let dx=0;dx<w;dx++){const tx=x+dx,i=y*W+tx;if(!allowed(tx,y)||!inPatch(tx,y)||P.data[i]||O.data[i]||A.data[i]||RP.data[i]||RA.data[i]||anchor(tx,y)||L('Water').data[i]||Math.hypot(tx*16+8-2216,y*16+8-728)<58||collision.some(o=>intersects(o,tx,y))){skipped.push({kind,x,y});return;}}
 stamp(O,x,y,w,1,frame);if(recovered!==undefined)stamp(RP,x,y,w,1,recovered);features.push({kind,x,y,width:w,height:1,walkableGroundcover:true,recovers:recovered!==undefined});
}
const ecology=[
 {zone:'rim-west',shrubs:[[130,46],[132,38]],stones:[[132,47],[134,37]],tufts:[[130,47],[132,46],[135,38]],flowers:[[132,45]]},
 {zone:'rim-north',shrubs:[[141,37],[150,36],[157,38]],stones:[[143,38],[152,37]],tufts:[[140,38],[150,37],[156,38]],flowers:[[151,36]]},
 {zone:'rim-east',shrubs:[[162,43],[165,49],[162,56]],stones:[[161,43],[163,50]],tufts:[[164,44],[164,49],[164,55]],flowers:[[163,56]]},
 {zone:'slope-south',shrubs:[[147,59],[154,58]],stones:[[144,58],[153,57],[158,55]],tufts:[[145,58],[151,58],[158,56]],flowers:[[155,58]]},
 {zone:'basin-west-bank',shrubs:[[135,51],[141,51]],stones:[[136,51],[140,52]],tufts:[[135,50],[138,52],[141,53]],flowers:[[140,51]]},
 {zone:'basin-main-bank',shrubs:[[143,54],[149,55],[153,52]],stones:[[145,55],[153,54]],tufts:[[143,55],[148,55],[152,54]],flowers:[[150,55],[153,53]]},
 {zone:'basin-north-bank',shrubs:[[148,44],[154,44]],stones:[[149,44],[156,46]],tufts:[[148,45],[155,44],[156,47]],flowers:[[153,44]]}
];
for(const e of ecology){const start=features.length;const damp=e.zone.startsWith('basin');
 for(const[x,y]of e.shrubs)detail(damp?'dormant-reeds':'rim-shrub',x,y,damp?K.reedsDry:K.shrubDry,2,damp?K.reedsWet:K.shrubWet);
 for(const[x,y]of e.stones)detail('embedded-stones',x,y,K.stones,2);
 for(const[x,y]of e.tufts)detail('dry-tuft',x,y,K.tuftDry,1,K.tuftWet);
 for(const[x,y]of e.flowers)detail('flower-bed',x,y,K.tuftDry,1,e.zone==='rim-north'?K.white:damp?K.yellow:K.purple);
 for(let i=start;i<features.length;i++)features[i].zone=e.zone;
}
for(const[x,y]of[[133,49],[135,56],[143,41],[146,43],[156,41],[160,46],[160,55],[147,57]])detail('gravel-fan',x,y,K.gravel,2);
// PASS 4 — Damp soil stays local to the banks; thin rain runnels are visibly shallow/passable.
const damp=new Set(),green=new Set(),channels=new Set();
for(const b of BASINS)for(let y=b.y-1;y<=b.y+b.height;y++)for(let x=b.x-1;x<=b.x+b.width;x++)if(allowed(x,y)&&inPatch(x,y)&&insidePolygon(SHAPES.floor,x+.5,y+.5)&&!inBasin(x,y))damp.add(y*W+x);
for(const[cx,cy]of[[136,50],[142,52],[144,54],[152,54],[155,47]])for(let y=cy-1;y<=cy+1;y++)for(let x=cx-1;x<=cx+1;x++)if(damp.has(y*W+x)&&Math.hypot(x-cx,y-cy)<1.3)green.add(y*W+x);
for(const points of CHANNELS)for(let n=1;n<points.length;n++){
 let[x,y]=points[n-1];const[ex,ey]=points[n];channels.add(y*W+x);while(x!==ex||y!==ey){if(x!==ex)x+=Math.sign(ex-x);else y+=Math.sign(ey-y);channels.add(y*W+x);}
}
for(const i of damp)put(RT,i%W,Math.floor(i/W),gid((green.has(i)?K.green:K.mud)+neighbors(green.has(i)?green:damp,i%W,Math.floor(i/W))));
for(const i of channels){const x=i%W,y=Math.floor(i/W);if(allowed(x,y)&&!inBasin(x,y))put(RW,x,y,gid(K.trickle+neighbors(channels,x,y)));}
// Existing Living World markers keep their original dry/fresh frames; no Phaser logic is touched.
for(const[x,y]of protectedPlants){put(O,x,y,B('Objects').data[y*W+x]);put(RP,x,y,B('Recovery_Plants_Lembah_Hujan').data[y*W+x]);}
// Ownership and contracts are checked before output is written.
for(const l of old.layers){const next=L(l.name);if(!l.data)assert.deepEqual(next,l,l.name);else for(let i=0;i<l.data.length;i++)if(l.data[i]!==next.data[i])assert(allowed(i%W,Math.floor(i/W)),`${l.name} outside Lembah:${i}`);}
assert.deepEqual(P.data.map(Boolean),B('Paths').data.map(Boolean));assert.deepEqual(L('Water'),B('Water'));assert.deepEqual(L('Ground'),B('Ground'));assert.deepEqual(L('Mountain_V36_Detail'),B('Mountain_V36_Detail'));
publish('world/assets/valley_v37/tileset.svg',valleySvg());
publish('world/maps/tilesets/v37_valley.tsj',JSON.stringify({type:'tileset',version:'1.10',tiledversion:'1.11.2',name:'valley_v37',tilewidth:16,tileheight:16,tilecount:2304,columns:COLS,image:'../../assets/valley_v37/tileset.svg',imagewidth:768,imageheight:768,margin:0,spacing:0,tiles:[]},null,2)+'\n');
map.tilesets.push({firstgid:FIRST,source:'tilesets/v37_valley.tsj'});map.properties.find(p=>p.name==='worldVersion').value='3.7-Rainfall-Basin';publish(file,JSON.stringify(map)+'\n');
publish('world/valley-v37.json',JSON.stringify({version:'3.7-Rainfall-Basin',source:'world/maps/pulau_tirta_v36.tmj',visualElevationOnly:true,collisionChanged:false,interaction:{location:'lembah',mission:'misi-3',x:2216,y:728},patch:PATCH,shapes:SHAPES,basins:BASINS,channels:CHANNELS,trees,features,recovery:{mission:'misi-3',dampTiles:damp.size,greenTiles:green.size,channelTiles:channels.size,deepWaterStaysInsideOriginalBasins:true,channelsWalkable:true},protectedLivingAnchors:protectedPlants,placementsSkipped:skipped.length,validationTargets:[[124,57],[130,57],[136,55],[141,52],[145,48],[142,45],[138,45],[143,50],[152,49],[157,53],[161,58],[144,51],[152,52]]},null,2)+'\n');
console.log(`V3.7 rainfall basin: asymmetric rim/slope/floor; main basin and two satellites; ${trees.length} anchored tree canopies, ${features.length} grouped details; local wet recovery, unchanged collision and contracts.`);
