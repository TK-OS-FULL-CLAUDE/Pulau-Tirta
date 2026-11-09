/** Local pixel-grid coastal placeholders. No external imagery, gradients or emoji. */
export const COAST_FIRST=1043,COAST_COLS=24;
export const COAST={sand:0,deck:1,deckAlt:2,stone:3,track:4,trail:32,warm:48,wet:64,water:80,waterMid:96,dune:112,
 palm:144,palmSmall:148,palmRight:163,shelter:220,boat:230,net:296,fishCrates:301,table:304,cart:308,rock:288,log:360,shrub:364,shrubFresh:366,grass:368,shell:369,flowers:370,rope:371,rail:372,railMid:376,tether:377,windSand:378,sign1:373,sign2:374,signArrow:375};
export function coastSvg(){
 const r=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`,group=(x,y,b)=>`<g transform="translate(${x} ${y})">${b}</g>`;
 const tile=(frame,b)=>group(frame%24*16,Math.floor(frame/24)*16,b),shape=(d,c)=>`<path d="${d}" fill="${c}"/>`;
 const dark='#51463c',wood='#ac7951',woodLight='#d1a471',woodDark='#785640',sand='#ead39b';let art='';
 art+=tile(COAST.sand,r(0,0,16,16,sand));
 for(const[f,c]of[[COAST.deck,wood],[COAST.deckAlt,'#b78257']])art+=tile(f,r(0,0,16,16,c)+[3,8,13].map(y=>r(0,y,16,1,woodDark)+r(0,y+1,16,1,woodLight)).join('')+r(f===1?3:11,5,1,1,dark)+r(f===1?11:4,10,1,1,dark));
 art+=tile(COAST.stone,r(0,0,16,16,'#b0ad95')+r(1,1,7,6,'#d6cdb0')+r(9,1,6,6,'#cec6ac')+r(1,8,4,7,'#c9c3aa')+r(6,8,9,7,'#d6cdb0'));
 art+=tile(COAST.track,r(0,0,16,16,'#dfbf88')+r(4,3,2,3,'#baa17d')+r(9,9,2,3,'#baa17d'));
 // Soft connected fields. The underlying light sand remains at every exposed edge.
 for(const[start,c]of[[COAST.trail,'#dfbf88'],[COAST.warm,'#e2c38a'],[COAST.wet,'#c4b293'],[COAST.dune,'#a4b77a']])for(let mask=0;mask<16;mask++){
  let b=r(0,0,16,16,sand);for(let y=0;y<16;y++){const lo=mask&8?0:y<4?3:y>11?2:1,hi=mask&2?16:y<3?13:y>10?14:15;if(y>=(mask&1?0:1)&&y<(mask&4?16:15))b+=r(lo,y,hi-lo,1,c);}art+=tile(start+mask,b);
 }
 // A thin near-shore band only. Every water tile remains collidable; deck overrides it explicitly.
 for(const[start,c]of[[COAST.water,'#91d7d8'],[COAST.waterMid,'#72c7d5']])for(let mask=0;mask<16;mask++){
  let b=r(0,0,16,16,c)+r(4,8,4,1,'#c4ece1');if(!(mask&1))b+=r(0,1,16,1,'#e9f2d7');if(!(mask&4))b+=r(0,14,16,1,'#e9f2d7');if(!(mask&8))b+=r(1,0,1,16,'#d4ecdb');if(!(mask&2))b+=r(14,0,1,16,'#d4ecdb');art+=tile(start+mask,b);
 }
 // 3x4 leaning palm. Fronds are stepped silhouettes with warm coconuts and visible trunk bands.
 function palm(frame,small=false,right=false){const h=small?48:64,cy=small?14:17;let b=shape(`M20 ${cy+4}h6v10h-2v10h-2v${h-cy-28}h-5V${cy+24}h2V${cy+14}h1z`,dark)+r(21,cy+7,3,12,wood)+r(19,cy+19,3,h-cy-21,wood)+[cy+14,cy+24,cy+34].filter(y=>y<h-3).map(y=>r(19,y,5,2,woodLight)).join('');
  b+=shape(`M22 ${cy}l-14 -2 -7 7 1 4 8 -5 10 1 -9 8 1 6 4 -2 6 -8 2 9 4 5 3 -3 -4 -12 9 3 8 7 3 -4 -8 -10 -11 -5 8 -5 7 1 -1 -5 -7 -3 -10 6 -4 -10 -5 -2 -2 4 5 9z`,dark);
  b+=shape(`M22 ${cy}l-13 -1 -6 5 8 -3 12 1 -9 9 2 1 8 -9 3 10 2 2 -3 -12 11 5 9 6 -7 -8 -12 -5 8 -5 6 1 -7 -4 -10 7 -4 -11 -2 -1 4 12z`,'#4e8b57');
  b+=r(7,cy,11,2,'#91b96e')+r(26,cy-4,8,2,'#87b367')+r(28,cy+4,10,2,'#79a75e')+r(21,cy+6,3,3,'#bd8b51')+r(25,cy+5,3,3,'#d0a36c');return tile(frame,right?`<g transform="translate(48 0) scale(-1 1)">${b}</g>`:b);}
 art+=palm(COAST.palm);art+=palm(COAST.palmSmall,true);art+=palm(COAST.palmRight,false,true);
 // 5x3 fishing shade: open middle, a blue/canvas roof, rear counter, baskets and storage.
 let b=r(2,13,3,34,woodDark)+r(75,13,3,34,woodDark)+r(3,14,1,32,woodLight)+r(76,14,1,32,woodLight);
 b+=shape('M6 1h66l8 17H0z',dark)+shape('M7 3h64l6 12H3z','#d4c69b')+r(9,4,12,11,'#74a9b1')+r(35,4,12,11,'#74a9b1')+r(61,4,11,11,'#74a9b1')+r(1,16,78,3,woodDark)+r(7,35,66,3,dark)+r(8,36,64,2,woodLight)+r(8,45,64,2,woodDark);
 for(const x of[10,30,52])b+=r(x,38,16,8,dark)+r(x+1,39,14,6,wood)+r(x+2,41,12,1,woodLight);art+=tile(COAST.shelter,b);
 // 5x3 small fishing skiff, fully moored beside the existing pier, not a new walkable platform.
 b=shape('M1 22l12 -14h52l14 14 -10 17 -16 5H22L9 38z',dark)+shape('M5 23L15 11h48l11 12 -8 12 -14 5H23l-11 -5z',wood)+shape('M14 22l9 -8h34l10 8 -6 10H19z','#d5b687')+r(23,14,5,19,woodDark)+r(52,14,5,19,woodDark)+r(29,19,18,11,'#7ba6a1')+r(31,20,14,1,'#b0cbc1')+r(60,17,15,2,woodLight)+r(75,14,2,11,'#d2bd91')+r(22,38,32,2,woodDark)+r(11,42,49,2,'#448fa5');art+=tile(COAST.boat,b);
 // 4x2 net rack: side posts solid, mesh is open; no fake dialogue/NPC attached.
 b=r(1,0,3,32,woodDark)+r(60,0,3,32,woodDark)+r(2,2,59,2,woodLight)+'<defs><clipPath id="coast-net"><path d="M6 5h51v10l-8 8 -11 5H22l-10 -6 -6 -7z"/></clipPath></defs><g clip-path="url(#coast-net)">'+r(6,5,51,24,'#688d8d');for(let x=7;x<58;x+=5)b+=r(x,5,1,24,'#b7c8b1');for(let y=6;y<29;y+=5)b+=r(6,y,51,1,'#b7c8b1');b+='</g>';art+=tile(COAST.net,b);
 // 2x1 fish boxes: the pale silhouettes are fish in shallow crates, not characters.
 b=r(0,3,32,13,dark)+r(1,4,30,10,wood)+r(2,5,28,7,'#5f7779')+r(2,13,28,2,woodLight);for(const[x,y]of[[5,7],[14,6],[22,9]])b+=r(x,y,6,2,'#c4d2bd')+r(x+6,y-1,2,4,'#90aea4')+r(x,y,1,1,dark);art+=tile(COAST.fishCrates,b);
 // 3x2 experiment supply table with glass bowls and paper; no new explanation of evaporation.
 b=r(2,15,44,10,dark)+r(3,16,42,7,wood)+r(4,17,40,1,woodLight)+r(5,25,3,7,woodDark)+r(39,25,3,7,woodDark)+r(6,4,11,12,dark)+r(7,5,9,10,'#b2d1ca')+r(8,11,7,3,'#79bac0')+r(23,8,15,7,'#eee2bd')+r(26,10,9,1,'#9b9e8a');art+=tile(COAST.table,b);
 // 2x2 handcart supplies: a basin and folded canvas, distinct from fish cargo.
 b=r(1,16,30,3,dark)+r(3,19,25,9,wood)+r(5,21,21,2,woodLight)+r(5,28,5,4,dark)+r(23,28,5,4,dark)+r(3,7,13,9,dark)+r(4,8,11,6,'#9cbeb8')+r(6,11,7,3,'#75b7be')+r(19,10,9,6,'#d5c6a1')+r(29,6,2,14,woodDark);art+=tile(COAST.cart,b);
 // 3x2 pale coastal rocks, 3x1 driftwood, low dune plants and small shell/flower details.
 b=shape('M2 24l2 -11 8 -6h13l6 10 10 -2 6 7 -3 8H6z',dark)+shape('M5 23l3 -9 7 -4h8l5 11 10 -3 6 6 -3 4H8z','#8fa29c')+r(14,11,8,3,'#b8c0aa')+r(9,23,17,3,'#758b88')+r(33,20,7,3,'#b7bfaa');art+=tile(COAST.rock,b);
 b=shape('M1 7l7 -4 32 2 7 4 -4 5 -35 -1z',dark)+r(8,5,31,7,'#c8b18b')+r(13,6,24,1,'#e2c99c')+r(16,11,24,1,'#a18c6c')+r(4,6,4,5,'#b29b78');art+=tile(COAST.log,b);
 for(const[f,leaf,flower]of[[COAST.shrub,'#91805b','#c9a26e'],[COAST.shrubFresh,'#739457','#e2bd8b']]){b='';for(const[x,y]of[[3,9],[10,4],[18,8],[25,6]])b+=r(x,y,3,7,leaf)+r(x-2,y+2,3,2,leaf)+r(x+2,y+4,4,2,leaf)+r(x-1,y-1,4,3,flower);art+=tile(f,b);}
 art+=tile(COAST.grass,r(3,5,1,10,'#80935a')+r(6,2,1,12,'#b0b56b')+r(9,7,1,8,'#738b55')+r(12,4,1,10,'#a1a762'));
 art+=tile(COAST.shell,r(2,10,5,3,'#b79c7d')+r(3,8,4,3,'#f0dec0')+r(4,8,1,3,'#d5bb96')+r(11,5,3,3,'#f0dec0')+r(10,8,5,1,'#c0a481'));
 art+=tile(COAST.flowers,r(5,6,1,8,'#6d9256')+r(3,4,5,3,'#d98f97')+r(4,5,3,1,'#f0c4bb')+r(12,9,1,6,'#6d9256')+r(10,7,5,3,'#edc979')+r(11,8,3,1,'#f5e4ae'));
 art+=tile(COAST.rope,r(3,5,10,7,'#705b45')+r(4,4,8,2,'#d5c090')+r(2,7,12,2,'#d5c090')+r(4,11,8,2,'#d5c090')+r(6,7,4,2,woodDark));
 art+=tile(COAST.rail,r(6,1,3,15,dark)+r(7,2,1,13,woodLight)+r(0,5,16,2,'#d8bf91'));
 art+=tile(COAST.railMid,r(0,5,16,2,'#d8bf91'));
 art+=tile(COAST.tether,r(0,7,16,1,'#d8bf91')+r(12,5,3,1,'#d8bf91')+r(11,6,1,4,'#d8bf91')+r(12,10,3,1,'#d8bf91'));
 art+=tile(COAST.windSand,r(1,6,11,1,'#d4ba85')+r(6,8,13,1,'#f0dbaa')+r(17,5,14,1,'#d4ba85')+r(26,7,14,1,'#f0dbaa')+r(35,4,11,1,'#d4ba85'));
 for(const[f,num]of[[COAST.sign1,1],[COAST.sign2,2],[COAST.signArrow,3]]){b=r(7,6,2,10,woodDark)+r(1,0,14,10,dark)+r(2,1,12,7,'#d5bb83');b+=num===1?r(7,2,2,5,dark):num===2?r(5,2,5,1,dark)+r(9,3,1,2,dark)+r(5,5,5,1,dark)+r(5,6,1,1,dark)+r(5,7,5,1,dark):r(4,4,8,1,dark)+r(9,2,2,5,dark);art+=tile(f,b);}
 return `<svg xmlns="http://www.w3.org/2000/svg" width="384" height="256" shape-rendering="crispEdges">${art}</svg>\n`;
}
