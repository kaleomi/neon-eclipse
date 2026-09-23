// Mouse hold/toggle ADS and gamepad hold ADS are independent input sources.
// Transient aiming state is never persisted with the player's preference.
export const AIM_MODES=Object.freeze(['hold','toggle']);
export function createAimInput({mode='hold'}={}){
 let current=AIM_MODES.includes(mode)?mode:'hold',mouseDown=false,mouseAim=false,padAim=false;
 const active=()=>mouseAim||padAim;
 function reset(){mouseDown=false;mouseAim=false;padAim=false;return false;}
 return {
  get mode(){return current;},get active(){return active();},
  pressMouse(){if(!mouseDown){mouseDown=true;mouseAim=current==='toggle'?!mouseAim:true;}return active();},
  releaseMouse(){mouseDown=false;if(current==='hold')mouseAim=false;return active();},
  pressPad(){padAim=true;return active();},
  releasePad(){padAim=false;return active();},
  setMode(value){if(AIM_MODES.includes(value)&&value!==current){current=value;reset();}return active();},
  reset
 };
}
