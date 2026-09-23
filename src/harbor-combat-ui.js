export function createHarborCombatUI(){
 const root=document.createElement('aside');root.className='harbor-combat-status';root.hidden=true;root.setAttribute('aria-live','polite');root.style.cssText='position:fixed;top:114px;left:50%;transform:translateX(-50%);width:max-content;max-width:min(440px,calc(100vw - 32px));padding:9px 13px;border:1px solid #caad71;background:#102937ed;color:#e0edf0;font:12px/1.65 sans-serif;white-space:pre-line;pointer-events:none;z-index:7';document.body.append(root);let last='';
 function update(playing,mission,enemies,player){
  const elite=enemies.filter(e=>e.type==='harborElite'&&e.hp>0).sort((a,b)=>a.group.position.distanceToSquared(player)-b.group.position.distanceToSquared(player))[0];
  const visible=elite&&elite.group.position.distanceTo(player)<36,defending=mission.current.id==='harbor-beacon'&&mission.state.defending;
  root.hidden=!playing||!visible&&!defending;if(root.hidden)return;const lines=[];
  if(defending){const next=mission.current.defenseWaves?.[mission.state.wave];lines.push('码头强袭 / '+mission.state.progress.toFixed(1)+' / '+mission.current.defenseDuration+' 秒 · '+(next?'下一批 '+Math.max(0,next.at-mission.state.progress).toFixed(1)+' 秒':'增援全部到场 · 清除剩余守卫'));}
  if(visible){const open=elite.eliteState?.ventRemaining||0;lines.push('港务镇压者 · '+Math.ceil(elite.hp)+' / '+elite.maxHp+' HP · '+(open?'核心暴露 '+open.toFixed(1)+' 秒':elite.charge>0?'瞄准锁定 / 双轮扇射':'正面装甲 / 等待射击后散热'));lines.push(open?'青色胸核可反击 · 散热期间停止攻击':'金色预警线锁定旧位置 · 横移或躲入掩体');root.style.borderColor=open?'#79e5ce':'#caad71';}
  const text=lines.join('\n');if(text!==last){root.textContent=text;last=text;}
 }
 return {update};
}
