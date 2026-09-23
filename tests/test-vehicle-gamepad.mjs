import assert from 'node:assert/strict';
import {mapVehiclePad,createVehicleGamepad,VEHICLE_PAD,VEHICLE_PAD_HELP} from '../src/vehicle-gamepad.js';
const pad=(axes=[0,0,0,0],pressed=[])=>({id:'test',connected:true,axes,buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i),value:pressed.includes(i)?1:0}))});
// Sticks → WASD with deadzone/threshold; right stick → look delta.
{
 const m=mapVehiclePad(pad([0,-1,0,0]));assert.deepEqual([...m.keys],['KeyW']);assert.ok(m.active);
 assert.deepEqual([...mapVehiclePad(pad([1,1,0,0])).keys].sort(),['KeyD','KeyS']);
 assert.equal(mapVehiclePad(pad([.1,-.2,0,0])).keys.size,0,'inside deadzone/threshold nothing is held');
 const look=mapVehiclePad(pad([0,0,.5,-.5])).look;assert.ok(look.x>0&&look.y<0&&Math.abs(look.x)<VEHICLE_PAD.lookSpeed);
 assert.deepEqual(mapVehiclePad(null).keys.size,0);assert.equal(mapVehiclePad(null).active,false);
}
// Buttons: held set vs edge taps; triggers map to fire/rocket; edges only on the rising frame.
{
 const a=mapVehiclePad(pad([0,0,0,0],[0,7,6,12]));assert.deepEqual([...a.keys].sort(),['ShiftLeft','Space']);assert.ok(a.fire&&a.rocket);
 const e1=mapVehiclePad(pad([0,0,0,0],[4,5,9]));assert.deepEqual(e1.edges.sort(),['Escape','KeyE','KeyI']);
 const e2=mapVehiclePad(pad([0,0,0,0],[4,5,9]),e1.buttons);assert.deepEqual(e2.edges,[],'held edge buttons do not repeat');
 const e3=mapVehiclePad(pad([0,0,0,0],[4]),new Set());assert.deepEqual(e3.edges,['KeyE']);
 assert.ok(mapVehiclePad(pad([0,0,0,0],[10])).keys.has('ShiftLeft'),'stick click sprints');
 assert.ok(mapVehiclePad(pad([0,0,0,0],[13])).keys.has('ControlLeft')&&mapVehiclePad(pad([0,0,0,0],[1])).keys.has('ControlLeft'));
 // Numeric buttons array (older browsers) is accepted.
 assert.ok(mapVehiclePad({axes:[0,0,0,0],buttons:[0,0,0,0,0,0,0,1]}).fire);
}
// Poller: press/release diffs across frames, connection flag, reset releases injected keys, first pad wins, disconnected pads skipped.
{
 let pads=[];const g=createVehicleGamepad({getGamepads:()=>pads});
 let f=g.poll();assert.equal(g.connected,false);assert.deepEqual(f.press,[]);
 pads=[null,{...pad([0,-1,0,0],[0]),connected:false},pad([0,-1,0,0],[0])];f=g.poll();assert.ok(g.connected);assert.deepEqual(f.press.sort(),['KeyW','Space']);assert.deepEqual(f.release,[]);
 pads=[pad([0,-1,0,0])];f=g.poll();assert.deepEqual(f.press,[]);assert.deepEqual(f.release,['Space']);
 pads=[pad([0,-1,0,0],[4])];f=g.poll();assert.deepEqual(f.edges,['KeyE']);f=g.poll();assert.deepEqual(f.edges,[]);
 assert.deepEqual(g.reset(),['KeyW'],'reset reports what to release');pads=[pad([0,-1,0,0],[4])];f=g.poll();assert.deepEqual(f.press,['KeyW']);assert.deepEqual(f.edges,['KeyE'],'edge memory cleared by reset');
 pads=[];f=g.poll();assert.equal(g.connected,false);assert.deepEqual(f.release,['KeyW'],'unplugging releases injected keys');
}
assert.ok(VEHICLE_PAD_HELP.includes('RT'));
console.log('PASS: vehicle gamepad — stick→WASD with deadzone, right-stick look, held vs tap buttons, trigger fire/rocket, poller press/release/edge/reset, disconnected pads skipped');
