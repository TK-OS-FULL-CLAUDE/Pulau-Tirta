/** Visual-only mountain composition over stored V3.5.1. No gameplay elevation or physics changes.
 * A: three terraces, existing switchback and cliff footprints.
 * B: open lookout, anchored trees/boulders, existing furniture.
 * C: authored ecological pockets. Never runs during dev/build; Tiled remains editable. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {MOUNTAIN as K,MOUNTAIN_FIRST as FIRST,MOUNTAIN_COLUMNS as COLS,mountainSvg} from './puncak-v36-art.mjs';
const check=process.argv.includes('--check'),file='world/maps/pulau_tirta_v36.tmj',read=p=>JSON.parse(readFileSync(p,'utf8'));
const publish=(p,bytes)=>{if(existsSync(p)&&readFileSync(p).equals(Buffer.from(bytes)))return;if(check)throw Error('Mountain differs: '+p);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,bytes);};
if(existsSync(file)&&!check&&!process.argv.includes('--force'))throw Error('V3.6 exists. Preserve Tiled edits before explicitly using --force.');
const old=read('world/maps/pulau_tirta_v351.tmj'),map=structuredClone(old),W=192,L=n=>map.layers.find(l=>l.name===n),B=n=>old.layers.find(l=>l.name===n);
const G=L('Ground'),D=L('TerrainDetails'),E=L('Environment_V32'),P=L('Paths'),O=L('Objects'),A=L('AbovePlayer'),RP=L('Recovery_Plants_Puncak_Kabut'),RA=L('Recovery_Canopy_Puncak_Kabut');
const regions=L('Regions').objects,mountain=regions.find(r=>r.name==='Puncak Kabut'),others=regions.filter(r=>r!==mountain),contains=(r,x,y)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x,y)=>contains(mountain,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8));
const core=(x,y)=>allowed(x,y)&&x>=29&&x<=73&&y>=26&&y<=62;
const gid=f=>FIRST+f,put=(l,x,y,g)=>{assert(allowed(x,y),`Outside Puncak: ${l.name} ${x},${y}`);l.data[y*W+x]=g;};
const prop=(name,value)=>({name,type:typeof value==='number'?'float':'string',value});
const decor={id:map.nextlayerid++,name:'Mountain_V36_Detail',type:'tilelayer',width:192,height:144,x:0,y:0,opacity:1,visible:true,properties:[prop('renderDepth',8)],data:Array(192*144).fill(0)};
map.layers.splice(map.layers.findIndex(l=>l.type==='objectgroup'),0,decor);
const planted=[],features=[],pockets=[],skipped=[];
// Living World owns these markers and the animated windsock. Preserve their source frames exactly.
const anchors=[[35,51],[47,44],[69,40]],isAnchor=(x,y)=>anchors.some(p=>p[0]===x&&p[1]===y);
const wind=(x,y)=>x>=60&&x<=61&&y>=38&&y<=40;
function maskAt(cells,x,y){let mask=0;for(const[dx,dy,b]of[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]])if(cells.has((y+dy)*W+x+dx))mask|=b;return mask;}
function field(cells,start,layer=E){for(const i of cells)put(layer,i%W,Math.floor(i/W),gid(start+maskAt(cells,i%W,Math.floor(i/W))));}
// A — Retain the three offset terraces; separate their palettes and read their continuous outlines.
for(const[oldGid,frame]of[[755,K.foot],[756,K.slope],[757,K.summit]]){
 const cells=new Set(B('Environment_V32').data.flatMap((g,i)=>g===oldGid&&core(i%W,Math.floor(i/W))?[i]:[]));field(cells,frame);
}
function patch(lobes,frame){const cells=new Set();for(const[cx,cy,rx,ry]of lobes)for(let y=Math.floor(cy-ry);y<=cy+ry;y++)for(let x=Math.floor(cx-rx);x<=cx+rx;x++)if(core(x,y)&&E.data[y*W+x]&&((x-cx)/rx)**2+((y-cy)/ry)**2<=1)cells.add(y*W+x);field(cells,frame);}
patch([[34,56,4,3],[48,55,4,2],[68,55,3,2],[35,48,4,3],[43,39,3,2]],K.moss);
patch([[46,45,4,2],[54,51,6,2],[69,44,3,2],[51,33,3,2],[65,35,4,2]],K.scree);
patch([[58,33,3,2],[64,40,3,2],[59,45,4,1.5]],K.bedrock);
// All original route cells remain route cells; no bridge/water tiles are repainted.
const trail=new Set(B('Paths').data.flatMap((g,i)=>g&&core(i%W,Math.floor(i/W))?[i]:[]));
for(const i of trail)put(P,i%W,Math.floor(i/W),gid(K.trail+maskAt(trail,i%W,Math.floor(i/W))));
for(const[cx,cy]of[[39,55],[65,47]])for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++)if(B('Paths').data[(cy-1+dy)*W+cx-1+dx]===763)put(P,cx-1+dx,cy-1+dy,gid(K.stairs+dy*COLS+dx));
// Re-art every existing face column with connected end caps and fractured planes.
// The border at y63 is outside the region and deliberately left byte-identical.
const profiles=[0,2,1,3,1,0,3,2,0,1,2,3,0];
for(let y=26;y<=62;y++)for(let x=29;x<=73;x++)if(core(x,y)&&B('Objects').data[y*W+x]===760){
 const left=B('Objects').data[y*W+x-1]===760,right=B('Objects').data[y*W+x+1]===760,frame=K.cliff+profiles[(x+2*y)%profiles.length]*4+Number(left)+Number(right)*2;
 put(O,x,y,gid(frame));if(allowed(x,y+1)&&B('Objects').data[(y+1)*W+x]===761)put(O,x,y+1,gid(frame+COLS));
}
// B — The summit destination is an open platform around the existing equipment/windsock.
function stamp(layer,x,y,w,h,frame){for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)put(layer,x+dx,y+dy,gid(frame+dy*COLS+dx));}
stamp(decor,55,37,7,5,K.deck);features.push({kind:'open-observation-deck',x:55,y:37,width:7,height:5,walkable:true});
// Keep station base at x57..58/y40 and extend only its vertical graphic upwards.
assert([57,58].every(x=>B('Objects').data[40*W+x]));assert([57,58].every(x=>!B('Objects').data[39*W+x]));stamp(O,57,39,2,2,K.station);
for(const[x,y]of[[35,40],[51,35]])stamp(O,x,y,2,1,K.bench);
for(const[x,y]of[[69,59],[43,52],[35,42]])if(allowed(x,y))put(O,x,y,gid(K.sign));
for(const[y,x1,x2]of[[33,51,68],[44,52,59],[38,68,71]])for(let x=x1;x<=x2;x++)if(core(x,y)&&[213,214,215].includes(B('Objects').data[y*W+x]))put(O,x,y,gid(x===x2?K.railEnd:x===x1||(x-x1)%3===0?K.rail:K.railMid));
for(const o of L('Collisions').objects.filter(o=>o.name.startsWith('v32_boulder_'))){const x=Math.floor(o.x/16),y=Math.floor(o.y/16);if(!core(x,y)||!allowed(x+1,y+1))continue;stamp(O,x,y,2,2,x===68&&y===35?K.cairn:y>=50?K.boulderMoss:K.boulder);}
for(const o of L('Collisions').objects.filter(o=>o.name.startsWith('v32_rock_'))){const x=Math.floor(o.x/16),y=Math.floor(o.y/16);if(core(x,y)&&!isAnchor(x,y))put(O,x,y,gid(K.rock));}
// Evergreen silhouettes grow only from EXISTING tree colliders, with no new obstacles.
const trees=L('Collisions').objects.filter(o=>o.name.startsWith('v32_tree_')).map(o=>({x:Math.floor(o.x/16),y:Math.floor(o.y/16)})).filter(({x,y})=>core(x,y)&&B('Objects').data[y*W+x]===292);
for(const{x,y}of trees){if(isAnchor(x,y))continue;put(O,x,y,gid(K.pineSeedling));if(RP.data[y*W+x])put(RP,x,y,gid(K.pineSeedling));}
const candidates=[[30,54,'tall'],[34,57,'tall'],[32,60,'short'],[35,49,'tall'],[36,47,'short'],[47,54,'tall'],[54,54,'short'],[67,54,'tall'],[44,36,'short'],[46,35,'tall'],[51,39,'blue'],[52,38,'short'],[68,40,'blue'],[70,39,'short'],[72,42,'short'],[71,32,'blue'],[49,31,'short']];
for(const[x,y,style]of candidates){
 if(!trees.some(t=>t.x===x&&t.y===y))continue;const h=style==='short'?3:4,frame=style==='short'?K.pineShort:style==='blue'?K.pineBlue:K.pine,sx=x-1,sy=y-h+1;
 let safe=true;for(let dy=0;dy<h;dy++)for(let dx=0;dx<3;dx++){const tx=sx+dx,ty=sy+dy,i=ty*W+tx;if(!allowed(tx,ty)||P.data[i]||A.data[i]||wind(tx,ty)||decor.data[i]||Math.hypot(tx*16+8-968,ty*16+8-696)<72||isAnchor(tx,ty)||(dy===h-1&&O.data[i]&&!(tx===x&&ty===y)))safe=false;}
 if(!safe){skipped.push({kind:'tall-pine',x,y});continue;}
 for(let dy=0;dy<h;dy++)for(let dx=0;dx<3;dx++){const tx=sx+dx,ty=sy+dy,f=gid(frame+dy*COLS+dx);put(dy===h-1?O:A,tx,ty,f);if(dy<h-1&&RA.data[ty*W+tx])put(RA,tx,ty,f);if(dy===h-1&&RP.data[ty*W+tx])put(RP,tx,ty,f);}
 planted.push({x,y,style,width:3,height:h,existingCollider:true});
}
// C — Detail follows the climb, scree fans and forest edges. Summit deliberately stays more open.
function detail(kind,x,y,frame,w=1,h=1){
 for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++){const tx=x+dx,ty=y+dy,i=ty*W+tx;if(!core(tx,ty)||!E.data[i]||P.data[i]||O.data[i]||A.data[i]||decor.data[i]||L('Water').data[i]||wind(tx,ty)||isAnchor(tx,ty)||RP.data[i]||RA.data[i]||Math.hypot(tx*16+8-968,ty*16+8-696)<62||L('Collisions').objects.some(o=>o.x<(tx+1)*16&&o.x+o.width>tx*16&&o.y<(ty+1)*16&&o.y+o.height>ty*16)){skipped.push({kind,x,y});return;}}
 stamp(decor,x,y,w,h,frame);features.push({kind,x,y,width:w,height:h,walkableGroundcover:true});
}
const groups=[
 ['kaki-barat',[[31,57],[36,59]],[[37,57]],[[34,59],[36,58],[37,59]],[[35,57]]],
 ['kaki-timur',[[64,56],[61,58]],[[64,54]],[[63,57],[65,58],[66,56]],[[65,56]]],
 ['hutan-lereng-barat',[[32,49],[34,51]],[[30,51]],[[32,51],[33,50],[34,52]],[[33,49]]],
 ['tikungan-batu',[[42,50],[45,54]],[[46,52]],[[42,51],[44,53],[45,53]],[[44,51]]],
 ['tebing-tengah',[[51,54],[57,55]],[[53,52]],[[50,55],[52,54],[57,54]],[[55,54]]],
 ['pandang-barat',[[37,43],[40,40]],[[40,43]],[[39,43],[41,42],[39,40]],[[38,44]]],
 ['bahu-puncak',[[50,35],[65,36]],[],[[50,34],[64,36],[65,37]],[[63,35]]],
 ['punggung-dingin',[[57,31],[65,32]],[],[[55,32],[59,31],[67,34]],[[61,32]]]
];
for(const[name,stones,shrubs,grass,flowers]of groups){const start=features.length;
 for(const[x,y]of stones)detail('low-scree',x,y,K.talus,2,1);
 for(const[x,y]of shrubs)detail(y>=50?'fern':'mountain-shrub',x,y,y>=50?K.fern:K.shrub,2,2);
 for(const[x,y]of grass)detail('short-grass',x,y,y>=49?K.grass:K.frostGrass);
 for(const[x,y]of flowers)detail('wildflowers',x,y,y>=50?K.yellow:y>39?K.purple:K.white);
 pockets.push({name,details:features.length-start});
}
for(const[x,y]of[[34,54],[45,55],[53,56],[57,46],[69,46],[53,34],[62,34]])detail('scree-bed',x,y,K.screeBed,3,1);
for(const[x,y]of[[38,54],[41,50],[44,48],[55,49],[63,49],[64,44],[58,35]])detail('rock-crack',x,y,K.cracks);
for(const[x,y]of[[31,55],[35,54],[46,53],[52,53],[65,54],[68,43]])detail('moss',x,y,K.mossTuft,2,1);
// Small wet patches keep the existing mission footprint/gate, now integrated with alpine vegetation.
const recoveredGround=new Set(B('Recovery_Puncak_Kabut').data.flatMap((g,i)=>g?[i]:[]));
for(let y=26;y<=62;y++)for(let x=29;x<=73;x++)if(core(x,y)){
 const i=y*W+x;if(L('Recovery_Puncak_Kabut').data[i])put(L('Recovery_Puncak_Kabut'),x,y,gid(K.moss+maskAt(recoveredGround,x,y)));
}
// Assert strict map ownership, object contracts and route footprint before writing any output.
for(const l of old.layers){const next=L(l.name);if(!l.data)assert.deepEqual(next,l,l.name);else for(let i=0;i<l.data.length;i++)if(l.data[i]!==next.data[i])assert(allowed(i%W,Math.floor(i/W)),`${l.name} outside Puncak: ${i}`);}
assert.deepEqual(P.data.map(Boolean),B('Paths').data.map(Boolean));assert.deepEqual(L('Water'),B('Water'));assert.deepEqual(L('Mountain_Mist_V32'),B('Mountain_Mist_V32'));
for(const[x,y]of anchors)assert.equal(O.data[y*W+x],B('Objects').data[y*W+x]);for(let y=38;y<=40;y++)for(let x=60;x<=61;x++){assert.equal(O.data[y*W+x],B('Objects').data[y*W+x]);assert.equal(A.data[y*W+x],B('AbovePlayer').data[y*W+x]);}
publish('world/assets/mountain_v36/tileset.svg',mountainSvg());
publish('world/maps/tilesets/v36_mountain.tsj',JSON.stringify({type:'tileset',version:'1.10',tiledversion:'1.11.2',name:'mountain_v36',tilewidth:16,tileheight:16,tilecount:512,columns:COLS,image:'../../assets/mountain_v36/tileset.svg',imagewidth:512,imageheight:256,margin:0,spacing:0,tiles:[]},null,2)+'\n');
map.tilesets.push({firstgid:FIRST,source:'tilesets/v36_mountain.tsj'});map.properties.find(p=>p.name==='worldVersion').value='3.6-Puncak-Visual';publish(file,JSON.stringify(map)+'\n');
publish('world/mountain-v36.json',JSON.stringify({version:'3.6-Puncak-Visual',source:'world/maps/pulau_tirta_v351.tmj',visualElevationOnly:true,collisionChanged:false,routeFootprintChanged:false,observation:{mission:'misi-2',location:'puncak',interaction:[968,696],deck:{x:55,y:37,width:7,height:5}},terraces:['green-foothills','scree-slope','cool-observation-summit'],trees:planted,features,pockets,placementsSkipped:skipped.length,protectedLivingAnchors:anchors,validationTargets:[[74,61],[68,61],[58,60],[47,59],[39,55],[39,51],[45,49],[55,51],[63,51],[65,47],[65,43],[60,43],[56,36],[38,42]]},null,2)+'\n');
console.log(`V3.6 mountain: three terraces, open observation deck, ${planted.length} anchored conifers, ${features.length} composed props/details. Collision and object contracts untouched.`);
