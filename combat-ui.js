import {createControlsSettings} from './controls-settings.js';
export function createCombatUI(){
 const root=document.createElement('div');root.id='combat-feedback';root.hidden=true;
 root.innerHTML='<div class="dynamic-crosshair" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="reload-status" role="progressbar" aria-label="换弹进度" aria-valuemin="0" aria-valuemax="100"><span></span><div><i></i></div></div><div class="damage-result"></div><div class="combat-feed"></div><div class="ammo-warning"></div><div class="low-health">生命危急 · 寻找掩体</div><div class="directions"></div><div class="volt-chain-status" hidden></div><div class="halo-burst-status" hidden></div><div class="rail-charge-status" hidden role="progressbar" aria-label="磁轨蓄力" aria-valuemin="0" aria-valuemax="100"><span></span><div><i></i></div></div>';
 document.body.append(root);
 const reticle=root.querySelector('.dynamic-crosshair'),reload=root.querySelector('.reload-status'),result=root.querySelector('.damage-result'),feed=root.querySelector('.combat-feed'),warning=root.querySelector('.ammo-warning'),low=root.querySelector('.low-health');
 const sensitivityLabel=document.createElement('label');sensitivityLabel.className='sensitivity-setting';sensitivityLabel.innerHTML='瞄准灵敏度 <output>1.00×</output><input aria-label="瞄准灵敏度" type="range" min="0.5" max="2" step="0.05" value="1">';document.querySelector('.mission-card').append(sensitivityLabel);
 let controlsStorage=null;try{controlsStorage=globalThis.localStorage;}catch{}
 const controls=createControlsSettings({storage:controlsStorage}),slider=sensitivityLabel.querySelector('input');
 const aimSetting=document.createElement('div');aimSetting.className='aim-mode-setting';
 aimSetting.innerHTML='<label><span>开镜方式</span><select data-aim-mode aria-label="开镜方式" aria-describedby="aim-mode-help"><option value="hold">长按右键</option><option value="toggle">点按切换</option></select></label><small id="aim-mode-help" class="menu-setting-hint"></small><output data-controls-status aria-live="polite" hidden></output>';
 document.querySelector('.mission-card').append(aimSetting);
 const aimSelect=aimSetting.querySelector('select'),aimHelp=aimSetting.querySelector('small'),controlsStatus=aimSetting.querySelector('output');
 function renderControls(result){const value=controls.value;slider.value=String(value.sensitivity);sensitivityLabel.querySelector('output').textContent=Number(slider.value).toFixed(2)+'×';aimSelect.value=value.aimMode;aimHelp.textContent=(value.aimMode==='toggle'?'右键点一次开镜，再点一次退出。':'按住右键开镜，松开退出。')+'近战右键弹反、手柄 LT 保持原操作。';if(result){controlsStatus.hidden=false;controlsStatus.textContent=result.saved?'已保存':result.readOnly?'已有设置数据只读保留，本次调整仅在当前会话生效。':'暂时无法保存，本次调整仅在当前会话生效。';}}
 controls.onChange((value,before,result)=>renderControls(result));renderControls();
 slider.addEventListener('input',()=>controls.set({sensitivity:Number(slider.value)}));
 aimSelect.addEventListener('change',()=>controls.set({aimMode:aimSelect.value}));
 let chainTime=0,chainDamage=0;
 let resultTime=0,entries=[],directions=[];const reduced=matchMedia('(prefers-reduced-motion: reduce)');result.innerHTML='<span class="impact-label"></span><b class="impact-number"></b><small class="impact-caption">DAMAGE</small>';const label=result.querySelector('.impact-label'),number=result.querySelector('.impact-number');
 function registerHit(damage,head,kills){
  label.textContent=kills?'目标击破'+(kills>1?' ×'+kills:''):head?'弱点命中':'命中';number.textContent='−'+Math.round(damage);
  result.dataset.kind=kills?'kill':head?'head':'body';resultTime=.95;
  if(kills){const entry=document.createElement('div');entry.textContent=(head?'◇ 弱点击破':'◆ 目标击破')+' × '+kills;feed.prepend(entry);entries.push({entry,life:3.5});while(entries.length>3)entries.shift().entry.remove();}
 }
 function damaged(source){
  const arrow=document.createElement('div');arrow.className='damage-direction';root.querySelector('.directions').append(arrow);directions.push({source:{x:source.x,z:source.z},arrow,life:1.25});
  while(directions.length>4)directions.shift().arrow.remove();
 }
 function clear(){chainTime=0;chainDamage=0;resultTime=0;label.textContent='';number.textContent='';result.style.opacity='0';entries.forEach(e=>e.entry.remove());entries=[];directions.forEach(d=>d.arrow.remove());directions=[];}
 function update(dt,info){
  const burst=root.querySelector('.halo-burst-status');burst.hidden=!info.burstPending;burst.textContent=info.burstPending?'光环精准步枪 · 待发 '+info.burstPending+' / 弱点三次激活标记':'';
  const rail=root.querySelector('.rail-charge-status'),charge=info.railProgress||0;rail.hidden=!info.railSelected;rail.setAttribute('aria-valuenow',String(Math.round(charge*100)));rail.querySelector('span').textContent=charge>0?'磁轨蓄力 '+Math.round(charge*100)+'% · 松开取消':'按住 0.8s · 三目标 / 铜色薄板穿透';rail.querySelector('i').style.width=(charge*100)+'%';
  chainTime=Math.max(0,chainTime-dt);const chain=root.querySelector('.volt-chain-status');chain.hidden=!info.voltSelected;chain.dataset.hit=String(chainTime>0);chain.textContent=chainTime>0?'链电命中 −'+Math.round(chainDamage)+' · 单次传导':'雷霆电弧霰弹枪 · 2m 链电 / 50% / 每枪一次';
  root.hidden=!info.playing;if(!info.playing)return;
  const gap=5+info.spread*innerHeight/4+info.heat*2;
  reticle.style.setProperty('--gap',gap+'px');reticle.style.opacity=info.reloading>0||info.switching>0?'0':info.melee?'.3':'1';
  reload.hidden=info.reloading<=0;
  if(!reload.hidden){const fraction=1-info.reloading/info.reloadDuration;reload.setAttribute('aria-valuenow',String(Math.round(fraction*100)));reload.querySelector('span').textContent=info.perShell?'逐发装填 '+info.ammo+' / '+info.capacity+' · 左键开火中断':'换弹 '+info.reloading.toFixed(1)+'s'+(info.sprintReload?' · 可冲刺':'');reload.querySelector('i').style.width=fraction*100+'%';}
  warning.textContent=info.reloading>0?'':info.ammo===0?(info.reserve>0?'弹匣已空 · R 换弹':'弹药耗尽 · 切换武器'):info.ammo<info.capacity&&info.ammo<=Math.ceil(info.capacity*.2)&&!info.melee?'弹药不足 · R 换弹':'';
  low.hidden=info.health>25;
  resultTime=Math.max(0,resultTime-dt);result.style.opacity=String(Math.min(1,resultTime/.16));const pop=reduced.matches?0:Math.max(0,resultTime-.78)/.17;result.style.transform='translateY('+(-pop*4)+'px) skewX(-9deg) scale('+(1+pop*.08)+')';
  for(let i=entries.length-1;i>=0;i--){entries[i].life-=dt;if(entries[i].life<=0){entries[i].entry.remove();entries.splice(i,1);}}
  for(let i=directions.length-1;i>=0;i--){const d=directions[i];d.life-=dt;
   if(d.life<=0){d.arrow.remove();directions.splice(i,1);continue;}
   const angle=Math.atan2(d.source.x-info.player.x,-(d.source.z-info.player.z))+info.yaw;
   d.arrow.style.transform='translate(-50%,-50%) rotate('+angle+'rad)';d.arrow.style.opacity=Math.min(1,d.life*2);
  }
 }
 return {chain(damage){chainTime=.9;chainDamage=damage;},switching(){reticle.style.opacity='0';},registerHit,damaged,clear,update,get sensitivity(){return Number(slider.value);},get aimMode(){return controls.value.aimMode;},onControlsChange:controls.onChange};
}
