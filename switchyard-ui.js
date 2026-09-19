import {SWITCHYARD,SWITCHYARD_SWITCHES} from './switchyard-rules.js';
export function createSwitchyardUI(){
 const panel=document.createElement('section');panel.className='boss-mechanic switchyard-panel';panel.hidden=true;
 panel.style.cssText='position:fixed;top:118px;left:50%;transform:translateX(-50%);width:430px;max-width:calc(100vw - 32px);padding:12px;box-sizing:border-box;background:#081d2eee;border:1px solid #ffcb7c;color:#e6faff;font:13px/1.5 sans-serif;z-index:12;pointer-events:none;white-space:pre-line';
 const title=document.createElement('strong'),track=document.createElement('div'),fill=document.createElement('div'),hint=document.createElement('div');
 track.style.cssText='height:9px;background:#28404f;margin:7px 0';fill.style.cssText='height:100%;background:#6ff5e7';track.append(fill);panel.append(title,track,hint);document.body.append(panel);
 const markers=SWITCHYARD_SWITCHES.map(()=>{const m=document.createElement('div');m.className='switchyard-marker';m.hidden=true;m.style.cssText='position:fixed;transform:translate(-50%,-100%);padding:5px 8px;background:#07242cee;border:1px solid #7ffff0;color:#d8fff9;font:12px sans-serif;z-index:13;pointer-events:none';document.body.append(m);return m;});
 function update(rules,playing,interaction={},feedback=0,mark=''){
  const s=rules.state,r=rules.rail;panel.hidden=!playing||!s.active;
  panel.dataset.phase=s.phase;panel.dataset.exposed=String(s.phase==='exposed');panel.dataset.lane=String(r.lane);panel.dataset.armed=String(r.armed);panel.dataset.hp=String(s.hp);
  title.textContent=`${SWITCHYARD.name} · ${Math.ceil(s.hp)} / ${s.maxHp} · 阶段 ${s.tier}`;fill.style.width=(s.hp/s.maxHp*100)+'%';
  if(s.phase==='defeated')hint.textContent='调度核心停机 · 末班列车通道即将解锁';
  else if(s.phase==='exposed')hint.textContent=`核心暴露 ${s.timer.toFixed(1)}s · 攻击中央青色核心（枪械 / 近战均可）${mark?'\n'+mark:''}`;
  else {
   const n=r.lane+1;hint.textContent=r.mode==='moving'?`维护列车 ${n} 通行 · 远离红色轨道！${r.armed?'已导向护盾\n从侧面接近青色核心，避开轨道':'未切岔，等待下一列'}`:`轨道 ${n} · ${r.timer.toFixed(1)}s 后来车 · ${r.armed?'道岔已锁定\n从侧面接近青色核心，避开轨道':'找到 '+n+' 号道岔，面向控制器按住 E 0.6s'}`;
   if(!r.armed&&r.mode==='warning'&&interaction.near)hint.textContent+='\n'+(interaction.id!==r.lane?'这不是当前编号道岔':interaction.allowed?`按住 E · 切岔 ${Math.floor(r.hold/SWITCHYARD.hold*100)}%`:'站定、面向控制器、停止射击/换弹，受击后稍候');
   hint.textContent+='\n列车只破盾，不扣核心生命\n琥珀圈锁定旧位置 · 横移躲避';
   if(feedback>0)hint.textContent+='\n护盾抵挡！先切换亮起编号的道岔';
  }
  panel.style.borderColor=s.phase==='exposed'?'#6ff5e7':'#ffcb7c';
 }
 return {panel,markers,update,hide(){panel.hidden=true;markers.forEach(m=>m.hidden=true);}};
}
