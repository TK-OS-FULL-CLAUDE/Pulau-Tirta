/** R4: connected native groves, layered trail edges, and a shorter wooden span over the original river.
 * Derives only from stored R3; no art, engine, existing body, mission or other-region changes. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
const read=p=>JSON.parse(readFileSync(p,'utf8')),check=process.argv.includes('--check');
const file='world/maps/pulau_tirta_v38_r4.tmj';
const publish=(p,s)=>{if(existsSync(p)&&readFileSync(p).equals(Buffer.from(s)))return;if(check)throw Error('R4 differs: '+p);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,s);};
if(existsSync(file)&&!check&&!process.argv.includes('--force'))throw Error('Preserve Tiled edits; explicit --force required to regenerate R4.');
const old=read('world/maps/pulau_tirta_v38_r3.tmj'),map=structuredClone(old),W=192;
const L=n=>map.layers.find(l=>l.name===n),B=n=>old.layers.find(l=>l.name===n);
const O=L('Objects'),A=L('AbovePlayer'),P=L('Paths'),V=L('Water'),RP=L('Recovery_Plants_Hutan_Sungai'),RA=L('Recovery_Canopy_Hutan_Sungai');
const bodies=L('Collisions').objects,oldBodyCount=bodies.length;
const regions=L('Regions').objects,forest=regions.find(r=>r.name==='Hutan & Sungai'),others=regions.filter(r=>r!==forest);
const contains=(r,x,y)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x,y)=>contains(forest,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8));
const put=(l,x,y,g)=>{assert(allowed(x,y),`${l.name} outside forest: ${x},${y}`);l.data[y*W+x]=g;};
const protectedCells=read('world/forest-v38-r3.json').protectedCells;
const special=(x,y)=>protectedCells.some(p=>p[0]===x&&p[1]===y)||
 (x>=137&&x<=140&&y>=106&&y<=111)||(x>=137&&x<=141&&y>=110&&y<=112)||
 (x>=144&&x<=148&&y>=106&&y<=110)||Math.hypot(x*16+8-2264,y*16+8-1704)<64||
 (x>=152&&x<=165&&y>=103&&y<=109);
const overlap=(o,x,y)=>o.x<(x+1)*16&&o.x+o.width>x*16&&o.y<(y+1)*16&&o.y+o.height>y*16;
const treeIds=new Set([138,148,149,160,161,292]),loose=new Set([304,305,306,317,318,329,330,331,343,344,402,984,987,988]);
const trees=()=>O.data.flatMap((g,i)=>treeIds.has(g)&&allowed(i%W,Math.floor(i/W))?[[i%W,Math.floor(i/W)]]:[]);
const beforeTrees=trees(),newTrees=[],details=[],groups=[];
const paths=P.data.flatMap((g,i)=>g&&allowed(i%W,Math.floor(i/W))?[[i%W,Math.floor(i/W)]]:[]);
const pathDistance=(x,y)=>Math.min(...paths.map(([px,py])=>Math.hypot(px-x,py-y)));
// PASS A. Small connected masses join the R3 stands. Separate, asymmetric pockets frame both
// sides of the trail; unlike R3 there is no extra three-tile-wide exclusion around every path.
// Each zone is hand located; adjacency to existing crowns takes precedence over filling its area.
const groves=[
 ['jalan-masuk-utara','trail',128,98,5,2,12],['jalan-masuk-selatan','trail',131,104,5,2,12],
 ['tikungan-utara','trail',137,100,4,2,10],['percabangan-barat','trail',133,106,4,3,10],
 ['pondok-belakang','hut',135,103,3,2,8],['pondok-barat','hut',134,110,2,4,10],
 ['pondok-selatan','hut',135,114,4,2,8],['jalur-selatan-barat','trail',139,115,4,2,12],
 ['jalur-selatan-timur','trail',147,116,4,2,10],['pendekatan-jembatan-barat','trail',150,111,3,3,8],
 ['pendekatan-jembatan-timur','trail',167,109,2,3,8],['tepi-sungai-utara','riverside',150,99,3,3,10],
 ['tepi-sungai-timur','riverside',168,104,3,3,10],['pedalaman-barat','deep',128,109,4,5,14],
 ['massa-tengah-barat','deep',134,94,4,5,14],['massa-tengah-utara','deep',146,92,5,5,16],
 ['pedalaman-selatan','deep',134,123,5,4,14],['massa-tengah-selatan','deep',143,124,4,4,14],
 ['hulu-timur','deep',170,91,4,5,12],['hulu-barat','deep',154,86,4,3,10],
];
function treeSite(x,y,zone){const i=y*W+x;
 if(!allowed(x,y-1)||!allowed(x,y)||special(x,y)||special(x,y-1))return false;
 for(const k of[i-W,i])if(P.data[k]||V.data[k]||RP.data[k]||RA.data[k]||A.data[k]||L('Facades').data[k]||O.data[k]&&!loose.has(O.data[k]))return false;
 if(treeIds.has(O.data[i])||bodies.some(b=>overlap(b,x,y)||overlap(b,x,y-1)))return false;
 if(zone==='trail'&&pathDistance(x,y)>3.2)return false;
 // Leave a visible bank, and never overhang water, a path, another crown or the hut.
 return true;
}
for(const[name,zone,cx,cy,rx,ry,limit]of groves){const pool=[];
 for(let y=cy-ry;y<=cy+ry;y++)for(let x=cx-rx;x<=cx+rx;x++){
  const dx=(x-cx)/rx,dy=(y-cy)/ry;
  // The angled shoulder makes each footprint lopsided rather than a rectangular tree stamp.
  if(dx*dx+dy*dy<=1&&dx+dy*.65<1.05)pool.push([x,y]);
 }
 const positions=[];
 for(let n=0;n<limit;n++){
  const anchors=trees(),candidates=pool.filter(([x,y])=>treeSite(x,y,zone)).map(([x,y])=>{
   const near=Math.min(...anchors.map(([tx,ty])=>Math.hypot(tx-x,ty-y)));
   return{x,y,near,score:near*.9+Math.hypot((x-cx)/rx,(y-cy)/ry)*.7+(zone==='trail'?pathDistance(x,y)*.3:0)};
  }).filter(t=>t.near<=3.2).sort((a,b)=>a.score-b.score||a.y-b.y||a.x-b.x);
  if(!candidates.length)break;
  const{x,y}=candidates[0];
  // Keep the original small-tree/understory forms at occasional branching shoulders.
  const small=zone==='trail'&&n%5===4;
  const gid=small?292:149;if(!small)put(A,x,y-1,137);put(O,x,y,gid);
  const body={id:map.nextobjectid++,name:`v38_r4_tree_${x}_${y}`,type:'obstacle',x:x*16+5,y:y*16+8,width:6,height:7,rotation:0,visible:true,properties:[{name:'collides',type:'bool',value:true}]};
  bodies.push(body);positions.push([x,y]);newTrees.push({x,y,group:name,zone,gid,canopy:small?0:137,collider:body.name});
 }
 groups.push({name,zone,center:[cx,cy],positions});
}
// PASS B. Low vegetation sits on selected shoulders and grove edges, not across the route.
// Every stamp has a different silhouette and density. All pieces reuse existing native sprites.
const pockets=[
 ['entree',126,100,0],['entree',131,99,1],['carrefour',136,102,2],['carrefour',133,104,1],
 ['pondok',135,107,2],['pondok',135,112,0],['pondok',141,113,1],
 ['sentier',142,114,2],['sentier',148,114,0],['sentier',149,110,1],
 ['jembatan',150,103,0],['jembatan',166,104,1],['jembatan',167,111,2],
 ['berge',151,100,1],['berge',155,111,0],['berge',150,117,2],['berge',164,97,1],
 ['sous-bois',128,113,0],['sous-bois',136,119,1],['sous-bois',142,121,2],
 ['sous-bois',146,96,1],['sous-bois',133,90,2],['sous-bois',171,98,0],['sous-bois',139,127,1],
];
const stamps=[[[0,0,305],[1,0,306],[-1,1,343],[0,2,987],[2,1,984]],
 [[0,0,306],[-1,0,305],[1,1,329],[-2,1,988],[0,2,343],[2,-1,304]],
 [[0,0,305],[0,1,343],[1,2,987],[-1,2,984],[2,0,306],[-2,0,330],[1,-1,988]]];
for(const[group,cx,cy,shape]of pockets)for(const[dx,dy,gid]of stamps[shape]){
 // Search only this pocket's immediate shoulder if its intended cell is already occupied.
 for(const[fx,fy]of[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[2,0],[-2,0]]){
  const x=cx+dx+fx,y=cy+dy+fy,i=y*W+x;
  if(Math.hypot(x-cx,y-cy)>3.7||!allowed(x,y)||special(x,y)||P.data[i]||V.data[i]||A.data[i]||RA.data[i]||RP.data[i]||O.data[i]||L('Facades').data[i]||bodies.some(b=>overlap(b,x,y)))continue;
  put(O,x,y,gid);details.push({group,x,y,gid,walkable:true});break;
 }
}
// PASS C. R2 filled rows105..107 but left full dry breaks at rows104/108, covered with
// isolated 2x2 pond corners. Restore the SAME three-tile river through both missing rows.
// On those six cells a normal bridge tile overrides water exactly as the existing model does.
// The old collision grid and every old rail object therefore remain identical (tested below).
const riverCells=[],pathEdits=[];
for(let y=104;y<=108;y++)for(let x=153;x<=155;x++){
 put(V,x,y,x===153?433:x===155?435:434);riverCells.push([x,y]);
 if(y===104||y===108){put(P,x,y,(x+y)%2?601:602);pathEdits.push([x,y]);}
}
// Remove the R2 closed-pool fragments; all actual water is once again in Water at depth3.
for(const[x,y]of[[153,104],[154,104],[153,108],[154,108]])put(L('Forest_Bridge_Water_Visual'),x,y,0);
// PASS D. The eight extra land columns were painted as an 11-tile wooden bridge over a
// 3-tile river. Repaint only those dry land columns as the existing forest soil approach.
// Keep every old north/south fence visible: shrinking those colliders is outside visual scope.
for(let y=105;y<=107;y++)for(let x=156;x<=163;x++){assert(!V.data[y*W+x]);put(P,x,y,764);pathEdits.push([x,y]);}
// PASS E. Every legacy object/recovery/other-region cell is immutable except the named local
// river/path repair; only newly approved trunks may be appended to Collisions.
for(const l of old.layers){const n=L(l.name);
 if(l.name==='Collisions'){assert.deepEqual({...n,objects:n.objects.slice(0,oldBodyCount)},l);continue;}
 if(!l.data){assert.deepEqual(n,l);continue;}
 for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data[i])assert(allowed(i%W,Math.floor(i/W)),`${l.name} outside forest`);
 if(!['Objects','AbovePlayer','Paths','Water','Forest_Bridge_Water_Visual'].includes(l.name))assert.deepEqual(n,l,l.name);
}
for(let y=107;y<=110;y++)for(let x=138;x<=139;x++)for(const n of['Objects','AbovePlayer','Facades','Recovery_Plants_Hutan_Sungai','Recovery_Canopy_Hutan_Sungai'])assert.equal(L(n).data[y*W+x],B(n).data[y*W+x]);
for(const[x,y]of protectedCells)for(const n of['Objects','Recovery_Plants_Hutan_Sungai'])assert.equal(L(n).data[y*W+x],B(n).data[y*W+x]);
assert.deepEqual(map.tilesets,old.tilesets);
map.properties.find(p=>p.name==='worldVersion').value='3.8-R4-Forest-Bridge';
publish(file,JSON.stringify(map)+'\n');
const interior=ts=>ts.filter(([x,y])=>x>=125&&x<178&&y>=85&&y<135).length;
const design={version:'3.8-R4-Forest-Bridge',source:'world/maps/pulau_tirta_v38_r3.tmj',usesNewAssets:false,newTrees,groups,details,
 metrics:{forestBefore:beforeTrees.length,forestAfter:trees().length,interiorBefore:interior(beforeTrees),interiorAfter:interior(trees()),newTrunkColliders:newTrees.length},
 river:{diagnosis:'Dry full-width gaps at rows104/108 and closed small-pond lips; river is three tiles wide, old wooden deck eleven tiles long.',repairedCells:riverCells,waterGids:[433,434,435],originalWaterStyle:true},
 bridge:{oldWoodenSpan:11,newWoodenSpan:3,woodenTilesBefore:33,woodenTilesAfter:15,pathEdits,railCollidersPreserved:true,technicalLimit:'Old outer railings remain visible as fences along the earthen approach. Shortening/removing those fences requires a separate collider edit; no invisible old obstacles are left behind.'},
 protectedCells,validationTargets:read('world/forest-v38-r3.json').validationTargets};
publish('world/forest-v38-r4.json',JSON.stringify(design,null,2)+'\n');
console.log(`R4: ${newTrees.length} new native trees in ${groups.filter(g=>g.positions.length).length} groves, ${details.length} ground plants. Interior ${design.metrics.interiorBefore} -> ${design.metrics.interiorAfter}. Wooden span 11 -> 3; original railings kept.`);
