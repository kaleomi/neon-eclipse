import {GLACIER_ARMOR,GLACIER_CORE} from '../src/glacier-rules.js';
import assert from 'node:assert/strict';
import path from 'node:path';
import {startRosterBrowser,trackedPage} from './roster-browser-driver.mjs';
const env=await startRosterBrowser(),checks=[];
try{
 for(const [map,type]of [['station','switchyard'],['roof','overseer'],['tower','elevator'],['train','skyhook'],['harbor','leviathan'],['orbital','tether'],['datacenter','abyss'],['polar','glacier']]){
  const context=await env.browser.newContext({viewport:{width:960,height:700}});const {page:p,errors}=await trackedPage(context);
  await context.route('**/app.js',async route=>{const response=await route.fetch();let source=await response.text();assert(source.includes("if(state==='playing')update(dt);"));source=source.replace("if(state==='playing')update(dt);",'if(false)update(dt);');source+=`
window.__rosterBoss={
 setup(){reset(3);state='playing';document.body.dataset.playState=state;overlay.hidden=true;for(const e of enemies)disposeGroup(e.group);enemies.length=0;
  if(!overseer)throw Error('Chapter boss missing');overseer.setStage(3);if(!overseer.blocking&&overseer.boss.rules.activate)overseer.boss.rules.activate();overseer.update(0,camera.position,playerMotion.state.y,true);scene.updateMatrixWorld(true);
  this.core=overseer.targets.find(o=>o.userData.overseer==='core');if(!this.core)throw Error('Native core target missing');const p=this.core.getWorldPosition(new THREE.Vector3());camera.position.copy(p).add(new THREE.Vector3(4,2.4,8));playerMotion.reset(camera.position,camera.position.y-1.7);camera.lookAt(p);yaw=camera.rotation.y;pitch=camera.rotation.x;camera.updateMatrixWorld(true);
  handling.update(1,false);update(0); // Initialize the existing first-person weapon pose before photographic evidence.
  this.states=[];scene.traverse(o=>{if(o.userData.arenaArt)this.states.push(o.userData.arenaArt);});return this.snapshot();},
 snapshot(){return {sources:this.states?.map(s=>({type:s.type,source:s.source,coreHidden:s.visual.rig.nodes.Core.visible===false})),targets:overseer.targets.length,coreVisible:this.core?.visible,coreDraw:this.core?.material.visible,status:overseer.boss.snapshot(),coords:this.core?.getWorldPosition(new THREE.Vector3()).toArray()};},
 damage(){return overseer.hit(this.core,5);},
 clear(){overseer.clear();return this.snapshot();}
};`;await route.fulfill({response,body:source});});
  await p.goto(env.base+'/index.html?map='+map+'&menu=chapter');await p.waitForFunction(()=>!!window.__rosterBoss);await p.evaluate(()=>__rosterBoss.setup());await p.waitForFunction(()=>__rosterBoss.snapshot().sources?.length===1&&__rosterBoss.snapshot().sources[0].source==='glb');
  const s=await p.evaluate(()=>__rosterBoss.snapshot());assert.equal(s.sources[0].type,type);assert(s.sources[0].coreHidden);assert(s.coreVisible&&s.coreDraw);assert(s.targets>0);assert(s.coords.every(Number.isFinite));
  const hit=await p.evaluate(()=>__rosterBoss.damage());if(!s.status.exposed)assert.equal(hit.damage,type==='glacier'?5*GLACIER_ARMOR:0,type+' native closed-armor multiplier');else assert(Number.isFinite(hit.damage)&&hit.damage>=0&&hit.damage<=5*(type==='glacier'?GLACIER_CORE:1));
  if(['overseer','glacier','skyhook'].includes(type))await p.screenshot({path:path.join(env.dir,type+'-chapter.png')});
  const cleared=await p.evaluate(()=>__rosterBoss.clear());assert.equal(cleared.targets,0);assert(!cleared.status.blocking);assert.deepEqual(errors,[]);checks.push({map,type,source:'glb',nativeTargets:s.targets,nativeArmor:true,closedMultiplier:type==='glacier'?GLACIER_ARMOR:0,clear:true});console.log('PASS chapter GLB',map,type);await context.close();
 }
 await env.save('boss-browser-results.json',{chapters:8,checks,softwareWebGL:true,targetHardwareValidated:false});
}finally{await env.close();}
