import {EQUIPPED_SLOTS} from './weapon-selection.js';
// Pure input layer: action table, rebindable key codes, gamepad mapping. No DOM, no three.
// app.js asks `bindings.is(code,'jump')` / `bindings.held(keys,'forward')` instead of comparing
// hard-coded `e.code`. Storage key `neon-eclipse.bindings.v1` holds only user overrides.
export const BINDINGS_KEY='neon-eclipse.bindings.v1';
export const ACTIONS=Object.freeze([
 {id:'forward',label:'前进',codes:['KeyW'],group:'move'},
 {id:'back',label:'后退',codes:['KeyS'],group:'move'},
 {id:'left',label:'左移',codes:['KeyA'],group:'move'},
 {id:'right',label:'右移',codes:['KeyD'],group:'move'},
 {id:'sprint',label:'冲刺',codes:['ShiftLeft','ShiftRight'],group:'move'},
 {id:'jump',label:'跳跃',codes:['Space'],group:'move'},
 ...EQUIPPED_SLOTS.map(({action,label,code})=>({id:action,label,codes:[code],group:'combat'})),
 {id:'reload',label:'换弹',codes:['KeyR'],group:'combat'},
 {id:'interact',label:'交互（按住）',codes:['KeyE'],group:'combat'},
 {id:'pickup',label:'拾取',codes:['KeyF'],group:'combat'},
 {id:'grenade',label:'投掷物（按住预览）',codes:['KeyG'],group:'combat'},
 {id:'special',label:'武器特技 / 重武器',codes:['KeyH'],group:'combat'},
 {id:'execute',label:'处决',codes:['KeyV'],group:'combat'},
 {id:'fieldKit',label:'野战整备',codes:['KeyT'],group:'menu'},
 {id:'loadout',label:'装备终端',codes:['KeyU'],group:'menu'},
 {id:'quality',label:'切换画质',codes:['KeyQ'],group:'menu'},
 {id:'pause',label:'暂停',codes:['Escape'],group:'menu'},
 {id:'turnLeft',label:'键盘左转',codes:['ArrowLeft'],group:'move'},
 {id:'turnRight',label:'键盘右转',codes:['ArrowRight'],group:'move'}
].map(Object.freeze));
const BY_ID=new Map(ACTIONS.map(a=>[a.id,a]));
// Escape / arrows / equipped-slot digits are reserved: rebinding them silently would break menus and weapon slots.
export const RESERVED_CODES=Object.freeze(['Escape','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',...EQUIPPED_SLOTS.map(slot=>slot.code),'Enter','Tab']);
export const LOCKED_ACTIONS=Object.freeze(['pause','turnLeft','turnRight',...EQUIPPED_SLOTS.map(slot=>slot.action)]);
export function keyLabel(code){
 if(typeof code!=='string')return '?';
 if(code.startsWith('Key'))return code.slice(3);
 if(code.startsWith('Digit'))return code.slice(5);
 return ({Space:'SPACE',ShiftLeft:'L-SHIFT',ShiftRight:'R-SHIFT',ControlLeft:'L-CTRL',ControlRight:'R-CTRL',AltLeft:'L-ALT',AltRight:'R-ALT',Escape:'ESC',ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',Tab:'TAB',Enter:'ENTER',Backquote:'`',Minus:'-',Equal:'=',BracketLeft:'[',BracketRight:']',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',Backslash:'\\',CapsLock:'CAPS'})[code]||code.toUpperCase();
}
export function sanitizeOverrides(raw){
 if(!raw||typeof raw!=='object'||raw.version!==1||!raw.overrides||typeof raw.overrides!=='object')return {};
 const out={};
 for(const [id,codes] of Object.entries(raw.overrides)){
  if(!BY_ID.has(id)||LOCKED_ACTIONS.includes(id)||!Array.isArray(codes))continue;
  const clean=codes.filter(c=>typeof c==='string'&&/^[A-Za-z0-9]{1,24}$/.test(c)&&!RESERVED_CODES.includes(c)).slice(0,2);
  if(clean.length)out[id]=clean;
 }
 return out;
}
// Returns {ok, reason, conflict} without mutating; conflict = action id currently owning the code.
export function validateRebind(overrides,action,code){
 if(!BY_ID.has(action))return {ok:false,reason:'unknown-action'};
 if(LOCKED_ACTIONS.includes(action))return {ok:false,reason:'locked'};
 if(typeof code!=='string'||!/^[A-Za-z0-9]{1,24}$/.test(code))return {ok:false,reason:'bad-code'};
 if(RESERVED_CODES.includes(code))return {ok:false,reason:'reserved'};
 for(const a of ACTIONS){if(a.id===action)continue;const codes=overrides[a.id]||a.codes;if(codes.includes(code))return {ok:true,conflict:a.id};}
 return {ok:true,conflict:null};
}
export function createBindings({storage=null}={}){
 let overrides={};
 const load=()=>{try{overrides=sanitizeOverrides(JSON.parse(storage?.getItem(BINDINGS_KEY)||'null'));}catch{overrides={};}};
 const save=()=>{try{if(Object.keys(overrides).length)storage?.setItem(BINDINGS_KEY,JSON.stringify({version:1,overrides}));else storage?.removeItem(BINDINGS_KEY);}catch{}};
 load();
 const codesFor=id=>overrides[id]||BY_ID.get(id)?.codes||[];
 const listeners=new Set();
 const emit=()=>{for(const fn of listeners)fn(api);};
 const api={
  get overrides(){return {...overrides};},
  codesFor,
  is(code,id){return codesFor(id).includes(code);},
  held(keys,id){for(const c of codesFor(id))if(keys.has(c))return true;return false;},
  actionFor(code){for(const a of ACTIONS)if(codesFor(a.id).includes(code))return a.id;return null;},
  // Rebind replaces the primary code; a conflicting action loses that code (swap semantics keep everything reachable).
  rebind(id,code){
   const v=validateRebind(overrides,id,code);if(!v.ok)return v;
   if(v.conflict){const prev=codesFor(id)[0];const other=codesFor(v.conflict).filter(c=>c!==code);overrides[v.conflict]=other.length?other:[prev].filter(Boolean);if(!overrides[v.conflict].length)delete overrides[v.conflict];}
   overrides[id]=[code,...codesFor(id).slice(1).filter(c=>c!==code)];
   if(overrides[id].join()===BY_ID.get(id).codes.join())delete overrides[id];
   save();emit();return v;
  },
  reset(id){if(id)delete overrides[id];else overrides={};save();emit();},
  isDefault(id){return !overrides[id];},
  legend(){return ACTIONS.map(a=>({id:a.id,label:a.label,group:a.group,keys:codesFor(a.id).map(keyLabel),custom:!!overrides[a.id]}));},
  onChange(fn){listeners.add(fn);return ()=>listeners.delete(fn);}
 };
 return api;
}
// ---- Gamepad (standard mapping) ----
export const GAMEPAD_BUTTONS=Object.freeze({0:'jump',1:'reload',2:'interact',3:'pickup',4:'execute',5:'grenade',7:'fire',6:'aim',8:'loadout',9:'pause',10:'sprint',11:'special',13:'fieldKit',14:'weaponPrev',15:'weaponNext'});
export function applyDeadzone(v,dz=.18){if(!Number.isFinite(v))return 0;const a=Math.abs(v);if(a<dz)return 0;return Math.sign(v)*Math.min(1,(a-dz)/(1-dz));}
// Snapshot: {axes:number[], buttons:{pressed:boolean,value:number}[]} → normalised frame.
export function readGamepad(gp,{deadzone=.18,lookCurve=1.6}={}){
 const axes=gp?.axes||[],buttons=gp?.buttons||[];
 const mx=applyDeadzone(axes[0],deadzone),mz=applyDeadzone(axes[1],deadzone);
 const lx=applyDeadzone(axes[2],deadzone),ly=applyDeadzone(axes[3],deadzone);
 const curve=v=>Math.sign(v)*Math.pow(Math.abs(v),lookCurve);
 const held=new Set();
 buttons.forEach((b,i)=>{const on=typeof b==='object'?(b.pressed||b.value>.5):b>.5;if(on&&GAMEPAD_BUTTONS[i])held.add(GAMEPAD_BUTTONS[i]);});
 return {move:{x:mx,z:mz},look:{x:curve(lx),y:curve(ly)},held};
}
// Edge detector: returns {pressed:[], released:[]} between consecutive frames.
export function createGamepadInput({getGamepads=()=>[],deadzone=.18}={}){
 let prev=new Set(),connected=false;
 return {
  get connected(){return connected;},
  poll(){
   const pads=getGamepads()||[];let gp=null;for(const p of pads){if(p&&p.connected!==false){gp=p;break;}}
   connected=!!gp;
   const frame=gp?readGamepad(gp,{deadzone}):{move:{x:0,z:0},look:{x:0,y:0},held:new Set()};
   const pressed=[...frame.held].filter(a=>!prev.has(a)),released=[...prev].filter(a=>!frame.held.has(a));
   prev=frame.held;
   return {...frame,pressed,released,active:!!gp&&(frame.held.size>0||frame.move.x!==0||frame.move.z!==0||frame.look.x!==0||frame.look.y!==0)};
  },
  reset(){prev=new Set();}
 };
}
