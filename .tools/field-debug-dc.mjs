
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
import {spawn} from 'node:child_process';import {createServer} from 'node:net';
const port=await new Promise((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
const child=spawn(process.execPath,['server.cjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('srv timeout')),15000);child.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(t);resolve();}});});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const c=await browser.newContext({viewport:{width:960,height:720}});const pg=await c.newPage();
const errs=[];pg.on('pageerror',e=>errs.push('pageerror:'+e.message));pg.on('console',m=>{if(m.type()==='error')errs.push('console:'+m.text());});
await pg.addInitScript(()=>{window.addEventListener('unhandledrejection',e=>{console.error('UNHANDLED_REJECTION '+(e.reason&&e.reason.stack||e.reason));});});
const u='http://127.0.0.1:'+port+'/index.html?map=datacenter&menu=chapter';
await pg.route('**/app.js',async route=>{const response=await route.fetch();let source=await response.text();if(process.env.STUB_LAYOUT)source=source.replace('const fieldLayout=FIELD_LAYOUTS[MAP_ID];','const fieldLayout=(MAP_ID===\'datacenter\'?undefined:FIELD_LAYOUTS[MAP_ID]);');await route.fulfill({response,body:source});});
await pg.goto(u);await pg.click('#deploy');
for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,3000));
 const s=await pg.evaluate(()=>({state:document.body.dataset.playState,op:document.querySelector('.dynamic-crosshair')?.style.opacity,lock:!!document.pointerLockElement,menu:document.body.dataset.menuOpen,overlay:document.querySelector('#overlay')?.hidden}));
 console.log('t'+(i*3)+'s',JSON.stringify(s));
 if(s.state==='playing'&&s.op==='1')break;
 if(i===19)console.log('ERRS',JSON.stringify(errs.slice(0,5)));
}
await browser.close();child.kill();
