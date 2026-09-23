// Expedition missions 6–8 rules: full lifecycles driven by real vehicle / rotorcraft physics and the shared hitscan path, safe nodes, losses.
import assert from 'node:assert/strict';
import {createFrontierMission,stepFrontierMission,frontierGoal,frontierBoardAllowed,frontierExitAllowed,frontierSummary,FRONTIER_IDS,FRONTIER_STAGES,FRONTIER_PROFILES,FRONTIER_RULES,FRONTIER_SAFE_STAGE,FRONTIER_SITES,aliveHostiles,spawnDrones,
 frontierCheckpointFromMission,validFrontierCheckpoint,canonicalFrontierCheckpoint,restoreFrontierCheckpoint,frontierCheckpointLabel} from '../src/frontier-missions.js';
import {TURBINES,WIND_GATES,CONTROL_TOWER,FARM_HELIPAD,AIRFIELD_HELIPAD,PLATFORM_HELIPAD,PLATFORM_CORE,PLATFORM_MOORING,RADAR_STATION,siteHeight,onControlTower,stepAllowed,SITE_VEHICLE_BOXES,SITE_HELI_OBSTACLES,createRifle,stepRifle,RIFLE} from '../src/frontier-site.js';
import {createRover,stepRover,CollisionGrid,terrainHeight} from '../src/vehicle-rules.js';
import {createYacht,stepYacht,PLATFORM,isFootSurface,footHeight,waterFree,FIELD_BUILDINGS,FIELD} from '../src/maritime-rules.js';
import {stepHelicopter,startHelicopter} from '../src/helicopter-rules.js';
import {FIELD_HELI_SITE,createFieldHelicopter,parkHelicopter,HELI_PADS} from '../src/helicopter-field.js';
import {createWeaponState,stepPlaneGun,enterGunner,stepRoofGun,aimTurret} from '../src/vehicle-weapons.js';
import {createPlane} from '../src/flight-rules.js';
import {EXPEDITION_MISSIONS,EXPEDITION_FINAL,emptyExpedition,newExpeditionCampaign,advanceExpedition,expeditionRecordFromMission,expeditionCheckpointFromMission,saveExpeditionCheckpoint,validExpedition,expeditionTitleEarned,summarizeExpedition} from '../src/expedition-model.js';
const dt=1/60,random=()=>.5;
const HELI_SITE={...FIELD_HELI_SITE,obstacles:[...FIELD_HELI_SITE.obstacles,...SITE_HELI_OBSTACLES]};
const grid=new CollisionGrid([...FIELD_BUILDINGS,...SITE_VEHICLE_BOXES],24,FIELD.bounds);
const land={free:(x,z,r)=>x+r<=FIELD.coast&&Math.abs(x)+r<=FIELD.bounds&&Math.abs(z)+r<=FIELD.bounds&&grid.free(x,z,r)};
const ground=(x,z)=>Math.max(terrainHeight(x,z),footHeight(x,z),siteHeight(x,z));
const boxes=[...FIELD_BUILDINGS,...SITE_VEHICLE_BOXES];
// Simple rotorcraft autopilot: cruise at `alt` towards the pad, then brake over it and descend to pad+8 (stage fires at pad+14).
function flyTo(heli,pad,alt){
 const dx=pad.x-heli.x,dz=pad.z-heli.z,d=Math.hypot(dx,dz),want=Math.atan2(dx,-dz),err=Math.atan2(Math.sin(want-heli.yaw),Math.cos(want-heli.yaw));
 const speed=Math.hypot(heli.vx,heli.vz);
 if(d>40)return {forward:Math.abs(err)<.3?(speed>22?0:1):0,yaw:Math.max(-1,Math.min(1,err*2)),lift:heli.y<alt?1:heli.y>alt+4?-.3:0};
 if(speed>2)return {forward:0,yaw:0,brake:true,lift:0};
 const target=pad.y+8;if(d>4)return {forward:Math.abs(err)<.4?.25:0,yaw:Math.max(-1,Math.min(1,err*2)),lift:0};return {forward:0,yaw:0,lift:heli.y>target+1?-.6:heli.y<target-1?.4:0};
}
// ---- Site geometry.
assert.equal(siteHeight(CONTROL_TOWER.x,CONTROL_TOWER.z),CONTROL_TOWER.h,'tower deck height');
assert(siteHeight(0,CONTROL_TOWER.ramp.maxZ-1)<2&&siteHeight(0,CONTROL_TOWER.ramp.minZ+1)>CONTROL_TOWER.h-2,'ramp rises northwards');
assert(onControlTower(CONTROL_TOWER.x+2,CONTROL_TOWER.z-2)&&!onControlTower(CONTROL_TOWER.x+7,CONTROL_TOWER.z));
assert(stepAllowed({x:0,z:CONTROL_TOWER.ramp.maxZ+1},{x:0,z:CONTROL_TOWER.ramp.maxZ-1},siteHeight),'ramp foot step');
assert(!stepAllowed({x:CONTROL_TOWER.x+CONTROL_TOWER.half+.5,z:CONTROL_TOWER.z},{x:CONTROL_TOWER.x+CONTROL_TOWER.half-.5,z:CONTROL_TOWER.z},siteHeight),'deck edge is a wall');
assert(isFootSurface(PLATFORM_CORE.x,PLATFORM_CORE.z)&&footHeight(PLATFORM_CORE.x,PLATFORM_CORE.z)===PLATFORM.h,'platform deck is a foot surface at deck height');
assert(!waterFree(PLATFORM_CORE.x,PLATFORM_CORE.z)&&waterFree(PLATFORM_MOORING.x-8,PLATFORM_MOORING.z),'boats cannot enter the platform footprint but can moor beside it');
assert(waterFree(PLATFORM_MOORING.x,PLATFORM_MOORING.z,2.7),'mooring point is navigable water');
for(const t of TURBINES)assert(!land.free(t.x,t.z,1.2),'turbine tower blocks '+t.x);
assert(WIND_GATES.every(g=>land.free(g.x,g.z,1.3)),'gates are drivable');
// ---- Profiles / stage tables.
for(const id of FRONTIER_IDS){assert.deepEqual(Object.keys(FRONTIER_PROFILES[id]),['easy','normal','hard']);assert(FRONTIER_STAGES[id].includes(FRONTIER_SAFE_STAGE[id]));assert.match(FRONTIER_RULES[id],/-v1$/);}
assert.equal(EXPEDITION_MISSIONS.length,EXPEDITION_FINAL,'eight missions wired');
assert.deepEqual(EXPEDITION_MISSIONS.slice(5).map(m=>m.id),FRONTIER_IDS);
// ---- Rifle: hitscan into a hostile list, reload cycle.
{const w=createRifle(),range={targets:[{id:'t',type:'drone',x:0,y:1.6,z:-30,r:2,hp:30,maxHp:30,alive:true,respawn:Infinity,respawnIn:0,flash:0}],shots:0,hits:0,kills:0};
 const player={x:0,z:0,yaw:0};let shot=stepRifle(w,player,0,0,{fire:true},dt,range,[],{random});assert(shot?.target,'first shot hits');assert.equal(w.ammo,RIFLE.belt-1);
 shot=stepRifle(w,player,0,0,{fire:true},dt,range,[],{random});assert.equal(shot,null,'cooldown');
 let t=0;while(range.targets[0].alive&&t<20){stepRifle(w,player,0,0,{fire:true},.1,range,[],{random});t+=.1;}assert(!range.targets[0].alive,'drone killed');assert.equal(w.kills,1);
 let reloaded=false;for(let i=0;i<200;i++){stepRifle(w,player,0,0,{fire:true},.1,range,[],{random});if(w.reload>0)reloaded=true;}assert(reloaded&&w.shots>RIFLE.belt,'belt emptied, reloaded and kept firing: shots '+w.shots);
 const blocked={targets:[{...range.targets[0],alive:true,hp:30}],shots:0,hits:0,kills:0};const w2=createRifle();const r2=stepRifle(w2,player,0,0,{fire:true},dt,blocked,[{minX:-3,maxX:3,minZ:-12,maxZ:-10,h:8}],{random});assert(r2&&r2.blocked&&!r2.target,'wall blocks the shot');}
// ---- Mission 6: windfarm, real rover + rifle + helicopter.
{const m=createFrontierMission('windfarm','normal',true),rover=createRover({x:-105,z:60,yaw:0}),player={x:0,z:0,yaw:0},heli=createFieldHelicopter(FARM_HELIPAD);
 const s=extra=>({kind:null,player,rover,heli,plane:createPlane(),yacht:createYacht(),boxes,ground,...extra});
 assert.equal(m.stage,'drive');assert(frontierBoardAllowed(m,'rover')&&!frontierBoardAllowed(m,'helicopter')&&!frontierBoardAllowed(m,'yacht'));
 // Drive through the three gates with real rover physics: steer towards each gate.
 let t=0;while(m.stage==='drive'&&t<240){const g=WIND_GATES[m.gate]||WIND_GATES.at(-1);const dx=g.x-rover.x,dz=g.z-rover.z,want=Math.atan2(dx,-dz),err=Math.atan2(Math.sin(want-rover.yaw),Math.cos(want-rover.yaw));stepRover(rover,{throttle:Math.abs(err)>.6?.3:1,steer:Math.max(-1,Math.min(1,err*2))},dt,land);stepFrontierMission(m,s({kind:'rover'}),dt);t+=dt;}
 assert.equal(m.stage,'park','three gates passed by driving: gate='+m.gate+' pos='+rover.x.toFixed(0)+','+rover.z.toFixed(0));
 // Park at the tower foot.
 // Route around the tower body via a waypoint east of it, then stop at the ramp foot.
 const waypoints=[{x:CONTROL_TOWER.x+18,z:CONTROL_TOWER.z},{...FRONTIER_SITES.towerFoot}];let wp=0;t=0;
 while(m.stage==='park'&&t<120){const g=waypoints[wp];const dx=g.x-rover.x,dz=g.z-rover.z,d=Math.hypot(dx,dz),want=Math.atan2(dx,-dz),err=Math.atan2(Math.sin(want-rover.yaw),Math.cos(want-rover.yaw));if(wp===0&&d<8)wp=1;const last=wp===1;stepRover(rover,last&&d<5?{throttle:0,steer:0,brake:true}:{throttle:Math.abs(err)>.6?.3:last&&d<20?.4:.8,steer:Math.max(-1,Math.min(1,err*2))},dt,land);stepFrontierMission(m,s({kind:'rover'}),dt);t+=dt;}
 assert.equal(m.stage,'climb','parked and stopped at the tower foot: pos '+rover.x.toFixed(1)+','+rover.z.toFixed(1)+' speed '+rover.speed.toFixed(2)+' impacts '+rover.impacts);
 // Walk up the ramp onto the deck.
 Object.assign(player,{x:0,z:CONTROL_TOWER.ramp.maxZ+2});for(let z=player.z;z>CONTROL_TOWER.z;z-=.5){assert(stepAllowed(player,{x:0,z},siteHeight),'ramp walkable at '+z);player.z=z;}
 assert.equal(stepFrontierMission(m,s(),dt),true);assert.equal(m.stage,'snipe');assert.equal(m.hostiles.length,5,'normal spawns 5 drones');
 // Shoot the drones with the rifle from the deck, aiming at each one's live position.
 const rifle=createRifle();t=0;while(m.stage==='snipe'&&t<400){const h=aliveHostiles(m)[0];if(h){const dx=h.x-player.x,dz=h.z-player.z,dy=h.y-(ground(player.x,player.z)+RIFLE.eye);player.yaw=Math.atan2(dx,-dz);const pitch=Math.atan2(dy,Math.hypot(dx,dz));stepRifle(rifle,player,pitch,ground(player.x,player.z),{fire:true},dt,{targets:m.hostiles,shots:0,hits:0,kills:0},boxes,{random});}stepFrontierMission(m,s(),dt);t+=dt;}
 assert.equal(m.stage,'heli','all drones down by rifle in '+t.toFixed(0)+' s, rifle kills '+rifle.kills);assert.equal(rifle.kills,5);
 // Safe node here.
 const node=frontierCheckpointFromMission(m,1000);assert(validFrontierCheckpoint('windfarm',node));assert.equal(node.stage,'heli');assert.deepEqual(canonicalFrontierCheckpoint(node),node);assert.match(frontierCheckpointLabel('windfarm',node),/风电场停机坪/);
 assert(frontierBoardAllowed(m,'helicopter')&&!frontierBoardAllowed(m,'rover'));
 assert.equal(stepFrontierMission(m,s({kind:'helicopter'}),dt),true);assert.equal(m.stage,'lift');
 startHelicopter(heli);t=0;while(m.stage==='lift'&&t<60){stepHelicopter(heli,{lift:1},dt,HELI_SITE);stepFrontierMission(m,s({kind:'helicopter'}),dt);t+=dt;}assert.equal(m.stage,'fly','lifted 8 m');
 assert(!frontierExitAllowed(m,'helicopter'),'no exit mid-flight');
 // Fly to the airfield pad: pitch towards it, hold ~30 m, then brake and descend.
 t=0;while(m.stage==='fly'&&t<600){stepHelicopter(heli,flyTo(heli,AIRFIELD_HELIPAD,70),dt,HELI_SITE);stepFrontierMission(m,s({kind:'helicopter'}),dt);t+=dt;}
 assert.equal(m.stage,'touchdown','arrived over the airfield pad: '+heli.x.toFixed(0)+','+heli.z.toFixed(0)+' y '+heli.y.toFixed(1)+' status '+heli.status);
 t=0;while(!heli.grounded&&t<90){stepHelicopter(heli,{lift:-1},dt,HELI_SITE);stepFrontierMission(m,s({kind:'helicopter'}),dt);t+=dt;}assert(heli.grounded&&heli.status==='running','landed softly: '+heli.reason);
 heli.powered=false;for(let i=0;i<120&&m.status==='active';i++){stepHelicopter(heli,{},dt,HELI_SITE);stepFrontierMission(m,s({kind:'helicopter'}),dt);}
 assert.equal(m.status,'won','windfarm complete');assert.deepEqual(m.completed,FRONTIER_STAGES.windfarm);assert(m.hostiles.every(h=>!h.alive));
 // Restore from the node.
 const r=restoreFrontierCheckpoint('windfarm',node);assert.equal(r.mission.stage,'heli');assert(r.mission.recovered);assert.equal(r.mission.completed.length,4);assert.equal(r.mission.gate,3);assert.deepEqual(r.heliPad,FARM_HELIPAD);
 assert(r.mission.hostiles.length>0&&r.mission.hostiles.every(h=>h.alive===false),'restored wind-farm run carries the cleared sentinels so a later win can still be scored');
 assert.throws(()=>restoreFrontierCheckpoint('windfarm',{...node,rule:'platform-v1'}));assert(!validFrontierCheckpoint('platform',node));
}
// ---- Mission 7: platform, helicopter approach, turret fire, plant, boat escape.
{const m=createFrontierMission('platform','normal',true),heli=createFieldHelicopter(HELI_PADS.shore),yacht={...createYacht(),...PLATFORM_MOORING},player={x:0,z:0,yaw:0};
 const s=extra=>({kind:null,player,rover:createRover(),heli,yacht,plane:createPlane(),boxes,ground,...extra});
 assert.equal(stepFrontierMission(m,s({kind:'helicopter'}),dt),true);assert.equal(m.stage,'lift');
 startHelicopter(heli);let t=0;while(m.stage==='lift'&&t<60){stepHelicopter(heli,{lift:1},dt,HELI_SITE);stepFrontierMission(m,s({kind:'helicopter'}),dt);t+=dt;}assert.equal(m.stage,'fly');
 t=0;while(m.stage==='fly'&&t<600){stepHelicopter(heli,flyTo(heli,PLATFORM_HELIPAD,45),dt,HELI_SITE);stepFrontierMission(m,s({kind:'helicopter'}),dt);t+=dt;}
 assert.equal(m.stage,'land','over the platform pad: '+heli.x.toFixed(0)+','+heli.z.toFixed(0)+' y '+heli.y.toFixed(1));
 t=0;while(!heli.grounded&&t<90){stepHelicopter(heli,{lift:-1},dt,HELI_SITE);stepFrontierMission(m,s({kind:'helicopter'}),dt);t+=dt;}assert(heli.grounded&&heli.status==='running','landed on the deck: '+heli.reason+' y='+heli.y);
 assert(Math.abs(heli.y-PLATFORM.h)<.01,'helicopter rests at deck height');
 heli.powered=false;for(let i=0;i<120&&m.stage==='land';i++){stepHelicopter(heli,{},dt,HELI_SITE);stepFrontierMission(m,s({kind:'helicopter'}),dt);}
 assert.equal(m.stage,'clear');assert.equal(m.hostiles.length,3);
 const node=frontierCheckpointFromMission(m,2000);assert(validFrontierCheckpoint('platform',node)&&node.stage==='clear');
 // Turrets hurt the operator on the deck while in range; health regenerates after a lull.
 Object.assign(player,{x:PLATFORM_HELIPAD.x-6,z:PLATFORM_HELIPAD.z+3});for(let i=0;i<60*8;i++)stepFrontierMission(m,s(),dt);assert(m.health<100,'turret fire lands');
 // Kill turrets with the rifle.
 const rifle=createRifle();t=0;while(m.stage==='clear'&&t<200){const h=aliveHostiles(m)[0];if(h){const dx=h.x-player.x,dz=h.z-player.z,dy=h.y-(ground(player.x,player.z)+RIFLE.eye);player.yaw=Math.atan2(dx,-dz);stepRifle(rifle,player,Math.atan2(dy,Math.hypot(dx,dz)),ground(player.x,player.z),{fire:true},dt,{targets:m.hostiles,shots:0,hits:0,kills:0},boxes,{random});}stepFrontierMission(m,s(),dt);t+=dt;}
 assert.equal(m.stage,'plant','turrets cleared, health '+m.health);assert(m.health>0);
 Object.assign(player,{x:PLATFORM_CORE.x+1,z:PLATFORM_CORE.z});for(let i=0;i<60*4&&m.stage==='plant';i++)stepFrontierMission(m,s({action:true}),dt);
 assert.equal(m.stage,'boat');assert.equal(m.fuse,m.profile.fuse);assert(frontierBoardAllowed(m,'yacht')&&!frontierBoardAllowed(m,'helicopter'));
 assert.equal(stepFrontierMission(m,s({kind:'yacht'}),dt),true);assert.equal(m.stage,'escape');
 // Drive the yacht west at full throttle with real physics until outside the blast radius before the fuse ends.
 t=0;yacht.yaw=-Math.PI/2;while(m.status==='active'&&t<m.profile.fuse+5){stepYacht(yacht,{throttle:1,steer:0},dt);stepFrontierMission(m,s({kind:'yacht'}),dt);t+=dt;}
 assert.equal(m.status,'won','escaped: dist '+Math.hypot(yacht.x-PLATFORM_CORE.x,yacht.z-PLATFORM_CORE.z).toFixed(0)+' reason '+m.reason);
 // Loss: stay on the deck until the fuse runs out.
 const m2=restoreFrontierCheckpoint('platform',node).mission;assert.equal(m2.hostiles.length,3);m2.stage='boat';m2.fuse=2;for(let i=0;i<60*3&&m2.status==='active';i++)stepFrontierMission(m2,s(),dt);assert.equal(m2.status,'lost');assert.match(m2.reason,/引爆/);
 // Loss: helicopter crash.
 const m3=createFrontierMission('platform','easy',true);const crashed={...createFieldHelicopter(HELI_PADS.shore),status:'crashed',reason:'落水'};assert.equal(stepFrontierMission(m3,s({heli:crashed}),dt),true);assert.equal(m3.status,'lost');
}
// ---- Mission 8: radar, any vehicle approach, plane gun on dishes, roof gun + rifle on the mech, mech pursuit and fire.
{const m=createFrontierMission('radar','normal',true),rover=createRover({x:RADAR_STATION.gate.x,z:RADAR_STATION.gate.z+60,yaw:0}),player={x:0,z:0,yaw:0},plane=createPlane(),heli=createFieldHelicopter(HELI_PADS.shore);
 const s=extra=>({kind:null,player,rover,heli,yacht:createYacht(),plane,boxes,ground,...extra});
 assert(frontierBoardAllowed(m,'rover')&&frontierBoardAllowed(m,'plane')&&frontierBoardAllowed(m,'helicopter')&&frontierBoardAllowed(m,'yacht'),'any vehicle');
 let t=0;while(m.stage==='approach'&&t<60){stepRover(rover,{throttle:1,steer:0},dt,land);stepFrontierMission(m,s({kind:'rover'}),dt);t+=dt;}
 assert.equal(m.stage,'dishes','rover reached the gate');assert.equal(m.hostiles.length,3);
 // Plane gun from the air: place the plane on approach to each dish.
 const gun=createWeaponState('plane');t=0;while(m.stage==='dishes'&&t<120){const h=aliveHostiles(m)[0];if(h){Object.assign(plane,{x:h.x,z:h.z+120,y:h.y+8,yaw:0,pitch:-Math.atan2(8,120),onGround:false,crashed:false});stepPlaneGun(gun,plane,{fire:true},dt,{targets:m.hostiles,shots:0,hits:0,kills:0},[],{random});}stepFrontierMission(m,s({kind:'plane'}),dt);t+=dt;}
 assert.equal(m.stage,'boss','dishes destroyed from the plane, kills '+gun.kills);assert.equal(gun.kills,3);
 const node=frontierCheckpointFromMission(m,3000);assert(validFrontierCheckpoint('radar',node)&&node.stage==='boss');
 const mech=m.mech;assert(mech&&mech.alive&&mech.hp===700);
 // Mech walks towards the operator and fires when in range/LOS.
 Object.assign(player,{x:RADAR_STATION.gate.x,z:RADAR_STATION.gate.z-40,yaw:0});const startDist=Math.hypot(mech.x-player.x,mech.z-player.z);
 for(let i=0;i<60*12;i++)stepFrontierMission(m,s(),dt);
 assert(Math.hypot(mech.x-player.x,mech.z-player.z)<startDist-20,'mech advanced');assert(m.health<100,'mech cannon lands');
 // Roof gun from the rover (gunner seat) finishes it, with the rifle chipping in.
 const roof=createWeaponState('roof');enterGunner(roof,rover);Object.assign(rover,{x:mech.x,z:mech.z+60,yaw:0,speed:0});const rifle=createRifle();t=0;
 while(m.stage==='boss'&&t<300){const dx=mech.x-rover.x,dz=mech.z-rover.z;roof.aimYaw=Math.atan2(dx,-dz);roof.aimPitch=Math.atan2(4-2.35,Math.hypot(dx,dz));stepRoofGun(roof,rover,{fire:true},dt,{targets:m.hostiles,shots:0,hits:0,kills:0},[],{ground:0,random});
  const pdx=mech.x-player.x,pdz=mech.z-player.z;player.yaw=Math.atan2(pdx,-pdz);stepRifle(rifle,player,Math.atan2(4-1.6,Math.hypot(pdx,pdz)),0,{fire:true},dt,{targets:m.hostiles,shots:0,hits:0,kills:0},[],{random});
  stepFrontierMission(m,s({kind:'rover'}),dt);t+=dt;if(m.health<40)m.health=100;}
 assert.equal(m.status,'won','mech destroyed in '+t.toFixed(0)+' s; roof hits '+roof.hits+' rifle hits '+rifle.hits);
 // Loss by health.
 const m2=restoreFrontierCheckpoint('radar',node).mission;assert(m2.mech&&m2.mech.hp===700&&m2.recovered);Object.assign(player,{x:m2.mech.x,z:m2.mech.z+15});for(let i=0;i<60*120&&m2.status==='active';i++){stepFrontierMission(m2,s(),dt);}assert.equal(m2.status,'lost');assert.match(m2.reason,/机甲/);
 // Time limit.
 const m3=createFrontierMission('radar','hard',true);m3.elapsed=m3.profile.timeLimit-.1;assert.equal(stepFrontierMission(m3,s(),.2),true);assert.equal(m3.status,'lost');
 // Goal text tracks the live target.
 const m4=createFrontierMission('radar','easy',true);m4.stage='boss';m4.hostiles=[];m4.mech=null;assert.match(frontierGoal(m4,{}).name,/机甲/);
 assert.equal(frontierSummary(m).stages,3);
}
// ---- Expedition archive: eight-mission campaign with frontier records, node save, title.
{let a=newExpeditionCampaign(emptyExpedition(),'normal','campaign-frontier-000000001');
 const attempt=(mission,fromStart=true,resume=null)=>({id:'attempt-'+mission+'-0000000001',campaignId:'campaign-frontier-000000001',mission,difficulty:EXPEDITION_MISSIONS.find(m=>m.id===mission).selectable?'normal':'fixed',fromStart,resume,lastRank:-1});
 const won=id=>{const m=createFrontierMission(id,'normal',true);m.stage='complete';m.status='won';m.completed=[...FRONTIER_STAGES[id]];m.elapsed=200;m.hostiles=[{alive:false}];return m;};
 // Fake the first five with minimal valid records is out of scope here; push records directly through the validator by building a five-record prefix.
 const prefix=[{mission:'escort',rule:'escort-v1',difficulty:'normal'},{mission:'naval',rule:'naval-v1',difficulty:'normal'},{mission:'recon',rule:'recon-v1',difficulty:'fixed'},{mission:'joint',rule:'joint-v1',difficulty:'fixed'},{mission:'lighthouse',rule:'lighthouse-v2',difficulty:'normal'}];
 for(const [i,p] of prefix.entries()){a=advanceExpedition(a,{schema:1,id:'record-prefix-000000000'+i,campaignId:'campaign-frontier-000000001',mission:p.mission,rule:p.rule,difficulty:p.difficulty,resumed:false,elapsedMs:1000+i,completedAt:1});assert(a,'prefix '+p.mission);}
 assert(!expeditionTitleEarned(a));
 for(const id of FRONTIER_IDS){
  const m=createFrontierMission(id,'normal',true);m.stage=FRONTIER_SAFE_STAGE[id];const c=expeditionCheckpointFromMission(attempt(id),m,5);assert(c&&c.mission===id&&c.node.difficulty==='normal','node for '+id);
  const withNode=saveExpeditionCheckpoint(a,c);assert(withNode&&withNode.checkpoint.mission===id);
  assert.equal(expeditionRecordFromMission(attempt(id),{...won(id),health:0}),null,'dead operator cannot record');
  assert.equal(expeditionRecordFromMission(attempt(id),{...won(id),hostiles:[{alive:true}]}),null,'live hostile cannot record');
  assert.equal(expeditionRecordFromMission(attempt('windfarm'),won('platform')),null,'mission id mismatch');
  const record=expeditionRecordFromMission(attempt(id),won(id),{},10);assert(record&&record.rule===FRONTIER_RULES[id]&&record.difficulty==='normal','record for '+id);
  a=advanceExpedition(withNode,record);assert(a&&a.checkpoint===null,'advanced '+id);
 }
 assert.equal(a.campaign.completed.length,EXPEDITION_FINAL);assert(validExpedition(a));assert(expeditionTitleEarned(a),'title after eight');
 assert.equal(summarizeExpedition(a).filter(r=>r.count>0).length,8);
}
console.log('PASS: frontier missions 6–8 — site geometry, rifle hitscan/reload, windfarm drive→park→climb→snipe→heli→fly→touchdown with real rover/rotorcraft physics, platform fly→land→turrets→plant→boat escape (fuse loss, crash loss), radar approach→plane gun on dishes→mech pursuit/fire→roof gun+rifle kill (health loss, time limit), safe nodes create/validate/restore, expedition eight-record campaign + title');
