import * as THREE from './node_modules/three/build/three.module.js';
import {EXECUTION} from './execution-rules.js';
import {equippedWeaponForKey} from './weapon-selection.js';
// Keyboard / mouse / pointer-lock listeners for the combat session, moved out of app.js unchanged. Registration order
// (pointerlockchange, blur, mousemove, canvas mousedown/leave, capture keydown, bubble keydown, keyup, mousedown,
// mouseup, contextmenu) is preserved; the paused menu relies on the capture-phase listener seeing keys first.
export function bindSessionInput(ctx){
 document.addEventListener('pointerlockchange',()=>{ctx.lookInput.reset();if(document.pointerLockElement!==ctx.renderer.domElement)ctx.pause();});
 window.addEventListener('blur',()=>{ctx.pause();if(document.pointerLockElement)document.exitPointerLock();});
 document.addEventListener('mousemove',e=>{
  if(ctx.state!=='playing'||ctx.chapterIntro?.active)return;
  const delta=ctx.lookInput.sample(e,document.pointerLockElement===ctx.renderer.domElement);if(!delta)return;
  const sensitivity=.0022*ctx.combatUI.sensitivity*(1-ctx.handling.state.ads*.35);
  ctx.yaw-=delta.x*sensitivity;ctx.pitch=THREE.MathUtils.clamp(ctx.pitch-delta.y*sensitivity,-1.35,1.35);
 });
 ctx.renderer.domElement.addEventListener('mousedown',e=>{if(ctx.state==='playing'&&e.button===0&&document.pointerLockElement!==ctx.renderer.domElement)ctx.lookInput.begin(e.clientX,e.clientY);});
 ctx.renderer.domElement.addEventListener('mouseleave',()=>ctx.lookInput.end());
 // Capture only the equipment shortcuts: the paused menu traps bubbling keys.
 document.addEventListener('keydown',e=>{
  if(e.code==='Escape'&&(ctx.loadoutWorld.open||ctx.fieldKit.open)){e.preventDefault();e.stopPropagation();ctx.loadoutWorld.hide();ctx.fieldKit.hide();queueMicrotask(()=>{if(!ctx.loadoutWorld.open&&!ctx.fieldKit.open)ctx.$('#deploy').focus({preventScroll:true});});return;}
  const typing=e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLTextAreaElement||e.target.isContentEditable;
  if(ctx.p4?.active&&ctx.bindings.is(e.code,'fieldKit')&&!typing){e.preventDefault();e.stopImmediatePropagation();ctx.notify('P4 使用波间整备；T 试点不会重开挑战，U 装备终端仍可使用');return;}
  if(ctx.bindings.is(e.code,'fieldKit')&&!e.repeat&&!typing&&ctx.fieldLayout){e.preventDefault();e.stopPropagation();if(ctx.state==='playing'){ctx.pause();document.exitPointerLock?.();}ctx.loadoutWorld.hide();if(ctx.fieldKit.open){ctx.fieldKit.hide();ctx.$('#deploy').focus();}else ctx.fieldKit.show();return;}
  if(ctx.bindings.is(e.code,'loadout')&&!e.repeat&&!typing){e.preventDefault();e.stopPropagation();if(ctx.loadoutWorld.open)ctx.loadoutWorld.hide();else{if(ctx.state==='playing'){ctx.pause();document.exitPointerLock?.();}ctx.fieldKit.hide();ctx.loadoutWorld.show();}}
 },true);
 document.addEventListener('keydown',e=>{
  if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLTextAreaElement||e.target.isContentEditable)return;
  if(ctx.state==='playing'&&['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(ctx.bindings.is(e.code,'quality')&&!e.repeat){ctx.toggleQuality();return;}
  if(e.code==='Escape'){ctx.pause();document.exitPointerLock?.();}
  if(ctx.state!=='playing')return;
  if(ctx.chapterIntro?.active){if(e.code==='Space'||e.code==='Enter'){e.preventDefault();ctx.chapterIntro.skip();}return;}
  ctx.keys.add(e.code);
  if(ctx.bindings.is(e.code,'pickup')&&!e.repeat){if(!ctx.ordnance.pick())ctx.weaponDrops.pick();return;}
  if(ctx.bindings.is(e.code,'grenade')){e.preventDefault();if(!e.repeat&&!ctx.parry.busy&&ctx.empReady()&&!ctx.emp.begin())ctx.notify(ctx.emp.charges?'投掷物引信正在运行':'当前投掷物已耗尽 · 本章不补充');return;}
  if(ctx.p4?.params.headshotsOnly&&ctx.bindings.is(e.code,'execute')){ctx.notify('弱点协议：处决关闭，请攻击头部、弱点或机关');return;}
  if(ctx.bindings.is(e.code,'execute')&&!e.repeat&&ctx.loadout.state.melee===3&&ctx.selected===3&&!ctx.execution.active&&!ctx.fieldKit.busy&&!ctx.ordnance.busy&&!ctx.parry.busy&&!ctx.meleePending&&ctx.cooldown<=0&&ctx.reload<=0&&ctx.handling.state.switchRemaining<=0){const target=ctx.executionTarget();if(ctx.execution.begin(target)){ctx.emp.cancelAim();ctx.cooldown=EXECUTION.cooldown;ctx.fireBuffer=0;ctx.firing=false;ctx.gameAudio.play('melee.swing');}return;}
  if(ctx.bindings.is(e.code,'special')&&!e.repeat){ctx.fireEquippedSpecial();return;}
  if(ctx.bindings.is(e.code,'jump')&&!e.repeat)ctx.jumpRequested=true;
  if(!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey){const index=equippedWeaponForKey(e.code,ctx.loadout.state);if(index!==null){ctx.changeWeapon(index);return;}}
  if(ctx.bindings.is(e.code,'reload'))ctx.startReload();
 });
 document.addEventListener('keyup',e=>{ctx.keys.delete(e.code);if(ctx.bindings.is(e.code,'special'))ctx.ordnance.cancelCharge();if(ctx.bindings.is(e.code,'grenade')){if(ctx.empReady()){ctx.camera.rotation.set(ctx.pitch,ctx.yaw,0);ctx.emp.release();}else ctx.emp.cancelAim();}});
 document.addEventListener('mousedown',e=>{if(ctx.state!=='playing')return;if(ctx.chapterIntro?.active){if(e.button===0)ctx.chapterIntro.skip();return;}if(e.button===0){if(ctx.selectedSpecial!==null){ctx.fireEquippedSpecial();return;}ctx.emp.cancelAim();ctx.firing=true;ctx.fireBuffer=.18;}if(e.button===2){
  if(ctx.selected===3&&ctx.loadout.state.melee===11){ctx.clearAim();return;}
  if(ctx.selected===3){ctx.clearAim();ctx.emp.cancelAim();if(ctx.parry.press({ready:!ctx.ordnance.busy&&!ctx.execution.active&&!ctx.fieldKit.busy&&ctx.cooldown<=0&&ctx.handling.state.switchRemaining<=0&&ctx.meleeRemaining<=0&&ctx.reload<=0})){ctx.fireBuffer=0;ctx.firing=false;ctx.gameAudio.play('weapon.switch');}}
  else ctx.aiming=ctx.aimInput.pressMouse();
 }});
 document.addEventListener('mouseup',e=>{if(e.button===0){ctx.firing=false;ctx.ordnance.cancelCharge();if(ctx.selected===6)ctx.cancelRail();ctx.lookInput.end();}if(e.button===2){ctx.aiming=ctx.aimInput.releaseMouse();ctx.parry.release();}});
 document.addEventListener('contextmenu',e=>e.preventDefault());
}
