/** Controlled ascent over stored R1. Only local mountain ridge bodies are added; no engine edits. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {FIRST,ridgeSvg} from './puncak-v36-r2-art.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8')),check=process.argv.includes('--check'),file='world/maps/pulau_tirta_v36_r2.tmj';
const publish=(p,s)=>{if(existsSync(p)&&readFileSync(p).equals(Buffer.from(s)))return;if(check)throw Error('Puncak R2 differs: '+p);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,s);};
if(existsSync(file)&&!check&&!process.argv.includes('--force'))throw Error('Preserve Tiled edits; explicit --force required to regenerate Puncak R2.');
const old=read('world/maps/pulau_tirta_v36_r1.tmj'),map=structuredClone(old),W=192,L=n=>map.layers.find(l=>l.name===n),B=n=>old.layers.find(l=>l.name===n);
const P=L('Paths'),E=L('Environment_V32'),bodies=L('Collisions').objects,oldBodies=bodies.slice();
const regions=L('Regions').objects,mountain=regions.find(r=>r.name==='Puncak Kabut'),others=regions.filter(r=>r!==mountain),contains=(r,x,y)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x,y)=>contains(mountain,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8));
const put=(l,x,y,g)=>{assert(allowed(x,y),`${l.name} outside Puncak ${x},${y}`);l.data[y*W+x]=g;};
// PASS 1. Preserve the old climb's landmarks and two stair centres. The lower approach takes
// its existing safe bend below the old cliff, rather than painting a diagonal through its face.
const main=[[69,61],[68,61],[58,60],[47,59],[41,58],[39,56],[39,55],[39,51],[45,49],[55,51],[63,51],[65,49],[65,47],[65,43],[60,43],[56,40],[56,36]];
// The west lookout is now a summit spur, not a second way up from the middle terrace.
const lookout=[[56,36],[56,34],[50,34],[49,36],[47,37],[42,39],[38,42]];
const ribbon=new Set(),playable=new Set();
function disk(set,cx,cy,rx,ry=rx){for(let y=Math.floor(cy-ry);y<=cy+ry;y++)for(let x=Math.floor(cx-rx);x<=cx+rx;x++)if(allowed(x,y)&&((x-cx)/rx)**2+((y-cy)/ry)**2<=1)set.add(y*W+x);}
function route(points,r){for(let k=1;k<points.length;k++){const[a,b]=[points[k-1],points[k]],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*5);for(let j=0;j<=n;j++)disk(ribbon,a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n,r);}}
route(main,1.35);route(lookout,1.1);for(const i of ribbon)playable.add(i);
const landings=[{name:'istirahat-kaki',cx:47,cy:59,rx:3,ry:1.7},{name:'tikungan-barat',cx:39,cy:51,rx:2.1,ry:1.8},{name:'teras-tengah',cx:55,cy:51,rx:3,ry:1.5},{name:'puncak-pengembunan',cx:59.5,cy:39.5,rx:8,ry:6.5},{name:'pandang-barat',cx:38,cy:42,rx:3.2,ry:2}];
for(const l of landings)disk(playable,l.cx,l.cy,l.rx,l.ry);
// A single mouth at the Desa boundary; each terrace has exactly one north/south aperture.
// Whole tile rows are reserved so neither diagonal motion nor the player radius can skip a gate.
for(const i of [...playable]){const x=i%W,y=Math.floor(i/W);if(y>=62||y===55&&(x<38||x>40)||y===47&&(x<64||x>66))playable.delete(i);}
const gates=[{id:'entrance',x:69*16,y:60*16,width:16,height:32,center:[69,61]},
 {id:'stairs-lower',x:38*16,y:55*16,width:48,height:16,center:[39,55]},
 {id:'stairs-upper',x:64*16,y:47*16,width:48,height:16,center:[65,47]}];
// PASS 2. A connected rock ridge follows the ribbon/landing outline. This encloses the usable
// trail instead of leaving a broad traversable meadow between isolated visual cliff segments.
const wall=new Set();for(const i of playable){const x=i%W,y=Math.floor(i/W);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
 const nx=x+dx,ny=y+dy,j=ny*W+nx;if(allowed(nx,ny)&&!playable.has(j))wall.add(j);
}}
// The outer contour also closes the decorative mountain plateaus. Otherwise a player could
// roam on the high grey terrain OUTSIDE the enclosed trail even though the mission was gated.
// Its outline follows the existing asymmetric terrace mass, rather than a rectangular region box.
const terrain=new Set(E.data.flatMap((g,i)=>g&&allowed(i%W,Math.floor(i/W))?[i]:[]));
const outer=[];
for(const i of terrain){if(playable.has(i))continue;const x=i%W,y=Math.floor(i/W);
 if([[0,-1],[1,0],[0,1],[-1,0]].some(([dx,dy])=>!allowed(x+dx,y+dy)||!terrain.has((y+dy)*W+x+dx))){wall.add(i);outer.push([x,y]);}
}
const ridge={id:map.nextlayerid++,name:'Mountain_V36R2_Ridges',type:'tilelayer',width:192,height:144,x:0,y:0,opacity:1,visible:true,properties:[{name:'renderDepth',type:'float',value:9}],data:Array(192*144).fill(0)};
map.layers.splice(map.layers.findIndex(l=>l.type==='objectgroup'),0,ridge);
const walls=[];
for(const i of [...wall].sort((a,b)=>a-b)){const x=i%W,y=Math.floor(i/W);let mask=0;for(const[dx,dy,bit]of[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]])if(wall.has((y+dy)*W+x+dx))mask|=bit;
 const tier=y>=55?0:y>=47?1:2;put(ridge,x,y,FIRST+tier*16+mask);
 const body={id:map.nextobjectid++,name:`v36_r2_ridge_${x}_${y}`,type:'obstacle',x:x*16,y:y*16,width:16,height:16,rotation:0,visible:true,properties:[{name:'collides',type:'bool',value:true}]};bodies.push(body);walls.push({x,y,tier,collider:body.name});
}
// PASS 3. Remove misleading side cuts and oversized paving, keeping a coherent warm route.
// Existing physics is consulted only to avoid painting paths straight through old boulders.
const overlaps=(b,x,y)=>x+4.6>b.x&&x-4.6<b.x+b.width&&y+4.6>b.y&&y-4.6<b.y+b.height;
const oldFree=(x,y)=>!oldBodies.some(b=>overlaps(b,x*16+8,y*16+8));
for(let i=0;i<P.data.length;i++)if(P.data[i]&&allowed(i%W,Math.floor(i/W))&&E.data[i])P.data[i]=0;
for(const i of wall)put(P,i%W,Math.floor(i/W),0);
const road=new Set([...ribbon].filter(i=>playable.has(i)&&oldFree(i%W,Math.floor(i/W))&&!B('AbovePlayer').data[i]));
for(const i of road){const x=i%W,y=Math.floor(i/W);let mask=0;for(const[dx,dy,b]of[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]])if(road.has((y+dy)*W+x+dx))mask|=b;put(P,x,y,4755+48+mask);}
// All nine tiles in both original stair runs remain open; no new entrance or interaction is added.
for(const[cx,cy]of[[39,55],[65,47]])for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=cx+dx,y=cy+dy,i=y*W+x;assert(playable.has(i)&&!wall.has(i));put(P,x,y,B('Paths').data[i]);}
for(const[x,y]of read('world/mountain-v36-r1.json').finalSteps){assert(playable.has(y*W+x));put(P,x,y,B('Paths').data[y*W+x]);}
// PASS 4/5. Keep the entire R1 summit, station, wind/fog, trees and recovery untouched.
// New physical terrain is rendered on its own layer, below old props and below the avatar.
for(const l of old.layers){const n=L(l.name);if(l.name==='Collisions'){assert.deepEqual({...n,objects:n.objects.slice(0,oldBodies.length)},l);continue;}
 if(!l.data){assert.deepEqual(n,l,l.name);continue;}
 if(l.name!=='Paths')assert.deepEqual(n,l,l.name);else for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data[i])assert(allowed(i%W,Math.floor(i/W)));
}
assert(walls.every(w=>allowed(w.x,w.y)&&!P.data[w.y*W+w.x]));
for(let y=37;y<=41;y++)for(let x=55;x<=61;x++)assert(!ridge.data[y*W+x],'Ridge over observation deck');
publish('world/assets/mountain_v36_r2/tileset.svg',ridgeSvg());
publish('world/maps/tilesets/v36_r2_ridges.tsj',JSON.stringify({type:'tileset',version:'1.10',tiledversion:'1.11.2',name:'mountain_v36_r2',tilewidth:16,tileheight:16,tilecount:64,columns:16,image:'../../assets/mountain_v36_r2/tileset.svg',imagewidth:256,imageheight:64,margin:0,spacing:0,tiles:[]},null,2)+'\n');
map.tilesets.push({firstgid:FIRST,source:'tilesets/v36_r2_ridges.tsj'});map.properties.find(p=>p.name==='worldVersion').value='3.6-R2-Controlled-Ascent';publish(file,JSON.stringify(map)+'\n');
publish('world/mountain-v36-r2.json',JSON.stringify({version:'3.6-R2-Controlled-Ascent',source:'world/maps/pulau_tirta_v36_r1.tmj',mainRoute:main,lookoutRoute:lookout,landings,gates,walls,outerContour:outer,localColliders:walls.length,engineChanged:false,originalCollidersPreserved:true,playableCells:[...playable].map(i=>[i%W,Math.floor(i/W)]),mission:{id:'misi-2',location:'puncak',x:968,y:696,radius:36},validationTargets:[[74,61],[69,61],[68,61],[58,60],[47,59],[41,58],[39,55],[39,51],[45,49],[55,51],[63,51],[65,47],[65,43],[60,43],[56,36],[38,42]],note:'Local ridge silhouettes enclose the official trail and designated landings, and seal the outer mountain contour. Rest/lookout spur is reached after the upper stairs. No global movement, camera, collision engine or mission change.'},null,2)+'\n');
console.log(`Puncak R2: one entrance, two compulsory stair gates, ${walls.length} local 16x16 ridge bodies; all old objects and other regions preserved.`);
