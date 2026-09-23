// vehicle.html chrome translation without touching the markup: a selector → key map applied once at load and on
// every locale change. Only static chrome (headings, briefs, buttons, legend) is covered; runtime HUD/notify copy
// produced by vehicle-app.js stays zh-CN (see docs/mcp-p3-vehicle-i18n.md).
import {createI18n,LOCALE_LABELS,LOCALES} from '../i18n/index.js';
export const VEHICLE_I18N_MAP=Object.freeze([
 ['#return-menu small','vehicle.header.back'],['#pause-drive','vehicle.header.pause',{keepChildren:true}],
 ['.drive-panel > small','vehicle.overlay.tag'],['#drive-overlay-title','vehicle.overlay.title',{keepChildren:true}],['#drive-overlay-title em','vehicle.overlay.title.em'],['#drive-overlay-copy','vehicle.overlay.copy'],
 ['.drive-features span:nth-child(1) b','vehicle.feature.rover'],['.drive-features span:nth-child(2) b','vehicle.feature.plane'],['.drive-features span:nth-child(3) b','vehicle.feature.yacht'],['.drive-features span:nth-child(4) b','vehicle.feature.range'],
 ['#resume-drive','vehicle.enter'],['#recover-drive','vehicle.recover'],
 ['.armament-brief > strong','vehicle.brief.armament'],['.armament-brief > p','vehicle.brief.armament.copy'],
 ['#abort-joint','vehicle.abort.joint'],
 ['#resume-joint-checkpoint','vehicle.checkpoint.resume'],['#retry-joint-checkpoint','vehicle.checkpoint.retry'],['#refresh-joint-checkpoint','vehicle.checkpoint.refresh'],
 ['#resume-naval-checkpoint','vehicle.checkpoint.resume'],['#retry-naval-checkpoint','vehicle.checkpoint.retry'],['#refresh-naval-checkpoint','vehicle.checkpoint.refresh'],
 ['.chase-brief > strong','vehicle.brief.chase'],['.chase-brief > p','vehicle.brief.chase.copy'],['#chase-free-drive','vehicle.free.chase'],
 ['.escort-brief > strong','vehicle.brief.escort'],['.escort-brief > p:first-of-type','vehicle.brief.escort.copy'],['#escort-free-drive','vehicle.free.escort'],
 ['.lighthouse-brief > strong','vehicle.brief.lighthouse'],['.lighthouse-brief > p:first-of-type','vehicle.brief.lighthouse.copy'],['#lighthouse-free-drive','vehicle.free.lighthouse'],
 ['.frontier-brief > strong','vehicle.brief.frontier'],['.frontier-brief > p:first-of-type','vehicle.brief.frontier.copy'],['#frontier-free-drive','vehicle.free.frontier'],
 ['.recon-brief > strong','vehicle.brief.recon'],['.recon-brief > p','vehicle.brief.recon.copy'],['#flight-free-drive','vehicle.free.flight'],
 ['#flight-records-panel > summary','vehicle.records.summary'],['#flight-records-panel .flight-record-notice','vehicle.records.notice'],['#refresh-flight-records','vehicle.records.refresh'],['#show-flight-records','vehicle.records.show'],['#retry-flight-score','vehicle.records.retrySave'],
 ['#retry-flight','vehicle.flight.retry'],['#finish-flight-free','vehicle.flight.free'],
 ['#look-help','vehicle.lookHelp'],
 ['#chase-panel > small','vehicle.panel.chase'],['#escort-panel > small','vehicle.panel.escort'],['#lighthouse-panel > small','vehicle.panel.lighthouse'],['#frontier-panel > small','vehicle.panel.frontier'],['#vehicle-weapon-panel > small','vehicle.panel.weapons'],['.drive-objective > small','vehicle.panel.objective']
]);
// Mission start buttons (#start-*) are deliberately NOT mapped: vehicle-app.js / flight-mission-ui.js rewrite them every
// HUD frame with state-dependent copy (开始/重试/确认…) — that is runtime copy and stays zh-CN.
// Briefs whose <strong> is not distinguishable by class: match by the button they contain.
const STRONG_BY_BUTTON=Object.freeze([['#start-joint','vehicle.brief.joint','vehicle.brief.joint.copy'],['#start-flight','vehicle.brief.flight','vehicle.brief.flight.copy'],['#resume-joint-checkpoint','vehicle.brief.jointCheckpoint',null],['#resume-naval-checkpoint','vehicle.brief.navalCheckpoint',null]]);
const DIFFICULTY_SELECTS=['escort','lighthouse','frontier'];
function setText(el,text,keepChildren){
 if(!el)return false;
 if(keepChildren){const node=[...el.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());const pad=el.querySelector?.('kbd')?' ':'';if(node)node.textContent=text+pad;else el.prepend(text+pad);return true;}
 el.textContent=text;return true;
}
// Apply translations to `root`. Returns the number of nodes touched (0 when the locale is zh-CN and nothing needs to change is still counted — it re-applies the source copy).
export function applyVehicleI18n(root,t){
 let n=0;
 for(const [sel,key,opts] of VEHICLE_I18N_MAP){if(setText(root.querySelector(sel),t(key),opts?.keepChildren))n++;}
 for(const [btnSel,strongKey,copyKey] of STRONG_BY_BUTTON){const section=root.querySelector(btnSel)?.closest('section');if(!section)continue;if(setText(section.querySelector(':scope > strong'),t(strongKey)))n++;if(copyKey&&setText(section.querySelector(':scope > p'),t(copyKey)))n++;}
 for(const id of DIFFICULTY_SELECTS){const select=root.querySelector(`#${id}-difficulty-select`);if(!select)continue;const label=select.closest('label');if(label){const node=[...label.childNodes].find(x=>x.nodeType===3);if(node){node.textContent=t('vehicle.difficulty')+' ';n++;}}for(const opt of select.options){const key='vehicle.difficulty.'+opt.value;if(key in LOCALES['zh-CN']){opt.textContent=t(key);n++;}}}
 // Legend: <span><kbd>X</kbd> text</span> — replace the trailing text node only.
 const legend=root.querySelectorAll('.shared-control-legend > span > span, .shared-control-legend span:has(> kbd)');
 const legendKeys=['vehicle.legend.move','vehicle.legend.board','vehicle.legend.brake','vehicle.legend.camera','vehicle.legend.recover'];
 let i=0;for(const span of legend){if(!span.querySelector(':scope > kbd'))continue;const node=[...span.childNodes].find(x=>x.nodeType===3&&x.textContent.trim());if(node&&legendKeys[i]){node.textContent=' '+t(legendKeys[i]);n++;}i++;}
 return n;
}
// Language picker injected into the overlay panel (after the intro copy). Returns the select element.
export function mountVehicleLanguagePicker(doc,i18n,anchor){
 const label=doc.createElement('label');label.id='vehicle-language';label.className='vehicle-language';
 const select=doc.createElement('select');select.id='vehicle-language-select';select.setAttribute('aria-label','Language');
 for(const [code,name] of Object.entries(LOCALE_LABELS)){const o=doc.createElement('option');o.value=code;o.textContent=name;select.appendChild(o);}
 select.value=i18n.locale;label.append(i18n.t('vehicle.language')+' ',select);
 select.addEventListener('change',()=>i18n.set(select.value));
 i18n.onChange(loc=>{select.value=loc;label.firstChild.textContent=i18n.t('vehicle.language')+' ';});
 (anchor||doc.body).insertAdjacentElement(anchor?'afterend':'beforeend',label);
 return select;
}
export function bindVehicleI18n({doc=document,storage=null,languages=[]}={}){
 const i18n=createI18n({storage,languages,doc});
 const apply=()=>{const n=applyVehicleI18n(doc,i18n.t);doc.documentElement.lang=i18n.locale;doc.body.dataset.locale=i18n.locale;return n;};
 apply();i18n.onChange(apply);
 const picker=mountVehicleLanguagePicker(doc,i18n,doc.querySelector('#drive-overlay-copy'));
 return {i18n,apply,picker,t:i18n.t};
}
