/** Deliberate household clusters over integrated A4; no random placement or old-stage regeneration. */
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {villagePropsSvg} from './village-a5-props.mjs';
import {finishVillageColor} from './village-a5-color.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const save=(p,v)=>writeFileSync(resolve(root,p),JSON.stringify(v,null,p.endsWith('.tmj')?0:2)+'\n');
const output='world/maps/pulau_tirta_v34_a5.tmj';
if(existsSync(resolve(root,output))&&!process.argv.includes('--force'))throw Error('A5 exists; inspect artist edits before --force.');
const old=read('world/maps/pulau_tirta_v34_a4.tmj'),map=structuredClone(old),houses=read('world/buildings-v34-a1.json');
const L=n=>map.layers.find(l=>l.name===n),O=L('Objects'),A=L('AbovePlayer'),P=L('Paths'),E=L('Environment_V32'),F=L('Celebration_Desa_Decor'),T=L('Celebration_Desa_Terrain'),C=L('Collisions');
const regions=L('Regions').objects,desa=regions.find(o=>o.name==='Desa Tirta'),W=192;
const contains=(o,x,y)=>x>=o.x&&x<o.x+o.width&&y>=o.y&&y<o.y+o.height;
const village=(x,y)=>contains(desa,x*16+8,y*16+8)&&!regions.some(o=>o!==desa&&contains(o,x*16+8,y*16+8));
const house=(x,y)=>houses.some(b=>x>=b.x&&x<b.x+b.width&&y>=b.y&&y<b.y+4);
function put(l,x,y,g){if(!village(x,y)||house(x,y))throw Error(`Protected ${l.name} ${x},${y}`);l.data[y*W+x]=g;}
const point=(name,value)=>({name,type:'string',value});
const clusters=[],footprints=[];let current;
function cluster(id,role,access,build){current={id,role,access,props:[]};clusters.push(current);build();}
function block(id,x,y,w,h){
 for(let ty=Math.floor(y);ty<Math.ceil(y+h);ty++)for(let tx=Math.floor(x);tx<Math.ceil(x+w);tx++)if(!village(tx,ty)||house(tx,ty))throw Error(`Collider scope ${id}`);
 C.objects.push({id:map.nextobjectid++,name:`a5_${current.id}_${id}`,type:'obstacle',x:x*16,y:y*16,width:w*16,height:h*16,rotation:0,visible:true,properties:[{name:'collides',type:'bool',value:true}]});
}
const parts={tree:{frame:0,w:3,h:3,above:2},pergola:{frame:4,w:2,h:2,above:1},cart:{frame:7,w:2,h:2,above:0},rack:{frame:10,w:3,h:2,above:1},table:{frame:52,w:2,h:1,above:0},planter:{frame:55,w:2,h:1,above:0},laundry:{frame:74,w:3,h:2,above:1}};
function stamp(kind,x,y){
 const p=parts[kind];current.props.push({kind,x,y,width:p.w,height:p.h});
 for(let dy=0;dy<p.h;dy++)for(let dx=0;dx<p.w;dx++){
  const l=dy<p.above?A:O,i=(y+dy)*W+x+dx,g=l.data[i];
  if(g&&!([135,765,785].includes(g)&&l===O))throw Error(`Occupied ${kind} ${x+dx},${y+dy} gid${g}`);
  put(l,x+dx,y+dy,915+p.frame+dy*16+dx);
 }
 const base=y+p.h-1;
 if(kind==='tree')block(kind+'_'+x+'_'+y,x+1.25,base+.4,.5,.55);
 else if(kind==='laundry'){block('post_l_'+x,x+.08,base+.05,.16,.9);block('post_r_'+x,x+2.82,base+.05,.16,.9);}
 else block(kind+'_'+x+'_'+y,x+.1,base+.35,p.w-.2,.6);
 footprints.push({kind,x,y,w:p.w,h:p.h});
}
function shade(rx,ry){
 // Replace the original trunk/canopy at exactly the same anchor, retaining its surroundings.
 put(O,rx,ry,0);put(A,rx,ry-1,0);C.objects=C.objects.filter(o=>!o.name.endsWith(`tree_${rx}_${ry}`));stamp('tree',rx-1,ry-2);
}
function removeTree(rx,ry){put(O,rx,ry,0);put(A,rx,ry-1,0);C.objects=C.objects.filter(o=>!o.name.endsWith(`tree_${rx}_${ry}`));}
function stock(x,y,f){
 if(O.data[y*W+x]&&!([135,765,785].includes(O.data[y*W+x])))throw Error(`Stock occupied ${x},${y}`);
 put(O,x,y,265+f);block('stock_'+x+'_'+y,x+.15,y+.4,.7,.55);current.props.push({kind:'native-stock',frame:f,x,y,width:1,height:1});
}
function bench(x,y){for(let dx=0;dx<2;dx++){if(O.data[y*W+x+dx])throw Error('Bench occupied');put(O,x+dx,y,606+dx);}block('bench_'+x+'_'+y,x+.1,y+.5,1.8,.4);current.props.push({kind:'native-bench',x,y,width:2,height:1});}
function path(points,r=.8){for(let n=1;n<points.length;n++){const[a,b]=[points[n-1],points[n]],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*4));for(let t=0;t<=steps;t++){const cx=a[0]+(b[0]-a[0])*t/steps,cy=a[1]+(b[1]-a[1])*t/steps;for(let y=Math.floor(cy-r);y<=cy+r;y++)for(let x=Math.floor(cx-r);x<=cx+r;x++)if(village(x,y)&&!house(x,y)&&Math.hypot(x-cx,y-cy)<=r)put(P,x,y,899);}}}
cluster('utara-komunal','Halaman bersama Rumah Utara: tempat berteduh dan berkumpul',[99,61],()=>{
 removeTree(101,60);stamp('tree',100,56);stamp('pergola',103,59);stamp('planter',97,57);path([[95,65],[98,65],[98,61],[98,60],[101,60],[102,60]]);path([[98,61],[101,61]]);
});
cluster('rumah-kebun','Sudut simpan hasil kebun dan peneduh di sisi rumah',[84,67],()=>{
 stamp('rack',82,65);stamp('tree',81,67);stock(84,69,72);stamp('planter',85,71);
});
cluster('balai','Tempat tunggu berpeneduh di belakang Balai dan planter depan',[107,64],()=>{
 stamp('tree',107,60);bench(107,63);stamp('planter',100,70);path([[101,65],[104,65],[107,64]]);
});
cluster('pasar-servis','Naungan sortir, gerobak sayur dan ruang pembeli yang jelas',[78,73],()=>{
 stamp('rack',76,71);shade(90,73);stamp('cart',89,78);stamp('planter',96,71);stamp('planter',103,76);
 path([[78,73],[79,73],[79,70],[80,70],[80,69],[81,69]]);path([[78,73],[78,74]]);
});
cluster('rumah-pasar','Rumah Barat melanjutkan aktivitas penyimpanan pasar',[85,81],()=>{stamp('table',83,78);stock(83,79,85);stock(85,79,76);stamp('planter',83,80);});
cluster('keluarga-timur','Bangku, planter, jemuran dan pembatas pohon pekarangan',[118,83],()=>{
 stamp('laundry',117,81);stamp('planter',114,81);stamp('tree',117,85);path([[119,84],[118,83]]);
});
cluster('petani-kerja','Rak panen di samping rumah, wadah air dan meja kerja',[94,86],()=>{
 stamp('rack',92,84);stamp('table',95,85);shade(92,90);path([[94,86],[95,86],[96,86],[97,86],[98,86]]);
});
cluster('selatan-komunal','Pohon, pergola dan tempat mencuci menghubungkan dua rumah selatan',[97,91],()=>{
 stamp('tree',98,87);stamp('pergola',95,89);stamp('table',98,90);shade(93,95);path([[96,91],[99,91]],1.05);path([[97,91],[97,92],[99,92]]);
});
cluster('nursery-panen','Tempat sortir panen pada tepi nursery; aisle lama tetap terbuka',[86,95],()=>{
 stamp('rack',84,96);path([[86,94],[86,95],[87,95],[87,96],[87,97]]);
});
cluster('kebun-keluarga','Meja pengolahan hasil kebun dekat penyimpanan dan jalur keluarga',[115,90],()=>{
 stamp('table',115,89);bench(115,92);shade(116,96);path([[115,90],[115,91],[115,93],[115,94]]);
});
// Retain all four existing identities and the same Living World interface.
const activities=read('world/village-a4.json').activities;
activities.village_npc_2={activity:'Berbincang dan menunggu di halaman komunal utara',tiles:[[98,60],[99,60]],pauseMs:3200};
for(const m of L('NPCSpawns').objects){const a=activities[m.name];if(a)m.properties=m.properties.map(p=>p.name==='villageActivity'?point('villageActivity',JSON.stringify(a)):p);}
// Only the actual base of a solid object clears road/soil beneath it; canopy does not block walking.
for(const o of C.objects.filter(o=>o.name.startsWith('a5_'))){
 for(let y=Math.floor(o.y/16);y<Math.ceil((o.y+o.height)/16);y++)for(let x=Math.floor(o.x/16);x<Math.ceil((o.x+o.width)/16);x++)if(village(x,y)&&!house(x,y)){put(P,x,y,0);if(E.data[y*W+x]===886)put(E,x,y,0);}
}
// Recalculate only village earth edges from the final road graph; all old tilesets remain byte-identical.
for(let y=55;y<=97;y++)for(let x=70;x<=120;x++)if(village(x,y)&&P.data[y*W+x]>=899&&P.data[y*W+x]<=914){let mask=0;for(const[dx,dy,b]of[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]])if(P.data[(y+dy)*W+x+dx])mask|=b;put(P,x,y,899+mask);}
// Decorative water/crop recovery is preserved, including the exact well and Festival banners.
const colorFinish=finishVillageColor(map,houses);
for(const l of old.layers.filter(l=>l.data))for(let i=0;i<l.data.length;i++)if((!village(i%W,Math.floor(i/W))||house(i%W,Math.floor(i/W)))&&l.data[i]!==L(l.name).data[i])throw Error(`Scope ${l.name}:${i}`);
mkdirSync(resolve(root,'world/assets/village_a5'),{recursive:true});writeFileSync(resolve(root,'world/assets/village_a5/props.svg'),villagePropsSvg());
save('world/maps/tilesets/v34_a5_props.tsj',{type:'tileset',version:'1.10',tiledversion:'1.11.2',name:'village_a5_props',tilewidth:16,tileheight:16,tilecount:128,columns:16,image:'../../assets/village_a5/props.svg',imagewidth:256,imageheight:128,margin:0,spacing:0});
map.tilesets.push({firstgid:915,source:'tilesets/v34_a5_props.tsj'});map.properties.find(p=>p.name==='worldVersion').value='3.4-A5';save(output,map);
const manifest=read('world/village-a4.json');manifest.stage='a5';manifest.clusters=clusters;manifest.activities=activities;manifest.basis={branch:'feature/world-desa-a5',commit:'d4d7d63',source:'integrated origin/main'};manifest.notes=['Household clusters, not random scatter','Medium shapes connect the seven unchanged houses','No gameplay/UI/backend changes'];
manifest.tour=manifest.tour.flatMap(t=>[t,...(t.label==='Rumah Sungai'?[{label:'Halaman komunal selatan',tile:[97,91]}]:t.label==='Rumah Utara'?[{label:'Halaman komunal utara',tile:[99,61]}]:[])]).map(t=>({...t,pauseMs:900}));
save('world/village-a5.json',manifest);
save('world/village-a5-color.json',colorFinish);
console.log('A5 authored: household clusters, unchanged seven house footprints and mission-region pixels.');
