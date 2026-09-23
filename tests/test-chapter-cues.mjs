// Chapter 07/08/09 audio cues: snapshot diffing is pure, every cue maps to a valid catalog recipe,
// baseline frames and map switches are silent, and each chapter's transitions fire exactly once.
import assert from 'node:assert/strict';
import {CHAPTER_CUE_SFX,chapterSnapshot,chapterCues,createChapterCues} from '../src/chapter-cues.js';
import {SFX} from '../audio/sfx-catalog.js';
import {validRecipe,recipeDuration} from '../audio/synth.js';
import {createGlacier} from '../src/glacier-rules.js';
import {createAbyss} from '../src/abyss-rules.js';
import {createTether} from '../src/tether-rules.js';
import {stormPhase} from '../src/polar-data.js';
for(const [cue,name] of Object.entries(CHAPTER_CUE_SFX)){assert.ok(SFX[name],cue+' -> missing recipe '+name);assert.ok(validRecipe(SFX[name]),name);assert.ok(recipeDuration(SFX[name])<=3,name+' too long');}
const names=cues=>cues.map(c=>c.cue);
// Baseline / map switch / identical frames are silent.
assert.deepEqual(chapterCues(null,{map:'polar'}),[]);assert.deepEqual(chapterCues({map:'orbital',band:100},{map:'polar',band:65}),[]);
assert.deepEqual(chapterCues({map:'polar',stormPhase:'clear'},{map:'polar',stormPhase:'clear'}),[]);
// 07: band crossing (up = lower pitch, down = higher), pad live edge, TETHER attack + exposure edges only while the boss is active on both frames.
assert.deepEqual(names(chapterCues({map:'orbital',band:100,padLive:false},{map:'orbital',band:65,padLive:true})),['band.change','pad.live']);
assert.ok(chapterCues({map:'orbital',band:100},{map:'orbital',band:65})[0].opts.pitch>1,'going up = lighter, higher chime');assert.ok(chapterCues({map:'orbital',band:65},{map:'orbital',band:100})[0].opts.pitch<1);
assert.deepEqual(names(chapterCues({map:'orbital',bossActive:true,bossAttack:'rest',bossPhase:'shield'},{map:'orbital',bossActive:true,bossAttack:'warning',bossPhase:'shield'})),['tether.warning']);
assert.deepEqual(names(chapterCues({map:'orbital',bossActive:true,bossAttack:'warning',bossPhase:'shield'},{map:'orbital',bossActive:true,bossAttack:'live',bossPhase:'exposed'})),['tether.pulse','tether.exposed']);
assert.deepEqual(names(chapterCues({map:'orbital',bossActive:false,bossAttack:'rest'},{map:'orbital',bossActive:true,bossAttack:'warning'})),[],'boss activation frame is silent');
// 08: tide phase edges, ABYSS discharge / summon / exposure.
assert.deepEqual(names(chapterCues({map:'datacenter',waterPhase:'low'},{map:'datacenter',waterPhase:'rising'})),['water.rising']);
assert.deepEqual(names(chapterCues({map:'datacenter',waterPhase:'high'},{map:'datacenter',waterPhase:'draining'})),['water.draining']);
assert.deepEqual(names(chapterCues({map:'datacenter',waterPhase:'draining'},{map:'datacenter',waterPhase:'low'})),[],'back to low is silent (drain already cued)');
assert.deepEqual(names(chapterCues({map:'datacenter',bossActive:true,bossAttack:'warning',summons:0,bossPhase:'shield'},{map:'datacenter',bossActive:true,bossAttack:'live',summons:2,bossPhase:'shield'})),['abyss.discharge','abyss.summon']);
// 09: storm edges, warmth warning once, frost once, GLACIER shell warn -> impact, press -> sunk -> climb.
assert.deepEqual(names(chapterCues({map:'polar',stormPhase:'clear',warmthLow:false,frost:false},{map:'polar',stormPhase:'closing',warmthLow:true,frost:false})),['storm.closing','warmth.low']);
assert.deepEqual(names(chapterCues({map:'polar',warmthLow:true,frost:false},{map:'polar',warmthLow:true,frost:true})),['frost.tick']);
assert.deepEqual(names(chapterCues({map:'polar',bossActive:true,bossShell:'rest',bossPress:0,bossPhase:'armored'},{map:'polar',bossActive:true,bossShell:'warning',bossPress:.1,bossPhase:'armored'})),['glacier.warning','glacier.press']);
assert.deepEqual(names(chapterCues({map:'polar',bossActive:true,bossShell:'warning',bossPhase:'armored'},{map:'polar',bossActive:true,bossShell:'rest',bossPhase:'sunk'})),['glacier.shell','glacier.sunk']);
assert.deepEqual(names(chapterCues({map:'polar',bossActive:true,bossPhase:'sunk'},{map:'polar',bossActive:true,bossPhase:'climbing'})),['glacier.climb']);
// Snapshot builder reads the real rule objects (state getters) and world getters; missing pieces stay undefined.
const glacier=createGlacier();glacier.reset(true);const fakeOverseer={get blocking(){return glacier.blocking;},get state(){return glacier.state;}};
const fakeArt={phase:stormPhase(24),warmth:12};
const snap=chapterSnapshot({map:'polar',art:fakeArt,overseer:fakeOverseer,feetY:0});
assert.equal(snap.stormPhase,'whiteout');assert.equal(snap.warmthLow,true);assert.equal(snap.frost,false);assert.equal(snap.bossPhase,'armored');assert.equal(snap.bossShell,'rest');assert.equal(snap.band,undefined);
const abyss=createAbyss();const tether=createTether();assert.equal(chapterSnapshot({map:'datacenter',overseer:{blocking:false,state:abyss.state}}).bossPhase,'shield');assert.equal(chapterSnapshot({map:'orbital',overseer:{blocking:false,state:tether.state}}).bossPhase,'shield');
assert.equal(chapterSnapshot({map:'roof'}).band,undefined);
// Stateful wrapper: first update is a baseline, then plays through the callback, reset re-arms the baseline.
const played=[];const cues=createChapterCues((n,o)=>played.push(n));
cues.update({map:'polar',stormPhase:'clear'});cues.update({map:'polar',stormPhase:'closing'});assert.deepEqual(played,['storm.closing']);
cues.reset();cues.update({map:'polar',stormPhase:'whiteout'});assert.deepEqual(played,['storm.closing'],'after reset the first frame is silent again');
// Real GLACIER rules drive the polar cues end to end: shell warn -> impact, press -> sunk -> climb.
{
 const g=createGlacier();g.reset(true);const c=createChapterCues((n)=>played.push(n));played.length=0;
 const ov={get blocking(){return g.blocking;},get state(){return g.state;}};
 for(let t=0;t<24;t+=.05){g.tick(.05,{player:{x:0,z:0},feetY:0});c.update(chapterSnapshot({map:'polar',art:{phase:'clear',warmth:100},overseer:ov,feetY:0}));}
 for(const n of ['glacier.shell.warn','glacier.shell','ice.crack','ice.break','glacier.climb'])assert.ok(played.includes(n),'polar boss sequence includes '+n+' in '+played.join(','));
 assert.equal(played.filter(n=>n==='ice.break').length,1,'sunk cued once');
}
console.log('PASS: chapter cues map to valid recipes, silent baseline/map switch, 07 band/pad/TETHER edges, 08 tide/ABYSS edges, 09 storm/warmth/frost/GLACIER edges, snapshot builder on real rule objects, stateful wrapper + real GLACIER run');
