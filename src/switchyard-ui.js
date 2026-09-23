import {switchyardCue,switchyardHoldCue,interactionKey} from './combat-cue-model.js';
import {SWITCHYARD,SWITCHYARD_SWITCHES} from './switchyard-rules.js';
export function createSwitchyardUI(){
 const panel=document.createElement('section');panel.className='boss-mechanic switchyard-panel';panel.hidden=true;
 panel.style.cssText='position:fixed;top:118px;left:50%;transform:translateX(-50%);width:430px;max-width:calc(100vw - 32px);padding:12px;box-sizing:border-box;background:#081d2eee;border:1px solid #ffcb7c;color:#e6faff;font:13px/1.5 sans-serif;z-index:12;pointer-events:none;white-space:pre-line';
 const title=document.createElement('strong'),track=document.createElement('div'),fill=document.createElement('div'),hint=document.createElement('div');
 track.className='switchyard-health-track';fill.className='switchyard-health-fill';
 track.style.cssText='height:9px;background:#28404f;margin:7px 0';fill.style.cssText='height:100%;background:#6ff5e7';track.append(fill);
 // Separate the short E hold from the boss HP bar. No eased width: releasing E must visibly reset immediately.
 const holdRow=document.createElement('div'),holdLabel=document.createElement('span'),holdTrack=document.createElement('div'),holdFill=document.createElement('div'),holdValue=document.createElement('span');
 holdRow.className='switchyard-hold';holdLabel.className='switchyard-hold-label';holdTrack.className='switchyard-hold-track';holdFill.className='switchyard-hold-fill';holdValue.className='switchyard-hold-value';
 holdRow.style.cssText='display:flex;align-items:center;gap:8px;margin-top:7px;font:11px/1.35 sans-serif;white-space:normal';holdLabel.style.cssText='flex:0 0 auto';holdValue.style.cssText='min-width:3.5em;text-align:right;font-variant-numeric:tabular-nums';
 holdTrack.style.cssText='flex:1;min-width:0;height:7px;background:#203d4b;border:1px solid #617b85;border-radius:3px;overflow:hidden';holdFill.style.cssText='height:100%;width:0%;background:#ffcb7c;transition:none';
 holdTrack.setAttribute('role','progressbar');holdTrack.setAttribute('aria-label','道岔切换进度');holdTrack.setAttribute('aria-valuemin','0');holdTrack.setAttribute('aria-valuemax','100');holdTrack.append(holdFill);holdRow.append(holdLabel,holdTrack,holdValue);
 panel.append(title,track,hint,holdRow);document.body.append(panel);
 const markers=SWITCHYARD_SWITCHES.map(()=>{const m=document.createElement('div');m.className='switchyard-marker';m.hidden=true;m.style.cssText='position:fixed;transform:translate(-50%,-100%);padding:5px 8px;background:#07242cee;border:1px solid #7ffff0;color:#d8fff9;font:12px sans-serif;z-index:13;pointer-events:none';document.body.append(m);return m;});
 function update(rules,playing,interaction={},feedback=0,mark=''){
  const s=rules.state,r=rules.rail;panel.hidden=!playing||!s.active;
  panel.dataset.phase=s.phase;panel.dataset.exposed=String(s.phase==='exposed');panel.dataset.lane=String(r.lane);panel.dataset.armed=String(r.armed);panel.dataset.hp=String(s.hp);
  const key=interactionKey(),cue=switchyardCue(rules,interaction,feedback,mark,key,SWITCHYARD.hold),hold=switchyardHoldCue(rules,interaction,key,SWITCHYARD.hold);panel.dataset.cue=cue.kind;
  holdRow.hidden=panel.hidden||!hold.visible;holdRow.style.display=holdRow.hidden?'none':'flex';holdRow.dataset.state=hold.kind;panel.dataset.holdState=hold.kind;panel.dataset.holdProgress=String(hold.percent);
  holdLabel.textContent=hold.label;holdValue.textContent=hold.percent+'%';holdFill.style.width=hold.percent+'%';holdFill.style.background=hold.kind==='armed'?'#6ff5e7':['ready','holding'].includes(hold.kind)?'#ffcb7c':'#7893a2';
  holdTrack.setAttribute('aria-valuenow',String(hold.percent));holdTrack.setAttribute('aria-valuetext',hold.description+' · '+hold.percent+'%');holdRow.title=hold.description;
  title.textContent=`${cue.label} · ${Math.ceil(s.hp)} / ${s.maxHp} · 阶段 ${s.tier}`;fill.style.width=(s.hp/s.maxHp*100)+'%';
  hint.textContent=cue.detail;
  panel.style.borderColor=s.phase==='exposed'?'#6ff5e7':'#ffcb7c';
 }
 return {panel,markers,update,hide(){panel.hidden=true;markers.forEach(m=>m.hidden=true);}};
}
