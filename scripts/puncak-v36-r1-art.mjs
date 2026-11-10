/** Small repo-native SVG atlas: integer 16px tiles, compatible with the existing mountain palette. */
export const FIRST=4755,COLS=32;
export const TILE={foot:0,slope:16,summit:32,trail:48,cliffFoot:64,cliffSlope:128,cliffSummit:192,rim:256,shadow:272,stairs:288,landing:336,lastSteps:384};
export function elevationSvg(){
 const r=(x,y,w,h,c,a=1)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"${a===1?'':` opacity="${a}"`}/>`,p=(d,c)=>`<path d="${d}" fill="${c}"/>`;
 const tile=(n,b)=>`<g transform="translate(${n%COLS*16} ${Math.floor(n/COLS)*16})">${b}</g>`;let art='';
 // Quiet connected surfaces: altitude comes from large material fields, not repeated gravel noise.
 for(const[start,base,light,dark]of[
  [TILE.foot,'#7e9676','#a7b58e','#697e69'],[TILE.slope,'#94a29d','#b9c6b7','#788d89'],
  [TILE.summit,'#bbcdd0','#d9e0d3','#94aeb4'],[TILE.trail,'#dcc69f','#edddba','#b3a182'],
  [TILE.landing,'#c7d4cf','#e0e4d4','#a5bab8'],
 ])for(let mask=0;mask<16;mask++){
  let b=r(0,0,16,16,base);
  if(!(mask&1))b+=r(0,0,16,2,light);if(!(mask&4))b+=r(0,14,16,2,dark);
  if(!(mask&8))b+=r(0,2,1,12,light);if(!(mask&2))b+=r(15,2,1,12,dark);
  art+=tile(start+mask,b);
 }
 // Each column is a joined 16x32 wall, confined to an old cliff collider's two-tile footprint.
 // A broad sunlit top plane, vertical fractured facets and a dark foot replace the shallow bands.
 // Higher tiers have a thinner top shelf and a taller visible face, never a new physical wall.
 for(let tier=0;tier<3;tier++)for(let variant=0;variant<4;variant++)for(let ends=0;ends<4;ends++){
  const cap=[7,4,2][tier]+[0,1,0,2][variant],left=ends&1?0:1,right=ends&2?16:15;
  const light=['#c2cbb0','#ced5c0','#e0e3d2'][tier],face=['#788c82','#6b8389','#617e8b'][tier],shade=['#4f6b63','#465f6c','#3d596a'][tier];
  let b=r(left,0,right-left,32,shade)+r(left,0,right-left,cap,light)+r(left,cap,right-left,2,'#a1b5ad');
  b+=p(`M${left} ${cap+2}h${right-left-4}l-2 11 2 ${18-cap}H${left}z`,face);
  b+=p(`M${left+2} ${cap+2}h5l-1 9 -2 7H${left+1}z`,'#8ea39e');
  b+=p(`M${right-5} ${cap+2}h4v${27-cap}h-6l2 -8 -1 -6z`,shade);
  b+=r(left,0,right-left,1,'#e0e2cc')+r(left,29,right-left,3,shade);
  // Few long fracture seams, deliberately uneven; no horizontal masonry courses.
  if(variant===1)b+=p(`M7 ${cap+4}h1v8H7v5H5v5H4v-6h2v-6h1z`,'#3e5964');
  if(variant===2)b+=p(`M11 ${cap+5}h1v6h-2v6H8v5H7v-6h2v-6h2z`,'#405a67');
  if(variant===3)b+=r(2,cap+7,4,1,'#b5c3b9')+p('M4 24h3v3H5v3H3z','#58776d');
  if(!(ends&1))b+=r(0,2,1,27,'#bac7b8');if(!(ends&2))b+=r(15,cap,1,32-cap,'#344e5d');
  art+=tile([TILE.cliffFoot,TILE.cliffSlope,TILE.cliffSummit][tier]+variant*4+ends,b);
 }
 for(let mask=0;mask<16;mask++){
  art+=tile(TILE.rim+mask,r(0,11,16,5,'#cbd5bf')+r(0,14,16,2,'#e1e4cc'));
  art+=tile(TILE.shadow+mask,r(0,0,16,3,'#29434e',.28)+r(0,3,16,3,'#29434e',.17)+r(1,6,15,2,'#29434e',.07));
 }
 // A single north-rising 48x48 stair flight, with connected landings and a consistent right shadow.
 let b=r(0,0,48,48,'#657e83');
 for(let y=0;y<48;y+=8)b+=r(3,y,41,2,'#e0ddc2')+r(3,y+2,41,4,'#b9c3b0')+r(3,y+6,41,2,'#748c8c');
 b+=r(0,0,3,48,'#a9b6a4')+r(45,0,3,48,'#4b6873');art+=tile(TILE.stairs,b);
 // Last low stair landing leads onto the existing lookout deck; no new collider or building.
 b=r(0,0,48,16,'#9aada9');for(let y=0;y<16;y+=4)b+=r(1,y,46,1,'#dfdfc5')+r(1,y+1,46,2,'#bbc7b5')+r(1,y+3,46,1,'#7f9999');art+=tile(TILE.lastSteps,b);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="256" shape-rendering="crispEdges">${art}</svg>\n`;
}
