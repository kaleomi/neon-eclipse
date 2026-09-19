import assert from 'node:assert/strict';
import {EMP,empEligible,empWithin,validEmpState,restoreEmpCharges} from './emp-rules.js';
import {validCheckpoint,createCampaignStore} from './campaign.js';
import {validJourney} from './journey.js';
import {WEAPONS} from './combat.js';
assert.equal(EMP.capacity,2);assert.equal(EMP.duration,3);assert.equal(EMP.radius,6);
for(const type of ['sentry','swarmDrone','drone','hound'])assert(empEligible({type,hp:1}));for(const type of ['engineer','ranged','heavy','warden','harborElite','commander','shield','stalker','sniper'])assert(!empEligible({type,hp:1}));assert(!empEligible({type:'sentry',hp:1,boss:true}));assert(!empEligible({type:'drone',hp:0}));
assert(empWithin({x:0,y:0,z:0},{x:0,y:6,z:0}));assert(!empWithin({x:0,y:0,z:0},{x:0,y:6.001,z:0}));assert(!empWithin({x:NaN,y:0,z:0},{x:0,y:0,z:0}));
assert(validEmpState(undefined));assert.equal(restoreEmpCharges(undefined),2);assert.equal(restoreEmpCharges({charges:0}),0);for(const bad of [null,[],{},1,{charges:-1},{charges:3},{charges:1.5},{charges:NaN},{charges:'1'}]){assert(!validEmpState(bad));assert.equal(restoreEmpCharges(bad),0);}
const cp={stageIndex:0,health:100,selected:0,x:0,z:29,yaw:0,pitch:0,time:0,kills:0,rounds:WEAPONS.slice(0,3).map(w=>w.cap),reserves:WEAPONS.slice(0,3).map(w=>w.reserve),collected:[]};assert(validCheckpoint(cp));assert(validCheckpoint({...cp,emp:{charges:0}}));assert(!validCheckpoint({...cp,emp:{charges:3}}));assert(validJourney({version:7,chapter:0,status:'active',results:[],checkpoint:{...cp,emp:{charges:1}}}));
const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)},store=createCampaignStore(storage);assert(store.save({...cp,emp:{charges:0}}));assert.equal(createCampaignStore(storage).checkpoint.emp.charges,0);assert(!store.save({...cp,emp:{charges:-1}}));assert.equal(store.checkpoint.emp.charges,0);assert(store.save(cp));assert.equal(restoreEmpCharges(createCampaignStore(storage).checkpoint.emp),2);
console.log('PASS: EMP mechanical allowlist/Boss immunity, true 3D radius, optional validated charges with legacy default and preserved zero, campaign/journey compatibility and malformed-save rejection');
