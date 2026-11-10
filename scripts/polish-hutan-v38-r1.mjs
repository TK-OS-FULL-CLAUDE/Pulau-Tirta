/** Restoration-first forest pass. Uses only pre-V3.8 assets; no new tree/water artwork or physics. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
const check=process.argv.includes('--check'),file='world/maps/pulau_tirta_v38_r1.tmj',read=p=>JSON.parse(readFileSync(p,'utf8'));
const publish=(p,bytes)=>{if(existsSync(p)&&readFileSync(p).equals(Buffer.from(bytes)))return;if(check)throw Error('Forest R1 differs: '+p);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,bytes);};
if(existsSync(file)&&!check&&!process.argv.includes('--force'))throw Error('R1 exists. Preserve artist Tiled edits before explicitly using --force.');
// V3.7 is the stored original tree/river style; V3.8 is retained unchanged as an archive.
const old=read('world/maps/pulau_tirta_v37.tmj'),map=structuredClone(old),W=192,L=n=>map.layers.find(l=>l.name===n),B=n=>old.layers.find(l=>l.name===n);
const G=L('Ground'),P=L('Paths'),V=L('Water'),O=L('Objects'),A=L('AbovePlayer'),E=L('Environment_V32'),RP=L('Recovery_Plants_Hutan_Sungai'),RA=L('Recovery_Canopy_Hutan_Sungai');
const regions=L('Regions').objects,forest=regions.find(r=>r.name==='Hutan & Sungai'),others=regions.filter(r=>r!==forest),contains=(r,x,y)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x,y)=>contains(forest,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8));
const put=(l,x,y,g)=>{assert(allowed(x,y),`${l.name} outside Hutan:${x},${y}`);l.data[y*W+x]=g;};
const anchors=[[138,104],[144,114]],seeds=[[145,107],[147,107],[145,109],[147,109]],debris=[[156,102],[157,102],[156,103]];
const special=(x,y)=>[...anchors,...seeds,...debris].some(p=>p[0]===x&&p[1]===y)||(x>=144&&x<=148&&y>=106&&y<=110)||(x===144&&y===105)||Math.hypot(x*16+8-2264,y*16+8-1704)<64;
const bodies=L('Collisions').objects,overlap=(o,x,y)=>o.x<(x+1)*16&&o.x+o.width>x*16&&o.y<(y+1)*16&&o.y+o.height>y*16;
function nearPath(x,y,r=1){for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(P.data[(y+dy)*W+x+dx])return true;return false;}
// Original tree sprites stay dominant. A few tiny pines gain the original 16x32 Kenney pair,
// at their existing trunk collider, away from paths. No large/new tree species is used.
const trees=[];
for(const[x,y]of[[136,109],[138,111],[140,113],[143,101],[145,101],[147,102],[150,101],[152,102],[154,111],[153,113],[149,115],[146,116]]){
 const i=y*W+x;if(!allowed(x,y-1)||special(x,y)||special(x,y-1)||O.data[i]!==292||A.data[(y-1)*W+x]||O.data[(y-1)*W+x]||nearPath(x,y-1)||nearPath(x,y)||!bodies.some(o=>o.name===`v32_tree_${x}_${y}`))continue;
 put(A,x,y-1,137);put(O,x,y,149);put(RA,x,y-1,137);put(RP,x,y,149);trees.push({x,y,width:1,height:2,existingCollider:`v32_tree_${x}_${y}`});
}
// Small familiar #71ad61 grass pockets, already used by A5, over the native #84c669 base.
const tint=new Set();for(const[cx,cy,rx,ry]of[[130,112,3,2],[146,89,4,2],[171,102,3,2],[143,125,3,2],[150,115,2,2]])for(let y=cy-ry;y<=cy+ry;y++)for(let x=cx-rx;x<=cx+rx;x++){const i=y*W+x;if(allowed(x,y)&&[133,134].includes(G.data[i])&&!V.data[i]&&!P.data[i]&&!E.data[i]&&!special(x,y)&&((x-cx)/rx)**2+((y-cy)/ry)**2<=1)tint.add(i);}
for(const i of tint){const x=i%W,y=Math.floor(i/W);let mask=0;for(const[dx,dy,b]of[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]])if(tint.has((y+dy)*W+x+dx))mask|=b;put(G,x,y,915+96+mask);}
const details=[],skipped=[],loose=new Set([304,305,306,317,318,329,330,331,343,344,402]);
function detail(kind,x,y,g,fresh){const i=y*W+x,replace=O.data[i]===B('Objects').data[i]&&loose.has(O.data[i])&&!RP.data[i];
 if(!allowed(x,y)||special(x,y)||V.data[i]||P.data[i]||O.data[i]&&!replace||RP.data[i]||bodies.some(o=>overlap(o,x,y))){skipped.push({kind,x,y});return false;}
 put(O,x,y,g);if(fresh!==undefined)put(RP,x,y,fresh);details.push({kind,x,y,gid:g,recovers:fresh!==undefined,walkableGroundcover:true});return true;
}
function nearby(kind,x,y,g,fresh,side=1){for(const[dx,dy]of[[0,0],[side,0],[0,1],[side,-1]])if(detail(kind,x+dx,y+dy,g,fresh))return true;return false;}
// Compact understory pockets, intentionally uneven. Existing mature trees and their spacing remain original.
const pockets=[
 {name:'rumpun-barat',shrubs:[[129,109],[131,114],[133,116]],grass:[[128,110],[130,113],[132,115]],flowers:[[130,111]],wood:[[132,117]]},
 {name:'rumpun-hulu',shrubs:[[143,91],[147,92],[150,89]],grass:[[142,92],[146,90],[149,90]],flowers:[[145,92]],wood:[]},
 {name:'rumpun-timur',shrubs:[[170,101],[172,103],[174,105]],grass:[[169,102],[171,104],[173,106]],flowers:[[172,105]],wood:[[173,107]]},
 {name:'rumpun-selatan',shrubs:[[139,124],[143,127],[145,125]],grass:[[140,125],[142,126],[144,128]],flowers:[[143,125]],wood:[[141,127]]}
];
for(const p of pockets){const start=details.length;for(const[x,y]of p.shrubs)nearby('semak-original',x,y,305);for(const[x,y]of p.grass)nearby('rumput-original',x,y,915+69);for(const[x,y]of p.flowers)nearby('bunga-kecil',x,y,915+72);for(const[x,y]of p.wood)nearby('kayu-original',x,y,239);for(let i=start;i<details.length;i++)details[i].group=p.name;}
// River tiles are never edited: only small clusters on dry land at selected bends.
const reaches=[['hulu',88,-1],['belokan-utara',96,1],['pangkal-barat',101,-1],['pangkal-timur',110,1],['belokan-selatan',119,-1],['hilir',128,1]];
for(const[name,y,side]of reaches){const cx=157+Math.sin((y-68)/9)*5+Math.sin(y/4)*1.4,xs=[];for(let x=145;x<=173;x++)if(V.data[y*W+x]&&Math.abs(x-cx)<4.6)xs.push(x);if(!xs.length)continue;const edge=side<0?Math.min(...xs):Math.max(...xs),x=edge+side,start=details.length;
 nearby('batu-sungai-original',x,y,342,undefined,side);nearby('semak-tepian',x+side,y+1,306,undefined,side);nearby('rumput-lembap',x+2*side,y-1,915+69,915+68,side);nearby('kerikil-original',x+side,y+2,343,undefined,side);if(name==='pangkal-barat'||name==='hilir')nearby('bunga-tepian',x+2*side,y+2,915+73,undefined,side);for(let i=start;i<details.length;i++)details[i].group=name;
}
// Keep bridge access open: framing is low vegetation on the banks, not structural additions.
for(const[x,y,g]of[[150,103,305],[151,104,915+72],[151,109,915+69],[165,104,306],[166,105,342],[164,110,915+73]])nearby('bingkai-jembatan',x,y,g);
for(const l of old.layers){const n=L(l.name);if(!l.data)assert.deepEqual(n,l,l.name);else for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data[i])assert(allowed(i%W,Math.floor(i/W)),`${l.name} outside Hutan:${i}`);}
assert.deepEqual(V,B('Water'));assert.deepEqual(P,B('Paths'));assert.deepEqual(L('Recovery_Water_Hutan_Sungai'),B('Recovery_Water_Hutan_Sungai'));assert.deepEqual(L('Recovery_Hutan_Sungai'),B('Recovery_Hutan_Sungai'));assert.deepEqual(map.tilesets,old.tilesets);
map.properties.find(p=>p.name==='worldVersion').value='3.8-R1-Original-Forest';publish(file,JSON.stringify(map)+'\n');
publish('world/forest-v38-r1.json',JSON.stringify({version:'3.8-R1-Original-Forest',source:'world/maps/pulau_tirta_v37.tmj',archivedV38:'world/maps/pulau_tirta_v38.tmj',usesNewAssets:false,originalWaterRestored:true,originalPathsRestored:true,collisionChanged:false,trees,details,grassTintTiles:tint.size,placementsSkipped:skipped.length,protectedLivingAnchors:anchors,protectedSeedlings:seeds,protectedDebris:debris,validationTargets:[[124,101],[129,101],[136,103],[141,106],[141,110],[145,113],[150,112],[153,108],[154,106],[158,106],[163,106],[165,110],[145,108],[147,110]]},null,2)+'\n');
console.log(`Forest R1: original river/paths/trees restored; ${trees.length} native 16x32 pine upgrades, ${details.length} low details, ${tint.size} small grass-tint cells; no new atlas or collision.`);
