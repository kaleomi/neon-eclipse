import {HIDDEN_STARS} from './hidden-data.js';
import {TRAIN_STAR} from './train-data.js';
import {HARBOR_STAR} from './harbor-data.js';
export const STAR_KEY='neon-eclipse.stars.v1';
export const STAR_SITES=Object.freeze({reactor:HIDDEN_STARS.reactor,station:HIDDEN_STARS.station,roof:HIDDEN_STARS.roof,tower:HIDDEN_STARS.tower,train:TRAIN_STAR,harbor:HARBOR_STAR});
export const STAR_MAPS=Object.keys(STAR_SITES);
export function nearStar(map,player){const s=STAR_SITES[map];return !!s&&Math.abs(player.y-1.7-s.feetY)<.65&&Math.hypot(player.x-s.x,player.z-s.z)<1.35;}
export function createStarStore(storage){
 if(storage===undefined){try{storage=globalThis.localStorage;}catch{storage=null;}}
 let stars=[],legacyRequired=0;
 function refresh(){stars=[];legacyRequired=0;try{const raw=JSON.parse(storage?.getItem(STAR_KEY)||'null');if(raw&&[1,2,3].includes(raw.version)&&Array.isArray(raw.stars)){const max=raw.version===1?4:raw.version===2?5:6;stars=STAR_MAPS.slice(0,max).filter(m=>raw.stars.includes(m));const has=n=>STAR_MAPS.slice(0,n).every(m=>stars.includes(m));if(raw.version===1&&has(4))legacyRequired=4;else if(raw.version===2){if(has(5))legacyRequired=5;else if(raw.legacyFourStar===true&&has(4))legacyRequired=4;}else if([4,5].includes(raw.legacyRequired)&&has(raw.legacyRequired))legacyRequired=raw.legacyRequired;}}catch{}return stars.slice();}
 refresh();
 return {refresh,get collected(){return stars.slice();},get unlocked(){return legacyRequired>0||stars.length===STAR_MAPS.length;},get legacyUnlocked(){return legacyRequired>0;},collect(map){
  refresh();if(!STAR_MAPS.includes(map)||stars.includes(map))return {added:false,unlocked:legacyRequired>0||stars.length===STAR_MAPS.length};
  const next=STAR_MAPS.filter(m=>m===map||stars.includes(m));
  try{if(!storage)throw Error('Storage unavailable');storage.setItem(STAR_KEY,JSON.stringify({version:3,stars:next,legacyRequired}));}catch{return {added:false,error:true};}
  stars=next;return {added:true,unlocked:legacyRequired>0||stars.length===STAR_MAPS.length};
 }};
}
