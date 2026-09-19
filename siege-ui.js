export function createSiegeUI(config){
 const panel=document.createElement('section');panel.className='boss-mechanic '+config.id+'-panel';panel.hidden=true;
 panel.style.cssText='position:fixed;top:118px;left:50%;transform:translateX(-50%);width:440px;max-width:calc(100vw - 32px);padding:12px;box-sizing:border-box;background:#121e2fee;border:1px solid #ffc575;color:#eef5ff;font:13px/1.5 sans-serif;z-index:12;pointer-events:none;white-space:pre-line';
 const title=document.createElement('strong'),track=document.createElement('div'),fill=document.createElement('div'),hint=document.createElement('div');track.style.cssText='height:9px;background:#35344c;margin:7px 0';fill.style.cssText='height:100%;background:#82fff1';track.append(fill);panel.append(title,track,hint);document.body.append(panel);
 const markers=config.controls.map(()=>{const m=document.createElement('div');m.hidden=true;m.style.cssText='position:fixed;transform:translate(-50%,-100%);padding:4px 7px;background:#121e2fee;color:#ffc575;border:1px solid #ffc575;font:12px sans-serif;pointer-events:none;z-index:11';document.body.append(m);return m;});
 function update(rules,playing,interaction,feedback,mark,feetY){const s=rules.state,a=rules.arena;panel.hidden=!playing||!s.active;Object.assign(panel.dataset,{phase:s.phase,hp:String(s.hp),unit:String(a.index),mode:a.mode});
  title.textContent=`${config.name} · ${Math.ceil(s.hp)} / ${config.hp} · ${a.index+1}/${config.units}`;fill.style.width=(s.hp/config.hp*100)+'%';let text;
  if(s.phase==='defeated')text='核心停机 · 清理残余守卫后开放撤离';
  else if(a.mode==='transition')text='旋翼已摧毁 · 车内控制核已解锁\n从控制车左侧楼梯返回 1.5m 车内';
  else if(a.mode==='operation')text=config.id==='skyhook'?'牵引 / 断路进行中 · 立即前往青色核心':'吊箱下落中 · 立即前往青色核心，落箱后攻击';
  else if(s.phase==='exposed')text=`${rules.floor}m 核心暴露 ${s.timer.toFixed(1)}s · 本段 ${Math.ceil(a.unitHp)} HP\n枪械 / 能量刀均可，同层攻击青色核心${mark?'\n'+mark:''}`;
  else text=`${config.objective[a.index]} / ${rules.floor}m\n面向对应控制柱，站定按住 E 0.6s · 可反复使用`;
  if(config.id==='skyhook'&&s.phase!=='defeated'&&a.mode!=='transition'&&Number.isFinite(feetY)&&Math.abs(feetY-rules.floor)>.6)text+='\n'+(a.index===0?'目标在 4.5m 车顶 · 沿控制车左侧楼梯上楼':'目标在 1.5m 车内 · 沿控制车左侧楼梯下楼');
  if(s.phase!=='defeated')text+='\n'+(rules.attack.mode==='warning'?'金色落点已锁定！横移、跳跃或利用遮挡':'金色圈为旧位置轰击预警；暴露时停止轰击');
  if(config.id==='leviathan'&&s.phase==='shield')text+='\n高架缺口需跳跃；坠落沿西侧金色台阶返回';
  if(interaction?.near&&s.phase==='shield'&&a.mode==='ready')text+='\n'+(interaction.allowed?`按住 E · ${Math.floor(a.hold/.6*100)}%`:interaction.id!==a.index?'当前编号不匹配':'请站定、面向同层按钮并保持视线');
  if(feedback>0)text+='\n装甲抵挡：先操作机关，窗口内攻击同层青色核心';hint.textContent=text;
 }
 return {panel,markers,update,dispose(){panel.remove();markers.forEach(m=>m.remove());}};
}
