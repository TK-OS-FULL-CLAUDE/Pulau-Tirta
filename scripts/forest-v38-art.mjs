/** Local forest art. Four composited tree planes preserve overlapping crowns without cut-off tile seams. */
export const FOREST_FIRST=4755,FOREST_COLS=128,FOREST_SIZE=2048;
export const FOREST_BOUNDS={x:122,y:82,width:62,height:54};
export const TREE_STYLES={round:{width:3,height:4},slender:{width:3,height:5},understory:{width:3,height:3},sapling:{width:1,height:2},bud:{width:1,height:1}};
export const FOREST={floor:6912,moss:6928,litterFloor:6944,bank:6960,damp:6976,trail:6992,recovered:7008,dryPlot:7024,
 water:7168,waterDeep:7184,fern:7296,shrub:7298,reeds:7300,tuft:7302,white:7303,purple:7304,yellow:7305,
 pebbles:7306,riverRock:7308,boulder:7310,log:7312,stump:7315,mushrooms:7316,leaves:7317,rockSmall:7319,branch:7320,
 fernFresh:7552,shrubFresh:7554,reedsFresh:7556,tuftFresh:7558};
export const GROVES=[
 {id:'barat-berlapis',shape:[[124,95],[129,90],[137,92],[140,98],[137,104],[135,113],[131,123],[126,124],[124,115]],floor:'floor'},
 {id:'hulu-rindang',shape:[[136,84],[146,83],[153,87],[156,93],[152,99],[149,102],[142,100],[138,94]],floor:'floor'},
 {id:'punggung-timur',shape:[[165,88],[172,92],[178,99],[178,109],[173,117],[168,119],[165,112],[166,104],[162,98]],floor:'moss'},
 {id:'selatan-lembap',shape:[[132,119],[140,117],[147,120],[153,127],[150,134],[140,135],[134,130]],floor:'floor'},
 {id:'pangkal-jembatan',shape:[[146,110],[150,108],[155,110],[154,117],[150,121],[146,118]],floor:'moss'}
];
export function insideGrove(points,x,y){let c=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const[a,b]=points[i],[d,e]=points[j];if((b>y)!==(e>y)&&x<(d-a)*(y-b)/(e-b)+a)c=!c;}return c;}
export function forestSvg(trees){
 const r=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`,p=(d,c)=>`<path d="${d}" fill="${c}"/>`;
 const tile=(f,b)=>`<g transform="translate(${f%128*16} ${Math.floor(f/128)*16})">${b}</g>`;
 const ink='#345748',wood='#7b7353',lightWood='#aa976b';
 function tree(style,palette){const wet=palette==='wet',dry=palette==='dry',leaf=wet?'#729c6d':dry?'#7f9369':'#54856a',lit=wet?'#a6bc80':dry?'#b1b38a':'#91ad79',shade=wet?'#46775a':dry?'#5e795e':'#386653';let b='';
  if(style==='round'){
   b+=r(22,35,5,27,wood)+r(23,37,2,24,lightWood)+r(16,61,18,2,'#608064');
   b+=p('M4 37V22h4V13h9V6h17v4h9v9h4v18h-6v9H14v-4H6z',ink)+p('M7 35V23h4v-9h8V9h13v5h9v8h3v12h-7v8H16v-4H9z',leaf);
   b+=r(15,13,13,5,lit)+r(10,24,10,4,lit)+r(27,33,11,7,shade)+r(16,39,13,3,shade)+r(28,19,9,4,leaf);
  }else if(style==='slender'){
   b+=r(22,37,5,41,wood)+r(23,39,2,38,lightWood)+r(18,77,13,2,'#5f8268');
   b+=p('M17 4h12v5h7v11h4v19h-4v13h-7v8H17v-7h-6V39H7V23h4V12h6z',ink)+p('M19 7h9v6h5v10h4v14h-5v13h-6v7h-7v-8h-5V37h-4V25h5V15h4z',leaf);
   b+=r(18,17,6,11,lit)+r(14,31,6,8,lit)+r(27,36,6,13,shade)+r(19,51,8,4,shade);
  }else if(style==='understory'){
   b+=r(22,24,5,22,wood)+r(23,27,2,17,lightWood)+r(18,45,14,2,'#64896b');
   b+=p('M5 24V14h7V7h10V2h11v6h9v10h4v12h-8v7H15v-5H7z',ink)+p('M8 23v-7h7V10h9V6h7v6h8v9h4v7h-9v6H17v-5H10z',leaf)+r(16,13,12,4,lit)+r(29,26,9,5,shade);
  }else if(style==='sapling'){
   b+=r(7,17,2,14,wood)+r(5,30,7,1,'#64836a')+p('M5 1h6v4h3v9h-2v7H5v-3H2V8h3z',ink)+p('M6 3h4v4h2v7h-2v5H6v-4H4V9h2z',leaf)+r(5,7,3,5,lit);
  }else b+=r(7,9,2,7,wood)+p('M4 2h7v3h3v6H4V9H2V5h2z',leaf)+r(5,3,5,3,lit)+r(8,10,4,2,shade);
  return b;
 }
 let defs='';for(const style of Object.keys(TREE_STYLES))for(const palette of['normal','dry','wet'])defs+=`<g id="forest-${style}-${palette}">${tree(style,palette)}</g>`;
 let art=`<defs>${defs}</defs>`;
 const sorted=[...trees].sort((a,b)=>a.y-b.y||a.x-b.x);
 // One 992x864 crown image and one roots image per state, packed in the four atlas quadrants.
 for(const wet of[false,true])for(const roots of[false,true]){
  const ax=wet?1024:0,ay=roots?1024:0;let plane='';
  for(const t of sorted){const d=TREE_STYLES[t.style],w=d.width*16,h=d.height*16,x=(t.x-Math.floor(d.width/2)-122)*16,y=(t.y-d.height+1-82)*16;
   if(!roots&&d.height===1)continue;const sy=roots?h-16:0,clipHeight=roots?16:h-16;
   plane+=`<svg x="${x}" y="${roots?y+h-16:y}" width="${w}" height="${clipHeight}" viewBox="0 ${sy} ${w} ${clipHeight}" overflow="hidden"><use href="#forest-${t.style}-${wet?'wet':t.dry?'dry':'normal'}"/></svg>`;
  }
  art+=`<svg x="${ax}" y="${ay}" width="992" height="864" viewBox="0 0 992 864" overflow="hidden">${plane}</svg>`;
 }
 // Quiet connected forest-floor fields. Vegetation/leaf litter is grouped by the map composition.
 for(const[start,c,edge]of[[FOREST.floor,'#608b70','#809d78'],[FOREST.moss,'#839f72','#9bb17c'],[FOREST.litterFloor,'#9b9e76','#b4b38b'],[FOREST.bank,'#9ba685','#bdba95'],[FOREST.damp,'#7f9680','#a1ae8e'],[FOREST.trail,'#d7c69f','#b6b28e'],[FOREST.recovered,'#8aab7a','#a8bb8a'],[FOREST.dryPlot,'#b5a17e','#c7b08c']])for(let mask=0;mask<16;mask++){
  let b='';for(let y=mask&1?0:1;y<(mask&4?16:15);y++){const lo=mask&8?0:y<4?3:1,hi=mask&2?16:y>12?13:15;b+=r(lo,y,hi-lo,1,c);}if(!(mask&1))b+=r(4,1,8,1,edge);if(!(mask&4))b+=r(3,14,10,1,edge);art+=tile(start+mask,b);
 }
 // Replaces only collidable existing river water. Its footprint and bridge override remain unchanged.
 for(const[start,c]of[[FOREST.water,'#79bec5'],[FOREST.waterDeep,'#5ca8b7']])for(let mask=0;mask<16;mask++){
  let b=r(0,0,16,16,c);if(!(mask&1))b+=r(0,0,16,2,'#b9dbca');if(!(mask&4))b+=r(0,14,16,2,'#91c8c0');if(!(mask&8))b+=r(0,0,2,16,'#b3d7c5');if(!(mask&2))b+=r(14,0,2,16,'#8abcb7');
  if(mask===15||mask===5||mask===10)b+=r(4,7,5,1,'#b6dfd5')+r(8,10,3,1,'#8ac9cc');art+=tile(start+mask,b);
 }
 for(const[f,wet]of[[FOREST.fern,false],[FOREST.fernFresh,true]])art+=tile(f,p('M14 15L2 6V3l11 7L7 0h3l6 9 6 -9h3l-5 10 10 -7v4L18 16z',wet?'#62926c':'#567f66')+r(15,6,2,10,wet?'#a4b57d':'#8ea475'));
 for(const[f,wet]of[[FOREST.shrub,false],[FOREST.shrubFresh,true]])art+=tile(f,p('M2 24V13h5V7h8V3h8v7h5v8h3v10H5z',wet?'#538960':'#507c64')+r(7,12,10,9,wet?'#8bb276':'#7c9e75')+r(16,8,6,11,wet?'#a3bb82':'#90a77c')+r(10,24,16,3,'#3d6d56'));
 for(const[f,wet]of[[FOREST.reeds,false],[FOREST.reedsFresh,true]]){let b='';for(const[x,y]of[[4,5],[9,1],[16,6],[23,3],[28,7]])b+=r(x,y,1,16-y,wet?'#5b916f':'#71906d')+r(x-1,y,3,2,wet?'#a6bc8b':'#b3b591');art+=tile(f,b);}
 for(const[f,wet]of[[FOREST.tuft,false],[FOREST.tuftFresh,true]])art+=tile(f,r(3,6,1,10,'#567e61')+r(6,2,1,13,wet?'#afbd80':'#99ad7b')+r(10,5,1,10,'#6a956d')+r(12,9,1,6,wet?'#8eae7a':'#819c70'));
 for(const[f,c]of[[FOREST.white,'#eee5c6'],[FOREST.purple,'#b5a7ca'],[FOREST.yellow,'#e4cd8a']])art+=tile(f,r(4,6,1,9,'#6b9568')+r(2,4,5,3,c)+r(4,5,1,1,'#d6b96f')+r(11,11,1,4,'#799d6a')+r(9,9,5,3,c));
 art+=tile(FOREST.pebbles,p('M1 12l3 -5h6l4 4 8 -6h5l4 7 -4 3H4z','#7e968d')+r(5,8,5,2,'#bdc7aa')+r(23,6,4,2,'#b7c4a6'));
 for(const[f,moss]of[[FOREST.riverRock,false],[FOREST.boulder,true]]){let b=p('M2 24l3 -12 7 -7h11l7 10 1 11 -7 5H8z','#435e58')+p('M5 22l4 -9 6 -5h7l4 9 2 7 -5 4H10z','#94aaa1')+p('M15 8h7l3 8 -10 4H8l1 -7z','#c2ccb5')+p('M15 21l10 -5 3 8 -5 4H10z','#6d9189');if(moss)b+=r(5,23,9,4,'#7a9e76')+r(11,21,8,4,'#9bb381');art+=tile(f,b);}
 art+=tile(FOREST.log,p('M1 10l6 -6h31l9 4v5l-7 3H8z','#5f6c50')+r(8,6,30,7,'#9e9972')+r(11,7,25,1,'#c4b58b')+r(12,12,24,1,'#7c8761')+r(4,8,5,5,'#b4a47e')+r(36,5,5,3,'#81a070'));
 art+=tile(FOREST.stump,r(4,7,9,8,'#6c7051')+r(3,5,11,5,'#a89d70')+r(5,6,7,2,'#d2bd8a')+r(7,7,4,1,'#8f865b')+r(3,13,3,3,'#79956b')+r(12,12,3,3,'#8da26f'));
 art+=tile(FOREST.mushrooms,r(4,10,2,5,'#d7cfab')+r(2,8,6,3,'#c39879')+r(3,8,3,1,'#ead6af')+r(11,12,1,3,'#d7cfab')+r(9,10,5,2,'#9e9a7d'));
 art+=tile(FOREST.leaves,r(3,8,4,2,'#a9aa78')+r(6,10,2,1,'#819068')+r(12,5,5,2,'#b8af7d')+r(22,11,4,2,'#97a471')+r(26,10,3,1,'#788d62'));
 art+=tile(FOREST.rockSmall,p('M2 12l2 -7 6 -2 4 6 1 5H4z','#4f7067')+p('M4 11l2 -5h4l3 5 -1 2H5z','#9db6a7')+r(6,6,4,1,'#cad1b5'));
 art+=tile(FOREST.branch,p('M1 11l12 -3 4 -6h3l-2 6 12 -1v3l-12 2 4 3h-5l-4 -3 -11 2z','#7d8660')+r(3,10,9,1,'#c2b68b')+r(20,8,9,1,'#aaa67b'));
 return `<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="2048" shape-rendering="crispEdges">${art}</svg>\n`;
}
