/** Hand-composed rainfall basin. Local integer-pixel art, no external images or procedural scatter. */
export const VALLEY_FIRST=2451,VALLEY_COLS=48,VALLEY_SIZE={width:768,height:768};
export const PATCH={x:128,y:32,width:42,height:32};
export const VALLEY={terrain:0,mainDry:1536,leftDry:1544,upperDry:1550,treeDry:1556,tree2Dry:1560,
 boulder:1568,boulderMoss:1570,bench:1574,sign:1576,shrubDry:1580,reedsDry:1582,
 mainWet:1776,leftWet:1784,upperWet:1790,treeWet:1796,tree2Wet:1800,shrubWet:1820,reedsWet:1822,
 stones:2036,tuftDry:2038,tuftWet:2039,white:2040,purple:2041,yellow:2042,
 mud:2064,green:2080,trickle:2112,trail:2128,gravel:2160};
export const BASINS=[
 {id:'main',x:145,y:49,width:7,height:5,dry:VALLEY.mainDry,wet:VALLEY.mainWet,waterCenter:[56,40]},
 {id:'west',x:137,y:48,width:5,height:3,dry:VALLEY.leftDry,wet:VALLEY.leftWet,waterCenter:[40,24]},
 {id:'north',x:150,y:45,width:5,height:3,dry:VALLEY.upperDry,wet:VALLEY.upperWet,waterCenter:[40,24]}
];
export const SHAPES={
 rim:[[134,34],[141,33],[148,34],[152,35],[160,34],[165,38],[168,42],[166,46],[169,51],[166,57],[162,60],[157,61],[153,63.5],[145,63],[140,61],[134,61],[130,57],[129,52],[131,47],[129,43],[132,38]],
 slope:[[136,38],[141,36],[149,37],[154,38],[160,38],[163,41],[164,45],[163,49],[165,53],[162,57],[157,59],[150,60],[144,59],[138,59],[134,56],[133,52],[134,48],[132,45],[134,41]],
 floor:[[140,42],[145,40],[151,41],[156,43],[160,46],[159,49],[162,53],[159,57],[154,58],[151,57],[147,59],[143,57],[138,56],[136,53],[137,50],[135,47],[137,44]],
 lowBed:[[144,46],[149,44],[153,45],[155,48],[154,51],[157,54],[152,56],[147,55],[143,56],[139,53],[140,50],[141,48]]
};
// Existing trail crosses these shallow drainage lines; the trail remains a dry visual crossing.
export const CHANNELS=[[[155,42],[153,43],[152,44],[152,45]],[[152,47],[152,48],[151,48],[150,49]],[[141,49],[142,49],[142,50],[143,50],[144,50],[145,50]],[[141,41],[141,43],[142,44],[144,45],[145,47],[146,48],[147,49]]];
export function insidePolygon(points,x,y){let c=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const[a,b]=points[i],[d,e]=points[j];if((b>y)!==(e>y)&&x<(d-a)*(y-b)/(e-b)+a)c=!c;}return c;}
export function valleySvg(){
 const r=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`,p=(d,c)=>`<path d="${d}" fill="${c}"/>`;
 const line=(pts,c,w=1)=>`<path d="M${pts.map(v=>v.join(' ')).join('L')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="miter"/>`;
 const tile=(f,b)=>`<g transform="translate(${f%48*16} ${Math.floor(f/48)*16})">${b}</g>`,local=pts=>pts.map(([x,y])=>[Math.round((x-128)*16),Math.round((y-32)*16)]),polygon=(pts,c)=>p('M'+pts.map(v=>v.join(' ')).join('L')+'z',c);
 const ink='#59665e',stone='#a6aca0',light='#d0cfb4',wood='#a27d59';let art='';
 // PASS 1: asymmetric nested landforms, from vegetated rim through shaded shelves to the dry lakebed.
 let terrain=polygon(local(SHAPES.rim),'#9bac86');
 terrain+=polygon(local([[134,35],[140,34],[145,36],[141,39],[135,42],[131,44],[132,39]]),'#88a17e');
 terrain+=polygon(local([[162,39],[166,42],[164,47],[166,51],[164,56],[161,57],[159,53],[162,49]]),'#859b7e');
 const slope=local(SHAPES.slope);terrain+=polygon(slope,'#747f72');
 terrain+=line([...slope,slope[0]],'#c5c5a1',3);
 // Rock strata sit inside the shelf and are covered by the lower surface; they never become a new wall.
 for(const pts of [[[135,41],[136,42],[135,44]],[[140,37],[141,39],[140,40]],[[149,38],[148,39],[150,41]],[[159,39],[157,41],[159,42]],[[163,45],[161,46],[162,48]],[[163,53],[160,54],[161,56]],[[153,59],[152,57],[150,58]],[[138,58],[139,56],[137,55]]])terrain+=line(local(pts),'#536b67',3);
 const inset=slope.map(([x,y])=>[Math.round((x-304)*.95+304+2),Math.round((y-272)*.92+272+5)]);
 terrain+=polygon(inset,'#b9a886');
 terrain+=polygon(local(SHAPES.floor),'#d2b88e');
 const floor=local(SHAPES.floor).map(([x,y])=>[Math.round((x-320)*.97+320+2),Math.round((y-272)*.96+272+4)]);
 terrain+=polygon(floor,'#e0c99f');terrain+=polygon(local(SHAPES.lowBed),'#dcc59c');
 // Broad limestone/silt bars articulate the basin without repeating crack tiles.
 for(const[pts,c]of[
  [[[142,42],[145,41],[149,42],[146,43],[143,44]],'#d9caa5'],
  [[[155,44],[158,46],[157,48],[155,47]],'#c8b799'],
  [[[145,55],[149,56],[152,55],[155,56],[151,57],[147,58]],'#cbb88f'],
  [[[134,48],[136,47],[138,45],[137,48],[136,51]],'#c3b795']])terrain+=polygon(local(pts),c);
 for(const points of CHANNELS){const pts=local(points.map(([x,y])=>[x+.5,y+.5]));terrain+=line(pts,'#b29f7f',7)+line(pts,'#c4ae88',3);}
 // Authored branching cracks, each with a different silhouette and scale.
 for(const pts of [[[143,46],[144,47],[144,48],[143,48.5]],[[145,42],[146,43],[147,43],[147,44]],[[146,43],[145.5,44]],[[156,50],[157,51],[156.5,52],[158,53]],[[157,51],[158,50.5]],[[141,54],[142,53.5],[143,54],[143.5,55]],[[143,54],[144,53]],[[149,55],[149.5,56],[148.5,57]],[[152,42],[153,42.5],[153,43.5]],[[137,47],[138,47.5],[138.5,47]],[[154,56],[155,56.5],[156,56]]])terrain+=line(local(pts),'#a79176',1);
 art+=`<g>${terrain}</g>`;
 // PASS 2: three basins use different shores inside their unchanged rectangular collider envelopes.
 for(const basin of BASINS)for(const wet of [false,true]){
  const w=basin.width*16,h=basin.height*16,cx=basin.waterCenter[0],cy=basin.waterCenter[1];let b=r(0,0,w,h,'#dcc59c');
  const rim=basin.id==='main'?[[8,19],[21,8],[43,5],[61,10],[80,6],[99,17],[108,33],[101,49],[105,60],[85,73],[66,69],[46,76],[27,67],[9,55],[4,38]]:basin.id==='west'?[[4,16],[15,6],[35,4],[49,10],[65,5],[77,19],[70,34],[55,44],[35,40],[18,45],[5,32]]:[[8,10],[26,5],[43,9],[58,4],[72,14],[77,29],[61,42],[43,38],[26,44],[7,32],[3,22]];
  b+=polygon(rim,'#aa9b7d');b+=polygon(rim.map(([x,y])=>[Math.round((x-cx)*.93+cx),Math.round((y-cy)*.86+cy+1)]),'#c3af89');
  const inlets=basin.id==='main'?[[[0,24],[20,32],[28,36]],[[88,0],[88,17],[80,24]],[[40,0],[40,22],[48,28]]]:basin.id==='west'?[[[55,25],[80,24]]]:[[[40,0],[40,20]],[[40,30],[40,48]]];
  for(const pts of inlets)b+=line(pts,wet?'#a8ad96':'#af9b7c',5)+(wet?line(pts,'#a4cfcc',2):'');
  const shore=basin.id==='main'?[[20,30],[30,18],[48,16],[63,21],[80,17],[93,29],[89,42],[95,54],[78,63],[60,58],[45,65],[30,58],[17,47]]:basin.id==='west'?[[15,19],[28,12],[45,16],[61,13],[68,25],[57,35],[40,31],[26,36],[13,29]]:[[17,15],[33,12],[47,16],[61,12],[69,23],[57,34],[42,30],[29,36],[15,28]];
  if(wet){b+=polygon(shore,'#6e9eaa');b+=polygon(shore.map(([x,y])=>[Math.round((x-cx)*.94+cx),Math.round((y-cy)*.91+cy+1)]),'#8acbd0');b+=line(shore.slice(0,6),'#c8e2cf',1);}
  else{const small=shore.map(([x,y])=>[Math.round((x-cx)*.43+cx),Math.round((y-cy)*.43+cy+2)]);b+=polygon(small,'#6f9ea8');b+=polygon(small.map(([x,y])=>[x,y+1]),'#91c7ca');b+=line([[9,h-15],[19,h-19],[25,h-12],[35,h-13]],'#a48d71',1);}
  const rippleY=wet?cy+2:cy+3;b+=r(cx-6,rippleY,10,1,'#d4eee1')+r(cx+2,rippleY+(wet?5:3),7,1,wet?'#b9e3db':'#b1d6d1');
  b+=r(10,h-12,5,2,'#9a9e8b')+r(w-16,12,6,2,'#bdc3aa');art+=tile(wet?basin.wet:basin.dry,b);
 }
 // PASS 3: broadleaf silhouettes, medium shrubs and existing solid rocks give the rim a readable scale.
 function tree(frame,wet,variant){const foliage=wet?'#719c73':'#7d8d69',lit=wet?'#a4be86':'#abb28a',shade=wet?'#507e62':'#636f58';let b=r(21,27,5,18,'#6c6651')+r(23,29,2,15,'#a18b63')+r(16,44,18,2,'#7e9373');
  b+=p(variant?'M6 28V16h6V8h9V3h11v5h9v11h5v13h-7v6H15v-5H6z':'M3 23V13h8V6h12V2h10v6h9v10h4v13h-8v7H14v-6H6z',shade);
  b+=r(11,14,25,15,foliage)+r(16,7,16,10,foliage)+r(7,19,9,10,foliage)+r(34,20,8,10,foliage)+r(15,10,11,4,lit)+r(8,20,10,3,lit)+r(28,27,8,5,shade);return tile(frame,b);}
 art+=tree(VALLEY.treeDry,false,false)+tree(VALLEY.treeWet,true,false)+tree(VALLEY.tree2Dry,false,true)+tree(VALLEY.tree2Wet,true,true);
 for(const[f,moss]of[[VALLEY.boulder,false],[VALLEY.boulderMoss,true]]){let b=p('M1 24l4 -13 8 -7h11l6 9 1 13 -7 5H7z',ink)+p('M5 22l4 -9 7 -6h7l3 9 2 7 -5 4H9z',stone)+p('M16 7h7l3 9 -10 4H8l1 -7z',light)+p('M16 21l9 -6 3 8 -5 4H9z','#84968e')+r(15,12,2,8,'#8b9b91');if(moss)b+=r(6,22,9,4,'#83976f')+r(11,20,5,3,'#a6b386');art+=tile(f,b);}
 art+=tile(VALLEY.bench,r(1,4,30,5,'#6b624e')+r(2,4,28,2,'#ceb48b')+r(3,10,26,3,wood)+r(4,12,3,4,'#6b624e')+r(25,12,3,4,'#6b624e'));
 art+=tile(VALLEY.sign,r(7,6,2,10,'#6f604b')+r(1,0,14,10,ink)+r(2,1,12,7,'#d0b78a')+r(5,4,6,1,'#658377')+r(8,2,2,5,'#658377'));
 for(const[f,wet]of[[VALLEY.shrubDry,false],[VALLEY.shrubWet,true]])art+=tile(f,p('M2 14v-5h5V4h7V1h7v5h7v5h3v5H3z',wet?'#628f65':'#8e8c64')+r(7,5,9,7,wet?'#90af76':'#b1a77e')+r(18,8,8,6,wet?'#76a16a':'#9d956c')+r(11,14,14,2,wet?'#4c7e5f':'#7c805d'));
 for(const[f,wet]of[[VALLEY.reedsDry,false],[VALLEY.reedsWet,true]]){let b='';for(const[x,y]of[[4,6],[9,2],[16,7],[23,4],[28,8]])b+=r(x,y,1,16-y,wet?'#649276':'#a29b71')+r(x-1,y,3,3,wet?'#8caf86':'#c1b78d');art+=tile(f,b);}
 art+=tile(VALLEY.stones,p('M1 12l4 -6h5l4 4 8 -5h5l4 7 -4 3H4z','#8b9d92')+r(5,7,5,2,'#c9cbb2')+r(23,6,4,2,'#c5c6ac'));
 for(const[f,wet]of[[VALLEY.tuftDry,false],[VALLEY.tuftWet,true]])art+=tile(f,r(3,7,1,8,wet?'#6c956a':'#9e9d70')+r(6,3,1,12,wet?'#9db17e':'#bdb286')+r(10,5,1,10,wet?'#6a956e':'#8c9268')+r(12,10,1,5,wet?'#92ad78':'#b1a67a'));
 for(const[f,c]of[[VALLEY.white,'#eee4c7'],[VALLEY.purple,'#bbafce'],[VALLEY.yellow,'#e7cd86']])art+=tile(f,r(4,6,1,9,'#769d70')+r(2,4,5,3,c)+r(4,5,1,1,'#d5b56e')+r(11,11,1,4,'#6e996c')+r(9,9,5,3,c));
 // PASS 4: limited damp soil and green patches, plus thin passable rain runnels. Never a new river.
 for(const[start,c,edge]of[[VALLEY.mud,'#b4a387','#c6b18e'],[VALLEY.green,'#8eaa79','#b7ba8a'],[VALLEY.trail,'#e7d3ad','#c6b896']])for(let mask=0;mask<16;mask++){
  let b='';for(let y=mask&1?0:2;y<(mask&4?16:15);y++){const lo=mask&8?0:y<4?3:1,hi=mask&2?16:y>12?13:15;b+=r(lo,y,hi-lo,1,c);}if(!(mask&1))b+=r(4,2,8,1,edge);if(!(mask&4))b+=r(3,14,9,1,edge);art+=tile(start+mask,b);
 }
 for(let mask=0;mask<16;mask++){let b=r(5,5,6,6,'#a8ad99')+r(7,7,2,2,'#9ac8c7');for(const[bit,pts]of[[1,[[8,0],[8,8]]],[2,[[8,8],[16,8]]],[4,[[8,8],[8,16]]],[8,[[0,8],[8,8]]]])if(mask&bit)b+=line(pts,'#aaad96',5)+line(pts,'#a4cfcc',2);art+=tile(VALLEY.trickle+mask,b);}
 art+=tile(VALLEY.gravel,r(2,11,4,2,'#adac93')+r(3,10,3,1,'#d8ceab')+r(12,6,5,2,'#a4a58e')+r(13,5,4,1,'#cdc6a5')+r(25,10,5,2,'#9eaa96')+r(26,9,3,1,'#d0ceaf'));
 return `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" shape-rendering="crispEdges">${art}</svg>\n`;
}
