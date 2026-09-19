import {equipAtTerminal} from './browser-loadout-driver.mjs';
// Real page, no app instrumentation. Isolated context never opens player saves.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:960,height:720}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
 const base=new URL(process.env.GAME_TEST_URL||'http://127.0.0.1:5173/index.html');base.search='?menu=chapter';
 await page.goto(base.href);await page.click('#deploy');await page.waitForFunction(()=>document.body.dataset.menuOpen==='false');
 const registry=await page.evaluate(async()=>{
  const r=await import('./weapons/registry.js'),c=await import('./combat.js');
  localStorage.setItem('p1-weapon-sentinel','keep');
  return {same:r.WEAPONS===c.WEAPONS,ids:r.LEGACY_WEAPON_IDS,names:r.WEAPONS.map(w=>w.name),infinite:r.WEAPONS[3].cap===Infinity};
 });
 assert.deepEqual(registry,{same:true,ids:['vanguard','breacher','ghost','arc-blade'],names:['VANGUARD','BREACHER','GHOST','ARC BLADE'],infinite:true});
 const ammo=async expected=>{try{await page.waitForFunction(n=>document.querySelector('#ammo').textContent===n,expected,{timeout:15000});}catch(e){console.log(await page.evaluate(()=>({ammo:document.querySelector('#ammo').textContent,state:document.body.dataset.playState,health:document.querySelector('#health').textContent,menu:document.body.dataset.menuOpen})));throw e;}};
 await ammo('30');await page.mouse.click(480,360);await ammo('29');
 await equipAtTerminal(page,1);await page.keyboard.press('Digit2');await ammo('8');await page.waitForFunction(()=>document.querySelector('.dynamic-crosshair').style.opacity==='1');
 await page.mouse.click(480,360);await ammo('7');await page.keyboard.press('KeyR');await ammo('8');
 await page.keyboard.press('Digit3');await ammo('15');await page.waitForFunction(()=>document.querySelector('.dynamic-crosshair').style.opacity==='1');
 await page.mouse.click(480,360);await ammo('14');
 await page.keyboard.press('Digit4');await ammo('∞');assert.equal(await page.locator('#player-hud .ammo').getAttribute('data-weapon'),'melee');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.body.dataset.menuOpen==='true');
 assert.equal(await page.evaluate(()=>localStorage.getItem('p1-weapon-sentinel')),'keep');assert.deepEqual(errors,[]);
 console.log('PASS: uninstrumented game, browser registry imports, native terminal exchange and keys 1–4 legacy weapon selection, rifle/shotgun/pistol firing, shotgun shell reload, infinite blade ammo, pause and isolated save sentinel');
 await context.close();
}finally{await browser.close();}
