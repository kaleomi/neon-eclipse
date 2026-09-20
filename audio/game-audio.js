// Facade wiring bus + sfx + music for the FPS page. app.js calls `audio.play(name, opts)` and
// `audio.update(dt, facts)`; everything else (unlock on gesture, pause/hidden suspend, low-health
// heartbeat, kill streak) is handled here so app.js stays small.
import {createAudioBus} from './audio-bus.js';
import {createSfxPlayer} from './sfx-player.js';
import {createRecordedMusicDirector} from './recorded-music.js';
import {TELEGRAPH_BY_COLOR,WEAPON_FIRE} from './sfx-catalog.js';
import {createRecordedLoops} from './recorded-audio.js';
export const STREAK_STEPS=Object.freeze([3,5,10]);
// Pure: kill-streak tracker. Kills within `window` seconds chain; returns the step reached or 0.
export function createStreak({window=4}={}){
 let count=0,timer=0;
 return {get count(){return count;},update(dt){if(count>0){timer-=dt;if(timer<=0){count=0;timer=0;}}},kill(){count++;timer=window;return STREAK_STEPS.includes(count)?count:0;},reset(){count=0;timer=0;}};
}
export function createGameAudio({storage,bus=createAudioBus({storage}),music=true,preloadFiles=null}={}){
 const sfx=createSfxPlayer(bus,{preloadFiles});
 const ambience=createRecordedLoops(bus);let previousPosition=null,stepDistance=0;
 const director=music?createRecordedMusicDirector(bus):null;
 const streak=createStreak(),pendingStreak=new Set();
 let heartbeat=0,listener={x:0,z:0,yaw:0},hidden=false;
 function play(name,opts){return sfx.play(name,{...opts,listener:opts?.position?listener:undefined});}
 function bindLifecycle(){
  if(typeof document==='undefined')return;
  document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden)bus.hold('hidden');else bus.release('hidden');});
  const gesture=()=>{bus.unlock().then(ok=>{if(ok&&director&&!director.running)director.start();});};
  for(const type of ['pointerdown','keydown'])window.addEventListener(type,gesture,{passive:true});
 }
 bindLifecycle();
 return {
  bus,sfx,director,streak,ambience,
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
   const playing=facts.playState==='playing';
   ambience.update(playing?(facts.map==='harbor'?{rain:{gain:.075},water:{gain:.05}}:facts.map==='polar'||facts.map==='roof'||facts.map==='orbital'?{wind:{gain:.07}}:facts.map==='datacenter'?{water:{gain:.055}}:{}):{});
   if(playing&&facts.grounded&&previousPosition){
    const distance=Math.hypot(listener.x-previousPosition.x,listener.z-previousPosition.z);
    // Ignore teleports / checkpoint restores; jump and menu motion must not create footsteps.
    if(distance<2){stepDistance+=distance;if(stepDistance>=1.65){play(facts.map==='polar'?'player.step.snow':facts.map==='harbor'?'player.step.gravel':'player.step');stepDistance%=1.65;}}
    else stepDistance=0;
   }else stepDistance=0;
   previousPosition=playing?{x:listener.x,z:listener.z}:null;
   streak.update(dt);
   if(director){director.update(dt,facts);}
   if(facts.playState==='playing'&&facts.health>0&&facts.health<=25){heartbeat-=dt;if(heartbeat<=0){play('player.heartbeat');heartbeat=facts.health<=12?.7:1.05;}}else heartbeat=0;
  },
  reset(){for(const timer of pendingStreak)clearTimeout(timer);pendingStreak.clear();streak.reset();heartbeat=0;sfx.reset();ambience.reset();director?.reset();previousPosition=null;stepDistance=0;}
 };
}
