import assert from 'node:assert/strict';
import {sanitizeA11y,COLOR_MODES,shapeFor,bearingFor,createCaptionQueue,CAPTIONS,createAccessibility,createSubtitles,A11Y_KEY} from './accessibility.js';
const mem=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),m};};
assert.deepEqual(sanitizeA11y(null),{colorMode:'off',shapes:false,subtitles:false,subtitleSize:1});
assert.deepEqual(sanitizeA11y({version:1,colorMode:'tritanopia',shapes:true,subtitles:'yes',subtitleSize:2}),{colorMode:'tritanopia',shapes:true,subtitles:false,subtitleSize:1});
assert.equal(sanitizeA11y({version:1,colorMode:'evil'}).colorMode,'off');assert.equal(COLOR_MODES.length,5);
assert.equal(shapeFor('orange'),'▲');assert.equal(shapeFor('purple'),'◆');assert.equal(shapeFor('nope'),'');
// bearing: yaw 0 looks toward -Z
const L={x:0,z:0};
assert.equal(bearingFor(L,0,{x:0,z:-10}),'front');assert.equal(bearingFor(L,0,{x:0,z:10}),'back');assert.equal(bearingFor(L,0,{x:10,z:0}),'right');assert.equal(bearingFor(L,0,{x:-10,z:0}),'left');
assert.equal(bearingFor(L,Math.PI/2,{x:-10,z:0}),'front','yaw +90° turns toward -X');assert.equal(bearingFor(L,0,{x:.1,z:.1}),null);assert.equal(bearingFor(null,0,L),null);
// caption queue
const q=createCaptionQueue({max:3,life:2,dedupe:.25});
assert.equal(q.push('not.a.sound'),null);
const a=q.push('enemy.fire',{now:0,bearing:'left'});assert.equal(a.text,CAPTIONS['enemy.fire'].text);
assert.equal(q.push('enemy.fire',{now:.1,bearing:'right'}),a);assert.equal(a.count,2);assert.equal(a.bearing,'right');
q.push('enemy.fire',{now:.5});assert.equal(q.lines.length,2,'outside dedupe window makes a new line');
q.push('reinforcement',{now:.6});q.push('boss.phase',{now:.7});assert.equal(q.lines.length,3,'capped');assert.equal(q.lines[0].name,'enemy.fire');
assert.equal(q.update(2.55).length,2,'first line expired (at .5 + life 2 < 2.55)');
assert.equal(q.update(10).length,0);
// DOM-less accessibility + subtitles
const s=mem();const a11y=createAccessibility({storage:s,doc:null});
assert.equal(a11y.prefs.colorMode,'off');let changes=0;a11y.onChange(()=>changes++);a11y.set({colorMode:'deuteranopia',subtitles:true});
assert.equal(JSON.parse(s.m.get(A11Y_KEY)).colorMode,'deuteranopia');assert.equal(changes,1);
assert.equal(createAccessibility({storage:s,doc:null}).prefs.subtitles,true,'reloads');
const sub=createSubtitles({a11y,doc:null});const calls=[];const audio={play(name,opts){calls.push([name,opts]);return 'r';}};
assert.equal(sub.attach(audio),audio);assert.equal(sub.attach(audio),audio,'idempotent');
sub.update(0,{listener:{x:0,z:0},yaw:0});
assert.equal(audio.play('enemy.fire',{position:{x:0,y:0,z:-5}}),'r');assert.equal(calls.length,1,'original play still called');
assert.equal(sub.queue.lines[0].bearing,'front');
a11y.set({subtitles:false});audio.play('reinforcement');assert.equal(sub.queue.lines.length,1,'no caption while off');assert.equal(calls.length,2);
sub.clear();assert.equal(sub.queue.lines.length,0);
console.log('PASS: a11y sanitize/shapes/bearing/caption queue/subtitle wrap');
