import assert from 'node:assert/strict';
import {STATION_STAGES,STATION_ENTRIES,STATION_SUPPLIES,STATION_GATES,stationObstacles} from './station-data.js';
globalThis.location={search:'?map=station'};
const {createNavigator,ARENA}=await import('./arena.js');
const {STAGES,SUPPLIES,createMission,chooseEncounterSpawns}=await import('./mission.js');
const {SAVE_KEY,createCampaignStore}=await import('./campaign.js');
assert.equal(STAGES,STATION_STAGES);assert.equal(SUPPLIES,STATION_SUPPLIES);assert.equal(SAVE_KEY,'neon-eclipse.station.v1');assert.equal(ARENA.start.x,-24);
const terminals=STAGES.filter(s=>s.id!=='extract').map(s=>({x:s.x,z:s.z,w:1.8,d:1,h:1.4}));
const blocked=(o,p,r=1.3)=>o.some(b=>Math.abs(p.x-b.x)<b.w/2+r&&Math.abs(p.z-b.z)<b.d/2+r);
let guards=0;
for(let i=0;i<5;i++){
 const obs=stationObstacles(i).concat(terminals),nav=createNavigator(obs),entry=STATION_ENTRIES[i],s=STAGES[i];nav.rebuild(entry.x,entry.z);
 assert(!blocked(obs,entry,.4),'safe stage entry '+i);assert(nav.isReachable(s.x,s.z+2.4),'objective reachable '+i);
 const positions=chooseEncounterSpawns(s,entry,obs);assert.equal(positions.length,s.count,'spawn count '+i);
 for(const p of positions){assert(!blocked(obs,p));assert(nav.isReachable(p.x,p.z),'reachable guard '+i);guards++;}
 if(s.defenseCount){const d=chooseEncounterSpawns({...s,count:s.defenseCount},{x:s.x,z:s.z+2.4},obs);assert.equal(d.length,3);for(const p of d)assert(nav.isReachable(p.x,p.z));guards+=d.length;}
 if(i<4){const next=STAGES[i+1];assert(!nav.isReachable(next.x,next.z+2.4),'future zone must remain locked '+i);}
}
assert.equal(guards,21);
const all=stationObstacles(4).concat(terminals),allNav=createNavigator(all);allNav.rebuild(-24,32);for(const p of SUPPLIES){assert(!blocked(all,p,.4));assert(allNav.isReachable(p.x,p.z),'reachable supply '+p.id);}
const obs=stationObstacles(0).concat(terminals),nav=createNavigator(obs);nav.rebuild(-24,32);assert(!nav.isReachable(-24,0));const gate=STATION_GATES[0];obs.splice(obs.findIndex(o=>o.x===gate.x&&o.z===gate.z&&o.w===gate.w),1);nav.invalidate();nav.rebuild(-24,32);assert(nav.isReachable(-24,0),'opening invalidates navigation even if player cell is unchanged');
const m=createMission();for(const s of STAGES){let e=m.tick(s.duration+.01,{player:{x:s.x,z:s.z+2.4},held:true,clear:true});if(e.type==='defense'){assert.equal(s.id,'dispatch');assert.equal(m.tick(18,{player:s,clear:false}),null);assert.equal(m.state.progress,18);e=m.tick(.01,{player:s,clear:true});}assert.equal(e.finished.id,s.id);}assert(m.state.complete);
const data=new Map([['neon-eclipse.campaign.v1','reactor untouched']]);const store=createCampaignStore({getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)});store.complete();assert.equal(data.get('neon-eclipse.campaign.v1'),'reactor untouched');
console.log('PASS: distinct station layout, 4 gated zones, reachable 5 objectives/21 guards/8 supplies, door navigation invalidation, dispatch defense, extraction, isolated save key');
