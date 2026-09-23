import {keyLabel} from './input-bindings.js';
import {organizeVehicleUI,organizeHelicopterUI,organizeArchiveUI,enhanceExistingTabs} from './ui-panels.js';
import {watchDialog} from './ui-navigation.js';
export function bootCleanUI(){
 document.body.classList.add('ui-clean');const page=document.body.dataset.uiPage;
 if(page==='vehicle')organizeVehicleUI();
 if(page==='helicopter')organizeHelicopterUI();
 if(page==='archive')organizeArchiveUI();
 if(page==='hub')enhanceExistingTabs(document.querySelector('.p4-tabs'),'button[data-tab]',button=>document.getElementById('p4-'+button.dataset.tab));
 if(page==='fps'){
  const tracker=document.querySelector('.mission-tracker'),starBadge=document.getElementById('star-badge');
  if(tracker&&starBadge&&!tracker.contains(starBadge))tracker.append(starBadge);
  const field=document.querySelector('.field-kit-panel');if(field&&!field.dataset.uiDialog){field.dataset.uiDialog='true';watchDialog(field);}
  if(!document.querySelector('.ui-context-stack')){
   const stack=document.createElement('div');stack.className='ui-context-stack';
   // Only move existing presentation nodes. Their owners still decide when they are visible.
   for(const selector of ['.radio-message','.field-kit-status','.parry-status','.ordnance-status','.carry-badge','.weapon-drop-hint','.toast']){
    const node=document.querySelector(selector);if(node)stack.append(node);
   }
   document.body.append(stack);
   const hints=document.createElement('div');hints.className='ui-shortcuts';hints.setAttribute('aria-label','常用操作');document.body.append(hints);
   const bindings=window.neonInput?.bindings;
   function labels(){const loadout=keyLabel(bindings?.codesFor('loadout')?.[0]||'KeyU'),kit=keyLabel(bindings?.codesFor('fieldKit')?.[0]||'KeyT');hints.textContent='Esc 暂停  ·  '+loadout+' 装备  ·  1 主武器  2 副武器  3 近战  ·  滚轮切换';const key=document.querySelector('#menu-equipment kbd');if(key)key.textContent=loadout;const gear=document.querySelector('[data-menu-gear]');if(gear)gear.textContent='装备管理 · '+loadout;const legacy=document.querySelector('#menu-field-kit');if(legacy)legacy.textContent='试点战地整备 · '+kit;}
   labels();bindings?.onChange(labels);
  }
 }
 document.body.dataset.uiReady='true';
}
if(document.readyState==='complete')bootCleanUI();else document.addEventListener('DOMContentLoaded',bootCleanUI,{once:true});
