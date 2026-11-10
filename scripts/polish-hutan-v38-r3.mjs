/** Native forest massing over R2, with explicitly approved local trunk-only bodies. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
const check=process.argv.includes('--check'),file='world/maps/pulau_tirta_v38_r3.tmj',read=p=>JSON.parse(readFileSync(p,'utf8'));
const publish=(p,bytes)=>{if(existsSync(p)&&readFileSync(p).equals(Buffer.from(bytes)))return;if(check)throw Error('Forest R3 differs: '+p);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,bytes);};
if(existsSync(file)&&!check&&!process.argv.includes('--force'))throw Error('R3 exists. Preserve artist Tiled edits before explicitly using --force.');
const old=read('world/maps/pulau_tirta_v38_r2.tmj'),map=structuredClone(old),W=192,L=n=>map.layers.find(l=>l.name===n),B=n=>old.layers.find(l=>l.name===n);
const O=L('Objects'),A=L('AbovePlayer'),P=L('Paths'),V=L('Water'),RP=L('Recovery_Plants_Hutan_Sungai'),RA=L('Recovery_Canopy_Hutan_Sungai');
const regions=L('Regions').objects,forest=regions.find(r=>r.name==='Hutan & Sungai'),others=regions.filter(r=>r!==forest),contains=(r,x,y)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x,y)=>contains(forest,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8)),put=(l,x,y,g)=>{assert(allowed(x,y),`${l.name} outside Hutan:${x},${y}`);l.data[y*W+x]=g;};
const bodies=L('Collisions').objects,overlap=(o,x,y)=>o.x<(x+1)*16&&o.x+o.width>x*16&&o.y<(y+1)*16&&o.y+o.height>y*16;
const protectedCells=[[138,104],[144,114],[145,107],[147,107],[145,109],[147,109],[156,102],[157,102],[156,103]];
const special=(x,y)=>protectedCells.some(p=>p[0]===x&&p[1]===y)||(x>=136&&x<=141&&y>=105&&y<=112)||(x>=144&&x<=148&&y>=106&&y<=110)||Math.hypot(x*16+8-2264,y*16+8-1704)<72||(x>=152&&x<=165&&y>=103&&y<=109);
const treeIds=new Set([138,148,149,160,161,292]),fullTreeIds=new Set([148,149]);
const interior=(x,y)=>x>=125&&x<178&&y>=85&&y<135;
function countTrees(layer,predicate=allowed,ids=treeIds){return layer.data.reduce((n,g,i)=>n+Number(ids.has(g)&&predicate(i%W,Math.floor(i/W))),0);}
// PASS 1: explicit asymmetric stands, with generous trail, river-view and hut-yard reservations.
const offsets=[[-1,-1],[1,-1],[0,0],[2,0],[-2,1],[1,2],[-1,3],[3,2],[2,4],[-2,4]];
const centers=[['barat-utara',130,94,8,'deep'],['barat-dalam',129,110,8,'deep'],['barat-selatan',131,119,8,'deep'],['utara-rindang',143,89,10,'deep'],['utara-timur',150,94,8,'deep'],['bahu-utara',139,96,8,'deep'],['belakang-pondok',139,100,5,'hut'],['samping-pondok',133,108,5,'hut'],['tengah-selatan',146,119,8,'trail'],['jalur-jembatan',149,100,5,'trail'],['tepi-timur-utara',166,97,8,'riverside'],['tepi-timur-tengah',168,102,8,'riverside'],['selatan-barat',140,126,8,'deep'],['selatan-timur',148,129,8,'riverside']];
const reserved=new Set(),planned=[];
function candidate(x,y){if(!allowed(x,y-1)||!interior(x,y)||special(x,y)||special(x,y-1))return false;
 for(let yy=y-1;yy<=y;yy++)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(P.data[(yy+dy)*W+x+dx]||V.data[(yy+dy)*W+x+dx])return false;
 const i=y*W+x;if(treeIds.has(O.data[i])||A.data[i-W]||RA.data[i-W]||RP.data[i]||reserved.has(i)||reserved.has(i-W)||reserved.has(i+W))return false;
 return !bodies.some(o=>o.x<(x+1)*16&&o.x+o.width>x*16&&o.y<(y+1)*16&&o.y+o.height>(y-1)*16);
}
for(const[name,cx,cy,n,zone]of centers){const positions=[];for(let j=0;j<n;j++){const[dx,dy]=offsets[j];for(const[fx,fy]of[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[2,0],[0,2]])if(candidate(cx+dx+fx,cy+dy+fy)){const x=cx+dx+fx,y=cy+dy+fy;positions.push([x,y]);reserved.add(y*W+x);break;}}planned.push({name,zone,positions});}
// PASS 2: activate native 16x32 crowns ONLY where a matching old solid body already exists.
// Old collision objects remain identical; crown upgrades reuse their original bodies.
const upgrades=[];
for(const b of bodies){const x=Math.floor(b.x/16),y=Math.floor(b.y/16),i=y*W+x;
 if(!allowed(x,y-1)||special(x,y)||special(x,y-1)||P.data[i]||P.data[i-W]||V.data[i]||V.data[i-W]||A.data[i-W]||RA.data[i-W])continue;
 const small=(b.name.startsWith('tree_')||b.name.startsWith('v32_tree_'))&&[138,160,161,292].includes(O.data[i]),rock=b.name.startsWith('rock_')&&O.data[i]===402;
 if(!small&&!rock)continue;const hadRecovery=Boolean(RP.data[i]),dry=small&&O.data[i]===160;
 put(A,x,y-1,dry?136:137);put(O,x,y,dry?148:149);if(hadRecovery){put(RA,x,y-1,137);put(RP,x,y,149);}upgrades.push({x,y,width:1,height:2,reusesCollider:b.name,kind:rock?'rock-to-native-tree':'native-small-to-tall'});
}
// Activate the approved stands using original 16x32 trees and the native 6x7 trunk footprint.
// No part of the canopy gets a collider. Planning above reserves trails, water and mission approaches.
const newTrees=[];
for(const group of planned)for(const[x,y]of group.positions){
 put(A,x,y-1,137);put(O,x,y,149);
 const body={id:map.nextobjectid++,name:`v38_r3_tree_${x}_${y}`,type:'obstacle',x:x*16+5,y:y*16+8,width:6,height:7,rotation:0,visible:true,properties:[{name:'collides',type:'bool',value:true}]};
 bodies.push(body);newTrees.push({x,y,group:group.name,zone:group.zone,collider:body.name});
}
// PASS 3: modest native understory follows stand edges, avoiding every trunk and crown.
const details=[],loose=new Set([304,305,306,317,318,329,330,331,343,344,402]);
function detail(kind,x,y,g){const i=y*W+x,replace=O.data[i]===B('Objects').data[i]&&loose.has(O.data[i])&&!RP.data[i];
 if(!allowed(x,y)||special(x,y)||P.data[i]||V.data[i]||O.data[i]&&!replace||RP.data[i]||reserved.has(i)||reserved.has(i+W)||bodies.some(o=>overlap(o,x,y)))return false;
 put(O,x,y,g);details.push({kind,x,y,gid:g,walkableGroundcover:true});return true;
}
for(const[name,cx,cy]of centers){let added=0;for(const[dx,dy,g]of[[-2,0,305],[2,1,306],[-1,4,915+69],[3,3,915+72]])if(detail('understory-native',cx+dx,cy+dy,g)){details.at(-1).group=name;added++;if(added>=2)break;}}
// PASS 4: keep the entire approved river/bridge/hut composition and all gameplay contracts frozen.
for(const l of old.layers){const n=L(l.name);if(l.name==='Collisions'){assert.deepEqual({...n,objects:n.objects.slice(0,l.objects.length)},l,'Existing collisions');assert.equal(n.objects.length,l.objects.length+newTrees.length);}else if(!l.data)assert.deepEqual(n,l,l.name);else for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data[i])assert(allowed(i%W,Math.floor(i/W)),`${l.name} outside Hutan:${i}`);}
for(const n of['Paths','Water','Forest_Bridge_Water_Visual','Ground','Environment_V32','Facades'])assert.deepEqual(L(n),B(n),n);
for(let y=107;y<=110;y++)for(let x=138;x<=139;x++)for(const n of['Objects','AbovePlayer','Facades','Recovery_Plants_Hutan_Sungai','Recovery_Canopy_Hutan_Sungai'])assert.equal(L(n).data[y*W+x],B(n).data[y*W+x],`Hut ${n}:${x},${y}`);
for(const[x,y]of protectedCells)for(const n of['Objects','Recovery_Plants_Hutan_Sungai'])assert.equal(L(n).data[y*W+x],B(n).data[y*W+x]);
map.properties.find(p=>p.name==='worldVersion').value='3.8-R3-Native-Stands';publish(file,JSON.stringify(map)+'\n');
const before=countTrees(B('Objects'),interior),after=countTrees(O,interior),newSites=planned.reduce((n,g)=>n+g.positions.length,0);
publish('world/forest-v38-r3.json',JSON.stringify({version:'3.8-R3-Native-Stands',source:'world/maps/pulau_tirta_v38_r2.tmj',collisionMode:'approved-local-trunks',usesNewAssets:false,upgrades,newTrees,details,metrics:{interiorBefore:before,interiorAfter:after,interiorIncreasePercent:Math.round((after-before)/before*100),fullSizeBefore:countTrees(B('Objects'),allowed,fullTreeIds),fullSizeAfter:countTrees(O,allowed,fullTreeIds)},plannedNewTreeGroups:planned,proposedNewTreeCount:newSites,proposedPercentOfInterior:Math.round(newSites/before*100),newTreeCollidersActivated:true,protectedCells,validationTargets:read('world/forest-v38-r2.json').validationTargets},null,2)+'\n');
console.log(`R3: ${upgrades.length} native crown upgrades; interior ${before} -> ${after}; ${newSites} new trees with approved 6x7 trunk-only colliders.`);
