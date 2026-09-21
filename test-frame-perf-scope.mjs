import assert from 'node:assert/strict';
import {createFrameStats,summarizeFramePerf,validFramePerf} from './frame-stats.js';
import {framePerfScopeText} from './frame-perf-scope.js';
const a={frames:4096,avgFps:60,p50Ms:16,p95Ms:40,maxMs:100,long:3,quality:2};
const b={...a,frames:1048576,avgFps:30};const rows=[{perf:a},{perf:b},{id:'legacy'}],bytes=JSON.stringify(rows);
assert.equal(summarizeFramePerf(rows).avgFps,45,'discarded frames must not increase weight');
assert.equal(summarizeFramePerf([{perf:{...a,frames:100}},{perf:{...b,frames:300}}]).avgFps,38,'short records keep their actual frame weights');
assert.equal(summarizeFramePerf([{perf:{...a,frames:0}}]).avgFps,null);
assert.match(framePerfScopeText(rows),/8,192/);assert.match(framePerfScopeText(rows),/1 条记录超过 4096/);assert.match(framePerfScopeText([{perf:a}]),/未超过/);
assert.match(framePerfScopeText([]),/无有效/);assert.match(framePerfScopeText(rows,{unavailable:true}),/暂不可读取/);
assert.equal(JSON.stringify(rows),bytes,'read-only, no history normalization');assert(validFramePerf(a));
// Document, rather than silently change, the current recorded-data contract.
const stats=createFrameStats({maxSamples:2});stats.sample(0);stats.begin(0);stats.sample(10);stats.sample(30);stats.setQuality(2);stats.sample(530);const sample=stats.finish();
assert.equal(sample.frames,3);assert.equal(sample.maxMs,20);assert.equal(sample.quality,2);assert.equal(sample.avgFps,67);
const stalled=createFrameStats();stalled.sample(0);stalled.begin();stalled.sample(2500);assert.equal(stalled.finish().maxMs,1000);
console.log('PASS scope: bounded sample weighting, empty/legacy/error states, immutable history, sample cap, final quality and 1s clamp documented');
