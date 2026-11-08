/** Two explicit passes. A2 must be validated before invoking --stage=a3. */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const save=(p,v)=>writeFileSync(resolve(root,p),JSON.stringify(v,null,p.endsWith('.tmj')?0:2)+'\n');
const stage=process.argv.includes('--stage=a3')?'a3':'a2';
const output=`world/maps/pulau_tirta_v34_${stage}.tmj`;
if(existsSync(resolve(root,output))&&!process.argv.includes('--force'))throw Error('Output exists; preserve artist edits before --force.');
const original=read('world/maps/pulau_tirta_v34_a11.tmj');
const map=stage==='a2'?structuredClone(original):read('world/maps/pulau_tirta_v34_a2.tmj');
const buildings=read('world/buildings-v34-a1.json');
const L=n=>map.layers.find(l=>l.name===n),W=map.width;
const regions=L('Regions').objects,desa=regions.find(o=>o.name==='Desa Tirta'),missions=regions.filter(o=>o!==desa);
const contains=(o,x,y)=>x>=o.x&&x<o.x+o.width&&y>=o.y&&y<o.y+o.height;
const core=(x,y)=>x>=79&&x<108&&y>=71&&y<85;
const village=(x,y)=>contains(desa,x*16+8,y*16+8)&&!missions.some(o=>contains(o,x*16+8,y*16+8));
const work=(x,y)=>village(x,y)&&!core(x,y)&&x>=76&&x<119&&y>=57&&y<97;
const house=(x,y)=>buildings.some(b=>x>=b.x&&x<b.x+b.width&&y>=b.y&&y<b.y+4);
const town=n=>133+n,farm=n=>265+n,env=n=>755+n,stone=n=>883+n,props=n=>595+n;
const O=L('Objects'),A=L('AbovePlayer'),P=L('Paths'),E=L('Environment_V32'),C=L('Collisions');
const prop=(name,value)=>({name,value,type:typeof value==='boolean'?'bool':typeof value==='number'?'float':'string'});
const put=(l,x,y,g)=>{if(!village(x,y)||core(x,y))throw Error(`Outside village pass ${x},${y}`);l.data[y*W+x]=g;};
const fill=(l,x,y,w,h,g)=>{for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)put(l,x+dx,y+dy,g);};
function fullyAllowed(o){for(let y=Math.floor(o.y/16);y<=Math.floor((o.y+o.height-.001)/16);y++)for(let x=Math.floor(o.x/16);x<=Math.floor((o.x+o.width-.001)/16);x++)if(!work(x,y))return false;return true;}
const boundaryCells=new Set();
if(stage==='a2'){
 // Preserve both canopy and trunk when an old tree straddles a protected boundary.
 for(const o of C.objects)if(/tree|pine/.test(o.name)&&!fullyAllowed(o)){
  const tx=Math.floor(o.x/16),ty=Math.floor(o.y/16);for(let dy=-2;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)boundaryCells.add(`${tx+dx},${ty+dy}`);
 }
 for(const name of ['Objects','AbovePlayer','Facades','TerrainDetails','Environment_V32','Paths','Celebration_Desa_Terrain','Celebration_Desa_Decor','Celebration_Desa_Banners']){
  const l=L(name);for(let y=57;y<97;y++)for(let x=76;x<119;x++)if(work(x,y)&&!boundaryCells.has(`${x},${y}`)&&!(['Objects','AbovePlayer','Facades'].includes(name)&&house(x,y)))l.data[y*W+x]=0;
 }
 C.objects=C.objects.filter(o=>!fullyAllowed(o)||buildings.some(b=>o.name.endsWith(b.name)));
 L('Landmarks').objects=L('Landmarks').objects.filter(o=>!work(Math.floor(o.x/16),Math.floor(o.y/16))||buildings.some(b=>o.name===b.name));
}
function block(name,x,y,w,h){const o={id:map.nextobjectid++,name:`${stage}_${name}`,type:'obstacle',x:x*16,y:y*16,width:w*16,height:h*16,rotation:0,visible:true,properties:[prop('collides',true)]};if(!fullyVillage(o))throw Error(`Invalid collider ${name}`);C.objects.push(o);}
function fullyVillage(o){for(let y=Math.floor(o.y/16);y<=Math.floor((o.y+o.height-.001)/16);y++)for(let x=Math.floor(o.x/16);x<=Math.floor((o.x+o.width-.001)/16);x++)if(!village(x,y)||core(x,y))return false;return true;}
function marker(name,x,y){if(!village(x,y)||core(x,y))throw Error('Marker scope');L('Landmarks').objects.push({id:map.nextobjectid++,name,type:'sign',x:x*16+8,y:y*16+8,width:0,height:0,rotation:0,point:true,visible:true,properties:[prop('label',name),prop('radiusPx',34)]});}
function sign(name,x,y){put(O,x,y,town(83));block(`sign_${x}_${y}`,x+.35,y+.6,.3,.3);marker(name,x,y);}
function route(points,gid=stone(2),radius=.84){
 for(let i=1;i<points.length;i++){const[a,b]=[points[i-1],points[i]],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*4));
  for(let n=0;n<=steps;n++){const cx=a[0]+(b[0]-a[0])*n/steps,cy=a[1]+(b[1]-a[1])*n/steps;
   for(let y=Math.floor(cy-radius);y<=cy+radius;y++)for(let x=Math.floor(cx-radius);x<=cx+radius;x++)if(village(x,y)&&!core(x,y)&&!house(x,y)&&Math.hypot(x-cx,y-cy)<=radius)put(P,x,y,gid);
  }
 }
}
function rail(x,y,w,gap=-10){for(let dx=0;dx<w;dx++)if(dx!==gap&&dx!==gap+1){put(O,x+dx,y,town(dx===0?80:dx===w-1?82:81));block(`fence_${x}_${y}_${dx}`,x+dx,y+.55,1,.3);}}
function fence(x,y,w,h,gate,topGate=false){rail(x,y,w,topGate?gate:-10);rail(x,y+h-1,w,gate);for(let dy=1;dy<h-1;dy++)for(const dx of[0,w-1]){put(O,x+dx,y+dy,town(dx===0?56:58));block(`fence_side_${x}_${y}_${dx}_${dy}`,x+dx+.2,y+dy+.15,.28,.85);}}
function tree(x,y,wide=false){
 if(O.data[y*W+x])return;
 if(wide){put(A,x,y-1,town(4));put(O,x,y,town(16));}
 else put(O,x,y,farm(27));
 block(`tree_${x}_${y}`,x+.3,y+.5,.4,.45);
}
function bench(x,y){put(O,x,y,props(11));put(O,x+1,y,props(12));block(`bench_${x}_${y}`,x+.1,y+.5,1.8,.4);}
function stock(x,y,id){put(O,x,y,farm(id));block(`stock_${x}_${y}`,x+.15,y+.4,.7,.55);}
function bed(x,y,w,crop,grown){
 for(let dy=0;dy<2;dy++)for(let dx=0;dx<w;dx++){
  put(E,x+dx,y+dy,farm((dy===0?48:60)+(dx===0?0:dx===w-1?2:1)));
  if(dy===0){put(O,x+dx,y,crop);put(L('Celebration_Desa_Decor'),x+dx,y,grown);}
  put(L('Celebration_Desa_Terrain'),x+dx,y+dy,env(4));
 }
}
function flowers(points){for(const[x,y]of points)put(O,x,y,town(2));}
const localRoutes=[
 [[95,65],[99,65],[99,71]], [[87,71],[87,72]], [[104,70],[104,72]],
 [[81,81],[78,81],[78,84],[80,84],[80,90],[80,96]],
 [[80,90],[84,91],[88,91],[92,92],[99,92],[104,92]],
 [[86,94],[86,92],[88,91]], [[104,92],[104,94],[100,94]],
 [[104,92],[107,94],[111,94],[111,93]],
 [[108,80],[111,80],[115,80],[116,78],[116,77]],
 [[107,85],[107,87],[104,92]], [[111,70],[116,71],[116,72]],
 [[89,65],[92,65],[95,65]], [[111,80],[113,84],[111,86],[111,87]],
];
if(stage==='a2'){
 // Northern homes: a small orchard, kitchen beds and shared front lane.
 rail(91,59,8,3);rail(89,66,8,3);
 bed(88,61,3,farm(4),farm(54));bed(88,63,3,farm(17),farm(20));
 tree(91,58,true);tree(101,60,true);tree(102,62);
 stock(99,62,76);stock(100,62,85);bench(97,59);
 flowers([[92,60],[98,63],[86,65],[84,68],[100,68],[106,70]]);
 fence(90,66,8,5,2);bed(91,67,2,farm(17),farm(20));bed(95,67,2,farm(30),farm(30));
 fence(108,65,7,5,2);bed(109,66,2,farm(4),farm(54));bed(112,66,2,farm(66),farm(66));
 sign('Kebun dapur • jalur rumah utara',100,64);
 // West cottage backyard, naturally framed but leaving its front door untouched.
 tree(77,77,true);put(O,77,79,farm(40));stock(77,75,76);flowers([[77,74],[78,80]]);
 // East family yard: herb beds, shade and an open front lane.
 fence(114,73,5,5,2,true);bed(115,74,3,farm(17),farm(20));
 tree(117,80,true);bench(115,82);stock(117,71,85);flowers([[109,73],[115,79],[118,78]]);
 // Western production garden: separate vegetable/nursery blocks and a service aisle.
 fence(77,85,7,5,3,true);bed(78,86,2,farm(17),farm(20));bed(81,86,2,farm(30),farm(30));
 fence(77,91,7,6,3,true);bed(78,92,2,farm(4),farm(54));bed(81,92,2,farm(66),farm(66));
 bed(78,94,2,farm(4),farm(54));bed(81,94,2,farm(17),farm(20));
 route([[80,85],[80,89],[80,91],[80,96]],env(3),.6);
 stock(84,94,98);stock(85,94,99);stock(84,93,76);stock(84,95,85);
 put(O,85,95,town(116));sign('Kebun Kampung • bibit dan hasil panen',85,92);
 // Southern homes share a courtyard and harvest route rather than isolated lawns.
 rail(85,85,6,2);rail(101,86,5,2);
 tree(92,90,true);tree(93,95,true);bench(95,95);stock(91,88,76);
 flowers([[85,89],[91,91],[101,90],[106,92],[96,96]]);
 fence(108,87,7,7,2,true);bed(109,88,2,farm(17),farm(20));bed(112,88,2,farm(30),farm(30));
 bed(109,90,2,farm(4),farm(54));bed(112,90,2,farm(66),farm(66));
 tree(116,96,true);stock(116,90,76);sign('Kebun keluarga • jalan plaza',107,88);
 for(const[x,y]of[[91,86],[98,95],[114,95]]){put(O,x,y,env(30));put(L('Celebration_Desa_Decor'),x,y,env(12));}
 for(const path of localRoutes)route(path);
}
if(stage==='a3'){
 // Clear only old outer path surfacing, not the central A1.1 composition or farmland.
 for(let y=55;y<98;y++)for(let x=70;x<121;x++)if(village(x,y)&&!core(x,y)&&!house(x,y)&&P.data[y*W+x]===176)put(P,x,y,0);
 for(const path of localRoutes)route(path);
 // Village spine and gateways meet the existing paths at the protected region edges.
 for(const path of [
  [[77,63],[78,63],[82,64],[85,65],[89,65]],
  [[104,70],[110,71],[116,71],[117,69],[117,66],[120,61],[119,60]],
  [[119,60],[119,58],[112,58],[105,59],[103,60],[103,62],[101,64],[99,65]],
  [[76,93],[76,97],[80,97],[80,96]],
  [[98,84],[98,86],[94,88],[92,92]],
  [[108,80],[111,80],[115,84],[119,84],[119,94],[120,97],[117,94],[111,94]],
  [[107,84],[107,85]], [[87,84],[88,86],[88,91]],
 ])route(path);
 // Transition clusters stay on the village side of every boundary.
 for(const[x,y]of[[83,60],[85,61],[81,66],[117,62],[118,64],[117,89],[119,91],[118,95]])if(!P.data[y*W+x])tree(x,y);
 // Coastal side uses low shrubs and grass, not a wall of conifers.
 for(const[x,y]of[[76,92],[77,90],[83,97],[84,96],[118,83],[119,86]])if(!O.data[y*W+x])put(O,x,y,env(10));
 for(const[x,y]of[[84,62],[86,62],[118,61],[116,96]])if(!O.data[y*W+x])put(O,x,y,farm(40));
 sign('Puncak Kabut • jalur barat laut',82,62);
 sign('Lembah Hujan • jalur timur laut',118,59);
 sign('Pantai Biru • jalur pesisir',78,93);
 sign('Hutan & Sungai • jalur tenggara',118,96);
}
// Any protected tile change is an error, including overlaps with the village rectangle.
for(const old of original.layers.filter(l=>l.data))for(let i=0;i<old.data.length;i++)if((!village(i%W,Math.floor(i/W))||core(i%W,Math.floor(i/W)))&&old.data[i]!==L(old.name).data[i])throw Error(`Protected tile changed ${old.name}:${i}`);
map.properties=map.properties.filter(p=>p.name!=='worldVersion');map.properties.push(prop('worldVersion',`3.4-${stage.toUpperCase()}`));
save(output,map);
const tour=[
 ['Spawn',96,79],['Plaza Festival',98,79],['Sumur',91,77],['Pasar',87,76],['Rumah Barat',81,81],
 ['Kebun sayur barat',80,90],['Bed bibit',80,96],['Gerbang pesisir',76,94],['Penyimpanan panen',86,94],
 ['Rumah Petani',88,91],['Rumah Sungai',104,92],['Kebun keluarga',111,94],['Gerbang hutan',119,94],
 ['Rumah Timur',111,80],['Pekarangan herbal',116,78],['Gerbang timur desa',119,84],
 ['Balai Desa',104,70],['Kebun dapur',111,70],['Gerbang lembah',119,60],['Jalan utara',112,58],
 ['Rumah Utara',95,65],['Kebun kecil utara',89,65],['Gerbang puncak',82,64],['Rumah Kebun',87,71],['Kembali ke plaza',96,79],
].map(([label,x,y])=>({label,tile:[x,y],pauseMs:1300}));
save(`world/village-${stage}.json`,{stage,bounds:{x:70,y:55,width:51,height:43},protectedCentre:{x:79,y:71,width:29,height:14},houses:buildings.map(b=>({name:b.name,door:[b.door.x,b.door.y+1]})),tour,checkpoint:'0ecc0fb'});
console.log(`${stage.toUpperCase()} written; source A1.1 and protected mission/centre tiles unchanged.`);
