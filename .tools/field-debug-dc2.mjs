
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
import {spawn} from 'node:child_process';import {createServer} from 'node:net';
const port=await new Promise((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
const child=spawn(process.execPath,['server.cjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('srv timeout')),15000);child.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(t);resolve();}});});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const map of ['datacenter','harbor']){
 const c=await browser.newContext({viewport:{width:960,height:720}});const pg=await c.newPage();
 const errs=[];pg.on('pageerror',e=>errs.push('pageerror:'+e.message));
 await pg.goto('http://127.0.0.1:'+port+'/index.html?map='+map+'&menu=chapter');
 const info=await pg.evaluate(()=>{
  const b=document.querySelector('#deploy');
  if(!b)return {noButton:true};
  const r=b.getBoundingClientRect();
  const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
  b.addEventListener('click',()=>{window.__clicked=true;},{capture:true});
  return {noButton:false,disabled:b.disabled,visible:r.width>0&&r.height>0,rect:[r.x,r.y,r.width,r.height],topTag:top?top.tagName+'#'+top.id+'.'+top.className.slice(0,40):'null',topIsButton:top===b};
 });
 console.log(map,'button:',JSON.stringify(info));
 if(!info.noButton)await pg.click('#deploy',{timeout:5000});
 const after=await pg.evaluate(()=>({clicked:window.__clicked,state:document.body.dataset.playState,menu:document.body.dataset.menuOpen}));
 console.log(map,'after:',JSON.stringify(after),'errs:',JSON.stringify(errs.slice(0,3)));
 await new Promise(r=>setTimeout(r,4000));
 const after2=await pg.evaluate(()=>({state:document.body.dataset.playState,menu:document.body.dataset.menuOpen,op:document.querySelector('.dynamic-crosshair')?.style.opacity}));
 console.log(map,'t+4s:',JSON.stringify(after2),'errs:',JSON.stringify(errs.slice(0,3)));
 await c.close();
}
await browser.close();child.kill();
