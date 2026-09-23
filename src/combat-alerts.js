// Presentation only: mirrors existing 25 HP / 20% magazine warning thresholds.
export function combatAlertModel(info,reloadKey='R') {
  let ammoState='normal',text='';
  if(!info.melee&&Number.isFinite(info.ammo)&&info.reloading<=0){
    if(info.ammo===0){ammoState=info.reserve>0?'empty':'exhausted';text=info.reserve>0?`弹匣已空 · ${reloadKey} 换弹`:'弹药耗尽 · 切换武器';}
    else if(info.ammo<info.capacity&&info.ammo<=Math.ceil(info.capacity*.2)){ammoState='low';text=`弹药不足 · ${reloadKey} 换弹`;}
  }
  return {ammoState,text,lowHealth:info.health<=25};
}
export function mountCombatAlerts(root,warning,low){
  const group=document.createElement('div');group.className='combat-alerts';
  group.setAttribute('role','status');group.setAttribute('aria-live','polite');group.setAttribute('aria-atomic','true');
  group.append(low,warning);root.append(group);
  const ammoPanel=document.querySelector('#player-hud .ammo');
  return (info,reloadKey)=>{
    const model=combatAlertModel(info,reloadKey);
    // Do not churn live-region text or attributes on every animation frame.
    if(warning.textContent!==model.text)warning.textContent=model.text;
    if(low.hidden===model.lowHealth)low.hidden=!model.lowHealth;
    if(root.dataset.ammoState!==model.ammoState){root.dataset.ammoState=model.ammoState;if(ammoPanel)ammoPanel.dataset.ammoState=model.ammoState;}
    const state=model.lowHealth?'critical':'normal';if(root.dataset.healthState!==state)root.dataset.healthState=state;
  };
}
