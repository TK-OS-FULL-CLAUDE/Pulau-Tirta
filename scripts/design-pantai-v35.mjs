/** Curated four-zone coastal delta over integrated A5. Dev/build only export its Tiled output. */
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {COAST as K,COAST_FIRST as FIRST,COAST_COLS,coastSvg} from './coast-v35-art.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8')),check=process.argv.includes('--check');
const publish=(p,bytes)=>{const file=resolve(root,p);if(existsSync(file)&&readFileSync(file).equals(Buffer.from(bytes)))return;if(check)throw Error('Coast generator differs: '+p);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,bytes);};
const save=(p,v)=>publish(p,JSON.stringify(v,null,p.endsWith('.tmj')?0:2)+'\n');
const output='world/maps/pulau_tirta_v35.tmj';if(existsSync(resolve(root,output))&&!process.argv.includes('--force')&&!check)throw Error('V3.5 exists; inspect Tiled edits before --force.');
const old=read('world/maps/pulau_tirta_v34_a5.tmj'),map=structuredClone(old),W=192,L=n=>map.layers.find(l=>l.name===n),before=n=>old.layers.find(l=>l.name===n);
const G=L('Ground'),D=L('TerrainDetails'),V=L('Water'),P=L('Paths'),O=L('Objects'),A=L('AbovePlayer'),E=L('Environment_V32'),C=L('Collisions'),F=L('Facades');
const regions=L('Regions').objects,coast=regions.find(o=>o.name==='Pantai Biru'),others=regions.filter(o=>o!==coast);
const contains=(o,x,y)=>x>=o.x&&x<o.x+o.width&&y>=o.y&&y<o.y+o.height;
const allowed=(x,y)=>contains(coast,x*16+8,y*16+8)&&!others.some(o=>contains(o,x*16+8,y*16+8));
const fixed=(x,y)=>(y>=102&&y<=106&&((x>=50&&x<=54)||(x>=61&&x<=65)))||(x>=58&&x<=59&&y>=100&&y<=101)||(x===58&&y===99);
const anchor=(x,y)=>(x===33&&y===110)||(x===55&&y===115);
const edit=(x,y)=>allowed(x,y)&&x>=22&&x<=74&&y>=90&&y<=129&&!fixed(x,y)&&!anchor(x,y);
const gid=n=>FIRST+n,prop=(name,value)=>({name,value,type:typeof value==='boolean'?'bool':typeof value==='number'?'float':'string'});
function put(l,x,y,value){if(!allowed(x,y)||fixed(x,y))throw Error(`Protected ${l.name} ${x},${y}`);l.data[y*W+x]=value;}
function fully(o,predicate=allowed){for(let y=Math.floor(o.y/16);y<Math.ceil((o.y+o.height)/16);y++)for(let x=Math.floor(o.x/16);x<Math.ceil((o.x+o.width)/16);x++)if(!predicate(x,y))return false;return true;}
const bridge=new Set([14,601,602]),oldDeck=new Set(before('Paths').data.flatMap((g,i)=>bridge.has(g)&&allowed(i%W,Math.floor(i/W))?[i]:[]));
// Remove the old open-sand scatter; retain forest fringe, pool/cermin, animation anchors and outside pixels.
for(let y=90;y<=129;y++)for(let x=22;x<=74;x++)if(edit(x,y)){
 const i=y*W+x;for(const l of[O,A,D,E,F])put(l,x,y,0);
 if(!oldDeck.has(i)&&!V.data[i])put(P,x,y,0);
 for(const name of ['Recovery_Plants_Pantai_Biru','Recovery_Canopy_Pantai_Biru'])put(L(name),x,y,0);
}
C.objects=C.objects.filter(o=>!fully(o,edit)||['Kolam batu 50','Kolam batu 61','Cermin pajangan'].includes(o.name));
// Calm light sand replaces the repeating grain. Existing land and water silhouettes do not change.
for(let y=82;y<133;y++)for(let x=14;x<76;x++)if(allowed(x,y)&&!fixed(x,y)){
 const i=y*W+x,sandOverlay=before('TerrainDetails').data[i]>=595&&before('TerrainDetails').data[i]<=598;
 if(!V.data[i]&&(before('Ground').data[i]===134||sandOverlay)){put(G,x,y,gid(K.sand));if(sandOverlay)put(D,x,y,0);}
}
function field(cells,start){for(const i of cells){const x=i%W,y=Math.floor(i/W);let mask=0;for(const[dx,dy,b]of[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]])if(cells.has((y+dy)*W+x+dx))mask|=b;put(G,x,y,gid(start+mask));}}
function patch(lobes,start){const cells=new Set();for(const[cx,cy,rx,ry]of lobes)for(let y=Math.floor(cy-ry);y<=cy+ry;y++)for(let x=Math.floor(cx-rx);x<=cx+rx;x++)if(allowed(x,y)&&!fixed(x,y)&&!V.data[y*W+x]&&G.data[y*W+x]>=FIRST&&((x-cx)/rx)**2+((y-cy)/ry)**2<=1)cells.add(y*W+x);field(cells,start);}
patch([[32,103,5,4],[36,108,5,5],[44,114,8,5],[51,121,6,4],[66,110,6,5],[57,96,10,3]],K.warm);
patch([[70,99,5,3],[73,103,3,3],[33,107,3,3],[50,120,4,3]],K.dune);
const wet=new Set(),nearWater=new Map();
for(let y=83;y<132;y++)for(let x=15;x<75;x++)if(allowed(x,y)&&!fixed(x,y)){
 const i=y*W+x;if(!V.data[i]&&G.data[i]>=FIRST){let distance=9;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)if(before('Water').data[(y+dy)*W+x+dx])distance=Math.min(distance,Math.hypot(dx,dy));if(distance<=2.1)wet.add(i);}
 if(V.data[i]){let distance=9;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)if(!before('Water').data[(y+dy)*W+x+dx])distance=Math.min(distance,Math.hypot(dx,dy));if(distance<=3.2)nearWater.set(i,distance<=1.5?K.water:K.waterMid);}
}
field(wet,K.wet);
// Keep the old recovery footprint, using cohesive coastal dune grass rather than a grass/sand checker.
const recoveredSand=new Set(L('Recovery_Pantai_Biru').data.flatMap((g,i)=>g&&allowed(i%W,Math.floor(i/W))&&!fixed(i%W,Math.floor(i/W))?[i]:[]));
for(const i of recoveredSand){const x=i%W,y=Math.floor(i/W);let mask=0;for(const[dx,dy,b]of[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]])if(recoveredSand.has((y+dy)*W+x+dx))mask|=b;put(L('Recovery_Pantai_Biru'),x,y,gid(K.dune+mask));}
for(const[i,start]of nearWater){const x=i%W,y=Math.floor(i/W);let mask=0;for(const[dx,dy,b]of[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]])if(before('Water').data[(y+dy)*W+x+dx])mask|=b;put(V,x,y,gid(start+mask));}
// The exact old pier bridge footprint remains walkable; material and cargo change around it.
for(const i of oldDeck)if(!fixed(i%W,Math.floor(i/W)))put(P,i%W,Math.floor(i/W),gid((i%W+Math.floor(i/W))%3===0?K.deckAlt:K.deck));
function route(points,r=.84,material=K.trail){for(let k=1;k<points.length;k++){const[a,b]=[points[k-1],points[k]],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*4));for(let t=0;t<=n;t++){const cx=a[0]+(b[0]-a[0])*t/n,cy=a[1]+(b[1]-a[1])*t/n;for(let y=Math.floor(cy-r);y<=cy+r;y++)for(let x=Math.floor(cx-r);x<=cx+r;x++)if(allowed(x,y)&&!fixed(x,y)&&!V.data[y*W+x]&&!oldDeck.has(y*W+x)&&Math.hypot(x-cx,y-cy)<=r)put(P,x,y,gid(material));}}}
route([[75,98],[71,99],[67,98],[62,99],[57,99],[57,104],[57,109]]);
route([[57,109],[54,111],[51,113],[49,116],[44,119],[38,119]],1.05);
route([[57,109],[63,108],[66,107]],.84,K.stone);route([[57,109],[52,108],[49,107]],.84,K.stone);
route([[38,119],[37,117],[38,114],[39,112],[36,109],[32,108],[30,106]],.7);
route([[44,119],[48,122],[53,124],[58,124],[63,120],[68,116],[69,110],[68,106],[68,102]],.7);
// Light aprons are small and tied to the stone basins rather than a single broad rectangular plaza.
for(const cx of[52,63])for(let y=101;y<=108;y++)for(let x=cx-3;x<=cx+3;x++)if(allowed(x,y)&&!fixed(x,y)&&((x-cx)/3.4)**2+((y-104.5)/4.2)**2<=1)put(P,x,y,gid(K.stone));
const props=[],zones=[];let zone;
function startZone(id,description,build){zone={id,description,props:[]};zones.push(zone);build();}
function block(name,x,y,w,h){const o={id:map.nextobjectid++,name:`v35_${name}`,type:'obstacle',x:x*16,y:y*16,width:w*16,height:h*16,rotation:0,visible:true,properties:[prop('collides',true)]};if(!fully(o,(x,y)=>allowed(x,y)&&!fixed(x,y)))throw Error('Collider scope '+name);if(Math.hypot((x+w/2)*16-920,(y+h/2)*16-1672)<62)throw Error('Mission approach blocked '+name);C.objects.push(o);}
const definitions={palm:[K.palm,3,4,3],palmSmall:[K.palmSmall,3,3,2],palmRight:[K.palmRight,3,4,3],shelter:[K.shelter,5,3,1],boat:[K.boat,5,3,0],net:[K.net,4,2,0],fish:[K.fishCrates,2,1,0],table:[K.table,3,2,0],cart:[K.cart,2,2,0],rock:[K.rock,3,2,0],log:[K.log,3,1,0],shrub:[K.shrub,2,1,0]};
function stamp(kind,x,y){
 const[f,w,h,above]=definitions[kind];for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++){const l=dy<above?A:O,tx=x+dx,ty=y+dy,i=ty*W+tx;if(l.data[i])throw Error(`Occupied ${kind} ${tx},${ty} gid${l.data[i]}`);put(l,tx,ty,gid(f+dy*COAST_COLS+dx));}
 props.push({kind,x,y,width:w,height:h,zone:zone.id});zone.props.push(props.length-1);
 if(kind==='palm'||kind==='palmSmall'||kind==='palmRight')block(kind+'_'+x+'_'+y,x+(kind==='palmRight'?1.55:1.18),y+h-.72,.4,.6);
 else if(kind==='shelter'){block('shelter_l',x+.1,y+1,.22,1.9);block('shelter_r',x+4.7,y+1,.22,1.9);block('shelter_counter',x+.5,y+2.25,4,.6);}
 else if(kind==='net'){block('net_l',x+.05,y+.15,.2,1.7);block('net_r',x+3.75,y+.15,.2,1.7);}
 else if(kind==='boat')block('boat',x+.7,y+.75,3.6,1.7);
 else if(kind==='rock')block('rock_'+x+'_'+y,x+.2,y+.75,2.6,1.15);
 else if(kind==='log')block('driftwood',x+.25,y+.4,2.5,.5);
 else if(kind!=='shrub')block(kind+'_'+x+'_'+y,x+.15,y+h-.7,w-.3,.6);
 if(kind==='shrub')for(let dx=0;dx<w;dx++)put(L('Recovery_Plants_Pantai_Biru'),x+dx,y,gid(K.shrubFresh+dx));
}
function nativeStock(x,y,f){if(O.data[y*W+x])throw Error('Native stock occupied');put(O,x,y,265+f);block('stock_'+x+'_'+y,x+.15,y+.4,.7,.55);}
function sign(x,y,frame,label){put(O,x,y,gid(frame));block('sign_'+x+'_'+y,x+.4,y+.6,.2,.35);L('Landmarks').objects.push({id:map.nextobjectid++,name:label,type:'sign',x:x*16+8,y:y*16+8,width:0,height:0,point:true,rotation:0,visible:true,properties:[prop('label',label),prop('radiusPx',34)]});}
startZone('dermaga','Perahu tertambat, bongkar muat dan naungan kerja nelayan',()=>{
 stamp('boat',25,119);stamp('shelter',42,112);stamp('net',36,115);stamp('fish',38,117);nativeStock(41,116,76);nativeStock(40,117,85);nativeStock(47,114,85);sign(40,118,K.signArrow,'Dermaga · bongkar muat nelayan');
 stamp('palm',39,108);stamp('palmSmall',48,111);
 for(let x=31;x<43;x++){put(O,x,121,gid([31,34,37,40,42].includes(x)?K.rail:K.railMid));block('rail_'+x,x,121.55,1,.3);}for(const[x,y]of[[30,117],[32,117]]){put(O,x,y,gid(K.rail));block('pier_post_'+x,x+.4,y+.5,.2,.5);}put(O,33,119,gid(K.rope));put(O,30,120,gid(K.tether));
});
startZone('eksperimen','Dua kolam batu, cermin dan perlengkapan eksperimen yang terbuka',()=>{
 stamp('table',66,100);stamp('cart',47,102);stamp('palm',46,96);stamp('shrub',67,104);stamp('shrub',46,108);
 sign(49,108,K.sign1,'Kolam 1 · Pantai Biru');sign(66,108,K.sign2,'Kolam 2 · Pantai Biru');
});
startZone('pesisir','Kelompok palem, batu dan kayu hanyut pada kantong pantai alami',()=>{
 stamp('palm',29,99);stamp('palmRight',33,101);stamp('palm',47,118);stamp('palmRight',51,119);stamp('rock',27,105);stamp('rock',40,126);stamp('log',44,124);
 stamp('rock',54,94);stamp('palmSmall',61,94);
 for(const[x,y]of[[34,107],[44,110],[52,117],[64,114],[66,116]])stamp('shrub',x,y);
});
startZone('transisi','Jalur masuk pesisir, arah kolam/dermaga dan titik istirahat',()=>{
 stamp('palm',70,102);sign(73,100,K.signArrow,'Pantai Biru · kolam dan dermaga');put(O,72,106,606);put(O,73,106,607);block('bench',72.1,106.5,1.8,.4);stamp('shrub',69,100);stamp('palmSmall',66,110);
});
// Small details only at authored pockets, never uniformly scattered over the sand or over roads.
const details=[
 [K.shell,[[28,108],[29,109],[30,109],[42,123],[43,124],[47,125],[55,126],[56,126]]],
 [K.flowers,[[34,106],[35,107],[36,107],[68,98],[69,98],[70,100],[50,117],[51,118],[54,122]]],
 [K.grass,[[32,106],[32,107],[35,108],[45,109],[46,110],[47,110],[67,113],[68,114],[69,115],[53,118],[54,119],[70,101]]],
 ];
for(const[f,cells]of details)for(const[x,y]of cells){const i=y*W+x;if(!allowed(x,y)||fixed(x,y)||V.data[i]||P.data[i]||O.data[i]||A.data[i]||D.data[i])continue;if(C.objects.some(o=>o.x<(x+1)*16&&o.x+o.width>x*16&&o.y<(y+1)*16&&o.y+o.height>y*16))continue;put(D,x,y,gid(f));}
for(const[x,y]of[[55,96],[64,96],[54,126]])for(let dx=0;dx<3;dx++){const i=y*W+x+dx;if(allowed(x+dx,y)&&!fixed(x+dx,y)&&!V.data[i]&&!P.data[i]&&!O.data[i]&&!D.data[i])put(D,x+dx,y,gid(K.windSand+dx));}
// Bridge paint remains under cargo; trails do not pretend to continue through a solid prop.
for(const o of C.objects.filter(o=>o.name.startsWith('v35_')))for(let y=Math.floor(o.y/16);y<Math.ceil((o.y+o.height)/16);y++)for(let x=Math.floor(o.x/16);x<Math.ceil((o.x+o.width)/16);x++)if(allowed(x,y)&&!fixed(x,y)&&!oldDeck.has(y*W+x))put(P,x,y,0);
for(let y=82;y<133;y++)for(let x=14;x<76;x++){const i=y*W+x;if(allowed(x,y)&&!fixed(x,y)&&P.data[i]>=gid(K.trail)&&P.data[i]<gid(K.trail+16)){let mask=0;for(const[dx,dy,b]of[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]])if(P.data[(y+dy)*W+x+dx])mask|=b;put(P,x,y,gid(K.trail+mask));}}
for(const[x,y]of[[72,99],[62,99],[57,110],[51,114],[45,118]])if(P.data[y*W+x]>=gid(K.trail)&&P.data[y*W+x]<gid(K.trail+16))put(P,x,y,gid(K.track));
// Do not accidentally recolor/destroy source outside Pantai, including the overlap with A5.
for(const l of old.layers.filter(l=>l.data))for(let i=0;i<l.data.length;i++)if((!allowed(i%W,Math.floor(i/W))||fixed(i%W,Math.floor(i/W)))&&l.data[i]!==L(l.name).data[i])throw Error(`Protected tile ${l.name}:${i}`);
publish('world/assets/coast_v35/tileset.svg',coastSvg());
const tiles=[...[K.deck,K.deckAlt].map(id=>({id,properties:[prop('bridge',true)]})),...Array.from({length:32},(_,n)=>({id:K.water+n,properties:[prop('collides',true)]}))];
save('world/maps/tilesets/v35_coast.tsj',{type:'tileset',version:'1.10',tiledversion:'1.11.2',name:'coast_v35',tilewidth:16,tileheight:16,tilecount:384,columns:24,image:'../../assets/coast_v35/tileset.svg',imagewidth:384,imageheight:256,margin:0,spacing:0,tiles});
map.tilesets.push({firstgid:FIRST,source:'tilesets/v35_coast.tsj'});map.properties.find(p=>p.name==='worldVersion').value='3.5-Pantai-B1';save(output,map);
const tour=[['Gerbang pesisir',75,98],['Jalur transisi',72,99],['Istirahat pesisir',71,107],['Stasiun penguapan',57,104],['Kolam 1',52,107],['Kolam 2',63,107],['Perlengkapan eksperimen',68,102],['Dunegrass timur',68,115],['Pantai selatan',58,124],['Palem pesisir',49,122],['Kayu hanyut',45,123],['Area kerja nelayan',44,115],['Peti ikan',39,118],['Ujung dermaga',31,120],['Perahu tertambat',30,120],['Jaring nelayan',37,117],['Garis pantai',32,108],['Kembali ke kolam',57,104]].map(([label,x,y])=>({label,tile:[x,y],pauseMs:1800}));
save('world/coast-v35.json',{stage:'3.5-Pantai-B1',basis:{branch:'feature/world-pantai-b1',commit:'2458a76',source:'integrated main including A5/playtest/audio'},bounds:{x:14,y:82,width:62,height:51},protectedPools:[{x:50,y:102,width:5,height:5},{x:61,y:102,width:5,height:5}],zones,props,tour,npcAdded:false,existingNpcLimit:4,animationAnchors:[[33,110],[55,115]],waterShapeChanged:false,oldDeckCells:[...oldDeck].map(i=>[i%W,Math.floor(i/W)])});
console.log('V3.5 Pantai authored; A5, other regions, pool/cermin core and sea/deck footprints preserved.');
