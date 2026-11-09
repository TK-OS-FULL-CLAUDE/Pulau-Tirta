import {colorAtlasSvg} from './village-a5-color.mjs';
/** Hand-authored pixel-grid objects, using the wood/foliage palette of the local village. */
export function villagePropsSvg(){
 const outline='#4e4038',wood='#a36f4d',light='#d0a06c',dark='#79543f';
 const rect=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
 const group=(x,y,body)=>`<g transform="translate(${x} ${y})">${body}</g>`;
 const crate=(x,y)=>group(x,y,rect(0,0,12,10,outline)+rect(1,1,10,8,light)+rect(2,3,8,2,dark)+rect(2,7,8,1,wood));
 let art='';
 // 0..2 /16..18 /32..34: shade tree. Leaf outline has stepped pixel contours.
 art+=group(0,0,`<path d="M17 29h14v5h-4v11h-7v-8h-3z" fill="${outline}"/>`+rect(21,29,4,14,wood)+rect(24,30,2,14,dark)+
 `<path d="M17 1h14v3h7v4h5v7h3v9h-4v6h-7v3H12v-3H5v-5H2V14h4V8h5V4h6z" fill="${outline}"/>`+
 `<path d="M17 4h14v3h7v5h4v11h-4v5h-7v2H13v-3H8v-4H5v-8h5v-5h7z" fill="#4e8050"/>`+
 `<path d="M17 5h12v3h8v7h-5v4H21v4H10V12h7z" fill="#76a75c"/>`+
 `<path d="M18 7h10v3h-5v4H12v-3h6z" fill="#a3c578"/>`+
 rect(32,20,7,5,'#63964f')+rect(14,24,8,3,'#64994f')+rect(27,8,3,2,'#8fba6b')+rect(20,43,10,2,'#679a57'));
 // 4,5/20,21: a little pergola with a shaded seat, smaller than a house.
 art+=group(64,0,rect(1,3,30,3,outline)+rect(3,6,2,25,dark)+rect(27,6,2,25,dark)+rect(4,7,1,23,light)+rect(28,7,1,23,wood)+
 rect(0,0,32,3,outline)+rect(1,1,30,1,light)+[5,11,17,23,29].map(x=>rect(x,3,2,7,wood)).join('')+
 rect(4,20,24,8,outline)+rect(5,21,22,2,light)+rect(5,25,22,2,wood)+rect(7,28,2,3,dark)+rect(24,28,2,3,dark)+
 rect(1,4,9,3,'#558448')+rect(5,6,6,3,'#79a658')+rect(23,4,8,3,'#79a658'));
 // 7,8/23,24: two-wheel produce cart with handles and vegetable baskets.
 art+=group(112,0,rect(1,14,30,3,outline)+rect(3,17,25,10,outline)+rect(4,18,23,8,wood)+rect(5,20,21,2,light)+rect(5,24,21,1,dark)+rect(7,27,5,5,outline)+rect(23,27,5,5,outline)+rect(8,28,3,2,wood)+rect(24,28,3,2,wood)+rect(28,8,2,10,wood)+
 crate(4,8)+crate(16,8)+rect(6,6,7,4,'#69934d')+rect(8,5,2,2,'#8ab56c')+rect(18,7,7,4,'#d39a47')+rect(20,5,2,3,'#709d53'));
 // 10..12 /26..28: harvest rack with a lean canvas roof. No extra house/interior.
 art+=group(160,0,rect(2,9,2,22,dark)+rect(43,9,2,22,dark)+rect(3,10,1,20,light)+rect(44,10,1,20,wood)+
 `<path d="M2 2h42l4 11H0z" fill="${outline}"/><path d="M3 3h39l3 8H2z" fill="#c5ad7f"/>`+
 rect(8,4,1,7,'#a78d65')+rect(24,4,1,7,'#a78d65')+rect(38,4,1,7,'#a78d65')+rect(3,17,41,2,outline)+rect(4,18,39,1,light)+rect(3,29,41,2,dark)+crate(6,20)+crate(22,20)+
 rect(35,20,7,8,outline)+rect(36,21,5,6,'#bb8754')+rect(36,23,5,1,light));
 // 52,53: washing/sorting table. Medium shape with an enamel basin and folded cloth.
 art+=group(64,48,rect(1,5,30,8,outline)+rect(2,6,28,5,wood)+rect(2,6,28,1,light)+rect(4,13,2,3,dark)+rect(26,13,2,3,dark)+rect(5,1,12,6,outline)+rect(6,2,10,4,'#abbca3')+rect(7,3,8,2,'#537d86')+rect(21,2,7,4,'#d0c59e')+rect(22,4,7,2,'#a99b78'));
 // 55,56: wooden planter with leaf/flower silhouettes, already grown household plants.
 art+=group(112,48,rect(1,8,30,8,outline)+rect(2,9,28,6,wood)+rect(3,10,26,1,light)+rect(6,4,3,6,'#4c7447')+rect(16,3,3,7,'#4c7447')+rect(25,4,2,6,'#4c7447')+rect(3,3,5,4,'#74a45d')+rect(8,1,4,5,'#93b96d')+rect(13,2,5,4,'#74a45d')+rect(18,1,4,4,'#93b96d')+rect(23,3,6,4,'#74a45d')+rect(5,1,3,3,'#e4b36c')+rect(17,1,3,3,'#e1c893')+rect(25,2,3,3,'#ce8162'));
 // 74..76/90..92: household drying line; only the two bottom posts are solid.
 art+=group(160,64,rect(1,2,2,29,dark)+rect(45,2,2,29,dark)+rect(2,3,44,1,outline)+rect(8,3,1,3,light)+rect(21,3,1,3,light)+rect(35,3,1,3,light)+
 `<path d="M6 5h10v4h-2v11H8V9H6z" fill="#c8bf9b"/><path d="M20 5h10v15H20z" fill="#b4c4b0"/><path d="M34 5h9v4h-2v10h-5V9h-2z" fill="#d8b579"/>`+
 rect(8,17,6,2,'#a99b77')+rect(22,17,6,2,'#8aa58e')+rect(36,16,5,2,'#b89460'));
 return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="128" shape-rendering="crispEdges">${art}${colorAtlasSvg()}</svg>\n`;
}
