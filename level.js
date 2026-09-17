export const IS_HARBOR=new URLSearchParams(globalThis.location?.search||'').get('map')==='harbor';
export const IS_TRAIN=new URLSearchParams(globalThis.location?.search||'').get('map')==='train';
export const IS_JOURNEY=new URLSearchParams(globalThis.location?.search||'').get('mode')==='journey';
export const IS_STATION=new URLSearchParams(globalThis.location?.search||'').get('map')==='station';
export const IS_ROOF=new URLSearchParams(globalThis.location?.search||'').get('map')==='roof';
export const IS_TOWER=new URLSearchParams(globalThis.location?.search||'').get('map')==='tower';
export const MAP_ID=IS_HARBOR?'harbor':IS_TRAIN?'train':IS_TOWER?'tower':IS_ROOF?'roof':IS_STATION?'station':'reactor';
export const MAP_TITLE=IS_HARBOR?'风暴港口':IS_TRAIN?'疾驰货运列车':IS_TOWER?'多层中枢塔':IS_ROOF?'天穹通讯枢纽':IS_STATION?'地下运输站':'反应堆设施';
export function createLevelMenu(){
 const nav=document.createElement('nav');nav.className='level-menu';nav.setAttribute('aria-label','地图选择');
 nav.innerHTML='<a href="?map=reactor" data-map="reactor"><small>01 / K-19</small>反应堆设施</a><a href="?map=station" data-map="station"><small>02 / U-02</small>地下运输站</a><a href="?map=roof" data-map="roof"><small>03 / A-03</small>天穹通讯枢纽</a><a href="?map=tower" data-map="tower"><small>04 / C-04</small>多层中枢塔</a><a href="?map=train" data-map="train"><small>05 / T-05</small>疾驰货运列车</a><a href="?map=harbor" data-map="harbor"><small>06 / H-06</small>风暴港口</a><p>地图卡片进入单章模式 · 战役进度另外保存</p>';
 nav.querySelector(`[data-map="${MAP_ID}"]`).setAttribute('aria-current','page');
 document.querySelector('.mission-card').prepend(nav);document.body.dataset.map=MAP_ID;
}
