/** V3.5.1 local 16px-grid art; separate atlas keeps all V3.5 buildings/deck artwork intact. */
export const POLISH_FIRST=1427,POLISH_COLUMNS=32;
export const POLISH={pool1:0,pool2:5,pool1Restored:160,pool2Restored:165,rocks:20,fanPalm:116,shrub:120,grass:123,flowers:124,shells:126,branch:244,sand:246,lowStones:280,grassBlue:282,grassGold:283,whiteFlowers:284};
export function poolPolishSvg(){
 const r=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`,p=(d,c)=>`<path d="${d}" fill="${c}"/>`;
 const tile=(n,b)=>`<g transform="translate(${n%32*16} ${Math.floor(n/32)*16})">${b}</g>`;
 const outline='#5b625c',stone='#b5b19b',light='#ded7b9',shade='#8a9388';let art='';
 // Same 80x80 footprint. Stepped outer silhouette and individually staggered capstones.
 // Both basins start at the same level; the activity, not these map images, simulates evaporation.
 for(const[id,recovered,num]of[[POLISH.pool1,false,1],[POLISH.pool2,false,2],[POLISH.pool1Restored,true,1],[POLISH.pool2Restored,true,2]]){
  let b=p('M13 3h54v3h6v6h4v54h-4v7h-7v4H14v-3H7v-7H3V14h4V7h6z',outline);
  b+=p('M14 5h51v3h7v7h3v49h-4v7h-8v3H16v-3H9v-8H5V16h4V9h5z',stone);
  // Underwater wall/shadow is a narrow continuous band, never a large empty grey rectangle.
  b+=p('M17 11h46v4h5v49h-5v4H17v-4h-5V16h5z','#667e7c');
  b+=p('M18 14h44v3h4v45h-4v3H18v-3h-4V18h4z',recovered?'#71c4d0':'#63b5c5');
  b+=r(17,19,46,38,recovered?'#87d4da':'#79cad4')+r(17,57,46,5,recovered?'#79cad4':'#6dc0ce');
  b+=r(18,16,44,2,recovered?'#c5eee5':'#b7e2dd')+r(15,20,2,34,'#a7dcda')+r(63,20,2,35,'#499aa9');
  // Long, sparse water lines cross tile boundaries to make one coherent surface.
  for(const[x,y,w]of[[23,25,12],[43,34,14],[25,46,10],[45,54,9]])b+=r(x,y,w,1,'#c4e9e2')+r(x+2,y+2,w-4,1,recovered?'#78c6ce':'#69b5c3');
  b+=r(21,59,6,2,'#82b9bf')+r(48,60,7,1,'#8abdc1');
  // Deliberately uneven joints on the rim, one-pixel highlights and darker front thickness.
  for(const[x,w]of[[15,14],[30,17],[48,16]])b+=r(x,5,w,6,light)+r(x,10,w,2,'#999e8d');
  for(const[y,h]of[[17,13],[31,14],[46,15]])b+=r(6,y,6,h,'#c8c4ab')+r(6,y,1,h,light)+r(68,y,6,h,'#acae98')+r(68,y,1,h,'#d3ceb3');
  for(const[x,w]of[[15,13],[29,15],[45,18]])b+=r(x,66,w,6,'#b7b69e')+r(x,66,w,2,light)+r(x,72,w,2,shade);
  b+=r(9,10,7,5,'#ccc6aa')+r(64,10,7,5,'#d1cbb0')+r(9,62,7,8,'#b8b89f')+r(63,63,8,7,'#b4b49c');
  // Small side gauge: fixed rim reference and changing cyan mark explain depth in top-down view.
  b+=r(68,29,5,25,'#646f65')+r(69,30,3,23,'#d1cdb1');
  for(const y of[32,38,44,50])b+=r(69,y,2,1,'#727c70');
  b+=r(68,recovered?34:43,5,2,recovered?'#73d5de':'#50a8bd');
  // One/two small inset dots mirror existing numbered boards without implying different starting levels.
  b+=r(34,6,11,4,num===1?'#698e94':'#b28a67')+r(37,7,2,2,'#e7dec0');if(num===2)b+=r(41,7,2,2,'#e7dec0');
  art+=tile(id,b);
 }
 // Existing solid rock groups retain their footprint/colliders; only the warm coastal artwork changes.
 art+=tile(POLISH.rocks,p('M2 25l4 -12 8 -6h12l6 10 9 -2 6 8 -3 7H6z',outline)+p('M5 24l4 -10 7 -4h8l5 12 10 -4 5 6 -3 4H8z','#a4a99b')+r(15,11,8,3,'#d0cbb3')+r(10,23,17,3,'#878f87')+r(33,20,7,3,'#c9c5ae'));
 // Low fan-palm groundcover: leaves, no new trunk or obstacle.
 let b=p('M23 41L6 37l-2 -5 15 3L5 25v-5l6 -2 11 13L15 15l3 -5 5 3 3 17 3 -18 5 -2 3 5 -8 18 12 -13 5 2v5L32 37l11 -4 2 5 -17 6z','#557d60');
 b+=p('M24 40L8 24l4 -1 12 14 -7 -21 3 -1 6 22 7 -22 2 1 -7 23 15 -15 -1 5 -13 13z','#8cac72')+r(23,39,5,5,'#9da770');art+=tile(POLISH.fanPalm,b);
 art+=tile(POLISH.shrub,p('M2 24v-8h4V9h7V5h8v5h6v7h4v9H2z','#65896a')+r(5,14,9,8,'#82a676')+r(14,9,7,11,'#9bb67c')+r(21,15,6,8,'#7da074')+r(9,24,15,3,'#557d61')+r(7,13,2,2,'#e4c793')+r(20,12,2,2,'#e6c5a1'));
 art+=tile(POLISH.grass,r(3,7,1,8,'#829b65')+r(7,3,1,12,'#a5b576')+r(9,8,1,7,'#628f6b')+r(12,5,1,10,'#8aa46d'));
 b='';for(const[x,y,c]of[[4,5,'#d7a4bf'],[13,9,'#f1d79a'],[22,4,'#afa8c9'],[28,11,'#e5e0bf']])b+=r(x,y+2,1,9-y/2|0,'#77996b')+r(x-2,y,5,3,c)+r(x,y+1,1,1,'#f8e6bf');art+=tile(POLISH.flowers,b);
 art+=tile(POLISH.shells,r(2,10,5,3,'#bba080')+r(3,8,4,3,'#f2e1c4')+r(4,8,1,3,'#d6b995')+r(10,4,4,2,'#dfb5a0')+r(11,6,3,2,'#f2d3bd')+r(10,8,5,1,'#c19f80'));
 art+=tile(POLISH.branch,p('M1 10l10 -2 4 -6h3l-2 6 14 -1 1 3 -13 2 4 3h-5l-4 -3 -11 1z','#a58f71')+r(3,9,10,1,'#d7be94')+r(18,8,10,1,'#dfcba3'));
 art+=tile(POLISH.sand,r(2,7,10,1,'#d4b984')+r(7,9,12,1,'#f3ddb0')+r(21,5,11,1,'#d8bd89')+r(31,7,10,1,'#f0dcac')+r(42,10,4,1,'#cfb687'));
 art+=tile(POLISH.lowStones,p('M1 12l3 -5h6l3 4 8 -6h6l4 6 -2 4H3z','#9e9f8d')+r(5,8,5,2,'#d6cfb4')+r(21,6,5,2,'#c9c4aa')+r(14,12,6,2,'#858e7e')+r(24,13,5,1,'#777f73'));
 art+=tile(POLISH.grassBlue,r(3,7,1,8,'#71977c')+r(6,3,1,12,'#95b79b')+r(10,6,1,9,'#6d8f72')+r(12,10,1,5,'#a8b98b'));
 art+=tile(POLISH.grassGold,r(3,6,1,9,'#a0a572')+r(5,3,1,12,'#bdc08a')+r(9,5,1,10,'#859b69')+r(12,8,1,7,'#b3b37a'));
 art+=tile(POLISH.whiteFlowers,r(4,5,1,10,'#75936a')+r(2,3,5,3,'#eee5c8')+r(4,4,1,1,'#d5b96e')+r(11,10,1,5,'#859d70')+r(9,8,5,3,'#d7c4d8'));
 return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="256" shape-rendering="crispEdges">${art}</svg>\n`;
}
