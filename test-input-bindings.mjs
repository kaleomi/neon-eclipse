import assert from 'node:assert/strict';
import {createBindings,ACTIONS,keyLabel,sanitizeOverrides,validateRebind,readGamepad,createGamepadInput,applyDeadzone,BINDINGS_KEY,RESERVED_CODES} from './input-bindings.js';
const mem=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),m};};
// defaults
let s=mem(),b=createBindings({storage:s});
assert.ok(b.is('KeyW','forward'));assert.ok(b.is('ShiftRight','sprint'));assert.equal(b.actionFor('KeyE'),'interact');assert.equal(b.actionFor('KeyZ'),null);
assert.ok(b.held(new Set(['KeyD']),'right'));assert.ok(!b.held(new Set(['KeyD']),'left'));
assert.equal(new Set(ACTIONS.map(a=>a.id)).size,ACTIONS.length,'unique ids');
const all=ACTIONS.flatMap(a=>a.codes);assert.equal(new Set(all).size,all.length,'no default code shared by two actions');
// rebind + persistence
assert.deepEqual(b.rebind('interact','KeyZ'),{ok:true,conflict:null});
assert.ok(b.is('KeyZ','interact'));assert.ok(!b.is('KeyE','interact'));assert.equal(JSON.parse(s.m.get(BINDINGS_KEY)).overrides.interact[0],'KeyZ');
let b2=createBindings({storage:s});assert.ok(b2.is('KeyZ','interact'),'reload from storage');
// swap semantics: bind pickup to KeyZ → interact gets pickup's old primary KeyF
assert.deepEqual(b.rebind('pickup','KeyZ'),{ok:true,conflict:'interact'});
assert.ok(b.is('KeyZ','pickup'));assert.ok(b.is('KeyF','interact'));assert.equal(b.actionFor('KeyZ'),'pickup');
// every action still has at least one key after swaps
for(const a of ACTIONS)assert.ok(b.codesFor(a.id).length>0,a.id+' unbound');
// reserved / locked / bad
assert.equal(b.rebind('jump','Escape').reason,'reserved');assert.equal(b.rebind('pause','KeyP').reason,'locked');assert.equal(b.rebind('jump','<img>').reason,'bad-code');assert.equal(b.rebind('nope','KeyP').reason,'unknown-action');
assert.equal(validateRebind({},'jump','Digit3').reason,'reserved');
// reset back to default removes storage
b.reset();assert.ok(b.is('KeyE','interact'));assert.equal(s.m.has(BINDINGS_KEY),false);
// rebinding to the default itself clears the override
b.rebind('jump','KeyX');b.rebind('jump','Space');assert.ok(b.isDefault('jump'));
// change listener
let n=0;const off=b.onChange(()=>n++);b.rebind('reload','KeyX');off();b.rebind('reload','KeyR');assert.equal(n,1);
// sanitize garbage
assert.deepEqual(sanitizeOverrides(null),{});assert.deepEqual(sanitizeOverrides({version:2,overrides:{jump:['KeyX']}}),{});
assert.deepEqual(sanitizeOverrides({version:1,overrides:{jump:['Escape','KeyX','KeyY','KeyZ'],pause:['KeyP'],bogus:['KeyA'],reload:'KeyR'}}),{jump:['KeyX','KeyY']});
s=mem();s.setItem(BINDINGS_KEY,'{not json');assert.ok(createBindings({storage:s}).is('Space','jump'),'corrupt storage falls back');
// labels + legend
assert.equal(keyLabel('KeyW'),'W');assert.equal(keyLabel('Digit4'),'4');assert.equal(keyLabel('ShiftLeft'),'L-SHIFT');assert.equal(keyLabel('Space'),'SPACE');assert.equal(keyLabel(undefined),'?');
const legend=b.legend();assert.equal(legend.length,ACTIONS.length);assert.deepEqual(legend.find(l=>l.id==='sprint').keys,['L-SHIFT','R-SHIFT']);
for(const c of RESERVED_CODES)assert.equal(validateRebind({},'jump',c).ok,false);
// gamepad
assert.equal(applyDeadzone(.1),0);assert.equal(applyDeadzone(1),1);assert.equal(applyDeadzone(-1),-1);assert.equal(applyDeadzone(NaN),0);assert.ok(Math.abs(applyDeadzone(.59)-.5)<1e-9);
const pad=(axes,pressed=[])=>({connected:true,axes,buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i),value:pressed.includes(i)?1:0}))});
let f=readGamepad(pad([0,-1,.05,.5],[0,7,9]));
assert.deepEqual(f.move,{x:0,z:-1});assert.equal(f.look.x,0);assert.ok(f.look.y>0&&f.look.y<.5,'curve applies');assert.deepEqual([...f.held].sort(),['fire','jump','pause']);
let pads=[null,pad([0,0,0,0])],g=createGamepadInput({getGamepads:()=>pads});
let r=g.poll();assert.equal(g.connected,true);assert.equal(r.active,false);assert.deepEqual(r.pressed,[]);
pads=[null,pad([0,0,0,0],[0])];r=g.poll();assert.deepEqual(r.pressed,['jump']);assert.equal(r.active,true);
r=g.poll();assert.deepEqual(r.pressed,[],'no repeat while held');
pads=[null,pad([0,0,0,0])];r=g.poll();assert.deepEqual(r.released,['jump']);
pads=[];r=g.poll();assert.equal(g.connected,false);assert.equal(r.active,false);
g.reset();assert.deepEqual(g.poll().released,[]);
console.log('PASS: bindings defaults/rebind/swap/reserved/persist/sanitize; gamepad deadzone/curve/edges');
