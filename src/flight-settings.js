export const FLIGHT_INVERT_KEY='neon-eclipse-flight-invert-ws';
export function readFlightInvert(storage){try{return (storage??globalThis.localStorage)?.getItem(FLIGHT_INVERT_KEY)==='true';}catch{return false;}}
export function writeFlightInvert(value,storage){try{const target=storage??globalThis.localStorage;if(!target)return false;target.setItem(FLIGHT_INVERT_KEY,String(value===true));return true;}catch{return false;}}
export const flightElevator=(axis,inverted)=>axis*(inverted?1:-1);
export const flightPitchHint=inverted=>inverted?'W 抬头 / S 压低':'W 压低 / S 抬头';
let inverted=readFlightInvert();
export const isFlightInverted=()=>inverted;
export function bindFlightPitchSetting(container){
 container.innerHTML='<label style="display:flex;align-items:center;gap:10px;padding:12px 0;cursor:pointer"><input type="checkbox" data-flight-invert style="width:18px;height:18px;accent-color:#85c6be">飞机 W/S 反向</label><p data-flight-invert-hint role="status" style="font-size:12px;line-height:1.6;margin:0 0 12px"></p>';
 const input=container.querySelector('input'),hint=container.querySelector('[data-flight-invert-hint]');
 const render=(saved=true)=>{input.checked=inverted;hint.textContent=flightPitchHint(inverted)+' · 仅影响飞机 W/S'+(saved?'':' · 无法保存，当前页面仍生效');};
 input.addEventListener('change',()=>{inverted=input.checked;render(writeFlightInvert(inverted));});
 globalThis.addEventListener?.('storage',event=>{if(event.key===FLIGHT_INVERT_KEY||event.key===null){inverted=readFlightInvert();render();}});
 render();
}
