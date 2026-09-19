import assert from 'node:assert/strict';
import {VENT,LIGHTS,createVentConsole,createLightSwitch,environmentModifiers} from './interaction-rules.js';
import {INTERACTION_LAYOUTS} from './interaction-layouts.js';
import {FIELD_LAYOUTS} from './field-layouts.js';
import {ENEMY_TYPES} from './enemy-rules.js';
// Vent: hold gate, busy/reach/floor guards, duration, cooldown, zone membership, uses counter, reset.
assert.throws(()=>createVentConsole({x:NaN,z:0,zone:{x:0,z:0}}));assert.throws(()=>createVentConsole({x:0,z:0}));
const v=createVentConsole({x:0,z:0,zone:{x:4,z:0}});const near={x:1,z:0},far={x:3,z:0};
assert.equal(v.tick(1,{player:near,held:false}),null);assert.equal(v.tick(1,{player:far,held:true}),null,'out of reach');assert.equal(v.tick(1,{player:near,held:true,busy:true}),null,'busy blocks');assert.equal(v.tick(1,{player:near,feetY:2,held:true}),null,'wrong floor');
assert.equal(v.tick(1,{player:near,held:true}),'holding');assert(v.progress>.6&&v.progress<.7);assert.equal(v.tick(.1,{player:near,held:false}),null);assert.equal(v.progress,0,'releasing resets the hold');
assert.equal(v.tick(1,{player:near,held:true}),'holding');assert.equal(v.tick(.5,{player:near,held:true}),'started');assert.equal(v.state.uses,1);assert(!v.ready);
assert(v.inZone({x:4,z:0}));assert(v.inZone({x:4+VENT.radius-.01,z:0}));assert(!v.inZone({x:4+VENT.radius+.01,z:0}));assert(!v.inZone({x:4,z:0},3),'zone respects floor');
assert.equal(v.tick(1,{player:near,held:true}),null,'cannot restart while active');assert.equal(v.state.active,VENT.duration-1);
v.tick(VENT.duration,{});assert.equal(v.state.active,0);assert(!v.inZone({x:4,z:0}));assert(!v.ready);assert(v.hint.includes('充压'));v.tick(VENT.cooldown,{});assert(v.ready);assert(v.hint.includes('按住 E'));
v.tick(NaN,{});v.tick(-1,{});assert(v.ready);v.tick(1.5,{player:near,held:true});assert.equal(v.state.uses,2);v.reset();assert.equal(v.state.uses,0);assert(v.ready);
// Light switch: latch prevents repeated toggles on a single held press; toggles both ways; busy/reach guards.
assert.throws(()=>createLightSwitch({x:0,z:'a'}));
const l=createLightSwitch({x:0,z:0});assert(l.lit);assert.equal(l.tick(.3,{player:near,held:true}),'holding');assert.equal(l.tick(.3,{player:near,held:true}),'dark');assert(!l.lit);
for(let i=0;i<10;i++)assert.equal(l.tick(.5,{player:near,held:true}),null,'held press does not re-toggle');assert(!l.lit);
l.tick(0,{player:near,held:false});assert.equal(l.tick(.6,{player:near,held:true}),'lit');assert(l.lit);assert.equal(l.state.toggles,2);assert.equal(l.tick(.6,{player:far,held:true}),null);assert.equal(l.tick(.6,{player:near,held:true,busy:true}),null);
l.state.lit=false;l.reset();assert(l.lit);assert.equal(l.state.toggles,0);
// Modifiers: vent slows/blocks telegraph/dps for anyone inside the live zone; darkness only touches listed types; bosses unaffected by vent via caller.
const mk=(type,x,z)=>({type,group:{position:{x,z,y:0}}});
const vent=createVentConsole({x:0,z:0,zone:{x:4,z:0}});vent.tick(1.5,{player:near,held:true});
let m=environmentModifiers(mk('assault',4,0),{vent});assert.equal(m.speed,VENT.slow);assert(!m.canTelegraph);assert.equal(m.ventDps,VENT.dps);
m=environmentModifiers(mk('assault',9,0),{vent});assert.equal(m.speed,1);assert(m.canTelegraph);assert.equal(m.ventDps,0);
const lights=createLightSwitch({x:0,z:0});lights.state.lit=false;
m=environmentModifiers(mk('sniper',9,0),{lights});assert.equal(m.range,LIGHTS.darkRangeScale);assert.equal(m.speed,1);
m=environmentModifiers(mk('stalker',9,0),{lights});assert.equal(m.speed,LIGHTS.darkSpeedScale);assert.equal(m.range,1);
m=environmentModifiers(mk('assault',9,0),{lights});assert.deepEqual(m,{speed:1,range:1,canTelegraph:true,ventDps:0});
m=environmentModifiers(mk('hound',4,0),{vent,lights});assert(Math.abs(m.speed-VENT.slow*LIGHTS.darkSpeedScale)<1e-9,'effects multiply');assert(!m.canTelegraph);
lights.state.lit=true;m=environmentModifiers(mk('sniper',9,0),{lights});assert.equal(m.range,1);
assert.deepEqual(environmentModifiers(mk('assault',4,0),{}),{speed:1,range:1,canTelegraph:true,ventDps:0});
for(const t of [...LIGHTS.darkTypes,...LIGHTS.rangedTypes])assert(ENEMY_TYPES[t],t+' exists');
// Layouts: every chapter has both interactions with a theme; nothing overlaps solids, authored trials, entries/objectives or spawn exclusions.
const STAGE_MODULES={reactor:['./mission.js',null],station:['./station-data.js','stationObstacles'],roof:['./roof-data.js','roofObstacles'],tower:['./tower-data.js','towerObstacles'],train:['./train-data.js','trainObstacles'],harbor:['./harbor-data.js','harborObstacles'],orbital:['./orbital-data.js','orbitalObstacles'],datacenter:['./datacenter-data.js','datacenterObstacles'],polar:['./polar-data.js','polarObstacles']};
assert.deepEqual(Object.keys(INTERACTION_LAYOUTS).sort(),Object.keys(STAGE_MODULES).sort());
for(const [map,[file,fn]] of Object.entries(STAGE_MODULES)){
 const layout=INTERACTION_LAYOUTS[map];assert(layout.theme.includes('/'),map+' theme names both interactions');
 const module=await import(file);const stages=Object.values(module).flat().filter(s=>s&&typeof s==='object'&&Array.isArray(s.spawns));
 const points=Object.values(module).flat().filter(s=>s&&typeof s==='object'&&typeof s.x==='number'&&typeof s.z==='number');
 let solids=[];if(fn)for(let i=0;i<5;i++)solids.push(...module[fn](i));
 const field=FIELD_LAYOUTS[map];const trials=[...field.panels.map(p=>({x:p[0],z:p[1],w:2.4,d:.12})),...field.barrels.map(p=>({x:p[0],z:p[1],w:1,d:1})),...field.nodes.map(p=>({x:p[0],z:p[1],w:1.4,d:1.4}))];
 const items=[{kind:'vent',x:layout.vent.x,z:layout.vent.z,y:layout.vent.y||0,w:.6,d:.6},{kind:'light',x:layout.light.x,z:layout.light.z,y:layout.light.y||0,w:.6,d:.6},{kind:'nozzle',x:layout.vent.zone.x,z:layout.vent.zone.z,y:layout.vent.zone.y||layout.vent.y||0,w:.5,d:.5}];
 assert(Math.hypot(layout.vent.x-layout.vent.zone.x,layout.vent.z-layout.vent.zone.z)>=VENT.reach+1,map+' console is outside its own cloud edge');
 assert(Math.hypot(layout.vent.x-layout.light.x,layout.vent.z-layout.light.z)>=2*LIGHTS.reach,map+' the two consoles have separate reach circles');
 assert(Math.hypot(layout.vent.zone.x-layout.light.x,layout.vent.zone.z-layout.light.z)>VENT.radius+LIGHTS.reach,map+' light switch reach circle is outside the cloud');
 for(const it of items){
  for(const o of solids){const overlapXZ=Math.abs(o.x-it.x)<(o.w+it.w)/2+.2&&Math.abs(o.z-it.z)<(o.d+it.d)/2+.2,overlapY=(o.bottom??0)<it.y+1.2&&(o.top??o.h??2)>it.y+.05;assert(!(overlapXZ&&overlapY),`${map} ${it.kind} intersects solid ${JSON.stringify(o).slice(0,80)}`);}
  for(const t of trials)assert(!(Math.abs(t.x-it.x)<(t.w+it.w)/2+.4&&Math.abs(t.z-it.z)<(t.d+it.d)/2+.4),`${map} ${it.kind} overlaps authored trial`);
  for(const p of points)assert(Math.hypot(p.x-it.x,p.z-it.z)>2.5,`${map} ${it.kind} too close to entry/objective/supply at ${p.x},${p.z}`);
  for(const stage of stages)for(const spawn of [...stage.spawns,...(stage.defenseSpawns||[])]){const x=Array.isArray(spawn)?spawn[0]:spawn.x,z=Array.isArray(spawn)?spawn[1]:spawn.z;assert(!(Math.abs(x-it.x)<it.w/2+1.3&&Math.abs(z-it.z)<it.d/2+1.3),`${map}/${stage.id} spawn [${x},${z}] blocked by ${it.kind}`);}
  if(map==='train')assert(solids.some(o=>Math.abs(o.x-it.x)<o.w/2&&Math.abs(o.z-it.z)<o.d/2&&Math.abs((o.top??o.h)-it.y)<.05),`${map} ${it.kind} stands on a car floor`);
 }
}
console.log('PASS vent hold/zone/duration/cooldown/floor, light latch/toggle, director modifiers (slow, no telegraph, dark range/speed, multiplicative), nine-chapter placements clear of solids/trials/objectives/spawn exclusions');
