import assert from 'node:assert/strict';
import {createFrameStats,validFramePerf,summarizeFramePerf,FRAME_STATS_MAX_SAMPLES} from '../src/frame-stats.js';
import {createCollision} from '../src/player-collision.js';
import {telemetryRecordFromResult,createTelemetryAttempt,validTelemetryRecord} from '../src/telemetry.js';
import {prepareArchive} from '../src/archive-summary.js';

const stats=createFrameStats();let now=1000;
assert.equal(stats.sample(now),0,'first frame has no interval');
for(let i=0;i<60;i++){now+=1000/60;stats.sample(now);}
assert(Math.abs(stats.hud-60)<=1,'hud fps ~60: '+stats.hud);
assert.equal(stats.finish(),null,'nothing recorded before begin');
stats.begin(2);for(let i=0;i<100;i++){now+=i%10===9?100:10;stats.sample(now);}
const perf=stats.finish();assert(validFramePerf(perf));assert.equal(perf.frames,100);assert.equal(perf.long,10);assert.equal(perf.quality,2);assert.equal(perf.p50Ms,10);assert.equal(perf.maxMs,100);assert(perf.p95Ms>=10&&perf.p95Ms<=100);assert(perf.avgFps>=50&&perf.avgFps<=53,'avg fps '+perf.avgFps);
assert.equal(stats.finish(),null,'finish drains samples');
stats.begin(null);for(let i=0;i<FRAME_STATS_MAX_SAMPLES+50;i++){now+=16;stats.sample(now);}
const capped=stats.finish();assert.equal(capped.frames,FRAME_STATS_MAX_SAMPLES+50,'dropped frames still counted');assert.equal(capped.quality,null);
stats.begin(1);now+=5000;stats.sample(now);stats.reset();assert.equal(stats.finish(),null);assert.equal(stats.hud,0);
for(const bad of [{},{frames:-1},{...perf,avgFps:1e9},{...perf,quality:5},{...perf,p95Ms:NaN},'x'])assert.equal(validFramePerf(bad),false);
assert.equal(validFramePerf(null),true);assert.equal(validFramePerf(undefined),true);

// Telemetry attaches perf optionally; records without it stay valid and legacy archives are untouched.
const attempt=createTelemetryAttempt({map:'reactor',mode:'campaign',difficulty:'normal',now:()=>Date.UTC(2026,8,19),random:()=>.5});
const withPerf=telemetryRecordFromResult({attempt,won:true,stages:[],kills:1,time:5,endStage:4,perf,now:()=>Date.UTC(2026,8,19)});
assert(validTelemetryRecord(withPerf));assert.deepEqual(withPerf.perf,perf);assert.equal(withPerf.schema,1);
const without=telemetryRecordFromResult({attempt,won:true,stages:[],kills:1,time:5,endStage:4,now:()=>Date.UTC(2026,8,19)});
assert(validTelemetryRecord(without));assert.equal(without.perf,null);
assert.equal(validTelemetryRecord({...withPerf,perf:{frames:'x'}}),false,'malformed perf rejects the record');
const legacy={...without,id:without.id+'-legacy'};delete legacy.perf;assert(validTelemetryRecord(legacy),'pre-perf records remain valid');
const prepared=prepareArchive([withPerf,legacy,{...withPerf,id:'bad',perf:{frames:-1}}]);assert.equal(prepared.records.length,2);assert.deepEqual(prepared.records.find(r=>r.id===withPerf.id).perf,perf);assert.equal(prepared.records.find(r=>r.id!==withPerf.id).perf,null);
const sum=summarizeFramePerf([withPerf,legacy,{perf:{...perf,quality:0,avgFps:30,frames:100,maxMs:200,p95Ms:40,long:3}}]);
assert.equal(sum.samples,2);assert.equal(sum.worstMs,200);assert.equal(sum.p95Ms,Math.max(perf.p95Ms,40));assert.equal(sum.longFrames,13);assert.equal(sum.byQuality['2'].attempts,1);assert.equal(sum.byQuality['0'].avgFps,30);
assert.equal(summarizeFramePerf([legacy]).avgFps,null);

// Collision helper behaves exactly like the former inline app.js functions.
const {blocked,move}=createCollision([{x:0,z:0,w:2,d:2}]);
assert(blocked(0,0,.4));assert(blocked(1.3,0,.4));assert(!blocked(1.5,0,.4));
const p={x:-2,z:0};move(p,.6,0,.4);assert.equal(p.x,-1.4);move(p,.5,.3,.4);assert.equal(p.x,-1.4,'x slide blocked');assert.equal(p.z,.3,'z still moves');
console.log('PASS: frame stats hud/percentiles/caps/reset, optional telemetry perf validation and legacy compatibility, archive projection, perf summary, extracted collision parity');
