/** Native 16px integer-pixel art. No external assets, resampling, or antialiasing. */
import {deflateSync} from 'node:zlib';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
export const FRAME=20,FRAMES_PER_DIRECTION=7;
export function explorerSheet(){
 const width=112,height=64,pixels=Buffer.alloc(width*height*4);
 const colors={ink:'#302c32',hair:'#493128',hairLight:'#71503a',skin:'#e6a56b',light:'#f5c58b',olive:'#657545',leaf:'#8c9a58',cream:'#f2deb0',pants:'#aa8458',boot:'#554338',teal:'#309b9c',scarf:'#65c5be',bag:'#9c633b',bagLight:'#c18c51',eye:'#332a30'};
 for(let direction=0;direction<4;direction++)for(let frame=0;frame<7;frame++){
  const walking=frame>=3,step=walking?[0,1,0,-1][frame-3]:0,blink=frame===2;
  const r=(x,y,w,h,c)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
   if(xx<0||xx>=16||yy<0||yy>=16)throw Error('Player art outside frame');
   const at=((direction*16+yy)*width+frame*16+xx)*4;
   pixels.set([...colors[c].slice(1).match(/../g).map(v=>parseInt(v,16)),255],at);
  }};
  const side=direction>=2,back=direction===1;
  // Every frame shares the same ground baseline (bottom row 13).
  r(5,10,6,3,'ink');r(5,11,2,2,'pants');r(9,11,2,2,'pants');
  r(4,13-(step===1?1:0),3,1,'boot');r(9,13-(step===-1?1:0),3,1,'boot');
  if(side){
   const sway=frame===1||step===1?1:0;
   r(3,7+sway,4,5,'ink');r(3,8+sway,3,3,'bag');r(4,8+sway,2,1,'bagLight');
   r(6,7,5,5,'ink');r(7,8,3,3,'olive');r(9,9,2,2,'cream');
   r(7,9+step,2,3,'ink');r(8,10+step,1,1,'skin');
  }else{
   r(4,7,8,5,'ink');r(5,8,6,3,'olive');r(7,8,2,3,'cream');
   r(3,8+step,2,3,'ink');r(3,10+step,2,1,'skin');
   r(11,8-step,2,3,'ink');r(11,10-step,2,1,'skin');
   if(back){const bx=frame===1||step===1?5:4;r(bx,7,8,6,'ink');r(bx+1,8,6,4,'bag');r(bx+2,8,4,1,'bagLight');r(bx+2,10,4,2,'bagLight');r(bx+3,10,2,1,'bag');}
   else{r(5,8,1,3,'bagLight');r(10,8,1,3,'bagLight');r(5,10,1,1,'bag');r(10,10,1,1,'bag');}
  }
  // Messy asymmetric hair silhouette and a compact, readable face.
  r(4,1,7,1,'ink');r(3,2,9,4,'ink');r(4,2,7,4,'hair');r(5,0,2,2,'hair');r(10,1,2,2,'hair');r(4,2,3,1,'hairLight');
  if(!back){
   r(side?7:4,4,side?5:7,3,'skin');r(side?8:5,4,side?3:5,1,'light');
   r(4,3,3,2,'hair');r(7,3,2,1,'hair');
   if(side){r(10,5,1,1,blink?'skin':'eye');r(11,5,1,1,'skin');}
   else{r(5,5,1,1,blink?'skin':'eye');r(9,5,1,1,blink?'skin':'eye');r(7,6,1,1,'hairLight');}
  }else{r(4,5,7,2,'hair');r(5,6,5,1,'hairLight');}
  r(side?7:5,7,side?4:6,1,'teal');r(side?7:5,7,2,1,'scarf');
  if(!back)r(side?6:9,8,2,frame===1||step===1?2:1,'teal');
  // Left is a pixel-for-pixel mirrored side pose, not a transform of the physics body.
  if(direction===2)for(let y=0;y<16;y++)for(let x=0;x<8;x++){
   const a=((direction*16+y)*width+frame*16+x)*4,b=((direction*16+y)*width+frame*16+15-x)*4;
   for(let c=0;c<4;c++){const v=pixels[a+c];pixels[a+c]=pixels[b+c];pixels[b+c]=v;}
  }
 }
 const crc=b=>{let c=0xffffffff;for(const v of b){c^=v;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;}return(c^0xffffffff)>>>0;};
 const chunk=(name,b)=>{const n=Buffer.from(name),head=Buffer.alloc(4),tail=Buffer.alloc(4);head.writeUInt32BE(b.length);tail.writeUInt32BE(crc(Buffer.concat([n,b])));return Buffer.concat([head,n,b,tail]);};
 // Enlarge the approved design offline with nearest-neighbor integer pixel writes.
 // The runtime stays at scale 1; every frame has a planted foot ending at row 17.
 const outWidth=140,outHeight=80;
 const header=Buffer.alloc(13);header.writeUInt32BE(outWidth);header.writeUInt32BE(outHeight,4);header[8]=8;header[9]=6;
 const scan=Buffer.alloc((outWidth*4+1)*outHeight);
 for(let y=0;y<outHeight;y++)for(let x=0;x<outWidth;x++){
  const sx=Math.floor(x/20)*16+Math.floor(x%20*16/20),sy=Math.floor(y/20)*16+Math.floor(y%20*16/20);
  pixels.copy(scan,y*(outWidth*4+1)+1+x*4,(sy*width+sx)*4,(sy*width+sx)*4+4);
 }
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(scan)),chunk('IEND',Buffer.alloc(0))]);
}
const target='public/assets/player/tirta-explorer.png',png=explorerSheet();
if(process.argv.includes('--check')){if(!readFileSync(target).equals(png))throw Error('Player spritesheet out of date');}
else{mkdirSync('public/assets/player',{recursive:true});writeFileSync(target,png);}
