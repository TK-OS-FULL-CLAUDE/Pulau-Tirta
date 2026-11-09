/** Verify gallery and generate comparison images from real game captures, never mockups. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {openWorldBrowser} from './world-browser-session.mjs';
const dir='world/previews/v35-pantai-pool-polish/',read=p=>JSON.parse(readFileSync(dir+p,'utf8'));
assert.deepEqual(read('cameras-before.json'),read('cameras-after.json'));assert.deepEqual(read('cameras-before.json'),read('cameras-restored.json'));
assert.equal(read('after-source.json').sha256,createHash('sha256').update(readFileSync('public/maps/pulau-tirta-v351.json')).digest('hex'));
const s=await openWorldBrowser(new URL(dir+'review.html',process.env.WORLD_URL??'http://localhost:5173/').href);
try{
 await s.until('[...document.images].every(i=>i.complete&&i.naturalWidth>0)','review images');
 for(const area of ['pools','pool-1','pool-2','experiment','sand-rocks','vegetation','overview'])for(const state of['design','recovery']){
  await s.ev(`document.getElementById('area').value='${area}';document.getElementById('state').value='${state}';document.getElementById('area').dispatchEvent(new Event('change'))`);await s.until('[...document.images].every(i=>i.complete&&i.naturalWidth>0)',area+'/'+state);
 }
 for(const[area,file]of[['pools','comparison-pools.png'],['vegetation','comparison-nature.png']])await s.png(resolve(dir,file),`(async()=>{const images=await Promise.all(['before','after'].map(state=>new Promise((yes,no)=>{const i=new Image();i.onload=()=>yes(i);i.onerror=no;i.src=state+'-${area}.png'})));const c=document.createElement('canvas');c.width=images[0].width*2;c.height=images[0].height+44;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.fillStyle='#183b3f';x.fillRect(0,0,c.width,c.height);x.fillStyle='#f5ead3';x.font='22px system-ui';x.fillText('V3.5 · sebelum',16,30);x.fillText('V3.5.1 · sesudah',images[0].width+16,30);images.forEach((i,n)=>x.drawImage(i,n*i.width,44));return c.toDataURL('image/png').split(',')[1]})()`);
 await s.ev("document.getElementById('area').value='pools';document.getElementById('state').value='design';document.getElementById('area').dispatchEvent(new Event('change'))");
 await s.until('[...document.images].every(i=>i.complete&&i.naturalWidth>0)','final gallery');await s.shot(resolve(dir,'review-desktop.png'),true);
 assert.deepEqual(s.errors,[]);assert.deepEqual(s.httpErrors,[]);writeFileSync(dir+'review-evidence.json',JSON.stringify({identicalCameraViews:7,comparisonModesTested:14,allGalleryImagesLoaded:true,sourceMapHashMatches:true,comparisons:['comparison-pools.png','comparison-nature.png']},null,2)+'\n');console.log('PASS gallery,14 comparisons,7 identical cameras and final map hash');
}finally{await s.close();}
