// Settings panels for batch 8: key rebinding, gamepad status, accessibility toggles, language.
// Mounted by menu-ui.js into the settings view; reads window.neonInput / neonA11y / neonI18n set by app.js.
import {ACTIONS,keyLabel} from './input-bindings.js';
import {COLOR_MODES} from './accessibility.js';
import {LOCALE_LABELS} from './i18n/index.js';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export function bindKeyBindings(container,bindings,{t=k=>k,notify=()=>{}}={}){
 if(!container||!bindings)return null;
 let listening=null;
 function render(){
  const groups=['move','combat','menu'];
  container.innerHTML=`<h4 data-i18n="bindings.title">${esc(t('bindings.title'))}</h4><p class="menu-setting-hint" data-i18n="bindings.hint">${esc(t('bindings.hint'))}</p>`+groups.map(g=>`<div class="menu-binding-group"><span class="menu-binding-group-title" data-i18n="bindings.group.${g}">${esc(t('bindings.group.'+g))}</span>${ACTIONS.filter(a=>a.group===g).map(a=>{const locked=bindings.rebind===undefined||['pause','turnLeft','turnRight'].includes(a.id);const keys=bindings.codesFor(a.id).map(keyLabel).join(' / ');return `<div class="menu-binding-row" data-action="${a.id}"><span>${esc(a.label)}</span><button type="button" class="menu-binding-key" data-bind="${a.id}" ${locked?'disabled':''} aria-label="${esc(a.label)}: ${esc(keys)}">${listening===a.id?esc(t('bindings.listening')):esc(keys)}</button>${bindings.isDefault(a.id)?'':'<i class="menu-binding-custom" title="自定义">●</i>'}</div>`;}).join('')}</div>`).join('')+`<div class="menu-binding-actions"><button type="button" class="menu-secondary" data-bindings-reset data-i18n="bindings.reset">${esc(t('bindings.reset'))}</button><span class="menu-binding-status" data-bindings-status aria-live="polite"></span></div>`;
 }
 function stop(){listening=null;document.removeEventListener('keydown',onKey,true);render();}
 function onKey(e){
  e.preventDefault();e.stopImmediatePropagation();
  if(e.code==='Escape'){stop();return;}
  const id=listening;const r=bindings.rebind(id,e.code);stop();
  const status=container.querySelector('[data-bindings-status]');
  if(!r.ok){status.textContent=r.reason==='reserved'?t('bindings.reserved'):r.reason;return;}
  status.textContent=r.conflict?t('bindings.swapped',{action:ACTIONS.find(a=>a.id===r.conflict)?.label||r.conflict}):keyLabel(e.code);
 }
 container.addEventListener('click',e=>{
  const b=e.target.closest('[data-bind]');
  if(b){if(listening===b.dataset.bind){stop();return;}listening=b.dataset.bind;render();document.addEventListener('keydown',onKey,true);container.querySelector(`[data-bind="${listening}"]`)?.focus();return;}
  if(e.target.closest('[data-bindings-reset]')){stop();bindings.reset();render();}
 });
 bindings.onChange(()=>{if(!listening)render();});
 render();
 return {render,get listening(){return listening;},cancel:stop};
}
export function bindGamepadStatus(container,gamepad,{t=k=>k,nav=globalThis.navigator}={}){
 if(!container)return null;
 container.innerHTML=`<h4 data-i18n="gamepad.title">${esc(t('gamepad.title'))}</h4><p class="menu-setting-hint" data-i18n="gamepad.hint">${esc(t('gamepad.hint'))}</p><p class="menu-setting-hint menu-gamepad-status" data-gamepad-status></p>`;
 const status=container.querySelector('[data-gamepad-status]');
 function refresh(){let id=null;try{for(const p of nav?.getGamepads?.()||[])if(p){id=p.id;break;}}catch{}status.textContent=id?t('gamepad.connected',{id:id.slice(0,48)}):t('gamepad.none');status.dataset.connected=String(!!id);}
 refresh();globalThis.addEventListener?.('gamepadconnected',refresh);globalThis.addEventListener?.('gamepaddisconnected',refresh);
 return {refresh};
}
export function bindAccessibilitySettings(container,a11y,{t=k=>k}={}){
 if(!container||!a11y)return null;
 const p=a11y.prefs;
 container.innerHTML=`<h3 data-i18n="a11y.title">${esc(t('a11y.title'))}</h3>
 <fieldset class="menu-color-mode"><legend data-i18n="a11y.colorMode">${esc(t('a11y.colorMode'))}</legend><div class="menu-quality-options">${COLOR_MODES.map(m=>`<label><input type="radio" name="menu-color-mode" value="${m}" ${p.colorMode===m?'checked':''}><span data-i18n="a11y.colorMode.${m}">${esc(t('a11y.colorMode.'+m))}</span></label>`).join('')}</div></fieldset>
 <label class="menu-telemetry"><input type="checkbox" data-a11y-shapes ${p.shapes?'checked':''}><span data-i18n="a11y.shapes">${esc(t('a11y.shapes'))}</span></label><p class="menu-setting-hint" data-i18n="a11y.shapes.hint">${esc(t('a11y.shapes.hint'))}</p>
 <label class="menu-telemetry"><input type="checkbox" data-a11y-subtitles ${p.subtitles?'checked':''}><span data-i18n="a11y.subtitles">${esc(t('a11y.subtitles'))}</span></label><p class="menu-setting-hint" data-i18n="a11y.subtitles.hint">${esc(t('a11y.subtitles.hint'))}</p>
 <label class="menu-audio-row"><span data-i18n="a11y.subtitleSize">${esc(t('a11y.subtitleSize'))}</span><select data-a11y-subtitle-size>${[1,1.25,1.5].map(v=>`<option value="${v}" ${p.subtitleSize===v?'selected':''}>${v}×</option>`).join('')}</select></label>`;
 container.querySelectorAll('[name="menu-color-mode"]').forEach(i=>i.addEventListener('change',()=>a11y.set({colorMode:i.value})));
 container.querySelector('[data-a11y-shapes]').addEventListener('change',e=>a11y.set({shapes:e.target.checked}));
 container.querySelector('[data-a11y-subtitles]').addEventListener('change',e=>a11y.set({subtitles:e.target.checked}));
 container.querySelector('[data-a11y-subtitle-size]').addEventListener('change',e=>a11y.set({subtitleSize:Number(e.target.value)}));
 return {container};
}
export function bindLanguageSetting(container,i18n){
 if(!container||!i18n)return null;
 container.innerHTML=`<label class="menu-audio-row menu-language"><span data-i18n="settings.language">${esc(i18n.t('settings.language'))}</span><select data-locale>${Object.entries(LOCALE_LABELS).map(([id,l])=>`<option value="${id}" ${i18n.locale===id?'selected':''}>${esc(l)}</option>`).join('')}</select></label><p class="menu-setting-hint" data-i18n="settings.language.hint">${esc(i18n.t('settings.language.hint'))}</p>`;
 container.querySelector('[data-locale]').addEventListener('change',e=>i18n.set(e.target.value));
 return {container};
}
