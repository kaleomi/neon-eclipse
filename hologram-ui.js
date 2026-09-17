import {supplySymbolSVG} from './supply-symbols.js';
// Decorative layers only. Game state, hit testing and checkpoint logic stay untouched.
function decorate(){
 const frame='<svg class="holo-frame" viewBox="0 0 300 220" preserveAspectRatio="none" aria-hidden="true"><path class="holo-outline" d="M19 3H281L297 19V201L281 217H19L3 201V19Z"/><path class="holo-inner" d="M23 10H276L289 23V197L276 210H23L11 197V23Z"/><path class="holo-lit" d="M30 3H19L3 19V64M3 169V201L19 217H65M235 217H281L297 201V169M297 53V19L281 3H245"/><path class="holo-detail" d="M38 15H96M204 205H263M18 89V128M282 90V126"/></svg>';
 document.querySelectorAll('.mission-card,.mission-tracker,.right-panel,.loadout-card,.tactical-radar,footer .health,footer .ammo,.boss-mechanic').forEach(el=>{el.classList.add('holo-panel');el.insertAdjacentHTML('afterbegin',frame);});
 const health=document.querySelector('footer .health');
 health?.insertAdjacentHTML('beforeend',supplySymbolSVG('health','health-symbol'));
 const ammo=document.querySelector('footer .ammo');
 ammo?.insertAdjacentHTML('beforeend',supplySymbolSVG('ammo','ammo-symbol'));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate,{once:true});else decorate();
