import {MAP_REGISTRY,mapById,resolveMapId,isJourneyMode,chapterNumber} from './maps/registry.js';
// Map selection is resolved once from the URL through the registry. The IS_* booleans stay exported
// for existing consumers; new code should read MAP or MAP_ID instead of adding another boolean.
const search=globalThis.location?.search||'';
export const MAP_ID=resolveMapId(search);
export const MAP=mapById(MAP_ID);
export const MAP_TITLE=MAP.title;
export const IS_JOURNEY=isJourneyMode(search);
export const IS_HARBOR=MAP_ID==='harbor';
export const IS_TRAIN=MAP_ID==='train';
export const IS_STATION=MAP_ID==='station';
export const IS_ROOF=MAP_ID==='roof';
export const IS_TOWER=MAP_ID==='tower';
export const IS_ORBITAL=MAP_ID==='orbital';
export const IS_DATACENTER=MAP_ID==='datacenter';
export function createLevelMenu(){
 const nav=document.createElement('nav');nav.className='level-menu';nav.setAttribute('aria-label','地图选择');
 nav.innerHTML=MAP_REGISTRY.map(m=>`<a href="?map=${m.id}" data-map="${m.id}"><small>${chapterNumber(m.id)} / ${m.code}</small>${m.title}</a>`).join('')+'<p>地图卡片进入单章模式 · 战役进度另外保存</p>';
 nav.querySelector(`[data-map="${MAP_ID}"]`).setAttribute('aria-current','page');
 document.querySelector('.mission-card').prepend(nav);document.body.dataset.map=MAP_ID;
}
