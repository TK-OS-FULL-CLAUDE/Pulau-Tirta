/** Uji integrasi dan screenshot lokal tanpa dependency tambahan.
 * Jalankan npm run dev dahulu. CHROME_PATH / WORLD_URL bisa diatur bila perlu. */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runtime = JSON.parse(readFileSync(resolve(root, 'public/maps/pulau-tirta-v3-1.json'), 'utf8'));
const previewDir = resolve(root, 'world/previews/v31');
const url = process.env.WORLD_URL ?? 'http://localhost:5173/';
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
  const call = (method, params = {}) => new Promise((resolveCall, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
    pending.set(id, { resolve: resolveCall, reject, timer });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert(!r.exceptionDetails, JSON.stringify(r.exceptionDetails)); return r.result.value;
  };
  const until = async (expression, description) => {
    for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await wait(100); }
    throw new Error(`Timeout: ${description}`);
  };
  const attach = async () => {
    // Hanya instrumentasi profil pengujian; tidak menambahkan global debug ke app.
    await until(`performance.getEntriesByType('resource').some(e=>/\\/src\\/game\\/world\\.ts(?:\\?|$)/.test(e.name))`, 'module world dev');
    await evaluate(`(async()=>{const u=performance.getEntriesByType('resource').find(e=>/\\/src\\/game\\/world\\.ts(?:\\?|$)/.test(e.name)).name;const {DuniaScene}=await import(u);const original=DuniaScene.prototype.inputTerhalang;DuniaScene.prototype.inputTerhalang=function(...args){window.__worldCheck=this;DuniaScene.prototype.inputTerhalang=original;return original.apply(this,args)};})()`);
    await until('!!window.__worldCheck?.pemain', 'scene siap');
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
    writeFileSync(resolve(previewDir, name + '.png'), Buffer.from(shot.data, 'base64'));
  };
  const worldPreview = async (after) => {
    const png = await evaluate(`(async()=>{
      const map=await(await fetch('/maps/pulau-tirta-v3-1.json')).json();
      const sheets=await Promise.all(map.tilesets.map(s=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({s,image});image.onerror=reject;image.src=new URL(s.image,new URL('/maps/pulau-tirta-v3-1.json',location.href)).href})));
      const canvas=document.createElement('canvas');canvas.width=map.width*16;canvas.height=map.height*16;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
      const layers=map.layers.filter(l=>l.type==='tilelayer'&&(l.visible||(${after}&&(l.name.startsWith('Recovery_')||l.name.startsWith('Celebration_'))))).sort((a,b)=>(a.properties.find(p=>p.name==='renderDepth')?.value??0)-(b.properties.find(p=>p.name==='renderDepth')?.value??0));
      for(const layer of layers)for(let i=0;i<layer.data.length;i++){const gid=layer.data[i];if(!gid)continue;const {s,image}=sheets.find(({s})=>gid>=s.firstgid&&gid<s.firstgid+s.tilecount);const f=gid-s.firstgid;ctx.drawImage(image,(f%s.columns)*16,Math.floor(f/s.columns)*16,16,16,(i%map.width)*16,Math.floor(i/map.width)*16,16,16);}
      return canvas.toDataURL('image/png').split(',')[1];
    })()`);
    mkdirSync(previewDir, { recursive: true });
    writeFileSync(resolve(previewDir, after ? 'world-after.png' : 'world-before.png'), Buffer.from(png, 'base64'));
  };
  await call('Runtime.enable'); await call('Network.enable'); await call('Page.enable');
  await call('Emulation.setFocusEmulationEnabled', { enabled: true });
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url });
  if (process.argv.includes('--production')) {
    await until(`!!document.querySelector('canvas')`, 'canvas produksi');
    await until(`(async()=>{const r=await navigator.serviceWorker.ready;return r.active?.state==='activated'})()`, 'service worker aktif');
    await call('Page.reload'); await wait(1200);
    await until(`!!document.querySelector('canvas')`, 'render produksi');
    assert.equal(await evaluate(`!!navigator.serviceWorker.controller`), true);
    assert.equal(await evaluate(`performance.getEntriesByType('resource').filter(e=>e.name.includes('/assets/world/')).length`), runtime.tilesets.length);
    await call('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await call('Page.reload'); await wait(1500);
    await until(`!!document.querySelector('canvas')`, 'reload offline');
    await screenshot('gameplay-v31-production-offline');
    assert.deepEqual(errors, []); assert.deepEqual(badResponses, []);
    console.log('PASS produksi: seluruh atlas, service worker aktif, reload offline, tanpa exception/HTTP error');
    await call('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  } else {
    await attach();
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
    console.log('PASS render lima atlas, spawn, gerak, kamera, input chat');

    await worldPreview(false); await worldPreview(true);
    const shots = [['desa', 97, 79], ['desa-plaza-before', 97, 76], ['desa-rumah', 96, 70], ['pantai', 57, 104], ['pantai-pesisir', 39, 115], ['puncak', 60, 43], ['lembah', 146, 46], ['hutan', 147, 106]];
    for (const [name, x, y] of shots) { await place(x * 16 + 8, y * 16 + 8); await screenshot(`gameplay-v31-${name}`); }
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
    await screenshot('gameplay-v31-hutan-after');
    console.log('PASS konteks Tiko, empat dialog misi, lock input, empat grup recovery');
    await call('Page.reload'); await attach();
    assert.equal(await evaluate('Array.from(window.__worldCheck.pemulihan.values()).flat().filter(l=>l.visible).length'), 16);
    assert.equal(await evaluate('window.__worldCheck.perayaan.some(l=>l.visible)'), false);
    await place(1576, 1272); await key(' ', 'Space', 32);
    assert.equal(await evaluate(`document.querySelector('#dialog-misi h2')?.textContent`), 'Festival Hujan');
    await evaluate(`Array.from(document.querySelectorAll('#dialog-misi select')).forEach((s,i)=>s.value=${JSON.stringify(content.festival.peristiwa.map((p) => p.tahap))}[i]);Array.from(document.querySelectorAll('#dialog-misi button')).find(b=>b.textContent==='Periksa').click()`);
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem('pulau-tirta:progres:v1')).festivalSelesai`), true);
    assert.equal(await evaluate('window.__worldCheck.perayaan.every(l=>l.visible)'), true);
    await evaluate(`document.getElementById('dialog-misi').close();document.activeElement?.blur()`);
    await place(97 * 16 + 8, 76 * 16 + 8); await screenshot('gameplay-v31-desa-plaza-after');
    await place(96 * 16 + 8, 70 * 16 + 8); await screenshot('gameplay-v31-desa-rumah-after');
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
    console.log('Screenshot dan preview SVG/PNG: world/previews/v31/. Rute lengkap diuji terpisah oleh unit test.');
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
