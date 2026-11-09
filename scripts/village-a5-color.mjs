/** Color-only finish. Explicit garden/meadow groups; no random scatter or gameplay edits. */
export function colorAtlasSvg(){
 const rect=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
 let art='';
 const colors=[['#e7b94e','#ffdf91'],['#d5d4b8','#fff2d9'],['#c8758b','#e9a2b2'],['#8a6da5','#baa0d0']];
 function flower(frame,palette,heads){const ox=frame%16*16,oy=Math.floor(frame/16)*16;for(const[x,y]of heads){art+=rect(ox+x,oy+y+2,1,5,'#47794c')+rect(ox+x-2,oy+y+4,2,1,'#5b944f')+rect(ox+x+1,oy+y+5,2,1,'#699e55');art+=rect(ox+x-2,oy+y,5,2,palette[0])+rect(ox+x-1,oy+y-1,3,4,palette[0])+rect(ox+x-1,oy+y,3,1,palette[1])+rect(ox+x,oy+y+1,1,1,'#c79248');}}
 flower(64,colors[0],[[5,4],[11,7]]);flower(65,colors[1],[[4,7],[10,4]]);flower(66,colors[2],[[5,5],[11,6]]);flower(67,colors[3],[[4,7],[9,4],[12,8]]);flower(70,['#b95f65','#df8b80'],[[4,5],[11,7]]);
 flower(72,colors[1],[[7,6]]);flower(73,colors[0],[[5,7]]);
 for(const[frame,color,highlight]of[[68,'#64984f','#9abc65'],[69,'#4f834e','#7ea75a'],[71,'#728e48','#b5b56a']]){const ox=frame%16*16,oy=Math.floor(frame/16)*16;for(const[x,y]of[[3,11],[8,9],[12,12]])art+=rect(ox+x,oy+y-3,1,5,color)+rect(ox+x-1,oy+y-4,1,2,highlight)+rect(ox+x+1,oy+y-2,1,3,highlight);}
 // Two connected grass families plus the unchanged native #84c669. Broad patches, no grain/noise.
 for(let family=0;family<2;family++)for(let mask=0;mask<16;mask++){
  const frame=96+family*16+mask,ox=frame%16*16,oy=Math.floor(frame/16)*16,color=family?'#95c879':'#71ad61';
  art+=rect(ox,oy,16,16,'#84c669');
  for(let y=0;y<16;y++){
   const left=mask&8?0:(y<4?4:y<12?2:3),right=mask&2?16:(y<3?12:y<11?14:13);
   const top=mask&1?0:2,bottom=mask&4?16:14;
   if(y>=top&&y<bottom)art+=rect(ox+left,oy+y,right-left,1,color);
  }
 }
 return art;
}

export function finishVillageColor(map,houses){
 const L=n=>map.layers.find(l=>l.name===n),G=L('Ground'),D=L('TerrainDetails'),P=L('Paths'),O=L('Objects'),A=L('AbovePlayer'),E=L('Environment_V32'),F=L('Facades');
 const regions=L('Regions').objects,desa=regions.find(o=>o.name==='Desa Tirta'),colliders=L('Collisions').objects;
 const contains=(o,x,y)=>x>=o.x&&x<o.x+o.width&&y>=o.y&&y<o.y+o.height;
 const inside=(x,y)=>contains(desa,x*16+8,y*16+8)&&!regions.some(o=>o!==desa&&contains(o,x*16+8,y*16+8));
 const house=(x,y)=>houses.some(b=>x>=b.x&&x<b.x+b.width&&y>=b.y&&y<b.y+4);
 const grass=(x,y)=>inside(x,y)&&!house(x,y)&&G.data[y*192+x]===133&&!P.data[y*192+x]&&!L('Water').data[y*192+x]&&!E.data[y*192+x];
 const patches=[
  {tone:0,lobes:[[101,58,5,3],[104,59,3,2]]},{tone:0,lobes:[[108,62,4,3]]},
  {tone:0,lobes:[[82,69,4,3],[80,70,2,2]]},{tone:0,lobes:[[90,73,3,3]]},
  {tone:0,lobes:[[92,90,3,3],[95,90,2,2]]},{tone:0,lobes:[[99,89,3,3]]},
  {tone:0,lobes:[[93,95,4,2]]},{tone:0,lobes:[[118,87,2,3]]},{tone:0,lobes:[[116,96,3,2]]},
  {tone:1,lobes:[[88,61,4,3],[86,63,2,2]]},{tone:1,lobes:[[93,68,5,3]]},
  {tone:1,lobes:[[111,67,5,3]]},{tone:1,lobes:[[116,75,3,3],[117,78,2,2]]},
  {tone:1,lobes:[[79,87,3,3]]},{tone:1,lobes:[[80,93,4,3]]},{tone:1,lobes:[[111,90,5,4]]},
  {tone:1,lobes:[[84,78,2,3]]},
 ];
 const tint=new Map();
 for(const patch of patches)for(const[cx,cy,rx,ry]of patch.lobes)for(let y=Math.floor(cy-ry);y<=cy+ry;y++)for(let x=Math.floor(cx-rx);x<=cx+rx;x++)if(grass(x,y)&&((x-cx)/rx)**2+((y-cy)/ry)**2<=1)tint.set(y*192+x,patch.tone);
 for(const[i,tone]of tint){const x=i%192,y=Math.floor(i/192);let mask=0;for(const[dx,dy,b]of[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]])if(tint.get((y+dy)*192+x+dx)===tone)mask|=b;G.data[i]=915+96+tone*16+mask;}
 const lanes=L('NPCSpawns').objects.flatMap(m=>{const p=m.properties.find(p=>p.name==='villageActivity');if(!p)return[];const a=JSON.parse(p.value).tiles;return a.map((p,i)=>[p,a[Math.min(i+1,a.length-1)]]);});
 function segmentDistance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);}
 const clear=(x,y)=>{
  const i=y*192+x;if(!inside(x,y)||house(x,y)||P.data[i]||O.data[i]||A.data[i]||E.data[i]||F.data[i]||D.data[i]||L('Water').data[i])return false;
  if(colliders.some(o=>o.x<(x+1)*16&&o.x+o.width>x*16&&o.y<(y+1)*16&&o.y+o.height>y*16))return false;
  if(L('Interactions').objects.some(o=>Math.hypot(x*16+8-(o.x+8),y*16+8-(o.y+8))<Number(o.properties.find(p=>p.name==='radiusPx').value)+22))return false;
  return !lanes.some(([a,b])=>segmentDistance(x,y,a,b)<.9);
 };
 const groups=[
  ['taman-utara', [64,65,67],[[90,57],[91,57],[92,58],[94,57],[93,58],[95,58],[96,59],[97,58]]],
  ['halaman-utara', [65,66,67],[[98,58],[99,58],[99,59],[100,59],[102,59],[104,61],[105,61],[105,62]]],
  ['kebun-rumah', [64,70,65],[[85,60],[86,60],[86,61],[87,64],[88,64],[89,64],[84,66],[84,67],[84,68]]],
  ['taman-balai', [66,67,65],[[106,63],[106,64],[108,64],[109,64],[110,64],[110,63],[111,63],[112,64]]],
  ['tepi-pasar', [64,70,66],[[78,70],[79,69],[78,69],[77,70],[86,75],[88,75],[89,75],[88,76],[88,77],[89,77]]],
  ['plaza-utara', [64,65,67],[[91,72],[92,72],[92,73],[93,73],[96,73],[97,73],[98,73],[102,75],[102,76]]],
  ['rumah-barat', [70,66,65],[[77,78],[78,78],[77,79],[78,80],[83,77],[84,77],[85,77],[86,78],[85,80],[85,82],[84,82]]],
  ['herbal-timur', [67,65,66],[[113,72],[114,72],[115,72],[117,72],[118,72],[115,78],[117,78],[118,78],[119,79]]],
  ['keluarga-timur', [64,66,65],[[113,78],[114,78],[114,79],[115,79],[116,81],[116,83],[117,83],[118,85],[119,85]]],
  ['halaman-petani', [64,65,70],[[85,86],[86,86],[85,87],[85,88],[91,87],[93,87],[94,87],[95,87],[91,91]]],
  ['komunal-selatan', [65,66,67],[[96,88],[97,88],[97,89],[100,89],[101,89],[100,90],[101,90],[96,93],[97,93],[98,93]]],
  ['tepi-nursery', [64,67,65],[[76,85],[76,86],[76,87],[76,91],[76,92],[76,93],[84,90],[85,91],[87,93],[88,94],[87,94]]],
  ['kebun-keluarga', [64,70,66],[[107,89],[107,90],[107,91],[107,92],[108,94],[109,94],[112,95],[113,95],[114,95],[115,93]]],
  ['padang-selatan', [65,67],[[95,94],[96,94],[95,95],[98,96],[99,96],[100,96],[101,95]]],
  ['rumput-tepi', [68,69,71],[[83,60],[84,60],[82,61],[103,58],[104,58],[105,59],[109,62],[110,62],[111,62],[87,82],[88,82],[86,83],[102,85],[103,85],[102,86],[105,88],[105,89],[116,85],[116,86],[117,86],[92,94],[94,94],[94,95]]],
 ];
 const planted=[];
 for(const[name,frames,cells]of groups){let n=0;const placed=[];for(const[x,y]of cells)if(clear(x,y)){
  // Neighbouring plants share a dominant hue; sparse edges carry a single bloom.
  const flowerGroup=frames[0]<68,frame=flowerGroup&&(n===0||n===cells.length-1)?(frames.includes(65)?72:73):frames[Math.floor(n/2)%frames.length];n++;
  D.data[y*192+x]=915+frame;placed.push({x,y,frame});
 }planted.push({name,placed});}
 return{palette:{base:'#84c669',shade:'#71ad61',garden:'#95c879',flowers:['yellow','white','pink','purple','red']},patches,planted};
}
