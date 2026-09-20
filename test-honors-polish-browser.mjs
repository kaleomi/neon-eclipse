// Actual achievement controller in the real menu fixture; separate read-only archive contexts.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {startVehicleTestServer} from './scripts/vehicle-browser-server.mjs';
import {CHALLENGE_MAPS} from './chapter-achievements.js';
import {CHAPTER_NAMES} from './achievement-gallery.js';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
assert.equal(CHAPTER_NAMES.length,CHALLENGE_MAPS.length);assert(CHAPTER_NAMES.every(v=>typeof v==='string'&&v.length));
const server=await startVehicleTestServer();let browser;
try{
 browser=await chromium.launch({headless:true,args:['--disable-gpu']});const c=await browser.newContext({viewport:{width:1440,height:960}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(25000);
 const key='neon-eclipse.chapter-achievements.v1',saved=JSON.stringify({version:1,awards:[{id:'blade',map:'reactor'},{id:'survivor',map:'polar'},{id:'untouched',map:'datacenter'}]});
 await p.addInitScript(({key,saved})=>{if(localStorage.getItem(key)===null)localStorage.setItem(key,saved);window.__writes=[];for(const n of ['setItem','removeItem','clear']){const old=Storage.prototype[n];Storage.prototype[n]=function(...args){window.__writes.push(n);return old.apply(this,args);};}},{key,saved});
 const source=await readFile('session-chrome.js','utf8'),overlay=source.match(/overlay\.innerHTML\s*=\s*`([\s\S]*?)`;/)?.[1];assert(overlay);
 let fixture=await readFile('browser-ui-clean-fixture.js','utf8');assert(fixture.includes(",['details','achievement-panel']"));fixture="import {createAchievementUI} from './achievement-ui.js';\n"+fixture.replace(",['details','achievement-panel']",'').replace(' createCombatUI();',' createCombatUI();');
 fixture=fixture.replace('createCombatUI();const quality=',"window.__honorsUI=createAchievementUI('reactor',()=>{window.__challengeStarts=(window.__challengeStarts||0)+1;});createCombatUI();const quality=");
 await p.route('**/browser-ui-clean-fixture.js',r=>r.fulfill({contentType:'text/javascript',body:fixture}));
 await p.route('**/app.js',r=>r.fulfill({contentType:'text/javascript',body:"import {mountCleanFixture} from './browser-ui-clean-fixture.js';mountCleanFixture("+JSON.stringify(overlay)+');'}));
 await mkdir('.tools/qa-honors',{recursive:true});const shot=name=>p.screenshot({path:'.tools/qa-honors/'+name+'.png'});
 await p.goto(server.base+'/index.html?menu=achievements');await p.waitForFunction(()=>window.__cleanUI&&document.body.dataset.uiReady==='true');
 assert(await p.locator('#menu-achievements-title').isVisible());assert.equal(await p.locator('.honor-overview-count strong').textContent(),'3');assert.equal(await p.locator('.honor-overview-progress').getAttribute('max'),'5');
 assert.equal(await p.locator('.achievement-list [data-unlocked=true]').count(),3);assert.match(await p.locator('.achievement-history').allTextContents().then(v=>v.join(' ')),/极地|数据/);
 await shot('achievements-desktop');
 await p.selectOption('.achievement-chapter','current');assert.equal(await p.locator('.honor-overview-count strong').textContent(),'1');assert.equal(await p.locator('.honor-overview-progress').getAttribute('max'),'4');
 await p.selectOption('.achievement-status','unlocked');assert.equal(await p.locator('.achievement-list article').count(),1);assert.equal(await p.locator('.honor-overview-progress').getAttribute('max'),'4','status filter must not inflate completion');
 await p.selectOption('.achievement-chapter','station');assert(await p.locator('.achievement-empty button').isVisible());await p.click('.achievement-empty button');assert.equal(await p.locator('.achievement-list article').count(),5);
 assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),saved);assert.deepEqual(await p.evaluate(()=>window.__writes),[]);
 for(const [w,h] of [[1440,960],[1024,640],[390,844]]){await p.setViewportSize({width:w,height:h});assert(await p.locator('.menu-views').evaluate(e=>e.scrollWidth<=e.clientWidth+2));await p.locator('.achievement-status').scrollIntoViewIfNeeded();await shot('achievements-'+w);}
 await p.selectOption('.achievement-chapter','polar');assert.equal(await p.locator('.honor-overview-count strong').textContent(),'1');assert(!String(await p.locator('.honor-overview-copy').textContent()).includes('undefined'));
 await p.evaluate(k=>{localStorage.setItem(k,'{"version":99,"awards":[]}');window.__writes=[];window.__honorsUI.refresh();},key);
 assert.equal(await p.locator('.achievement-overview').getAttribute('data-state'),'unavailable');assert.equal(await p.locator('.honor-overview-progress').count(),0);assert.equal(await p.locator('.achievement-list article').count(),0);assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),'{"version":99,"awards":[]}');assert.deepEqual(await p.evaluate(()=>window.__writes),[]);await shot('achievements-unavailable');
 console.log('PASS saved/scoped honor counts, nine names, status-filter denominator, empty reset, 3 layouts, future bytes untouched');
 const dbBefore=await p.evaluate(async()=>await indexedDB.databases());
 await p.goto(server.base+'/operations-archive.html');await p.waitForFunction(()=>document.querySelector('#attempts').textContent==='0');
 assert.equal(await p.locator('#archive-empty-state').getAttribute('data-state'),'empty');assert(await p.locator('#export').isDisabled());assert.equal(await p.locator('#weapons:visible').count(),0);assert.match(await p.locator('#archive-empty-state a').getAttribute('href'),/menu=settings&category=data/);
 assert.deepEqual(await p.evaluate(()=>window.__writes),[]);assert.deepEqual(await p.evaluate(async()=>await indexedDB.databases()),dbBefore,'archive must not create another database');
 for(const [w,h]of [[1440,960],[390,844]]){await p.setViewportSize({width:w,height:h});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await shot('archive-empty-'+w);}
 await p.locator('main>header a').click();await p.waitForURL('**/index.html?menu=achievements');await p.locator('#menu-achievements-title').waitFor({state:'visible'});
 const denied=await browser.newContext({viewport:{width:1024,height:768}});await denied.addInitScript(()=>Object.defineProperty(window,'indexedDB',{get(){throw Error('denied');}}));const d=await denied.newPage();await d.goto(server.base+'/operations-archive.html');await d.waitForFunction(()=>document.querySelector('#archive-empty-state')?.dataset.state==='unavailable');assert.match(await d.locator('#archive-empty-title').textContent(),/无法读取/);assert.equal(await d.locator('#archive-empty-state a').count(),0);assert(await d.locator('#archive-empty-state button').isVisible());await d.screenshot({path:'.tools/qa-honors/archive-denied.png'});await denied.close();
 assert.deepEqual(errors,[]);console.log('PASS archive empty/no-created-db, denied distinct, responsive, return to achievements, no page errors');
}finally{await browser?.close();await server.stop();}
