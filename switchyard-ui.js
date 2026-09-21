import {switchyardCue,interactionKey} from './combat-cue-model.js';
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
  const cue=switchyardCue(rules,interaction,feedback,mark,interactionKey(),SWITCHYARD.hold);panel.dataset.cue=cue.kind;
  title.textContent=`${cue.label} · ${Math.ceil(s.hp)} / ${s.maxHp} · 阶段 ${s.tier}`;fill.style.width=(s.hp/s.maxHp*100)+'%';
  hint.textContent=cue.detail;
  panel.style.borderColor=s.phase==='exposed'?'#6ff5e7':'#ffcb7c';
 }
 return {panel,markers,update,hide(){panel.hidden=true;markers.forEach(m=>m.hidden=true);}};
}
