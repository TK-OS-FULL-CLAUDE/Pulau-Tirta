/** Uji integrasi dan screenshot lokal tanpa dependency tambahan.
 * Jalankan npm run dev dahulu. CHROME_PATH / WORLD_URL bisa diatur bila perlu. */
import assert from 'node:assert/strict';
import { walkVillageRoute } from './village-route-browser.mjs';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reference = process.argv.includes('--capture-reference');
const villageReference = process.argv.includes('--capture-village-reference');
const a4Reference = process.argv.includes('--capture-a3-reference');
const stage = process.argv.includes('--v33') ? 'v33' : process.argv.includes('--a1') ? 'v34-a1' : process.argv.includes('--a11') ? 'v34-a11' : process.argv.includes('--a3') ? 'v34-a3' : 'v34-a4';
const mapFile = villageReference ? 'pulau-tirta-v34-a11.json' : reference || stage==='v34-a1' ? 'pulau-tirta-v34-a1.json' : stage==='v34-a11' ? 'pulau-tirta-v34-a11.json' : stage==='v34-a4' ? 'pulau-tirta-v34-a4.json' : stage==='v34-a3' ? 'pulau-tirta-v34-a3.json' : 'pulau-tirta-v3-2.json';
const activeMapFile = a4Reference ? 'pulau-tirta-v34-a3.json' : mapFile;
const runtime = JSON.parse(readFileSync(resolve(root, 'public/maps', activeMapFile), 'utf8'));
const phase = stage==='v34-a4'?'a4':'a3';
const currentVillage = ['v34-a3','v34-a4'].includes(stage);
const previewDir = resolve(root, 'world/previews', stage);
const url = process.env.WORLD_URL ?? (process.argv.includes('--review') ? `http://localhost:5173/world/previews/${stage}/review.html` : 'http://localhost:5173/');
const chrome = process.env.CHROME_PATH ?? [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/chromium', '/usr/bin/google-chrome',
].find(existsSync);
assert(chrome, 'Chrome/Edge tidak ditemukan. Set CHROME_PATH ke executable browser.');
assert((await fetch(url)).ok, 'Jalankan npm run dev sebelum pengujian browser.');
const port = await new Promise((resolvePort) => {
  const server = createServer();
  server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolvePort(port)); });
});
const profile = mkdtempSync(join(tmpdir(), 'pulau-tirta-v3-'));
const browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
try {
  let tabs;
  for (let i = 0; i < 100; i++) {
    try { tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (tabs.some((t) => t.type === 'page')) break; } catch { /* browser masih boot */ }
    await wait(100);
  }
  assert(tabs, 'Browser tidak membuka port debugging lokal.');
  ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((yes, no) => { ws.onopen = yes; ws.onerror = no; });
  let nextId = 0;
  const pending = new Map(), errors = [], badResponses = [];
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const entry = pending.get(message.id); if (!entry) return;
      pending.delete(message.id); clearTimeout(entry.timer);
      message.error ? entry.reject(message.error) : entry.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    else if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) badResponses.push(message.params.response.url);
  };
  const call = (method, params = {}, timeoutMs = 20000) => new Promise((resolveCall, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, timeoutMs);
    pending.set(id, { resolve: resolveCall, reject, timer });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression, timeoutMs = 20000) => {
    const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, timeoutMs);
    assert(!r.exceptionDetails, JSON.stringify(r.exceptionDetails)); return r.result.value;
  };
  const until = async (expression, description) => {
    for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await wait(100); }
    throw new Error(`Timeout: ${description}`);
  };
  const attach = async () => {
    // Hanya instrumentasi profil pengujian; tidak menambahkan global debug ke app.
    await until(`(async()=>{const entry=performance.getEntriesByType('resource').find(e=>/\\/src\\/game\\/world\\.ts(?:\\?|$)/.test(e.name));if(!entry)return false;if(!window.__worldAttachStarted){const {DuniaScene}=await import(entry.name);const original=DuniaScene.prototype.inputTerhalang;DuniaScene.prototype.inputTerhalang=function(...args){window.__worldCheck=this;DuniaScene.prototype.inputTerhalang=original;return original.apply(this,args)};window.__worldAttachStarted=true}return !!window.__worldCheck?.pemain})()`, 'scene siap');
  };
  const key = async (key, code, vk, duration = 100, text) => {
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, ...(text ? { text } : {}) });
    await wait(duration);
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
    await wait(100);
  };
  const position = () => evaluate(`({x:window.__worldCheck.pemain.x,y:window.__worldCheck.pemain.y})`);
  const place = async (x, y) => { await evaluate(`document.activeElement?.blur();window.__worldCheck.pemain.setPosition(${x},${y});window.__worldCheck.perbaruiWilayah();void 0`); await wait(500); };
  const screenshot = async (name) => {
    const clip = await evaluate(`(()=>{const c=document.querySelector('canvas'),b=c.getBoundingClientRect(),s=Math.min(b.width/c.width,b.height/c.height),w=c.width*s,h=c.height*s;return {x:b.x+(b.width-w)/2,y:b.y+(b.height-h)/2,width:w,height:h,scale:1}})()`);
    const shot = await call('Page.captureScreenshot', { format: 'png', clip });
    mkdirSync(previewDir, { recursive: true });
    writeFileSync(resolve(previewDir, name.replace('v33', stage) + '.png'), Buffer.from(shot.data, 'base64'));
  };
  const record = async (name, action) => {
    // Copy at postrender to avoid a black first frame from a cleared WebGL buffer.
    const ok = await evaluate(`new Promise(resolve=>{const canvas=document.querySelector('canvas'),mime='video/webm;codecs=vp8';if(!window.MediaRecorder||!MediaRecorder.isTypeSupported(mime)){resolve(false);return}const copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;const ctx=copy.getContext('2d'),game=window.__worldCheck.game;let last=-Infinity;const paint=()=>{const now=performance.now();if(now-last<60)return;ctx.drawImage(canvas,0,0);last=now};game.events.once('postrender',()=>{paint();const stream=copy.captureStream(15),chunks=[],recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:650000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};window.__clip={stream,chunks,recorder,game,paint};game.events.on('postrender',paint);recorder.start();resolve(true)})})`);
    assert(ok, 'Browser tidak mendukung rekaman canvas WebM VP8');
    await action();
    const data = await evaluate(`new Promise((resolve,reject)=>{const c=window.__clip;c.recorder.onstop=()=>{c.stream.getTracks().forEach(t=>t.stop());c.game.events.off('postrender',c.paint);const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{resolve(reader.result.split(',')[1]);delete window.__clip};reader.readAsDataURL(new Blob(c.chunks,{type:'video/webm'}))};c.recorder.stop()})`);
    mkdirSync(previewDir, { recursive: true });
    writeFileSync(resolve(previewDir, name.replace('v33', stage) + '.webm'), Buffer.from(data, 'base64'));
  };
  const worldPreview = async (after, previewMap = activeMapFile, filename, crop) => {
    const png = await evaluate(`(async()=>{
      const map=await(await fetch('/maps/${previewMap}')).json();
      const sheets=await Promise.all(map.tilesets.map(s=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({s,image});image.onerror=reject;image.src=new URL(s.image,new URL('/maps/${previewMap}',location.href)).href})));
      const canvas=document.createElement('canvas');canvas.width=map.width*16;canvas.height=map.height*16;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
      const layers=map.layers.filter(l=>l.type==='tilelayer'&&(l.visible||(${after}&&(l.name.startsWith('Recovery_')||l.name.startsWith('Celebration_'))))).sort((a,b)=>(a.properties.find(p=>p.name==='renderDepth')?.value??0)-(b.properties.find(p=>p.name==='renderDepth')?.value??0));
      for(const layer of layers)for(let i=0;i<layer.data.length;i++){const gid=layer.data[i];if(!gid)continue;ctx.globalAlpha=layer.opacity??1;const {s,image}=sheets.find(({s})=>gid>=s.firstgid&&gid<s.firstgid+s.tilecount);const f=gid-s.firstgid;ctx.drawImage(image,(f%s.columns)*16,Math.floor(f/s.columns)*16,16,16,(i%map.width)*16,Math.floor(i/map.width)*16,16,16);}
      const crop=${JSON.stringify(crop ?? null)};if(crop){const c=document.createElement('canvas');c.width=crop.width*16;c.height=crop.height*16;const cc=c.getContext('2d');cc.imageSmoothingEnabled=false;cc.drawImage(canvas,crop.x*16,crop.y*16,c.width,c.height,0,0,c.width,c.height);return c.toDataURL('image/png').split(',')[1]}
      return canvas.toDataURL('image/png').split(',')[1];
    })()`);
    mkdirSync(previewDir, { recursive: true });
    writeFileSync(resolve(previewDir, filename ?? (after ? 'world-after.png' : 'world-before.png')), Buffer.from(png, 'base64'));
  };
  const captureCentre = async (restored = false) => {
    await evaluate('window.__worldCheck.terkunci=true');
    const snap = async (name,cx,cy,zoom=3,px=97,py=76) => {
      await place(px*16+8,py*16+8);
      await evaluate(`(()=>{const s=window.__worldCheck;s.judulWilayah.setVisible(${zoom===3});s.cameras.main.stopFollow().setZoom(${zoom}).centerOn(${cx*16+8},${cy*16+8});})()`);
      await wait(150); await screenshot(name);
    };
    await snap(restored?'plaza-a11-festival':'plaza-a11-current',97,76);
    const camera=await evaluate('({x:window.__worldCheck.cameras.main.scrollX,y:window.__worldCheck.cameras.main.scrollY,zoom:window.__worldCheck.cameras.main.zoom,width:window.__worldCheck.cameras.main.width,height:window.__worldCheck.cameras.main.height})');
    assert.deepEqual(camera,JSON.parse(readFileSync(resolve(previewDir,'camera-reference.json'),'utf8')),'A1 and A1.1 camera must be identical');
    writeFileSync(resolve(previewDir,restored?'camera-festival.json':'camera-current.json'),JSON.stringify(camera,null,2)+'\n');
    if(!restored){await snap('market-a11',84,74,3,87,76);await snap('well-a11',93,76,3,95,77);}
    await snap(restored?'centre-a11-festival-zoomout':'centre-a11-zoomout',93,76,2);
    await evaluate('(()=>{const s=window.__worldCheck;s.terkunci=false;s.judulWilayah.setVisible(true);s.cameras.main.setZoom(3).startFollow(s.pemain,true,.14,.14);})()');
  };
  const captureVillage = async (restored=false) => {
    await evaluate('window.__worldCheck.terkunci=true');
    const snap=async(name,cx,cy,zoom=3)=>{
      await place(1544,1272);
      await evaluate(`(()=>{const s=window.__worldCheck;s.judulWilayah.setVisible(${zoom===3});s.cameras.main.stopFollow().setZoom(${zoom}).centerOn(${cx*16},${cy*16});})()`);await wait(180);await screenshot(name);
    };
    await snap(restored?'village-festival':`village-after-${phase}`,95.5,76.5,1);
    const camera=await evaluate('({x:window.__worldCheck.cameras.main.scrollX,y:window.__worldCheck.cameras.main.scrollY,zoom:window.__worldCheck.cameras.main.zoom,width:window.__worldCheck.cameras.main.width,height:window.__worldCheck.cameras.main.height})');
    assert.deepEqual(camera,JSON.parse(readFileSync(resolve(previewDir,`camera-before-${phase==='a4'?'a4':'a2'}.json`),'utf8')));
    writeFileSync(resolve(previewDir,restored?'camera-festival.json':`camera-after-${phase}.json`),JSON.stringify(camera,null,2)+'\n');
    if(!restored){
      for(const[name,x,y,z]of[['plaza-market',93.5,76.5,2],['homes-north',96,64.5,2],['homes-south',97,90,2],['farming',89,91,3],['road-spine',101,86,3],['road-north-east',115,63,3]])await snap(name,x,y,z);
    }
    await evaluate('(()=>{const s=window.__worldCheck;s.terkunci=false;s.judulWilayah.setVisible(true);s.cameras.main.setZoom(3).startFollow(s.pemain,true,.14,.14);})()');
  };
  await call('Runtime.enable'); await call('Network.enable'); await call('Page.enable');
  await call('Emulation.setFocusEmulationEnabled', { enabled: true });
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url });
  if(a4Reference){
    await attach();
    assert.equal(await evaluate("window.__worldCheck.cache.tilemap.get('pulau-tirta').data.properties.find(p=>p.name==='worldVersion').value"),'3.4-A3');
    await evaluate('(()=>{const s=window.__worldCheck;s.terkunci=true;s.judulWilayah.setVisible(false);s.cameras.main.stopFollow().setZoom(1).centerOn(95.5*16,76.5*16);})()');await wait(200);
    await screenshot('village-before-a4');
    writeFileSync(resolve(previewDir,'camera-before-a4.json'),JSON.stringify(await evaluate('({x:window.__worldCheck.cameras.main.scrollX,y:window.__worldCheck.cameras.main.scrollY,zoom:window.__worldCheck.cameras.main.zoom,width:window.__worldCheck.cameras.main.width,height:window.__worldCheck.cameras.main.height})'),null,2)+'\n');
    await worldPreview(false,activeMapFile,'village-before-a4-tiles.png',{x:70,y:55,width:51,height:43});
    console.log('PASS A3 reference: source version verified, fixed-camera overview and village crop saved');
  } else if(villageReference){
    await attach();
    assert.equal(await evaluate("window.__worldCheck.cache.tilemap.get('pulau-tirta').data.properties.find(p=>p.name==='worldVersion').value"),'3.4-A1.1');
    await evaluate('(()=>{const s=window.__worldCheck;s.terkunci=true;s.judulWilayah.setVisible(false);s.cameras.main.stopFollow().setZoom(1).centerOn(95.5*16,76.5*16);})()');await wait(200);
    await screenshot('village-before-a2');
    writeFileSync(resolve(previewDir,`camera-before-${phase==='a4'?'a4':'a2'}.json`),JSON.stringify(await evaluate('({x:window.__worldCheck.cameras.main.scrollX,y:window.__worldCheck.cameras.main.scrollY,zoom:window.__worldCheck.cameras.main.zoom,width:window.__worldCheck.cameras.main.width,height:window.__worldCheck.cameras.main.height})'),null,2)+'\n');
    await worldPreview(false,'pulau-tirta-v34-a11.json','village-before-a2-tiles.png',{x:70,y:55,width:51,height:43});
    console.log('PASS before A2: A1.1 source verified, entire village fixed-camera screenshot and tile crop saved');
  } else if(reference){
    await attach();
    assert.equal(await evaluate("window.__worldCheck.cache.tilemap.get('pulau-tirta').data.properties.find(p=>p.name==='worldVersion').value"),'3.4-A1','reference must render the old A1 source');
    await evaluate('window.__worldCheck.terkunci=true');
    await place(97*16+8,76*16+8);
    await evaluate('window.__worldCheck.cameras.main.stopFollow().centerOn(97*16+8,76*16+8);void 0');await wait(150);
    await screenshot('plaza-a1-reference');
    const camera=await evaluate('({x:window.__worldCheck.cameras.main.scrollX,y:window.__worldCheck.cameras.main.scrollY,zoom:window.__worldCheck.cameras.main.zoom,width:window.__worldCheck.cameras.main.width,height:window.__worldCheck.cameras.main.height})');
    writeFileSync(resolve(previewDir,'camera-reference.json'),JSON.stringify(camera,null,2)+'\n');
    await worldPreview(false,'pulau-tirta-v34-a1.json','centre-a1-reference.png',{x:79,y:71,width:29,height:14});
    console.log('PASS reference A1: actual Phaser screenshot at fixed camera; source version verified');
  } else if (process.argv.includes('--capture-village')) {
    await attach();await captureVillage();
    await worldPreview(false,activeMapFile,`village-after-${phase}-tiles.png`,{x:70,y:55,width:51,height:43});
    console.log('PASS village render: whole village and housing/farm/path compositions captured');
  } else if (process.argv.includes('--capture-centre')) {
    await attach();
    assert.equal(await evaluate("window.__worldCheck.cache.tilemap.get('pulau-tirta').data.properties.find(p=>p.name==='worldVersion').value"),'3.4-A1.1');
    await captureCentre();
    await worldPreview(false,activeMapFile,'centre-a11.png',{x:79,y:71,width:29,height:14});
    console.log('PASS A1.1 render: fixed-camera plaza, market, well, zoom-out and crop');
  } else if (process.argv.includes('--review')) {
    if(stage==='v34-a4'){
      const recorded=JSON.parse(readFileSync(resolve(previewDir,'walkthrough-source.json'),'utf8'));
      assert.equal(recorded.sha256,createHash('sha256').update(readFileSync(resolve(root,'public/maps',activeMapFile))).digest('hex'),'walkthrough must match the final map');
      const png=await evaluate(`(async()=>{const imgs=await Promise.all(['village-before-a4-tiles.png','village-after-a4-tiles.png'].map(file=>new Promise((yes,no)=>{const i=new Image();i.onload=()=>yes(i);i.onerror=no;i.src=file})));const c=document.createElement('canvas');c.width=1632;c.height=730;const x=c.getContext('2d');x.fillStyle='#20382e';x.fillRect(0,0,c.width,c.height);x.fillStyle='#fff0d4';x.font='22px sans-serif';x.fillText('A3 · sebelum',16,29);x.fillText('A4 · final Desa Tirta',832,29);x.imageSmoothingEnabled=false;imgs.forEach((i,n)=>x.drawImage(i,n*816,42));return c.toDataURL('image/png').split(',')[1]})()`);
      writeFileSync(resolve(previewDir,'comparison-a3-a4.png'),Buffer.from(png,'base64'));
    }
    await until(`document.querySelectorAll('video').length===${stage.startsWith('v34-a') ? 1 : 4}`, 'video review');
    const evidence = await evaluate(`(async()=>{const result=[];for(const video of document.querySelectorAll('video')){video.muted=true;video.scrollIntoView({block:'center'});await new Promise((resolve,reject)=>{video.requestVideoFrameCallback(resolve);video.play().catch(reject)});video.pause();const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const ctx=canvas.getContext('2d');const sample=()=>{ctx.drawImage(video,0,0,320,180);const p=ctx.getImageData(0,0,320,180).data;let hash=2166136261,lit=0;for(let i=0;i<p.length;i+=4){hash=Math.imul(hash^p[i],16777619);hash=Math.imul(hash^p[i+1],16777619);hash=Math.imul(hash^p[i+2],16777619);if(p[i]+p[i+1]+p[i+2]>60)lit++}return {hash:hash>>>0,lit}};const a=sample();await new Promise((resolve,reject)=>{video.onseeked=resolve;video.onerror=reject;video.currentTime=1});const b=sample();result.push({file:video.querySelector('source').getAttribute('src'),width:video.videoWidth,height:video.videoHeight,first:a,second:b})}return result})()`);
    if(currentVillage){
      const seconds=JSON.parse(readFileSync(resolve(previewDir,'walkthrough-evidence.json'),'utf8')).elapsedMs/1000-3;
      const nearEnd=await evaluate(`(async()=>{const v=document.querySelector('video');await new Promise((resolve,reject)=>{v.onseeked=resolve;v.onerror=reject;v.currentTime=${seconds}});const c=document.createElement('canvas');c.width=160;c.height=90;const x=c.getContext('2d');x.drawImage(v,0,0,160,90);const p=x.getImageData(0,0,160,90).data;let lit=0;for(let i=0;i<p.length;i+=4)if(p[i]+p[i+1]+p[i+2]>60)lit++;return {seconds:v.currentTime,lit}})()`);
      assert(nearEnd.seconds>=seconds-.5&&nearEnd.lit>5000,'end of walkthrough must remain playable');evidence[0].nearEnd=nearEnd;
    }
    writeFileSync(resolve(previewDir, 'video-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
    for (const v of evidence) { assert(v.width>0&&v.height>0); assert(v.first.lit>10000,'rekaman harus berisi gameplay'); assert.notEqual(v.first.hash,v.second.hash,'frame rekaman harus berubah'); }
    assert.deepEqual(errors, []); assert.deepEqual(badResponses, []);
    console.log(`PASS review: ${evidence.length} video dapat diputar dan di-seek; frame gameplay tidak kosong dan berubah`);
  } else if (process.argv.includes('--production')) {
    await until(`!!document.querySelector('canvas')`, 'canvas produksi');
    await until(`(async()=>{const r=await navigator.serviceWorker.ready;return r.active?.state==='activated'})()`, 'service worker aktif');
    await call('Page.reload'); await wait(1200);
    await until(`!!document.querySelector('canvas')`, 'render produksi');
    assert.equal(await evaluate(`!!navigator.serviceWorker.controller`), true);
    assert.equal(await evaluate(`performance.getEntriesByType('resource').filter(e=>e.name.includes('/assets/world/')).length`), runtime.tilesets.length);
    await call('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await call('Page.reload'); await wait(1500);
    await until(`!!document.querySelector('canvas')`, 'reload offline');
    await screenshot('gameplay-v33-production-offline');
    assert.deepEqual(errors, []); assert.deepEqual(badResponses, []);
    console.log('PASS produksi: seluruh atlas, service worker aktif, reload offline, tanpa exception/HTTP error');
    await call('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  } else {
    await attach();
    assert.equal(await evaluate("window.__worldCheck.cache.tilemap.get('pulau-tirta').data.properties.find(p=>p.name==='worldVersion').value"),runtime.properties.find(p=>p.name==='worldVersion').value);
    assert.deepEqual(await position(), { x: 1544, y: 1272 });
    assert.equal(await evaluate('window.__worldCheck.textures.list.tiny_city.frameTotal > 108'), true);
    assert.equal(await evaluate('window.__worldCheck.children.list.filter(c=>c.type==="TilemapLayer").length'), runtime.layers.filter((l) => l.type === 'tilelayer').length);
    assert.equal(await evaluate('window.__worldCheck.textures.exists("tirta_props")'), true);
    assert.equal(await evaluate('window.__worldCheck.perayaan.some(l=>l.visible)'), false);
    const cameraBefore = await evaluate('window.__worldCheck.cameras.main.scrollX');
    await key('d', 'KeyD', 68, 350);
    assert((await position()).x > 1554);
    assert((await evaluate('window.__worldCheck.cameras.main.scrollX')) > cameraBefore);
    await evaluate(`document.getElementById('tiko-input').focus()`);
    const before = await position(); await key('w', 'KeyW', 87, 150, 'w'); await key(' ', 'Space', 32, 80, ' ');
    assert.deepEqual(await position(), before); assert.equal(await evaluate(`document.getElementById('tiko-input').value`), 'w ');
    await evaluate(`document.getElementById('tiko-input').blur()`);
    await key('d', 'KeyD', 68, 100); assert((await position()).x > before.x);
    console.log('PASS render atlas, spawn, gerak, kamera, input chat');

    if(currentVillage&&process.argv.includes('--walkthrough')){
      const tour=JSON.parse(readFileSync(resolve(root,`world/village-${phase}.json`),'utf8')).tour;
      writeFileSync(resolve(previewDir,'walkthrough-source.json'),JSON.stringify({file:activeMapFile,sha256:createHash('sha256').update(readFileSync(resolve(root,'public/maps',activeMapFile))).digest('hex'),version:runtime.properties.find(p=>p.name==='worldVersion').value,initialVisibleLayers:await evaluate("window.__worldCheck.children.list.filter(c=>c.type==='TilemapLayer'&&c.visible).map(c=>c.layer.name)")},null,2)+'\n');
      await record(`village-${phase}-walkthrough`,async()=>{
        const evidence=await evaluate('('+walkVillageRoute.toString()+')('+JSON.stringify({tour:true,goals:tour})+')',300000);
        assert.equal(evidence.visited.length,tour.length);assert(evidence.elapsedMs>=60000,'walkthrough must be at least one minute');assert(evidence.travelledPx>=2500,'walkthrough must show substantial travel');
        writeFileSync(resolve(previewDir,'walkthrough-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
      });
      console.log('PASS long village walkthrough: all homes, gardens, market and gateways reached through existing movement; no teleport');
    }

    if(stage.startsWith('v34-a1')){await record('village-a1-navigation',async()=>{const evidence=await evaluate('('+walkVillageRoute.toString()+')()');writeFileSync(resolve(previewDir,'route-evidence.json'),JSON.stringify(evidence,null,2)+'\n');});}
    assert.equal(await evaluate('window.__worldCheck.living.npcs.length'), 4);
    const childCount = await evaluate('window.__worldCheck.children.length');
    await place(96 * 16 + 8, 79 * 16 + 8);
    const npcBefore = await evaluate('window.__worldCheck.living.npcs.map(n=>n.state.distance)');
    await record('living-v33-desa-walk-npc', async () => {
      await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'd', code: 'KeyD', windowsVirtualKeyCode: 68 }); await wait(400);
      assert.equal(await evaluate('window.__worldCheck.visualPemain.getData("motion")'), 'walking');
      assert.equal(await evaluate('window.__worldCheck.visualPemain.flipX'), false);
      assert.equal(await evaluate('Math.abs(window.__worldCheck.visualPemain.y-window.__worldCheck.pemain.y)<=0.55'), true);
      await wait(450); await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'd', code: 'KeyD', windowsVirtualKeyCode: 68 });
      await key('a', 'KeyA', 65, 850); await wait(2600);
    });
    assert.equal(await evaluate('window.__worldCheck.visualPemain.getData("motion")'), 'idle');
    assert.equal(await evaluate('window.__worldCheck.visualPemain.flipX'), true);
    assert.equal(await evaluate('window.__worldCheck.visualPemain.y===window.__worldCheck.pemain.y'), true);
    const npcAfter = await evaluate('window.__worldCheck.living.npcs.map(n=>n.state.distance)');
    assert(npcAfter.some((d,i)=>d>npcBefore[i]+1), 'NPC dalam kamera harus bergerak');
    await key('w', 'KeyW', 87, 150); assert.equal(await evaluate('window.__worldCheck.visualPemain.getData("facing")'), 'up');
    await key('s', 'KeyS', 83, 150); assert.equal(await evaluate('window.__worldCheck.visualPemain.getData("facing")'), 'down');
    assert.equal(await evaluate('window.__worldCheck.visualPemain.frame.name'), 108);
    await evaluate(`document.getElementById('dialog-misi').showModal()`);
    const frozen = await evaluate('window.__worldCheck.living.npcs.map(n=>({x:n.state.x,y:n.state.y,wait:n.state.waitMs}))');
    const ticks = await evaluate('window.__worldCheck.living.stats.effectTicks');
    await key('d', 'KeyD', 68, 300);
    assert.deepEqual(await evaluate('window.__worldCheck.living.npcs.map(n=>({x:n.state.x,y:n.state.y,wait:n.state.waitMs}))'), frozen);
    assert.equal(await evaluate('window.__worldCheck.visualPemain.getData("motion")'), 'paused');
    assert.equal(await evaluate('window.__worldCheck.label.visible'), false);
    assert.equal(await evaluate('window.__worldCheck.living.stats.effectTicks'), ticks);
    await evaluate(`document.getElementById('dialog-misi').close();document.activeElement?.blur()`);
    await place(968, 696);
    assert.equal(await evaluate('window.__worldCheck.label.scrollFactorX'), 0);
    assert.equal(await evaluate('window.__worldCheck.label.text'), 'E · Pos Kabut');
    const offscreen = await evaluate('window.__worldCheck.living.npcs.map(n=>({...n.state}))');
    const fogBefore = await evaluate('window.__worldCheck.living.fog.map(i=>i.x)');
    const windFrames = new Set(), plantSamples = [];
    await record('living-v33-puncak-fog-wind', async () => {
      for (let n=0;n<8;n++) { await wait(140); windFrames.add(await evaluate('window.__worldCheck.living.wind.texture.key')); plantSamples.push(await evaluate('window.__worldCheck.living.plants.filter(p=>p.image.visible).map(p=>p.image.x)')); }
      await wait(2100);
    });
    assert.equal(windFrames.size, 2, 'dua frame kain windsock harus bergantian');
    assert(plantSamples.some(p=>JSON.stringify(p)!==JSON.stringify(plantSamples[0])), 'tanaman terpilih harus bergoyang');
    assert.deepEqual(await evaluate('window.__worldCheck.living.npcs.map(n=>({...n.state}))'), offscreen);
    assert.equal(await evaluate('window.__worldCheck.living.stats.activeNpcs'), 0);
    assert.equal(await evaluate('window.__worldCheck.living.wind.visible'), true);
    assert.notDeepEqual(await evaluate('window.__worldCheck.living.fog.map(i=>i.x)'), fogBefore);
    assert.equal(await evaluate('window.__worldCheck.living.fog.every(i=>i.depth<window.__worldCheck.visualPemain.depth)'), true);
    await place(968 + 38, 696);
    assert.equal(await evaluate('window.__worldCheck.label.visible'), true);
    assert.equal(await evaluate('window.__worldCheck.label.text'), 'Dekati · Pos Kabut');
    await key('e', 'KeyE', 69); assert.equal(await evaluate(`document.getElementById('dialog-misi').open`), false);
    await place(968 + 46, 696); assert.equal(await evaluate('window.__worldCheck.prompt === undefined'), true);
    await place(920, 1672);
    const waterBefore = await evaluate('window.__worldCheck.living.water.filter(i=>i.visible).map(i=>[i.x,i.alpha])'); assert(waterBefore.length>0);
    await record('living-v33-pantai-water', async () => { await wait(2700); });
    assert.notDeepEqual(await evaluate('window.__worldCheck.living.water.filter(i=>i.visible).map(i=>[i.x,i.alpha])'), waterBefore);
    await place(39 * 16 + 8, 115 * 16 + 8);
    assert((await evaluate('window.__worldCheck.living.stats.activeWater')) > 2, 'riak laut harus aktif dekat pesisir');
    await place(158 * 16 + 8, 106 * 16 + 8);
    await record('living-v33-river', async () => { await wait(2700); });
    assert.equal(await evaluate('window.__worldCheck.children.length'), childCount);
    assert.equal(await evaluate('window.__worldCheck.living.water.length<=36&&window.__worldCheck.living.fog.length<=5&&window.__worldCheck.living.plants.length<=12'), true);
    writeFileSync(resolve(previewDir, 'browser-evidence.json'), JSON.stringify({ npcBefore, npcAfter, pools: await evaluate('({npcs:window.__worldCheck.living.npcs.length,fog:window.__worldCheck.living.fog.length,water:window.__worldCheck.living.water.length,plants:window.__worldCheck.living.plants.length,sceneObjects:window.__worldCheck.children.length})'), fogMoved: true, pausedAndCulled: true, clipsRecorded: stage.startsWith('v34-a1')?5:4 }, null, 2) + '\n');
    await place(920, 1672);
    await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false }); await wait(600);
    assert.equal(await evaluate(`(()=>{const s=window.__worldCheck,b=document.querySelector('canvas').getBoundingClientRect();return Number.parseFloat(s.label.style.fontSize)*s.cameras.main.zoom*Math.min(b.width/1280,b.height/720)>=13})()`), true);
    await screenshot('gameplay-v33-mobile-prompt');
    await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }); await wait(400);
    console.log('PASS V3.3: pose jalan/idle/flip, patroli NPC, pause dialog, culling, kabut/angin/air bergerak, pool tetap, prompt hysteresis; empat rekaman WebM tersimpan');

    await worldPreview(false); await worldPreview(true);
    if(currentVillage){
      await captureVillage();
      await worldPreview(false,activeMapFile,`village-after-${phase}-tiles.png`,{x:70,y:55,width:51,height:43});
      await worldPreview(true,activeMapFile,'village-festival-tiles.png',{x:70,y:55,width:51,height:43});
    }
    if(stage.startsWith('v34-a1')){const crop={x:78,y:65,width:38,height:20};await worldPreview(false,'pulau-tirta-v3-2.json','centre-v33.png',crop);await worldPreview(false,activeMapFile,'centre-a1.png',crop);await worldPreview(true,activeMapFile,'centre-festival.png',crop);}
    if(stage==='v34-a11'){await captureCentre();await worldPreview(false,activeMapFile,'centre-a11.png',{x:79,y:71,width:29,height:14});await worldPreview(true,activeMapFile,'centre-a11-restored.png',{x:79,y:71,width:29,height:14});}
    const shots = [['desa', 97, 79], ['desa-plaza-before', 97, 76], ['desa-rumah', 96, 70], ['desa-pasar', 86, 76], ['desa-pekarangan', 96, 71], ['pantai', 57, 104], ['pantai-pesisir', 39, 115], ['puncak', 60, 43], ['puncak-kaki', 58, 60], ['puncak-jalur', 43, 49], ['puncak-pandang', 56, 36], ['lembah', 146, 46], ['hutan', 147, 106]];
    for (const [name, x, y] of shots) { await place(x * 16 + 8, y * 16 + 8); await screenshot(`gameplay-v33-${name}`); }
    await place(2216, 728); // M3, tanpa menekan interaksi: konteks harus berubah.
    const health = await (await fetch(new URL('/api/health', url))).json();
    if (!health.model) {
      await evaluate(`window.__chatPayloads=[];const original=window.fetch;window.fetch=(u,o)=>{if(u==='/api/chat')window.__chatPayloads.push(JSON.parse(o.body));return original(u,o)};document.getElementById('tiko-input').value='Apa itu air?';document.getElementById('tiko-form').requestSubmit()`);
      await until(`window.__chatPayloads.length>0 && document.getElementById('tiko-mengetik').hidden`, 'balasan Tiko mock');
      assert.equal(await evaluate('window.__chatPayloads.at(-1).lokasi'), 'Lembah Hujan');
      assert.equal(await evaluate('window.__chatPayloads.at(-1).misiId'), 'misi-3');
    }
    await place(1576, 1272); await key('e', 'KeyE', 69);
    assert.equal(await evaluate(`document.getElementById('dialog-misi').open`), false);
    const content = JSON.parse(readFileSync(resolve(root, 'content/misi.json'), 'utf8'));
    const contract = JSON.parse(readFileSync(resolve(root, 'world/world-contract-v3.json'), 'utf8'));
    for (const target of contract.interactions.filter((i) => i.name !== 'festival')) {
      const missionId = target.properties.find((p) => p.name === 'missionId').value;
      const mission = content.misi.find((m) => m.id === missionId);
      await place(target.x + 8, target.y + 8); await key('e', 'KeyE', 69);
      assert.equal(await evaluate(`document.querySelector('#dialog-misi h2')?.textContent`), mission.judul);
      const stopped = await position(); await key('d', 'KeyD', 68); assert.deepEqual(await position(), stopped);
      await evaluate(`document.querySelector('#dialog-misi button').click();document.querySelectorAll('#dialog-misi .pilihan button')[${mission.pilihan.findIndex((p) => p.benar)}].click()`);
      assert.equal(await evaluate(`window.__worldCheck.pemulihan.get('${missionId}').every(l=>l.visible)`), true);
      assert.equal(await evaluate(`document.getElementById('dialog-misi').open`), false);
    }
    for(const [name,x,y] of [['puncak-after',60,43],['lembah-after',146,46],['pantai-after',57,104],['hutan-after',147,106]]){await place(x*16+8,y*16+8);await screenshot('gameplay-v33-'+name);}
    console.log('PASS konteks Tiko, empat dialog misi, lock input, empat grup recovery');
    await call('Page.reload'); await wait(500); await attach();
    assert.equal(await evaluate('Array.from(window.__worldCheck.pemulihan.values()).flat().filter(l=>l.visible).length'), 16);
    assert.equal(await evaluate('window.__worldCheck.perayaan.some(l=>l.visible)'), false);
    await place(1576, 1272); await key(' ', 'Space', 32);
    assert.equal(await evaluate(`document.querySelector('#dialog-misi h2')?.textContent`), 'Festival Hujan');
    await evaluate(`Array.from(document.querySelectorAll('#dialog-misi select')).forEach((s,i)=>s.value=${JSON.stringify(content.festival.peristiwa.map((p) => p.tahap))}[i]);Array.from(document.querySelectorAll('#dialog-misi button')).find(b=>b.textContent==='Periksa').click()`);
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem('pulau-tirta:progres:v1')).festivalSelesai`), true);
    assert.equal(await evaluate('window.__worldCheck.perayaan.every(l=>l.visible)'), true);
    await evaluate(`document.getElementById('dialog-misi').close();document.activeElement?.blur()`);
    await place(97 * 16 + 8, 76 * 16 + 8); await screenshot('gameplay-v33-desa-plaza-after');
    await place(96 * 16 + 8, 70 * 16 + 8); await screenshot('gameplay-v33-desa-rumah-after');
    if(stage==='v34-a11') await captureCentre(true);
    if(currentVillage) await captureVillage(true);
    await place(968, 696); await key('Enter', 'Enter', 13);
    assert.equal(await evaluate(`document.querySelector('#dialog-misi h2')?.textContent`), content.misi.find((m) => m.id === 'misi-2').judul);
    await evaluate(`document.getElementById('dialog-misi').close()`);
    await call('Page.navigate', { url: new URL('/?demo=1&misi=misi-1', url).href });
    await until(`document.getElementById('dialog-misi')?.open`, 'mode demo');
    await attach();
    assert.equal(await evaluate('window.__worldCheck.perayaan.every(l=>l.visible)'), true);
    assert.equal(await evaluate(`document.querySelector('#dialog-misi h2')?.textContent`), content.misi.find((m) => m.id === 'misi-1').judul);
    assert.deepEqual(errors, []); assert.deepEqual(badResponses, []);
    console.log('PASS recovery setelah reload, festival, Spasi/Enter, demo, tanpa exception/HTTP error');
    console.log(`Screenshot, preview dan rekaman: world/previews/${stage}/. Rute A1 diuji melalui input game dan unit test.`);
  }
  ws.send(JSON.stringify({ id: ++nextId, method: 'Browser.close' }));
} finally {
  ws?.close(); await wait(400); if (browser.exitCode === null) browser.kill();
  // Hanya profil mkdtemp milik pengujian ini, dengan pemeriksaan path absolut.
  if (resolve(profile).startsWith(resolve(tmpdir()) + '/') || resolve(profile).startsWith(resolve(tmpdir()) + '\\')) {
    if (dirname(profile) === resolve(tmpdir()) && profile.includes('pulau-tirta-v3-')) {
      try { rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch { /* Windows dapat menahan file profil sebentar; boleh dibersihkan sebagai file temp. */ }
    }
  }
}
