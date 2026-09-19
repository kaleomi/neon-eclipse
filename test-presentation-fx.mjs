import assert from 'node:assert/strict';
import {WEATHER_PRESETS,WEATHER_IDS,chapterWeather,resolveWeather,weatherParams,weatherModifiers,WORLD_OWNED_WEATHER} from './weather-rules.js';
import {environmentModifiers} from './interaction-rules.js';
import {KILL_FX,killGhostFrame,createSlowmo,killKind,validateFxSettings,loadFxSettings,saveFxSettings,FX_SETTINGS_KEY} from './kill-fx-rules.js';
import {INTRO,chapterIntro,introFrame,createIntroClock,shouldPlayIntro,briefing} from './cinematic-rules.js';
import {MAP_REGISTRY} from './maps/registry.js';
// --- weather presets --------------------------------------------------------------------------------------
for(const id of ['clear','rain','fog','dust','night'])assert(WEATHER_PRESETS[id],'plan preset '+id);
assert.equal(WEATHER_PRESETS.fog.rangeScale,.7,'fog = ranged lock distance -30%');
for(const id of WEATHER_IDS){const p=WEATHER_PRESETS[id];assert(p.fogScale>=1&&p.lightScale>0&&p.lightScale<=1&&p.rangeScale>0&&p.rangeScale<=1,id);}
assert.equal(chapterWeather('harbor'),'rain');assert.equal(chapterWeather('polar'),'snow');assert.equal(chapterWeather('reactor'),'clear');assert.equal(chapterWeather('nope'),'clear');
for(const m of MAP_REGISTRY)assert(WEATHER_PRESETS[chapterWeather(m.id)],'every chapter resolves to a preset');
// default: chapter preset, full intensity unless clear; world-owned only when not overridden.
assert.deepEqual(resolveWeather('reactor',''),{id:'clear',intensity:0,worldOwned:false});
assert.deepEqual(resolveWeather('harbor',''),{id:'rain',intensity:1,worldOwned:true});
assert.deepEqual(resolveWeather('harbor','?weather=fog'),{id:'fog',intensity:1,worldOwned:false});
assert.deepEqual(resolveWeather('reactor','?weather=fog&weather-intensity=.5'),{id:'fog',intensity:.5,worldOwned:false});
assert.deepEqual(resolveWeather('reactor','?weather=bogus&weather-intensity=9'),{id:'clear',intensity:0,worldOwned:false});
assert.equal(resolveWeather('reactor','?weather=rain&weather-intensity=-3').intensity,0);
assert.equal(resolveWeather('reactor','?weather=rain&weather-intensity=abc').intensity,0);
assert.deepEqual(WORLD_OWNED_WEATHER,{harbor:'rain',polar:'snow'});
// intensity blends toward clear.
const full=weatherParams({id:'fog',intensity:1}),half=weatherParams({id:'fog',intensity:.5}),none=weatherParams({id:'fog',intensity:0});
assert.equal(full.rangeScale,.7);assert.equal(half.rangeScale,.85);assert.equal(none.rangeScale,1);assert.equal(none.particles,null);assert.equal(full.fogScale,2.6);assert.equal(none.fogScale,1);
assert.equal(weatherParams({id:'rain',intensity:1}).particles,'rain');assert(Math.abs(weatherParams({id:'night',intensity:1}).lightScale-.45)<1e-9);
assert.deepEqual(weatherParams(undefined).id,'clear');
// gameplay modifier: range only, never speed.
assert.deepEqual(weatherModifiers({id:'fog',intensity:1}),{range:.7,speed:1});assert.deepEqual(weatherModifiers(null),{range:1,speed:1});
const enemy={type:'ranged',group:{position:{x:0,y:0,z:0}}};
const env=environmentModifiers(enemy,{weather:weatherModifiers({id:'fog',intensity:1})});
assert.equal(env.range,.7);assert.equal(env.speed,1);assert.equal(env.canTelegraph,true);assert.equal(env.ventDps,0,'weather never adds damage');
assert.deepEqual(environmentModifiers(enemy,{}),environmentModifiers(enemy,{weather:null}));
// stacks multiplicatively with dark lights, still no telegraph change.
const dark={lit:false,rules:{rangedTypes:['ranged'],darkTypes:[],darkRangeScale:.65,darkSpeedScale:1.25}};
assert(Math.abs(environmentModifiers(enemy,{lights:dark,weather:{range:.7,speed:1}}).range-.455)<1e-9);
// --- kill presentation -------------------------------------------------------------------------------------
assert.equal(KILL_FX.dissolve,.4);assert.equal(KILL_FX.slowmoDuration,.3);assert.deepEqual(KILL_FX.streakSteps,[3,5,10]);
assert.equal(killGhostFrame(0).phase,'flash');assert.equal(killGhostFrame(0).opacity,1);assert.equal(killGhostFrame(.09).phase,'flash');
const mid=killGhostFrame(.25);assert.equal(mid.phase,'dissolve');assert(mid.opacity>0&&mid.opacity<1);assert(mid.scale>1&&mid.rise>0);
assert.equal(killGhostFrame(.4),null);assert.equal(killGhostFrame(9),null);assert.equal(killGhostFrame(-1).phase,'flash');assert.equal(killGhostFrame(NaN).phase,'flash');
assert(killGhostFrame(.39).opacity<.05,'fully faded at the end');
let on=true;const slow=createSlowmo({enabled:()=>on});
assert.equal(slow.trigger('normal'),false,'ordinary kills never slow time');assert.equal(slow.step(.016),1);
assert.equal(slow.trigger('elite'),true);assert.equal(slow.active,true);assert.equal(slow.step(.1),KILL_FX.slowmoScale);
assert.equal(slow.step(.1),KILL_FX.slowmoScale);assert(slow.remaining>.09&&slow.remaining<.11);
assert.equal(slow.trigger('boss'),true);assert(slow.remaining>.29,'later request extends, does not stack');
let steps=0;while(slow.active&&steps<100){slow.step(.05);steps++;}assert.equal(steps,6);assert.equal(slow.step(.05),1);
on=false;assert.equal(slow.trigger('boss'),false);assert.equal(slow.step(.05),1,'toggle off -> real time');on=true;
slow.trigger('elite');slow.reset();assert.equal(slow.active,false);
assert.equal(killKind({boss:true,elite:true}),'boss');assert.equal(killKind({elite:true}),'elite');assert.equal(killKind({type:'harborElite'}),'elite');assert.equal(killKind({type:'ranged'}),'normal');assert.equal(killKind(null),'normal');
// settings persistence.
assert.deepEqual(validateFxSettings(null),{slowmo:true,dissolve:true,intro:true});assert.deepEqual(validateFxSettings({slowmo:false,intro:'no',junk:1}),{slowmo:false,dissolve:true,intro:true});
const mem=new Map(),storage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,v)};
assert.deepEqual(loadFxSettings(storage),{slowmo:true,dissolve:true,intro:true});assert.equal(saveFxSettings(storage,{slowmo:false,dissolve:true,intro:false}),true);
assert.equal(JSON.parse(mem.get(FX_SETTINGS_KEY)).slowmo,false);assert.deepEqual(loadFxSettings(storage),{slowmo:false,dissolve:true,intro:false});
mem.set(FX_SETTINGS_KEY,'{broken');assert.deepEqual(loadFxSettings(storage),{slowmo:true,dissolve:true,intro:true});
assert.equal(saveFxSettings({setItem(){throw new Error('quota');}},{}),false);assert.deepEqual(loadFxSettings(null),{slowmo:true,dissolve:true,intro:true});
// --- cinematics --------------------------------------------------------------------------------------------
assert(INTRO.duration>=8&&INTRO.duration<=12,'8-12 s intro');assert.equal(INTRO.lineAt.length,3);assert(INTRO.cardAt<INTRO.duration);
for(const m of MAP_REGISTRY){const c=chapterIntro(m.id);assert.equal(c.map,m.id);assert.equal(c.lines.length,3);assert(c.lines.every(l=>typeof l==='string'&&l.length>4),m.id);assert.equal(c.title,m.title);}
assert.equal(chapterIntro('nope').map,MAP_REGISTRY[0].id);
const f0=introFrame(0);assert.equal(f0.lines,0);assert.equal(f0.card,false);assert.equal(f0.skippable,false);assert.equal(f0.done,false);
assert.equal(introFrame(INTRO.lineAt[1]).lines,2);assert.equal(introFrame(INTRO.cardAt).card,true);assert.equal(introFrame(INTRO.minSkipDelay).skippable,true);
const fEnd=introFrame(INTRO.duration);assert.equal(fEnd.done,true);assert.equal(fEnd.lines,3);assert(fEnd.camera.radius<.02&&fEnd.camera.height<1e-9,'camera converges on spawn');
assert(introFrame(1).camera.radius>introFrame(5).camera.radius,'fly-by moves inward');assert.equal(introFrame(NaN).t,0);
const clock=createIntroClock();assert.equal(clock.step(1),null,'inactive clock');clock.start();assert.equal(clock.skip(),false,'too early to skip');
assert.equal(clock.step(.2).lines,0);assert.equal(clock.skip(),false);clock.step(.3);assert.equal(clock.skip(),true);assert.equal(clock.active,false);assert.equal(clock.ended,true);
clock.start();let n=0;while(clock.active&&n<1000){clock.step(.5);n++;}assert.equal(n,INTRO.duration*2);assert.equal(clock.ended,true);
clock.start();clock.cancel();assert.equal(clock.active,false);assert.equal(clock.ended,false);
// play decision.
assert.equal(shouldPlayIntro({}),true);assert.equal(shouldPlayIntro({stageIndex:2}),false);assert.equal(shouldPlayIntro({checkpoint:{stageIndex:0}}),false);
assert.equal(shouldPlayIntro({setting:false}),false);assert.equal(shouldPlayIntro({webdriver:true}),false,'automation defaults to no intro');
assert.equal(shouldPlayIntro({webdriver:true,search:'?intro=1'}),true);assert.equal(shouldPlayIntro({search:'?intro=0'}),false);assert.equal(shouldPlayIntro({setting:false,search:'?intro=1'}),false,'setting off wins over forced flag');
// briefing is data driven.
const cur={map:'reactor',name:'反应堆设施'},nxt={map:'station',name:'地下运输站'};
const b=briefing({mode:'journey',journey:{results:[{time:100,kills:12}]},current:cur,next:nxt,result:{time:100,kills:12}});
assert(b.report.text.includes('反应堆设施')&&b.report.text.includes('12'));assert(b.threat.text.includes('地下运输站')&&b.threat.text.includes('SWITCHYARD'));assert.equal(b.threat.boss,'SWITCHYARD');assert.equal(b.threat.weather,null);
assert.deepEqual(b.totals,{time:100,kills:12,chapters:1});
const b2=briefing({mode:'campaign',current:cur,next:{map:'harbor',name:'风暴港口'}});assert.equal(b2.report,null);assert.equal(b2.threat.weather,'rain');assert.equal(b2.totals,null);
assert.equal(briefing({}),null);assert.equal(briefing({next:{map:'unknown',name:'?'}}).threat.boss,null);
console.log('presentation rules OK');
