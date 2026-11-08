/** A1.1 follows world/VILLAGE_A11_LAYOUT.md. Explicit compositions; never random fill. */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const save=(p,v)=>writeFileSync(resolve(root,p),JSON.stringify(v,null,p.endsWith('.tmj')?0:2)+'\n');
const output='world/maps/pulau_tirta_v34_a11.tmj';
if(existsSync(resolve(root,output))&&!process.argv.includes('--force'))throw Error('A1.1 exists; preserve artist edits before --force.');
const map=read('world/maps/pulau_tirta_v34_a1.tmj'),before=structuredClone(map),W=map.width;
const bounds={x:79,y:71,width:29,height:14},inside=(x,y)=>x>=79&&x<108&&y>=71&&y<85;
const L=n=>map.layers.find(l=>l.name===n),O=L('Objects'),A=L('AbovePlayer'),F=L('Facades'),P=L('Paths'),E=L('Environment_V32'),C=L('Collisions');
const town=n=>133+n,farm=n=>265+n,props=n=>595+n,env=n=>755+n,stone=n=>883+n;
const prop=(name,value)=>({name,value,type:typeof value==='boolean'?'bool':typeof value==='number'?'float':'string'});
const put=(l,x,y,g)=>{if(!inside(x,y))throw Error(`Outside A1.1: ${x},${y}`);l.data[y*W+x]=g;};
const rect=(l,x,y,w,h,g)=>{for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)put(l,x+dx,y+dy,g);};
const stamp=(l,x,y,rows,base=props)=>rows.forEach((row,dy)=>row.forEach((f,dx)=>put(l,x+dx,y+dy,base(f))));
// The western house is already well-formed. Keep every roof/wall/facade pixel intact.
const house=(x,y)=>x>=79&&x<=82&&y>=77&&y<=80;
for(const name of ['Objects','AbovePlayer','Facades','TerrainDetails','Paths','Environment_V32','Celebration_Desa_Terrain','Celebration_Desa_Decor','Celebration_Desa_Banners']){
 const l=L(name);for(let y=71;y<85;y++)for(let x=79;x<108;x++)if(!(['Objects','AbovePlayer','Facades'].includes(name)&&house(x,y)))put(l,x,y,0);
}
const overlaps=o=>o.x<108*16&&o.x+o.width>79*16&&o.y<85*16&&o.y+o.height>71*16;
for(const o of C.objects.filter(overlaps))if(o.x<79*16||o.y<71*16||o.x+o.width>108*16||o.y+o.height>85*16)throw Error(`Cross-boundary collider ${o.name}`);
C.objects=C.objects.filter(o=>!overlaps(o)||o.name==='a1_Rumah Barat');
L('Landmarks').objects=L('Landmarks').objects.filter(o=>!inside(Math.floor(o.x/16),Math.floor(o.y/16)));
function block(name,x,y,w,h){C.objects.push({id:map.nextobjectid++,name:`a11_${name}`,type:'obstacle',x:x*16,y:y*16,width:w*16,height:h*16,rotation:0,visible:true,properties:[prop('collides',true)]});}
function marker(name,x,y,radius=36){L('Landmarks').objects.push({id:map.nextobjectid++,name,type:'sign',x:x*16,y:y*16,width:0,height:0,point:true,visible:true,rotation:0,properties:[prop('label',name),prop('radiusPx',radius)]});}
function route(points,r=.72,gid=stone(0)){
 for(let i=1;i<points.length;i++){
  const[a,b]=[points[i-1],points[i]],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*4));
  for(let n=0;n<=steps;n++){const cx=a[0]+(b[0]-a[0])*n/steps,cy=a[1]+(b[1]-a[1])*n/steps;
   for(let y=Math.floor(cy-r);y<=cy+r;y++)for(let x=Math.floor(cx-r);x<=cx+r;x++)if(inside(x,y)&&!house(x,y)&&Math.hypot(x-cx,y-cy)<=r)put(P,x,y,gid);
  }
 }
}
// Structure first: narrow links, a compact festival court, and a separate well apron.
for(const path of [ [[87,70],[87,71],[91,71],[96,72],[98,74],[97,77]], [[99,70],[99,74],[97,77]], [[104,70],[104,72],[101,74],[100,77]], [[81,81],[85,81],[88,80],[92,80],[95,80]], [[108,80],[104,80],[102,80]], [[98,85],[98,82]], [[104,85],[103,83],[101,81]], [[79,84],[86,84],[88,82]], [[87,74],[87,78],[91,78]], [[86,75],[87,76],[90,77],[91,77]] ])route(path);
for(const[y,left,right]of[[77,96,100],[78,95,101],[79,95,102],[80,95,101],[81,96,101],[82,97,100]])for(let x=left;x<=right;x++)put(P,x,y,stone(x===left||x===right?1:0));
rect(P,97,78,4,3,stone(4));
for(let y=75;y<=78;y++)for(let x=91;x<=95;x++)if(!(x===91&&y===75)&&!(x===95&&y===78))put(P,x,y,stone(1));
// Story landmark moves 4 tiles toward the village heart; mission/spawn objects do not move.
stamp(A,92,74,[[48,49,50]]);stamp(O,92,75,[[64,65,66],[80,81,82]]);
stamp(F,92,75,[[44,45,46],[60,61,62]],env);stamp(L('Celebration_Desa_Decor'),92,75,[[86,87,88],[102,103,104]],env);
block('well',92.4,76,2.2,.8);marker('Sumur Desa',93.5,76.5,44);
// Two adjoining kiosks share one south-facing customer court and stock display.
rect(P,79,71,7,6,stone(2));
for(const x of [80,83]){stamp(A,x,71,[[80,81,82]],env);stamp(O,x,72,[[96,97,98],[112,113,114]],env);block(`kiosk_${x}`,x+.15,72.4,2.7,1.5);}
for(const[x,y,id]of[[79,74,76],[79,75,85],[80,75,98],[81,75,99],[85,76,47]]){put(O,x,y,farm(id));block(`stock_${x}_${y}`,x+.15,y+.4,.7,.55);}
put(O,86,75,town(83));block('market_board',86.35,75.6,.3,.3);marker('Pasar Tirta • hasil kebun',86.5,75.5,32);
put(O,103,74,town(83));block('village_board',103.35,74.6,.3,.3);marker('Papan Desa • sumur dan plaza',103.5,74.5,32);
// Asymmetric edge rooms. The centre and all NPC waypoints remain free of props.
function bench(x,y){stamp(O,x,y,[[11,12]]);block(`bench_${x}_${y}`,x+.1,y+.5,1.8,.4);}
bench(94,73);bench(90,81);bench(102,81);
function tree(x,y){put(A,x,y-1,town(4));put(O,x,y,town(16));block(`tree_${x}_${y}`,x+.3,y+.5,.4,.45);}
tree(90,73);tree(89,83);tree(106,76);
for(const[x,y]of[[89,82],[91,82],[104,77],[105,78],[104,79],[107,77]]){put(O,x,y,farm(40));}
for(const[x,y]of[[90,82],[105,75],[92,82],[105,77],[104,78]]){
 put(E,x,y,stone(3));put(O,x,y,env(30));put(L('Celebration_Desa_Decor'),x,y,env(12));
}
for(const[x,y]of[[89,81],[104,76],[105,79],[88,83]])put(O,x,y,town(2));
// Entry bunting stays north of the gathering floor and the fixed review/player position.
for(let dx=0;dx<7;dx++)put(L('Celebration_Desa_Banners'),96+dx,74,props(dx===0?8:dx===6?10:9));
for(const[x,y]of[[95,78],[101,78],[96,81],[101,81]])put(L('Celebration_Desa_Decor'),x,y,env(12));
map.properties=map.properties.filter(p=>p.name!=='worldVersion');map.properties.push(prop('worldVersion','3.4-A1.1'));
for(const layer of before.layers.filter(l=>l.data))for(let i=0;i<layer.data.length;i++)if(!inside(i%W,Math.floor(i/W))&&layer.data[i]!==L(layer.name).data[i])throw Error(`Scope leak ${layer.name}:${i}`);
const count=m=>m.layers.find(l=>l.name==='Paths').data.filter((g,i)=>g&&inside(i%W,Math.floor(i/W))).length;
const metrics={beforePaved:count(before),afterPaved:count(map)};
save(output,map);save('world/village-a11.json',{bounds,well:{old:[89.5,76.5],current:[93.5,76.5]},plazaCamera:[97,76],zoomOutCamera:[93,76],marketCamera:[84,74],routeTargets:[[96,79],[98,79],[91,77],[87,76],[87,71],[104,70],[81,81],[111,80]],metrics});
console.log(JSON.stringify({scope:bounds,...metrics,assetsAdded:0,housesMoved:0,npcWaypointsChanged:0}));
