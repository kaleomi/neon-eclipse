import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export async function startRosterBrowser(){
 const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright'),root=path.dirname(fileURLToPath(import.meta.url)),dir=path.join(root,'.tools','qa-enemy-roster');await mkdir(dir,{recursive:true});
 const port=await new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 const server=spawn(process.execPath,['server.cjs'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('test server timeout')),20000);server.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(timer);resolve();}});server.on('error',reject);});
 let browser;try{browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});}catch(e){server.kill();throw e;}
 return {browser,base:`http://127.0.0.1:${port}`,dir,root,async close(){await browser.close();server.kill();},async save(file,result){await writeFile(path.join(dir,file),JSON.stringify(result,null,2)+'\n');}};
}
export async function trackedPage(context){const page=await context.newPage(),errors=[];page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));return {page,errors};}
