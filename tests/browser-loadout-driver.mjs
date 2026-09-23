// Real equipment UI for native weapon regressions; no app routes or save edits.
import assert from 'node:assert/strict';
export async function equipAtTerminal(page,primary){
 // These regressions call after their reload assertion, while standing at the chapter entrance.
 await page.waitForTimeout(700);
 await page.keyboard.press('u');await page.locator('.carry-panel').waitFor({state:'visible'});
 assert(await page.locator('.carry-panel [data-equip]').isEnabled(),'native weapon regression must reach an idle physical terminal');
 await page.selectOption('.carry-panel [data-primary]',String(primary));await page.click('.carry-panel [data-equip]');
 await page.keyboard.press('Escape');await page.click('#deploy');await page.waitForFunction(()=>document.body.dataset.menuOpen==='false');
}
