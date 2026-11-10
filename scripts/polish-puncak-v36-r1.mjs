/** Elevation illusion over the latest R4 world, never a gameplay height or collision change. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {FIRST,COLS,TILE as K,elevationSvg} from './puncak-v36-r1-art.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8')),check=process.argv.includes('--check'),file='world/maps/pulau_tirta_v36_r1.tmj';
const publish=(p,s)=>{if(existsSync(p)&&readFileSync(p).equals(Buffer.from(s)))return;if(check)throw Error('Puncak R1 differs: '+p);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,s);};
if(existsSync(file)&&!check&&!process.argv.includes('--force'))throw Error('Preserve Tiled edits; explicit --force required to regenerate Puncak R1.');
const old=read('world/maps/pulau_tirta_v38_r4.tmj'),map=structuredClone(old),W=192,L=n=>map.layers.find(l=>l.name===n),B=n=>old.layers.find(l=>l.name===n);
const E=L('Environment_V32'),P=L('Paths'),O=L('Objects'),A=L('AbovePlayer'),D=L('Mountain_V36_Detail');
const regions=L('Regions').objects,mountain=regions.find(r=>r.name==='Puncak Kabut'),others=regions.filter(r=>r!==mountain),contains=(r,x,y)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x,y)=>contains(mountain,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8));
const put=(l,x,y,g)=>{assert(allowed(x,y),`${l.name} outside Puncak ${x},${y}`);l.data[y*W+x]=g;},gid=n=>FIRST+n;
const layer=(name,depth)=>({id:map.nextlayerid++,name,type:'tilelayer',width:192,height:144,x:0,y:0,opacity:1,visible:true,properties:[{name:'renderDepth',type:'float',value:depth}],data:Array(192*144).fill(0)});
const rim=layer('Mountain_V36R1_Rim',7),shadow=layer('Mountain_V36R1_Shadow',6);
map.layers.splice(map.layers.findIndex(l=>l.type==='objectgroup'),0,rim,shadow);
const anchors=read('world/mountain-v36.json').protectedLivingAnchors;
const wind=(x,y)=>x>=60&&x<=61&&y>=38&&y<=40;
const anchor=(x,y)=>anchors.some(p=>p[0]===x&&p[1]===y);
function mask(cells,x,y){let v=0;for(const[dx,dy,b]of[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]])if(cells.has((y+dy)*W+x+dx))v|=b;return v;}
// PASS 1. Recover the original three terrace envelopes beneath V3.6's decorative patches.
// Rebuild broad, coherent materials: greener foothills, darker slope, brighter cold summit.
const structural=read('world/maps/pulau_tirta_v3_2.tmj').layers.find(l=>l.name==='Environment_V32'),levels=[new Set(),new Set(),new Set()];
for(let i=0;i<E.data.length;i++){const x=i%W,y=Math.floor(i/W),t=structural.data[i]-755;if(allowed(x,y)&&E.data[i]&&t>=0&&t<3)levels[t].add(i);}
for(let t=0;t<3;t++)for(const i of levels[t])put(E,i%W,Math.floor(i/W),gid([K.foot,K.slope,K.summit][t]+mask(levels[t],i%W,Math.floor(i/W))));
const columns=[],rimCells=new Set(),shadowCells=new Set();
for(const body of L('Collisions').objects.filter(o=>o.name.startsWith('v32_cliff_'))){
 const x=Math.floor(body.x/16),y=Math.floor(body.y/16);
 // Full two-tile columns only. The southern border outside the region remains byte-identical.
 if(!allowed(x,y)||!allowed(x,y+1)||![O.data[y*W+x],O.data[(y+1)*W+x]].every(g=>g>=2067&&g<2115))continue;
 const t=y>=60?0:y>=53?1:2;
 const left=L('Collisions').objects.some(o=>o.name===`v32_cliff_${x-1}_${y}`),right=L('Collisions').objects.some(o=>o.name===`v32_cliff_${x+1}_${y}`);
 const variant=Math.floor(x/3)%4,f=[K.cliffFoot,K.cliffSlope,K.cliffSummit][t]+variant*4+Number(left)+2*Number(right);
 put(O,x,y,gid(f));put(O,x,y+1,gid(f+COLS));columns.push({x,y,tier:t,height:2,collider:body.name,frame:f,capPixels:[7,4,2][t]+[0,1,0,2][variant]});
 const upper=(y-1)*W+x;
 if(allowed(x,y-1)&&E.data[upper]&&!P.data[upper]&&!O.data[upper]&&!A.data[upper]&&!anchor(x,y-1)&&!wind(x,y-1))rimCells.add(upper);
 if(allowed(x,y+2)&&!L('Water').data[(y+2)*W+x])shadowCells.add((y+2)*W+x);
}
for(const i of rimCells)put(rim,i%W,Math.floor(i/W),gid(K.rim+mask(rimCells,i%W,Math.floor(i/W))));
for(const i of shadowCells)put(shadow,i%W,Math.floor(i/W),gid(K.shadow+mask(shadowCells,i%W,Math.floor(i/W))));
// Remove only complete low groundcover stamps that obscure a new upper rim; never trees/props.
const cleaned=[];
for(const f of read('world/mountain-v36.json').features.filter(f=>f.walkableGroundcover)){
 let intersects=false;for(let dy=0;dy<f.height;dy++)for(let dx=0;dx<f.width;dx++)if(rimCells.has((f.y+dy)*W+f.x+dx))intersects=true;
 if(!intersects)continue;
 for(let dy=0;dy<f.height;dy++)for(let dx=0;dx<f.width;dx++)put(D,f.x+dx,f.y+dy,0);cleaned.push(f);
}
// PASS 2. Keep the exact switchback footprint. Connected treads rise north through both old ramps.
const trail=new Set(P.data.flatMap((g,i)=>g&&allowed(i%W,Math.floor(i/W))&&E.data[i]?[i]:[]));
for(const i of trail)put(P,i%W,Math.floor(i/W),gid(K.trail+mask(trail,i%W,Math.floor(i/W))));
const stairs=[];
for(const[cx,cy]of[[39,55],[65,47]]){const cells=[];for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++){
 const x=cx-1+dx,y=cy-1+dy;assert(B('Paths').data[y*W+x]);put(P,x,y,gid(K.stairs+dy*COLS+dx));cells.push([x,y]);
 }stairs.push({center:[cx,cy],cells});}
// PASS 3. Bright exposed bedrock forms a coherent summit crown around the unchanged lookout.
const summitCrown=new Set();
for(const i of levels[2]){const x=i%W,y=Math.floor(i/W);if(((x-58.5)/7)**2+((y-39)/5.7)**2<=1)summitCrown.add(i);}
for(const i of summitCrown)put(E,i%W,Math.floor(i/W),gid(K.landing+mask(summitCrown,i%W,Math.floor(i/W))));
const finalSteps=[];
for(let dx=0;dx<3;dx++){const x=57+dx,y=42,i=y*W+x;assert(P.data[i]&&!O.data[i]&&!anchor(x,y)&&!wind(x,y));put(P,x,y,gid(K.lastSteps+dx));finalSteps.push([x,y]);}
// A shallow cast shadow places the EXISTING wooden deck above its approach; it is flat shading.
for(let x=55;x<=61;x++)if(allowed(x,42)&&!O.data[42*W+x])put(shadow,x,42,gid(K.shadow+10));
// PASS 4. No new physical geometry: object groups, water, recovery, fog, living anchors and props
// are immutable. Neither rock faces nor rims are allowed to spread onto a new traversable wall.
for(const l of old.layers){const n=L(l.name);if(!l.data){assert.deepEqual(n,l,l.name);continue;}
 for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data[i])assert(allowed(i%W,Math.floor(i/W)),`${l.name} outside Puncak`);
 if(!['Environment_V32','Objects','Paths','Mountain_V36_Detail'].includes(l.name))assert.deepEqual(n,l,l.name);
}
assert.deepEqual(P.data.map(Boolean),B('Paths').data.map(Boolean));
for(const[x,y]of anchors)assert.equal(O.data[y*W+x],B('Objects').data[y*W+x]);
for(let y=38;y<=40;y++)for(let x=60;x<=61;x++)for(const n of['Objects','AbovePlayer'])assert.equal(L(n).data[y*W+x],B(n).data[y*W+x]);
for(let y=37;y<=41;y++)for(let x=55;x<=61;x++)assert.equal(D.data[y*W+x],B('Mountain_V36_Detail').data[y*W+x]);
publish('world/assets/mountain_v36_r1/tileset.svg',elevationSvg());
publish('world/maps/tilesets/v36_r1_elevation.tsj',JSON.stringify({type:'tileset',version:'1.10',tiledversion:'1.11.2',name:'mountain_v36_r1',tilewidth:16,tileheight:16,tilecount:512,columns:COLS,image:'../../assets/mountain_v36_r1/tileset.svg',imagewidth:512,imageheight:256,margin:0,spacing:0,tiles:[]},null,2)+'\n');
map.tilesets.push({firstgid:FIRST,source:'tilesets/v36_r1_elevation.tsj'});
map.properties.find(p=>p.name==='worldVersion').value='3.6-R1-Elevation';publish(file,JSON.stringify(map)+'\n');
publish('world/mountain-v36-r1.json',JSON.stringify({version:'3.6-R1-Elevation',source:'world/maps/pulau_tirta_v38_r4.tmj',visualElevationOnly:true,collisionChanged:false,routeFootprintChanged:false,
 terraces:levels.map((cells,tier)=>({tier,name:['foothills','slope','summit'][tier],cells:cells.size})),cliffColumns:columns,rimCells:[...rimCells].map(i=>[i%W,Math.floor(i/W)]),shadowCells:[...shadowCells].map(i=>[i%W,Math.floor(i/W)]),stairs,finalSteps,summitCrown:[...summitCrown].map(i=>[i%W,Math.floor(i/W)]),cleanedGroundcover:cleaned,protectedLivingAnchors:anchors,
 observation:{mission:'misi-2',location:'puncak',interaction:[968,696],deckPreserved:true},validationTargets:read('world/mountain-v36.json').validationTargets,
 limitation:'Visual height is restricted to the existing two-tile cliff footprints. Extending physical walls requires a separate collision decision; southern columns outside the mountain boundary remain unchanged.'},null,2)+'\n');
console.log(`Puncak R1: three material terraces, ${columns.length} shaded two-tile cliff columns, two connected stair flights, ${summitCrown.size} summit-crown cells. All collision and other regions preserved.`);
