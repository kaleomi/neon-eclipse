import assert from 'node:assert/strict';
import {AUDIO_SETTINGS_KEY,BUSES,DEFAULT_VOLUMES,sliderToGain,readAudioSettings,writeAudioSettings,effectiveGain,createAudioBus} from './audio/audio-bus.js';
import {validRecipe,recipeDuration,layerDuration,renderRecipe} from './audio/synth.js';
import {SFX,SFX_NAMES,TELEGRAPH_BY_COLOR,WEAPON_FIRE} from './audio/sfx-catalog.js';
import {spatialize,createSfxPlayer,MAX_VOICES} from './audio/sfx-player.js';
import {resolveMusicState,createIntensity,LAYER_TARGETS,MUSIC_STATES,LAYER_NAMES,createMusicDirector} from './audio/music-director.js';
import {createStreak,STREAK_STEPS,createGameAudio} from './audio/game-audio.js';
import {roverEngine,planeEngine,yachtEngine} from './audio/vehicle-audio.js';
import {WEAPONS} from './combat.js';

const memory=(init={})=>{const m=new Map(Object.entries(init));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);}};};

// ---- Minimal fake AudioContext: records nodes, supports the API surface synth/bus/music use. ----
function fakeContext(){
 const created=[];
 const param=(v=0)=>{const p={value:v,events:[]};for(const m of ['setValueAtTime','linearRampToValueAtTime','exponentialRampToValueAtTime','setTargetAtTime','cancelScheduledValues'])p[m]=(...a)=>{p.events.push([m,...a]);return p;};return p;};
 const node=kind=>{const n={kind,inputs:[],started:[],stopped:[],connect(t){n.inputs.push(t);return t;},start(...a){n.started.push(a);},stop(...a){n.stopped.push(a);}};created.push(n);return n;};
 const ctx={
  state:'suspended',currentTime:0,sampleRate:8000,destination:node('destination'),created,
  async resume(){ctx.state='running';},async suspend(){ctx.state='suspended';},
  createGain(){const n=node('gain');n.gain=param(1);return n;},
  createOscillator(){const n=node('osc');n.frequency=param(440);n.detune=param(0);n.type='sine';return n;},
  createBiquadFilter(){const n=node('filter');n.frequency=param(350);n.Q=param(1);n.type='lowpass';return n;},
  createStereoPanner(){const n=node('panner');n.pan=param(0);return n;},
  createDynamicsCompressor(){const n=node('comp');for(const k of ['threshold','knee','ratio','attack','release'])n[k]=param(0);return n;},
  createBuffer(ch,len,rate){const chans=Array.from({length:ch},()=>new Float32Array(len));return {length:len,sampleRate:rate,numberOfChannels:ch,getChannelData:i=>chans[i]};},
  createBufferSource(){const n=node('buffer');n.buffer=null;n.loop=false;n.loopStart=0;return n;}
 };
 return ctx;
}

// 1. Settings: defaults, clamp, persistence, corrupt tolerance, perceptual curve, mute.
{
 const s=memory();
 assert.deepEqual(readAudioSettings(s),{...DEFAULT_VOLUMES,muted:false});
 assert.ok(writeAudioSettings({master:1.7,music:-1,sfx:.5,ui:'x',voice:.3,muted:true},s));
 const r=readAudioSettings(s);
 assert.equal(r.master,1);assert.equal(r.music,0);assert.equal(r.sfx,.5);assert.equal(r.ui,0);assert.equal(r.voice,.3);assert.equal(r.muted,true);
 s.setItem(AUDIO_SETTINGS_KEY,'{bad');assert.deepEqual(readAudioSettings(s),{...DEFAULT_VOLUMES,muted:false});
 s.setItem(AUDIO_SETTINGS_KEY,JSON.stringify({master:NaN,music:.2}));assert.equal(readAudioSettings(s).master,DEFAULT_VOLUMES.master);assert.equal(readAudioSettings(s).music,.2);
 assert.equal(sliderToGain(0),0);assert.equal(sliderToGain(1),1);assert.ok(sliderToGain(.5)<.5&&sliderToGain(.5)>.2);
 assert.equal(effectiveGain({master:1,sfx:.5,muted:false},'sfx'),sliderToGain(.5));
 assert.equal(effectiveGain({master:.5,sfx:1,muted:false},'sfx'),sliderToGain(.5));
 assert.equal(effectiveGain({master:1,sfx:1,muted:true},'sfx'),0);
 assert.equal(writeAudioSettings({},null),false);
 assert.equal(readAudioSettings({getItem(){throw new Error('denied');}}).master,DEFAULT_VOLUMES.master);
}

// 2. Bus lifecycle: lazy context, unlock, hold/release stacking, gains applied, no context -> graceful.
{
 const ctx=fakeContext();const s=memory();
 const bus=createAudioBus({storage:s,contextFactory:()=>ctx});
 assert.equal(bus.context,null);assert.equal(bus.ready,false);assert.equal(bus.input('sfx'),null);
 assert.equal(await bus.unlock(),true);assert.equal(ctx.state,'running');assert.ok(bus.ready);
 for(const b of BUSES)if(b!=='master')assert.ok(bus.input(b),b);
 assert.equal(bus.input('nope'),bus.input('sfx'));
 await bus.hold('paused');assert.equal(ctx.state,'suspended');assert.equal(bus.ready,false);
 await bus.hold('hidden');await bus.release('paused');assert.equal(ctx.state,'suspended','still held by hidden');
 await bus.release('hidden');assert.equal(ctx.state,'running');
 assert.deepEqual(bus.snapshot().suspendedBy,[]);
 assert.ok(bus.setVolume('music',.3));assert.equal(JSON.parse(s.getItem(AUDIO_SETTINGS_KEY)).music,.3);
 assert.equal(bus.setVolume('bogus',.3),false);
 assert.equal(bus.setMuted(true),true);assert.equal(JSON.parse(s.getItem(AUDIO_SETTINGS_KEY)).muted,true);
 let notified=0;const off=bus.subscribe(()=>notified++);bus.setVolume('sfx',.4);assert.equal(notified,1);off();bus.setVolume('sfx',.5);assert.equal(notified,1);
 const none=createAudioBus({storage:memory(),contextFactory:()=>null});
 assert.equal(await none.unlock(),false);assert.equal(none.input('sfx'),null);
 const throwing=createAudioBus({storage:memory(),contextFactory:()=>{throw new Error('no audio');}});
 assert.equal(await throwing.unlock(),false);
}

// 3. Catalog: every recipe valid, has a bus, distinct telegraph signatures, weapon map matches WEAPONS.
{
 assert.ok(SFX_NAMES.length>=60,'catalog size '+SFX_NAMES.length);
 for(const name of SFX_NAMES){const r=SFX[name];assert.ok(validRecipe(r),'invalid recipe '+name);assert.ok(['sfx','ui','music','voice'].includes(r.bus),name+' bus');assert.ok(recipeDuration(r)<=3,name+' too long');}
 assert.equal(WEAPON_FIRE.length,WEAPONS.length+4);assert.deepEqual(WEAPON_FIRE.slice(0,4),['fire.vanguard','fire.breacher','fire.ghost','melee.swing']);assert.equal(WEAPON_FIRE[4],'fire.tempest');assert.equal(WEAPON_FIRE[5],'fire.halo');assert.equal(WEAPON_FIRE[6],'fire.railspike');assert.equal(WEAPON_FIRE[7],'fire.volt');
 assert.deepEqual(Object.keys(TELEGRAPH_BY_COLOR).sort(),['amber','gold','green','orange','pink','purple']);
 const sig=name=>{const r=SFX[name];return JSON.stringify([r.tones?.map(t=>[t.type,t.f,t.fEnd,t.delay]),r.fm?.map(f=>[f.carrier,f.ratio]),r.noise?.length]);};
 const sigs=Object.values(TELEGRAPH_BY_COLOR).map(sig);assert.equal(new Set(sigs).size,sigs.length,'telegraph sounds must be distinguishable');
 assert.ok(SFX['telegraph.purple'].tones[0].fEnd>SFX['telegraph.purple'].tones[0].f,'purple rises');
 assert.ok(SFX['telegraph.amber'].tones.length===3&&SFX['telegraph.amber'].tones[0].f<120,'amber is a low triple');
 assert.ok(SFX['telegraph.orange'].tones.length===2&&SFX['telegraph.orange'].tones[1].delay>0,'orange is a double blip');
 assert.equal(validRecipe({}),false);assert.equal(validRecipe({tones:[{type:'noise',f:100}]}),false);assert.equal(validRecipe({tones:[{f:100,gain:5}]}),false);assert.equal(validRecipe({noise:[{color:'white',filter:{type:'lowpass',f:1}}]}),false);
 assert.equal(layerDuration({a:.1,d:.2,r:.3,delay:.4}),1);
 assert.equal(recipeDuration({duration:.5,tones:[{f:1,a:1,d:1,r:1}]}),.5);
}

// 4. Renderer builds nodes and schedules envelopes; every source is started and stopped.
{
 const ctx=fakeContext();ctx.state='running';const dest=ctx.createGain();
 const end=renderRecipe(ctx,dest,SFX['fire.breacher'],1,{pitch:1,gain:.5});
 const sources=ctx.created.filter(n=>n.kind==='osc'||n.kind==='buffer');
 assert.ok(sources.length>=3);
 for(const s of sources){assert.equal(s.started.length,1,'started');assert.equal(s.stopped.length,1,'stopped');}
 assert.ok(end>1.1&&end<2);
 const osc=ctx.created.find(n=>n.kind==='osc');
 assert.ok(osc.frequency.events.some(e=>e[0]==='setValueAtTime'&&e[1]===95));
 const gains=ctx.created.filter(n=>n.kind==='gain'&&n!==dest);
 assert.ok(gains.every(g=>g.gain.events.some(e=>e[0]==='exponentialRampToValueAtTime')));
 const fm=fakeContext();renderRecipe(fm,fm.createGain(),SFX['telegraph.gold'],0);
 assert.equal(fm.created.filter(n=>n.kind==='osc').length,2,'fm uses carrier + modulator');
}

// 5. Spatialisation: pan by listener yaw, distance falloff, occlusion cutoff, out of range.
{
 const L={x:0,z:0,yaw:0};
 assert.ok(spatialize(L,{x:5,z:0}).pan>.9,'right of listener when yaw 0');
 assert.ok(spatialize(L,{x:-5,z:0}).pan<-.9,'left');
 assert.ok(Math.abs(spatialize(L,{x:0,z:5}).pan)<.05,'ahead/behind centred');
 assert.ok(spatialize({x:0,z:0,yaw:Math.PI/2},{x:0,z:-5}).pan>.9,'rotated listener: -z becomes right');
 assert.equal(spatialize(L,{x:0,z:0}).pan,0);
 const near=spatialize(L,{x:2,z:0}),far=spatialize(L,{x:30,z:0});
 assert.ok(near.gain>far.gain&&far.gain>0);
 assert.equal(spatialize(L,{x:100,z:0}).gain,0);
 assert.equal(spatialize(L,{x:5,z:0},true).cutoff,1100);
 assert.ok(spatialize(L,{x:5,z:0},false).cutoff>10000);
}

// 6. SFX player: cooldown, voice cap, unknown name, bus not ready, spatial path adds panner+filter.
{
 const ctx=fakeContext();const bus=createAudioBus({storage:memory(),contextFactory:()=>ctx});
 const player=createSfxPlayer(bus,{random:()=>.5});
 assert.equal(player.play('fire.vanguard'),false,'not ready before unlock');
 await bus.unlock();
 assert.equal(player.play('nope'),false);
 assert.equal(player.play('fire.vanguard'),true);
 assert.equal(player.play('fire.vanguard'),false,'cooldown blocks immediate repeat');
 ctx.currentTime+=1;
 assert.equal(player.play('fire.vanguard'),true);
 const before=ctx.created.length;
 ctx.currentTime+=1;
 assert.equal(player.play('telegraph.purple',{position:{x:4,z:0},listener:{x:0,z:0,yaw:0}}),true);
 const added=ctx.created.slice(before);
 assert.ok(added.some(n=>n.kind==='panner')&&added.some(n=>n.kind==='filter'),'spatial nodes inserted');
 assert.equal(player.play('telegraph.purple',{position:{x:400,z:0},listener:{x:0,z:0,yaw:0}}),false,'inaudible when far');
 let ok=0;for(let i=0;i<MAX_VOICES+10;i++){ctx.currentTime+=.01;if(player.play('hit.body'))ok++;}
 assert.ok(ok<=MAX_VOICES,'voice cap respected: '+ok);
 assert.ok(player.duration('kill.boss')>1);
}

// 7. Music: state resolution priority, intensity smoothing, layer targets, director transitions.
{
 assert.equal(resolveMusicState({playState:'ready'}),'idle');
 assert.equal(resolveMusicState({playState:'paused',enemiesNear:5}),'idle');
 assert.equal(resolveMusicState({playState:'playing'}),'explore');
 assert.equal(resolveMusicState({playState:'playing',enemiesNear:1}),'combat');
 assert.equal(resolveMusicState({playState:'playing',defending:true}),'combat');
 assert.equal(resolveMusicState({playState:'playing',enemiesNear:3,bossActive:true}),'boss');
 assert.equal(resolveMusicState({playState:'playing',bossActive:true,extracting:true}),'extract');
 assert.equal(resolveMusicState({playState:'won',enemiesNear:9}),'won');
 assert.equal(resolveMusicState({playState:'lost'}),'lost');
 for(const s of MUSIC_STATES)assert.deepEqual(Object.keys(LAYER_TARGETS[s]),LAYER_NAMES);
 assert.ok(LAYER_TARGETS.boss.drums>LAYER_TARGETS.combat.drums&&LAYER_TARGETS.combat.drums>LAYER_TARGETS.explore.drums);
 assert.ok(LAYER_TARGETS.extract.alarm>0&&LAYER_TARGETS.combat.alarm===0);
 const i=createIntensity();i.update(.1,1);const up=i.value;assert.ok(up>0&&up<1);i.update(.1,0);assert.ok(i.value<up&&i.value>0,'slow release');
 const j=createIntensity();j.update(.1,1);j.update(.1,1);const rise=j.value;j.update(.1,0);j.update(.1,0);assert.ok(rise-j.value<rise*.2,'release far slower than attack');
 for(let k=0;k<400;k++)i.update(.1,0);assert.equal(i.value,0);
 const ctx=fakeContext();const bus=createAudioBus({storage:memory(),contextFactory:()=>ctx});
 const d=createMusicDirector(bus,{random:()=>.5});
 assert.equal(d.start(),false,'no context yet');
 await bus.unlock();
 assert.equal(d.start(),true);
 assert.equal(d.state,'idle');
 assert.equal(d.update(.016,{playState:'playing'}),true);assert.equal(d.state,'explore');
 assert.equal(d.update(.016,{playState:'playing'}),false);
 d.update(.016,{playState:'playing',enemiesNear:2});assert.equal(d.state,'combat');
 assert.ok(d.targets().drums<LAYER_TARGETS.combat.drums,'combat starts below full intensity');
 for(let k=0;k<200;k++)d.update(.05,{playState:'playing',enemiesNear:4});
 assert.ok(Math.abs(d.targets().drums-LAYER_TARGETS.combat.drums)<.02,'reaches full intensity');
 d.update(.016,{playState:'won'});assert.equal(d.state,'won');assert.equal(d.layers.drums,0);
 assert.equal(d.setState('nonsense'),false);
 d.stop();
}

// 8. Streak + facade hit routing.
{
 const s=createStreak({window:2});
 assert.equal(s.kill(),0);assert.equal(s.kill(),0);assert.equal(s.kill(),3);assert.equal(s.kill(),0);assert.equal(s.kill(),5);
 s.update(2.5);assert.equal(s.count,0);
 assert.deepEqual(STREAK_STEPS,[3,5,10]);
 const ctx=fakeContext();const bus=createAudioBus({storage:memory(),contextFactory:()=>ctx});
 const audio=createGameAudio({storage:memory(),bus,music:false});
 await audio.unlock();
 const played=[];const origPlay=audio.sfx.play;audio.sfx.play=(n,o)=>{played.push(n);return origPlay(n,o);};
 audio.hit({killed:false,headshot:true});audio.hit({killed:false,armored:true});audio.hit({killed:false,core:true});audio.hit({killed:false});
 ctx.currentTime+=1;audio.hit({killed:true,elite:true});ctx.currentTime+=1;audio.hit({killed:true,boss:true});
 assert.deepEqual(played,['hit.head','hit.armor','hit.core','hit.body','kill.elite','kill.boss']);
 played.length=0;audio.hurt(80);audio.hurt(10);assert.deepEqual(played,['player.hurt','player.hurt.low']);
 played.length=0;audio.update(.1,{playState:'playing',health:20});assert.deepEqual(played,['player.heartbeat']);
 audio.update(.1,{playState:'playing',health:20});assert.equal(played.length,1,'heartbeat paced');
 audio.update(.1,{playState:'playing',health:80});audio.update(2,{playState:'playing',health:20});assert.equal(played.length,2);
 audio.weaponFire(1);assert.equal(played.at(-1),'fire.breacher');
 audio.telegraph('purple',{x:1,z:1});assert.equal(played.at(-1),'telegraph.purple');
 audio.telegraph('unknown');assert.equal(played.at(-1),'telegraph.orange');
}

// 9. Vehicle engine mappings are monotonic and bounded.
{
 const idle=roverEngine(0,0),fast=roverEngine(29,1);
 assert.ok(fast.freq>idle.freq&&fast.gain>idle.gain&&fast.cutoff>idle.cutoff);
 assert.ok(roverEngine(-9,-1).freq>idle.freq,'reverse still revs');
 assert.ok(fast.gain<.6);
 const p0=planeEngine(0,0,true),p1=planeEngine(1,50,false);
 assert.ok(p1.freq>p0.freq&&p1.whine>p0.whine&&p1.wind>p0.wind);
 assert.ok(planeEngine(2,0,true).freq===planeEngine(1,0,true).freq,'throttle clamped');
 const y0=yachtEngine(0,0),y1=yachtEngine(13,1);
 assert.ok(y1.freq>y0.freq&&y1.wave>y0.wave&&y1.gain>y0.gain);
}
console.log('PASS: audio settings/persistence, bus unlock + hold/release stacking, catalog validity and distinct telegraph signatures, recipe rendering, spatial pan/distance/occlusion, sfx cooldown/voice cap, music state machine + intensity + director transitions, kill streak + facade routing, vehicle engine mappings');
