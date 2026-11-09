/** Isolated Chrome/CDP review of the integrated game. No browser dependency or app debug globals. */
import assert from 'node:assert/strict';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {createHash} from 'node:crypto';
import {walkVillageRoute} from './village-route-browser.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'world/previews/v34-a5');
mkdirSync(out,{recursive:true});
const colorReview=process.argv.includes('--color-review');
const reference=process.argv.includes('--reference'),review=process.argv.includes('--review')||colorReview,production=process.argv.includes('--production');
const mapFile=`pulau-tirta-v34-${reference?'a4':'a5'}.json`,url=process.env.WORLD_URL??`http://localhost:5173/${review?'world/previews/v34-a5/'+(colorReview?'color-polish/':'')+'review.html':''}`;
const save=(file,obj)=>writeFileSync(resolve(out,file),JSON.stringify(obj,null,2)+'\n');
const sha=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const chrome=process.env.CHROME_PATH??['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
assert(chrome,'Chrome/Edge tidak ditemukan.');assert((await fetch(url)).ok,'Dev server belum siap.');
const port=await new Promise(r=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const profile=mkdtempSync(join(tmpdir(),'tirta-a5-'));
const browser=spawn(chrome,['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--use-angle=swiftshader','--enable-unsafe-swiftshader','about:blank'],{windowsHide:true,stdio:'ignore'});
let ws;
try{
 let tabs;for(let n=0;n<100;n++){try{tabs=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();if(tabs.some(t=>t.type==='page'))break;}catch{}await wait(100);}
 assert(tabs?.length,'Chrome debugging unavailable');ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((yes,no)=>{ws.onopen=yes;ws.onerror=no;});
 let id=0;const pending=new Map(),errors=[],httpErrors=[];
 ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.no(m.error):p.yes(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);else if(m.method==='Network.responseReceived'&&m.params.response.status>=400)httpErrors.push(m.params.response.url);};
 const call=(method,params={},timeout=20000)=>new Promise((yes,no)=>{const key=++id,timer=setTimeout(()=>{pending.delete(key);no(Error('CDP timeout '+method));},timeout);pending.set(key,{yes,no,timer});ws.send(JSON.stringify({id:key,method,params}));});
 const ev=async(code,timeout)=>{const r=await call('Runtime.evaluate',{expression:code,returnByValue:true,awaitPromise:true},timeout);assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
 const until=async(code,label,timeout=15000)=>{const end=Date.now()+timeout;while(Date.now()<end){if(await ev(code))return;await wait(100);}throw Error('Timeout '+label);};
 const png=async(file,code)=>writeFileSync(resolve(out,file),Buffer.from(await ev(code),'base64'));
 const shot=async file=>{const clip=await ev(`(()=>{const c=document.querySelector('canvas'),b=c.getBoundingClientRect(),s=Math.min(b.width/c.width,b.height/c.height),w=c.width*s,h=c.height*s;return{x:b.x+(b.width-w)/2,y:b.y+(b.height-h)/2,width:w,height:h,scale:1}})()`);writeFileSync(resolve(out,file),(Buffer.from((await call('Page.captureScreenshot',{format:'png',clip})).data,'base64')));};
 const fullShot=async file=>writeFileSync(resolve(out,file),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 const attach=async()=>until(`(async()=>{const e=performance.getEntriesByType('resource').find(e=>/\\/src\\/game\\/world\\.ts(?:\\?|$)/.test(e.name));if(!e)return false;if(!window.__worldAttachStarted){const{DuniaScene}=await import(e.name),old=DuniaScene.prototype.inputTerhalang;DuniaScene.prototype.inputTerhalang=function(...a){window.__worldCheck=this;DuniaScene.prototype.inputTerhalang=old;return old.apply(this,a)};window.__worldAttachStarted=true;}return !!window.__worldCheck?.pemain;})()`,'world ready');
 const key=async(k,code,vk,ms=100)=>{await call('Input.dispatchKeyEvent',{type:'keyDown',key:k,code,windowsVirtualKeyCode:vk});await wait(ms);await call('Input.dispatchKeyEvent',{type:'keyUp',key:k,code,windowsVirtualKeyCode:vk});await wait(100);};
 const begin=async()=>{
  await attach();
  if(await ev("!!document.querySelector('#layar-judul[open]')"))await ev("document.querySelector('#layar-judul .tombol-besar').click()");
  await wait(300);
  for(let n=0;n<16&&await ev("!!document.querySelector('#kotak-dialog[open]')");n++){await ev("document.querySelector('#kotak-dialog .kotak-lanjut').click()");await wait(290);}
  await until('!window.__worldCheck.terkunci','world unlocked');await ev('document.activeElement?.blur()');
 };
 const place=async(x,y)=>{await ev(`document.activeElement?.blur();window.__worldCheck.pemain.setPosition(${x},${y});window.__worldCheck.perbaruiWilayah();void 0`);await wait(250);};
 const record=async(action)=>{
  await ev(`new Promise(resolve=>{const c=document.querySelector('canvas'),copy=document.createElement('canvas');copy.width=c.width;copy.height=c.height;const x=copy.getContext('2d'),game=window.__worldCheck.game;let last=-Infinity;const paint=()=>{const now=performance.now();if(now-last<60)return;last=now;x.drawImage(c,0,0)};game.events.once('postrender',()=>{paint();const stream=copy.captureStream(15),parts=[],r=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:750000});r.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};window.__capture={r,parts,stream,game,paint};game.events.on('postrender',paint);r.start();resolve(true)})})`);
  await action();
  const bytes=await ev(`new Promise(resolve=>{const c=window.__capture;c.r.onstop=()=>{c.stream.getTracks().forEach(t=>t.stop());c.game.events.off('postrender',c.paint);const f=new FileReader();f.onload=()=>resolve(f.result.split(',')[1]);f.readAsDataURL(new Blob(c.parts,{type:'video/webm'}))};c.r.stop()})`);
  writeFileSync(resolve(out,'village-a5-walkthrough.webm'),Buffer.from(bytes,'base64'));
 };
 const cameras=[['overview',95.5,76.5,1],['plaza-market',93.5,76.5,2],['market-detail',83.5,74.5,3],['well-detail',94,76,3],['homes-north',96,64.5,2],['north-courtyard',99,61,3],['homes-south',97,90,2],['homes-east',113.5,81,3],['farming',87,91,3],['road-spine',101,86,3]];
 const capture=async(festival=false)=>{
  const metadata={};await ev('window.__worldCheck.terkunci=true');
  for(const[name,cx,cy,z]of cameras){
   await place(1544,1272);await ev(`(()=>{const s=window.__worldCheck;s.judulWilayah.setVisible(false);s.cameras.main.stopFollow().setZoom(${z}).centerOn(${cx*16},${cy*16})})()`);await wait(180);
   await shot(`${reference?'before':festival?'festival':'after'}-${name}.png`);metadata[name]=await ev('({x:window.__worldCheck.cameras.main.scrollX,y:window.__worldCheck.cameras.main.scrollY,zoom:window.__worldCheck.cameras.main.zoom,width:1280,height:720})');
  }
  if(!reference)assert.deepEqual(metadata,JSON.parse(readFileSync(resolve(out,'cameras-before.json'),'utf8')),'all comparison cameras must match');
  save(`cameras-${reference?'before':festival?'festival':'after'}.json`,metadata);
  await ev('(()=>{const s=window.__worldCheck;s.terkunci=false;s.judulWilayah.setVisible(true);s.cameras.main.setZoom(3).startFollow(s.pemain,true,.14,.14)})()');
 };
 const tilePreview=async(festival=false)=>png(`${reference?'before':festival?'festival':'after'}-tiles.png`,`(async()=>{const m=await(await fetch('/maps/${mapFile}')).json(),sheets=await Promise.all(m.tilesets.map(s=>new Promise((yes,no)=>{const i=new Image();i.onload=()=>yes({s,i});i.onerror=no;i.src=new URL(s.image,new URL('/maps/${mapFile}',location.href)).href})));const c=document.createElement('canvas');c.width=816;c.height=688;const x=c.getContext('2d');x.imageSmoothingEnabled=false;const layers=m.layers.filter(l=>l.type==='tilelayer'&&(l.visible||(${festival}&&(l.name.startsWith('Recovery_')||l.name.startsWith('Celebration_'))))).sort((a,b)=>(a.properties.find(p=>p.name==='renderDepth')?.value??0)-(b.properties.find(p=>p.name==='renderDepth')?.value??0));for(const l of layers)for(let y=55;y<98;y++)for(let tx=70;tx<121;tx++){const gid=l.data[y*192+tx];if(!gid)continue;const{s,i}=sheets.find(({s})=>gid>=s.firstgid&&gid<s.firstgid+s.tilecount),f=gid-s.firstgid;x.globalAlpha=l.opacity??1;x.drawImage(i,f%s.columns*16,Math.floor(f/s.columns)*16,16,16,(tx-70)*16,(y-55)*16,16,16)}return c.toDataURL('image/png').split(',')[1]})()`);
 await call('Runtime.enable');await call('Network.enable');await call('Page.enable');await call('Emulation.setFocusEmulationEnabled',{enabled:true});await call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await call('Page.navigate',{url});
 if(colorReview){
  const before=JSON.parse(readFileSync(resolve(out,'color-polish/before-cameras-after.json'),'utf8'));assert.deepEqual(before,JSON.parse(readFileSync(resolve(out,'cameras-after.json'),'utf8')));
  let checked=0;
  for(const basis of ['a4','a5'])for(const view of ['overview','plaza-market','homes-north','north-courtyard','homes-south','homes-east','farming','tiles']){
   await ev(`document.getElementById('basis').value='${basis}';document.getElementById('view').value='${view}';document.getElementById('view').dispatchEvent(new Event('change'))`);
   await until('[...document.images].every(i=>i.complete&&i.naturalWidth>0)','color comparison '+basis+' '+view);checked++;
  }
  await ev("document.getElementById('basis').value='a4';document.getElementById('view').value='plaza-market';document.getElementById('view').dispatchEvent(new Event('change'))");await wait(200);await fullShot('color-polish/review-page.png');save('color-polish/review-evidence.json',{checkedPairs:checked,camerasIdentical:true,missingImages:0});console.log('PASS color review: A4/A5-initial comparisons, all16 image pairs and identical cameras');
 }else if(review){
  // Review playback checks are below; no game instrumentation on this page.
  await until("document.querySelector('video')?.readyState>=2",'review video');
  const source=JSON.parse(readFileSync(resolve(out,'walkthrough-source.json'),'utf8'));assert.equal(source.sha256,sha(resolve(root,'public/maps',mapFile)));
  const result=await ev(`(async()=>{const v=document.querySelector('video');v.muted=true;v.scrollIntoView();await new Promise((yes,no)=>{v.requestVideoFrameCallback(yes);v.play().catch(no)});v.pause();const c=document.createElement('canvas');c.width=320;c.height=180;const x=c.getContext('2d');const sample=()=>{x.drawImage(v,0,0,320,180);const a=x.getImageData(0,0,320,180).data;let lit=0,hash=2166136261;for(let i=0;i<a.length;i+=4){if(a[i]+a[i+1]+a[i+2]>60)lit++;hash=Math.imul(hash^a[i],16777619)}return{lit,hash:hash>>>0}};const first=sample();await new Promise(yes=>{v.onseeked=yes;v.currentTime=2});const second=sample();const end=${JSON.parse(readFileSync(resolve(out,'walkthrough-evidence.json'),'utf8')).elapsedMs/1000}-3;await new Promise(yes=>{v.onseeked=yes;v.currentTime=end});return{width:v.videoWidth,height:v.videoHeight,first,second,end:{seconds:v.currentTime,...sample()}}})()`);
  assert(result.first.lit>10000&&result.end.lit>10000);assert.notEqual(result.first.hash,result.second.hash);save('video-evidence.json',result);
  await until('[...document.images].every(i=>i.complete&&i.naturalWidth>0)','review images');
  await png('comparison-a4-a5.png',`(async()=>{const imgs=await Promise.all(['before-tiles.png','after-tiles.png'].map(f=>new Promise(yes=>{const i=new Image();i.onload=()=>yes(i);i.src=f})));const c=document.createElement('canvas');c.width=1632;c.height=730;const x=c.getContext('2d');x.fillStyle='#233c30';x.fillRect(0,0,c.width,c.height);x.fillStyle='#fff1d4';x.font='22px sans-serif';x.fillText('A4 · sebelum',16,29);x.fillText('A5 · halaman dan kehidupan desa',832,29);imgs.forEach((i,n)=>x.drawImage(i,n*816,42));return c.toDataURL('image/png').split(',')[1]})()`);
  console.log('PASS review images, comparison and video seek near end');
  if(existsSync(resolve(out,'color-polish/before-tiles.png'))){
   await png('color-polish/comparison-a5-before-after.png',`(async()=>{const a=await Promise.all(['color-polish/before-tiles.png','after-tiles.png'].map(f=>new Promise(yes=>{const i=new Image();i.onload=()=>yes(i);i.src=f})));const c=document.createElement('canvas');c.width=1632;c.height=730;const x=c.getContext('2d');x.fillStyle='#233c30';x.fillRect(0,0,c.width,c.height);x.fillStyle='#fff1d4';x.font='22px sans-serif';x.fillText('A5 awal',16,29);x.fillText('A5 · color contrast & flower seeding',832,29);a.forEach((i,n)=>x.drawImage(i,n*816,42));return c.toDataURL('image/png').split(',')[1]})()`);
   await png('comparison-color-a4-a5.png',`(async()=>{const names=['plaza-market','homes-north','farming'],a=await Promise.all(names.flatMap(n=>['before-'+n+'.png','after-'+n+'.png']).map(f=>new Promise(yes=>{const i=new Image();i.onload=()=>yes(i);i.src=f})));const w=a[0].naturalWidth,h=a[0].naturalHeight,c=document.createElement('canvas');c.width=w*2;c.height=(h+36)*3;const x=c.getContext('2d');x.fillStyle='#233c30';x.fillRect(0,0,c.width,c.height);x.fillStyle='#fff1d4';x.font='22px sans-serif';a.forEach((i,n)=>{const row=Math.floor(n/2),col=n%2;x.fillText(names[row]+' · '+(col?'A5 final':'A4'),col*w+16,row*(h+36)+26);x.drawImage(i,col*w,row*(h+36)+36)});return c.toDataURL('image/png').split(',')[1]})()`);
  }
 }else if(production){
  await until('!!document.querySelector("canvas")','production canvas');await until('(async()=>!!(await navigator.serviceWorker.ready).active)()','service worker');await call('Page.reload');await wait(1500);await until('!!document.querySelector("canvas")','production reload');
  assert(await ev('!!navigator.serviceWorker.controller'));assert(await ev("performance.getEntriesByType('resource').some(e=>e.name.includes('/world-v34-a5-'))"));
  const atlasCount=await ev("performance.getEntriesByType('resource').filter(e=>e.name.includes('/assets/world/')).length");assert.equal(atlasCount,JSON.parse(readFileSync(resolve(root,'public/maps',mapFile),'utf8')).tilesets.length);
  await call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await call('Page.reload');await wait(1500);await until('!!document.querySelector("canvas")','offline canvas');await fullShot('production-offline.png');save('production-evidence.json',{worldChunk:'world-v34-a5',atlasCount,serviceWorker:true,offlineReload:true});console.log('PASS production service worker and offline reload');
 }else{
  await begin();assert.equal(await ev("window.__worldCheck.cache.tilemap.get('pulau-tirta').data.properties.find(p=>p.name==='worldVersion').value"),reference?'3.4-A4':'3.4-A5');
  await capture();await tilePreview();
  if(reference){
   save('reference-source.json',{commit:'d4d7d63',file:mapFile,sha256:sha(resolve(root,'public/maps',mapFile))});
   for(const name of ['tiny_town','tiny_farm'])await png(`atlas-${name}.png`,`(async()=>{const m=await(await fetch('/maps/${mapFile}')).json(),s=m.tilesets.find(s=>s.name==='${name}'),i=new Image();await new Promise(yes=>{i.onload=yes;i.src=new URL(s.image,new URL('/maps/${mapFile}',location.href)).href});const c=document.createElement('canvas');c.width=768;c.height=Math.ceil(s.tilecount/12)*76;const x=c.getContext('2d');x.fillStyle='#26392f';x.fillRect(0,0,c.width,c.height);x.imageSmoothingEnabled=false;x.font='12px monospace';x.fillStyle='#fff1d4';for(let f=0;f<s.tilecount;f++){const ox=f%12*64,oy=Math.floor(f/12)*76;x.drawImage(i,f%s.columns*16,Math.floor(f/s.columns)*16,16,16,ox+8,oy+2,48,48);x.fillText(String(f),ox+22,oy+66)}return c.toDataURL('image/png').split(',')[1]})()`);
   console.log('PASS integrated A4 source verified; identical-camera reference and native atlas sheets saved');
  }else if(!process.argv.includes('--capture-only')){
   const position=()=>ev('({x:window.__worldCheck.pemain.x,y:window.__worldCheck.pemain.y})');
   const talk=async()=>{await wait(300);for(let n=0;n<16&&await ev("!!document.querySelector('#kotak-dialog[open]')");n++){await ev("document.querySelector('#kotak-dialog .kotak-lanjut').click()");await wait(290);}};
   const tests={normalTitleAndIntro:true,sourceVersion:'3.4-A5',missionActivities:[]};
   if(process.argv.includes('--walkthrough')){
    const tour=JSON.parse(readFileSync(resolve(root,'world/village-a5.json'),'utf8')).tour;
    save('walkthrough-source.json',{file:mapFile,sha256:sha(resolve(root,'public/maps',mapFile)),version:'3.4-A5',method:'normal game; original WASD and collision; no teleport during tour'});
    await record(async()=>{const e=await ev('('+walkVillageRoute.toString()+')('+JSON.stringify({tour:true,goals:tour})+')',300000);assert.equal(e.visited.length,tour.length);assert(e.elapsedMs>=60000&&e.elapsedMs<=135000,'walkthrough should be about 1–2 minutes');assert(e.travelledPx>2500);save('walkthrough-evidence.json',e);});
    console.log('PASS A5 walkthrough: seven homes, new communal yards, market, well, farming and gates');
   }
   await place(1544,1272);const initial=await position(),camera=await ev('window.__worldCheck.cameras.main.scrollX');await key('d','KeyD',68,150);assert((await position()).x>initial.x);assert(await ev('window.__worldCheck.cameras.main.scrollX')>camera);
   await ev("document.getElementById('tiko-input').focus()");const focusFeet=await position();await key('w','KeyW',87,150);assert.deepEqual(await position(),focusFeet);
   const bounds=await ev("(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()");
   await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...bounds});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...bounds});await key('d','KeyD',68,120);assert((await position()).x>focusFeet.x);tests.movementCameraAndCanvasFocus=true;
   await ev('document.activeElement?.blur()');await key('j','KeyJ',74);await until("!!document.querySelector('#layar-jurnal[open]')",'journal');
   const paused=await position(),npcPaused=await ev('window.__worldCheck.living.npcs.map(n=>n.state.distance)');await key('d','KeyD',68,200);assert.deepEqual(await position(),paused);assert.deepEqual(await ev('window.__worldCheck.living.npcs.map(n=>n.state.distance)'),npcPaused);await fullShot('desktop-journal.png');await key('j','KeyJ',74);await wait(250);
   await ev("document.querySelector('.tombol-jeda').click()");await until("!!document.querySelector('#menu-jeda[open]')",'pause');const pauseFeet=await position();await key('d','KeyD',68,200);assert.deepEqual(await position(),pauseFeet);await fullShot('desktop-pause.png');await ev("document.querySelector('#menu-jeda .tombol-besar').click()");await wait(250);tests.journalAndPauseLock=true;
   await place(100*16+8,61*16+8);assert.equal(await ev('window.__worldCheck.living.npcs.length'),4);const npcBefore=await ev('window.__worldCheck.living.npcs.map(n=>({id:n.plan.id,distance:n.state.distance}))');await wait(5200);const npcAfter=await ev('window.__worldCheck.living.npcs.map(n=>({id:n.plan.id,distance:n.state.distance}))');assert(npcAfter.find(n=>n.id==='village_npc_2').distance>npcBefore.find(n=>n.id==='village_npc_2').distance+1);tests.northCourtyardNpcMoves=true;
   const health=await(await fetch(new URL('/api/health',url))).json();tests.tiko={panelVisible:await ev("!!document.getElementById('tiko-form')"),mockReplyTested:false};
   if(!health.model){await ev("window.__payloads=[];const old=window.fetch;window.fetch=(u,o)=>{if(u==='/api/chat')window.__payloads.push(JSON.parse(o.body));return old(u,o)};document.getElementById('tiko-input').value='Mengapa desa membutuhkan air?';document.getElementById('tiko-form').requestSubmit()");await until("window.__payloads.length>0&&document.getElementById('tiko-mengetik').hidden",'Tiko fallback reply');assert.equal(await ev('window.__payloads.at(-1).lokasi'),'Desa Tirta');tests.tiko.mockReplyTested=true;}
   await ev('document.activeElement?.blur()');await place(1576,1272);await key('e','KeyE',69);await until("!!document.querySelector('#kotak-dialog[open]')",'village conversation');const talkFeet=await position();await key('d','KeyD',68,150);assert.deepEqual(await position(),talkFeet);await fullShot('village-conversation.png');await talk();tests.villageConversationAndInputLock=true;
   const content=JSON.parse(readFileSync(resolve(root,'content/misi.json'),'utf8')),contract=JSON.parse(readFileSync(resolve(root,'world/world-contract-v3.json'),'utf8'));
   for(const target of contract.interactions.filter(i=>i.name!=='festival')){
    const mid=target.properties.find(p=>p.name==='missionId').value,m=content.misi.find(m=>m.id===mid);await place(target.x+8,target.y+8);await key('e','KeyE',69);await until("!!document.querySelector('#dialog-misi[open] .aktivitas')",mid+' activity');assert.equal(await ev("document.querySelector('#dialog-misi h2').textContent"),m.judul);
    const stopped=await position();await key('d','KeyD',68,150);assert.deepEqual(await position(),stopped);
    const slider=mid==='misi-1'?'arah-cermin':mid==='misi-2'?'arah-angin':mid==='misi-3'?'angin-awan':null;
    if(slider)await ev(`(()=>{const s=document.getElementById('${slider}');s.value='${mid==='misi-1'?22:100}';s.dispatchEvent(new Event('input',{bubbles:true}))})()`);
    else await ev("document.querySelectorAll('.aktivitas.hutan .kendali button').forEach(b=>b.click())");
    await fullShot(mid+'-activity.png');await until("!!document.querySelector('#dialog-misi .pilihan-alasan button')",mid+' observable result',90000);
    const answer=m.pilihan.find(p=>p.benar).teks;await ev(`Array.from(document.querySelectorAll('#dialog-misi .pilihan-alasan button')).find(b=>b.textContent===${JSON.stringify(answer)}).click()`);
    await until("!!document.querySelector('#dialog-misi .pulih')",mid+' restored');assert(await ev(`window.__worldCheck.pemulihan.get('${mid}').every(l=>l.visible)`));await fullShot(mid+'-restored.png');await ev("document.querySelector('#dialog-misi .pulih button').click()");await wait(250);tests.missionActivities.push(mid);console.log('PASS integrated activity and recovery '+mid);
   }
   const saved=await ev("JSON.parse(localStorage.getItem('pulau-tirta:progres:v1'))");assert(Object.values(saved.status).every(s=>s==='selesai'));
   await call('Page.reload');await wait(500);await begin();assert.equal(await ev('Array.from(window.__worldCheck.pemulihan.values()).flat().filter(l=>l.visible).length'),16);assert(await ev('window.__worldCheck.perayaan.every(l=>!l.visible)'));tests.persistedRecoveryAfterReload=true;
   await place(1576,1272);await key(' ','Space',32);await until("!!document.querySelector('#kotak-dialog[open]')",'festival invitation');await talk();await until("!!document.querySelector('#dialog-misi[open] .festival')",'festival matching');
   for(let i=0;i<content.festival.peristiwa.length;i++){const stage=content.festival.peristiwa[i].tahap;await ev(`document.querySelectorAll('.kartu-peristiwa')[${i}].click();Array.from(document.querySelectorAll('.festival-tahap .tombol-tahap')).find(b=>b.textContent.toLowerCase()===${JSON.stringify(stage.toLowerCase())}).click()`);}
   await ev("document.querySelector('.tombol-periksa').click()");assert(await ev("JSON.parse(localStorage.getItem('pulau-tirta:progres:v1')).festivalSelesai"));assert(await ev('window.__worldCheck.perayaan.every(l=>l.visible)'));
   await fullShot('festival-complete-ui.png');await ev("document.getElementById('dialog-misi').style.visibility='hidden'");await capture(true);await tilePreview(true);await ev("document.getElementById('dialog-misi').style.visibility='';document.querySelector('#dialog-misi .festival-selesai button').click()");await until("!!document.querySelector('#layar-tamat[open]')",'end screen');tests.festivalAndEnding=true;
   await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await call('Page.navigate',{url});await begin();await place(1576,1272);await fullShot('mobile-gameplay.png');
   assert(await ev("(()=>{const s=window.__worldCheck,b=document.querySelector('canvas').getBoundingClientRect();return parseFloat(s.label.style.fontSize)*3*Math.min(b.width/1280,b.height/720)>=13})()"));
   await ev("document.querySelector('.tombol-jurnal').click()");await until("!!document.querySelector('#layar-jurnal[open]')",'mobile journal');await fullShot('mobile-journal.png');await ev("document.querySelector('#layar-jurnal button').click()");await wait(250);await ev("document.getElementById('tiko-form').scrollIntoView({block:'center'})");await fullShot('mobile-tiko.png');tests.mobileViewport={width:390,height:844,promptMinimumCssPx:13,journal:true,tiko:true};
   const beforeDemo=await ev("localStorage.getItem('pulau-tirta:progres:v1')");await call('Page.navigate',{url:new URL('/?demo=1&ke=misi-1',url).href});await until("!!document.querySelector('#dialog-misi[open] .aktivitas.pantai')",'demo activity');await attach();assert.equal(await ev("localStorage.getItem('pulau-tirta:progres:v1')"),beforeDemo);assert(await ev('window.__worldCheck.perayaan.every(l=>!l.visible)'));tests.demoDoesNotOverwriteProgress=true;
   tests.pools=await ev('({npcs:window.__worldCheck.living.npcs.length,fog:window.__worldCheck.living.fog.length,water:window.__worldCheck.living.water.length,plants:window.__worldCheck.living.plants.length,sceneObjects:window.__worldCheck.children.length})');save('browser-evidence.json',tests);console.log('PASS integrated Journal/Pause/Tiko, village dialogue, four activities, saved recovery, Festival, desktop and mobile');
  }
 }
 assert.deepEqual(errors,[],'browser exceptions');assert.deepEqual(httpErrors,[],'HTTP errors');
 await call('Browser.close');
}finally{
 ws?.close();await wait(400);if(browser.exitCode===null)browser.kill();
 if(dirname(resolve(profile))===resolve(tmpdir())&&profile.includes('tirta-a5-'))try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100});}catch{}
}
