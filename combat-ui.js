export function createCombatUI(){
 const root=document.createElement('div');root.id='combat-feedback';root.hidden=true;
 root.innerHTML='<div class="dynamic-crosshair" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="reload-status" role="progressbar" aria-label="换弹进度" aria-valuemin="0" aria-valuemax="100"><span></span><div><i></i></div></div><div class="damage-result"></div><div class="combat-feed"></div><div class="ammo-warning"></div><div class="low-health">生命危急 · 寻找掩体</div><div class="directions"></div>';
 document.body.append(root);
 const reticle=root.querySelector('.dynamic-crosshair'),reload=root.querySelector('.reload-status'),result=root.querySelector('.damage-result'),feed=root.querySelector('.combat-feed'),warning=root.querySelector('.ammo-warning'),low=root.querySelector('.low-health');
 const sensitivityLabel=document.createElement('label');sensitivityLabel.className='sensitivity-setting';sensitivityLabel.innerHTML='瞄准灵敏度 <output>1.00×</output><input aria-label="瞄准灵敏度" type="range" min="0.5" max="2" step="0.05" value="1">';document.querySelector('.mission-card').append(sensitivityLabel);
 const slider=sensitivityLabel.querySelector('input'),controlsKey='neon-eclipse.controls.v1';
 try{const saved=JSON.parse(localStorage.getItem(controlsKey));if(saved?.version===1&&Number.isFinite(saved.sensitivity)&&saved.sensitivity>=.5&&saved.sensitivity<=2)slider.value=String(saved.sensitivity);}catch{}
 const showSensitivity=()=>sensitivityLabel.querySelector('output').textContent=Number(slider.value).toFixed(2)+'×';showSensitivity();
 slider.addEventListener('input',()=>{showSensitivity();try{localStorage.setItem(controlsKey,JSON.stringify({version:1,sensitivity:Number(slider.value)}));}catch{}});
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
 function clear(){resultTime=0;label.textContent='';number.textContent='';result.style.opacity='0';entries.forEach(e=>e.entry.remove());entries=[];directions.forEach(d=>d.arrow.remove());directions=[];}
 function update(dt,info){
  root.hidden=!info.playing;if(!info.playing)return;
  const gap=5+info.spread*innerHeight/4+info.heat*2;
  reticle.style.setProperty('--gap',gap+'px');reticle.style.opacity=info.reloading>0||info.switching>0?'0':info.melee?'.3':'1';
  reload.hidden=info.reloading<=0;
  if(!reload.hidden){const fraction=1-info.reloading/info.reloadDuration;reload.setAttribute('aria-valuenow',String(Math.round(fraction*100)));reload.querySelector('span').textContent=info.perShell?'逐发装填 '+info.ammo+' / '+info.capacity+' · 左键开火中断':'换弹 '+info.reloading.toFixed(1)+'s';reload.querySelector('i').style.width=fraction*100+'%';}
  warning.textContent=info.reloading>0?'':info.ammo===0?(info.reserve>0?'弹匣已空 · R 换弹':'弹药耗尽 · 切换武器'):info.ammo<=Math.ceil(info.capacity*.2)&&!info.melee?'弹药不足 · R 换弹':'';
  low.hidden=info.health>25;
  resultTime=Math.max(0,resultTime-dt);result.style.opacity=String(Math.min(1,resultTime/.16));const pop=reduced.matches?0:Math.max(0,resultTime-.78)/.17;result.style.transform='translateY('+(-pop*4)+'px) skewX(-9deg) scale('+(1+pop*.08)+')';
  for(let i=entries.length-1;i>=0;i--){entries[i].life-=dt;if(entries[i].life<=0){entries[i].entry.remove();entries.splice(i,1);}}
  for(let i=directions.length-1;i>=0;i--){const d=directions[i];d.life-=dt;
   if(d.life<=0){d.arrow.remove();directions.splice(i,1);continue;}
   const angle=Math.atan2(d.source.x-info.player.x,-(d.source.z-info.player.z))+info.yaw;
   d.arrow.style.transform='translate(-50%,-50%) rotate('+angle+'rad)';d.arrow.style.opacity=Math.min(1,d.life*2);
  }
 }
 return {registerHit,damaged,clear,update,get sensitivity(){return Number(slider.value);}};
}
