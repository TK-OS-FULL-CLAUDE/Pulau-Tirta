/** A1 only: one curated village centre rectangle. Old maps and assets are read-only. */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const save=(p,data)=>writeFileSync(resolve(root,p),JSON.stringify(data,null,p.endsWith('.tmj')?0:2)+'\n');
if(existsSync(resolve(root,'world/maps/pulau_tirta_v34_a1.tmj'))&&!process.argv.includes('--force'))throw Error('A1 exists; back up Tiled edits before --force.');
const map=read('world/maps/pulau_tirta_v3_2.tmj'), previous=structuredClone(map);
const roi={x:78,y:65,width:38,height:20}, inside=(x,y)=>x>=78&&x<116&&y>=65&&y<85;
const L=n=>map.layers.find(l=>l.name===n), W=map.width, T=16;
const prop=(name,value)=>({name,value,type:typeof value==='boolean'?'bool':typeof value==='number'?'float':'string'});
const town=n=>133+n,farm=n=>265+n,old=n=>595+n,env=n=>755+n,art=n=>883+n;
const O=L('Objects'),A=L('AbovePlayer'),F=L('Facades'),P=L('Paths'),E=L('Environment_V32'),C=L('Collisions');
function put(l,x,y,g){if(!inside(x,y))throw Error(`Outside A1: ${x},${y}`);l.data[y*W+x]=g;}
function rect(l,x,y,w,h,g){for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)put(l,x+dx,y+dy,g);}
function stamp(l,x,y,rows,base=old){rows.forEach((r,dy)=>r.forEach((n,dx)=>put(l,x+dx,y+dy,base(n))));}
const affected=['Objects','AbovePlayer','Facades','TerrainDetails','Paths','Environment_V32','Celebration_Desa_Terrain','Celebration_Desa_Decor','Celebration_Desa_Banners'];
for(const name of affected)rect(L(name),78,65,38,20,0);
const overlap=o=>o.x<(116*T)&&o.x+o.width>78*T&&o.y<85*T&&o.y+o.height>65*T;
// No crossing colliders may silently change land outside the scope.
for(const o of C.objects.filter(overlap))if(o.x<78*T||o.y<65*T||o.x+o.width>116*T||o.y+o.height>85*T)throw Error(`Boundary collider: ${o.name}`);
C.objects=C.objects.filter(o=>!overlap(o));
const signs=L('Landmarks');signs.objects=signs.objects.filter(o=>!inside(Math.floor(o.x/16),Math.floor(o.y/16))||o.name==='Sumur Desa');
function block(name,x,y,w,h){C.objects.push({id:map.nextobjectid++,name:`a1_${name}`,type:'obstacle',x:x*T,y:y*T,width:w*T,height:h*T,rotation:0,visible:true,properties:[prop('collides',true)]});}
function marker(name,x,y){signs.objects.push({id:map.nextobjectid++,name,type:'sign',x:x*T+8,y:y*T+8,width:0,height:0,point:true,rotation:0,visible:true,properties:[prop('label',name),prop('radiusPx',32)]});}
function route(points,r=1){for(let i=1;i<points.length;i++){const[a,b]=[points[i-1],points[i]],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*3));for(let n=0;n<=steps;n++){const cx=a[0]+(b[0]-a[0])*n/steps,cy=a[1]+(b[1]-a[1])*n/steps;for(let y=Math.floor(cy-r);y<=cy+r;y++)for(let x=Math.floor(cx-r);x<=cx+r;x++)if(inside(x,y)&&Math.hypot(x-cx,y-cy)<=r)put(P,x,y,art(0));}}}
// Plaza: continuous warm cobble with clipped corners and one quiet, open festival floor.
for(let y=74;y<=83;y++)for(let x=91;x<=105;x++){
 if((x===91||x===105)&&(y===74||y===83))continue;
 put(P,x,y,art(x===91||x===105||y===74||y===83?1:0));
}
rect(P,96,78,5,4,art(4));
for(const r of [ [[78,66],[82,68],[87,72],[91,74]], [[95,65],[99,65],[99,71],[98,75]], [[87,71],[89,71],[99,71]], [[104,70],[104,72],[102,74]], [[87,73],[87,78],[92,78]], [[81,81],[87,81],[92,80]], [[111,80],[107,80],[104,80]], [[78,84],[86,84],[92,82]], [[98,83],[98,84]], [[104,84],[102,83]], [[115,84],[110,82],[105,81]] ])route(r,.8);
for(const [x,y]of [[92,74],[103,74],[91,82],[103,82]])rect(P,x,y,3,2,0);
const buildings=read('world/buildings-v32.json');
function house(name,x,y,w,red,coolWall){
 const top=red?[52,53,54]:[48,49,50],roof=red?[64,65,66]:[60,61,62],wall=coolWall?[76,77,79]:[72,73,75],middle=Math.floor(w/2);
 for(let dx=0;dx<w;dx++){const edge=dx===0?0:dx===w-1?2:1;put(A,x+dx,y,town(top[edge]));put(A,x+dx,y+1,town(dx===middle?red?67:63:roof[edge]));for(let dy=2;dy<4;dy++)put(O,x+dx,y+dy,town(wall[edge]));}
 put(F,x+middle,y+3,town(coolWall?89:85));put(F,x+1,y+2,town(coolWall?88:84));if(w>4)put(F,x+w-2,y+2,town(coolWall?90:86));
 block(name,x+.1,y+2,w-.2,1.9);
 buildings[buildings.findIndex(b=>b.name===name)]={name,x,y,width:w,height:4,door:{x:x+middle,y:y+3},roof:{red},coolWall};
}
house('Rumah Kebun',85,67,4,true,false);house('Balai Desa',101,66,6,false,true);
house('Rumah Barat',79,77,4,false,false);house('Rumah Timur',109,76,5,true,true);
// Well coordinates unchanged: the western anchor of the plaza, with a walkable apron.
rect(P,88,73,3,6,art(1));stamp(A,88,74,[[48,49,50]]);stamp(O,88,75,[[64,65,66],[80,81,82]]);
stamp(F,88,75,[[44,45,46],[60,61,62]],env);stamp(L('Celebration_Desa_Decor'),88,75,[[86,87,88],[102,103,104]],env);
block('well',88.4,76,2.2,.8);
function rail(x,y,w,gap=-10){for(let dx=0;dx<w;dx++)if(dx!==gap&&dx!==gap+1){put(O,x+dx,y,town(dx===0?80:dx===w-1?82:81));block(`fence_${x}_${y}_${dx}`,x+dx,y+.55,1,.3);}}
function garden(x,y,w,h){rail(x,y,w);rail(x,y+h-1,w,2);for(let dy=1;dy<h-1;dy++)for(let dx=1;dx<w-1;dx++){put(E,x+dx,y+dy,env(3));if(dy%2)put(O,x+dx,y+dy,farm(dy===1?17:30));}for(let dy=1;dy<h-1;dy++)for(const dx of [0,w-1]){put(O,x+dx,y+dy,town(59));block(`garden_${x}_${y}_${dx}_${dy}`,x+dx+.1,y+dy+.4,.25,.6);}}
garden(90,66,8,5);garden(108,65,7,5);
rail(79,75,4,1);rail(109,82,6,2);rail(101,65,6,2);
// Two existing project-made awning kiosks now form one market court beside the well.
for(const [x,y]of [[83,71],[84,77]]){rect(P,x-1,y,5,4,art(2));stamp(A,x,y,[[80,81,82]],env);stamp(O,x,y+1,[[96,97,98],[112,113,114]],env);block(`kiosk_${x}_${y}`,x+.15,y+1.4,2.7,1.5);}
route([[87,73],[87,78],[91,78]],1);
for(const [x,y,id]of [[82,74,76],[83,74,21],[83,82,98],[84,82,99],[86,80,47],[110,72,85]]){put(O,x,y,farm(id));block(`produce_${x}_${y}`,x+.15,y+.4,.7,.55);}
put(O,86,75,town(83));block('market_sign',86.35,75.6,.3,.3);marker('Pasar Tirta • hasil kebun',86,75);
put(O,100,73,town(83));block('village_board',100.35,73.6,.3,.3);marker('Papan Desa • plaza dan sumur',100,73);
function bench(x,y){stamp(O,x,y,[[11,12]]);block(`bench_${x}_${y}`,x+.1,y+.5,1.8,.4);}
bench(92,75);bench(102,75);bench(91,83);bench(102,83);
function tree(x,y){put(A,x,y-1,town(4));put(O,x,y,town(16));block(`tree_${x}_${y}`,x+.3,y+.5,.4,.45);}
for(const p of [[80,68],[90,73],[106,76],[89,83],[107,82]])tree(...p);
// Small planted pockets frame paths instead of filling the festival clearing.
for(const [x,y]of [[90,81],[105,72],[106,72],[106,83],[108,74],[84,69]]){put(E,x,y,art(3));put(O,x,y,farm(40));}
for(const [x,y]of [[90,82],[105,75],[104,73],[85,81]]){
 put(E,x,y,art(3));put(O,x,y,env(30));put(L('Celebration_Desa_Decor'),x,y,env(12));
}
for(const [x,y]of [[93,74],[104,74],[92,82],[104,82]]){
 put(E,x,y,art(3));put(O,x,y,env(30));put(L('Celebration_Desa_Decor'),x,y,env(12));
}
for(const [x,y]of [[91,73],[92,73],[105,84],[106,84],[81,73]])put(O,x,y,town(2));
// Preserve the three existing festival layers/flag, with bunting at the perimeter.
// The original southern bunting at y85 stays outside A1; add only the northern run.
for(const [x,y,w]of [[93,73,12]])for(let dx=0;dx<w;dx++)put(L('Celebration_Desa_Banners'),x+dx,y,old(dx===0?8:dx===w-1?10:9));
for(const [x,y]of [[91,74],[105,74],[91,82],[105,82]])put(L('Celebration_Desa_Decor'),x,y,env(12));
map.tilesets.push({firstgid:883,source:'tilesets/v34_a1_village.tsj'});
map.properties=map.properties.filter(p=>p.name!=='worldVersion');map.properties.push(prop('worldVersion','3.4-A1'));
// Enforce the limited art-pass boundary before any output is written.
for(const oldLayer of previous.layers.filter(l=>l.data)){const next=L(oldLayer.name);for(let i=0;i<oldLayer.data.length;i++)if(!inside(i%W,Math.floor(i/W))&&oldLayer.data[i]!==next.data[i])throw Error(`Scope leak ${oldLayer.name} ${i}`);}
save('world/maps/pulau_tirta_v34_a1.tmj',map);save('world/buildings-v34-a1.json',buildings);
save('world/village-a1.json',{bounds:roi,plazaCamera:[97,76],marketCamera:[86,76],homesCamera:[96,71],routeTargets:[[96,79],[98,79],[91,77],[87,76],[87,71],[104,70],[81,81],[111,80]],well:[89.5,76.5]});
// Local warm cobble placeholder: no new pack or modification of Kenney art.
const shapes=[];const r=(x,y,w,h,c)=>shapes.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`);
for(let id=0;id<6;id++){const x=id*16;r(x,0,16,16,id===2?'#bca17f':id===3||id===5?'#ad9471':id===4?'#c3b99a':'#a5a38a');if(id===3||id===5){r(x+2,4,3,1,'#827f61');r(x+10,11,2,1,'#c5b08a');continue;}for(let row=0;row<3;row++)for(let col=-1;col<3;col++){const dx=col*8+(row%2?4:0);const start=Math.max(0,dx),end=Math.min(16,dx+7);if(end>start)r(x+start,row*5+1,end-start,4,id===2?'#c6ad89':id===4?'#d0c5a5':'#bcb79d');}if(id===1){r(x+2,12,2,2,'#8f9e77');r(x+12,2,2,1,'#9da782');}}
mkdirSync(resolve(root,'world/assets/village_a1'),{recursive:true});writeFileSync(resolve(root,'world/assets/village_a1/tileset.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="32" viewBox="0 0 128 32" shape-rendering="crispEdges">${shapes.join('')}</svg>\n`);
save('world/maps/tilesets/v34_a1_village.tsj',{type:'tileset',version:'1.10',name:'village_a1',tilewidth:16,tileheight:16,tilecount:16,columns:8,margin:0,spacing:0,image:'../../assets/village_a1/tileset.svg',imagewidth:128,imageheight:32});
console.log('Village A1 written; all tiles outside the 38×20 centre rectangle unchanged.');
