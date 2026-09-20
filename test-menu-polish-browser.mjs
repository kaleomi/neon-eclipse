// Menu presentation regression. Isolated context; production menu and real control fixture.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {startVehicleTestServer} from './scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const out=process.env.MENU_POLISH_OUTPUT||'.tools/qa-menu-polish';
const server=await startVehicleTestServer();let browser;
const errors=[],results=[];
try{
 await mkdir(out,{recursive:true});
 browser=await chromium.launch({headless:true,args:['--disable-gpu']});
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 const p=await context.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));
 const source=await readFile('session-chrome.js','utf8');
 const markup=source.match(/overlay\.innerHTML\s*=\s*`([\s\S]*?)`;/)?.[1];assert(markup);
 await p.route('**/app.js',r=>r.fulfill({contentType:'text/javascript',body:"import {mountCleanFixture} from './browser-ui-clean-fixture.js';mountCleanFixture("+JSON.stringify(markup)+');'}));
 if(process.env.MENU_POLISH_BEFORE){
  for(const [name,type]of [['ui-clean.css','text/css'],['menu-ui.js','text/javascript']]){
   const body=await readFile('.tools/qa-menu-polish/baseline/'+name,'utf8');
   await p.route('**/'+name,r=>r.fulfill({contentType:type,body}));
  }
 }
 await p.addInitScript(()=>localStorage.setItem('neon-eclipse.campaign.v1','{"version":99,"opaque":"polish-sentinel"}'));
 await p.goto(server.base+'/index.html');await p.waitForFunction(()=>window.__cleanUI&&document.body.dataset.uiReady==='true');
 await p.evaluate(()=>document.fonts.ready);
 const saved=await p.evaluate(()=>JSON.stringify({...localStorage}));
 for(const [width,height]of [[1440,900],[1920,1080],[1280,720],[1024,640],[768,1024],[390,844]]){
  await p.setViewportSize({width,height});await p.evaluate(()=>window.__cleanUI.menu.home());
  await p.locator('.menu-home').waitFor({state:'visible'});
  await p.evaluate(()=>{document.querySelector('.menu-views').scrollTop=0;});
  const home=await p.locator('.menu-views').evaluate(e=>({scroll:e.scrollWidth,width:e.clientWidth,height:e.clientHeight,scrollHeight:e.scrollHeight,button:getComputedStyle(document.querySelector('#menu-new')).cssText,rects:Object.fromEntries(['.menu-home','.menu-home-copy','.menu-home-actions','#menu-new','.menu-mobile-actions','.menu-footer'].filter(s=>document.querySelector(s)).map(s=>{const n=document.querySelector(s),r=n.getBoundingClientRect(),c=getComputedStyle(n);return [s,{top:r.top,bottom:r.bottom,height:r.height,padding:c.padding,minHeight:c.minHeight,font:c.font,lineHeight:c.lineHeight,flex:c.flex}];}))}));
  if(!process.env.MENU_POLISH_BEFORE) assert(home.scroll<=home.width+2,`home overflow ${width}: ${JSON.stringify(home)}`);
  await p.screenshot({path:`${out}/home-${width}x${height}.png`});
  await p.click('#menu-new');await p.click('#menu-levels');assert.equal(await p.locator('.menu-chapter-grid>a').count(),9);
  const levels=await p.locator('.menu-views').evaluate(e=>({scroll:e.scrollWidth,width:e.clientWidth}));
  if(!process.env.MENU_POLISH_BEFORE)assert(levels.scroll<=levels.width+2,`chapter overflow ${width}`);
  for(const a of await p.locator('.menu-chapter-grid>a').all()){
   const r=await a.evaluate(e=>{const c=e.getBoundingClientRect(),v=e.closest('.menu-views').getBoundingClientRect();return {left:c.left,right:c.right,vl:v.left,vr:v.right};});
   if(!process.env.MENU_POLISH_BEFORE)assert(r.left>=r.vl-1&&r.right<=r.vr+1,'chapter card stays in content width');
  }
  await p.screenshot({path:`${out}/chapters-${width}x${height}.png`});
  results.push({width,height,home,levels});
 }
 if(!process.env.MENU_POLISH_BEFORE){
  await p.setViewportSize({width:1440,height:900});await p.evaluate(()=>window.__cleanUI.menu.home());
  // Simplified home keeps a fixed order (继续/新游戏/设置/成就) and marks the primary action with data-home-primary instead of reordering.
  assert.equal(await p.locator('.menu-home-actions>button').first().getAttribute('id'),'menu-continue');assert.equal(await p.locator('#menu-new').getAttribute('data-home-primary'),'true');
  await p.click('#menu-new');await p.locator('#menu-begin').focus();await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'menu-levels');
  const focus=await p.locator('#menu-levels').evaluate(e=>({width:getComputedStyle(e).outlineWidth,style:getComputedStyle(e).outlineStyle}));assert.equal(focus.width,'2px');assert.equal(focus.style,'solid');
  await p.keyboard.press('Enter');assert(await p.locator('[data-view=levels]').isVisible());
  await p.locator('.menu-chapter-grid>a').last().focus();
  await p.screenshot({path:`${out}/chapter-keyboard-focus.png`});
  await p.keyboard.press('Escape');assert(await p.locator('[data-view=prepare]').isVisible());await p.keyboard.press('Escape');assert(await p.locator('[data-view=home]').isVisible());
  await p.click('#menu-new');await p.click('#menu-levels');await p.locator('.menu-chapter-grid>a[aria-current=page]').click();assert(await p.locator('[data-view=context]').isVisible());
  await p.evaluate(()=>{window.__cleanUI.setState('paused');window.__cleanUI.menu.home();});
  assert.equal(await p.locator('#menu-continue').getAttribute('data-home-primary'),'true');
  assert.equal(await p.locator('#menu-continue').getAttribute('data-home-primary'),'true');
  await p.screenshot({path:`${out}/home-resume.png`});
  await p.click('#menu-continue');assert.equal(await p.evaluate(()=>window.__cleanUI.counts.resume),1);
  assert.equal(await p.evaluate(()=>window.__cleanUI.snapshot().state),'playing');
  await p.evaluate(()=>{window.__cleanUI.setState('ready');window.__cleanUI.menu.home();});
  await p.click('#menu-new');await p.click('#menu-begin');assert.equal(await p.evaluate(()=>window.__cleanUI.counts.newGame),1);
  await p.emulateMedia({reducedMotion:'reduce'});
  await p.evaluate(()=>{window.__cleanUI.setState('ready');window.__cleanUI.menu.home();});
  await p.click('#menu-new');await p.click('#menu-levels');assert.equal(await p.locator('.menu-chapter-grid>a').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
  assert.equal(await p.evaluate(()=>JSON.stringify({...localStorage})),saved,'menu browsing and mock actions preserve storage');
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/results.json',JSON.stringify({results,errors},null,2));
 console.log('PASS six viewport home/chapter layouts; '+(process.env.MENU_POLISH_BEFORE?'baseline captures':'DOM/Tab order, focus, 9 chapters, current chapter action, resume/new game, reduced motion, storage, no page errors'));
 await context.close();
}finally{await browser?.close();await server.stop();}
