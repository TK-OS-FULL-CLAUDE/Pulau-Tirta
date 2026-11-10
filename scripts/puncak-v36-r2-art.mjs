/** Small local 16px ridge tiles. Solid rock silhouettes correspond exactly to their local bodies. */
export const FIRST=5267;
export function ridgeSvg(){
 const r=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;let s='';
 const colors=[['#768b79','#bcc9ac','#4e6962'],['#708992','#c6d1c0','#425e6c'],['#6e8999','#d7dfd0','#3b576a']];
 for(let tier=0;tier<3;tier++)for(let mask=0;mask<16;mask++){
  const[face,light,shade]=colors[tier];let b=r(0,0,16,16,face);
  if(!(mask&1))b+=r(0,0,16,3,light)+r(0,3,16,2,'#96ada6');
  b+=r(0,mask&1?0:5,2,mask&1?16:11,'#8ea69e')+r(12,mask&1?0:5,4,mask&1?16:11,shade);
  if(!(mask&4))b+=r(0,13,16,3,shade);
  if(!(mask&8))b+=r(0,0,1,16,light);if(!(mask&2))b+=r(15,0,1,16,'#344e5e');
  b+=r(7,6,1,5,shade)+r(6,10,1,3,shade);
  const n=tier*16+mask;s+=`<g transform="translate(${n%16*16} ${Math.floor(n/16)*16})">${b}</g>`;
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="64" shape-rendering="crispEdges">${s}</svg>\n`;
}
