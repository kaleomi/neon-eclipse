// Event -> recipe catalog. Names are stable identifiers used by app.js / vehicle-app.js.
// Design rule: every enemy telegraph colour has its own pitch signature so a player can tell
// orange / purple / amber / pink / gold apart with eyes closed. Volumes are pre-mixed for the sfx bus.
//   orange (assault)  : short double blip, mid
//   purple (ranged)   : rising lock-on sweep
//   amber  (heavy)    : low triple thud
//   pink   (warden)   : dissonant two-tone
//   gold   (harbor elite) : long metallic ring
//   green  (overseer arc) : buzzing FM
export const SFX={
 // ---- player weapons ----
 'fire.volt':{tones:[{type:'sawtooth',f:140,fEnd:48,gain:.25,a:.001,d:.09,r:.06},{type:'triangle',f:1280,fEnd:420,gain:.14,a:.001,d:.06,r:.045}],noise:[{color:'white',gain:.6,a:.001,d:.07,r:.055,filter:{type:'bandpass',f:2400,q:.8}}],bus:'sfx',cooldown:.1},
 'volt.chain':{tones:[{type:'square',f:1700,fEnd:580,gain:.065,a:.001,d:.045,r:.045},{type:'sine',f:1100,fEnd:1800,gain:.075,a:.001,d:.035,r:.05,delay:.035}],noise:[{color:'white',gain:.12,a:.001,d:.02,r:.04,filter:{type:'highpass',f:3600,q:.7}}],bus:'sfx',cooldown:.1},
 'rail.charge':{tones:[{type:'sine',f:620,fEnd:980,gain:.055,a:.008,d:.035,r:.015}],bus:'sfx',cooldown:.07},
 'fire.railspike':{tones:[{type:'sawtooth',f:160,fEnd:42,gain:.26,a:.001,d:.1,r:.07},{type:'sine',f:1800,fEnd:400,gain:.16,a:.001,d:.06,r:.05}],noise:[{color:'white',gain:.5,a:.001,d:.035,r:.06,filter:{type:'highpass',f:1200,q:.8}}],bus:'sfx',cooldown:.1},
 'fire.halo':{tones:[{type:'triangle',f:760,fEnd:190,gain:.22,a:.001,d:.055,r:.035}],noise:[{color:'white',gain:.34,a:.001,d:.035,r:.02,filter:{type:'bandpass',f:2700,q:1.2}}],bus:'sfx',vary:.025,cooldown:.015},
 'halo.mark':{tones:[{type:'sine',f:880,gain:.075,a:.002,d:.07,r:.06},{type:'sine',f:1320,gain:.065,a:.002,d:.09,r:.07,delay:.06}],bus:'sfx',cooldown:.1},
 'fire.tempest':{tones:[{type:'square',f:280,fEnd:110,gain:.16,a:.001,d:.025,r:.018}],noise:[{color:'white',gain:.32,a:.001,d:.025,r:.02,filter:{type:'highpass',f:1800,q:.8}}],bus:'sfx',vary:.07,cooldown:.015},
 'reload.tempest':{tones:[{type:'triangle',f:640,fEnd:320,gain:.08,a:.001,d:.045,r:.03},{type:'square',f:180,gain:.055,a:.001,d:.035,r:.03,delay:.06}],bus:'sfx',cooldown:.1},
 'fire.vanguard':{tones:[{type:'square',f:190,fEnd:70,gain:.28,a:.001,d:.055,r:.03}],noise:[{color:'white',gain:.55,a:.001,d:.05,r:.03,filter:{type:'lowpass',f:3800,fEnd:900,q:.8}}],bus:'sfx',vary:.06,cooldown:.03},
 'fire.breacher':{tones:[{type:'sawtooth',f:95,fEnd:38,gain:.42,a:.001,d:.12,r:.08}],noise:[{color:'brown',gain:.9,a:.001,d:.11,r:.09,filter:{type:'lowpass',f:2600,fEnd:400,q:.7}},{color:'white',gain:.35,a:.001,d:.03,r:.02,filter:{type:'highpass',f:2000,q:.5}}],bus:'sfx',vary:.05,cooldown:.05},
 'fire.ghost':{tones:[{type:'triangle',f:420,fEnd:180,gain:.18,a:.001,d:.04,r:.03}],noise:[{color:'pink',gain:.32,a:.001,d:.035,r:.03,filter:{type:'bandpass',f:1800,fEnd:900,q:1.4}}],bus:'sfx',vary:.05,cooldown:.03},
 'melee.swing':{noise:[{color:'white',gain:.22,a:.02,d:.09,r:.06,filter:{type:'bandpass',f:900,fEnd:2600,q:2.2}}],fm:[{carrier:520,ratio:1.5,index:220,indexEnd:20,gain:.14,a:.01,d:.14,r:.06}],bus:'sfx',vary:.08},
 'melee.hit':{tones:[{type:'square',f:160,fEnd:60,gain:.3,a:.001,d:.07,r:.05}],fm:[{carrier:880,ratio:2.01,index:600,indexEnd:40,gain:.22,a:.001,d:.09,r:.08}],bus:'sfx',vary:.05},
 'fire.empty':{tones:[{type:'square',f:1300,gain:.08,a:.001,d:.015,r:.01},{type:'square',f:900,gain:.06,a:.001,d:.02,r:.01,delay:.05}],bus:'sfx',cooldown:.12},
 // ---- reload ----
 'reload.start':{noise:[{color:'white',gain:.18,a:.001,d:.03,r:.02,filter:{type:'highpass',f:2500,q:.6}}],tones:[{type:'square',f:640,fEnd:420,gain:.07,a:.001,d:.03,r:.02}],bus:'sfx'},
 'reload.shell':{tones:[{type:'square',f:1100,fEnd:700,gain:.1,a:.001,d:.02,r:.015},{type:'triangle',f:380,gain:.06,a:.001,d:.02,r:.02,delay:.02}],noise:[{color:'white',gain:.1,a:.001,d:.015,r:.01,filter:{type:'highpass',f:3200,q:.6}}],bus:'sfx',vary:.04,cooldown:.05},
 'reload.done':{tones:[{type:'square',f:520,fEnd:760,gain:.1,a:.001,d:.04,r:.03},{type:'triangle',f:260,gain:.08,a:.001,d:.03,r:.03,delay:.04}],bus:'sfx'},
 'weapon.switch':{noise:[{color:'pink',gain:.12,a:.001,d:.04,r:.03,filter:{type:'bandpass',f:1500,q:1}}],tones:[{type:'triangle',f:300,fEnd:420,gain:.06,a:.001,d:.05,r:.03}],bus:'sfx',cooldown:.1},
 // ---- hit feedback ----
 'hit.body':{tones:[{type:'sine',f:520,fEnd:400,gain:.16,a:.001,d:.04,r:.03}],bus:'sfx',vary:.03,cooldown:.02},
 'hit.head':{tones:[{type:'sine',f:820,fEnd:640,gain:.2,a:.001,d:.05,r:.04},{type:'sine',f:1240,gain:.08,a:.001,d:.03,r:.03}],bus:'sfx',vary:.02,cooldown:.02},
 'hit.armor':{tones:[{type:'square',f:240,fEnd:200,gain:.14,a:.001,d:.03,r:.03}],fm:[{carrier:1800,ratio:3.7,index:900,indexEnd:100,gain:.12,a:.001,d:.05,r:.04}],bus:'sfx',vary:.03,cooldown:.03},
 'hit.core':{tones:[{type:'sine',f:980,fEnd:1400,gain:.2,a:.001,d:.06,r:.06},{type:'sine',f:1960,gain:.08,a:.001,d:.05,r:.05}],bus:'sfx',cooldown:.03},
 'kill':{tones:[{type:'sine',f:780,fEnd:1100,gain:.22,a:.001,d:.08,r:.08},{type:'triangle',f:390,fEnd:300,gain:.14,a:.001,d:.1,r:.1}],noise:[{color:'pink',gain:.3,a:.001,d:.09,r:.1,filter:{type:'lowpass',f:2400,fEnd:500,q:.8}}],bus:'sfx',vary:.03},
 'kill.elite':{tones:[{type:'sine',f:660,fEnd:1320,gain:.26,a:.002,d:.14,r:.18},{type:'sawtooth',f:110,fEnd:55,gain:.22,a:.002,d:.2,r:.2}],noise:[{color:'brown',gain:.6,a:.001,d:.18,r:.22,filter:{type:'lowpass',f:1800,fEnd:300,q:.7}}],bus:'sfx'},
 'kill.boss':{tones:[{type:'sine',f:440,fEnd:1760,gain:.3,a:.01,d:.5,r:.6},{type:'sawtooth',f:82,fEnd:41,gain:.3,a:.002,d:.6,r:.5}],noise:[{color:'brown',gain:.8,a:.001,d:.5,r:.6,filter:{type:'lowpass',f:2200,fEnd:200,q:.7}}],fm:[{carrier:220,ratio:1.01,index:400,indexEnd:0,gain:.18,a:.05,d:.7,r:.5}],bus:'sfx'},
 'streak':{tones:[{type:'sine',f:660,gain:.1,a:.001,d:.05,r:.04},{type:'sine',f:880,gain:.1,a:.001,d:.05,r:.04,delay:.07},{type:'sine',f:1320,gain:.12,a:.001,d:.08,r:.08,delay:.14}],bus:'ui'},
 // ---- player state ----
 'player.hazard':{tones:[{type:'sawtooth',f:75,fEnd:30,gain:.2,a:.001,d:.09,r:.05}],noise:[{color:'pink',gain:.3,a:.001,d:.06,r:.05,filter:{type:'bandpass',f:900,q:1.2}}],bus:'sfx',vary:.08,cooldown:.25},
 'player.hurt':{tones:[{type:'triangle',f:60,fEnd:40,gain:.32,a:.001,d:.12,r:.08}],noise:[{color:'brown',gain:.5,a:.001,d:.08,r:.06,filter:{type:'lowpass',f:600,q:.8}}],bus:'sfx',vary:.05,cooldown:.08},
 'player.hurt.low':{tones:[{type:'sine',f:55,fEnd:40,gain:.36,a:.001,d:.15,r:.1},{type:'sine',f:1000,gain:.04,a:.001,d:.3,r:.4,delay:.05}],bus:'sfx',cooldown:.25},
 'player.heartbeat':{tones:[{type:'sine',f:48,gain:.3,a:.005,d:.08,r:.05},{type:'sine',f:44,gain:.22,a:.005,d:.09,r:.06,delay:.18}],bus:'sfx',cooldown:.9},
 'player.death':{tones:[{type:'sawtooth',f:220,fEnd:30,gain:.3,a:.01,d:1.1,r:.4},{type:'sine',f:1100,fEnd:200,gain:.12,a:.02,d:.9,r:.3}],noise:[{color:'brown',gain:.45,a:.02,d:.9,r:.5,filter:{type:'lowpass',f:1200,fEnd:80,q:.7}}],bus:'sfx'},
 'player.jump':{tones:[{type:'triangle',f:170,fEnd:230,gain:.05,a:.001,d:.05,r:.03}],bus:'sfx'},
 'player.land':{tones:[{type:'triangle',f:85,fEnd:50,gain:.1,a:.001,d:.06,r:.04}],noise:[{color:'brown',gain:.16,a:.001,d:.04,r:.03,filter:{type:'lowpass',f:500,q:.8}}],bus:'sfx',vary:.05},
 'player.step':{noise:[{color:'pink',gain:.06,a:.001,d:.025,r:.02,filter:{type:'bandpass',f:420,q:1.2}}],bus:'sfx',vary:.12,cooldown:.2},
 'supply.health':{tones:[{type:'sine',f:620,gain:.12,a:.005,d:.08,r:.06},{type:'sine',f:930,gain:.12,a:.005,d:.1,r:.1,delay:.09}],bus:'ui'},
 'supply.ammo':{tones:[{type:'square',f:440,gain:.08,a:.001,d:.04,r:.03},{type:'square',f:440,gain:.08,a:.001,d:.04,r:.03,delay:.06},{type:'triangle',f:660,gain:.08,a:.001,d:.08,r:.06,delay:.12}],bus:'ui'},
 // ---- enemy telegraphs (colour language) ----
 'telegraph.blue':{tones:[{type:'triangle',f:740,fEnd:920,gain:.085,a:.01,d:.22,r:.05},{type:'sine',f:1480,fEnd:1840,gain:.045,a:.01,d:.22,r:.06,delay:.35}],bus:'sfx',cooldown:.15},
 'telegraph.orange':{tones:[{type:'square',f:520,gain:.09,a:.002,d:.035,r:.02},{type:'square',f:520,gain:.09,a:.002,d:.035,r:.02,delay:.08}],bus:'sfx',cooldown:.05},
 'telegraph.purple':{tones:[{type:'sine',f:420,fEnd:1250,fCurve:'exp',gain:.11,a:.01,d:.7,r:.1}],bus:'sfx',cooldown:.1},
 'telegraph.amber':{tones:[{type:'triangle',f:95,gain:.16,a:.003,d:.07,r:.04},{type:'triangle',f:95,gain:.16,a:.003,d:.07,r:.04,delay:.16},{type:'triangle',f:80,gain:.18,a:.003,d:.09,r:.05,delay:.32}],bus:'sfx',cooldown:.1},
 'telegraph.pink':{tones:[{type:'sawtooth',f:330,gain:.07,a:.005,d:.25,r:.1},{type:'sawtooth',f:349,gain:.07,a:.005,d:.25,r:.1}],bus:'sfx',cooldown:.1},
 'telegraph.gold':{fm:[{carrier:660,ratio:2.76,index:300,indexEnd:60,gain:.14,a:.005,d:.9,r:.3}],bus:'sfx',cooldown:.2},
 'telegraph.green':{fm:[{carrier:110,ratio:7.1,index:500,indexEnd:400,gain:.12,a:.01,d:.6,r:.2}],noise:[{color:'white',gain:.08,a:.01,d:.5,r:.2,filter:{type:'bandpass',f:3000,q:4}}],bus:'sfx',cooldown:.2},
 'enemy.fire':{tones:[{type:'square',f:300,fEnd:120,gain:.14,a:.001,d:.05,r:.04}],noise:[{color:'white',gain:.22,a:.001,d:.04,r:.03,filter:{type:'bandpass',f:1400,q:1.2}}],bus:'sfx',vary:.08,cooldown:.03},
 'enemy.fire.boss':{tones:[{type:'sawtooth',f:180,fEnd:60,gain:.2,a:.001,d:.09,r:.06}],noise:[{color:'pink',gain:.3,a:.001,d:.07,r:.05,filter:{type:'lowpass',f:2000,fEnd:500,q:.9}}],bus:'sfx',vary:.05,cooldown:.03},
 'bolt.pass':{noise:[{color:'white',gain:.12,a:.005,d:.06,r:.05,filter:{type:'bandpass',f:2400,fEnd:900,q:2.5}}],bus:'sfx',vary:.1,cooldown:.06},
 'bolt.wall':{noise:[{color:'pink',gain:.16,a:.001,d:.05,r:.04,filter:{type:'lowpass',f:2600,fEnd:600,q:.8}}],tones:[{type:'triangle',f:240,fEnd:120,gain:.08,a:.001,d:.04,r:.03}],bus:'sfx',vary:.08,cooldown:.03},
 // ---- boss / elite ----
 'boss.phase':{tones:[{type:'sawtooth',f:110,fEnd:220,gain:.18,a:.02,d:.6,r:.4},{type:'sine',f:440,fEnd:880,gain:.12,a:.05,d:.5,r:.5,delay:.1}],noise:[{color:'brown',gain:.3,a:.01,d:.5,r:.4,filter:{type:'lowpass',f:900,fEnd:200,q:.8}}],bus:'sfx'},
 'boss.window.open':{tones:[{type:'sine',f:1046,gain:.14,a:.005,d:.12,r:.1},{type:'sine',f:1318,gain:.14,a:.005,d:.12,r:.1,delay:.1},{type:'sine',f:1568,gain:.16,a:.005,d:.25,r:.3,delay:.2}],bus:'sfx'},
 'boss.window.close':{tones:[{type:'sine',f:1568,fEnd:784,gain:.12,a:.005,d:.25,r:.2},{type:'square',f:196,gain:.1,a:.005,d:.15,r:.15,delay:.1}],bus:'sfx'},
 'elite.vent':{fm:[{carrier:880,ratio:1.98,index:400,indexEnd:20,gain:.16,a:.003,d:.3,r:.3}],noise:[{color:'white',gain:.25,a:.001,d:.25,r:.3,filter:{type:'highpass',f:3500,fEnd:1200,q:.7}}],bus:'sfx'},
 // ---- mission / objectives ----
 'objective.node':{tones:[{type:'sine',f:660,gain:.12,a:.005,d:.1,r:.1},{type:'sine',f:990,gain:.12,a:.005,d:.14,r:.14,delay:.1}],bus:'ui'},
 'objective.defense.start':{tones:[{type:'square',f:440,gain:.1,a:.005,d:.12,r:.08},{type:'square',f:440,gain:.1,a:.005,d:.12,r:.08,delay:.2},{type:'square',f:587,gain:.12,a:.005,d:.2,r:.2,delay:.4}],bus:'ui'},
 'objective.defense.tick':{tones:[{type:'square',f:1200,gain:.05,a:.001,d:.02,r:.01}],bus:'ui',cooldown:.5},
 'objective.extract':{tones:[{type:'sine',f:660,gain:.12,a:.005,d:.12,r:.1},{type:'sine',f:880,gain:.12,a:.005,d:.12,r:.1,delay:.14},{type:'sine',f:1100,gain:.12,a:.005,d:.12,r:.1,delay:.28},{type:'triangle',f:1320,gain:.16,a:.01,d:.5,r:.5,delay:.42}],bus:'ui'},
 'objective.complete':{tones:[{type:'sine',f:660,gain:.12,a:.005,d:.1,r:.08},{type:'sine',f:880,gain:.12,a:.005,d:.1,r:.08,delay:.12},{type:'sine',f:1320,gain:.14,a:.005,d:.3,r:.3,delay:.24}],bus:'ui'},
 'reinforcement':{tones:[{type:'triangle',f:330,fEnd:220,gain:.14,a:.005,d:.2,r:.15},{type:'triangle',f:330,fEnd:220,gain:.14,a:.005,d:.2,r:.15,delay:.28}],bus:'ui'},
 'mission.won':{tones:[{type:'sine',f:523,gain:.14,a:.01,d:.15,r:.1},{type:'sine',f:659,gain:.14,a:.01,d:.15,r:.1,delay:.15},{type:'sine',f:784,gain:.14,a:.01,d:.15,r:.1,delay:.3},{type:'sine',f:1046,gain:.18,a:.01,d:.6,r:.6,delay:.45},{type:'triangle',f:262,gain:.12,a:.01,d:.9,r:.6,delay:.45}],bus:'ui'},
 'mission.lost':{tones:[{type:'sawtooth',f:196,fEnd:98,gain:.14,a:.02,d:.8,r:.5},{type:'sawtooth',f:233,fEnd:110,gain:.12,a:.02,d:.8,r:.5,delay:.05},{type:'sine',f:65,gain:.2,a:.05,d:1.2,r:.6}],bus:'ui'},
 'checkpoint':{tones:[{type:'sine',f:880,gain:.08,a:.002,d:.05,r:.04},{type:'sine',f:1174,gain:.1,a:.002,d:.12,r:.12,delay:.06}],bus:'ui'},
 'star.collect':{tones:[{type:'sine',f:1046,gain:.12,a:.002,d:.08,r:.06},{type:'sine',f:1318,gain:.12,a:.002,d:.08,r:.06,delay:.08},{type:'sine',f:1568,gain:.12,a:.002,d:.08,r:.06,delay:.16},{type:'sine',f:2093,gain:.14,a:.002,d:.3,r:.4,delay:.24}],bus:'ui'},
 // ---- UI ----
 'ui.hover':{tones:[{type:'sine',f:1400,gain:.03,a:.001,d:.02,r:.02}],bus:'ui',cooldown:.04},
 'ui.click':{tones:[{type:'square',f:900,fEnd:1200,gain:.05,a:.001,d:.025,r:.02}],bus:'ui',cooldown:.05},
 'ui.back':{tones:[{type:'square',f:1200,fEnd:800,gain:.05,a:.001,d:.03,r:.02}],bus:'ui',cooldown:.05},
 'ui.confirm':{tones:[{type:'sine',f:784,gain:.07,a:.001,d:.05,r:.04},{type:'sine',f:1046,gain:.08,a:.001,d:.08,r:.08,delay:.06}],bus:'ui'},
 'ui.error':{tones:[{type:'square',f:220,gain:.08,a:.001,d:.08,r:.04},{type:'square',f:196,gain:.08,a:.001,d:.12,r:.06,delay:.1}],bus:'ui'},
 'ui.pause':{tones:[{type:'sine',f:660,fEnd:440,gain:.07,a:.002,d:.12,r:.1}],bus:'ui'},
 'ui.resume':{tones:[{type:'sine',f:440,fEnd:660,gain:.07,a:.002,d:.1,r:.08}],bus:'ui'},
 'ui.notify':{tones:[{type:'sine',f:1046,gain:.05,a:.001,d:.04,r:.04},{type:'sine',f:1318,gain:.05,a:.001,d:.06,r:.06,delay:.05}],bus:'ui',cooldown:.15},
 // ---- vehicles (one-shots; engines are continuous, see vehicle-audio) ----
 'vehicle.enter':{noise:[{color:'pink',gain:.2,a:.005,d:.12,r:.1,filter:{type:'lowpass',f:1200,fEnd:400,q:.8}}],tones:[{type:'triangle',f:180,fEnd:120,gain:.08,a:.005,d:.1,r:.08}],bus:'sfx'},
 'vehicle.exit':{noise:[{color:'pink',gain:.18,a:.005,d:.1,r:.1,filter:{type:'lowpass',f:1500,fEnd:500,q:.8}}],tones:[{type:'triangle',f:120,fEnd:180,gain:.07,a:.005,d:.1,r:.08}],bus:'sfx'},
 'vehicle.impact':{tones:[{type:'triangle',f:90,fEnd:40,gain:.3,a:.001,d:.15,r:.1}],noise:[{color:'brown',gain:.6,a:.001,d:.14,r:.12,filter:{type:'lowpass',f:900,fEnd:200,q:.8}},{color:'white',gain:.2,a:.001,d:.05,r:.04,filter:{type:'highpass',f:2500,q:.7}}],bus:'sfx',vary:.08,cooldown:.15},
 'vehicle.checkpoint':{tones:[{type:'sine',f:988,gain:.1,a:.002,d:.06,r:.05},{type:'sine',f:1318,gain:.12,a:.002,d:.14,r:.14,delay:.07}],bus:'ui'},
 'vehicle.stall':{tones:[{type:'square',f:880,gain:.08,a:.005,d:.12,r:.05},{type:'square',f:880,gain:.08,a:.005,d:.12,r:.05,delay:.25}],bus:'ui',cooldown:.5},
 'vehicle.touchdown':{noise:[{color:'white',gain:.3,a:.001,d:.2,r:.2,filter:{type:'bandpass',f:1600,fEnd:600,q:1.5}}],tones:[{type:'triangle',f:70,fEnd:45,gain:.2,a:.001,d:.12,r:.1}],bus:'sfx'},
 'cannon.fire':{tones:[{type:'sawtooth',f:70,fEnd:30,gain:.4,a:.001,d:.2,r:.15}],noise:[{color:'brown',gain:.9,a:.001,d:.18,r:.2,filter:{type:'lowpass',f:1400,fEnd:200,q:.7}}],bus:'sfx',vary:.05,cooldown:.1},
 'cannon.splash':{noise:[{color:'white',gain:.35,a:.005,d:.25,r:.3,filter:{type:'lowpass',f:3000,fEnd:500,q:.8}}],bus:'sfx',vary:.1,cooldown:.1},
 'cannon.hit':{tones:[{type:'triangle',f:120,fEnd:50,gain:.3,a:.001,d:.15,r:.1}],noise:[{color:'brown',gain:.6,a:.001,d:.2,r:.2,filter:{type:'lowpass',f:1200,fEnd:250,q:.8}}],fm:[{carrier:600,ratio:2.4,index:500,indexEnd:20,gain:.15,a:.001,d:.12,r:.1}],bus:'sfx',cooldown:.08},
 'scan.tick':{tones:[{type:'sine',f:1568,gain:.04,a:.001,d:.03,r:.02}],bus:'ui',cooldown:.24},
 'scan.done':{tones:[{type:'sine',f:1046,gain:.1,a:.002,d:.08,r:.06},{type:'sine',f:1568,gain:.12,a:.002,d:.2,r:.2,delay:.08}],bus:'ui'},
 // Chapter 07 orbital: band crossing (pitch set by direction), landing-pad thruster, TETHER pulse warn / pulse.
 'orbital.band':{tones:[{type:'sine',f:520,fEnd:780,gain:.07,a:.005,d:.14,r:.12}],noise:[{color:'pink',gain:.06,a:.01,d:.12,r:.1,filter:{type:'bandpass',f:1800,q:1.2}}],bus:'ui',cooldown:.3},
 'orbital.pad':{noise:[{color:'white',gain:.5,a:.005,d:.35,r:.3,filter:{type:'lowpass',f:2400,fEnd:400,q:.7}}],tones:[{type:'sawtooth',f:80,fEnd:40,gain:.2,a:.005,d:.3,r:.2}],bus:'sfx',cooldown:.4},
 'tether.pulse.warn':{fm:[{carrier:220,ratio:1.5,index:220,indexEnd:60,gain:.16,a:.01,d:.5,r:.5}],tones:[{type:'sine',f:110,gain:.1,a:.02,d:.6,r:.4}],bus:'sfx'},
 'tether.pulse':{tones:[{type:'sawtooth',f:60,fEnd:30,gain:.34,a:.001,d:.25,r:.3}],noise:[{color:'brown',gain:.7,a:.001,d:.22,r:.35,filter:{type:'lowpass',f:700,fEnd:120,q:.8}}],bus:'sfx'},
 // Chapter 08 datacenter: tide phases, ABYSS discharge warn / discharge, summon splash.
 'tide.rise':{noise:[{color:'brown',gain:.32,a:.2,d:.9,r:.6,filter:{type:'lowpass',f:500,fEnd:900,q:.6}}],bus:'sfx'},
 'tide.high':{tones:[{type:'sine',f:196,fEnd:147,gain:.12,a:.01,d:.4,r:.4},{type:'sine',f:98,gain:.08,a:.02,d:.5,r:.5}],bus:'ui'},
 'tide.drain':{noise:[{color:'pink',gain:.3,a:.05,d:.8,r:.7,filter:{type:'bandpass',f:900,fEnd:300,q:1}}],bus:'sfx'},
 'abyss.discharge.warn':{tones:[{type:'square',f:1760,gain:.05,a:.001,d:.05,r:.03},{type:'square',f:1760,gain:.05,a:.001,d:.05,r:.03,delay:.18},{type:'square',f:1760,gain:.05,a:.001,d:.05,r:.03,delay:.36}],fm:[{carrier:330,ratio:2,index:300,indexEnd:100,gain:.1,a:.01,d:.9,r:.3}],bus:'sfx'},
 'abyss.discharge':{noise:[{color:'white',gain:.8,a:.001,d:.18,r:.25,filter:{type:'highpass',f:900,q:.7}}],fm:[{carrier:90,ratio:3.7,index:900,indexEnd:40,gain:.3,a:.001,d:.25,r:.2}],bus:'sfx'},
 'abyss.summon':{noise:[{color:'white',gain:.4,a:.005,d:.3,r:.3,filter:{type:'lowpass',f:2600,fEnd:400,q:.8}}],tones:[{type:'sine',f:180,fEnd:60,gain:.14,a:.005,d:.25,r:.2}],bus:'sfx',cooldown:.2},
 // Chapter 09 polar: storm phases, warmth warning, frostbite, GLACIER shell warn / impact, ice crack / break, climb out.
 'storm.closing':{noise:[{color:'pink',gain:.28,a:.4,d:1.2,r:.8,filter:{type:'lowpass',f:600,fEnd:1400,q:.6}}],bus:'sfx'},
 'storm.whiteout':{noise:[{color:'white',gain:.34,a:.1,d:.9,r:.9,filter:{type:'bandpass',f:1200,fEnd:700,q:.9}}],tones:[{type:'sine',f:440,fEnd:330,gain:.08,a:.02,d:.5,r:.4}],bus:'sfx'},
 'storm.clearing':{noise:[{color:'pink',gain:.22,a:.05,d:1,r:1,filter:{type:'lowpass',f:1400,fEnd:300,q:.6}}],tones:[{type:'sine',f:330,fEnd:440,gain:.07,a:.02,d:.5,r:.4}],bus:'sfx'},
 'warmth.low':{tones:[{type:'triangle',f:392,fEnd:330,gain:.1,a:.005,d:.18,r:.15},{type:'triangle',f:392,fEnd:330,gain:.1,a:.005,d:.18,r:.15,delay:.3}],bus:'ui',cooldown:1},
 'frost.tick':{tones:[{type:'sine',f:2200,fEnd:1800,gain:.06,a:.001,d:.05,r:.04}],noise:[{color:'white',gain:.1,a:.001,d:.06,r:.05,filter:{type:'highpass',f:4000,q:.7}}],bus:'ui',cooldown:.3},
 'glacier.shell.warn':{tones:[{type:'sawtooth',f:140,fEnd:260,gain:.14,a:.01,d:.9,r:.2}],bus:'sfx'},
 'glacier.shell':{tones:[{type:'sawtooth',f:55,fEnd:28,gain:.4,a:.001,d:.3,r:.35}],noise:[{color:'brown',gain:.9,a:.001,d:.25,r:.4,filter:{type:'lowpass',f:600,fEnd:100,q:.8}}],bus:'sfx',cooldown:.2},
 'ice.crack':{noise:[{color:'white',gain:.35,a:.001,d:.08,r:.1,filter:{type:'bandpass',f:2600,fEnd:900,q:2}},{color:'brown',gain:.3,a:.001,d:.15,r:.15,filter:{type:'lowpass',f:400,q:.8}}],bus:'sfx',cooldown:.5},
 'ice.break':{noise:[{color:'white',gain:.6,a:.001,d:.3,r:.4,filter:{type:'bandpass',f:1800,fEnd:300,q:1.2}},{color:'brown',gain:.8,a:.005,d:.5,r:.6,filter:{type:'lowpass',f:300,fEnd:80,q:.8}}],tones:[{type:'sine',f:70,fEnd:35,gain:.25,a:.005,d:.5,r:.5}],bus:'sfx'},
 'glacier.climb':{tones:[{type:'sawtooth',f:90,fEnd:160,gain:.14,a:.05,d:.8,r:.4}],noise:[{color:'pink',gain:.3,a:.05,d:.7,r:.4,filter:{type:'lowpass',f:1200,fEnd:500,q:.8}}],bus:'sfx'}
};
export const SFX_NAMES=Object.freeze(Object.keys(SFX));
export const TELEGRAPH_BY_COLOR=Object.freeze({blue:'telegraph.blue',orange:'telegraph.orange',purple:'telegraph.purple',amber:'telegraph.amber',pink:'telegraph.pink',gold:'telegraph.gold',green:'telegraph.green'});
export const WEAPON_FIRE=Object.freeze(['fire.vanguard','fire.breacher','fire.ghost','melee.swing','fire.tempest','fire.halo','fire.railspike','fire.volt']);
