/** Local mountain pixel art. All coordinates are integer pixels on a 16px Tiled grid. */
export const MOUNTAIN_FIRST=1939,MOUNTAIN_COLUMNS=32;
export const MOUNTAIN={foot:0,slope:16,summit:32,moss:48,scree:64,bedrock:80,trail:96,stairs:112,
 cliff:128,pine:192,pineShort:196,pineBlue:200,boulder:208,boulderMoss:210,rock:212,pineSeedling:213,bench:216,sign:218,station:220,
 deck:320,fern:336,shrub:338,mossTuft:340,talus:342,white:344,yellow:345,purple:346,grass:347,frostGrass:348,cracks:349,
 pack:400,survey:404,rail:408,railMid:409,railEnd:410,cairn:412,screeBed:464};
export function mountainSvg(){
 const r=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`,p=(d,c)=>`<path d="${d}" fill="${c}"/>`;
 const tile=(n,b)=>`<g transform="translate(${n%32*16} ${Math.floor(n/32)*16})">${b}</g>`;
 const ink='#43555c',wood='#aa805d',woodDark='#665b4d',woodLight='#d1b48a';let art='';
 // Connected fields: broad quiet surfaces, irregular corner pixels, no repeating dot noise.
 for(const[start,base,light,shade]of[[0,'#91a38a','#afba9c','#7d927e'],[16,'#a1aca6','#bcc6b8','#8a9a96'],[32,'#aabdc3','#c9d4cc','#91a9b1'],[48,'#7d9780','#a6b595','#6d8876'],[64,'#97a9ae','#b8c7c5','#81989f'],[80,'#b9c9cb','#d4dcd4','#9fb4ba']])for(let mask=0;mask<16;mask++){
  const top=mask&1?0:2,bottom=mask&4?16:15;let b='';
  for(let y=top;y<bottom;y++){const lo=mask&8?0:y<4?3:y>11?2:1,hi=mask&2?16:y<3?12:y>12?14:15;b+=r(lo,y,hi-lo,1,base);}
  if(!(mask&1))b+=r(4,2,8,1,light);if(!(mask&4))b+=r(3,14,10,1,shade);if(!(mask&8))b+=r(1,6,1,5,light);if(!(mask&2))b+=r(14,5,1,6,shade);
  art+=tile(start+mask,b);
 }
 for(let mask=0;mask<16;mask++){
  let b='';for(let y=0;y<16;y++){const lo=mask&8?0:y<3?3:1,hi=mask&2?16:y>12?13:15;if(y>=(mask&1?0:1)&&y<(mask&4?16:15))b+=r(lo,y,hi-lo,1,'#d9c49e');}
  if(!(mask&8))b+=r(1,7,2,2,'#b4ac91');if(!(mask&2))b+=r(12,11,2,1,'#ab9f84');art+=tile(96+mask,b);
 }
 // Two existing 3x3 ramps receive one coherent 48px stair run, not nine repeated ladders.
 let b=r(2,0,44,48,'#758c8d');for(let y=0;y<48;y+=8)b+=r(3,y,42,2,'#d4d2b9')+r(3,y+2,42,4,'#b1bba9')+r(3,y+6,42,2,'#82958e');b+=r(1,0,2,48,'#8a9b90')+r(45,0,2,48,'#647c7e');art+=tile(112,b);
 // 16 joined 16x32 cliff columns: cap topology + four deliberately different fractures/heights.
 // Rock planes are vertical/diagonal; there are no brick courses running across every column.
 for(let variant=0;variant<4;variant++)for(let ends=0;ends<4;ends++){
  const n=variant*4+ends,top=[2,0,3,1][variant],left=ends&1?0:2,right=ends&2?16:14;
  b=r(left,top,right-left,31-top,'#536d79')+r(left,top,right-left,3,'#c5cebf')+r(left+1,top+3,right-left-2,5,'#8fa4a5');
  b+=p(`M${left} ${top+8}h${right-left-4}l-3 9 3 9h${left-right+4}z`,'#768e95');
  b+=p(`M${right-5} ${top+6}l-3 8 2 6 -3 9h5l2 -12z`,'#5d7a87');
  b+=r(left+2,top+5,5,1,'#aabbb5')+r(left+1,27,5,3,'#6a857d')+r(right-5,29,4,2,'#8f9f8a');
  if(variant===1)b+=p('M6 8h2v7H6v5H4v-1h1V13h1z','#455e69');
  if(variant===2)b+=r(3,12,4,1,'#b2c3be')+r(2,15,3,5,'#809b7e');
  if(variant===3)b+=p('M11 10h2v6h-2v6H9v-1h1v-7h1z','#435f6b');
  art+=tile(128+n,b);
 }
 function pine(frame,short=false,blue=false){const h=short?48:64,leaf=blue?'#658b87':'#4c7867',lit=blue?'#9db8a3':'#8ca77e',shadow=blue?'#416a70':'#355b54';
  let body=r(22,h-19,5,18,woodDark)+r(23,h-18,2,16,wood)+r(17,h-2,16,2,'#728b78');
  const tiers=short?[[23,2,9],[18,9,20],[13,18,29],[8,28,38]]:[[23,1,9],[18,10,19],[13,21,29],[7,34,40],[4,43,43]];
  for(const[x,y,w]of tiers){const cy=y+(short?11:15);body+=p(`M24 ${y}h3l${Math.floor(w/2)} ${cy-y-3}v3H${x}v-3z`,ink)+p(`M24 ${y+2}l${Math.floor(w/2)-2} ${cy-y-3}H${x+2}z`,leaf)+r(x+4,cy-2,w-8,2,shadow)+r(x+5,cy-5,Math.max(3,Math.floor(w/3)),1,lit);}
  return tile(frame,body);
 }
 art+=pine(192);art+=pine(196,true);art+=pine(200,false,true);
 for(const[frame,moss]of[[208,false],[210,true]]){
  b=p('M2 23l3 -12 7 -8h10l7 10 2 11 -6 6H7z',ink)+p('M5 22l4 -10 6 -6h6l4 9 3 8 -4 4H9z','#95a9ad')+p('M15 6h6l3 8 -9 6H8l1 -8z','#bfccc4')+p('M15 21l10 -6 3 8 -4 4H9z','#738e98')+r(16,11,1,7,'#829ba3');
  if(moss)b+=r(5,21,9,4,'#789477')+r(9,19,7,3,'#97ab86');art+=tile(frame,b);
 }
 art+=tile(212,p('M2 11l2 -6 5 -2 5 5 1 5H4z',ink)+p('M4 10l2 -5h3l4 5 -1 2H5z','#acbdb8')+r(5,6,4,1,'#d0d5c3'));
 art+=tile(213,r(7,11,2,5,woodDark)+p('M7 0h2l3 5H9l5 7H2l5 -7H4z','#375e56')+p('M8 2l2 3H7l4 5H4l4 -5H6z','#70947b')+r(5,10,6,1,'#a4b391'));
 art+=tile(216,r(1,5,30,4,woodDark)+r(2,4,28,3,wood)+r(2,4,28,1,woodLight)+r(3,9,26,3,woodLight)+r(4,12,3,4,woodDark)+r(25,12,3,4,woodDark));
 art+=tile(218,r(7,7,2,9,woodDark)+r(1,0,14,10,ink)+r(2,1,12,7,woodLight)+r(4,4,7,1,'#506c73')+r(8,2,2,5,'#506c73'));
 // Open observation equipment bench with weather board; base remains at the old table collider.
 b=r(3,2,2,24,woodDark)+r(27,2,2,24,woodDark)+r(4,1,24,16,woodDark)+r(5,2,22,14,'#57737a')+r(7,5,7,2,'#c3d5c7')+r(15,4,3,3,'#c3d5c7')+r(7,10,10,1,'#9db9b7')+r(21,4,3,9,'#d4d7bb')+r(22,8,1,4,'#c47f65')+r(1,23,30,4,woodDark)+r(2,22,28,3,wood)+r(2,22,28,1,woodLight)+r(4,27,3,5,woodDark)+r(25,27,3,5,woodDark)+r(6,18,8,4,'#b0d2d0')+r(18,18,8,3,'#ece1c3');art+=tile(220,b);
 // Small open timber lookout, no walls or roof. Steps face the existing mission clearing.
 b='';for(let y=2;y<76;y+=6)b+=r(2,y,108,5,(y/6|0)%3===0?'#bb9a72':'#af8c66')+r(3,y,106,1,'#d3b991');b+=r(0,1,2,75,woodDark)+r(110,1,2,75,woodDark)+r(1,0,110,2,woodLight)+r(2,75,108,3,woodDark)+r(5,3,2,68,woodDark)+r(104,3,2,68,woodDark);
 for(const y of[17,47])b+=r(24,y,1,5,woodDark)+r(69,y,1,5,woodDark);art+=tile(320,b);
 art+=tile(336,p('M14 29L2 16v-4l11 10L7 5h3l6 16 5 -18h3l-5 19 11 -9v5L18 30z','#4e7c68')+r(15,12,2,19,'#92aa7a')+r(5,15,7,2,'#8ca47d')+r(21,14,8,2,'#87a480'));
 art+=tile(338,p('M2 23v-9h4V8h8V5h8v5h6v8h3v8H4z','#527c70')+r(7,12,10,9,'#73937d')+r(16,9,7,10,'#91a78d')+r(10,24,15,3,'#436d66'));
 art+=tile(340,r(2,10,8,5,'#6f927a')+r(8,7,8,7,'#87a284')+r(17,9,9,6,'#75967e')+r(20,7,5,2,'#a9bb94'));
 art+=tile(342,p('M1 12l3 -6h7l4 4 7 -6h5l4 8 -4 3H4z','#7c9399')+r(5,7,5,2,'#b6c7bf')+r(23,5,4,2,'#ced6c8')+r(15,12,7,2,'#9cafa9'));
 for(const[frame,c]of[[344,'#e5e8d5'],[345,'#e7cd8d'],[346,'#b7abcd']])art+=tile(frame,r(4,6,1,9,'#72927b')+r(2,4,5,3,c)+r(4,5,1,1,'#d2b879')+r(11,10,1,5,'#7f9b7b')+r(9,8,5,3,c));
 for(const[frame,leaf,lit]of[[347,'#63836c','#9eac85'],[348,'#7f9e98','#b1c3a8']])art+=tile(frame,r(3,7,1,8,leaf)+r(6,3,1,12,lit)+r(10,5,1,10,leaf)+r(12,10,1,5,lit));
 art+=tile(349,p('M2 4h5v2h3v4h4v1H9V7H6V5H2z','#7e969e')+r(6,3,4,1,'#c7d1cb'));
 art+=tile(400,r(5,15,19,13,'#636e5d')+r(7,8,14,18,'#88967a')+r(9,9,10,7,'#b0b493')+r(8,22,14,3,woodDark)+r(21,16,5,10,'#c2b493')+r(4,26,22,3,'#68816e'));
 art+=tile(404,r(13,7,3,24,woodDark)+r(9,12,12,3,'#c7cdbb')+r(10,2,10,12,ink)+r(11,3,8,10,'#bed2cf')+r(13,6,4,4,'#81aaaf')+r(6,29,18,2,'#6e8583'));
 art+=tile(408,r(1,1,3,15,woodDark)+r(2,2,1,13,woodLight)+r(0,6,16,3,woodDark)+r(0,6,16,1,woodLight));
 art+=tile(409,r(0,6,16,3,woodDark)+r(0,6,16,1,woodLight));
 art+=tile(410,r(12,1,3,15,woodDark)+r(13,2,1,13,woodLight)+r(0,6,16,3,woodDark)+r(0,6,16,1,woodLight));
 art+=tile(412,p('M2 28l5 -7h5l-2 -5 4 -5h5l-2 -5 4 -3 4 4 -1 5 5 6 -2 5 4 4 -3 4H5z',ink)+r(16,12,9,6,'#b8c7bc')+r(10,22,16,5,'#97afa7')+r(20,5,3,5,'#c6d0c0')+r(12,23,11,1,'#d3d9c5'));
 art+=tile(464,r(2,11,5,3,'#8a9b9a')+r(3,10,4,1,'#c0cdc2')+r(12,7,7,4,'#8ba0a2')+r(13,6,5,1,'#bdcbc4')+r(25,11,5,3,'#8a9b9a')+r(27,10,3,1,'#c7d0c0')+r(37,7,6,3,'#8ea4a7')+r(37,6,4,1,'#c7d3cb'));
 return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="256" shape-rendering="crispEdges">${art}</svg>\n`;
}
