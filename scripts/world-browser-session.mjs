/** Small dependency-free CDP harness. All instrumentation lives in its temporary Chrome profile. */
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
export const wait=ms=>new Promise(r=>setTimeout(r,ms));
export async function openWorldBrowser(url){
 assert((await fetch(url)).ok,'Jalankan dev/server lokal terlebih dahulu.');
 const chrome=process.env.CHROME_PATH??['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);assert(chrome,'Chrome/Edge tidak tersedia');
 const port=await new Promise(r=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});}),profile=mkdtempSync(join(tmpdir(),'tirta-coast-'));
 const browser=spawn(chrome,['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--use-angle=swiftshader','--enable-unsafe-swiftshader','about:blank'],{windowsHide:true,stdio:'ignore'});
 let ws,id=0;const errors=[],httpErrors=[],pending=new Map();
 const close=async()=>{try{if(ws?.readyState===1)ws.send(JSON.stringify({id:++id,method:'Browser.close'}));}catch{}ws?.close();await wait(400);if(browser.exitCode===null)browser.kill();if(dirname(resolve(profile))===resolve(tmpdir())&&profile.includes('tirta-coast-'))try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100});}catch{}};
 try{
  let tabs;for(let n=0;n<100;n++){try{tabs=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();if(tabs.some(t=>t.type==='page'))break;}catch{}await wait(100);}
  assert(tabs?.length,'Chrome debugging unavailable');ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((yes,no)=>{ws.onopen=yes;ws.onerror=no;});
  ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.no(m.error):p.yes(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);else if(m.method==='Network.responseReceived'&&m.params.response.status>=400)httpErrors.push(m.params.response.url);};
  const call=(method,params={},timeout=20000)=>new Promise((yes,no)=>{const key=++id,timer=setTimeout(()=>{pending.delete(key);no(Error('CDP timeout '+method));},timeout);pending.set(key,{yes,no,timer});ws.send(JSON.stringify({id:key,method,params}));});
  const ev=async(code,timeout)=>{const r=await call('Runtime.evaluate',{expression:code,returnByValue:true,awaitPromise:true},timeout);assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
  const until=async(code,label,timeout=15000)=>{const end=Date.now()+timeout;while(Date.now()<end){if(await ev(code))return;await wait(100);}throw Error('Timeout '+label);};
  const key=async(k,code,vk,ms=100)=>{await call('Input.dispatchKeyEvent',{type:'keyDown',key:k,code,windowsVirtualKeyCode:vk});await wait(ms);await call('Input.dispatchKeyEvent',{type:'keyUp',key:k,code,windowsVirtualKeyCode:vk});await wait(100);};
  const attach=async()=>until(`(async()=>{const e=performance.getEntriesByType('resource').find(e=>/\\/src\\/game\\/world\\.ts(?:\\?|$)/.test(e.name));if(!e)return false;if(!window.__worldAttachStarted){const{DuniaScene}=await import(e.name),old=DuniaScene.prototype.inputTerhalang;DuniaScene.prototype.inputTerhalang=function(...a){window.__worldCheck=this;DuniaScene.prototype.inputTerhalang=old;return old.apply(this,a)};window.__worldAttachStarted=true;}return !!window.__worldCheck?.pemain;})()`,'world ready');
  const talk=async()=>{await wait(300);for(let n=0;n<18&&await ev("!!document.querySelector('#kotak-dialog[open]')");n++){await ev("document.querySelector('#kotak-dialog .kotak-lanjut').click()");await wait(290);}};
  const begin=async()=>{await attach();if(await ev("!!document.querySelector('#layar-judul[open]')"))await ev("document.querySelector('#layar-judul .tombol-besar').click()");await talk();await until('!window.__worldCheck.terkunci','world unlocked');await ev('document.activeElement?.blur()');};
  const shot=async(file,full=false)=>{const clip=full?undefined:await ev(`(()=>{const c=document.querySelector('canvas'),b=c.getBoundingClientRect(),s=Math.min(b.width/c.width,b.height/c.height),w=c.width*s,h=c.height*s;return{x:b.x+(b.width-w)/2,y:b.y+(b.height-h)/2,width:w,height:h,scale:1}})()`);writeFileSync(file,Buffer.from((await call('Page.captureScreenshot',{format:'png',...(clip?{clip}:{})})).data,'base64'));};
  const png=async(file,expression)=>writeFileSync(file,Buffer.from(await ev(expression),'base64'));
  const place=async(x,y)=>{await ev(`document.activeElement?.blur();window.__worldCheck.pemain.setPosition(${x},${y});window.__worldCheck.perbaruiWilayah();void 0`);await wait(220);};
  const record=async(file,action)=>{
   await ev(`new Promise(resolve=>{const c=document.querySelector('canvas'),copy=document.createElement('canvas');copy.width=c.width;copy.height=c.height;const x=copy.getContext('2d'),game=window.__worldCheck.game;let last=-Infinity;const paint=()=>{const t=performance.now();if(t-last<60)return;last=t;x.drawImage(c,0,0)};game.events.once('postrender',()=>{paint();const stream=copy.captureStream(15),parts=[],r=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:750000});r.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};window.__capture={r,parts,stream,game,paint};game.events.on('postrender',paint);r.start();resolve(true)})})`);
   await action();const data=await ev(`new Promise(resolve=>{const c=window.__capture;c.r.onstop=()=>{c.stream.getTracks().forEach(t=>t.stop());c.game.events.off('postrender',c.paint);const f=new FileReader();f.onload=()=>resolve(f.result.split(',')[1]);f.readAsDataURL(new Blob(c.parts,{type:'video/webm'}))};c.r.stop()})`);writeFileSync(file,Buffer.from(data,'base64'));
  };
  await call('Runtime.enable');await call('Network.enable');await call('Page.enable');await call('Emulation.setFocusEmulationEnabled',{enabled:true});await call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await call('Page.navigate',{url});
  return{call,ev,until,key,attach,talk,begin,shot,png,place,record,errors,httpErrors,close};
 }catch(error){await close();throw error;}
}
