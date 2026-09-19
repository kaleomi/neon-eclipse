// Two chapter-themed environment interactions shared by all nine chapters. Pure rules, no rendering.
//  - vent console: hold E for HOLD seconds -> a steam/coolant zone of RADIUS for DURATION seconds centred on the zone anchor.
//    Enemies inside move at SLOW and cannot start a telegraph; anyone inside (player included) takes DPS. Recharges after COOLDOWN.
//  - light switch: toggles the sector floodlights. In the dark ranged/sniper effective range shrinks, stalkers/hounds move faster;
//    switching back restores the profile. Nothing else (health, mission, Boss) is touched.
export const VENT=Object.freeze({hold:1.5,duration:5,radius:3.2,slow:.5,dps:6,cooldown:12,reach:2.2});
export const LIGHTS=Object.freeze({hold:.6,reach:2.2,darkRangeScale:.65,darkSpeedScale:1.25,darkTypes:Object.freeze(['stalker','hound']),rangedTypes:Object.freeze(['ranged','sniper','commander'])});
const finite=n=>Number.isFinite(n);
export function createVentConsole({x,z,y=0,zone,rules=VENT}={}){
 if(!finite(x)||!finite(z)||!zone||!finite(zone.x)||!finite(zone.z))throw new TypeError('Invalid vent console');
 const state={hold:0,active:0,cooldown:0,uses:0};
 function inReach(p,feetY=0){return Math.hypot(p.x-x,p.z-z)<=rules.reach&&Math.abs(feetY-y)<.6;}
 function inZone(p,feetY=0){return state.active>0&&Math.hypot(p.x-zone.x,p.z-zone.z)<=rules.radius&&Math.abs(feetY-(zone.y??y))<1.2;}
 // Returns 'started' once when the hold completes. Held must be re-armed each frame by the caller.
 function tick(dt,{player,feetY=0,held=false,busy=false}={}){
  if(!finite(dt)||dt<0)dt=0;
  state.active=Math.max(0,state.active-dt);state.cooldown=Math.max(0,state.cooldown-dt);
  const ready=state.active===0&&state.cooldown===0&&player&&inReach(player,feetY)&&held&&!busy;
  if(!ready){state.hold=0;return null;}
  state.hold+=dt;if(state.hold+1e-9<rules.hold)return 'holding';
  state.hold=0;state.active=rules.duration;state.cooldown=rules.cooldown+rules.duration;state.uses++;return 'started';
 }
 function reset(){state.hold=0;state.active=0;state.cooldown=0;state.uses=0;}
 return {x,z,y,zone,rules,state,tick,reset,inReach,inZone,get progress(){return Math.min(1,state.hold/rules.hold);},get ready(){return state.active===0&&state.cooldown===0;},
  get hint(){return state.active>0?'冷却剂喷射中 // 区域内敌人减速，无法预警，持续 '+Math.ceil(state.active)+'s':state.cooldown>0?'排气阀充压中 // '+Math.ceil(state.cooldown)+'s':'按住 E 打开排气阀 // 1.5 秒 · 向前方区域喷射冷却剂';}};
}
export function createLightSwitch({x,z,y=0,rules=LIGHTS}={}){
 if(!finite(x)||!finite(z))throw new TypeError('Invalid light switch');
 const state={hold:0,lit:true,toggles:0,latch:false};
 function inReach(p,feetY=0){return Math.hypot(p.x-x,p.z-z)<=rules.reach&&Math.abs(feetY-y)<.6;}
 function tick(dt,{player,feetY=0,held=false,busy=false}={}){
  if(!finite(dt)||dt<0)dt=0;
  const ready=player&&inReach(player,feetY)&&held&&!busy;
  if(!ready){state.hold=0;state.latch=false;return null;}
  if(state.latch)return null;
  state.hold+=dt;if(state.hold+1e-9<rules.hold)return 'holding';
  state.hold=0;state.latch=true;state.lit=!state.lit;state.toggles++;return state.lit?'lit':'dark';
 }
 function reset(){state.hold=0;state.lit=true;state.toggles=0;state.latch=false;}
 return {x,z,y,rules,state,tick,reset,inReach,get lit(){return state.lit;},get progress(){return Math.min(1,state.hold/rules.hold);},
  get hint(){return state.lit?'按住 E 切断区域照明 // 黑暗中远程守卫射程缩短，潜行者与猎犬更快':'按住 E 恢复区域照明 // 远程守卫射程恢复，潜行者与猎犬减速';}};
}
// Combat modifiers consumed by the enemy director. `zoneTest(enemy)` is any predicate; missing pieces mean "no change".
// `weather` is a pre-resolved modifier object ({range,speed}) from weather-rules.js; it never touches telegraphs or DPS.
export function environmentModifiers(enemy,{vent=null,lights=null,weather=null}={}){
 const out={speed:1,range:1,canTelegraph:true,ventDps:0};
 if(weather){if(Number.isFinite(weather.range))out.range*=weather.range;if(Number.isFinite(weather.speed))out.speed*=weather.speed;}
 if(vent&&vent.state.active>0&&vent.inZone(enemy.group.position,enemy.group.position.y)){out.speed*=vent.rules.slow;out.canTelegraph=false;out.ventDps=vent.rules.dps;}
 if(lights&&!lights.lit){if(lights.rules.rangedTypes.includes(enemy.type))out.range*=lights.rules.darkRangeScale;if(lights.rules.darkTypes.includes(enemy.type))out.speed*=lights.rules.darkSpeedScale;}
 return out;
}
