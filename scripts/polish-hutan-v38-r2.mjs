/** Targeted R2: native tree clusters, original river continuity and one decorative timber hut.
 * No new image/tileset, collider, interaction or gameplay system. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
const check=process.argv.includes('--check'),file='world/maps/pulau_tirta_v38_r2.tmj',read=p=>JSON.parse(readFileSync(p,'utf8'));
const publish=(p,bytes)=>{if(existsSync(p)&&readFileSync(p).equals(Buffer.from(bytes)))return;if(check)throw Error('Forest R2 differs: '+p);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,bytes);};
if(existsSync(file)&&!check&&!process.argv.includes('--force'))throw Error('R2 exists. Preserve artist Tiled edits before explicitly using --force.');
const old=read('world/maps/pulau_tirta_v38_r1.tmj'),map=structuredClone(old),W=192,L=n=>map.layers.find(l=>l.name===n),B=n=>old.layers.find(l=>l.name===n);
const O=L('Objects'),A=L('AbovePlayer'),P=L('Paths'),V=L('Water'),F=L('Facades'),RP=L('Recovery_Plants_Hutan_Sungai'),RA=L('Recovery_Canopy_Hutan_Sungai');
const regions=L('Regions').objects,forest=regions.find(r=>r.name==='Hutan & Sungai'),others=regions.filter(r=>r!==forest),contains=(r,x,y)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x,y)=>contains(forest,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8)),put=(l,x,y,g)=>{assert(allowed(x,y),`${l.name} outside Hutan:${x},${y}`);l.data[y*W+x]=g;};
const bodies=L('Collisions').objects,overlap=(o,x,y)=>o.x<(x+1)*16&&o.x+o.width>x*16&&o.y<(y+1)*16&&o.y+o.height>y*16;
const protectedCells=[[138,104],[144,114],[145,107],[147,107],[145,109],[147,109],[156,102],[157,102],[156,103]],special=(x,y)=>protectedCells.some(p=>p[0]===x&&p[1]===y)||(x>=144&&x<=148&&y>=106&&y<=110)||(x===144&&y===105)||Math.hypot(x*16+8-2264,y*16+8-1704)<64;
function nearPath(x,y){for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(P.data[(y+dy)*W+x+dx])return true;return false;}
// One tiny 32x48 hut, on the old 2x2 boulder footprint. Walls stay on its old solid body.
const hut={x:138,y:107,width:2,height:3,door:[139,109],approach:[139,110],reusesCollider:'v32_boulder_138_108',decorative:true};
assert(bodies.some(o=>o.name===hut.reusesCollider));
for(let y=107;y<=108;y++)for(let x=138;x<=139;x++){assert(!P.data[y*W+x]&&!V.data[y*W+x]&&!A.data[y*W+x]);if(y===107)assert(!O.data[y*W+x]);put(A,x,y,133+(y===107?(x===138?48:50):(x===138?60:62)));put(O,x,y,0);}
put(O,138,109,133+84);put(O,139,109,133+87);put(F,139,109,133+85);
assert(!O.data[110*W+139]&&!P.data[110*W+139]&&!V.data[110*W+139]);assert(P.data[110*W+140]);put(P,139,110,764);
const nearHut=(x,y)=>x>=137&&x<=140&&y>=106&&y<=111;
// The original generator drained y104..108 for the bridge: restore the hidden bed only under deck.
const underDeck=[],retiled=[];
for(let y=105;y<=107;y++)for(let x=153;x<=155;x++){assert([601,602].includes(P.data[y*W+x]));put(V,x,y,434);underDeck.push([x,y]);}
for(const y of[103,109])for(const[x,g]of(y===103?[[153,433],[154,434],[155,435]]:[[152,433],[153,434],[154,435]])){assert(V.data[y*W+x]);put(V,x,y,g);retiled.push([x,y]);}
// The original small-pool shoreline pieces share the exact Tiny Battle palette and are nonphysical.
// They bridge the visible bank gap under the railings without turning walkable cells into deep water.
const visual={id:map.nextlayerid++,name:'Forest_Bridge_Water_Visual',type:'tilelayer',width:192,height:144,x:0,y:0,opacity:1,visible:true,properties:[{name:'renderDepth',type:'float',value:6}],data:Array(192*144).fill(0)};
map.layers.splice(map.layers.findIndex(l=>l.type==='objectgroup'),0,visual);
const lips=[[153,104,397+3],[154,104,397+4],[153,108,397+21],[154,108,397+22]];for(const[x,y,g]of lips)put(visual,x,y,g);
// Original 16x32 tree pairs reuse existing inland rock colliders, grouped near established trees.
const groves=[{name:'barat',box:[125,96,137,122]},{name:'hulu',box:[140,84,154,100]},{name:'timur',box:[166,94,178,118]},{name:'selatan',box:[134,120,151,133]}];
const trees=[],details=[],originalTrees=bodies.filter(o=>o.name.startsWith('tree_')||o.name.startsWith('v32_tree_'));
for(const grove of groves){let count=0;for(const o of bodies.filter(o=>o.name.startsWith('rock_'))){const x=Math.floor(o.x/16),y=Math.floor(o.y/16),i=y*W+x;const[x1,y1,x2,y2]=grove.box;
 const above=O.data[(y-1)*W+x],lowAbove=[304,305,306,317,318,329,330,331,343,344,402].includes(above)&&!bodies.some(b=>overlap(b,x,y-1));
 if(count>=6||x<x1||x>=x2||y<y1||y>=y2||!allowed(x,y-1)||special(x,y)||special(x,y-1)||nearHut(x,y)||nearPath(x,y)||nearPath(x,y-1)||V.data[i]||V.data[(y-1)*W+x]||A.data[(y-1)*W+x]||above&&!lowAbove||RA.data[(y-1)*W+x]||!originalTrees.some(t=>Math.hypot(t.x/16-x,t.y/16-y)<3.3))continue;
 put(O,x,y,149);put(A,x,y-1,137);if(RP.data[i]){put(RP,x,y,149);put(RA,x,y-1,137);}trees.push({x,y,width:1,height:2,group:grove.name,reusesCollider:o.name});count++;
}}
const loose=new Set([304,305,306,317,318,329,330,331,343,344,402]);
function detail(kind,x,y,g){const i=y*W+x,replace=O.data[i]===B('Objects').data[i]&&loose.has(O.data[i])&&!RP.data[i];
 if(!allowed(x,y)||special(x,y)||V.data[i]||P.data[i]||visual.data[i]||O.data[i]&&!replace||RP.data[i]||A.data[i]||RA.data[i]||bodies.some(o=>overlap(o,x,y)))return false;
 if(kind==='anakan-original'&&(nearPath(x,y)||nearHut(x,y)))return false;
 put(O,x,y,g);details.push({kind,x,y,gid:g,walkableGroundcover:true});return true;
}
function pocket(kind,x,y,g){for(const[dx,dy]of[[0,0],[1,0],[-1,1],[0,-1]])if(detail(kind,x+dx,y+dy,g))return true;return false;}
// Irregular, small islands of original understory pines; no new solid tree bodies.
const clusters=[
 ['barat',[[128,102],[129,103],[130,101],[131,104],[129,105],[132,103]]],
 ['hulu',[[144,88],[145,89],[146,87],[147,90],[145,91],[148,88]]],
 ['timur',[[170,100],[171,101],[172,99],[173,102],[171,103],[174,101]]],
 ['selatan',[[139,124],[140,125],[141,123],[142,126],[140,127],[143,124]]],
 ['pangkal-hutan',[[149,116],[150,117],[151,115],[152,118],[150,119]]]
];
for(const[name,points]of clusters){const start=details.length;for(const[x,y]of points)pocket('anakan-original',x,y,292);for(const[x,y]of points.filter((_,i)=>i%2===0)){pocket('semak-rumpun',x-1,y+1,305);pocket('rumput-rumpun',x+1,y+1,915+69);}for(let i=start;i<details.length;i++)details[i].group=name;}
for(const[x,y,g]of[[137,110,239],[136,112,305],[139,112,915+72],[135,108,306]])pocket('halaman-pondok',x,y,g);
for(const[x,y,g]of[[151,103,342],[152,104,915+69],[155,103,306],[151,109,305],[155,109,343],[165,108,915+73],[165,104,306]])pocket('tepian-jembatan',x,y,g);
for(const l of old.layers){const n=L(l.name);if(!l.data)assert.deepEqual(n,l,l.name);else for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data[i])assert(allowed(i%W,Math.floor(i/W)),`${l.name} outside Hutan:${i}`);}
for(const[x,y]of protectedCells)for(const l of[O,RP])assert.equal(l.data[y*W+x],B(l.name).data[y*W+x]);
for(let y=105;y<=107;y++)for(let x=153;x<=163;x++)assert.equal(P.data[y*W+x],B('Paths').data[y*W+x]);assert.deepEqual(map.tilesets,old.tilesets);
map.properties.find(p=>p.name==='worldVersion').value='3.8-R2-Forest-Hut';publish(file,JSON.stringify(map)+'\n');
publish('world/forest-v38-r2.json',JSON.stringify({version:'3.8-R2-Forest-Hut',source:'world/maps/pulau_tirta_v38_r1.tmj',usesNewAssets:false,collisionChanged:false,hut,trees,details,river:{diagnosis:'Original bridge clearing removed water at rows104..108',underDeck,retiled,visualLips:lips,visualLayer:visual.name,shallowNonphysicalLips:true},protectedCells,validationTargets:[[124,101],[129,101],[136,103],[141,106],[141,110],[139,110],[145,113],[150,112],[153,108],[154,106],[158,106],[163,106],[165,110],[145,108],[147,110]]},null,2)+'\n');
console.log(`Forest R2: ${trees.length} original tree pairs on old bodies, ${details.filter(d=>d.kind==='anakan-original').length} low pines, one native hut; original-water continuity under unchanged bridge.`);
