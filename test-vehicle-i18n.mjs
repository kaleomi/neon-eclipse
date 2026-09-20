import assert from 'node:assert/strict';
import {VEHICLE_I18N_MAP,applyVehicleI18n} from './vehicle-i18n.js';
import {ZH_CN} from './i18n/zh-CN.js';
import {EN} from './i18n/en.js';
import {readFileSync} from 'node:fs';
// Every mapped key exists in both dictionaries; every vehicle.* key is referenced by the map, the strong-by-button table, the picker or the difficulty/legend loops.
{
 for(const [,key] of VEHICLE_I18N_MAP){assert.ok(key in ZH_CN,'zh missing '+key);assert.ok(key in EN,'en missing '+key);}
 const src=readFileSync(new URL('./vehicle-i18n.js',import.meta.url),'utf8');
 const vehicleKeys=Object.keys(ZH_CN).filter(k=>k.startsWith('vehicle.'));assert.ok(vehicleKeys.length>=60,String(vehicleKeys.length));
 const implicit=k=>/^vehicle\.(difficulty\.(easy|normal|hard)|legend\.)/.test(k);
 for(const k of vehicleKeys)assert.ok(src.includes(`'${k}'`)||implicit(k),'unreferenced key '+k);
 assert.ok(EN['vehicle.brief.frontier.copy'].includes('Level 8')&&!/[\u4e00-\u9fff]/.test(EN['vehicle.brief.frontier.copy']),'English brief has no CJK');
 // Static vehicle.html source copy equals the zh-CN dictionary for spot-checked briefs (guards drift between markup and dictionary).
 const html=readFileSync(new URL('./vehicle.html',import.meta.url),'utf8');
 for(const key of ['vehicle.brief.recon.copy','vehicle.brief.flight.copy','vehicle.records.notice','vehicle.overlay.copy'])assert.ok(html.includes(ZH_CN[key]),'markup drifted from dictionary: '+key);
}
// applyVehicleI18n against a tiny DOM stub: textContent set for matched selectors, keepChildren keeps the <kbd>, unmatched selectors are skipped.
{
 const nodes=new Map();const mk=(text,children=[])=>({textContent:text,childNodes:children,querySelector:()=>null,querySelectorAll:()=>[],closest:()=>null,prepend(t){this.childNodes.unshift({nodeType:3,textContent:t});}});
 const textNode={nodeType:3,textContent:'暂停 '};const pause=mk('暂停 ESC',[textNode,{nodeType:1,textContent:'ESC'}]);pause.querySelector=sel=>sel==='kbd'?{}:null;
 nodes.set('#pause-drive',pause);nodes.set('#resume-drive',mk('进入试验区 →'));
 const root={querySelector:sel=>nodes.get(sel)||null,querySelectorAll:()=>[]};
 const n=applyVehicleI18n(root,k=>EN[k]??k);
 assert.equal(n,2);assert.equal(nodes.get('#resume-drive').textContent,'Enter the proving ground →');assert.equal(textNode.textContent,'Pause ');assert.equal(pause.childNodes.length,2,'kbd child kept');
}
console.log('PASS: vehicle i18n — map/dictionary parity, all vehicle.* keys referenced, English briefs CJK-free, markup↔dictionary drift guard, DOM apply (textContent / keepChildren / skip missing)');
