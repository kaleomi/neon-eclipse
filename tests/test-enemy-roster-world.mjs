// Side-by-side original/new chapter worlds: original targets, collisions and rule results.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import * as T from '../node_modules/three/build/three.module.js';
import {SKYHOOK,LEVIATHAN} from '../src/siege-data.js';
import {existsSync} from 'node:fs';
// One-off migration proof against pre-arena-boss world sources captured in gitignored .tools/ (see docs/mcp-enemy-roster-final-2026-09-21.md).
// Without that local capture (clean checkout / CI) there is nothing to compare, so state that and exit 0 instead of failing.
const baselineURL=new URL('../.tools/qa-enemy-roster/baseline-worlds.json',import.meta.url);
if(!existsSync(baselineURL)){console.log('SKIP enemy-roster world side-by-side: local baseline .tools/qa-enemy-roster/baseline-worlds.json not present (migration evidence lives outside Git)');process.exit(0);}
const baseline=JSON.parse(await readFile(baselineURL));
globalThis.document={createElement:()=>({style:{},dataset:{},attributes:{},setAttribute(k,v){this.attributes[k]=String(v);},getAttribute(k){return this.attributes[k]??null;},append(){},remove(){},classList:{add(){},remove(){}}}),body:{append(){}}};globalThis.innerWidth=1280;globalThis.innerHeight=800;
const actualPerformance=globalThis.performance;Object.defineProperty(globalThis,'performance',{value:{now:()=>12345},configurable:true});
const entries=[['overseer','overseer-world.js','createOverseerWorld'],['switchyard','switchyard-world.js','createSwitchyardWorld'],['elevator','elevator-world.js','createElevatorWorld'],['tether','tether-world.js','createTetherWorld'],['abyss','abyss-world.js','createAbyssWorld'],['glacier','glacier-world.js','createGlacierWorld'],['skyhook','siege-world.js','createSiegeWorld'],['leviathan','siege-world.js','createSiegeWorld']];
const oldModules=new Map(),checks=[];let rayCount=0;
async function oldModule(file){if(!oldModules.has(file)){const text=baseline[file].replace(/from\s+(['"])(\.\/[^'"]+)\1/g,(_,q,p)=>'from '+JSON.stringify(new URL(p.replace(/^\.\/(?!(?:audio|characters|weapons|maps|i18n|models|node_modules|scripts)\/)/,'./src/'),new URL('../',import.meta.url)).href));oldModules.set(file,await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64')));}return oldModules.get(file);}
function args(type,scene,obstacles){return [scene,obstacles,...(type==='abyss'?[{level:0,phase:'drained'}]:type==='glacier'?[{thermal:true}]:type==='skyhook'?[SKYHOOK]:type==='leviathan'?[LEVIATHAN]:[])];}
function activate(w){w.setStage(3);if(!w.blocking&&w.boss.rules.activate)w.boss.rules.activate();w.update(0,new T.Vector3(12,1.7,8),0,true);}
function signature(w,scene){scene.updateMatrixWorld(true);return w.targets.map(m=>({tag:m.userData.overseer,siege:m.userData.siegePhase,vertices:[...m.geometry.attributes.position.array],p:m.getWorldPosition(new T.Vector3()).toArray(),q:m.getWorldQuaternion(new T.Quaternion()).toArray(),s:m.getWorldScale(new T.Vector3()).toArray(),visible:m.visible}));}
function obstacleSig(obstacles){return obstacles.map(o=>Object.fromEntries(['x','z','w','d','h','bottom','top','dynamic'].filter(k=>o[k]!==undefined).map(k=>[k,o[k]])));}
for(const [type,file,name]of entries){
 const old=await oldModule(file),next=await import('../src/'+file),oldScene=new T.Scene(),newScene=new T.Scene(),oa=[],na=[],a=old[name](...args(type,oldScene,oa)),b=next[name](...args(type,newScene,na));
 const visuals=[];newScene.traverse(o=>{if(o.userData.arenaArt)visuals.push(o.userData.arenaArt);});assert.equal(visuals.length,1,type);assert.equal(visuals[0].type,type);assert.equal(visuals[0].source,'procedural');
 assert.deepEqual(obstacleSig(na),obstacleSig(oa));activate(a);activate(b);assert.deepEqual(a.boss.snapshot(),b.boss.snapshot(),type+' activation');assert.deepEqual(signature(b,newScene),signature(a,oldScene),type+' initial targets');
 const steps=[0,.2,.6,.9];for(const dt of steps){const p=new T.Vector3(8,1.7,6);assert.equal(b.update(dt,p,0,true),a.update(dt,p,0,true));assert.deepEqual(a.boss.snapshot(),b.boss.snapshot());assert.deepEqual(signature(b,newScene),signature(a,oldScene));}
 // Check each native target with front/back/side ray fans; decoration must never replace its owner.
 const oldTargets=a.targets,newTargets=b.targets;
 for(let i=0;i<oldTargets.length;i++){const center=oldTargets[i].getWorldPosition(new T.Vector3());for(const direction of [new T.Vector3(0,0,-1),new T.Vector3(0,0,1),new T.Vector3(1,0,0),new T.Vector3(-1,0,0)])for(const x of [-.2,0,.2])for(const y of [-.2,0,.2]){
  const origin=center.clone().addScaledVector(direction,-8).add(new T.Vector3(x,y,0)),ray=new T.Raycaster(origin,direction),ha=ray.intersectObjects(oldTargets,false)[0],hb=ray.intersectObjects(newTargets,false)[0];assert.equal(!!ha,!!hb);if(ha){assert(Math.abs(ha.distance-hb.distance)<1e-7);assert.equal(ha.object.userData.overseer,hb.object.userData.overseer);}rayCount++;
 }}
 for(let i=0;i<Math.min(a.targets.length,b.targets.length);i++){const ra=a.hit(a.targets[i],3),rb=b.hit(b.targets[i],3);assert.deepEqual(rb,ra,type+' hit result');}
 a.update(1,new T.Vector3(10,1.7,5),0,false);b.update(1,new T.Vector3(10,1.7,5),0,false);assert.deepEqual(a.boss.snapshot(),b.boss.snapshot(),type+' pause');
 const v=visuals[0].visual;assert.equal(v.rig.nodes.Core.visible,false,'native visible core kept');const before=b.targets.length;b.clear();a.clear();assert.deepEqual(a.boss.snapshot(),b.boss.snapshot());assert.equal(b.targets.length,a.targets.length);assert(before>0);
 for(const obj of [a,b])obj.dispose?.();
 for(const scene of [oldScene,newScene]){const handles=[];scene.traverse(o=>{if(o.userData.arenaArt)handles.push(o.userData.arenaArt);});handles.forEach(h=>h.dispose());const gs=new Set(),ms=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m));});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());scene.clear();}
 checks.push(type+': original target geometry/poses, rules, obstacles, hit results, pause and clear');console.log('PASS',checks.at(-1));
}
Object.defineProperty(globalThis,'performance',{value:actualPerformance,configurable:true});await mkdir('.tools/qa-enemy-roster',{recursive:true});await writeFile('.tools/qa-enemy-roster/world-results.json',JSON.stringify({passed:checks.length,rays:rayCount,checks},null,2)+'\n');console.log(JSON.stringify({worlds:checks.length,rays:rayCount},null,2));
