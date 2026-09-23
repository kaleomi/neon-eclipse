// Pure weather rules: presets, intensity blending and the single gameplay knob (ranged lock distance).
// Weather never touches collision, movement or damage: only fog/light/particle parameters and `rangeScale`.
import {MAP_REGISTRY} from '../maps/registry.js';
export const WEATHER_PRESETS=Object.freeze({
 clear:Object.freeze({label:'晴',fogScale:1,fogTint:null,lightScale:1,rangeScale:1,particles:null}),
 rain:Object.freeze({label:'雨',fogScale:1.35,fogTint:0x1b3443,lightScale:.85,rangeScale:.9,particles:'rain'}),
 fog:Object.freeze({label:'雾',fogScale:2.6,fogTint:0x9fb3b8,lightScale:.9,rangeScale:.7,particles:null}),
 dust:Object.freeze({label:'沙尘',fogScale:1.9,fogTint:0x8a6a3c,lightScale:.8,rangeScale:.85,particles:'dust'}),
 night:Object.freeze({label:'夜',fogScale:1.15,fogTint:0x02060a,lightScale:.45,rangeScale:1,particles:null}),
 snow:Object.freeze({label:'雪',fogScale:1.5,fogTint:0xa9c4cc,lightScale:.9,rangeScale:.85,particles:'snow'})
});
export const WEATHER_IDS=Object.freeze(Object.keys(WEATHER_PRESETS));
// Chapters whose world module already drives its own sky/fog/particles keep visual ownership; weather.js only
// supplies the gameplay modifier there so the two systems never fight over `scene.fog.density`.
export const WORLD_OWNED_WEATHER=Object.freeze({harbor:'rain',polar:'snow'});
const clamp01=v=>Number.isFinite(v)?Math.min(1,Math.max(0,v)):0;
const lerp=(a,b,t)=>a+(b-a)*t;
export function chapterWeather(mapId){
 const entry=MAP_REGISTRY.find(m=>m.id===mapId);
 const id=entry?.traits?.weather;
 return WEATHER_PRESETS[id]?id:'clear';
}
// `?weather=fog&weather-intensity=.6` overrides the chapter default (challenge modifiers reuse this path).
export function resolveWeather(mapId,search=''){
 const params=new URLSearchParams(search);
 const requested=params.get('weather');
 const id=WEATHER_PRESETS[requested]?requested:chapterWeather(mapId);
 const raw=params.get('weather-intensity');
 const intensity=raw===null?(id==='clear'?0:1):clamp01(Number(raw));
 return {id,intensity:id==='clear'?0:intensity,worldOwned:WORLD_OWNED_WEATHER[mapId]===id&&requested===null};
}
// Blend a preset toward `clear` by intensity; returns the parameters a world module applies.
export function weatherParams({id='clear',intensity=0}={}){
 const preset=WEATHER_PRESETS[id]||WEATHER_PRESETS.clear,t=clamp01(intensity);
 return {id,label:preset.label,intensity:t,fogScale:lerp(1,preset.fogScale,t),lightScale:lerp(1,preset.lightScale,t),rangeScale:lerp(1,preset.rangeScale,t),fogTint:preset.fogTint,tintMix:t*.6,particles:t>0?preset.particles:null,particleDensity:t};
}
// Gameplay-facing modifier: every enemy's fire-start range scales by this. Speed and telegraphs stay untouched.
export function weatherModifiers(weather){
 const p=weatherParams(weather||{});
 return {range:p.rangeScale,speed:1};
}
