import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
for(const map of ['reactor','station','roof','tower','train','harbor','orbital','datacenter','polar']){
 const program=`import assert from 'node:assert/strict';globalThis.location={search:'?map=${map}'};
 const {STAGES,createMission}=await import('../src/mission.js');const index=STAGES.length-1,stage=STAGES[index],m=createMission();assert.equal(stage.id,'extract');
 const valid={player:{x:stage.x,z:stage.z,feetY:stage.feetY??0},held:true,clear:true,canInteract:true,transportReady:true};
 const negative=[{clear:false},{held:false},{canInteract:false},{player:{...valid.player,x:stage.x+4}}];
 if(stage.feetY!==undefined)negative.push({player:{...valid.player,feetY:stage.feetY+2}});
 if(stage.requiresTrip)negative.push({transportReady:false});
 for(const patch of negative){m.reset(index);assert.equal(m.tick(stage.duration+1,{...valid,...patch}),null);assert.equal(m.state.progress,0);assert(!m.state.complete);}
 m.reset(index);assert.equal(m.tick(stage.duration-.1,valid),null);m.tick(.1,{...valid,held:false});assert.equal(m.state.progress,0);assert.equal(m.tick(stage.duration-.1,valid),null);assert.equal(m.tick(.1,valid).complete,true);assert.equal(m.tick(5,valid),null);
 const boss=STAGES.findIndex(s=>s.boss);if(boss>=0){m.reset(boss);assert.equal(m.tick(10,{...valid,clear:false}),null);assert.equal(m.state.index,boss);}
 console.log('PASS ${map}: final extraction guards/hold/permission/range/floor/trip as applicable, interrupted hold, single completion, boss clear gate');`;
 const r=spawnSync(process.execPath,['--input-type=module','-e',program],{cwd:new URL('.',import.meta.url),encoding:'utf8'});process.stdout.write(r.stdout);assert.equal(r.status,0,r.stderr);
}
