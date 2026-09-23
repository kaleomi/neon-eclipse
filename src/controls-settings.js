import {AIM_MODES} from './aim-input.js';
export const CONTROLS_KEY='neon-eclipse.controls.v1';
export const DEFAULT_CONTROLS=Object.freeze({sensitivity:1,aimMode:'hold'});
const validSensitivity=value=>Number.isFinite(value)&&value>=.5&&value<=2;
const isRecord=value=>value&&typeof value==='object'&&!Array.isArray(value);
function read(storage){
 try{
  const text=storage?.getItem(CONTROLS_KEY);
  if(text==null)return {record:{},readOnly:false};
  const value=JSON.parse(text);
  return isRecord(value)&&value.version===1?{record:value,readOnly:false}:{record:{},readOnly:true};
 }catch{return {record:{},readOnly:true};}
}
export function createControlsSettings({storage=null}={}){
 const loaded=read(storage);let readOnly=loaded.readOnly;
 let value={
  sensitivity:validSensitivity(loaded.record.sensitivity)?loaded.record.sensitivity:DEFAULT_CONTROLS.sensitivity,
  aimMode:AIM_MODES.includes(loaded.record.aimMode)?loaded.record.aimMode:DEFAULT_CONTROLS.aimMode
 };
 const listeners=new Set();
 return {
  get value(){return {...value};},get readOnly(){return readOnly;},
  set(patch){
   if(!isRecord(patch)||Object.keys(patch).some(key=>!['sensitivity','aimMode'].includes(key)))return {ok:false,saved:false};
   if(('sensitivity'in patch&&!validSensitivity(patch.sensitivity))||('aimMode'in patch&&!AIM_MODES.includes(patch.aimMode)))return {ok:false,saved:false};
   const before={...value},next={...value,...patch};
   if(next.sensitivity===value.sensitivity&&next.aimMode===value.aimMode)return {ok:true,saved:null,changed:false};
   value=next;
   // Never replace a future/corrupt record, including one imported after this page opened.
   const latest=read(storage);readOnly=readOnly||latest.readOnly;let saved=false;
   if(!readOnly&&storage){try{storage.setItem(CONTROLS_KEY,JSON.stringify({...latest.record,version:1,...value}));saved=true;}catch{}}
   const result={ok:true,saved,readOnly,changed:true};
   for(const listener of listeners)listener({...value},before,result);
   return result;
  },
  onChange(listener){listeners.add(listener);return ()=>listeners.delete(listener);}
 };
}
