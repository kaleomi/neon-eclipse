import assert from 'node:assert/strict';
import {MAP_REGISTRY,MAP_IDS,DEFAULT_MAP_ID,mapById,mapIndex,nextMap,resolveMapId,isJourneyMode,chapterNumber,pick} from './maps/registry.js';
import {CHAPTERS} from './journey.js';
import {MENU_CHAPTERS,chapterInfo,nextChapter,chapterURL} from './menu-state.js';
import {CHALLENGE_MAPS} from './chapter-achievements.js';
import {STAR_MAPS} from './collectibles.js';
import {SLOTS} from './save-hub.js';

// Registry shape: six ordered, frozen, unique entries with every field a consumer reads.
assert.equal(MAP_REGISTRY.length,6);
assert.deepEqual(MAP_IDS,['reactor','station','roof','tower','train','harbor']);
assert.ok(Object.isFrozen(MAP_REGISTRY)&&MAP_REGISTRY.every(Object.isFrozen));
assert.equal(new Set(MAP_IDS).size,6);
assert.equal(new Set(MAP_REGISTRY.map(m=>m.saveKey)).size,6);
assert.equal(new Set(MAP_REGISTRY.map(m=>m.code)).size,6);
MAP_REGISTRY.forEach((m,i)=>{
 assert.equal(m.order,i+1);
 for(const field of ['id','code','title','english','brief','features','color','radarLabel','saveKey'])assert.equal(typeof m[field],'string',`${m.id}.${field}`);
 assert.match(m.color,/^#[0-9a-f]{6}$/);
 assert.match(m.saveKey,/^neon-eclipse\.[a-z]+\.v1$/);
 assert.ok(m.traits&&typeof m.traits.multiLevel==='boolean');
 assert.ok(m.modules&&typeof m.modules.data==='string'&&typeof m.modules.world==='string');
});

// Helpers.
assert.equal(DEFAULT_MAP_ID,'reactor');
assert.equal(mapById('harbor').code,'H-06');
assert.equal(mapById('nope'),null);
assert.equal(mapIndex('tower'),3);
assert.equal(nextMap('train').id,'harbor');
assert.equal(nextMap('harbor'),null);
assert.equal(chapterNumber('reactor'),'01');
assert.equal(chapterNumber('harbor'),'06');
assert.equal(pick({harbor:1},'harbor',0),1);
assert.equal(pick({harbor:1},'reactor',0),0);

// URL resolution keeps the historical fallback: unknown / missing map -> reactor; mode=journey only when exact.
assert.equal(resolveMapId(''),'reactor');
assert.equal(resolveMapId('?map=harbor'),'harbor');
assert.equal(resolveMapId('?map=HARBOR'),'reactor');
assert.equal(resolveMapId('?map=vehicle'),'reactor');
assert.equal(resolveMapId('?mode=journey&map=train&menu=continue'),'train');
assert.equal(isJourneyMode('?mode=journey'),true);
assert.equal(isJourneyMode('?mode=Journey'),false);
assert.equal(isJourneyMode(undefined),false);

// Consumers derive from the registry and stay in lock-step with it.
assert.deepEqual(CHAPTERS.map(c=>c.map),MAP_IDS);
assert.deepEqual(CHAPTERS.map(c=>c.name),MAP_REGISTRY.map(m=>m.title));
assert.ok(CHAPTERS.every(c=>Array.isArray(c.supplies)&&c.supplies.length>0),'every chapter keeps its own supplies');
assert.deepEqual(MENU_CHAPTERS.map(c=>[c.map,c.number,c.sector,c.english,c.color]),MAP_REGISTRY.map((m,i)=>[m.id,String(i+1).padStart(2,'0'),m.code,m.english,m.color]));
assert.equal(chapterInfo('roof').brief,'登上天穹枢纽，让信号重返城市。');
assert.equal(chapterInfo('unknown').map,'reactor');
assert.equal(nextChapter('harbor'),null);
assert.equal(chapterURL('tower','journey','continue'),'?map=tower&mode=journey&menu=continue');
assert.deepEqual(CHALLENGE_MAPS,MAP_IDS,'challenge maps mirror registry order');
assert.deepEqual([...STAR_MAPS].sort(),[...MAP_IDS].sort(),'every registered map has a star site');
for(const m of MAP_REGISTRY)assert.ok(SLOTS.some(s=>s.key===m.saveKey&&s.map===m.id),`save hub knows checkpoint slot for ${m.id}`);

// level.js resolves through the registry in a non-browser context (no location -> chapter 1).
const level=await import('./level.js');
assert.equal(level.MAP_ID,'reactor');
assert.equal(level.MAP.code,'K-19');
assert.equal(level.MAP_TITLE,'反应堆设施');
assert.equal(level.IS_JOURNEY,false);
assert.deepEqual([level.IS_HARBOR,level.IS_TRAIN,level.IS_STATION,level.IS_ROOF,level.IS_TOWER],[false,false,false,false,false]);
console.log('PASS: map registry shape, helpers, URL resolution fallback, journey/menu/achievement/star/save-hub consumers derived from registry, level.js resolution');
