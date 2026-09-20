import assert from 'node:assert/strict';
import {createAimInput} from './aim-input.js';
import {createControlsSettings,CONTROLS_KEY} from './controls-settings.js';
let groups=0;const pass=text=>{groups++;console.log('PASS '+text);};
const memory=initial=>{let text=initial,writes=0;return {get text(){return text;},get writes(){return writes;},getItem:key=>key===CONTROLS_KEY?text:null,setItem:(key,value)=>{assert.equal(key,CONTROLS_KEY);text=value;writes++;},external:value=>text=value};};
const empty=memory(null),defaults=createControlsSettings({storage:empty});assert.deepEqual(defaults.value,{sensitivity:1,aimMode:'hold'});assert.equal(empty.writes,0);
const old=memory(JSON.stringify({version:1,sensitivity:1.35,extra:{keep:true}})),prefs=createControlsSettings({storage:old});assert.deepEqual(prefs.value,{sensitivity:1.35,aimMode:'hold'});assert.equal(old.writes,0);
assert.equal(prefs.set({aimMode:'toggle'}).saved,true);assert.deepEqual(JSON.parse(old.text),{version:1,sensitivity:1.35,extra:{keep:true},aimMode:'toggle'});prefs.set({sensitivity:1.6});assert.equal(JSON.parse(old.text).aimMode,'toggle');assert.deepEqual(createControlsSettings({storage:old}).value,{sensitivity:1.6,aimMode:'toggle'});
pass('hold is default; legacy sensitivity and unknown fields survive; mode and sensitivity persist together');
let changes=0;const off=prefs.onChange((next,before,result)=>{changes++;assert(result.changed);assert.notDeepEqual(next,before);});
const writes=old.writes;assert.equal(prefs.set({aimMode:'toggle'}).changed,false);assert.equal(old.writes,writes);
for(const value of ['click','',null,2])assert.equal(prefs.set({aimMode:value}).ok,false);
for(const value of [0,2.1,NaN,Infinity,'1'])assert.equal(prefs.set({sensitivity:value}).ok,false);
assert.equal(prefs.set({other:true}).ok,false);assert.equal(changes,0);prefs.set({aimMode:'hold'});assert.equal(changes,1);off();prefs.set({aimMode:'toggle'});assert.equal(changes,1);
pass('invalid preferences and no-op changes do not write; subscriptions are controlled');
for(const raw of ['not-json','null','[]',JSON.stringify({version:99,opaque:['preserve']})]){
 const storage=memory(raw),settings=createControlsSettings({storage});assert.equal(settings.value.aimMode,'hold');assert(settings.readOnly);const result=settings.set({aimMode:'toggle'});assert(result.ok&&!result.saved);assert.equal(settings.value.aimMode,'toggle');assert.equal(storage.text,raw);assert.equal(storage.writes,0);
}
const external=memory(JSON.stringify({version:1,sensitivity:1})),current=createControlsSettings({storage:external});external.external('{"version":9,"future":true}');assert.equal(current.set({aimMode:'toggle'}).saved,false);assert.equal(external.text,'{"version":9,"future":true}');
const blocked=createControlsSettings({storage:{getItem:()=>null,setItem:()=>{throw Error('quota');}}});assert.equal(blocked.set({aimMode:'toggle'}).saved,false);assert.equal(blocked.value.aimMode,'toggle');assert.equal(createControlsSettings().set({aimMode:'toggle'}).saved,false);
pass('future/corrupt/imported-newer preferences remain exact; storage failure is session-only, not a crash');
const hold=createAimInput();assert.equal(hold.mode,'hold');assert(!hold.active);assert(hold.pressMouse());assert(hold.pressMouse());assert(!hold.releaseMouse());assert(!hold.releaseMouse());
pass('hold ADS follows mouse down/up without repeated-edge changes');
const toggle=createAimInput({mode:'toggle'});assert(toggle.pressMouse());assert(toggle.pressMouse(),'duplicate downs cannot toggle twice');assert(toggle.releaseMouse());assert(toggle.active);assert(!toggle.pressMouse());assert(!toggle.releaseMouse());assert(toggle.pressMouse());toggle.releaseMouse();
pass('toggle ADS latches across mouse release and exits only on the next fresh press');
toggle.pressPad();assert(toggle.releasePad(),'LT release cannot clear mouse toggle');assert(!toggle.pressMouse());toggle.releaseMouse();assert(toggle.pressPad());assert(!toggle.releasePad(),'gamepad remains hold even in toggle mode');
hold.pressPad();hold.pressMouse();assert(hold.releaseMouse(),'mouse release cannot clear LT');assert(!hold.releasePad());
pass('mouse and gamepad have independent sources with hold-only gamepad behavior');
for(const mode of ['hold','toggle']){
 const input=createAimInput({mode});input.pressMouse();input.pressPad();assert(!input.reset());assert(!input.active);assert(!input.releaseMouse());assert(!input.releasePad());assert(input.pressMouse(),'reset accepts a new deliberate click');
}
assert(!toggle.setMode('hold'));assert(!toggle.active);assert.equal(toggle.mode,'hold');assert(toggle.pressMouse());assert(toggle.setMode('invalid'),'invalid mode cannot cancel a valid held aim');assert(!toggle.setMode('toggle'));assert(!toggle.active);
pass('resets and mode changes discard transient ADS; invalid mode changes are ignored');
console.log('TOTAL '+groups+' groups');
