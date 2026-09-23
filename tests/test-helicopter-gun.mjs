import assert from 'node:assert/strict';
import {createWeaponState,stepHeliGun,heliMuzzle,heliAim,stepRearm,weaponSummary,createRange,HELI_GUN,ROCKET,specFor,hasRockets} from '../src/vehicle-weapons.js';
import {createHelicopter,startHelicopter} from '../src/helicopter-rules.js';
const seq=()=>{let i=0;return ()=>((i+=.37)%1);};
// State + spec plumbing.
{
 const w=createWeaponState('heli');assert.equal(w.kind,'heli');assert.equal(w.belt,HELI_GUN.belt);assert.equal(w.rockets,ROCKET.count);
 assert.equal(specFor('heli'),HELI_GUN);assert.ok(hasRockets('heli')&&hasRockets('plane')&&!hasRockets('roof'));
 assert.equal(createWeaponState('roof').rockets,0,'roof gun still has no rockets');
 assert.equal(weaponSummary(w).reloadPercent,100);
}
// Muzzle / aim: forward of the nose, below the belly, depressed; nose-down pitch lowers the aim further.
{
 const h=createHelicopter({x:0,y:20,z:0});h.yaw=0;
 const m=heliMuzzle(h);assert.ok(m.y<h.y&&Math.hypot(m.x-h.x,m.z-h.z)>3,'muzzle ahead and below');
 const a0=heliAim(h);assert.ok(a0.y<0&&a0.y>-.3,'default depression: '+a0.y);
 h.pitch=.3;assert.ok(heliAim(h).y<a0.y,'nose-down aims lower');
 h.pitch=-.3;assert.ok(heliAim(h).y>a0.y,'nose-up raises the line');
}
// Fire gate: grounded / unpowered / crashed cannot fire; airborne running fires, consumes belt, reloads, rockets add own velocity and rearm on a pad while grounded.
{
 const w=createWeaponState('heli'),h=createHelicopter({x:0,y:0,z:0}),range=createRange();
 assert.equal(stepHeliGun(w,h,{fire:true},.1,range),null,'grounded cannot fire');assert.equal(w.shots,0);
 startHelicopter(h);h.grounded=false;h.y=25;
 assert.equal(stepHeliGun(w,h,{fire:false},.1,range),null);
 let shots=0;for(let i=0;i<40;i++){if(stepHeliGun(w,h,{fire:true},.05,range,[],{random:seq()}))shots++;}
 assert.ok(shots>=15&&w.shots===shots&&w.ammo===HELI_GUN.belt-shots,'airborne fires on the interval: '+shots);
 assert.ok(w.effects.some(e=>e.kind==='tracer'),'tracer effects recorded');
 h.status='crashed';assert.equal(stepHeliGun(w,h,{fire:true},.2,range),null,'crashed cannot fire');h.status='running';
 h.powered=false;assert.equal(stepHeliGun(w,h,{fire:true},.2,range),null,'unpowered cannot fire');h.powered=true;
 // Empty the belt: reload cycle.
 w.ammo=1;stepHeliGun(w,h,{fire:true},.2,range,[],{random:seq()});assert.equal(w.ammo,0);
 stepHeliGun(w,h,{fire:true},.05,range);assert.ok(w.reload>0,'reload started');
 for(let i=0;i<70;i++)stepHeliGun(w,h,{fire:false},.05,range);assert.equal(w.ammo,HELI_GUN.belt,'belt refilled');
 // Rockets.
 h.vx=10;h.vz=0;h.yaw=0;const before=w.rockets;stepHeliGun(w,h,{rocket:true},.05,range);
 assert.equal(w.rockets,before-1);assert.equal(w.projectiles.length,1);assert.ok(w.projectiles[0].vx>=10-1e-9||Math.abs(w.projectiles[0].vz)>0,'rocket inherits craft velocity');
 stepHeliGun(w,h,{rocket:true},.05,range);assert.equal(w.rockets,before-1,'rocket interval respected');
 for(let i=0;i<80;i++)stepHeliGun(w,h,{},.05,range);assert.equal(w.projectiles.length,0,'rocket resolved (ground/timeout blast)');
 assert.ok(w.effects.length===0||w.effects.every(e=>e.life>0));
 // Rearm: grounded on the pad, stopped, over rearmSeconds.
 h.grounded=true;h.x=0;h.z=0;const pad={x:0,z:0,radius:12};let done=false;
 for(let i=0;i<60&&!done;i++)done=stepRearm(w,h,.1,pad,{stopped:true});
 assert.ok(done&&w.rockets===ROCKET.count&&w.ammo===HELI_GUN.belt,'pad rearm refills belt and rockets');
 assert.equal(stepRearm(w,{...h,x:40},.5,pad,{stopped:true}),false,'off the pad never rearms');
}
// Paused / bad dt are inert.
{const w=createWeaponState('heli'),h=createHelicopter();startHelicopter(h);h.grounded=false;assert.equal(stepHeliGun(w,h,{fire:true},.1,createRange(),[],{paused:true}),null);assert.equal(stepHeliGun(w,h,{fire:true},NaN,createRange()),null);assert.equal(w.shots,0);}
console.log('PASS: helicopter chin gun — state/spec plumbing, muzzle & pitch-coupled aim, airborne-only fire gate (grounded/unpowered/crashed), belt reload, rocket pod with inherited velocity + interval, pad rearm, paused/NaN inert');
