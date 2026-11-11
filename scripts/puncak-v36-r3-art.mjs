/** Local integer-pixel atlas. SVG source and PNG raster share the exact same RGBA pixels. */
import {deflateSync} from 'node:zlib';
export const FIRST=8531,COLS=32,TILECOUNT=320,PATH=144,STAIRS=192;
export const PALETTE=[
 ['#7f9484','#b5c0a1','#536e65','#98ac8b'],
 ['#829796','#c2caba','#506c74','#9eaf9d'],
 ['#8ba4b0','#d2dbd4','#536e82','#afc3c3'],
];
const rgba=hex=>[...hex.slice(1).match(/../g).map(n=>parseInt(n,16)),255];
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;}return(c^0xffffffff)>>>0;}
const chunk=(name,bytes)=>{const n=Buffer.from(name),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(bytes.length);crc.writeUInt32BE(crc32(Buffer.concat([n,bytes])));return Buffer.concat([len,n,bytes,crc]);};
export function mountainAtlas(){
 const width=512,height=160,pixels=Buffer.alloc(width*height*4);
 const dot=(x,y,c)=>{if(x>=0&&y>=0&&x<width&&y<height)pixels.set(rgba(c),(y*width+x)*4);};
 function tile(frame,draw,w=16,h=16){const ox=frame%COLS*16,oy=Math.floor(frame/COLS)*16;
  const p=(x,y,c)=>{if(x>=0&&y>=0&&x<w&&y<h)dot(ox+x,oy+y,c);};
  const r=(x,y,rw,rh,c)=>{for(let yy=y;yy<y+rh;yy++)for(let xx=x;xx<x+rw;xx++)p(xx,yy,c);};draw(p,r);
 }
 // Three rock strata, three fracture silhouettes, all 16 connected corner/edge masks.
 // Joined tile borders use common strata colours; variation is inside the tile, not a seam.
 for(let tier=0;tier<3;tier++)for(let variant=0;variant<3;variant++)for(let mask=0;mask<16;mask++){
  const [base,light,dark,moss]=PALETTE[tier];
  tile(tier*48+variant*16+mask,(p,r)=>{
   r(0,0,16,16,base);
   for(let y=2;y<14;y++)for(let x=2;x<14;x++){
    const facet=x+Math.floor(y/4)+(variant===1?3:variant===2?-2:0);
    if(facet>12&&facet<17)p(x,y,dark);
    else if(facet<7&&y<11)p(x,y,moss);
   }
   if(!(mask&1))for(let x=0;x<16;x++){
    const top=x<2||x>13?2:[2,3,2,4,3,2,3,4][Math.floor(x/2)+variant&7];
    for(let y=0;y<top;y++)p(x,y,light);
    if(x>2&&x<13)p(x,top,moss);
   }
   // Broken lower rock blends into scree instead of a continuous black wall foundation.
   if(!(mask&4)){r(0,14,16,2,moss);for(const[x,y]of[[2,13],[5,15],[9,13],[12,14]])r(x,y,2,1,light);}
   if(!(mask&8)){r(0,2,2,12,moss);r(1,5,1,5,light);}
   if(!(mask&2)){r(14,2,2,12,dark);r(14,10,1,3,moss);}
   // Irregular inner/outer corners and caps are mineral surfaces, with no masonry outline.
   if(!(mask&1)&&!(mask&8))r(0,0,2,2,moss);
   if(!(mask&1)&&!(mask&2))r(14,0,2,2,moss);
   if(!(mask&4)&&!(mask&8))r(0,14,2,2,base);
   if(!(mask&4)&&!(mask&2))r(14,14,2,2,base);
   if(variant===1){r(7,6,1,3,dark);r(6,9,1,3,dark);r(5,12,1,1,dark);}
   if(variant===2){r(3,9,4,1,light);r(9,3,1,3,dark);r(10,6,1,2,dark);}
  });
 }
 // Two restrained connected path surfaces. The rough shoulder exposes the terrain beneath.
 for(let gravel=0;gravel<2;gravel++)for(let mask=0;mask<16;mask++)tile(PATH+gravel*16+mask,(p,r)=>{
  const base=gravel?'#c4bca6':'#d6c3a1',light='#e6d8b8',edge='#acaa90';
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){
   const inset=y<3?2:y>12?2:1;
   if((mask&8||x>=inset)&&(mask&2||x<16-inset)&&(mask&1||y>=1)&&(mask&4||y<15))p(x,y,base);
  }
  if(!(mask&8)){r(2,5,1,3,edge);r(1,10,2,1,edge);}
  if(!(mask&2)){r(13,3,1,2,edge);r(13,12,2,1,edge);}
  if(!(mask&1))r(4,1,6,1,light);
  if(gravel){r(5,7,2,1,light);r(10,11,2,1,edge);}
 });
 // One joined 48x48 natural stair stamp. Unequal treads and sloped apron replace ladder bars.
 tile(STAIRS,(p,r)=>{
  r(0,0,48,48,'#b3b8a4');
  for(let y=0;y<48;y++){
   const shoulder=y<7?1:y>39?3:2;r(shoulder,y,48-shoulder*2,1,y<8?'#c9cbb3':y>39?'#c6b99e':'#98a89d');
  }
  for(const[y,left,w]of[[8,3,42],[15,4,41],[23,3,42],[31,4,40],[38,5,38]]){
   r(left,y,w,2,'#d9d9bf');r(left+1,y+2,w-2,3,'#b3bda7');r(left+1,y+5,w-2,1,'#718d8b');
  }
  for(const[x,y]of[[1,13],[44,25],[2,33],[42,5]])r(x,y,3,2,'#7a9180');
 },48,48);
 const rows=Buffer.alloc((width*4+1)*height);for(let y=0;y<height;y++)pixels.copy(rows,y*(width*4+1)+1,y*width*4,(y+1)*width*4);
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
 const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" shape-rendering="crispEdges">`;
 for(let y=0;y<height;y++)for(let x=0;x<width;){const i=(y*width+x)*4;if(!pixels[i+3]){x++;continue;}
  const color=pixels.subarray(i,i+3).toString('hex');let end=x+1;
  while(end<width){const j=(y*width+end)*4;if(!pixels[j+3]||pixels.subarray(j,j+3).toString('hex')!==color)break;end++;}
  svg+=`<rect x="${x}" y="${y}" width="${end-x}" height="1" fill="#${color}"/>`;x=end;
 }svg+='</svg>\n';
 return{width,height,pixels,png,svg};
}
