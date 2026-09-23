// Chapter asset warm-up. Pure helpers decide *what* to fetch; the two `warm*` functions only start
// the same cached loaders the runtime already uses, so a warm-up can never change what gets shown —
// it only moves the network/decode cost from "first enemy of that type appears" to chapter entry.
import {roleForStage} from './enemy-rules.js';
import {RECORDED_EVENTS} from '../audio/recorded-audio.js';

// Enemy types a chapter can spawn from its stage roster (roles or the reactor ROLE_SETS fallback).
export function chapterEnemyTypes(stages){
 const types=new Set();
 for(const stage of stages||[]){const count=Math.max(1,stage.count||1);for(let i=0;i<count;i++)types.add(roleForStage(stage,i));}
 return types;
}

// Which asset loader owns which enemy type. Types without a GLB (procedural meshes) map to nothing.
export function loaderForType(type,loaders){
 if(type==='assault'||type==='heavy')return loaders.guardVariant?()=>loaders.guardVariant(type):null;
 if(type==='ranged')return loaders.ranged||null;
 if(type==='engineer')return loaders.engineer||null;
 if(type==='commander')return loaders.commander||null;
 if(type==='sniper')return loaders.sniper||null;
 if(type==='shield')return loaders.shield||null;
 if(loaders.rosterTypes?.has(type))return loaders.roster?()=>loaders.roster(type):null;
 return null;
}

// Start every loader for the given types. Never throws and never blocks: failures are already
// handled by the runtime attach path (it falls back to procedural meshes), we just count them.
export async function warmModels(types,loaders){
 const started=[],skipped=[];
 for(const type of types){const load=loaderForType(type,loaders);if(!load){skipped.push(type);continue;}started.push(type);}
 const results=await Promise.allSettled(started.map(type=>loaderForType(type,loaders)()));
 return {started,skipped,failed:started.filter((_,i)=>results[i].status==='rejected')};
}

// Recorded SFX events that can play on a map. Footstep surfaces and harbour cannon audio are the only
// per-map ones; everything else (weapons, reloads, impacts) is shared by every chapter.
const MAP_ONLY_EVENTS=Object.freeze({
 'player.step.snow':['polar'],
 'player.step.gravel':['harbor'],
 'cannon.fire':['harbor'],'cannon.hit':['harbor'],'cannon.splash':['harbor'],
});
export function sfxEventsForMap(mapId){
 return Object.keys(RECORDED_EVENTS).filter(name=>{const maps=MAP_ONLY_EVENTS[name];return !maps||maps.includes(mapId);});
}
export function sfxFilesForMap(mapId){
 return [...new Set(sfxEventsForMap(mapId).flatMap(name=>RECORDED_EVENTS[name].files))];
}

// Test-only opt-out: `?warm=0` skips the chapter warm-up so a smoke run that only checks boot/menu paths
// does not pay for every roster GLB on a software renderer. Players never pass it; lazy loading still works.
export function warmupRequested(search){
  return new URLSearchParams(search||'').get('warm')!=='0';
}
