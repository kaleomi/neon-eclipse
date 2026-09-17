// Settings panel: five sliders + mute + an "audio lab" that previews catalog sounds.
import {BUSES} from './audio-bus.js';
import {SFX_NAMES} from './sfx-catalog.js';
const LABELS={master:'总音量',music:'音乐',sfx:'音效',ui:'界面',voice:'提示音'};
const PREVIEW={'fire.vanguard':'步枪','fire.breacher':'霰弹枪','fire.ghost':'手枪','melee.swing':'能量刀','hit.head':'爆头','kill':'击破','telegraph.orange':'橙色预警','telegraph.purple':'紫色锁定','telegraph.amber':'琥珀三连','telegraph.pink':'Warden','telegraph.gold':'港务精英','player.hurt':'受伤','objective.complete':'阶段完成','mission.won':'撤离成功'};
export function bindAudioSettings(container,audio){
 if(!container||!audio)return null;
 const bus=audio.bus;
 container.innerHTML=`<h4>音量</h4><div class="menu-audio-sliders">${BUSES.map(b=>`<label class="menu-audio-row"><span>${LABELS[b]}</span><input type="range" min="0" max="100" step="1" data-audio-bus="${b}"><b data-audio-value="${b}"></b></label>`).join('')}</div>
 <label class="menu-audio-mute"><input type="checkbox" data-audio-mute><span>静音</span></label>
 <p class="menu-setting-hint">全部声音由程序实时合成，没有外部音频文件。暂停与切出标签页时自动静音。</p>
 <details class="menu-audio-lab"><summary>音效试听</summary><div class="menu-audio-lab-grid">${Object.entries(PREVIEW).map(([n,l])=>`<button type="button" class="menu-secondary" data-audio-preview="${n}">${l}</button>`).join('')}</div><p class="menu-setting-hint" data-audio-state></p></details>`;
 const $=s=>container.querySelector(s);
 function render(){
  const s=bus.settings;
  for(const b of BUSES){const v=Math.round(s[b]*100);$(`[data-audio-bus="${b}"]`).value=v;$(`[data-audio-value="${b}"]`).textContent=v+'%';}
  $('[data-audio-mute]').checked=s.muted;
  const snap=bus.snapshot();$('[data-audio-state]').textContent=snap.state==='none'?'点击任意处后启用音频。':`音频状态：${snap.state==='running'?'运行中':snap.state}${snap.suspendedBy.length?'（'+snap.suspendedBy.join(' / ')+'）':''}`;
 }
 for(const b of BUSES)$(`[data-audio-bus="${b}"]`).addEventListener('input',e=>{bus.setVolume(b,Number(e.target.value)/100);$(`[data-audio-value="${b}"]`).textContent=e.target.value+'%';});
 for(const b of BUSES)$(`[data-audio-bus="${b}"]`).addEventListener('change',()=>{audio.unlock().then(()=>audio.play(b==='music'?'ui.confirm':b==='ui'?'ui.click':'hit.body'));});
 $('[data-audio-mute]').addEventListener('change',e=>bus.setMuted(e.target.checked));
 container.querySelectorAll('[data-audio-preview]').forEach(btn=>btn.addEventListener('click',async()=>{await audio.unlock();audio.play(btn.dataset.audioPreview);}));
 bus.subscribe(render);render();
 return {render,names:SFX_NAMES};
}
