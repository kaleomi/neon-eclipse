import assert from 'node:assert/strict';
import {FLIGHT_INVERT_KEY,readFlightInvert,writeFlightInvert,flightElevator} from '../src/flight-settings.js';
import {createPlane,stepPlane} from '../src/flight-rules.js';
const data=new Map([['campaign-sentinel','keep']]),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
assert.equal(readFlightInvert(storage),false);
assert(writeFlightInvert(true,storage));assert.equal(readFlightInvert(storage),true);
assert(writeFlightInvert(false,storage));assert.equal(readFlightInvert(storage),false);
data.set(FLIGHT_INVERT_KEY,'corrupt');assert.equal(readFlightInvert(storage),false);
const denied={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};assert.equal(readFlightInvert(denied),false);assert.equal(writeFlightInvert(true,denied),false);assert.equal(data.get('campaign-sentinel'),'keep');
for(const inverted of [false,true])for(const axis of [-1,1]){
 const plane={...createPlane(),x:-150,z:100,y:100,onGround:false,speed:35,throttle:.233};
 stepPlane(plane,{elevator:flightElevator(axis,inverted)},.2);
 assert.equal(Math.sign(plane.pitch),axis*(inverted?1:-1));
}
assert.equal(Math.abs(flightElevator(0,true)),0);
console.log('PASS: default/normal/inverted W/S physics, preference persistence, corrupt/denied storage, unrelated save isolation');
