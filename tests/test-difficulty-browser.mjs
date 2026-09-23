import assert from 'node:assert/strict';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
 const base=process.env.GAME_TEST_URL||'http://127.0.0.1:5173/index.html';
 await page.goto(base);await page.click('#menu-new');
 const prepareSelect=page.locator('#menu-prepare-difficulty select');
 assert.equal(await prepareSelect.locator('option').count(),4,'new game page lists nightmare');
 assert.match(await prepareSelect.locator('option[value=nightmare]').textContent(),/噩梦/);
 await prepareSelect.selectOption('nightmare');await page.waitForFunction(()=>document.body.dataset.combatDifficulty==='nightmare');
 assert.equal(await page.evaluate(()=>localStorage.getItem('neon-eclipse.combat-difficulty.v1')),'nightmare','nightmare persists');
 assert.match(await page.locator('#menu-prepare-difficulty [data-difficulty-description]').textContent(),/200%/);
 await page.click('#menu-back');await page.click('#menu-settings');const select=page.locator('#menu-combat-difficulty select');const openGameplay=()=>page.click('#settings-tab-gameplay');await openGameplay();
 assert.equal(await select.inputValue(),'nightmare','settings instance stays in sync');
 await page.goto(base);await page.click('#menu-new');await prepareSelect.selectOption('normal');await page.waitForFunction(()=>document.body.dataset.combatDifficulty==='normal');
 await page.click('#menu-back');await page.click('#menu-settings');await openGameplay();assert.equal(await select.inputValue(),'normal');
 await page.evaluate(()=>localStorage.setItem('difficulty-save-sentinel','keep'));
 await select.selectOption('hard');await page.waitForFunction(()=>document.body.dataset.combatDifficulty==='hard');assert.match(await page.locator('#menu-combat-difficulty [data-difficulty-description]').textContent(),/135%/);
 await page.reload();await page.click('#menu-settings');await openGameplay();assert.equal(await select.inputValue(),'hard');
 await select.selectOption('easy');await page.goto(base+'?menu=chapter');await page.click('#deploy');await page.waitForFunction(()=>document.body.dataset.menuOpen==='false');assert.equal(await page.getAttribute('body','data-combat-difficulty'),'easy');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.body.dataset.menuOpen==='true');await page.locator('[data-open=settings]:visible').last().click();await openGameplay();await select.selectOption('normal');assert.equal(await page.evaluate(()=>localStorage.getItem('neon-eclipse.combat-difficulty.v1')),'normal','pause change persists for next deployment');
 for(const width of [1280,390]){await page.setViewportSize({width,height:850});assert(await select.isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');}
 await page.evaluate(()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('denied')};});await select.selectOption('hard');assert.match(await page.locator('#menu-combat-difficulty [data-difficulty-description]').textContent(),/无法保存/);assert.equal(await select.inputValue(),'hard','selection applies to this page even when save is denied');
 await page.evaluate(()=>{Storage.prototype.setItem=window.originalSet;});await select.selectOption('easy');assert.equal(await page.evaluate(()=>localStorage.getItem('difficulty-save-sentinel')),'keep');
 assert.deepEqual(errors,[]);console.log('PASS: real game settings, four choices with nightmare at new game, reload persistence, easy chapter launch, pause change, storage failure, desktop/mobile layout and save isolation; no page errors');
}finally{await browser.close();}
