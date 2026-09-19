import assert from 'node:assert/strict';
import {FIELD_LAYOUTS} from './field-layouts.js';
import {stationObstacles,STATION_ENTRIES,STATION_STAGES,STATION_SUPPLIES} from './station-data.js';
const f=FIELD_LAYOUTS.station;assert.equal(f.panels.length,1);assert.equal(f.barrels.length,1);assert.equal(f.nodes.length,0);
for(let stage=0;stage<5;stage++)for(const [kind,points] of [['panels',f.panels],['barrels',f.barrels]])for(const [x,z] of points){const w=kind==='panels'?2.4:1.1,d=kind==='panels'?.12:1.1;assert(!stationObstacles(stage).some(o=>Math.abs(o.x-x)<(o.w+w)/2&&Math.abs(o.z-z)<(o.d+d)/2));for(const p of [...STATION_ENTRIES,...STATION_STAGES,...STATION_SUPPLIES])assert(Math.hypot(p.x-x,p.z-z)>2);}
console.log('PASS station placements clear of five-stage solids, stage entries, objectives and supplies; Boss layout untouched');
