/** Broad mountain terraces over the latest integrated world. Archives remain immutable. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {insidePolygon} from './valley-v37-art.mjs';
import {FIRST,COLS,TILE as K} from './puncak-v36-r1-art.mjs';
import {FIRST as RIDGE} from './puncak-v36-r2-art.mjs';

const source='world/maps/pulau_tirta_v37_r2.tmj',file='world/maps/pulau_tirta_v36_r2_structure.tmj';
const read=p=>JSON.parse(readFileSync(p,'utf8')),check=process.argv.includes('--check');
const old=read(source),map=structuredClone(old),W=192;
const L=n=>map.layers.find(l=>l.name===n),B=n=>old.layers.find(l=>l.name===n);
const regions=L('Regions').objects,mountain=regions.find(r=>r.name==='Puncak Kabut');
const contains=(r,x,y)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x,y)=>contains(mountain,x*16+8,y*16+8)&&!regions.some(r=>r!==mountain&&contains(r,x*16+8,y*16+8));
const localBody=b=>allowed(Math.floor(b.x/16),Math.floor(b.y/16))&&allowed(Math.floor((b.x+b.width-.01)/16),Math.floor((b.y+b.height-.01)/16));
const put=(l,x,y,g)=>{assert(allowed(x,y),`${l.name} outside Puncak ${x},${y}`);l.data[y*W+x]=g;};
const P=L('Paths'),E=L('Environment_V32'),O=L('Objects'),ridge=L('Mountain_V36R2_Ridges');
const rim=L('Mountain_V36R1_Rim'),shadow=L('Mountain_V36R1_Shadow');

// A single exterior silhouette contains broad terraces, rather than tracing both sides of
// every metre of trail. The two horizontal cliff faces alone divide the ascent into stages.
const outline=[[37,62],[68,62],[69,61],[69,59],[68,57],[69,53],[70,50],[69,48],
 [70,45],[71,41],[70,37],[68,34],[64,32],[56,32],[52,33],[49,36],[49,42],
 [47,44],[45,46],[41,47],[37,49],[36,52],[36,56],[35,59]];
const playable=new Set();
for(let y=31;y<=61;y++)for(let x=34;x<=71;x++)if(allowed(x,y)&&insidePolygon(outline,x+.5,y+.5))playable.add(y*W+x);
// Exactly one 32px mouth stays on the original approach from Desa.
for(let y=60;y<=61;y++)for(let x=67;x<=69;x++)playable.add(y*W+x);
const gates=[
 {id:'entrance',x:69*16,y:60*16,width:16,height:32,center:[69,61]},
 {id:'stairs-lower',x:38*16,y:55*16,width:48,height:32,center:[39,55]},
 {id:'stairs-upper',x:64*16,y:47*16,width:48,height:32,center:[65,47]},
];
const dividers=[{y:55,cx:39,tier:0},{y:47,cx:65,tier:1}];
const faces=new Map();
for(const d of dividers)for(let x=34;x<=71;x++)if(x<d.cx-1||x>d.cx+1){
 if(![d.y,d.y+1].every(y=>playable.has(y*W+x)))continue;
 faces.set(d.y*W+x,d);for(let dy=0;dy<2;dy++)playable.delete((d.y+dy)*W+x);
}

// Replace only obsolete local terrain bodies. Props, railings, water, all other regions,
// and all existing colliders straddling the region boundary remain exactly as received.
const removed=B('Collisions').objects.filter(b=>localBody(b)&&(b.name.startsWith('v36_r2_ridge_')||b.name.startsWith('v32_cliff_')));
const removedNames=new Set(removed.map(b=>b.name));
L('Collisions').objects=L('Collisions').objects.filter(b=>!removedNames.has(b.name));
for(const b of removed.filter(b=>b.name.startsWith('v32_cliff_'))){
 const x=Math.floor(b.x/16),y=Math.floor(b.y/16);for(let dy=0;dy<2;dy++)put(O,x,y+dy,0);
}
for(let i=0;i<P.data.length;i++)if(allowed(i%W,Math.floor(i/W))){
 P.data[i]=0;ridge.data[i]=0;rim.data[i]=0;
 // Keep the observation deck's established low landing shadow.
 if(!(Math.floor(i/W)===42&&i%W>=55&&i%W<=61))shadow.data[i]=0;
}
const mask=(set,x,y)=>[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]].reduce((v,[dx,dy,b])=>v|(set.has((y+dy)*W+x+dx)?b:0),0);
for(const i of playable){const x=i%W,y=Math.floor(i/W),tier=y>=57?0:y>=49?1:2;
 put(E,x,y,FIRST+[K.foot,K.slope,K.summit][tier]+mask(playable,x,y));
}
// Keep the lighter crown around the experiment deck, with a clear final ascent above it.
for(const i of playable){const x=i%W,y=Math.floor(i/W);if(x>=54&&x<=66&&y>=34&&y<=44)put(E,x,y,FIRST+K.landing+mask(playable,x,y));}

const wall=new Set(),faceCells=new Set([...faces.keys()].flatMap(i=>[i,i+W]));
for(const i of playable){const x=i%W,y=Math.floor(i/W);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
 const nx=x+dx,ny=y+dy,j=ny*W+nx;
 if(allowed(nx,ny)&&!playable.has(j)&&!faceCells.has(j)&&!(nx===70&&ny>=60&&ny<=61))wall.add(j);
}}
// Only one exterior edge: retaining the former decorative contour as a second wall would
// recreate the parallel cliff corridors that this revision is intended to remove.
const walls=[];
function body(x,y,width,height,name,kind){
 const b={id:map.nextobjectid++,name,type:'obstacle',x:x*16,y:y*16,width:width*16,height:height*16,rotation:0,visible:true,
  properties:[{name:'collides',type:'bool',value:true}]};
 assert(localBody(b));L('Collisions').objects.push(b);walls.push({x,y,width,height,collider:name,kind});
}
for(const[i,d]of faces){const x=i%W,y=Math.floor(i/W),ends=Number(faces.has(i-1))+2*Number(faces.has(i+1));
 const frame=[K.cliffFoot,K.cliffSlope][d.tier]+(Math.floor(x/4)%4)*4+ends;
 put(O,x,y,FIRST+frame);put(O,x,y+1,FIRST+frame+COLS);
 body(x,y,1,2,`puncak_structure_face_${x}_${y}`,'terrace');
 if(playable.has((y-1)*W+x)&&!O.data[(y-1)*W+x])put(rim,x,y-1,FIRST+K.rim+10);
 if(allowed(x,y+2))put(shadow,x,y+2,FIRST+K.shadow+10);
}
for(const i of [...wall].sort((a,b)=>a-b)){const x=i%W,y=Math.floor(i/W),tier=y>=55?0:y>=47?1:2;
 put(ridge,x,y,RIDGE+tier*16+mask(wall,x,y));
 body(x,y,1,1,`puncak_structure_edge_${x}_${y}`,'outer-edge');
}

const stages=[
 {id:'foothills',name:'Kaki gunung',points:[[69,61],[66,60],[55,60],[44,59],[39,58],[39,55]]},
 {id:'middle',name:'Teras istirahat',points:[[39,55],[39,52],[44,51],[55,51],[65,51],[65,47]]},
 {id:'checkpoint',name:'Pos pengembunan',points:[[65,47],[65,43],[61,43],[60,43]]},
 {id:'summit',name:'Pendakian akhir dan viewpoint',points:[[60,43],[58,43],[58,42],[59,41],[59,37],[57,36],[57,34]]},
];
const road=new Set();
function disk(cx,cy,rx,ry=rx){for(let y=Math.floor(cy-ry);y<=cy+ry;y++)for(let x=Math.floor(cx-rx);x<=cx+rx;x++)
 if(playable.has(y*W+x)&&((x-cx)/rx)**2+((y-cy)/ry)**2<=1)road.add(y*W+x);}
for(const s of stages)for(let k=1;k<s.points.length;k++){
 const[a,b]=[s.points[k-1],s.points[k]],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*5);
 for(let j=0;j<=n;j++)disk(a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n,1.3);
}
// Small landing spaces punctuate the trail, while the terraces themselves stay open scree.
for(const[x,y,rx,ry]of[[44,59,2.6,1],[54,51,3.1,1.7],[62,43,2.1,1.5],[57,34,2.5,1.1]])disk(x,y,rx,ry);
const blocked=(x,y)=>L('Collisions').objects.some(b=>x*16+8+4.6>b.x&&x*16+8-4.6<b.x+b.width&&y*16+8+4.6>b.y&&y*16+8-4.6<b.y+b.height);
for(const i of [...road]){const x=i%W,y=Math.floor(i/W);if(blocked(x,y)||L('AbovePlayer').data[i])road.delete(i);}
for(const i of road){const x=i%W,y=Math.floor(i/W);put(P,x,y,FIRST+K.trail+mask(road,x,y));}
// Exactly reuse the two 48px stair stamps and the low step onto the experiment deck.
for(const[cx,cy]of[[39,55],[65,47]])for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++){
 const x=cx-1+dx,y=cy-1+dy;assert(playable.has(y*W+x));put(P,x,y,FIRST+K.stairs+dy*COLS+dx);
}
for(const[x,y]of read('world/mountain-v36-r1.json').finalSteps)put(P,x,y,B('Paths').data[y*W+x]);

const changedLayers=['Paths','Environment_V32','Objects','Mountain_V36R1_Rim','Mountain_V36R1_Shadow','Mountain_V36R2_Ridges'];
for(const l of old.layers){const n=L(l.name);
 if(l.name==='Collisions'){assert.deepEqual(n.objects.slice(0,l.objects.length-removed.length),l.objects.filter(b=>!removedNames.has(b.name)));continue;}
 if(!changedLayers.includes(l.name)){assert.deepEqual(n,l,l.name);continue;}
 for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data[i])assert(allowed(i%W,Math.floor(i/W)),`${l.name} outside Puncak`);
}
// Station props, fog and recovery are not part of this layout revision.
for(let y=37;y<=41;y++)for(let x=55;x<=61;x++)assert.equal(O.data[y*W+x],B('Objects').data[y*W+x]);
const version='3.6-R2-Structure-Fix';map.properties.find(p=>p.name==='worldVersion').value=version;
const manifest={version,source,outline,stages,gates,viewpoint:[57,34],mission:{id:'misi-2',location:'puncak',x:968,y:696,radius:36},
 changedLayers,removedTerrainBodies:removed.map(b=>b.name),walls,playableCells:[...playable].map(i=>[i%W,Math.floor(i/W)]),
 validationTargets:[[74,61],...stages.flatMap(s=>s.points),[57,41],[61,39]],
 note:'Broad open terraces, two compulsory stair crossings, one original entrance. The obsolete west lookout branch is scenic terrain; the northern existing observation rail is the summit endpoint. Local terrain bodies only; no engine or mission changes.'};
function publish(p,bytes){if(existsSync(p)&&readFileSync(p).equals(Buffer.from(bytes)))return;
 if(check)throw Error('Puncak structure differs: '+p);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,bytes);}
if(existsSync(file)&&!check&&!process.argv.includes('--force'))throw Error('Preserve Tiled edits; pass --force explicitly to regenerate.');
publish(file,JSON.stringify(map)+'\n');publish('world/mountain-v36-r2-structure.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Puncak structure: ${playable.size} broad terrace cells, ${removed.length} obsolete terrain bodies replaced by ${walls.length} local bodies; original assets and other regions preserved.`);
