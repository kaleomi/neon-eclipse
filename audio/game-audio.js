// Facade wiring bus + sfx + music for the FPS page. app.js calls `audio.play(name, opts)` and
// `audio.update(dt, facts)`; everything else (unlock on gesture, pause/hidden suspend, low-health
// heartbeat, kill streak) is handled here so app.js stays small.
import {createAudioBus} from './audio-bus.js';
import {createSfxPlayer} from './sfx-player.js';
import {createMusicDirector} from './music-director.js';
import {TELEGRAPH_BY_COLOR,WEAPON_FIRE} from './sfx-catalog.js';
export const STREAK_STEPS=Object.freeze([3,5,10]);
// Pure: kill-streak tracker. Kills within `window` seconds chain; returns the step reached or 0.
export function createStreak({window=4}={}){
 let count=0,timer=0;
 return {get count(){return count;},update(dt){if(count>0){timer-=dt;if(timer<=0){count=0;timer=0;}}},kill(){count++;timer=window;return STREAK_STEPS.includes(count)?count:0;},reset(){count=0;timer=0;}};
}
export function createGameAudio({storage,bus=createAudioBus({storage}),music=true}={}){
 const sfx=createSfxPlayer(bus);
 const director=music?createMusicDirector(bus):null;
 const streak=createStreak(),pendingStreak=new Set();
 let heartbeat=0,listener={x:0,z:0,yaw:0},hidden=false;
 function play(name,opts){return sfx.play(name,{...opts,listener:opts?.position?listener:undefined});}
 function bindLifecycle(){
  if(typeof document==='undefined')return;
  document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden)bus.hold('hidden');else bus.release('hidden');});
  const gesture=()=>{bus.unlock().then(ok=>{if(ok&&director&&!director.state)director.start();});};
  for(const type of ['pointerdown','keydown'])window.addEventListener(type,gesture,{passive:true});
 }
 bindLifecycle();
 return {
  bus,sfx,director,streak,
  play,
  weaponFire:index=>play(WEAPON_FIRE[index]||'fire.vanguard'),
  telegraph:(color,position,occluded)=>play(TELEGRAPH_BY_COLOR[color]||'telegraph.orange',{position,occluded}),
  hit({killed,headshot,armored,core,elite,boss}){
   if(killed){const step=streak.kill();play(boss?'kill.boss':elite?'kill.elite':'kill');if(step){const timer=setTimeout(()=>{pendingStreak.delete(timer);play('streak');},120);pendingStreak.add(timer);}return step;}
   play(core?'hit.core':headshot?'hit.head':armored?'hit.armor':'hit.body');return 0;
  },
  hurt(health){play(health<=25?'player.hurt.low':'player.hurt');},
  setListener(x,z,yaw){listener={x,z,yaw};},
  async unlock(){const ok=await bus.unlock();if(ok&&director)director.start();return ok;},
  pause(){bus.hold('paused');},
  resume(){bus.release('paused');},
  update(dt,facts){
   streak.update(dt);
   if(director){director.update(dt,facts);}
   if(facts.playState==='playing'&&facts.health>0&&facts.health<=25){heartbeat-=dt;if(heartbeat<=0){play('player.heartbeat');heartbeat=facts.health<=12?.7:1.05;}}else heartbeat=0;
  },
  reset(){for(const timer of pendingStreak)clearTimeout(timer);pendingStreak.clear();streak.reset();heartbeat=0;}
 };
}
