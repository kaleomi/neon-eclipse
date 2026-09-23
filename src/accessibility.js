// Accessibility preferences: colour-vision mode, shape tags for telegraph colours, SFX subtitles.
// Pure rules (captions, palette) are exported for tests; `createAccessibility` wires DOM + storage.
export const A11Y_KEY='neon-eclipse.a11y.v1';
export const COLOR_MODES=Object.freeze(['off','deuteranopia','protanopia','tritanopia','high-contrast']);
export const A11Y_DEFAULTS=Object.freeze({colorMode:'off',shapes:false,subtitles:false,subtitleSize:1});
export function sanitizeA11y(raw){
 const out={...A11Y_DEFAULTS};
 if(!raw||typeof raw!=='object'||raw.version!==1)return out;
 if(COLOR_MODES.includes(raw.colorMode))out.colorMode=raw.colorMode;
 if(typeof raw.shapes==='boolean')out.shapes=raw.shapes;
 if(typeof raw.subtitles==='boolean')out.subtitles=raw.subtitles;
 if([1,1.25,1.5].includes(raw.subtitleSize))out.subtitleSize=raw.subtitleSize;
 return out;
}
// Telegraph colours used by enemy-rules attack.color → glyph shown next to enemy names / HUD warnings.
export const COLOR_SHAPES=Object.freeze({orange:'▲',purple:'◆',gold:'●',amber:'●',cyan:'■',green:'⬟',red:'✖',blue:'⬢',pink:'✦'});
export function shapeFor(color){return COLOR_SHAPES[color]||'';}
// Caption table for gameAudio names. Direction is resolved from listener/source at display time.
export const CAPTIONS=Object.freeze({
 'enemy.fire':{text:'敌方开火',kind:'threat'},
 'bolt.wall':{text:'弹丸击中掩体',kind:'threat'},
 'reinforcement':{text:'增援抵达',kind:'threat'},
 'boss.phase':{text:'首领阶段转换',kind:'threat'},
 'boss.window.open':{text:'首领弱点暴露',kind:'objective'},
 'boss.window.close':{text:'首领弱点关闭',kind:'objective'},
 'player.hazard':{text:'环境伤害',kind:'threat'},
 'player.death':{text:'倒下',kind:'threat'},
 'objective.node':{text:'节点完成',kind:'objective'},
 'objective.defense.start':{text:'防守开始',kind:'objective'},
 'supply.ammo':{text:'弹药补给',kind:'info'},
 'weapon.switch':{text:'切换武器',kind:'info'},
 'reload.shell':{text:'装填',kind:'info'},
 'rail.charge':{text:'轨道炮充能',kind:'info'},
 'halo.mark':{text:'光环标记',kind:'info'},
 'volt.chain':{text:'电弧连锁',kind:'info'},
 'ui.pause':{text:'暂停',kind:'info'},
 'ui.resume':{text:'继续',kind:'info'},
 'vehicle.impact':{text:'载具碰撞',kind:'threat'},
 'melee.hit':{text:'近战命中',kind:'info'},
 'hit.armor':{text:'护甲弹开',kind:'info'}
});
export function bearingFor(listener,yaw,source){
 if(!listener||!source)return null;
 const dx=source.x-listener.x,dz=source.z-listener.z;if(Math.hypot(dx,dz)<.5)return null;
 // Camera forward is -Z rotated by yaw; positive angle = source to the right.
 const forward={x:-Math.sin(yaw),z:-Math.cos(yaw)},right={x:Math.cos(yaw),z:-Math.sin(yaw)};
 const f=dx*forward.x+dz*forward.z,r=dx*right.x+dz*right.z;const a=Math.atan2(r,f);
 if(Math.abs(a)<Math.PI/4)return 'front';if(Math.abs(a)>3*Math.PI/4)return 'back';return a>0?'right':'left';
}
export const BEARING_GLYPH=Object.freeze({front:'▲',back:'▼',left:'◀',right:'▶'});
// Caption queue: dedupes same name within 250ms, holds max 4 lines, each 2.4s. Pure; `now` in seconds.
export function createCaptionQueue({max=4,life=2.4,dedupe=.25}={}){
 const lines=[];let seq=0;
 return {
  push(name,{bearing=null,now=0}={}){
   const c=CAPTIONS[name];if(!c)return null;
   const last=lines[lines.length-1];if(last&&last.name===name&&now-last.at<dedupe){last.count++;last.at=now;last.bearing=bearing||last.bearing;return last;}
   const line={id:++seq,name,text:c.text,kind:c.kind,bearing,count:1,at:now};lines.push(line);while(lines.length>max)lines.shift();return line;
  },
  update(now){for(let i=lines.length-1;i>=0;i--)if(now-lines[i].at>life)lines.splice(i,1);return lines;},
  get lines(){return lines.slice();},
  clear(){lines.length=0;}
 };
}
// SVG colour matrices (Machado 2009 simulation inverse-ish "daltonize" approximations kept mild so HUD stays legible).
const MATRICES={
 deuteranopia:'0.8 0.2 0 0 0  0.258 0.742 0 0 0  0 0.142 0.858 0 0  0 0 0 1 0',
 protanopia:'0.817 0.183 0 0 0  0.333 0.667 0 0 0  0 0.125 0.875 0 0  0 0 0 1 0',
 tritanopia:'0.967 0.033 0 0 0  0 0.733 0.267 0 0  0 0.183 0.817 0 0  0 0 0 1 0'
};
export function createAccessibility({storage=null,doc=globalThis.document}={}){
 let prefs=A11Y_DEFAULTS;
 try{prefs=sanitizeA11y(JSON.parse(storage?.getItem(A11Y_KEY)||'null'));}catch{}
 const listeners=new Set();
 function apply(){
  if(!doc)return;
  const root=doc.documentElement;root.dataset.colorMode=prefs.colorMode;root.dataset.a11yShapes=String(prefs.shapes);root.dataset.subtitles=String(prefs.subtitles);root.style.setProperty('--subtitle-scale',String(prefs.subtitleSize));
  let svg=doc.getElementById('a11y-filters');
  if(!svg){svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.id='a11y-filters';svg.setAttribute('aria-hidden','true');svg.style.cssText='position:absolute;width:0;height:0;overflow:hidden';svg.innerHTML=Object.entries(MATRICES).map(([id,m])=>`<filter id="cvd-${id}"><feColorMatrix type="matrix" values="${m}"/></filter>`).join('');doc.body?.append(svg);}
  const filter=MATRICES[prefs.colorMode]?`url(#cvd-${prefs.colorMode})`:prefs.colorMode==='high-contrast'?'contrast(1.25) saturate(1.3)':'';
  const canvas=doc.querySelector('canvas');if(canvas)canvas.style.filter=filter;
 }
 function set(patch){prefs=sanitizeA11y({version:1,...prefs,...patch});try{storage?.setItem(A11Y_KEY,JSON.stringify({version:1,...prefs}));}catch{}apply();for(const fn of listeners)fn(prefs);}
 apply();
 return {get prefs(){return {...prefs};},set,apply,onChange(fn){listeners.add(fn);return ()=>listeners.delete(fn);}};
}
// Subtitle panel: call `attach(gameAudio)` to wrap play(); `update(dt,{listener,yaw})` each frame.
export function createSubtitles({a11y,doc=globalThis.document}={}){
 const queue=createCaptionQueue();let root=null,time=0,listener=null,yaw=0;
 function ensure(){if(root||!doc)return;root=doc.createElement('div');root.className='sfx-subtitles';root.setAttribute('role','log');root.setAttribute('aria-live','polite');root.hidden=true;doc.body.append(root);}
 function render(){
  ensure();if(!root)return;const lines=queue.update(time);const on=a11y?.prefs.subtitles!==false&&lines.length>0;root.hidden=!on;if(!on)return;
  root.replaceChildren(...lines.map(l=>{const el=doc.createElement('div');el.dataset.kind=l.kind;el.textContent=(l.bearing?BEARING_GLYPH[l.bearing]+' ':'')+l.text+(l.count>1?' ×'+l.count:'');return el;}));
 }
 return {
  attach(audio){if(!audio||audio.__subtitled)return audio;const play=audio.play.bind(audio);audio.play=(name,opts)=>{if(a11y?.prefs.subtitles)queue.push(name,{bearing:bearingFor(listener,yaw,opts?.position),now:time});return play(name,opts);};audio.__subtitled=true;return audio;},
  update(dt,view){time+=dt;if(view){listener=view.listener;yaw=view.yaw;}render();},
  clear(){queue.clear();render();},
  get queue(){return queue;}
 };
}
