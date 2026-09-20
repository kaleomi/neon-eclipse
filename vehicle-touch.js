// Touch controls for the vehicle field. Builds its own DOM (no markup changes), only when the pointer is coarse or
// `?touch=1` is set. Pure helpers are exported for tests; the controller feeds the same key codes / look deltas as
// the keyboard, mouse and gamepad paths so every vehicle behaves identically regardless of input.
export const TOUCH_STICK={radius:56,threshold:.3,dead:.12};
export const TOUCH_LOOK_SCALE=1.6;// px of drag → mouse-movement units
export const TOUCH_BUTTONS=Object.freeze([
 {id:'brake',label:'刹车',code:'Space',hold:true},
 {id:'board',label:'上下车',code:'KeyE',hold:false},
 {id:'seat',label:'炮手',code:'KeyF',hold:false},
 {id:'engine',label:'启停',code:'KeyI',hold:false},
 {id:'cam',label:'视角',code:'KeyC',hold:false},
 {id:'up',label:'拉起',code:'ShiftLeft',hold:true},
 {id:'down',label:'下降',code:'ControlLeft',hold:true},
 {id:'recover',label:'回收',code:'KeyR',hold:true},
 {id:'fire',label:'开火',code:null,hold:true,action:'fire'},
 {id:'rocket',label:'火箭',code:null,hold:true,action:'rocket'},
 {id:'pause',label:'暂停',code:'Escape',hold:false}
]);
export function shouldShowTouch({matchMedia=null,search='',maxTouchPoints=0}={}){
 if(/[?&]touch=1\b/.test(search))return true;if(/[?&]touch=0\b/.test(search))return false;
 const coarse=typeof matchMedia==='function'?!!matchMedia('(pointer: coarse)')?.matches:false;
 return coarse||maxTouchPoints>1;
}
// Stick offset (px) → normalised vector + held WASD codes.
export function stickToKeys(dx,dy,cfg=TOUCH_STICK){
 const len=Math.hypot(dx,dy),nx=len>cfg.radius?dx/len:dx/cfg.radius,nz=len>cfg.radius?dy/len:dy/cfg.radius;
 const keys=new Set();const mag=Math.hypot(nx,nz);
 if(mag>=cfg.dead){if(nz<-cfg.threshold)keys.add('KeyW');if(nz>cfg.threshold)keys.add('KeyS');if(nx<-cfg.threshold)keys.add('KeyA');if(nx>cfg.threshold)keys.add('KeyD');}
 return {x:mag>1?nx/mag:nx,z:mag>1?nz/mag:nz,keys};
}
// Pure state machine used by the DOM layer. pointers: Map<id,{kind:'stick'|'look'|'button',...}>.
export function createTouchState(cfg=TOUCH_STICK){
 const pointers=new Map();let stick={x:0,z:0,keys:new Set()},look={x:0,y:0};const heldButtons=new Set(),taps=[];
 return {
  down(id,kind,x,y,button=null){pointers.set(id,{kind,ox:x,oy:y,x,y,button});if(kind==='button'&&button){if(button.hold)heldButtons.add(button.id);else taps.push(button.id);}},
  move(id,x,y){const p=pointers.get(id);if(!p)return;if(p.kind==='look'){look.x+=(x-p.x)*TOUCH_LOOK_SCALE;look.y+=(y-p.y)*TOUCH_LOOK_SCALE;}p.x=x;p.y=y;if(p.kind==='stick')stick=stickToKeys(x-p.ox,y-p.oy,cfg);},
  up(id){const p=pointers.get(id);if(!p)return;pointers.delete(id);if(p.kind==='stick')stick={x:0,z:0,keys:new Set()};if(p.kind==='button'&&p.button?.hold)heldButtons.delete(p.button.id);},
  // Frame read: consumes look delta and taps.
  read(){const out={stick:{x:stick.x,z:stick.z},keys:new Set(stick.keys),held:new Set(heldButtons),taps:taps.splice(0),look};look={x:0,y:0};return out;},
  clear(){pointers.clear();stick={x:0,z:0,keys:new Set()};heldButtons.clear();taps.length=0;look={x:0,y:0};},
  get active(){return pointers.size>0;}
 };
}
// DOM layer. Returns {root,state,poll()} where poll() yields the same shape as the gamepad poller: {press,release,edges,fire,rocket,look}.
export function mountVehicleTouch(doc,{state=createTouchState(),buttons=TOUCH_BUTTONS}={}){
 const root=doc.createElement('div');root.id='touch-controls';root.setAttribute('aria-label','触屏控制');
 root.innerHTML='<div class="touch-stick" data-zone="stick"><b></b></div><div class="touch-look" data-zone="look"></div><div class="touch-buttons"></div>';
 const bar=root.querySelector('.touch-buttons'),byId=new Map(buttons.map(b=>[b.id,b]));
 for(const b of buttons){const el=doc.createElement('button');el.type='button';el.dataset.touch=b.id;el.textContent=b.label;bar.appendChild(el);}
 const style=doc.createElement('style');style.textContent=`#touch-controls{position:fixed;inset:0;pointer-events:none;z-index:40;touch-action:none;user-select:none;-webkit-user-select:none}
#touch-controls .touch-stick{position:absolute;left:5vw;bottom:9vh;width:${TOUCH_STICK.radius*2}px;height:${TOUCH_STICK.radius*2}px;border-radius:50%;border:2px solid rgba(239,245,236,.45);background:rgba(20,32,38,.35);pointer-events:auto}
#touch-controls .touch-stick b{position:absolute;left:50%;top:50%;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;background:rgba(239,245,236,.75);transform:translate(var(--sx,0px),var(--sz,0px))}
#touch-controls .touch-look{position:absolute;right:0;top:12vh;bottom:30vh;width:55vw;pointer-events:auto}
#touch-controls .touch-buttons{position:absolute;right:3vw;bottom:5vh;display:grid;grid-template-columns:repeat(4,64px);gap:8px;pointer-events:auto}
#touch-controls .touch-buttons button{height:52px;border-radius:12px;border:1px solid rgba(239,245,236,.4);background:rgba(20,32,38,.55);color:#eff5ec;font:600 13px/1 inherit;letter-spacing:.06em}
#touch-controls .touch-buttons button[data-on="true"]{background:rgba(255,190,90,.75);color:#1a2b33}
body[data-touch-controls="false"] #touch-controls{display:none}`;
 doc.head.appendChild(style);doc.body.appendChild(root);
 const knob=root.querySelector('.touch-stick b');
 const zoneOf=t=>{const z=t.closest?.('[data-zone]');if(z)return z.dataset.zone;return t.closest?.('[data-touch]')?'button':null;};
 root.addEventListener('pointerdown',e=>{const zone=zoneOf(e.target);if(!zone)return;e.preventDefault();const btn=zone==='button'?byId.get(e.target.dataset.touch):null;state.down(e.pointerId,zone,e.clientX,e.clientY,btn);if(btn)e.target.dataset.on='true';try{e.target.setPointerCapture?.(e.pointerId);}catch{}});
 root.addEventListener('pointermove',e=>{state.move(e.pointerId,e.clientX,e.clientY);});
 const end=e=>{state.up(e.pointerId);if(e.target?.dataset?.touch)e.target.dataset.on='false';};
 root.addEventListener('pointerup',end);root.addEventListener('pointercancel',end);
 let injected=new Set();
 return {root,state,
  poll(){
   const r=state.read();const keys=new Set(r.keys);let fire=false,rocket=false;
   for(const id of r.held){const b=byId.get(id);if(!b)continue;if(b.action==='fire')fire=true;else if(b.action==='rocket')rocket=true;else if(b.code)keys.add(b.code);}
   const edges=r.taps.map(id=>byId.get(id)?.code).filter(Boolean);
   const press=[...keys].filter(c=>!injected.has(c)),release=[...injected].filter(c=>!keys.has(c));injected=keys;
   knob.style.setProperty('--sx',(r.stick.x*TOUCH_STICK.radius*.7).toFixed(1)+'px');knob.style.setProperty('--sz',(r.stick.z*TOUCH_STICK.radius*.7).toFixed(1)+'px');
   return {press,release,edges,fire,rocket,look:r.look,active:state.active||keys.size>0};
  },
  reset(){state.clear();const rel=[...injected];injected=new Set();for(const el of bar.querySelectorAll('button'))el.dataset.on='false';return rel;}
 };
}
