/** Curated environment pass. Coordinates below are deliberate compositions, not random scatter.
 * Manual only; dev/build merely export Tiled. V3.1 and its assets remain untouched. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'world/maps/pulau_tirta_v3_2.tmj');
if (existsSync(out) && !process.argv.includes('--force')) throw Error('V3.2 exists. Back up Tiled edits before --force.');
const read = p => JSON.parse(readFileSync(resolve(root, p), 'utf8'));
const save = (p, v) => writeFileSync(resolve(root, p), JSON.stringify(v, null, p.endsWith('.tmj') ? 0 : 2) + '\n');
const map = read('world/maps/pulau_tirta_v3_1.tmj'), W = map.width, H = map.height;
const prop = (name, value) => ({ name, value, type: typeof value === 'number' ? 'float' : typeof value === 'boolean' ? 'bool' : 'string' });
const L = n => map.layers.find(l => l.name === n);
const O=L('Objects'), A=L('AbovePlayer'), P=L('Paths'), D=L('TerrainDetails'), C=L('Collisions');
const originalBridge = P.data.map((gid,i)=>({gid,i})).filter(({gid})=>gid===601||gid===602);
const town=n=>133+n, farm=n=>265+n, old=n=>595+n, art=n=>755+n;
const put=(l,x,y,g)=>{if(x>=0&&x<W&&y>=0&&y<H)l.data[y*W+x]=g;};
const box=(l,x,y,w,h,g)=>{for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)put(l,x+dx,y+dy,g);};
function layer(name,depth,opacity=1){const l={id:map.nextlayerid++,name,type:'tilelayer',width:W,height:H,x:0,y:0,opacity,visible:true,properties:[prop('renderDepth',depth)],data:Array(W*H).fill(0)};map.layers.splice(map.layers.findIndex(l=>l.type==='objectgroup'),0,l);return l;}
const E=layer('Environment_V32',1.5), mist=layer('Mountain_Mist_V32',33,0.5);
function block(name,x,y,w=1,h=1){C.objects.push({id:map.nextobjectid++,name:`v32_${name}`,type:'obstacle',x:x*16,y:y*16,width:w*16,height:h*16,rotation:0,visible:true,properties:[prop('collides',true)]});}
function marker(name,x,y){L('Landmarks').objects.push({id:map.nextobjectid++,name,type:'sign',x:x*16+8,y:y*16+8,width:0,height:0,point:true,rotation:0,visible:true,properties:[prop('label',name),prop('radiusPx',40)]});}
const ellipse=(l,cx,cy,rx,ry,g)=>{for(let y=Math.floor(cy-ry);y<=cy+ry;y++)for(let x=Math.floor(cx-rx);x<=cx+rx;x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)put(l,x,y,g);};
const protectedRoute=new Set();
function route(points,g=art(9),r=1.2){for(let i=1;i<points.length;i++){const [ax,ay]=points[i-1],[bx,by]=points[i],steps=Math.ceil(Math.hypot(bx-ax,by-ay)*3);for(let n=0;n<=steps;n++){const cx=ax+(bx-ax)*n/steps,cy=ay+(by-ay)*n/steps;for(let y=Math.floor(cy-r);y<=cy+r;y++)for(let x=Math.floor(cx-r);x<=cx+r;x++)if(Math.hypot(x-cx,y-cy)<=r){if(![old(6),old(7)].includes(P.data[y*W+x]))put(P,x,y,g);protectedRoute.add(`${x},${y}`);}}}}
function clear(x,y,w,h,{terrain=false}={}){
 for(const l of map.layers.filter(l=>l.type==='tilelayer'&&(terrain||['Objects','AbovePlayer','Facades'].includes(l.name)||l.name.startsWith('Recovery_Plants_')||l.name.startsWith('Recovery_Canopy_'))))box(l,x,y,w,h,0);
 // Ground and water are restored by callers if terrain=true; normally never clear these.
 C.objects=C.objects.filter(o=>!(o.x<x*16+w*16&&o.x+o.width>x*16&&o.y<y*16+h*16&&o.y+o.height>y*16));
}
function stamp(l,x,y,rows,base=art){rows.forEach((row,dy)=>row.forEach((id,dx)=>put(l,x+dx,y+dy,base(id))));}
function pine(x,y,mission){if(protectedRoute.has(`${x},${y}`))throw Error(`tree on path ${x},${y}`);if(mission){put(O,x,y,farm(27));put(L(`Recovery_Plants_${mission}`),x,y,farm(27));}else{put(A,x,y-1,town(4));put(O,x,y,town(16));}block(`tree_${x}_${y}`,x+.3,y+.5,.4,.45);}
function shrub(x,y,g=farm(40)){if(!protectedRoute.has(`${x},${y}`))put(O,x,y,g);}
function rock(x,y,big=false){if(protectedRoute.has(`${x},${y}`))return;if(big){stamp(O,x,y,[[16,17],[32,33]]);block(`boulder_${x}_${y}`,x+.15,y+.7,1.7,1.2);}else{put(O,x,y,farm(77));block(`rock_${x}_${y}`,x+.25,y+.5,.5,.4);}}
function rail(x,y,w,gap=-10){for(let dx=0;dx<w;dx++)if(dx!==gap&&dx!==gap+1){put(O,x+dx,y,town(dx===0?80:dx===w-1?82:81));block(`rail_${x}_${y}_${dx}`,x+dx,y+.55,1,.3);}}
function bench(x,y){stamp(O,x,y,[[11,12]],old);block(`bench_${x}_${y}`,x+.1,y+.5,1.8,.4);}
function sign(label,x,y){put(O,x,y,town(83));block(`sign_${x}_${y}`,x+.35,y+.6,.3,.3);marker(label,x,y);}

// MOUNTAIN: three offset terraces, a single switchback, deliberately open experiment clearing.
clear(29,26,45,38);box(D,29,26,45,38,0);box(P,29,26,45,38,0);
for(const l of map.layers.filter(l=>l.name.startsWith('Recovery_')))box(l,29,26,45,38,0);
ellipse(E,51,57,22,9,art(0));ellipse(E,46,47,17,10,art(1));ellipse(E,60,39,13,10,art(2));
// Front faces stop at traversable connecting ramps; collision follows the visible rock face.
for(const [y,x1,x2,gap1,gap2] of [[61,35,39,-1,-1],[63,40,51,-1,-1],[62,52,62,-1,-1],[55,33,36,-1,-1],[56,43,48,-1,-1],[57,49,55,-1,-1],[55,56,59,-1,-1],[45,50,52,-1,-1],[47,53,58,-1,-1],[48,59,62,-1,-1],[47,68,69,-1,-1],[45,70,71,-1,-1]])for(let x=x1;x<=x2;x++)if(x<gap1||x>gap2){put(O,x,y,art(5));put(O,x,y+1,art(6));block(`cliff_${x}_${y}`,x,y+.2,1,1.7);}
const climb=[[74,61],[68,61],[58,60],[47,59],[39,55],[39,51],[45,49],[55,51],[63,51],[65,47],[65,43],[60,43]];
route(climb,art(9),1.35);route([[45,49],[43,44],[38,42]],art(9),1);route([[60,43],[56,40],[56,36]],art(9),1);
for(const [x,y] of [[39,55],[65,47]])box(P,x-1,y-1,3,3,art(8));
rail(51,33,18);rail(52,44,8,4);rail(68,38,4);bench(35,40);bench(51,35);
sign('Puncak Kabut — jalur pendakian',69,59);sign('Tikungan Batu — pos pengamatan ↑',43,52);sign('Teras Pandang Barat',35,42);
stamp(A,60,38,[[55,56],[71,72]],old);stamp(O,60,40,[[87,88]],old);block('windsock',60.4,40.5,.3,.3);
// Condensation station: low stone table and clear experiment footprint; no new mission mechanic.
stamp(O,57,40,[[36,37]]);block('experiment_table',57.1,40.5,1.8,.4);marker('Pos Pengembunan • area eksperimen',60,43);
for(const [x,y] of [[32,46],[33,48],[30,54],[34,57],[44,36],[46,35],[49,31],[71,32],[72,34],[72,42],[47,54],[54,54],[59,54],[67,54],[71,56],[32,60],[51,39],[52,38],[50,41],[68,40],[70,39],[69,42],[35,49],[34,50],[36,47],[48,53],[49,54],[70,58]])pine(x,y,'Puncak_Kabut',true);
for(const [x,y] of [[36,44],[46,41],[50,38],[68,35],[69,44],[46,54],[56,57],[33,58]])rock(x,y,true);
for(const [x,y] of [[42,57],[44,58],[52,52],[59,49],[62,48],[69,49],[54,34],[66,37]])rock(x,y);
for(const [x,y] of [[35,51],[36,52],[47,44],[48,43],[69,40],[70,41],[48,60],[49,61]])shrub(x,y,art(11));
for(const [x,y] of [[53,40],[54,41],[67,40],[68,43],[34,49],[36,50],[51,57],[52,59],[70,55],[69,56]])shrub(x,y,farm(40));
for(const [x,y] of [[31,36],[45,29],[69,30],[30,50],[71,51]])stamp(mist,x,y,[[24,25,26,27]]);
for(const [x,y] of [[53,37],[54,37],[62,36],[63,36],[44,46],[45,46],[50,58]]){put(O,x,y,art(30));put(L('Recovery_Plants_Puncak_Kabut'),x,y,art(12));put(L('Recovery_Puncak_Kabut'),x,y,art(1));}
for(const [cx,cy,rx,ry] of [[53,37,2.5,1.5],[62,36,2,1.5],[44,46,2,1.5]])ellipse(L('Recovery_Puncak_Kabut'),cx,cy,rx,ry,town(1));
// VILLAGE: preserve seven distinct houses; connect shorter lanes and furnished courtyards.
clear(71,54,52,44);box(P,71,54,52,44,0);box(D,71,54,52,44,0);
for(const l of map.layers.filter(l=>l.name.startsWith('Celebration_')))box(l,71,54,52,44,0);
const buildings=[];
function house(name,x,y,w,red,coolWall=false){const top=red?[52,53,54]:[48,49,50],roof=red?[64,65,66]:[60,61,62],wall=coolWall?[76,77,79]:[72,73,75],m=Math.floor(w/2);for(let dx=0;dx<w;dx++){const e=dx===0?0:dx===w-1?2:1;put(A,x+dx,y,town(top[e]));put(A,x+dx,y+1,town(dx===m?red?67:63:roof[e]));for(let dy=2;dy<4;dy++)put(O,x+dx,y+dy,town(wall[e]));}put(L('Facades'),x+m,y+3,town(coolWall?89:85));put(L('Facades'),x+1,y+2,town(coolWall?88:84));if(w>4)put(L('Facades'),x+w-2,y+2,town(coolWall?90:86));block(name,x+.1,y+2,w-.2,1.9);buildings.push({name,x,y,width:w,height:4,door:{x:x+m,y:y+3},roof:{red},coolWall});}
house('Rumah Kebun',85,67,4,true);house('Balai Desa',101,66,6,false,true);house('Rumah Barat',81,76,4,false);house('Rumah Timur',109,76,5,true,true);house('Rumah Petani',86,87,5,true);house('Rumah Sungai',102,88,4,false);house('Rumah Utara',93,61,4,true,true);
for(const r of [[[70,56],[77,63],[87,72],[93,76]],[[74,61],[77,63]],[[124,57],[118,64],[112,70],[104,72],[100,76]],[[69,95],[77,92],[88,92],[93,85]],[[124,101],[117,94],[104,93],[101,85]],[[83,80],[87,81],[91,80]],[[111,80],[107,81],[104,80]],[[95,65],[95,70],[96,75]],[[87,71],[87,73],[95,73]],[[104,70],[104,73],[100,75]],[[88,91],[88,94],[96,94],[98,86]],[[104,92],[104,94],[98,94]]])route(r,town(43),1.1);
ellipse(P,98,79,8,5,town(43));ellipse(P,98,79,5.5,3,0);ellipse(P,98,79,2,1.5,town(43));
stamp(A,88,74,[[48,49,50]],old);stamp(O,88,75,[[64,65,66],[80,81,82]],old);block('well',88.4,76,2.2,.8);
stamp(L('Facades'),88,75,[[44,45,46],[60,61,62]]);
stamp(L('Celebration_Desa_Decor'),88,75,[[86,87,88],[102,103,104]]);
const well=L('Landmarks').objects.find(o=>o.name==='Sumur Desa');if(well){well.x=89.5*16;well.y=76.5*16;}
for(const [x,y] of [[92,76],[103,78],[94,83],[100,85]])bench(x,y);
sign('Papan Desa • kebun, sumur & plaza',92,72);
function garden(x,y,w,h){rail(x,y,w);rail(x,y+h-1,w,Math.floor(w/2));for(let dy=1;dy<h-1;dy++)for(let dx=1;dx<w-1;dx++){put(E,x+dx,y+dy,art(3));if(dy%2)put(O,x+dx,y+dy,farm([17,30,66][Math.floor(dy/2)%3]));}for(let dy=1;dy<h-1;dy++){put(O,x,y+dy,town(59));put(O,x+w-1,y+dy,town(59));block(`garden_side_${x}_${y}_${dy}`,x,y+dy+.5,.25,.5);block(`garden_side2_${x}_${y}_${dy}`,x+w-.25,y+dy+.5,.25,.5);}}
garden(90,66,8,5);garden(108,65,7,5);garden(76,85,8,7);garden(108,87,7,6);
// Two tiny stalls occupy the western market court, with an open customer lane.
for(const [x,y] of [[79,69],[79,72]]){stamp(A,x,y,[[80,81,82]]);stamp(O,x,y+1,[[96,97,98],[112,113,114]]);block(`stall_${y}`,x+.15,y+1.4,2.7,1.5);}
route([[82,72],[84,73],[88,73]],town(43),.85);sign('Pasar kecil • hasil kebun',83,70);
for(const [x,y] of [[77,65],[82,64],[99,63],[116,72],[117,83],[99,91],[83,84],[91,59],[107,95],[79,82]])pine(x,y);
for(const [x,y] of [[85,72],[86,73],[108,72],[109,73],[86,81],[85,82],[106,83],[107,84],[92,87],[93,88],[99,88]]){shrub(x,y);shrub(x+1,y,art(12));}
for(const [x,y,w] of [[84,65,5],[100,64,7],[80,82,5],[109,82,6],[85,85,6],[101,86,5]])rail(x,y,w,2);
for(const [x,y] of [[90,79],[91,85],[105,75],[106,82]]){put(O,x,y,art(30));put(L('Celebration_Desa_Decor'),x,y,art(12));}
for(const [x,y,w] of [[92,74,12],[92,85,12]])for(let dx=0;dx<w;dx++)put(L('Celebration_Desa_Banners'),x+dx,y,old(dx===0?8:dx===w-1?10:9));
for(const npc of L('NPCSpawns').objects){const x=Math.floor(npc.x/16),y=Math.floor(npc.y/16);if(x>=71&&x<123&&y>=54&&y<98)put(O,x,y,1+(Number(npc.name.slice(-1))%2?120:121));}
// COAST: preserve basins; remove the conifer scatter only from beach and replace with palms/dune groups.
for(let y=88;y<=130;y++)for(let x=22;x<=75;x++){put(A,x,y,0);const g=O.data[y*W+x];if((g>=town(3)&&g<=town(35))||(g>=farm(0)&&g<=farm(71)))put(O,x,y,0);}
C.objects=C.objects.filter(o=>!((o.name.startsWith('tree_')||o.name.startsWith('v31_pine_'))&&o.x/16>=22&&o.x/16<=75&&o.y/16>=87&&o.y/16<=131));
function palm(x,y){stamp(A,x,y-2,[[40,41],[56,57]]);stamp(O,x,y,[[72,73]]);block(`palm_${x}_${y}`,x+.75,y+.2,.35,.7);}
route([[70,95],[66,98],[58,99],[57,104],[57,111],[49,114],[43,119],[36,119]],old(0),1.25);
for(const [x,y] of [[30,101],[32,104],[43,98],[45,99],[69,109],[71,112],[48,118],[51,120],[36,113]])palm(x,y);
for(const [x,y] of [[33,110],[34,111],[47,96],[48,97],[68,115],[69,116],[55,115],[56,116]])shrub(x,y,art(10));
for(const [x,y] of [[36,105],[40,112],[65,112],[29,114]])rock(x,y,true);
// Joined pier stem + crosshead, on existing shallow coast. Bridge property applies only on Paths.
box(P,31,119,12,2,old(6));box(P,30,117,3,6,old(6));rail(30,117,3);rail(31,121,12);box(O,31,118,1,1,farm(85));block('dock_barrel',31.25,118.4,.5,.5);
sign('Dermaga Pantai Biru',39,117);for(const [x,y] of [[45,112],[52,110],[64,110],[36,116]])shrub(x,y,art(15));
// DRY VALLEY: an open basin, broken stone rim, small fixed water pockets and recovery beds.
clear(133,40,27,19);box(D,133,40,27,19,0);box(P,133,40,27,19,0);
box(L('Water'),133,40,27,19,0);
for(const l of map.layers.filter(l=>l.name.startsWith('Recovery_')))box(l,133,40,27,19,0);
ellipse(E,146,49,14,10,art(0));ellipse(E,146,49,11,7,art(3));ellipse(E,146,49,7,4,art(29));
route([[130,57],[136,55],[141,52],[145,48],[142,45],[138,44]],art(9),1.2);route([[145,48],[152,49],[157,53],[161,58]],art(9),1.1);
for(const [x,y] of [[134,43],[138,40],[146,40],[154,42],[158,46],[157,54],[150,56],[136,53]])rock(x,y,true);
for(const [x,y] of [[135,47],[137,48],[152,43],[154,44],[153,54],[145,57]]){shrub(x,y,art(10));put(L('Recovery_Plants_Lembah_Hujan'),x,y,farm(40));}
// Non-walkable puddle borders remain collision-identical before and after recovery.
for(const [cx,cy,rx,ry] of [[148,51,3,2],[139,49,2,1],[152,46,2,1]]){
 box(O,cx-rx,cy-ry,rx*2+1,ry*2+1,art(38));box(O,cx-rx+1,cy-ry+1,rx*2-1,Math.max(1,ry*2-1),art(29));
 box(L('Recovery_Plants_Lembah_Hujan'),cx-rx+1,cy-ry+1,rx*2-1,Math.max(1,ry*2-1),art(28));
 block(`basin_${cx}_${cy}`,cx-rx,cy-ry,rx*2+1,ry*2+1);put(O,cx,cy,art(28));
}
for(const [x,y] of [[142,50],[143,50],[144,51],[145,53],[147,54]])put(L('Recovery_Lembah_Hujan'),x,y,art(4));
sign('Cekungan Hujan • area eksperimen',137,45);bench(154,48);
// FOREST: arranged groves around a winding woodland loop and the existing bridge. No river geometry changes.
clear(136,101,18,15);box(P,136,101,18,15,0);
route([[129,101],[136,103],[141,106],[141,110],[145,113],[150,112],[153,108],[158,106],[165,110]],art(9),1.25);
route([[141,106],[146,104],[150,105],[153,108]],art(9),1);
for(const [x,y] of [[136,105],[137,106],[136,109],[138,111],[140,113],[143,101],[145,101],[147,102],[150,101],[152,102],[154,111],[153,113],[149,115],[146,116]])pine(x,y,'Hutan_Sungai');
for(const [x,y] of [[138,104],[139,104],[144,114],[145,115],[151,103],[152,104],[155,114]])shrub(x,y,farm(41));
ellipse(E,146,108,3,2,art(3));for(const [x,y] of [[145,107],[147,107],[145,109],[147,109]]){put(O,x,y,farm(4));put(L('Recovery_Plants_Hutan_Sungai'),x,y,farm(54));}
for(const [x,y] of [[138,108],[151,110]])rock(x,y,true);
sign('Bibit pemulihan hutan',144,105);marker('Sumbatan sungai • kayu hanyut',156,103);
for(const [x,y] of [[156,102],[157,102],[156,103]])put(O,x,y,town(106));
// Recovery replaces dry debris visually with reeds, while collision stays stable and the bridge remains open.
for(const [x,y] of [[156,102],[157,102],[156,103]])put(L('Recovery_Plants_Hutan_Sungai'),x,y,art(10));

// Clearing the forest composition must also preserve the west bridge abutment at x153.
for(const {gid,i} of originalBridge) P.data[i]=gid;
map.tilesets.push({firstgid:755,source:'tilesets/v32_environment.tsj'});
map.properties=map.properties.filter(p=>p.name!=='worldVersion');map.properties.push(prop('worldVersion','3.2'));
save('world/maps/pulau_tirta_v3_2.tmj',map);save('world/buildings-v32.json',buildings);
save('world/environment-v32.json',{mountainRoute:climb,viewpoints:[[38,42],[56,36],[60,43]],villageDoors:buildings.map(b=>[b.door.x,b.door.y+1]),exploration:[[36,119],[138,44],[145,48],[141,110],[165,110]]});

// Compact local pixel-grid atlas. Flat 16px geometry keeps the same scale as the Kenney packs.
const parts=[];const rect=(x,y,w,h,c)=>parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`);
const tile=(id,fn)=>fn((id%16)*16,Math.floor(id/16)*16);
for(const [id,color,light,dark] of [[0,'#c9bc99','#ddd0aa','#b1a689'],[1,'#a8b09a','#c2c7ab','#8f9985'],[2,'#b9bca7','#d4d4bd','#939e92'],[3,'#b99a77','#cfb18b','#9d806a'],[4,'#9da77b','#b8c08b','#7c8d69'],[9,'#d6bd91','#ead1a0','#bea982'],[29,'#b79b7d','#c8ad8d','#8e7765']])tile(id,(x,y)=>{rect(x,y,16,16,color);for(const [dx,dy]of [[2,3],[11,6],[6,12]]){rect(x+dx,y+dy,2,1,dark);rect(x+dx,y+dy-1,1,1,light);}if(id===29){rect(x+8,y+2,1,5,dark);rect(x+6,y+7,3,1,dark);rect(x+6,y+8,1,4,dark);}});
for(const id of [5,6])tile(id,(x,y)=>{rect(x,y,16,16,'#777e78');rect(x,y,16,id===5?3:1,'#c3c6ad');rect(x,y+3,16,10,'#969e8d');rect(x+2,y+5,5,1,'#afb5a0');rect(x+11,y+3,1,7,'#737e73');rect(x,y+14,16,2,'#586a60');});
tile(8,(x,y)=>{rect(x,y,16,16,'#b9bca7');for(let dy=1;dy<16;dy+=4){rect(x,y+dy,16,1,'#e0d6b8');rect(x,y+dy+1,16,1,'#8f9985');}});
for(const [id,color]of [[10,'#8c9b65'],[11,'#899e84'],[12,'#edd582'],[30,'#a08964']])tile(id,(x,y)=>{rect(x+7,y+6,2,8,id===30?'#927b61':'#60836a');rect(x+3,y+9,4,2,color);rect(x+9,y+7,4,2,color);if(id===12){rect(x+5,y+3,6,4,'#f0e2ab');rect(x+7,y+4,2,2,'#d89b64');}});
tile(15,(x,y)=>{rect(x+5,y+10,6,3,'#f1e3c0');rect(x+6,y+9,4,1,'#fff0d6');rect(x+8,y+10,1,2,'#c7ad8d');});
// Boulder, 2×2: upper light plane and lower mossy shadow.
{const x=0,y=16;parts.push(`<path d="M4 43V35H7V29H11V24H19V26H24V30H27V36H30V42H27V46H8V43Z" fill="#485d60"/><path d="M5 39V35H9V29H12V26H18V28H23V32H26V39H23V42H10V40Z" fill="#a6b1a4"/><path d="M12 27H18V29H22V32H18V34H11V32H9V30H12Z" fill="#ced0b9"/><path d="M22 33H26V40H23V43H14V40H19V38H22Z" fill="#7f9189"/>`);rect(x+8,y+28,18,2,'#657f69');}
// Thin clouds have baked low alpha, plus layer opacity 0.5; no particles or full-screen filter.
for(let id=24;id<=27;id++)tile(id,(x,y)=>{rect(x,y+6,16,4,'#e4eddf50');rect(x+2,y+4,12,3,'#e4eddf30');rect(x+3,y+10,11,2,'#e4eddf20');});
tile(28,(x,y)=>{rect(x,y,16,16,'#80c4c8');rect(x+2,y+5,5,1,'#c4e4da');rect(x+9,y+11,5,1,'#c4e4da');});
tile(38,(x,y)=>{rect(x,y,16,16,'#b99a77');for(const [dx,dy,w]of [[2,3,5],[10,8,4],[3,12,6]]){rect(x+dx,y+dy,w,3,'#797f72');rect(x+dx,y+dy,w-1,1,'#b9baa1');}});
// Only the well interior: dry initially, shallow water after the existing festival flag.
rect(207,46,18,3,'#6c5548');rect(208,47,5,1,'#a58b67');
rect(111,94,18,3,'#59bfd7');rect(112,94,7,1,'#b4e2df');
// Low stone experiment table, 2×1.
for(const id of [36,37])tile(id,(x,y)=>{rect(x+1,y+5,14,6,'#4e6568');rect(x+2,y+3,12,5,'#c2c8b7');rect(x+3,y+11,3,4,'#7d8b81');rect(x+10,y+11,3,4,'#7d8b81');if(id===36){rect(x+5,y+1,5,3,'#b5e0dc');rect(x+6,y,3,1,'#eff2d8');}});
// Palm 2×3; kept off mountain and village, coastal silhouette rather than conifers.
{const x=128,y=32;rect(x+15,y+16,3,30,'#6c5144');rect(x+16,y+17,2,28,'#c39464');for(let dy=22;dy<44;dy+=6)rect(x+16,y+dy,2,1,'#94724e');for(const [dx,dy,w,h]of [[3,7,12,4],[17,7,12,4],[8,3,15,3],[1,11,10,4],[22,11,9,4],[6,16,8,4],[20,16,7,4],[13,9,7,9]])rect(x+dx,y+dy,w,h,'#486b54');for(const [dx,dy,w,h]of [[4,8,11,2],[18,8,10,2],[9,4,13,2],[2,12,8,2],[23,12,7,2],[7,17,6,2],[21,17,5,2]])rect(x+dx,y+dy,w,h,'#82ad67');rect(x+14,y+15,6,4,'#9b754c');}
// Small produce kiosk 3×3. Canvas awning, wooden counter, sacks; no modern building.
{const x=0,y=80;rect(x+3,y+3,42,11,'#5e4a44');for(let dx=4;dx<44;dx+=8){rect(x+dx,y+4,7,8,dx%16===4?'#cc795c':'#eed29d');rect(x+dx,y+12,7,3,dx%16===4?'#af6250':'#d1b481');}rect(x+5,y+15,3,27,'#805b46');rect(x+40,y+15,3,27,'#805b46');rect(x+4,y+31,40,12,'#664b40');rect(x+5,y+30,38,4,'#c39564');for(const [dx,c]of [[11,'#8ab16a'],[21,'#d89b52'],[31,'#bd7055']]){rect(x+dx,y+25,6,5,c);rect(x+dx+1,y+24,4,1,'#a4bb70');}for(const dx of [11,23,35])rect(x+dx,y+35,1,7,'#a57d55');}
mkdirSync(resolve(root,'world/assets/tirta_environment'),{recursive:true});
writeFileSync(resolve(root,'world/assets/tirta_environment/tileset.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="128" viewBox="0 0 256 128" shape-rendering="crispEdges">${parts.join('')}</svg>\n`);
save('world/maps/tilesets/v32_environment.tsj',{type:'tileset',version:'1.10',tiledversion:'1.11.2',name:'tirta_environment',tilewidth:16,tileheight:16,tilecount:128,columns:16,margin:0,spacing:0,image:'../../assets/tirta_environment/tileset.svg',imagewidth:256,imageheight:128});
console.log('V3.2 curated environment written. V3.1 unchanged. Run world:export.');
