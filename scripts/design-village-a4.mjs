/** A4 is a scoped delta over A3. No earlier map or asset is regenerated. */
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const save=(p,v)=>writeFileSync(resolve(root,p),JSON.stringify(v,null,p.endsWith('.tmj')?0:2)+'\n');
const output='world/maps/pulau_tirta_v34_a4.tmj';
if(existsSync(resolve(root,output))&&!process.argv.includes('--force'))throw Error('A4 exists. Inspect edits before using --force.');
const old=read('world/maps/pulau_tirta_v34_a3.tmj'),map=structuredClone(old),houses=read('world/buildings-v34-a1.json');
const L=n=>map.layers.find(l=>l.name===n),W=192;
const regions=L('Regions').objects,desa=regions.find(o=>o.name==='Desa Tirta');
const contains=(o,x,y)=>x>=o.x&&x<o.x+o.width&&y>=o.y&&y<o.y+o.height;
const village=(x,y)=>contains(desa,x*16+8,y*16+8)&&!regions.some(o=>o!==desa&&contains(o,x*16+8,y*16+8));
const house=(x,y)=>houses.some(b=>x>=b.x&&x<b.x+b.width&&y>=b.y&&y<b.y+4);
const P=L('Paths'),O=L('Objects'),E=L('Environment_V32'),A=L('AbovePlayer'),C=L('Collisions'),F=L('Celebration_Desa_Decor'),T=L('Celebration_Desa_Terrain');
const prop=(name,value)=>({name,value,type:typeof value==='number'?'float':'string'});
function put(l,x,y,g){if(!village(x,y)||house(x,y))throw Error(`Protected ${l.name} ${x},${y}`);l.data[y*W+x]=g;}
function clear(l,x,y,w,h){for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)put(l,x+dx,y+dy,0);}
function route(points,r=.84){for(let i=1;i<points.length;i++){const[a,b]=[points[i-1],points[i]],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*4);for(let n=0;n<=steps;n++){const cx=a[0]+(b[0]-a[0])*n/steps,cy=a[1]+(b[1]-a[1])*n/steps;for(let y=Math.floor(cy-r);y<=cy+r;y++)for(let x=Math.floor(cx-r);x<=cx+r;x++)if(village(x,y)&&!house(x,y)&&Math.hypot(x-cx,y-cy)<=r)put(P,x,y,885);}}}
function removeProps(x,y,w,h){
 for(const l of[O,E,F,T])clear(l,x,y,w,h);
 C.objects=C.objects.filter(o=>!(o.x>=x*16&&o.y>=y*16&&o.x+o.width<=(x+w)*16&&o.y+o.height<=(y+h)*16));
}
function block(name,x,y,w=.7,h=.5){C.objects.push({id:map.nextobjectid++,name:`a4_${name}`,type:'obstacle',x:x*16,y:y*16,width:w*16,height:h*16,rotation:0,visible:true,properties:[{name:'collides',type:'bool',value:true}]});}
function stock(x,y,frame){if(O.data[y*W+x])throw Error(`Occupied stock ${x},${y}`);put(O,x,y,265+frame);block(`stock_${x}_${y}`,x+.15,y+.4);}
function rail(x,y,w){for(let dx=0;dx<w;dx++){put(O,x+dx,y,133+(dx===0?80:dx===w-1?82:81));block(`rail_${x}_${y}_${dx}`,x+dx,y+.55,1,.3);}}
function bed(x,y,w,crops){for(let dy=0;dy<2;dy++)for(let dx=0;dx<w;dx++){
 put(E,x+dx,y+dy,265+(dy?60:48)+(dx===0?0:dx===w-1?2:1));put(T,x+dx,y+dy,759);
 if(!dy){const f=crops[dx%crops.length];put(O,x+dx,y,265+f);put(F,x+dx,y,265+(f===4?54:f===17?20:f));}
}}
// Prune the unused north perimeter. The northeast gate is reached directly from the balai lane.
for(let y=55;y<=70;y++)for(let x=99;x<=120;x++)if(village(x,y)&&!house(x,y))put(P,x,y,0);
route([[99,65],[101,65],[101,63]]);
route([[99,65],[99,71]]);
route([[104,70],[110,71],[116,71],[117,68],[118,65],[119,63],[120,61],[119,60]]);
route([[111,70],[116,71]]);
// Replace the eastern rectangle with two purposeful branches, not a ring round empty grass.
for(let y=79;y<=97;y++)for(let x=112;x<=120;x++)if(village(x,y)&&!house(x,y))put(P,x,y,0);
route([[111,80],[112,81],[113,82],[114,83],[115,84],[119,84]]);
route([[111,80],[113,84],[111,86],[111,87]]);
route([[111,80],[115,80],[116,78],[116,77]]);
route([[111,94],[114,94],[116,95],[117,96],[117,97],[120,97]]);
// Remove the obsolete south patrol spur and west lawn loop; keep the house/farm spine.
for(let x=100;x<=103;x++)put(P,x,94,0);
for(const[x,y]of[[78,81],[79,81],[80,81],[78,82],[78,83],[78,84],[79,84]])put(P,x,y,0);
// A service lane passes west of the family-garden sign instead of running into it.
for(let y=85;y<=91;y++)for(let x=106;x<=107;x++)put(P,x,y,0);
route([[107,84],[107,86],[106,86],[106,92],[104,92]]);
// Customer entry reaches the actual kiosk counter through the open northern side.
route([[87,76],[87,74],[84,74]]);
// Shorter northern kitchen plot: open service side, one long mixed row and a water corner.
removeProps(108,65,7,5);rail(108,65,7);rail(108,69,2);rail(113,69,2);
bed(109,66,4,[4,4,17,17]);stock(114,67,72);stock(114,68,76);
// Western production: long carrot row vs short turnip row, broken side fencing and harvest staging.
removeProps(77,85,7,5);rail(77,85,3);rail(82,85,2);rail(77,89,3);rail(82,89,2);
bed(78,86,2,[17]);bed(81,86,3,[30]);stock(77,88,76);
// Nursery: staggered beds and a bare working bed; all approaches keep the centre aisle clear.
removeProps(77,91,7,6);rail(77,91,3);rail(82,91,2);rail(77,96,3);rail(82,96,2);
bed(78,92,2,[4]);bed(81,92,3,[4,4,17]);bed(78,94,2,[17]);
for(let dx=0;dx<3;dx++)for(let dy=0;dy<2;dy++)put(E,81+dx,94+dy,886);
put(O,83,94,265+4);put(F,83,94,265+54);stock(82,95,72);
// Family plot is an L, with a spare earthen bed, instead of four identical pairs.
removeProps(108,87,7,7);rail(108,87,2);rail(113,87,2);rail(108,93,2);rail(113,93,2);
bed(109,88,2,[17]);bed(112,88,3,[66]);bed(109,90,2,[4]);
for(let dx=0;dx<3;dx++)for(let dy=0;dy<2;dy++)put(E,112+dx,90+dy,886);
stock(114,91,76);stock(113,91,72);
// Herb yard remains small and open, distinct from productive fenced plots.
removeProps(114,73,5,5);rail(114,73,2);rail(118,73,1);rail(114,77,2);rail(118,77,1);
bed(115,74,2,[17]);stock(118,75,72);
// Ground hierarchy: cobble only at the well apron and compact Festival court.
const inCourt=(x,y)=>{const row={77:[96,100],78:[95,101],79:[95,102],80:[95,101],81:[96,101],82:[97,100]}[y];return row&&x>=row[0]&&x<=row[1];};
for(let y=71;y<=84;y++)for(let x=79;x<=107;x++)if(!house(x,y)&&P.data[y*W+x]&&!(x>=91&&x<=95&&y>=75&&y<=78)&&!inCourt(x,y))put(P,x,y,885);
for(const[x,y]of[[88,77],[89,77],[90,77],[92,79],[93,79],[94,79],[94,82],[95,82],[101,82]])if(!O.data[y*W+x])put(P,x,y,0);
route([[107,80],[107,86]]);
route([[101,81],[101,82],[103,82]]);
for(const[x,y]of[[103,84],[104,84],[79,72],[79,73],...[79,80,81,82,83,84,85].map(x=>[x,71])])put(P,x,y,0);
// Well queue props flank, rather than occupy, the approach and mission clearing.
stock(91,74,72);stock(96,74,85);
// The left kiosk sells vegetables; the right keeps grain/seed sacks and harvest baskets.
for(const[x,frame]of[[80,47],[81,30],[83,66],[84,76]])put(L('Facades'),x,73,265+frame);
stock(83,75,47);stock(84,75,76);
// Water at the home and production area tells the same dry/recovered story as the well.
stock(91,89,72);stock(85,93,72);
for(const[x,y]of[[91,74],[114,67],[118,75],[82,95],[113,91],[91,89],[85,93]])put(F,x,y,265+73);
// Retain the original four NPC identities. Only bounded waypoint data and pauses change.
const activities={
 village_npc_1:{activity:'Menata sayur di pasar',tiles:[[86,74],[87,74],[87,76]],pauseMs:2800},
 village_npc_2:{activity:'Mengawasi pekarangan herbal',tiles:[[116,78]],pauseMs:3000},
 village_npc_3:{activity:'Memeriksa bibit dan panen',tiles:[[86,94],[86,92],[88,91]],pauseMs:3000},
 village_npc_4:{activity:'Menyiapkan area sumur dan Festival',tiles:[[94,78],[94,80],[93,81]],pauseMs:2300},
};
for(const m of L('NPCSpawns').objects){const a=activities[m.name];if(a)m.properties.push(prop('villageActivity',JSON.stringify(a)));}
// Local pixel geometry, using the existing A1 soil palette. No downloaded/generated imagery.
// Each cardinal mask connects completely to its neighbours; exposed edges are slightly irregular.
const first=899;let svg='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" shape-rendering="crispEdges">';
for(let mask=0;mask<16;mask++){const ox=mask%4*16,oy=Math.floor(mask/4)*16;for(let y=0;y<16;y++)for(let x=0;x<16;x++){
 const left=mask&8?0:1+((y*7)%5===0?1:0),right=mask&2?15:14-((y*3)%7===0?1:0),top=mask&1?0:1+((x*3)%7===0?1:0),bottom=mask&4?15:14-((x*7)%5===0?1:0);
 if(x<left||x>right||y<top||y>bottom)continue;
 const edge=(!(mask&8)&&x===left)||(!(mask&2)&&x===right)||(!(mask&1)&&y===top)||(!(mask&4)&&y===bottom);const c=edge?'#b4a07e':(x*7+y*11)%41===0?'#cdb590':(x*13+y*3)%59===0?'#a89070':'#bfa681';
 svg+=`<rect x="${ox+x}" y="${oy+y}" width="1" height="1" fill="${c}"/>`;
}}svg+='</svg>\n';
mkdirSync(resolve(root,'world/assets/village_a4'),{recursive:true});writeFileSync(resolve(root,'world/assets/village_a4/paths.svg'),svg);
save('world/maps/tilesets/v34_a4_paths.tsj',{type:'tileset',version:'1.10',tiledversion:'1.11.2',name:'village_a4_paths',tilewidth:16,tileheight:16,tilecount:16,columns:4,image:'../../assets/village_a4/paths.svg',imagewidth:64,imageheight:64,margin:0,spacing:0});
map.tilesets.push({firstgid:first,source:'tilesets/v34_a4_paths.tsj'});
for(let y=55;y<=97;y++)for(let x=70;x<=120;x++)if(village(x,y)&&!house(x,y)&&[176,885,758].includes(P.data[y*W+x])){
 const neighbours=[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]];let mask=0;for(const[dx,dy,bit]of neighbours)if(P.data[(y+dy)*W+x+dx])mask|=bit;put(P,x,y,first+mask);
}
for(const l of old.layers.filter(l=>l.data))for(let i=0;i<l.data.length;i++)if((!village(i%W,Math.floor(i/W))||house(i%W,Math.floor(i/W)))&&l.data[i]!==L(l.name).data[i])throw Error(`Protected tile changed: ${l.name}:${i}`);
map.properties.find(p=>p.name==='worldVersion').value='3.4-A4';save(output,map);
const manifest=read('world/village-a3.json');manifest.stage='a4';delete manifest.protectedCentre;
manifest.tour=manifest.tour.filter(t=>t.label!=='Jalan utara').map(t=>t.label==='Gerbang hutan'?{...t,tile:[117,96]}:t.label==='Pasar'?{...t,tile:[84,74]}:t);
manifest.activities=activities;manifest.notes=['No northern perimeter ring','East and southeast are independent destination branches','Well and Festival coordinates unchanged','Open-sided gardens preserve a 1-tile service aisle'];
save('world/village-a4.json',manifest);
const files=['world/maps/pulau_tirta_v34_a3.tmj','public/maps/pulau-tirta-v34-a3.json','src/game/living-model.ts','src/game/map-data.ts','src/game/world.ts','shared/missions.ts','content/misi.json','server/index.ts','server/tiko.ts'];
save('world/village-a4-baseline.json',Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(resolve(root,f))).digest('hex')])));
console.log('A4 written; all mission tiles and seven house footprints remain identical to A3.');
