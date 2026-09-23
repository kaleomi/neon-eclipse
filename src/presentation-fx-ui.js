// Settings rows for batch-5 presentation: kill slow-motion, dissolve ghosts, chapter intro; plus a read-only
// weather line so players can see which preset the chapter (or URL modifier) applied.
import {WEATHER_PRESETS} from './weather-rules.js';
const ROWS=Object.freeze([['slowmo','精英/Boss 击杀慢动作','0.3 秒，仅表现'],['dissolve','击杀轮廓闪白与溶解','0.4 秒幽灵，不参与判定'],['intro','章节开场镜头','8–12 秒，可跳过']]);
export function bindPresentationFx(container,settings,save,{weather=null}={}){
 if(!container)return null;
 const box=document.createElement('div');box.className='presentation-fx';
 box.innerHTML=ROWS.map(([key,label,hint])=>`<label class="presentation-fx-row"><input type="checkbox" data-fx="${key}"><span>${label}<small>${hint}</small></span></label>`).join('')+
  (weather?`<p class="presentation-fx-weather" data-weather-line>本章天气：${WEATHER_PRESETS[weather.id]?.label||weather.id}${weather.intensity>0?' · 强度 '+Math.round(weather.intensity*100)+'%':''}${weather.id==='fog'?' · 远程锁定距离 −30%':''}</p>`:'');
 container.append(box);
 const inputs=[...box.querySelectorAll('[data-fx]')];
 const render=()=>inputs.forEach(i=>{i.checked=Boolean(settings[i.dataset.fx]);});
 inputs.forEach(i=>i.addEventListener('change',()=>{settings[i.dataset.fx]=i.checked;save();render();}));
 render();
 return {element:box,render};
}
