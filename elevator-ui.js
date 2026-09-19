import {ELEVATOR,ELEVATOR_CALLS} from './elevator-data.js';
export function createElevatorUI(){
 const panel=document.createElement('section');panel.className='boss-mechanic elevator-panel';panel.hidden=true;
 panel.style.cssText='position:fixed;top:118px;left:50%;transform:translateX(-50%);width:440px;max-width:calc(100vw - 32px);padding:12px;box-sizing:border-box;background:#14172bee;border:1px solid #c8a5ff;color:#eef5ff;font:13px/1.5 sans-serif;z-index:12;pointer-events:none;white-space:pre-line';
 const title=document.createElement('strong'),track=document.createElement('div'),fill=document.createElement('div'),hint=document.createElement('div');track.style.cssText='height:9px;background:#35344c;margin:7px 0';fill.style.cssText='height:100%;background:#82fff1';track.append(fill);panel.append(title,track,hint);document.body.append(panel);
 const markers=ELEVATOR_CALLS.map(()=>{const el=document.createElement('div');el.className='elevator-call-marker';el.hidden=true;el.style.cssText='position:fixed;transform:translate(-50%,-100%);padding:4px 7px;color:#82fff1;background:#14172bee;border:1px solid #82fff1;font:12px sans-serif;z-index:11;pointer-events:none';document.body.append(el);return el;});
 function update(rules,lift,playing,feedback,interaction,mark){
  const s=rules.state,a=rules.arena;panel.hidden=!playing||!s.active;panel.dataset.phase=s.phase;panel.dataset.floor=String(rules.floor);panel.dataset.hp=String(s.hp);panel.dataset.lift=String(lift.y);panel.dataset.mode=a.mode;
  title.textContent=`${ELEVATOR.name} · ${Math.ceil(s.hp)} / ${s.maxHp} · 动力锁 ${a.index+1}/3`;fill.style.width=(s.hp/s.maxHp*100)+'%';
  let text;
  if(s.phase==='defeated')text='三组动力锁已断开 · 守卫停机，返回大厅撤离';
  else if(a.mode==='moving')text=`战斗升降台 ${lift.y.toFixed(1)} → ${lift.target}m · ${lift.blocked?'检测到阻挡，移离台边或下方':'慢速运行，站稳等待停靠'}`;
  else if(a.mode==='boarding')text=`下一组动力锁在 ${rules.floor}m · 返回升降台并站稳，自动前往目标层`;
  else if(s.phase==='exposed')text=`${rules.floor}m 核心暴露 ${s.timer.toFixed(1)}s · 本层剩余 ${Math.ceil(a.unitHp)} HP\n枪械 / 能量刀均可；只能攻击同层核心${mark?'\n'+mark:''}`;
  else text=`前往 ${rules.floor}m 检修台 · ${rules.floor?'跳过北侧 1.4m 缺口':'地面可步行抵达'}\n踏稳青色过载板 0.6s 破盾${a.latched?'（请先离板再踏回）':''} · 紫色横线锁定旧位置，可横移或跳跃`;
  if(s.phase!=='defeated')text+='\n坠落可在地面南侧或检修台呼叫柱按住 E 呼梯';
  if(interaction?.near)text+='\n'+(interaction.here?'战斗升降台已停靠本层':interaction.allowed?`按住 E 呼至 ${interaction.floor}m · ${Math.floor(interaction.hold/.6*100)}%`:'面向同层呼叫柱，站定；运行中请稍候');
  if(feedback>0)text+='\n护盾 / 楼层锁定：先到目标检修台踏板，暴露后同层攻击';
  hint.textContent=text;panel.style.borderColor=s.phase==='exposed'?'#82fff1':'#c8a5ff';
 }
 return {panel,markers,update,hide(){panel.hidden=true;}};
}
