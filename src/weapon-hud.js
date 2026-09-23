import {weaponDisplay} from './weapon-display.js';
import {equippedWeaponIndices,EQUIPPED_SLOTS} from './weapon-selection.js';
import {weaponAmmoGauge} from './weapon-hud-rules.js';
const fallbackIcon=index=>`<svg viewBox="0 0 160 74" aria-hidden="true">${index===11?'<path class="metal" d="M85 8h55v27H85zM100 33h12v34h-12z"/><path class="accent" d="M80 8h8v27h-8z"/>':index===9?'<path class="metal" d="M7 27h35v-7h52v9h55v17H90v9H38V43H7z"/><circle class="dark" cx="70" cy="49" r="19"/><path class="accent" d="M136 24h10v24h-10z"/>':'<path class="metal" d="M5 22h28l11 9h51V20h58v11H98v11h55v10H92l-9 9H49l-7-17H5z"/><path class="accent" d="M105 14h6v43h-6m19-43h6v43h-6m19-43h6v43h-6"/>'}</svg>`;
export function createEquippedWeaponHUD({root=document.querySelector('.right-panel'),weapons,loadout,typedAmmo,ordnance,fieldKit,getAmmo,getSelected}){
 if(!root)return {render(){}};
 const icons=new Map([...root.querySelectorAll('.loadout-card')].map((card,i)=>[i,card.querySelector('.weapon-icon')?.innerHTML||'']));
 root.querySelectorAll('.loadout-card').forEach(card=>card.remove());root.classList.add('equipped-rack');root.setAttribute('aria-label','当前携带的三种武器');
 const heading=root.querySelector('.eyebrow')||document.createElement('div');heading.className='eyebrow weapon-rack-heading';heading.innerHTML='<span>当前装备</span><small>1 / 2 / 3 · 滚轮切换</small>';if(!heading.parentNode)root.prepend(heading);
 const slots=document.createElement('div');slots.className='weapon-rack-slots';heading.after(slots);
 let signature='',cards=[],utilityAttached=false;
 function render(){
  if(!utilityAttached){const utility=document.querySelector('.emp-status');if(utility){root.append(utility);utilityAttached=true;}}
  const carried=loadout.state,indices=equippedWeaponIndices(carried),sig=indices.join(':');
  if(sig!==signature){signature=sig;slots.replaceChildren();cards=indices.map((index,slot)=>{
   const info=weaponDisplay(index),card=document.createElement('div');card.className='loadout-card';card.dataset.weapon=info.id;card.dataset.weaponIndex=String(index);card.dataset.carrySlot=['primary','secondary','melee'][slot];card.style.setProperty('--weapon-accent','#'+info.color.toString(16).padStart(6,'0'));card.setAttribute('role','group');card.setAttribute('aria-label',['主武器','副武器','近战'][slot]+' · '+info.name);
   card.innerHTML=`<div class="weapon-card-main"><div class="weapon-icon ${info.family}">${icons.get(index)||fallbackIcon(index)}</div><div class="weapon-card-name"><b></b><small></small></div><strong></strong></div><div class="weapon-card-ammo"><div class="weapon-ammo-caption"><span></span><b></b></div><div class="weapon-ammo-track"><i></i></div><small class="weapon-ammo-detail"></small></div>`;
   card.querySelector('.weapon-card-name b').textContent=info.name;card.querySelector('.weapon-card-name small').textContent=['主武器','副武器','近战'][slot]+' · '+info.kind;
   card.querySelector('.weapon-card-main strong').textContent=EQUIPPED_SLOTS[slot].key;
   slots.append(card);return {index,card,caption:card.querySelector('.weapon-ammo-caption span'),percent:card.querySelector('.weapon-ammo-caption b'),track:card.querySelector('.weapon-ammo-track'),fill:card.querySelector('.weapon-ammo-track i'),detail:card.querySelector('.weapon-ammo-detail'),last:''};
  });}
  const data=getAmmo(),special=ordnance?.snapshot(),kit=fieldKit?.snapshot(),selected=getSelected();
  for(const item of cards){const g=weaponAmmoGauge(item.index,{weapons,...data,typedAmmo,ordnance:special,fieldKit:kit,readOnly:loadout.unsupported}),s=[selected,g.percent,g.detail,g.label].join('|');if(s===item.last)continue;item.last=s;
   item.card.classList.toggle('active',item.index===selected);item.card.dataset.lowAmmo=String(g.percent!==null&&g.percent<=20);item.card.dataset.ammoKind=g.melee?'melee':g.unavailable?'unknown':'finite';
   item.caption.textContent=g.label;item.percent.textContent=g.melee?'∞':g.percent===null?'—':g.percent+'%';item.fill.style.width=(g.melee?100:g.percent||0)+'%';item.detail.textContent=g.detail;
   if(g.percent===null){item.track.removeAttribute('role');item.track.removeAttribute('aria-valuenow');item.track.removeAttribute('aria-valuemin');item.track.removeAttribute('aria-valuemax');item.track.setAttribute('aria-label',g.label);}else{item.track.setAttribute('role','progressbar');item.track.setAttribute('aria-label',weaponDisplay(item.index).name+'总弹药余量');item.track.setAttribute('aria-valuemin','0');item.track.setAttribute('aria-valuemax','100');item.track.setAttribute('aria-valuenow',String(g.percent));item.track.setAttribute('aria-valuetext',g.percent+'% · '+g.detail);}
   item.card.title=g.melee?g.detail:g.unavailable?g.detail:'总弹药 = 弹匣 + 可用备用弹药；上限 '+g.capacity+' 发。换弹不增加总量。'+g.detail;
  }
 }
 return {render};
}
