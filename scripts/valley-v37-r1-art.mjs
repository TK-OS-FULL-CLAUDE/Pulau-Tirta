/** Refinement of the existing V3.7 catchment; original water pixels, no new water palette. */
import{PATCH,SHAPES,insidePolygon}from'./valley-v37-art.mjs';
export{PATCH,insidePolygon};
export const FIRST=5331,COLS=48,COUNT=2688;
export const K={terrain:0,mainDry:1536,westDry:1544,northDry:1550,mainWet:1776,westWet:1784,northWet:1790,runnels:2016,ramp:2660};
export const RUNNEL_PATCH={x:134,y:39,width:22,height:13};
export const BASINS=[
 {id:'main',role:'lowest-main-catchment',x:145,y:49,width:7,height:5,dry:K.mainDry,wet:K.mainWet,
  before:[[50,43],[64,39],[77,45],[80,54],[68,62],[51,58],[45,51]],after:[[6,29],[20,17],[41,12],[65,14],[82,10],[103,21],[110,39],[101,58],[83,72],[58,68],[41,76],[22,65],[5,50]]},
 {id:'west',role:'elongated-seep-pocket',x:137,y:48,width:5,height:3,dry:K.westDry,wet:K.westWet,
  before:[[33,28],[45,25],[52,29],[44,34],[30,32]],after:[[12,25],[23,19],[40,22],[55,18],[67,24],[77,30],[67,36],[49,34],[34,39],[18,35]]},
 {id:'north',role:'small-headwater-hollow',x:150,y:45,width:5,height:3,dry:K.northDry,wet:K.northWet,
  before:[[31,26],[44,22],[50,28],[43,35],[29,33]],after:[[21,20],[37,12],[54,17],[66,27],[57,37],[41,43],[27,38],[16,30]]},
];
export const DRAINS=[
 {id:'north-slope',from:'north-slope',to:'north',width:[2,3],points:[[150.5,39.8],[150.2,41],[151,42.2],[151.2,43.2],[152,45.2]]},
 {id:'west-slope',from:'west-slope',to:'west',width:[2,3],points:[[136.1,42],[136.4,43.1],[136.5,44.3],[136.8,46.4],[137.7,48.1]]},
 {id:'west-overflow',from:'west',to:'main',width:[2,4],points:[[141.9,49.9],[142.6,49.8],[143.2,50.2],[144,50.4],[145.3,50.9]]},
 {id:'north-overflow',from:'north',to:'main',width:[2,4],points:[[152.3,47.9],[152.2,48.2],[151.6,48.5],[150.8,48.8],[150,49.25]]},
];
export const LOW_PLAIN=[[136,46],[139,44],[145,43],[150,43.5],[155,44],[156,47],[154,49],[154,53],[151,55.5],[146,55.5],[142,53],[137,52],[135.5,49]];
export function rounded(points){let p=points;for(let n=0;n<2;n++){const a=[p[0]];for(let i=1;i<p.length;i++){const[u,v]=[p[i-1],p[i]];a.push([u[0]*.75+v[0]*.25,u[1]*.75+v[1]*.25],[u[0]*.25+v[0]*.75,u[1]*.25+v[1]*.75]);}a.push(p.at(-1));p=a;}return p;}
export function valleyRefinementSvg(waterPngBase64){
 const r=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
 const poly=(a,c)=>`<path d="M${a.map(p=>p.join(' ')).join('L')}z" fill="${c}"/>`;
 const line=(a,c,w=1)=>`<path d="M${a.map(p=>p.join(' ')).join('L')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"/>`;
 const local=a=>a.map(([x,y])=>[Math.round((x-PATCH.x)*16),Math.round((y-PATCH.y)*16)]);
 const tile=(f,b)=>`<g transform="translate(${f%COLS*16} ${Math.floor(f/COLS)*16})">${b}</g>`;
 // Native Tiny Battle tile37, cropped without modifying the PNG or introducing a new water style.
 const pattern=`<defs><pattern id="nativeWater" patternUnits="userSpaceOnUse" width="16" height="16"><svg width="16" height="16" viewBox="16 32 16 16"><image width="288" height="176" href="data:image/png;base64,${waterPngBase64}"/></svg></pattern></defs>`;
 let terrain=poly(local(SHAPES.rim),'#9bac86');
 terrain+=poly(local([[134,35],[140,34],[145,36],[141,39],[135,42],[131,44],[132,39]]),'#88a17e');
 terrain+=poly(local([[162,39],[166,42],[164,47],[166,51],[164,56],[161,57],[159,53],[162,49]]),'#859b7e');
 terrain+=poly(local(SHAPES.slope),'#a2967b');
 // Broad inclined rock faces, not thin concentric outlines. The warm paths remain graded crossings.
 const top=[[134,42],[136,39.5],[141,37.8],[147,38.3],[153,39.2],[157,40.2],[161,42],[163,45]];
 const foot=[[135,44.3],[137,42.5],[141,41.8],[147,42.2],[152.5,42.5],[156,43.4],[159.5,45],[161.8,46.5]];
 terrain+=poly(local([...top,...[...foot].reverse()]),'#68796f')+line(local(top),'#d0cfad',3);
 for(const[a,c]of[
  [[[136,40],[138,39],[140,38.5],[140.5,41.7],[137,42.6]],'#89968a'],
  [[[142,38],[146,38.5],[145,42],[141,41.8]],'#87948a'],
  [[[148,38.6],[152,39.4],[151.5,42.5],[147,42.1]],'#586e67'],
  [[[154,39.9],[158,41],[157,43.8],[153,42.7]],'#829286'],
  [[[162.4,44],[164.4,46.2],[163.4,49],[165,53],[162,56],[159.6,54],[161.5,50],[160,47]],'#647b71'],
  [[[163,46],[163.6,48],[162.3,51],[163.2,54],[161.6,55],[160.6,53],[162,49]],'#8c9a89'],
 ])terrain+=poly(local(a),c);
 terrain+=line(local(foot),'#526b62',5);
 terrain+=poly(local(SHAPES.floor),'#ddc499');
 terrain+=poly(local([[139,44],[144,41],[149,42],[151,44],[147,46],[142,47],[137,48]]),'#e8d3ac');
 terrain+=poly(local([[156,45],[160,47],[158.7,50],[161,53],[158,56],[154,56],[153,53],[155,50]]),'#cbb590');
 terrain+=poly(local([[137,53],[140,52],[144,55],[149,55],[151,57],[147,58],[141,56]]),'#c4b18a');
 terrain+=poly(local(LOW_PLAIN),'#d9c298');
 // Silt and gravel fans follow the shoulders. No uniform noise, ring-shaped walls or new solid props.
 for(const[a,c]of[
  [[[134,46],[136,44],[138,45],[137,47],[135,49]],'#b7ab8b'],
  [[[150,42],[152,41.5],[153,43.8],[151,45],[149.8,43.5]],'#b7ad8e'],
  [[[144,53],[147,54.5],[150,54],[153,55],[149,56.2],[145,55]],'#c1ad87'],
  [[[157,53],[159,51.5],[160,53],[158,55],[155,55]],'#b6ac91'],
 ])terrain+=poly(local(a),c);
 for(const d of DRAINS){const pts=local(rounded(d.points));terrain+=line(pts,'#b7a27f',9)+line(pts,'#c7ae87',5)+line(pts,'#d7bf96',2);}
 for(const a of[[[141,43],[142,43.8],[143,43.5],[143.8,44.5]],[[142,43.8],[141.8,44.8]],[[145,45],[146.5,45.8],[146.2,46.8]],[[146.5,45.8],[147.8,45.4]],[[156,50],[157,51],[156.5,52],[158,53]],[[157,51],[158,50.5]],[[141,54],[142,53.5],[143,54],[143.5,55]],[[149,55],[149.5,56],[148.5,57]],[[154,56],[155,56.5],[156,56]]])terrain+=line(local(a),'#a18d71');
 let art=`<g>${terrain}</g>`;
 // One broad low bowl, one elongated seep and one small headwater hollow. Only selected back
 // banks are cut/shaded: there is no closed dark rim around any water polygon.
 for(const b of BASINS)for(const wet of[false,true]){
  const w=b.width*16,h=b.height*16;let a=r(0,0,w,h,'#d9c298');
  const backs=b.id==='main'?[[3,26],[18,13],[40,8],[64,11],[82,5],[104,18]]:b.id==='west'?[[8,22],[23,14],[43,18],[56,14]]:[[18,18],[36,7],[55,12],[70,26]];
  a+=line(backs,'#a69578',3)+line(backs.map(([x,y])=>[x,y-2]),'#e0cba5',2);
  const mud=b.id==='main'?[[4,28],[22,16],[46,13],[78,10],[108,25],[110,49],[90,72],[62,72],[39,78],[15,65],[2,47]]:b.id==='west'?[[5,25],[20,19],[42,22],[63,17],[79,30],[64,41],[38,43],[12,38]]:[[12,20],[33,10],[55,14],[73,28],[59,44],[38,47],[17,38]];
  a+=poly(mud,wet?'#b3a78a':'#c6b18a');
  for(const points of[b.id==='main'?[[13,58],[23,55],[31,64],[41,62]]:[[7,h-6],[17,h-10],[24,h-6]],b.id==='main'?[[84,32],[91,35],[96,31]]:[[60,12],[65,16],[70,13]]])a+=line(points,'#aa9376');
  const inlets=b.id==='main'?[[[0,30],[14,31],[28,35]],[[80,0],[80,14],[72,25]]]:b.id==='west'?[[[12,0],[15,12],[23,24]],[[62,30],[80,30]]]:[[[32,0],[31,12],[37,23]],[[37,32],[37,48]]];
  for(const points of inlets){a+=line(points,wet?'#a9a98e':'#b7a27f',7);if(wet)a+=line(points,'url(#nativeWater)',3);}
  const shore=wet?b.after:b.before;a+=poly(shore,'url(#nativeWater)');
  // A few stones on the upper shoulder only; never a ring of rocks around the basin.
  a+=r(w-14,8,6,2,'#a0a58e')+r(w-13,7,4,1,'#d0ccb0');
  art+=tile(wet?b.wet:b.dry,a);
 }
 let wet='';for(const d of DRAINS){const points=rounded(d.points).map(([x,y])=>[Math.round((x-RUNNEL_PATCH.x)*16),Math.round((y-RUNNEL_PATCH.y)*16)]);
  wet+=line(points,'#a5a68b',8);
  for(let i=1;i<points.length;i++){const width=d.width[0]+(d.width[1]-d.width[0])*i/(points.length-1);wet+=line([points[i-1],points[i]],'url(#nativeWater)',Math.round(width));}
 }
 art+=tile(K.runnels,wet);
 let ramp=r(0,0,16,16,'#dfc9a4');for(let y=2;y<16;y+=5)ramp+=r(1,y,14,1,'#eee0bd')+r(1,y+1,14,2,'#b8b8a0');art+=tile(K.ramp,ramp);
 return`<svg xmlns="http://www.w3.org/2000/svg" width="768" height="896" shape-rendering="crispEdges">${pattern}${art}</svg>\n`;
}
