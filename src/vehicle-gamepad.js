// Gamepad mapping for the vehicle field (vehicle.html). Pure: turns a readGamepad() frame into the key codes the
// keyboard handler already understands, plus a look delta in mouse-movement units. Standard-layout indices:
// 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 Back, 9 Start, 10 LS, 11 RS, 12–15 D-pad.
import {applyDeadzone} from './input-bindings.js';
export const VEHICLE_PAD={
 // Held mappings (button index → key code). Edge mappings (tap) are separate so they never repeat while held.
 held:Object.freeze({0:'Space',1:'ControlLeft',12:'ShiftLeft',13:'ControlLeft'}),
 edge:Object.freeze({2:'KeyF',3:'KeyC',4:'KeyE',5:'KeyI',8:'KeyR',9:'Escape',11:'KeyQ'}),
 axisThreshold:.35,lookSpeed:14,deadzone:.18
};
export const VEHICLE_PAD_HELP='手柄：左摇杆 驾驶/移动 · 右摇杆 视角/瞄准 · RT 开火 · LT 火箭 · A 刹车/悬停 · LB 上下车 · RB 直升机启停 · X 炮手位 · Y 视角 · 十字键上/下 拉起/下降 · Back 回收 · Start 暂停';
// Raw axes/buttons of a Gamepad-like object → {keys:Set<code>, edges:string[], look:{x,y}, fire, rocket, active}.
export function mapVehiclePad(gp,prevButtons=new Set(),cfg=VEHICLE_PAD){
 const axes=gp?.axes||[],buttons=gp?.buttons||[];
 const on=i=>{const b=buttons[i];return !!b&&(typeof b==='object'?(b.pressed||b.value>.5):b>.5);};
 const lx=applyDeadzone(axes[0],cfg.deadzone),ly=applyDeadzone(axes[1],cfg.deadzone),rx=applyDeadzone(axes[2],cfg.deadzone),ry=applyDeadzone(axes[3],cfg.deadzone);
 const keys=new Set();
 if(ly<-cfg.axisThreshold)keys.add('KeyW');if(ly>cfg.axisThreshold)keys.add('KeyS');
 if(lx<-cfg.axisThreshold)keys.add('KeyA');if(lx>cfg.axisThreshold)keys.add('KeyD');
 for(const [i,code] of Object.entries(cfg.held))if(on(Number(i)))keys.add(code);
 const now=new Set();for(const i of Object.keys(cfg.edge))if(on(Number(i)))now.add(Number(i));
 const edges=[...now].filter(i=>!prevButtons.has(i)).map(i=>cfg.edge[i]);
 // Sprint on stick click while walking; rocket on LT held.
 if(on(10))keys.add('ShiftLeft');
 const fire=on(7),rocket=on(6);
 const look={x:rx*cfg.lookSpeed,y:ry*cfg.lookSpeed};
 return {keys,edges,look,fire,rocket,buttons:now,active:keys.size>0||edges.length>0||fire||rocket||look.x!==0||look.y!==0};
}
// Stateful poller: keeps edge memory and remembers which codes it injected so keyboard-held keys are never dropped.
export function createVehicleGamepad({getGamepads=()=>[],cfg=VEHICLE_PAD}={}){
 let prev=new Set(),injected=new Set(),connected=false,id='';
 return {
  get connected(){return connected;},get id(){return id;},
  poll(){
   let gp=null;for(const p of getGamepads()||[]){if(p&&p.connected!==false){gp=p;break;}}
   connected=!!gp;id=gp?.id||'';
   const m=gp?mapVehiclePad(gp,prev,cfg):{keys:new Set(),edges:[],look:{x:0,y:0},fire:false,rocket:false,buttons:new Set(),active:false};
   prev=m.buttons;
   const release=[...injected].filter(c=>!m.keys.has(c)),press=[...m.keys].filter(c=>!injected.has(c));
   injected=new Set(m.keys);
   return {...m,press,release};
  },
  reset(){prev=new Set();const release=[...injected];injected=new Set();return release;}
 };
}
