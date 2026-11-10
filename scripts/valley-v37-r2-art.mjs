/** Small cut-bank atlas. Existing water polygons/pixels are retained; closed mud rims are removed. */
import{BASINS as OLD}from'./valley-v37-r1-art.mjs';
export const FIRST=8019,COLS=32;
export const K={wall:0,ramp:16,mainDry:64,westDry:72,northDry:78,mainWet:224,westWet:232,northWet:238};
export const BASINS=OLD.map(b=>({...b,dry:K[b.id+'Dry'],wet:K[b.id+'Wet']}));
export function valleyCutSvg(water){
 const r=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`,poly=(p,c)=>`<path d="M${p.map(a=>a.join(' ')).join('L')}z" fill="${c}"/>`,line=(p,c,w=1)=>`<path d="M${p.map(a=>a.join(' ')).join('L')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"/>`;
 const tile=(f,b)=>`<g transform="translate(${f%COLS*16} ${Math.floor(f/COLS)*16})">${b}</g>`;
 let s=`<defs><pattern id="nativeWater" patternUnits="userSpaceOnUse" width="16" height="16"><svg width="16" height="16" viewBox="16 32 16 16"><image width="288" height="176" href="data:image/png;base64,${water}"/></svg></pattern></defs>`;
 // Connected full rock/earth silhouettes match the 16x16 local collision bodies exactly.
 for(let mask=0;mask<16;mask++){
  let b=r(0,0,16,16,'#8e8970')+r(11,0,5,16,'#616e60')+r(1,3,4,13,'#a0a28a');
  if(!(mask&1))b+=r(0,0,16,3,'#bfc39d')+r(0,3,16,2,'#a5af8b');
  if(!(mask&8))b+=r(0,0,1,16,'#d0cba8');if(!(mask&2))b+=r(15,0,1,16,'#4f6157');
  if(!(mask&4))b+=r(0,13,16,3,'#637062');
  b+=r(7,6,1,5,'#697568')+r(6,10,1,3,'#697568');s+=tile(K.wall+mask,b);
 }
 // Treads read across the eastbound descent, rather than repeating northbound ladders.
 for(let n=0;n<4;n++){let b=r(0,0,16,16,['#e0cea8','#d9c49d','#cfb993','#d8c49f'][n]);for(let x=2;x<16;x+=5)b+=r(x,1,1,14,'#e9ddbb')+r(x+1,1,2,14,'#a9ad95');s+=tile(K.ramp+n,b);}
 for(const b of BASINS)for(const wet of[false,true]){
  const w=b.width*16,h=b.height*16;let a=r(0,0,w,h,'#d9c298');
  // Open deposition lobes on selected banks, never an enclosing dark annulus.
  const lobes=b.id==='main'?[[[1,26],[20,12],[42,9],[55,13],[40,22],[20,30],[1,36]],[[80,65],[102,52],[108,61],[92,75],[68,76]]]:b.id==='west'?[[[8,19],[26,16],[43,20],[61,15],[78,26],[70,29],[53,25],[35,29],[17,27]]]:[[[13,19],[33,8],[55,12],[61,19],[44,17],[25,25]]];
  for(const p of lobes)a+=poly(p,wet?'#b7ab8d':'#c8b48d');
  if(b.id==='main')a+=line([[20,14],[30,11],[40,12]],'#b6a481');
  const inlets=b.id==='main'?[[[0,30],[14,31],[28,35]],[[80,0],[80,14],[72,25]]]:b.id==='west'?[[[12,0],[15,12],[23,24]],[[62,30],[80,30]]]:[[[32,0],[31,12],[37,23]],[[37,32],[37,48]]];
  for(const p of inlets){a+=line(p,wet?'#acae92':'#c4ad87',5);if(wet)a+=line(p,'url(#nativeWater)',3);}
  a+=line(b.id==='main'?[[12,57],[23,54],[31,63],[40,61]]:[[8,h-7],[17,h-10],[23,h-6]],'#ac9879');
  a+=poly(wet?b.after:b.before,'url(#nativeWater)');a+=r(w-14,8,6,2,'#a0a58e')+r(w-13,7,4,1,'#d0ccb0');s+=tile(wet?b.wet:b.dry,a);
 }
 return`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="256" shape-rendering="crispEdges">${s}</svg>\n`;
}
