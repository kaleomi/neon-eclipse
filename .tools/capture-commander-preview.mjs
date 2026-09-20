// Temporary visual proof runner; lives under .tools/ on the project host.
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||pathToFileURL(path.resolve('..','..','.tools/playwright/node_modules/playwright/index.mjs')).href);
const dir=path.resolve('.tools/qa-commander-c01');await mkdir(dir,{recursive:true});let browser,server;
try{
 const port=await new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 server=spawn(process.execPath,['server.cjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),20000);server.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(timer);resolve();}});server.on('error',reject);});
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await browser.newPage({viewport:{width:1440,height:1080}});p.setDefaultTimeout(60000);
 p.on('pageerror',e=>console.error('PAGE_ERROR',e.message));
 await p.goto(`http://127.0.0.1:${port}/enemy-commander-preview.html`);await p.waitForFunction(()=>window.__c01Preview?.state.ready);
 await p.locator('#pause').check();await p.screenshot({path:path.join(dir,'c01-hero.png')});
 await p.evaluate(()=>{__c01Preview.motion('Command');__c01Preview.mixer.update(.35);__c01Preview.renderer.render(__c01Preview.scene,__c01Preview.camera);});
 await p.screenshot({path:path.join(dir,'c01-command.png')});
 await p.click('[data-view="back"]');await p.screenshot({path:path.join(dir,'c01-back.png')});
 console.log(JSON.stringify(await p.evaluate(()=>__c01Preview.state)));
}finally{await browser?.close();server?.kill();}
