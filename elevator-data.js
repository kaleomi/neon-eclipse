// Chapter 04 boss arena: separate from the original 0/6m maintenance lift.
export const ELEVATOR=Object.freeze({name:'ELEVATOR 升降机守卫',hp:1500,unitHp:500,window:6,padHold:.6,defeat:.8,warning:1.4,speed:.65});
export const ELEVATOR_LEVELS=Object.freeze([0,3,6]);
export const ELEVATOR_LIFT=Object.freeze({x:23.5,z:6,w:5,d:5});
export const ELEVATOR_CORE=Object.freeze({x:23.5,z:-.1,height:1.25});
export const ELEVATOR_PAD=Object.freeze({x:23.5,z:1.15,w:1.5,d:1.1});
export const ELEVATOR_DECKS=Object.freeze(ELEVATOR_LEVELS.map(y=>Object.freeze({x:23.5,z:.8,w:5,d:2.6,bottom:y-.25,top:y})));
export const ELEVATOR_BRIDGE=Object.freeze({x:18.25,z:6,w:6.5,d:3,bottom:5.75,top:6});
export const ELEVATOR_CALLS=Object.freeze([
 {x:23.5,z:10.2,feetY:0},...ELEVATOR_LEVELS.map(feetY=>({x:25.25,z:.8,feetY}))
].map(Object.freeze));
export const ELEVATOR_SOLIDS=Object.freeze([
 ...ELEVATOR_DECKS,ELEVATOR_BRIDGE,
 ...ELEVATOR_LEVELS.map(y=>Object.freeze({x:ELEVATOR_CORE.x,z:-.15,w:1.25,d:.85,bottom:y,top:y+.65})),
 ...ELEVATOR_CALLS.map(p=>Object.freeze({x:p.x,z:p.z,w:.45,d:.45,bottom:p.feetY,top:p.feetY+.8}))
]);
export const onElevatorPad=(p,feetY,grounded,level)=>grounded&&Math.abs(feetY-level)<.12&&Math.abs(p.x-ELEVATOR_PAD.x)<=ELEVATOR_PAD.w/2&&Math.abs(p.z-ELEVATOR_PAD.z)<=ELEVATOR_PAD.d/2;
