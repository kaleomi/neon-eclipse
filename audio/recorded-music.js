import {resolveMusicState} from './music-director.js';

export const MUSIC_TRACKS=Object.freeze({
 explore:Object.freeze(['titan','last-and-first-light']),
 combat:Object.freeze(['legionnaire','pathfinder','the-fury'])
});
// Stream full tracks through the music bus: at most two media elements, no full-song PCM cache.
export function createRecordedMusicDirector(bus,{random=Math.random,mediaFactory=()=>new Audio()}={}){
 let state='idle',running=false,combatHold=0,active=null,starts=0;
 const groups=new Map();
 const isCombat=s=>['combat','boss','extract'].includes(s);
 const category=()=>isCombat(state)?'combat':'explore';
 function makeGroup(kind){
  const media=mediaFactory();media.preload='auto';media.loop=false;
  const source=bus.context.createMediaElementSource(media),gain=bus.context.createGain();
  source.connect(gain).connect(bus.input('music'));gain.gain.value=0;
  const g={kind,media,source,gain,bag:[],track:null,failed:new Set(),pending:false,serial:0};
  groups.set(kind,g);
  media.onended=()=>{if(running&&g===active){next(g);sync();}};
  media.onerror=()=>{g.failed.add(g.track);if(running&&g===active){next(g);sync();}};
  next(g);return g;
 }
 function next(g){
  g.serial++;g.pending=false;g.media.pause();
  g.bag=g.bag.filter(id=>!g.failed.has(id));
  if(!g.bag.length){
   g.bag=MUSIC_TRACKS[g.kind].filter(id=>!g.failed.has(id));
   for(let i=g.bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[g.bag[i],g.bag[j]]=[g.bag[j],g.bag[i]];}
   if(g.bag.length>1&&g.bag[0]===g.track)[g.bag[0],g.bag[1]]=[g.bag[1],g.bag[0]];
  }
  g.track=g.bag.shift()??null;
  if(g.track){g.media.src=new URL(`./music/${g.track}.mp3`,import.meta.url).href;g.media.load();}
 }
 function sync(){
  if(!running)return;
  if(!bus.ready){for(const g of groups.values())g.media.pause();return;}
  const kind=category();
  const g=groups.get(kind)||makeGroup(kind);
  if(g.media.ended||(g.track&&g.failed.has(g.track)))next(g);
  if(active!==g){
   if(active){active.media.pause();active.gain.gain.cancelScheduledValues(bus.now);active.gain.gain.setValueAtTime(0,bus.now);}
   active=g;g.gain.gain.setValueAtTime(0,bus.now);
  }
  const level=state==='lost'?.18:isCombat(state)?.48:.34;
  if(g.level!==level||g.media.paused){g.gain.gain.setTargetAtTime(level,bus.now,.35);g.level=level;}
  if(g.track&&g.media.paused&&!g.pending){
   g.pending=true;const serial=g.serial;starts++;
   Promise.resolve(g.media.play()).catch(()=>{}).finally(()=>{
    if(g.serial!==serial)return;
    g.pending=false;
    if(!running||active!==g||!bus.ready)g.media.pause();
   });
  }
 }
 // Subscribe only resumes existing playback; reset remains silent until the next game update.
 const unsubscribe=bus.subscribe(()=>{if(active)sync();});
 function reset(){
  active=null;
  for(const g of groups.values()){
   g.serial++;g.media.onended=null;g.media.onerror=null;g.media.pause();
   g.media.removeAttribute('src');g.media.load();g.source.disconnect();g.gain.disconnect();
  }
  groups.clear();state='idle';combatHold=0;
 }
 return {
  start(){running=true;sync();return true;},
  stop(){running=false;reset();},reset,
  dispose(){running=false;reset();unsubscribe();},
  get state(){return state;},get running(){return running;},
  stats:()=>({state,running,starts,voices:active?.track?[`music-${active.kind}`]:[],track:active?.track??null,currentTime:active?.media.currentTime??0,duration:active?.media.duration??0,paused:active?.media.paused??true,players:groups.size}),
  setState(nextState){const changed=state!==nextState;state=nextState;sync();return changed;},
  update(dt,facts){
   let nextState=resolveMusicState(facts);
   if(isCombat(nextState))combatHold=8;
   else if(nextState==='explore'&&combatHold>0){combatHold=Math.max(0,combatHold-Math.max(0,dt));if(combatHold>0)nextState='combat';}
   else combatHold=0;
   const changed=state!==nextState;state=nextState;sync();return changed;
  }
 };
}
