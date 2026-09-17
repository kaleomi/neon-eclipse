import {HARBOR_SUPPLIES} from './harbor-data.js';
import {TRAIN_SUPPLIES} from './train-data.js';
import {validCheckpoint} from './campaign.js';
import {REACTOR_SUPPLIES} from './mission.js';
import {STATION_SUPPLIES} from './station-data.js';
import {ROOF_SUPPLIES} from './roof-data.js';
import {TOWER_SUPPLIES} from './tower-data.js';
import {MAP_REGISTRY} from './maps/registry.js';
export const LEGACY_JOURNEY_KEY='neon-eclipse.journey.v1';
export const FOUR_CHAPTER_JOURNEY_KEY='neon-eclipse.journey.v2';
export const FIVE_CHAPTER_JOURNEY_KEY='neon-eclipse.journey.v3';
export const JOURNEY_KEY='neon-eclipse.journey.v4';
const CHAPTER_SUPPLIES={reactor:REACTOR_SUPPLIES,station:STATION_SUPPLIES,roof:ROOF_SUPPLIES,tower:TOWER_SUPPLIES,train:TRAIN_SUPPLIES,harbor:HARBOR_SUPPLIES};
// Chapter order and names come from the map registry; supplies stay owned by each chapter's data module.
export const CHAPTERS=MAP_REGISTRY.map(m=>({map:m.id,name:m.title,supplies:CHAPTER_SUPPLIES[m.id]||[]}));
const resultOK=r=>r&&Number.isFinite(r.time)&&r.time>=0&&r.time<=86400&&Number.isInteger(r.kills)&&r.kills>=0&&r.kills<=10000;
function valid(d,count,version){
 if(!d||d.version!==version||!Number.isInteger(d.chapter)||d.chapter<0||d.chapter>=count||!['active','between','complete'].includes(d.status)||!Array.isArray(d.results))return false;
 const length=d.status==='active'?d.chapter:d.chapter+1;
 if(d.results.length!==length||!d.results.every(resultOK)||d.status==='complete'&&d.chapter!==count-1||d.status==='between'&&d.chapter===count-1)return false;
 return d.status==='active'?(d.checkpoint===null||validCheckpoint(d.checkpoint,CHAPTERS[d.chapter].supplies)):d.checkpoint===null;
}
export const validJourney=d=>valid(d,CHAPTERS.length,4);
export function migrateLegacyJourney(d){if(!valid(d,3,1))return null;return {...JSON.parse(JSON.stringify(d)),version:4,status:d.status==='complete'?'between':d.status,legacyImported:true};}
export function migrateFourChapterJourney(d){if(!valid(d,4,2))return null;return {...JSON.parse(JSON.stringify(d)),version:4,status:d.status==='complete'?'between':d.status,fourChapterImported:true};}
export function migrateFiveChapterJourney(d){if(!valid(d,5,3))return null;return {...JSON.parse(JSON.stringify(d)),version:4,status:d.status==='complete'?'between':d.status,fiveChapterImported:true};}
export function createJourneyStore(storage){
 let data=null,target,persistent=true;
 try{target=storage===undefined?globalThis.localStorage:storage;if(!target)throw Error('unavailable');const candidates=[[JOURNEY_KEY,d=>validJourney(d)?d:null],[FIVE_CHAPTER_JOURNEY_KEY,migrateFiveChapterJourney],[FOUR_CHAPTER_JOURNEY_KEY,migrateFourChapterJourney],[LEGACY_JOURNEY_KEY,migrateLegacyJourney]];for(const [key,migrate] of candidates){const text=target.getItem(key);if(text!==null&&text!==undefined){if(text.length<20000)data=migrate(JSON.parse(text));break;}}}catch{persistent=false;}

 const copy=v=>v===null?null:JSON.parse(JSON.stringify(v));
 function commit(next){if(!validJourney(next))return false;try{target.setItem(JOURNEY_KEY,JSON.stringify(next));data=copy(next);persistent=true;return true;}catch{persistent=false;return false;}}
 function start(){return commit({version:4,chapter:0,status:'active',checkpoint:null,results:[]});}
 function save(map,snapshot){if(!data||data.status!=='active'||CHAPTERS[data.chapter].map!==map)return false;return commit({...data,checkpoint:snapshot});}
 function finish(map,result){if(!data||data.status!=='active'||CHAPTERS[data.chapter].map!==map||!resultOK(result))return false;return commit({...data,status:data.chapter===CHAPTERS.length-1?'complete':'between',checkpoint:null,results:[...data.results,result]});}
 function advance(){if(!data||data.status!=='between')return false;return commit({...data,chapter:data.chapter+1,status:'active',checkpoint:null});}
 return {start,save,finish,advance,get data(){return copy(data);},get persistent(){return persistent;}};
}
