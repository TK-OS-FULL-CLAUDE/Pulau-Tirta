/** Focused forest trail and bridge finish on the integrated Puncak R3 world. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const source='world/maps/pulau_tirta_v36_r3.tmj',target='world/maps/pulau_tirta_forest_final.tmj';
const old=read(source),map=structuredClone(old),W=192,check=process.argv.includes('--check');
const L=n=>map.layers.find(l=>l.name===n),B=n=>old.layers.find(l=>l.name===n);
const forest=L('Regions').objects.find(o=>o.name==='Hutan & Sungai');
const others=L('Regions').objects.filter(o=>o!==forest);
const within=(r,x,y)=>x*16+8>=r.x&&x*16+8<r.x+r.width&&y*16+8>=r.y&&y*16+8<r.y+r.height;
const allowed=(x,y)=>within(forest,x,y)&&!others.some(r=>within(r,x,y));
const P=L('Paths').data,V=L('Water').data,O=L('Objects').data,A=L('AbovePlayer').data;
const bodies=L('Collisions').objects;
const index=(x,y)=>y*W+x;
const trimmed=[];
// One continuous, slightly bending trail; preserve the hut yard and its southern branch.
function center(x){if(x<=151)return x<=138?100+(x-126)*4/12:104+(x-138)*2/13;
 if(x<=166)return 106;return 106+(x-166)*3/8;}
for(let x=126;x<=174;x++)for(let y=99;y<=113;y++){
 if(!allowed(x,y)||!P[index(x,y)]||V[index(x,y)]||[601,602].includes(P[index(x,y)]))continue;
 if(x>=137&&x<=150&&y>=108)continue; // hut, infiltration approach and branch
 if(x>=151&&x<=155)continue; // original bridge banks and water
 const width=x>=138&&x<=143||x>=166&&x<=170?1.75:1.4;
 if(Math.abs(y-center(x))<=width)continue;
 // Retain original approach at either bank, only trim the oversized clearings.
 P[index(x,y)]=0;trimmed.push([x,y]);
}
// The earlier distance falloff left a three/four-tile cream ribbon. Measure each
// column of the actual cream layer and retain just two connected native tiles.
// At the bank the original three-tile bridge approach is a deliberate exception.
const corridorColumns=[];
// Two former one-cell pinches have free grass shoulders; restore the second
// walkable trail tile before measuring the finished visual corridor.
for(const x of [148,149]){assert.equal(P[index(x,106)],0);P[index(x,106)]=764;}
for(let x=122;x<=166;x++){
 const rows=[];for(let y=97;y<=107;y++)if(P[index(x,y)]&&!V[index(x,y)]&&![601,602].includes(P[index(x,y)]))rows.push(y);
 const keep=x>=152&&x<=158?3:2;
 const selected=x===122||x===123?[99,100]:x===124?[100,101]:rows.slice(0,keep);
 for(const y of rows)if(!selected.includes(y)){
  P[index(x,y)]=0;trimmed.push([x,y]);
 }
 corridorColumns.push({x,before:rows.length,after:rows.filter(y=>selected.includes(y)).length});
}
// The visible trail also includes opaque warm terrain on two other layers. Clearing
// Paths alone exposed this old tan/orange field, which explains the wide screenshot.
const T=L('TerrainDetails').data,E=L('Environment_V32').data,clearedTerrain=[];
for(let y=100;y<=116;y++)for(let x=130;x<=153;x++){
 if(!allowed(x,y)||P[index(x,y)]||V[index(x,y)])continue;
 const hutYard=x>=137&&x<=141&&y>=107&&y<=110;
 if(hutYard)continue;
 const i=index(x,y),previous=[T[i],E[i]];
 if(T[i]===599)T[i]=0;
 if(E[i]===758)E[i]=0;
 if(previous[0]!==T[i]||previous[1]!==E[i])clearedTerrain.push([x,y,...previous]);
}
// R4 already reduced the deck to three water columns. Remove the eight land columns
// of the old north/south rail, including their visible posts and exact local bodies.
const removedRails=[];
for(let x=156;x<=163;x++)for(const [prefix,y] of [['n',104],['s',108]]){
 const name=`bridge_rail_${prefix}_${x}`,b=bodies.find(o=>o.name===name);
 assert(b,`Missing original bridge rail ${name}`);
 assert.equal(O[index(x,y)],95);
 O[index(x,y)]=0;removedRails.push(name);
}
L('Collisions').objects=bodies.filter(o=>!removedRails.includes(o.name));
const liveBodies=L('Collisions').objects;
const overlap=(b,x,y)=>b.x<(x+1)*16&&b.x+b.width>x*16&&b.y<(y+1)*16&&b.y+b.height>y*16;
const trees=[];
// Fill selected reclaimed shoulders with the R4 native outlined pine and sapling.
// Every trunk gets its own small body; crowns remain nonphysical.
const shoulders=[];for(let y=99;y<=114;y++)for(let x=128;x<=173;x++)
 if(Math.abs(y-center(x))>=2.2&&Math.abs(y-center(x))<=5.5)shoulders.push([x,y]);
for(const [x,y] of shoulders){
 if(trees.length>=24||!allowed(x,y)||!allowed(x,y-1))continue;
 if(P[index(x,y)]||V[index(x,y)]||O[index(x,y)]||A[index(x,y)]||O[index(x,y-1)]||A[index(x,y-1)]||P[index(x,y-1)]||V[index(x,y-1)])continue;
 if(liveBodies.some(b=>overlap(b,x,y)||overlap(b,x,y-1)))continue;
 if(trees.some(t=>Math.hypot(t.x-x,t.y-y)<2.2))continue;
 // Keep two tiles beside the route clear for player radius and turning.
 A[index(x,y-1)]=137;O[index(x,y)]=149;
 const body={id:map.nextobjectid++,name:`forest_final_tree_${x}_${y}`,type:'obstacle',x:x*16+5,y:y*16+8,width:6,height:7,rotation:0,visible:true,properties:[{name:'collides',type:'bool',value:true}]};
 liveBodies.push(body);trees.push({x,y,body:body.name});
}
assert(trees.length>=5,'No useful forest shoulder trees were placed');
// Plant the broad ground reclaimed from the old clearing in offset clusters.
// Short existing saplings fill slots where a tall canopy would mask another prop.
const reclaimed=[...new Map([...trimmed,...clearedTerrain].map(([x,y])=>[`${x},${y}`,[x,y]])).values()]
 .sort((a,b)=>((a[0]*37+a[1]*19)%71)-((b[0]*37+b[1]*19)%71)||a[1]-b[1]||a[0]-b[0]);
for(const [x,y] of reclaimed){
 if(trees.length>=42||!allowed(x,y)||P[index(x,y)]||V[index(x,y)]||O[index(x,y)]||A[index(x,y)])continue;
 if(Math.hypot(x-141,y-106)<5||x>=137&&x<=141&&y>=107&&y<=111)continue;
 if(liveBodies.some(b=>overlap(b,x,y))||trees.some(t=>Math.hypot(t.x-x,t.y-y)<1.8))continue;
 const tall=allowed(x,y-1)&&!P[index(x,y-1)]&&!V[index(x,y-1)]&&!O[index(x,y-1)]&&!A[index(x,y-1)]
  &&!liveBodies.some(b=>overlap(b,x,y-1));
 if(tall)A[index(x,y-1)]=137;
 O[index(x,y)]=tall?149:292;
 const body={id:map.nextobjectid++,name:`forest_final_tree_${x}_${y}`,type:'obstacle',x:x*16+5,y:y*16+8,width:6,height:7,rotation:0,visible:true,properties:[{name:'collides',type:'bool',value:true}]};
 liveBodies.push(body);trees.push({x,y,body:body.name,kind:tall?'pine':'sapling'});
}
const shrubs=[];
for(const [x,y] of reclaimed){
 if(shrubs.length>=14||!allowed(x,y)||P[index(x,y)]||V[index(x,y)]||O[index(x,y)]||A[index(x,y)])continue;
 if(Math.hypot(x-141,y-106)<4||liveBodies.some(b=>overlap(b,x,y)))continue;
 if(shrubs.some(s=>Math.hypot(s.x-x,s.y-y)<2.5))continue;
 O[index(x,y)]=(x+y)%2?305:306;shrubs.push({x,y});
}
// Final density pockets deliberately occupy the open shoulders, bridge approach,
// and the back of the hut. Their irregular masks leave small breathing gaps.
const densityStart=trees.length,understoryStart=shrubs.length;
const groves=[
 [132,105,5,4,7],[136,116,6,4,8],[145,117,7,4,8],
 [149,101,5,4,8],[157,100,6,5,10],[165,101,6,5,10],
 [162,111,6,4,8],[169,110,5,5,8],
];
const oldRailFootprint=(x,y)=>x>=154&&x<=163&&(y===104||y===108);
for(const [cx,cy,rx,ry,limit] of groves){
 const candidates=[];for(let y=cy-ry;y<=cy+ry;y++)for(let x=cx-rx;x<=cx+rx;x++){
  const dx=(x-cx)/rx,dy=(y-cy)/ry;
  if(dx*dx+dy*dy<=1&&dx+dy*.43<1.1)candidates.push([x,y]);
 }
 candidates.sort((a,b)=>((a[0]*29+a[1]*17)%67)-((b[0]*29+b[1]*17)%67)||a[1]-b[1]);
 let planted=0;
 for(const [x,y] of candidates){
  if(planted>=limit||!allowed(x,y)||!allowed(x,y-1)||oldRailFootprint(x,y)||P[index(x,y)]||V[index(x,y)]||O[index(x,y)]||A[index(x,y)])continue;
  if(Math.hypot(x-141,y-106)<5.5||x>=136&&x<=141&&y>=107&&y<=111)continue;
  if(liveBodies.some(b=>overlap(b,x,y))||trees.some(t=>Math.hypot(t.x-x,t.y-y)<1.5))continue;
  const tall=!P[index(x,y-1)]&&!V[index(x,y-1)]&&!O[index(x,y-1)]&&!A[index(x,y-1)]
   &&!liveBodies.some(b=>overlap(b,x,y-1));
  if(tall)A[index(x,y-1)]=137;
  O[index(x,y)]=tall?149:292;
  const body={id:map.nextobjectid++,name:`forest_final_tree_${x}_${y}`,type:'obstacle',x:x*16+5,y:y*16+8,width:6,height:7,rotation:0,visible:true,properties:[{name:'collides',type:'bool',value:true}]};
  liveBodies.push(body);trees.push({x,y,body:body.name,kind:tall?'pine':'sapling'});planted++;
 }
}
for(const [cx,cy,rx,ry] of groves){
 for(let y=cy-ry;y<=cy+ry;y++)for(let x=cx-rx;x<=cx+rx;x++){
  if(shrubs.length-understoryStart>=32||!allowed(x,y)||oldRailFootprint(x,y)||P[index(x,y)]||V[index(x,y)]||O[index(x,y)]||A[index(x,y)])continue;
  if(Math.hypot(x-141,y-106)<5||liveBodies.some(b=>overlap(b,x,y)))continue;
  if(Math.hypot((x-cx)/rx,(y-cy)/ry)>1||((x*13+y*19)%7)>1)continue;
  if(shrubs.some(s=>Math.hypot(s.x-x,s.y-y)<2))continue;
  O[index(x,y)]=(x+y)%3===0?987:(x+y)%2?305:306;shrubs.push({x,y});
 }
}
for(const l of old.layers){const n=L(l.name);
 if(l.name==='Collisions')continue;
 if(!l.data){assert.deepEqual(n,l);continue;}
 for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data[i])assert(allowed(i%W,Math.floor(i/W)),`${l.name} outside forest`);
 if(!['Paths','Objects','AbovePlayer','TerrainDetails','Environment_V32'].includes(l.name))assert.deepEqual(n,l,l.name);
}
map.properties.find(p=>p.name==='worldVersion').value='3.8-Final-Forest-Polish';
const manifest={source,version:'3.8-Final-Forest-Polish',bridge:{waterColumns:[153,154,155],landRailColumnsRemoved:[156,157,158,159,160,161,162,163],removedRails},trail:{trimmed,clearedTerrain,corridorColumns,normalWidthTiles:2,bridgeApproachWidthTiles:3},trees,shrubs,densityPass:{groves:groves.map(g=>g.slice(0,4)),treesAdded:trees.length-densityStart,understoryAdded:shrubs.length-understoryStart}};
for(const [file,value] of [[target,JSON.stringify(map)+'\n'],['world/forest-final-polish.json',JSON.stringify(manifest,null,2)+'\n']]){
 if(existsSync(file)&&readFileSync(file).equals(Buffer.from(value)))continue;
 if(check)throw Error('Forest final source differs: '+file);
 if(existsSync(file)&&!process.argv.includes('--force'))throw Error('Pass --force to regenerate '+file);
 writeFileSync(file,value);
}
console.log(`Forest final: 3-column wet bridge, 8 dry rail columns removed, ${trimmed.length} trail tiles narrowed, ${trees.length} native trees.`);
