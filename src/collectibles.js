import {HIDDEN_STARS} from './hidden-data.js';
import {TRAIN_STAR} from './train-data.js';
import {HARBOR_STAR} from './harbor-data.js';
import {ORBITAL_STAR} from './orbital-data.js';
import {DATACENTER_STAR} from './datacenter-data.js';
import {POLAR_STAR} from './polar-data.js';
export const STAR_KEY='neon-eclipse.stars.v1';
export const STAR_SITES=Object.freeze({reactor:HIDDEN_STARS.reactor,station:HIDDEN_STARS.station,roof:HIDDEN_STARS.roof,tower:HIDDEN_STARS.tower,train:TRAIN_STAR,harbor:HARBOR_STAR,orbital:ORBITAL_STAR,datacenter:DATACENTER_STAR,polar:POLAR_STAR});
export const STAR_MAPS=Object.keys(STAR_SITES);
export function nearStar(map,player){const s=STAR_SITES[map];return !!s&&Math.abs(player.y-1.7-s.feetY)<.65&&Math.hypot(player.x-s.x,player.z-s.z)<1.35;}
export function createStarStore(storage){
 if(storage===undefined){try{storage=globalThis.localStorage;}catch{storage=null;}}
 let stars=[],legacyRequired=0;
 function refresh(){stars=[];legacyRequired=0;try{const raw=JSON.parse(storage?.getItem(STAR_KEY)||'null');if(raw&&[1,2,3,4,5,6].includes(raw.version)&&Array.isArray(raw.stars)){const max=raw.version===1?4:raw.version===2?5:raw.version===3?6:raw.version===4?7:raw.version===5?8:9;stars=STAR_MAPS.slice(0,max).filter(m=>raw.stars.includes(m));const has=n=>STAR_MAPS.slice(0,n).every(m=>stars.includes(m));if(raw.version===1&&has(4))legacyRequired=4;else if(raw.version===2){if(has(5))legacyRequired=5;else if(raw.legacyFourStar===true&&has(4))legacyRequired=4;}else if(raw.version===3){if(has(6))legacyRequired=6;else if([4,5].includes(raw.legacyRequired)&&has(raw.legacyRequired))legacyRequired=raw.legacyRequired;}else if(raw.version===4){if(has(7))legacyRequired=7;else if([4,5,6].includes(raw.legacyRequired)&&has(raw.legacyRequired))legacyRequired=raw.legacyRequired;}else if(raw.version===5){if(has(8))legacyRequired=8;else if([4,5,6,7].includes(raw.legacyRequired)&&has(raw.legacyRequired))legacyRequired=raw.legacyRequired;}else if([4,5,6,7,8].includes(raw.legacyRequired)&&has(raw.legacyRequired))legacyRequired=raw.legacyRequired;}}catch{}return stars.slice();}
 refresh();
 return {refresh,get collected(){return stars.slice();},get unlocked(){return legacyRequired>0||stars.length===STAR_MAPS.length;},get legacyUnlocked(){return legacyRequired>0;},collect(map){
  refresh();if(!STAR_MAPS.includes(map)||stars.includes(map))return {added:false,unlocked:legacyRequired>0||stars.length===STAR_MAPS.length};
  const next=STAR_MAPS.filter(m=>m===map||stars.includes(m));
  try{if(!storage)throw Error('Storage unavailable');storage.setItem(STAR_KEY,JSON.stringify({version:6,stars:next,legacyRequired}));}catch{return {added:false,error:true};}
  stars=next;return {added:true,unlocked:legacyRequired>0||stars.length===STAR_MAPS.length};
 }};
}
