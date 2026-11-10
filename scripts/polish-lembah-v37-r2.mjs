/** Single-entry lower valley over stored R1. Only local visible cut-bank bodies and paths change. */
import assert from'node:assert/strict';import{readFileSync,writeFileSync,mkdirSync,existsSync}from'node:fs';import{dirname}from'node:path';
import{FIRST,COLS,K,BASINS,valleyCutSvg}from'./valley-v37-r2-art.mjs';import{insidePolygon}from'./valley-v37-art.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8')),check=process.argv.includes('--check'),file='world/maps/pulau_tirta_v37_r2.tmj';
const publish=(p,s)=>{if(existsSync(p)&&readFileSync(p).equals(Buffer.from(s)))return;if(check)throw Error('Lembah R2 differs: '+p);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,s);};
if(existsSync(file)&&!check&&!process.argv.includes('--force'))throw Error('Preserve Tiled edits; explicit --force required to regenerate Lembah R2.');
const old=read('world/maps/pulau_tirta_v37_r1.tmj'),map=structuredClone(old),W=192,L=n=>map.layers.find(l=>l.name===n),B=n=>old.layers.find(l=>l.name===n),P=L('Paths'),O=L('Objects'),RP=L('Recovery_Plants_Lembah_Hujan');
const regions=L('Regions').objects,valley=regions.find(r=>r.name==='Lembah Hujan'),others=regions.filter(r=>r!==valley),contains=(r,x,y)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x,y)=>contains(valley,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8)),put=(l,x,y,g)=>{assert(allowed(x,y),`${l.name} outside Lembah ${x},${y}`);l.data[y*W+x]=g;};
// PASS 1. Keep an open lower valley, not a maze of fenced paths. The asymmetric outline follows
// the established slope, with a small southeast shoulder retaining the old basin-bank viewpoint.
const lowerOutline=[[136,38],[141,36],[149,37],[154,38],[160,38],[163,41],[164,45],[163,49],[165,53],[164,56],[162,59],[158,60],[150,61],[144,60],[138,59],[134,56],[133,52],[134,48],[132,45],[134,41]];
const playable=new Set();for(let y=34;y<=62;y++)for(let x=130;x<=167;x++)if(allowed(x,y)&&insidePolygon(lowerOutline,x+.5,y+.5))playable.add(y*W+x);
const descent=[[128,57],[130,57],[133,56],[136,55]];
function disk(cx,cy,r){for(let y=Math.floor(cy-r);y<=cy+r;y++)for(let x=Math.floor(cx-r);x<=cx+r;x++)if(allowed(x,y)&&Math.hypot(x-cx,y-cy)<=r)playable.add(y*W+x);}
for(let n=1;n<descent.length;n++){const[a,b]=[descent[n-1],descent[n]],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*5);for(let k=0;k<=steps;k++)disk(a[0]+(b[0]-a[0])*k/steps,a[1]+(b[1]-a[1])*k/steps,1.35);}
for(let y=56;y<=58;y++)for(let x=128;x<=130;x++)playable.add(y*W+x);
// A straight mouth makes one readable 48px opening; the rest of the cut bends into the basin.
for(const i of [...playable])if(i%W<128)playable.delete(i);
const entrance={x:128*16,y:56*16,width:16,height:48,center:[128,57]},mouth=(x,y)=>x===127&&y>=56&&y<=58;
const wall=new Set();for(const i of playable){const x=i%W,y=Math.floor(i/W);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy,j=ny*W+nx;if(allowed(nx,ny)&&!playable.has(j)&&!mouth(nx,ny))wall.add(j);}}
// Wider exposed banks on the north/east give a real two-tile face where room exists. Other
// sides keep a one-tile barrier: no region-wide invisible wall or changes to old colliders.
for(const i of [...wall]){const x=i%W,y=Math.floor(i/W);if(y>40&&x<164)continue;for(const[dx,dy]of[[0,-1],[1,0],[0,1],[-1,0]]){const nx=x+dx,ny=y+dy,j=ny*W+nx;if(allowed(nx,ny)&&!playable.has(j)&&!mouth(nx,ny))wall.add(j);}}
const bank={id:map.nextlayerid++,name:'Valley_V37R2_Cut_Banks',type:'tilelayer',width:192,height:144,x:0,y:0,opacity:1,visible:true,properties:[{name:'renderDepth',type:'float',value:9}],data:Array(192*144).fill(0)};map.layers.splice(map.layers.findIndex(l=>l.type==='objectgroup'),0,bank);
const bodies=L('Collisions').objects,oldCount=bodies.length,walls=[],closedPathCells=[];
for(const i of [...wall].sort((a,b)=>a-b)){const x=i%W,y=Math.floor(i/W);let mask=0;for(const[dx,dy,b]of[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]])if(wall.has((y+dy)*W+x+dx))mask|=b;
 put(bank,x,y,FIRST+K.wall+mask);if(P.data[i]){closedPathCells.push([x,y]);put(P,x,y,0);}
 const body={id:map.nextobjectid++,name:`v37_r2_bank_${x}_${y}`,type:'obstacle',x:x*16,y:y*16,width:16,height:16,rotation:0,visible:true,properties:[{name:'collides',type:'bool',value:true}]};bodies.push(body);walls.push({x,y,collider:body.name});
}
const steps=[];for(let y=54;y<=58;y++)for(let x=129;x<=136;x++){const i=y*W+x;if(P.data[i]&&playable.has(i)){put(P,x,y,FIRST+K.ramp+Math.min(3,Math.floor((x-129)/2)));steps.push([x,y]);}}
// PASS 2/3. Break the remaining closed mud halos into open deposition lobes. Water polygons,
// basin positions, the four drainage reaches and recovery ownership stay exactly as in R1.
for(const b of BASINS)for(let dy=0;dy<b.height;dy++)for(let dx=0;dx<b.width;dx++){assert(playable.has((b.y+dy)*W+b.x+dx));put(O,b.x+dx,b.y+dy,FIRST+b.dry+dy*COLS+dx);put(RP,b.x+dx,b.y+dy,FIRST+b.wet+dy*COLS+dx);}
// PASS 4. Existing rim vegetation/rocks do the framing; no scatter or new interaction/NPC.
for(const l of old.layers){const n=L(l.name);if(l.name==='Collisions'){assert.deepEqual({...n,objects:n.objects.slice(0,oldCount)},l);continue;}if(!l.data){assert.deepEqual(n,l,l.name);continue;}
 for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data[i])assert(allowed(i%W,Math.floor(i/W)),`${l.name} outside Lembah`);
 if(!['Paths','Objects','Recovery_Plants_Lembah_Hujan'].includes(l.name))assert.deepEqual(n,l,l.name);
}
const previous=read('world/valley-v37-r1.json');for(const[x,y]of previous.protectedLivingAnchors)for(const n of['Objects','Recovery_Plants_Lembah_Hujan'])assert.equal(L(n).data[y*W+x],B(n).data[y*W+x]);
publish('world/assets/valley_v37_r2/tileset.svg',valleyCutSvg(readFileSync(previous.waterSource.image).toString('base64')));
publish('world/maps/tilesets/v37_r2_cut_banks.tsj',JSON.stringify({type:'tileset',version:'1.10',tiledversion:'1.11.2',name:'valley_v37_r2',tilewidth:16,tileheight:16,tilecount:512,columns:COLS,image:'../../assets/valley_v37_r2/tileset.svg',imagewidth:512,imageheight:256,margin:0,spacing:0,tiles:[]},null,2)+'\n');
map.tilesets.push({firstgid:FIRST,source:'tilesets/v37_r2_cut_banks.tsj'});map.properties.find(p=>p.name==='worldVersion').value='3.7-R2-Single-Entry-Valley';publish(file,JSON.stringify(map)+'\n');
publish('world/valley-v37-r2.json',JSON.stringify({version:'3.7-R2-Single-Entry-Valley',source:'world/maps/pulau_tirta_v37_r1.tmj',lowerOutline,descent,entrance,walls,localColliders:walls.length,steps,closedPathCells,playableCells:[...playable].map(i=>[i%W,Math.floor(i/W)]),basins:BASINS,drainagePreserved:true,protectedLivingAnchors:previous.protectedLivingAnchors,mission:{id:'misi-3',location:'lembah',x:2216,y:728,radius:36},validationTargets:previous.validationTargets,note:'Local visible cut banks enclose the lower valley; one southwest descent is the sole entry/exit. Water/recovery topology and every previous collider remain intact. No engine, camera or mission change.'},null,2)+'\n');
console.log(`Lembah R2: one southwest descent, ${walls.length} visible local bank bodies, ${steps.length} descent tiles, ${closedPathCells.length} former side-crossing tiles closed; water system/recovery and other regions preserved.`);
