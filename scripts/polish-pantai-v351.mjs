/** Authored visual delta over stored V3.5. No collision, object contract, buildings or deck changes. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {POLISH as K,POLISH_FIRST as FIRST,POLISH_COLUMNS as COLS,poolPolishSvg} from './pantai-pool-polish-art.mjs';
const check=process.argv.includes('--check'),file='world/maps/pulau_tirta_v351.tmj';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const publish=(p,bytes)=>{if(existsSync(p)&&readFileSync(p).equals(Buffer.from(bytes)))return;if(check)throw Error('V3.5.1 differs: '+p);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,bytes);};
if(existsSync(file)&&!check&&!process.argv.includes('--force'))throw Error('Inspect Tiled edits before --force; export never runs this generator.');
const old=read('world/maps/pulau_tirta_v35.tmj'),map=structuredClone(old),W=192,L=n=>map.layers.find(l=>l.name===n),G=L('Ground'),D=L('TerrainDetails'),O=L('Objects'),A=L('AbovePlayer'),V=L('Water'),P=L('Paths'),R=L('Recovery_Plants_Pantai_Biru');
const regions=L('Regions').objects,coast=regions.find(r=>r.name==='Pantai Biru'),others=regions.filter(r=>r!==coast),contains=(r,x,y)=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;
const allowed=(x,y)=>contains(coast,x*16+8,y*16+8)&&!others.some(r=>contains(r,x*16+8,y*16+8));
const pools=(x,y)=>y>=102&&y<=106&&((x>=50&&x<=54)||(x>=61&&x<=65));
const gid=n=>FIRST+n;
// Only map graphics change. Both colliders and the original misi-1 recovery layer properties stay intact.
for(const[x,frame,recovered]of[[50,K.pool1,K.pool1Restored],[61,K.pool2,K.pool2Restored]])for(let dy=0;dy<5;dy++)for(let dx=0;dx<5;dx++){
 const i=(102+dy)*W+x+dx;O.data[i]=gid(frame+dy*COLS+dx);R.data[i]=gid(recovered+dy*COLS+dx);
}
// Reskin only the three already-solid rock groups; geometry and all existing props stay in place.
for(const{x,y}of read('world/coast-v35.json').props.filter(p=>p.kind==='rock'))for(let dy=0;dy<2;dy++)for(let dx=0;dx<3;dx++)O.data[(y+dy)*W+x+dx]=gid(K.rocks+dy*COLS+dx);
const additions=[],rejected=[];
function detail(kind,x,y,frame,w=1,h=1){
 for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++){
  const tx=x+dx,ty=y+dy,i=ty*W+tx;
  // Preserve all paths/canopies/props, experiment boards, interaction lane and existing recovery plants.
  if(!allowed(tx,ty)||pools(tx,ty)||V.data[i]||P.data[i]||O.data[i]||A.data[i]||D.data[i]||R.data[i]||Math.hypot(tx*16+8-920,ty*16+8-1672)<54||L('Collisions').objects.some(o=>o.x<(tx+1)*16&&o.x+o.width>tx*16&&o.y<(ty+1)*16&&o.y+o.height>ty*16)){rejected.push({kind,x,y});return;}
 }
 // Natural props must remain above the existing recovery-ground layer (depth2).
 // Only sand marks belong below it and disappear naturally under recovered dunegrass.
 const target=kind==='wind-sand'?D:O;
 for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)target.data[(y+dy)*W+x+dx]=gid(frame+dy*COLS+dx);
 additions.push({kind,x,y,width:w,height:h,walkableGroundcover:true});
}
// Named ecological pockets, not random scattering. Low rocks are embedded stepping stones, not new obstacles.
const pockets=[
 {name:'Pasir utara barat',stones:[[36,92]],fans:[],shrubs:[[33,91]],flowers:[[35,93]],grass:[[34,93],[36,94],[37,92]]},
 {name:'Pasir utara tengah',stones:[[44,93]],fans:[[40,91]],shrubs:[],flowers:[[43,94]],grass:[[42,94],[45,94],[46,93]]},
 {name:'Pasir utara timur',stones:[[65,92]],fans:[],shrubs:[[67,92]],flowers:[[64,93]],grass:[[63,92],[66,94],[68,94]]},
 {name:'Kolam barat',stones:[[46,106],[49,100]],fans:[[43,99]],shrubs:[[44,105]],flowers:[[45,107],[49,98]],grass:[[47,107],[48,100],[48,99],[45,104]]},
 {name:'Kolam timur',stones:[[67,106],[64,98]],fans:[[70,109]],shrubs:[[68,107]],flowers:[[68,105],[65,96]],grass:[[69,107],[70,108],[67,98],[64,97]]},
 {name:'Dune utara',stones:[[56,95],[59,97]],fans:[[51,94]],shrubs:[[58,94]],flowers:[[57,94]],grass:[[53,94],[55,95],[60,96],[62,97]]},
 {name:'Palem barat',stones:[[30,105],[36,103]],fans:[[26,101]],shrubs:[[28,104]],flowers:[[31,103],[35,105]],grass:[[29,105],[30,104],[36,106],[37,104]]},
 {name:'Pasir antara fasilitas',stones:[[41,108],[49,112]],fans:[[42,105]],shrubs:[[49,109]],flowers:[[42,109]],grass:[[41,110],[43,109],[50,110],[51,111]]},
 {name:'Pesisir tenggara',stones:[[61,122],[66,119]],fans:[[62,116]],shrubs:[[59,121]],flowers:[[63,119],[65,118]],grass:[[60,122],[62,121],[65,120],[67,118]]},
 {name:'Palem selatan',stones:[[47,123],[53,123]],fans:[[55,119]],shrubs:[[50,124]],flowers:[[52,123]],grass:[[46,123],[48,124],[53,125],[55,123]]},
 {name:'Batu pasang selatan',stones:[[39,125],[43,127]],fans:[],shrubs:[],flowers:[[42,125]],grass:[[38,126],[41,125],[43,126]]}
];
for(const pocket of pockets){
 const start=additions.length;
 for(const[x,y]of pocket.fans)detail('fan-palm',x,y,K.fanPalm,3,3);
 for(const[x,y]of pocket.shrubs)detail('shrub',x,y,K.shrub,2,2);
 for(const[x,y]of pocket.stones)detail('embedded-stones',x,y,K.lowStones,2,1);
 for(const[x,y]of pocket.flowers)detail('coastal-flowers',x,y,K.flowers,2,1);
 for(const[x,y]of pocket.grass)detail('dunegrass',x,y,(x+y)%3===0?K.grassBlue:(x+y)%3===1?K.grassGold:K.grass);
 for(let i=start;i<additions.length;i++)additions[i].pocket=pocket.name;
}
for(const[x,y]of[[28,110],[29,111],[40,123],[41,124],[46,126],[48,127],[56,128],[58,127],[63,125],[65,123]])detail('shells',x,y,K.shells);
for(const[x,y]of[[31,111],[57,126],[65,122]])detail('fallen-branch',x,y,K.branch,2,1);
for(const[x,y]of[[51,98],[58,96],[45,111],[57,123],[60,125],[42,125]])detail('wind-sand',x,y,K.sand,3,1);
for(const[x,y]of[[48,98],[67,107],[35,104],[53,124],[61,120]])detail('white-flowers',x,y,K.whiteFlowers);
// Bound the delta to pool graphics and natural ground details. No other object layers or physics differ.
for(const l of old.layers){const n=L(l.name);if(!l.data)assert.deepEqual(n,l,l.name);else for(let i=0;i<l.data.length;i++)if(l.data[i]!==n.data[i])assert(allowed(i%W,Math.floor(i/W)),l.name+':'+i);}
publish('world/assets/coast_v351/tileset.svg',poolPolishSvg());
publish('world/maps/tilesets/v351_coast.tsj',JSON.stringify({type:'tileset',version:'1.10',tiledversion:'1.11.2',name:'coast_v351',tilewidth:16,tileheight:16,tilecount:512,columns:COLS,image:'../../assets/coast_v351/tileset.svg',imagewidth:512,imageheight:256,margin:0,spacing:0,tiles:[]},null,2)+'\n');
map.tilesets.push({firstgid:FIRST,source:'tilesets/v351_coast.tsj'});map.properties.find(p=>p.name==='worldVersion').value='3.5.1-Pool-Nature';publish(file,JSON.stringify(map)+'\n');
publish('world/coast-v351.json',JSON.stringify({version:'3.5.1-Pool-Nature',source:'world/maps/pulau_tirta_v35.tmj',collisionChanged:false,buildingsAndPierChanged:false,poolFootprint:{width:5,height:5,positions:[[50,102],[61,102]]},recoveryLayer:'Recovery_Plants_Pantai_Biru',details:additions,pockets:pockets.map(p=>p.name),placementSkipped:rejected.length},null,2)+'\n');
console.log(`V3.5.1 authored: ${additions.length} natural groups/details, ${rejected.length} protected placements skipped; collision, paths, dock, buildings and contracts unchanged.`);
