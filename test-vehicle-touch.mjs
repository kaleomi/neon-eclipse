import assert from 'node:assert/strict';
import {shouldShowTouch,stickToKeys,createTouchState,TOUCH_STICK,TOUCH_BUTTONS,TOUCH_LOOK_SCALE} from './vehicle-touch.js';
// Gate: coarse pointer, multi-touch or ?touch=1; ?touch=0 forces off.
{
 assert.equal(shouldShowTouch({}),false);
 assert.equal(shouldShowTouch({matchMedia:q=>({matches:q.includes('coarse')})}),false,'coarse alone (headless/desktop without pointer) is not enough');
 assert.equal(shouldShowTouch({matchMedia:q=>({matches:q.includes('coarse')}),maxTouchPoints:1}),true,'coarse + a digitiser shows');
 assert.equal(shouldShowTouch({maxTouchPoints:10,matchMedia:q=>({matches:q.includes('fine')})}),false,'desktop with touchscreen keeps mouse');
 assert.equal(shouldShowTouch({search:'?a=1&touch=1'}),true);
 assert.equal(shouldShowTouch({search:'?touch=0',maxTouchPoints:5,matchMedia:()=>({matches:true})}),false);
}
// Stick geometry: dead zone, threshold, clamping to the unit circle, diagonals.
{
 assert.equal(stickToKeys(0,0).keys.size,0);assert.equal(stickToKeys(3,-3).keys.size,0,'inside dead zone');
 assert.deepEqual([...stickToKeys(0,-40).keys],['KeyW']);assert.deepEqual([...stickToKeys(60,60).keys].sort(),['KeyD','KeyS']);
 const far=stickToKeys(300,0);assert.ok(Math.abs(Math.hypot(far.x,far.z)-1)<1e-9,'clamped to unit length');assert.deepEqual([...far.keys],['KeyD']);
 const half=stickToKeys(TOUCH_STICK.radius/2,0);assert.ok(Math.abs(half.x-.5)<1e-9);
}
// State machine: stick pointer drives keys until lifted; look pointer accumulates scaled deltas consumed by read(); hold buttons vs taps; clear().
{
 const st=createTouchState();const btn=id=>TOUCH_BUTTONS.find(b=>b.id===id);
 st.down(1,'stick',100,100);st.move(1,100,40);let r=st.read();assert.deepEqual([...r.keys],['KeyW']);assert.ok(r.stick.z<0);
 st.down(2,'look',500,300);st.move(2,520,290);r=st.read();assert.equal(r.look.x,20*TOUCH_LOOK_SCALE);assert.equal(r.look.y,-10*TOUCH_LOOK_SCALE);
 r=st.read();assert.deepEqual(r.look,{x:0,y:0},'look delta consumed');assert.deepEqual([...r.keys],['KeyW'],'stick still held');
 st.up(1);r=st.read();assert.equal(r.keys.size,0);assert.deepEqual(r.stick,{x:0,z:0});
 st.down(3,'button',0,0,btn('brake'));st.down(4,'button',0,0,btn('board'));r=st.read();assert.deepEqual([...r.held],['brake']);assert.deepEqual(r.taps,['board']);
 r=st.read();assert.deepEqual(r.taps,[],'tap consumed once');assert.deepEqual([...r.held],['brake'],'hold persists');
 st.up(3);assert.equal(st.read().held.size,0);
 st.move(99,1,1);st.up(99);// unknown pointer ids are ignored
 st.down(5,'stick',0,0);st.move(5,0,-50);st.down(6,'button',0,0,btn('fire'));assert.ok(st.active);st.clear();r=st.read();assert.equal(r.keys.size+r.held.size+r.taps.length,0);assert.equal(st.active,false);
}
// Button table sanity: unique ids, every non-action button maps to a code the app's keydown handler knows.
{
 const ids=TOUCH_BUTTONS.map(b=>b.id);assert.equal(new Set(ids).size,ids.length);
 const known=new Set(['Space','KeyE','KeyF','KeyI','KeyC','ShiftLeft','ControlLeft','KeyR','Escape']);
 for(const b of TOUCH_BUTTONS){if(b.action)assert.equal(b.code,null);else assert.ok(known.has(b.code),b.id);}
}
console.log('PASS: vehicle touch — show gate (coarse/multi-touch/?touch), stick dead zone/threshold/clamp, pointer state machine (stick/look/hold/tap/clear), button table sanity');
