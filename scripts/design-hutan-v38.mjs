/** Forest/river visual delta over stored V3.7. Reuses all tree bodies, waterways, bridge and mission hooks. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {FOREST as K,FOREST_FIRST as FIRST,FOREST_COLS as COLS,FOREST_BOUNDS as BOUNDS,TREE_STYLES,GROVES,insideGrove,forestSvg} from './forest-v38-art.mjs';
const check=process.argv.includes('--check'),file='world/maps/pulau_tirta_v38.tmj',read=p=>JSON.parse(readFileSync(p,'utf8'));
const publish=(p,bytes)=>{if(existsSync(p)&&readFileSync(p).equals(Buffer.from(bytes)))return;if(check)throw Error('Forest differs: '+p);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,bytes);};
if(existsSync(file)&&!check&&!process.argv.includes('--force'))throw Error('V3.8 exists. Preserve artist Tiled edits before explicitly using --force.');
const old=read('world/maps/pulau_tirta_v37.tmj'),map=structuredClone(old),W=192,L=n=>map.layers.find(l=>l.name===n),B=n=>old.layers.find(l=>l.name===n);
const G=L('Ground'),D=L('TerrainDetails'),E=L('Environment_V32'),P=L('Paths'),O=L('Objects'),A=L('AbovePlayer'),V=L('Water'),RT=L('Recovery_Hutan_Sungai'),RP=L('Recovery_Plants_Hutan_Sungai'),RA=L('Recovery_Canopy_Hutan_Sungai');
const regions=L('Regions').objects,forest=regions.find(r=>r.name==='Hutan & Sungai'),others=regions.filter(r=>r!==forest),contains=(r,x,y)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x,y)=>contains(forest,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8));
const gid=f=>FIRST+f,put=(l,x,y,g)=>{assert(allowed(x,y),`Outside Hutan: ${l.name} ${x},${y}`);l.data[y*W+x]=g;};
const anchors=[[138,104],[144,114]],seedlings=[[145,107],[147,107],[145,109],[147,109]],debris=[[156,102],[157,102],[156,103]],anchor=(x,y)=>anchors.some(p=>p[0]===x&&p[1]===y);
const experiment=(x,y)=>(x>=144&&x<=148&&y>=106&&y<=110)||Math.hypot(x*16+8-2264,y*16+8-1704)<62;
const special=(x,y)=>anchor(x,y)||experiment(x,y)||debris.some(p=>p[0]===x&&p[1]===y)||(x===144&&y===105);
const bodies=L('Collisions').objects,intersects=(o,x,y)=>o.x<(x+1)*16&&o.x+o.width>x*16&&o.y<(y+1)*16&&o.y+o.height>y*16;
const originalTrees=bodies.filter(o=>(o.name.startsWith('tree_')||o.name.startsWith('v32_tree_'))&&allowed(Math.floor(o.x/16),Math.floor(o.y/16))).map(o=>({x:Math.floor(o.x/16),y:Math.floor(o.y/16),collider:o.name})).filter(t=>allowed(t.x,t.y-1)||![136,137].includes(B('AbovePlayer').data[(t.y-1)*W+t.x]));
const treeRoots=new Set(originalTrees.filter(t=>!special(t.x,t.y)).map(t=>t.y*W+t.x));
const bridgeGids=new Set([601,602]),deck=new Set(P.data.flatMap((g,i)=>bridgeGids.has(g)&&allowed(i%W,Math.floor(i/W))?[i]:[]));
function neighbors(cells,x,y){let mask=0;for(const[dx,dy,bit]of[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]])if(cells.has((y+dy)*W+x+dx))mask|=bit;return mask;}
function field(cells,start,layer=E){for(const i of cells)put(layer,i%W,Math.floor(i/W),gid(start+neighbors(cells,i%W,Math.floor(i/W))));}
// Clustered forest floor, with different quiet green/brown fields around paths and the existing clearing.
const floors=[];
for(const grove of GROVES){const cells=new Set();for(let y=82;y<136;y++)for(let x=122;x<184;x++){const i=y*W+x;if(allowed(x,y)&&!V.data[i]&&[133,134].includes(G.data[i])&&!experiment(x,y)&&!B('Environment_V32').data[i]&&insideGrove(grove.shape,x+.5,y+.5))cells.add(i);}field(cells,K[grove.floor]);floors.push({id:grove.id,tiles:cells.size});}
for(const[cx,cy,rx,ry]of[[129,106,4,3],[145,91,4,3],[170,107,4,4],[143,125,4,2]]){const cells=new Set();for(let y=cy-ry;y<=cy+ry;y++)for(let x=cx-rx;x<=cx+rx;x++){const i=y*W+x;if(allowed(x,y)&&!V.data[i]&&E.data[i]>=FIRST&&!experiment(x,y)&&((x-cx)/rx)**2+((y-cy)/ry)**2<=1)cells.add(i);}field(cells,K.litterFloor);}
const plot=new Set(E.data.flatMap((g,i)=>g===758&&allowed(i%W,Math.floor(i/W))?[i]:[]));field(plot,K.dryPlot);
const paths=new Set(B('Paths').data.flatMap((g,i)=>g&&allowed(i%W,Math.floor(i/W))?[i]:[]));for(const i of paths)if(!deck.has(i))put(P,i%W,Math.floor(i/W),gid(K.trail+neighbors(paths,i%W,Math.floor(i/W))));
// Re-art only the narrow river band, never the sea. Every old water cell keeps its solid semantics.
const river=new Set();for(let y=82;y<136;y++)for(let x=122;x<184;x++){const i=y*W+x,cx=157+Math.sin((y-68)/9)*5+Math.sin(y/4)*1.4;if(allowed(x,y)&&V.data[i]&&Math.abs(x-cx)<4.6)river.add(i);}
for(const i of river){const x=i%W,y=Math.floor(i/W);let mask=0;for(const[dx,dy,bit]of[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]])if(B('Water').data[(y+dy)*W+x+dx])mask|=bit;put(V,x,y,gid((mask===15?K.waterDeep:K.water)+mask));}
const bank=new Set(),damp=new Set();for(const i of river){const x=i%W,y=Math.floor(i/W);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const tx=x+dx,ty=y+dy,j=ty*W+tx;if(!allowed(tx,ty)||V.data[j]||P.data[j]||experiment(tx,ty)||B('Environment_V32').data[j])continue;if(Math.hypot(dx,dy)<=1.5)damp.add(j);else if(Math.hypot(dx,dy)<=2.2)bank.add(j);}}
field(bank,K.bank);field(damp,K.damp);
// Composited crowns: neighbours overlap as complete trees, rather than replacing each other's tiles.
const trees=[];
for(const root of originalTrees){const{x,y}=root;if(special(x,y))continue;const grove=GROVES.find(g=>insideGrove(g.shape,x+.5,y+.5));
 const preferred=grove?grove.id==='hulu-rindang'||grove.id==='punggung-timur'?'slender':'round':'understory';
 const candidates=preferred==='slender'?['slender','round','understory','sapling','bud']:preferred==='round'?['round','slender','understory','sapling','bud']:['understory','sapling','bud'];let selected='bud';
 for(const style of candidates){const{width,height}=TREE_STYLES[style],sx=x-Math.floor(width/2),sy=y-height+1;let safe=true;
  for(let dy=0;dy<height;dy++)for(let dx=0;dx<width;dx++){const tx=sx+dx,ty=sy+dy,i=ty*W+tx;if(!allowed(tx,ty)||special(tx,ty)||V.data[i]||deck.has(i)||P.data[i]&&!(tx===x&&ty===y)||dy===height-1&&B('Objects').data[i]&&!treeRoots.has(i)||dy<height-1&&Math.hypot(tx*16+8-2264,ty*16+8-1704)<72)safe=false;}
  if(safe){selected=style;break;}
 }
 const{width,height}=TREE_STYLES[selected];trees.push({...root,style:selected,width,height,grove:grove?.id??'lisiere',dry:Boolean(B('Recovery_Plants_Hutan_Sungai').data[y*W+x])});
}
// Remove only old tree components at their existing bodies; keep mission markers and all other objects.
for(const t of trees){for(const l of[A,RA])if([136,137].includes(B(l.name).data[(t.y-1)*W+t.x]))put(l,t.x,t.y-1,0);}
const crownCells=new Set(),rootCells=new Set();
for(const t of trees)for(let dy=0;dy<t.height;dy++)for(let dx=0;dx<t.width;dx++){const x=t.x-Math.floor(t.width/2)+dx,y=t.y-t.height+1+dy,i=y*W+x,f=(y-82)*COLS+x-122;
 if(dy===t.height-1){put(O,x,y,gid(64*COLS+f));put(RP,x,y,gid(64*COLS+64+f));rootCells.add(i);}else{put(A,x,y,gid(f));put(RA,x,y,gid(64+f));crownCells.add(i);}
}
// Existing river rocks and one boulder are retained at their exact physical positions.
for(const o of bodies.filter(o=>o.name.startsWith('rock_'))){const x=Math.floor(o.x/16),y=Math.floor(o.y/16);if(allowed(x,y)&&!special(x,y)&&!treeRoots.has(y*W+x)&&(damp.has(y*W+x)||bank.has(y*W+x)))put(O,x,y,gid(K.rockSmall));}
for(const o of bodies.filter(o=>o.name.startsWith('v32_boulder_'))){const x=Math.floor(o.x/16),y=Math.floor(o.y/16);if(allowed(x,y)&&allowed(x+1,y+1))for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)put(O,x+dx,y+dy,gid(K.boulder+dy*COLS+dx));}
const details=[],skipped=[];
const looseHerbs=new Set([268,272,280,283,285,304,305,306,307,308,309,317,318,329,330,331,343,344,402]);
function detail(kind,x,y,f,w=1,h=1,fresh){for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++){const tx=x+dx,ty=y+dy,i=ty*W+tx,replaceable=O.data[i]===B('Objects').data[i]&&looseHerbs.has(O.data[i])&&!RP.data[i];if(!allowed(tx,ty)||V.data[i]||P.data[i]||O.data[i]&&!replaceable||RP.data[i]||special(tx,ty)||bodies.some(o=>intersects(o,tx,ty))){skipped.push({kind,x,y});return false;}}
 for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++){put(O,x+dx,y+dy,gid(f+dy*COLS+dx));if(fresh!==undefined)put(RP,x+dx,y+dy,gid(fresh+dy*COLS+dx));}details.push({kind,x,y,width:w,height:h,recovers:fresh!==undefined,walkableGroundcover:true});return true;}
// Uneven reaches follow river bends; each remains a compact composition, with open bridge approaches.
const reaches=[['hulu-barat',88,-1],['tikungan-utara',95,1],['sebelum-jembatan',100,-1],['sesudah-jembatan',111,1],['belokan-rendah',118,-1],['hilir-timur',125,1],['muara-hijau',131,-1]];
function nearby(kind,x,y,f,w,h,fresh,side=1){for(const[dx,dy]of[[0,0],[side,0],[0,1],[side,-1],[2*side,1],[0,-1],[side,2]])if(detail(kind,x+dx,y+dy,f,w,h,fresh))return true;return false;}
for(const[name,y,side]of reaches){const xs=[...river].filter(i=>Math.floor(i/W)===y).map(i=>i%W);if(!xs.length)continue;const edge=side<0?Math.min(...xs):Math.max(...xs),x=edge+(side<0?-3:1);
 const start=details.length;nearby('river-reeds',x,y,K.reeds,2,1,K.reedsFresh,side);nearby('river-pebbles',x+side,y+1,K.pebbles,2,1,undefined,side);detail('river-fern',x+2*side,y-1,K.fern,2,1,K.fernFresh);detail('short-grass',x+3*side,y+1,K.tuft,1,1,K.tuftFresh);detail('riparian-flowers',x+2*side,y+2,side>0?K.white:K.yellow);for(let i=start;i<details.length;i++)details[i].group=name;
}
// Forest floor pockets vary in scale and content. Groundcover never introduces a new obstacle.
for(const[x,y]of[[128,101],[131,113],[135,122],[143,94],[149,89],[167,111],[174,104],[167,121],[141,128]]){
 detail('understory-fern',x,y,K.fern,2,1,K.fernFresh);detail('leaf-litter',x-1,y+2,K.leaves,2);detail('forest-mushrooms',x+2,y+1,K.mushrooms);detail('wild-grass',x+2,y-1,K.tuft,1,1,K.tuftFresh);
}
for(const[x,y]of[[150,103],[151,109],[164,110],[165,104],[154,113]]){detail('bridge-side-ferns',x,y,K.fern,2,1,K.fernFresh);detail('bridge-side-flowers',x+1,y+1,K.purple);}
for(const[x,y]of[[130,115],[147,96],[168,117],[148,126]])nearby('low-forest-shrub',x,y,K.shrub,2,2,K.shrubFresh);
for(const[x,y]of[[152,99],[161,112],[151,119],[166,126]])nearby('fallen-branch',x,y,K.branch,2,1);
for(const[x,y]of[[128,117],[145,92],[170,109],[144,126]])detail('low-stump',x,y,K.stump);
// Existing dry-to-recovered floor footprint is retained, using a forest palette instead of neon grass.
const recovered=new Set(B('Recovery_Hutan_Sungai').data.flatMap((g,i)=>g&&allowed(i%W,Math.floor(i/W))?[i]:[]));field(recovered,K.recovered,RT);
// All mission planting/debris states and Living markers stay exactly as authored by the team.
for(const[x,y]of[...anchors,...seedlings,...debris])for(const l of[O,RP])put(l,x,y,B(l.name).data[y*W+x]);
// Freeze ownership, objects, bridge topology and recovery semantics before publishing any asset.
for(const l of old.layers){const n=L(l.name);if(!l.data)assert.deepEqual(n,l,l.name);else for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data[i])assert(allowed(i%W,Math.floor(i/W)),`${l.name} outside Hutan:${i}`);}
assert.deepEqual(P.data.map(Boolean),B('Paths').data.map(Boolean));assert.deepEqual(V.data.map(Boolean),B('Water').data.map(Boolean));for(const i of deck)assert.equal(P.data[i],B('Paths').data[i]);assert.deepEqual(L('Recovery_Water_Hutan_Sungai'),B('Recovery_Water_Hutan_Sungai'));
publish('world/assets/forest_v38/tileset.svg',forestSvg(trees));
const tiles=Array.from({length:32},(_,n)=>({id:K.water+n,properties:[{name:'collides',type:'bool',value:true}]}));
publish('world/maps/tilesets/v38_forest.tsj',JSON.stringify({type:'tileset',version:'1.10',tiledversion:'1.11.2',name:'forest_v38',tilewidth:16,tileheight:16,tilecount:16384,columns:COLS,image:'../../assets/forest_v38/tileset.svg',imagewidth:2048,imageheight:2048,margin:0,spacing:0,tiles},null,2)+'\n');
map.tilesets.push({firstgid:FIRST,source:'tilesets/v38_forest.tsj'});map.properties.find(p=>p.name==='worldVersion').value='3.8-Forest-River';publish(file,JSON.stringify(map)+'\n');
publish('world/forest-v38.json',JSON.stringify({version:'3.8-Forest-River',source:'world/maps/pulau_tirta_v37.tmj',bounds:BOUNDS,collisionChanged:false,interaction:{location:'hutan',mission:'misi-4',x:2264,y:1704},groves:floors,trees,canopyTiles:crownCells.size,rootTiles:rootCells.size,riverCells:river.size,bankTiles:bank.size,dampTiles:damp.size,bridgeCells:[...deck].map(i=>[i%W,Math.floor(i/W)]),details,placementsSkipped:skipped.length,protectedLivingAnchors:anchors,protectedSeedlings:seedlings,protectedDebris:debris,validationTargets:[[124,101],[129,101],[136,103],[141,106],[141,110],[145,113],[150,112],[153,108],[154,106],[158,106],[163,106],[165,110],[145,108],[147,110]]},null,2)+'\n');
console.log(`V3.8 forest: ${trees.length} existing tree bodies, ${trees.filter(t=>t.width===3).length} medium/tall crowns, ${crownCells.size} canopy tiles; ${details.length} nature groups; river/bridge/mission preserved.`);
