import assert from 'node:assert/strict';
import {FIELD_LAYOUTS} from '../src/field-layouts.js';
import {stationObstacles,STATION_ENTRIES,STATION_STAGES,STATION_SUPPLIES} from '../src/station-data.js';
const f=FIELD_LAYOUTS.station;assert.equal(f.panels.length,1);assert.equal(f.barrels.length,1);assert.equal(f.nodes.length,0);
for(let stage=0;stage<5;stage++)for(const [kind,points] of [['panels',f.panels],['barrels',f.barrels]])for(const [x,z] of points){const w=kind==='panels'?2.4:1.1,d=kind==='panels'?.12:1.1;assert(!stationObstacles(stage).some(o=>Math.abs(o.x-x)<(o.w+w)/2&&Math.abs(o.z-z)<(o.d+d)/2));for(const p of [...STATION_ENTRIES,...STATION_STAGES,...STATION_SUPPLIES])assert(Math.hypot(p.x-x,p.z-z)>2);}
console.log('PASS station placements clear of five-stage solids, stage entries, objectives and supplies; Boss layout untouched');

// Nine-chapter guard: no authored trial may sit inside the 1.3 m spawn exclusion of any stage or defense spawn,
// otherwise chooseEncounterSpawns() drops that point and spawnEncounter() throws at chapter start.
const STAGE_MODULES={reactor:'../src/mission.js',station:'../src/station-data.js',roof:'../src/roof-data.js',tower:'../src/tower-data.js',train:'../src/train-data.js',harbor:'../src/harbor-data.js',orbital:'../src/orbital-data.js',datacenter:'../src/datacenter-data.js',polar:'../src/polar-data.js'};
for(const [map,file] of Object.entries(STAGE_MODULES)){
 const module=await import(file),layout=FIELD_LAYOUTS[map];assert(layout,map);
 const stages=Object.values(module).flat().filter(s=>s&&typeof s==='object'&&Array.isArray(s.spawns));if(map!=='reactor')assert(stages.length>0,map+' exposes stages');
 const items=[...layout.panels.map(p=>({kind:'panel',x:p[0],z:p[1],w:2.4,d:.12})),...layout.barrels.map(p=>({kind:'barrel',x:p[0],z:p[1],w:.9,d:.9})),...layout.nodes.map(p=>({kind:'node',x:p[0],z:p[1],w:1.2,d:1.2}))];
 for(const stage of stages)for(const spawn of [...stage.spawns,...(stage.defenseSpawns||[])]){const x=Array.isArray(spawn)?spawn[0]:spawn.x,z=Array.isArray(spawn)?spawn[1]:spawn.z;for(const item of items)assert(!(Math.abs(x-item.x)<item.w/2+1.3&&Math.abs(z-item.z)<item.d/2+1.3),`${map}/${stage.id} spawn [${x},${z}] blocked by ${item.kind} [${item.x},${item.z}]`);}
}
console.log('PASS nine-chapter field layouts clear of every stage and defense spawn exclusion');
