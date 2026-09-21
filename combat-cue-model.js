import {keyLabel} from './input-bindings.js';
export function interactionKey(bindings=globalThis.neonInput?.bindings){return keyLabel(bindings?.codesFor('interact')?.[0]||'KeyE');}
export function wardenCue(state){return state.openRemaining>0?{kind:'exposed',symbol:'◇'}:state.transitionRemaining>0?{kind:'warning',symbol:'▲'}:{kind:'shield',symbol:'■'};}
// Read-only projection. The original rules own all timers, lanes, HP and interaction eligibility.
export function switchyardCue(rules,interaction={},feedback=0,mark='',key='E',holdDuration=.6){
 const s=rules.state,r=rules.rail,n=r.lane+1;
 if(s.phase==='defeated')return {kind:'complete',label:'✓ 核心停机',detail:'末班列车通道即将解锁'};
 if(s.phase==='exposed')return {kind:'exposed',label:'◇ 核心暴露',detail:`攻击中央核心 · 枪械 / 近战均可\n暴露剩余 ${s.timer.toFixed(1)}s${mark?'\n'+mark:''}`};
 const moving=r.mode==='moving';let action=moving?`▲ ${n} 号列车通行 · 远离轨道`:r.armed?'道岔已锁定 · 从侧面接近核心':`找到 ${n} 号道岔 · 面向控制器按住 ${key} ${holdDuration.toFixed(1)}s`;
 if(!moving&&!r.armed&&interaction.near)action=interaction.id!==r.lane?`当前为 ${n} 号 · 这不是当前编号道岔`:interaction.allowed?`按住 ${key} · 切岔 ${Math.floor(r.hold/holdDuration*100)}%`:'站定并面向控制器 · 停止射击/换弹，受击后稍候';
 if(feedback>0&&!moving&&!r.armed)action=`护盾抵挡 · 先切换亮起的 ${n} 号道岔`;
 const timing=moving?(r.armed?'已导向护盾 · 从侧面接近核心':'未切岔 · 等待下一列'):`${r.timer.toFixed(1)}s 后来车 · 列车只破盾`;
 return {kind:moving?'warning':'shield',label:moving?'▲ 列车通行':'■ 护盾生效',detail:[action,timing,moving?'列车只破盾 · 预警圈锁定旧位，横移躲避':'琥珀圈锁定旧位置 · 横移躲避'].join('\n')};
}
