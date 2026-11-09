/** Actual Phaser review of V3.5.1. Before captures must run before switching the active map. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {openWorldBrowser,wait} from './world-browser-session.mjs';
import {walkCoastRoute} from './coast-route-browser.mjs';
const before=process.argv.includes('--before'),out=resolve('world/previews/v35-pantai-pool-polish');
mkdirSync(out,{recursive:true});
const read=p=>JSON.parse(readFileSync(p,'utf8')),save=(n,v)=>writeFileSync(resolve(out,n),JSON.stringify(v,null,2)+'\n');
const cameras=[['pools',57.5,104.5,3,[57,104]],['pool-1',52.5,104.5,5,[57,104]],['pool-2',63.5,104.5,5,[57,104]],['experiment',57.5,103,2.3,[57,104]],['sand-rocks',44,125,3,[45,123]],['vegetation',35,104,3,[32,108]],['overview',45,108,.8,[57,104]]];
const s=await openWorldBrowser(process.env.WORLD_URL??'http://localhost:5173/'),{ev,call,until,key,begin,place,shot}=s;
async function capture(prefix){
 const meta={};await ev('window.__worldCheck.terkunci=true');
 for(const[n,x,y,z,feet]of cameras){await place(feet[0]*16+8,feet[1]*16+8);await ev(`(()=>{const s=window.__worldCheck;s.judulWilayah.setVisible(false);s.cameras.main.stopFollow().setZoom(${z}).centerOn(${x*16},${y*16})})()`);await wait(180);await shot(resolve(out,`${prefix}-${n}.png`));meta[n]=await ev('({x:window.__worldCheck.cameras.main.scrollX,y:window.__worldCheck.cameras.main.scrollY,zoom:window.__worldCheck.cameras.main.zoom,width:1280,height:720})');}
 if(!before)assert.deepEqual(meta,read(resolve(out,'cameras-before.json')));
 save(`cameras-${prefix}.json`,meta);
 await ev('(()=>{const s=window.__worldCheck;s.terkunci=false;s.judulWilayah.setVisible(true);s.cameras.main.setZoom(3).startFollow(s.pemain,true,.14,.14)})()');
}
try{
 await begin();assert.equal(await ev("window.__worldCheck.cache.tilemap.get('pulau-tirta').data.properties.find(p=>p.name==='worldVersion').value"),before?'3.5-Pantai-B1':'3.5.1-Pool-Nature');
 await capture(before?'before':'after');
 const map=before?'pulau-tirta-v35.json':'pulau-tirta-v351.json';save(`${before?'before':'after'}-source.json`,{map,sha256:createHash('sha256').update(readFileSync('public/maps/'+map)).digest('hex')});
 if(!before&&!process.argv.includes('--capture-only')){
  const result={worldVersion:'3.5.1-Pool-Nature',identicalCameras:7};
  await place(76*16+8,97*16+8);
  const goals=[['Gerbang',75,98],['Kolam 1 selatan',52,107],['Kolam 1 barat',49,104],['Kolam 2 timur',66,104],['Kolam 2 selatan',63,107],['Dermaga',31,120],['Interaksi',57,104]].map(([label,x,y])=>({label,tile:[x,y],pauseMs:100}));
  result.walk=await ev('('+walkCoastRoute.toString()+')('+JSON.stringify(goals)+')',180000);assert.equal(result.walk.visited.length,goals.length);
  await place(920,1672);const ripple=()=>ev('window.__worldCheck.living.water.slice(0,2).map(i=>({x:i.x,y:i.y,a:i.alpha,v:i.visible}))');const first=await ripple();await wait(450);assert.notDeepEqual(await ripple(),first);assert((await ripple()).every(i=>i.v));result.existingBasinRipplesAnimate=true;
  await place(31*16+8,122*16+8);await key('s','KeyS',83,450);assert(await ev('window.__worldCheck.pemain.y<123*16'));result.seaCollision=true;
  await place(920,1672);await key('e','KeyE',69);await until("!!document.querySelector('#dialog-misi[open] .aktivitas.pantai')",'Pantai activity');
  const pos=await ev('({x:window.__worldCheck.pemain.x,y:window.__worldCheck.pemain.y})');await key('d','KeyD',68,150);assert.deepEqual(await ev('({x:window.__worldCheck.pemain.x,y:window.__worldCheck.pemain.y})'),pos);
  const levels=()=>ev("Array.from(document.querySelectorAll('.aktivitas.pantai .kolam')).map(k=>Number(k.children[2].getAttribute('height')))");
  const aim=async value=>ev(`(()=>{const e=document.getElementById('arah-cermin');e.value='${value}';e.dispatchEvent(new Event('input',{bubbles:true}))})()`);
  const start=await levels();assert(Math.abs(start[0]-start[1])<1);await aim(22);await wait(1800);const left=await levels();assert(left[0]<left[1]-3);await ev("Array.from(document.querySelectorAll('.aktivitas.pantai button')).find(b=>b.textContent==='Isi ulang kolam').click()");await aim(78);await wait(1800);const right=await levels();assert(right[1]<right[0]-3);result.evaporation={equalStart:start,leftIlluminated:left,rightIlluminated:right,resetAndBothDirections:true};
  await shot(resolve(out,'mission-evaporation.png'),true);await until("!!document.querySelector('#dialog-misi .pilihan-alasan button')",'evaporation observation',60000);
  const answer=read('content/misi.json').misi.find(m=>m.id==='misi-1').pilihan.find(p=>p.benar).teks;
  await ev(`Array.from(document.querySelectorAll('#dialog-misi .pilihan-alasan button')).find(b=>b.textContent===${JSON.stringify(answer)}).click()`);await until("!!document.querySelector('#dialog-misi .pulih')",'recovery');await shot(resolve(out,'mission-complete.png'),true);
  assert.equal(await ev("JSON.parse(localStorage.getItem('pulau-tirta:progres:v1')).status['misi-1']"),'selesai');await ev("document.querySelector('#dialog-misi .pulih button').click()");await wait(2300);await capture('restored');result.eMissionDialogueRecovery=true;
  await call('Page.reload');await wait(500);await begin();assert(await ev("window.__worldCheck.pemulihan.get('misi-1').every(l=>l.visible)"));result.recoveryPersistsAfterReload=true;
  assert.deepEqual(s.errors,[]);assert.deepEqual(s.httpErrors,[]);save('browser-evidence.json',result);
 }
 assert.deepEqual(s.errors,[]);assert.deepEqual(s.httpErrors,[]);console.log(`PASS ${before?'before V3.5':'V3.5.1'} Phaser captures${!before&&!process.argv.includes('--capture-only')?', route, sea collision, both illuminated pools/reset, M1/recovery and reload':''}`);
}finally{await s.close();}
