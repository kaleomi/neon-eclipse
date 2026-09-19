import {PARRY} from './parry-rules.js';
export function createParryUI(){
 const root=document.createElement('aside');root.className='parry-status';root.hidden=true;root.setAttribute('aria-label','能量刀弹反');
 const label=document.createElement('span');label.setAttribute('role','status');const track=document.createElement('div'),bar=document.createElement('i');track.append(bar);root.append(label,track);
 const style=document.createElement('style');style.textContent=`
.parry-status{position:fixed;left:50%;top:calc(50% + 92px);transform:translateX(-50%) skewX(-7deg);z-index:8;pointer-events:none;max-width:86vw;padding:8px 14px;color:#a7e8e7;background:linear-gradient(115deg,#071e28ed,#0b2735b8);border:1px solid #407d8980;border-left:3px solid #65d9e4;box-shadow:inset 0 1px #aeffff25,0 4px 16px #0007;font:12px/1.5 system-ui,sans-serif;letter-spacing:.06em;text-align:center}
.parry-status[hidden]{display:none}.parry-status span{display:block;transform:skewX(7deg)}.parry-status>div{height:2px;background:#203a47;margin-top:5px}.parry-status i{height:100%;display:block;background:#88fff0;width:0}.parry-status[data-state=active]{color:#c4fff1;border-color:#88fff0;box-shadow:inset 0 1px #aeffff40,0 0 14px #6bffe825}.parry-status[data-state=recovery]{border-left-color:#dcaf70}
`;
 document.head.append(style);document.body.append(root);
 function update(playing,selected,state){
  root.hidden=!playing||selected!==3;if(root.hidden)return;
  root.dataset.state=state.active?'active':state.recovery>0?'recovery':'ready';
  const text=state.feedback||(state.recovery>0?'回防恢复 · 暂不能挥砍或再次弹反':'右键弹反 · 正面橙弹 / 紫·琥珀·Boss 不可反');
  if(label.textContent!==text)label.textContent=text;
  bar.style.width=(state.active?state.remaining/PARRY.window*100:0)+'%';
 }
 return {update,destroy(){root.remove();style.remove();}};
}
