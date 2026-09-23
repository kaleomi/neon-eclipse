import assert from 'node:assert/strict';
import {chapterEnemyTypes,loaderForType,warmModels,sfxEventsForMap,sfxFilesForMap,warmupRequested} from '../src/asset-preload.js';
import {RECORDED_EVENTS} from '../audio/recorded-audio.js';

// Reactor stages have no explicit roles: ROLE_SETS fallback by stage id.
const reactor=[{id:'coolant',count:5},{id:'access',count:6},{id:'reactor',count:7},{id:'warden',count:4},{id:'extract',count:4}];
assert.deepEqual([...chapterEnemyTypes(reactor)].sort(),['assault','commander','heavy','ranged','warden']);
// Explicit roles win; count shorter than roles only takes the first N.
assert.deepEqual([...chapterEnemyTypes([{id:'x',count:2,roles:['hound','ranged','shield']}])].sort(),['hound','ranged']);
assert.deepEqual([...chapterEnemyTypes([])],[]);
assert.deepEqual([...chapterEnemyTypes([{id:'unknown',count:3}])],['assault']);

// Loader routing: each GLB-backed type reaches exactly its loader; procedural types are skipped.
const calls=[];
const loaders={
 guardVariant:t=>{calls.push('guard:'+t);return Promise.resolve('g');},
 ranged:()=>{calls.push('ranged');return Promise.resolve('r');},
 engineer:()=>{calls.push('engineer');return Promise.resolve('e');},
 commander:()=>{calls.push('commander');return Promise.reject(new Error('offline'));},
 sniper:()=>{calls.push('sniper');return Promise.resolve('s');},
 shield:()=>{calls.push('shield');return Promise.resolve('b');},
 roster:t=>{calls.push('roster:'+t);return Promise.resolve('u');},
 rosterTypes:new Set(['hound','warden']),
};
assert.equal(loaderForType('drone',loaders),null);
assert.equal(loaderForType('assault',{}),null);
const report=await warmModels(new Set(['assault','heavy','ranged','commander','hound','drone','warden','engineer']),loaders);
assert.deepEqual(report.started,['assault','heavy','ranged','commander','hound','warden','engineer']);
assert.deepEqual(report.skipped,['drone']);
assert.deepEqual(report.failed,['commander'],'a rejected loader is reported, not thrown');
assert.deepEqual(calls.slice(0,7).sort(),['commander','engineer','guard:assault','guard:heavy','ranged','roster:hound','roster:warden']);

// SFX subset: shared events on every map, surface/cannon events only where they can fire.
const all=Object.keys(RECORDED_EVENTS);
assert.deepEqual(sfxEventsForMap('harbor').sort(),all.filter(n=>n!=='player.step.snow').sort());
assert.deepEqual(sfxEventsForMap('polar').sort(),all.filter(n=>!['player.step.gravel','cannon.fire','cannon.hit','cannon.splash'].includes(n)).sort());
assert(!sfxFilesForMap('reactor').includes('step-snow-1'));
assert(!sfxFilesForMap('reactor').includes('cannon-a'));
assert(sfxFilesForMap('reactor').includes('rifle-ar'));
assert(sfxFilesForMap('harbor').includes('cannon-a')&&sfxFilesForMap('harbor').includes('step-gravel-1'));
assert(sfxFilesForMap('polar').includes('step-snow-1'));
// metal-crash is shared via vehicle.impact even though cannon.hit is harbour-only.
assert(sfxFilesForMap('reactor').includes('metal-crash'));
const full=new Set(Object.values(RECORDED_EVENTS).flatMap(r=>r.files));
assert(sfxFilesForMap('reactor').length<full.size,'reactor subset is smaller than the full bank');
console.log('asset-preload rules ok');

// `?warm=0` is the only opt-out; anything else (absent, warm=1, unrelated params) keeps warm-up on.
assert.equal(warmupRequested(''),true);
assert.equal(warmupRequested('?map=reactor'),true);
assert.equal(warmupRequested('?warm=1'),true);
assert.equal(warmupRequested('?map=reactor&warm=0'),false);
assert.equal(warmupRequested(undefined),true);
console.log('asset-preload: warmupRequested opt-out ok');
