import assert from 'node:assert/strict';
import {createJourneyStore,JOURNEY_KEY,SIX_CHAPTER_JOURNEY_KEY,FIVE_CHAPTER_JOURNEY_KEY,CHAPTERS,migrateSixChapterJourney} from './journey.js';
import {createStarStore,STAR_KEY,STAR_MAPS} from './collectibles.js';
import {SLOTS} from './save-hub.js';
assert.equal(JOURNEY_KEY,'neon-eclipse.journey.v5');assert.equal(SIX_CHAPTER_JOURNEY_KEY,'neon-eclipse.journey.v4');assert.equal(CHAPTERS.length,7);assert.equal(CHAPTERS[6].map,'orbital');
const result={time:40,kills:8},cp={stageIndex:1,health:85,rounds:[20,4,10],reserves:[60,16,30],selected:0,x:0,z:26.4,yaw:0,pitch:0,time:20,kills:4,collected:[],feetY:0};
const mk=raw=>{const db=new Map([[SIX_CHAPTER_JOURNEY_KEY,raw]]);return {db,storage:{getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,v)}};};
// Active six-chapter runs import read-only; saving writes only the v5 key and leaves v4 untouched.
for(let chapter=0;chapter<6;chapter++){const raw=JSON.stringify({version:4,chapter,status:'active',checkpoint:cp,results:Array(chapter).fill(result)}),{db,storage}=mk(raw),s=createJourneyStore(storage);assert.equal(s.data.chapter,chapter);assert.equal(s.data.version,5);assert.equal(s.data.sixChapterImported,true);assert.deepEqual(s.data.checkpoint,cp);assert(!db.has(JOURNEY_KEY));assert(s.save(CHAPTERS[chapter].map,cp));assert.equal(db.get(SIX_CHAPTER_JOURNEY_KEY),raw);assert.equal(JSON.parse(db.get(JOURNEY_KEY)).version,5);}
// A finished six-chapter journey resumes 'between' 6 and 7, then completes after orbital with 7 results.
const raw=JSON.stringify({version:4,chapter:5,status:'complete',checkpoint:null,results:Array(6).fill(result)}),{db,storage}=mk(raw),s=createJourneyStore(storage);
assert.equal(s.data.status,'between');assert.equal(s.data.chapter,5);assert(s.advance());assert.equal(s.data.chapter,6);assert(s.save('orbital',{...cp,feetY:9,x:-9,z:3}));assert(s.finish('orbital',result));assert.equal(s.data.status,'complete');assert.equal(s.data.results.length,7);assert.equal(db.get(SIX_CHAPTER_JOURNEY_KEY),raw);
// v5 wins over v4 when both exist; malformed v4 is ignored; a v4 'between' at chapter 5 is invalid (six-chapter rules) and rejected.
db.set(SIX_CHAPTER_JOURNEY_KEY,JSON.stringify({version:4,chapter:0,status:'active',checkpoint:null,results:[]}));assert.equal(createJourneyStore(storage).data.chapter,6);
assert.equal(migrateSixChapterJourney({version:4,chapter:5,status:'between',checkpoint:null,results:Array(6).fill(result)}),null);assert.equal(migrateSixChapterJourney({version:5,chapter:0,status:'active',checkpoint:null,results:[]}),null);
// Five-chapter archives still chain: v3 complete -> between chapter 5 -> harbor -> orbital.
{const db3=new Map([[FIVE_CHAPTER_JOURNEY_KEY,JSON.stringify({version:3,chapter:4,status:'complete',checkpoint:null,results:Array(5).fill(result)})]]),st={getItem:k=>db3.get(k)??null,setItem:(k,v)=>db3.set(k,v)},j=createJourneyStore(st);assert.equal(j.data.status,'between');assert(j.advance());assert(j.finish('harbor',result));assert.equal(j.data.status,'between');assert(j.advance());assert.equal(j.data.chapter,6);}
// Quota failure keeps the imported view.
const denied=createJourneyStore({getItem:k=>k===SIX_CHAPTER_JOURNEY_KEY?raw:null,setItem(){throw Error('quota');}});assert(!denied.advance());assert.equal(denied.data.chapter,5);
// Stars: six-star v3 awards stay unlocked (legacyRequired 6); a fresh unlock now needs seven; v3 archives are never rewritten until a new star is collected, and the rewrite is v4.
const six=STAR_MAPS.slice(0,6);assert.equal(STAR_MAPS.length,7);assert.equal(STAR_MAPS[6],'orbital');
for(const legacy of [{version:1,stars:six.slice(0,4)},{version:2,stars:six.slice(0,5)},{version:3,stars:six,legacyRequired:0},{version:3,stars:six.slice(0,5),legacyRequired:5}]){db.set(STAR_KEY,JSON.stringify(legacy));const before=db.get(STAR_KEY),a=createStarStore(storage);assert(a.unlocked,JSON.stringify(legacy));assert(a.legacyUnlocked);assert.equal(db.get(STAR_KEY),before);assert(a.collect('orbital').added);const after=JSON.parse(db.get(STAR_KEY));assert.equal(after.version,4);assert(createStarStore(storage).unlocked);}
db.set(STAR_KEY,JSON.stringify({version:3,stars:six.slice(0,5),legacyRequired:0}));const a=createStarStore(storage);assert(!a.unlocked);assert(!a.collect('harbor').unlocked);assert(!createStarStore(storage).unlocked);assert(a.collect('orbital').unlocked);assert.equal(createStarStore(storage).collected.length,7);
db.set(STAR_KEY,JSON.stringify({version:4,stars:six,legacyRequired:6}));assert(createStarStore(storage).legacyUnlocked);db.set(STAR_KEY,JSON.stringify({version:4,stars:six.slice(0,3),legacyRequired:6}));assert(!createStarStore(storage).unlocked,'legacyRequired needs the stars to back it');
// Save hub knows the new slots and keeps v4 as legacy.
assert(SLOTS.some(s=>s.key==='neon-eclipse.journey.v5'&&!s.legacy));assert(SLOTS.some(s=>s.key==='neon-eclipse.journey.v4'&&s.legacy));assert(SLOTS.some(s=>s.key==='neon-eclipse.orbital.v1'&&s.map==='orbital'));assert.equal(SLOTS.find(s=>s.key==='neon-eclipse.stars.v1').validate(JSON.stringify({version:4,stars:[]})),'ok');
console.log('PASS: six-chapter journeys import read-only into v5, finished runs continue to orbital, precedence/rejection rules, five-chapter chain, quota rollback, star v3 awards preserved with new 7/7 unlock, save hub slots');
