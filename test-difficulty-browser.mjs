import assert from 'node:assert/strict';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
 const base=process.env.GAME_TEST_URL||'http://127.0.0.1:5173/index.html';
 await page.goto(base);await page.click('#menu-settings');const select=page.locator('#combat-difficulty-select');assert.equal(await select.inputValue(),'normal');
 await page.evaluate(()=>localStorage.setItem('difficulty-save-sentinel','keep'));
 await select.selectOption('hard');await page.waitForFunction(()=>document.body.dataset.combatDifficulty==='hard');assert.match(await page.locator('[data-difficulty-description]').textContent(),/135%/);
 await page.reload();await page.click('#menu-settings');assert.equal(await select.inputValue(),'hard');
 await select.selectOption('easy');await page.goto(base+'?menu=chapter');await page.click('#deploy');await page.waitForFunction(()=>document.body.dataset.menuOpen==='false');assert.equal(await page.getAttribute('body','data-combat-difficulty'),'easy');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.body.dataset.menuOpen==='true');await page.locator('[data-open=settings]:visible').click();await select.selectOption('normal');await page.waitForFunction(()=>document.body.dataset.combatDifficulty==='normal');
 for(const width of [1280,390]){await page.setViewportSize({width,height:850});assert(await select.isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');}
 await page.evaluate(()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('denied')};});await select.selectOption('hard');assert.match(await page.locator('[data-difficulty-description]').textContent(),/无法保存/);await page.waitForFunction(()=>document.body.dataset.combatDifficulty==='hard');
 await page.evaluate(()=>{Storage.prototype.setItem=window.originalSet;});await select.selectOption('easy');assert.equal(await page.evaluate(()=>localStorage.getItem('difficulty-save-sentinel')),'keep');
 assert.deepEqual(errors,[]);console.log('PASS: real game settings, three choices, reload persistence, easy chapter launch, pause change, storage failure, desktop/mobile layout and save isolation; no page errors');
}finally{await browser.close();}
