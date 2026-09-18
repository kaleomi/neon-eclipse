// Chapter-specific audio cues for chapters 07 / 08 / 09 (Phase 2 debt). Pure: diff two snapshots of
// world + boss state into sfx names; app.js plays them. No world or rules file changes their behaviour.
// snapshot: {map, band, padLive, waterPhase, bossPhase, bossAttack, bossShell, bossSunk, bossSummons, stormPhase, warmthLow, frost, discharges}
export const CHAPTER_CUE_SFX=Object.freeze({
 // 07 orbital: gravity band change, landing pad going live, TETHER pulse warning / pulse, exposure open / close
 'band.change':'orbital.band','pad.live':'orbital.pad','tether.warning':'tether.pulse.warn','tether.pulse':'tether.pulse','tether.exposed':'boss.window.open','tether.shielded':'boss.window.close',
 // 08 datacenter: tide rising / high / draining, ABYSS discharge warning / discharge, summon splash, exposure
 'water.rising':'tide.rise','water.high':'tide.high','water.draining':'tide.drain','abyss.warning':'abyss.discharge.warn','abyss.discharge':'abyss.discharge','abyss.summon':'abyss.summon','abyss.exposed':'boss.window.open','abyss.shielded':'boss.window.close',
 // 09 polar: storm closing / whiteout / clearing, warmth warning, frostbite tick, GLACIER shell warning / impact, ice crack (press), sunk, climb out
 'storm.closing':'storm.closing','storm.whiteout':'storm.whiteout','storm.clearing':'storm.clearing','warmth.low':'warmth.low','frost.tick':'frost.tick',
 'glacier.warning':'glacier.shell.warn','glacier.shell':'glacier.shell','glacier.press':'ice.crack','glacier.sunk':'ice.break','glacier.climb':'glacier.climb'
});
// Build a snapshot from the live app objects. Everything optional: missing getters just leave fields undefined.
export function chapterSnapshot({map,art,overseer,feetY,padLive=false}={}){
 const s=overseer?.state;
 return {
  map,
  band:map==='orbital'&&art?.gravityAt?Math.round(art.gravityAt(feetY)*100):undefined,
  padLive:map==='orbital'?Boolean(padLive):undefined,
  waterPhase:map==='datacenter'?art?.phase:undefined,
  stormPhase:map==='polar'?art?.phase:undefined,
  warmthLow:map==='polar'&&Number.isFinite(art?.warmth)?art.warmth<=30:undefined,
  frost:map==='polar'&&Number.isFinite(art?.warmth)?art.warmth<=0:undefined,
  bossActive:Boolean(overseer?.blocking),
  bossPhase:s?.phase,bossAttack:s?.attack,bossShell:s?.shell,bossPress:s?.press,
  discharges:s?.discharges,summons:s?.summons,sinks:s?.sinks
 };
}
// prev null = baseline, returns []. Returns [{cue,sfx,opts}] in a stable order.
export function chapterCues(prev,next){
 if(!prev||!next||prev.map!==next.map)return [];
 const out=[];const cue=(c,opts)=>out.push({cue:c,sfx:CHAPTER_CUE_SFX[c],opts});
 const boss=next.bossActive&&prev.bossActive;
 if(next.map==='orbital'){
  if(prev.band!==undefined&&next.band!==prev.band)cue('band.change',{pitch:next.band<prev.band?1.18:.88});// less gravity (going up) = higher, lighter chime
  if(next.padLive&&!prev.padLive)cue('pad.live');
  if(boss){
   if(next.bossAttack==='warning'&&prev.bossAttack!=='warning')cue('tether.warning');
   if(next.bossAttack==='live'&&prev.bossAttack!=='live')cue('tether.pulse');
   if(next.bossPhase==='exposed'&&prev.bossPhase!=='exposed')cue('tether.exposed');
   if(prev.bossPhase==='exposed'&&next.bossPhase==='shield')cue('tether.shielded');
  }
 }else if(next.map==='datacenter'){
  if(next.waterPhase!==prev.waterPhase){
   if(next.waterPhase==='rising')cue('water.rising');else if(next.waterPhase==='high')cue('water.high');else if(next.waterPhase==='draining')cue('water.draining');
  }
  if(boss){
   if(next.bossAttack==='warning'&&prev.bossAttack!=='warning')cue('abyss.warning');
   if(next.bossAttack==='live'&&prev.bossAttack!=='live')cue('abyss.discharge');
   if(Number.isFinite(next.summons)&&Number.isFinite(prev.summons)&&next.summons>prev.summons)cue('abyss.summon');
   if(next.bossPhase==='exposed'&&prev.bossPhase!=='exposed')cue('abyss.exposed');
   if(prev.bossPhase==='exposed'&&next.bossPhase==='shield')cue('abyss.shielded');
  }
 }else if(next.map==='polar'){
  if(next.stormPhase!==prev.stormPhase){
   if(next.stormPhase==='closing')cue('storm.closing');else if(next.stormPhase==='whiteout')cue('storm.whiteout');else if(next.stormPhase==='clearing')cue('storm.clearing');
  }
  if(next.warmthLow&&!prev.warmthLow&&!next.frost)cue('warmth.low');
  if(next.frost&&!prev.frost)cue('frost.tick');
  if(boss){
   if(next.bossShell==='warning'&&prev.bossShell!=='warning')cue('glacier.warning');
   if(prev.bossShell==='warning'&&next.bossShell!=='warning')cue('glacier.shell');
   if((next.bossPress||0)>0&&!(prev.bossPress>0))cue('glacier.press');
   if(next.bossPhase==='sunk'&&prev.bossPhase!=='sunk')cue('glacier.sunk');
   if(next.bossPhase==='climbing'&&prev.bossPhase!=='climbing')cue('glacier.climb');
  }
 }
 return out;
}
// Stateful helper for app.js: keeps the previous snapshot, plays via `play(name,opts)`.
export function createChapterCues(play){
 let prev=null;
 return {
  update(snapshot){const cues=chapterCues(prev,snapshot);prev=snapshot;for(const c of cues)play(c.sfx,c.opts);return cues;},
  reset(){prev=null;}
 };
}
