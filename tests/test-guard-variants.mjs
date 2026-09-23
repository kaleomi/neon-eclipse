// A03/H12 geometry, legacy combat parity, GLB, and resource ownership checks.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from '../node_modules/three/build/three.module.js';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {createEnemyModel,animateEnemy} from '../src/enemy-model.js';
import {ENEMY_TYPES,resolveEnemyDamage} from '../src/enemy-rules.js';
import {GUARD_VARIANTS,createGuardVariant,cloneGuardVariant,guardVariantStats,disposeGuardVariant,bindGuardVariant,makeGuardVariantClips} from '../characters/guard-variants.js';
const checks=[];let rayCount=0;
const sha=b=>createHash('sha256').update(b).digest('hex');
function check(name,fn){fn();checks.push(name);console.log('PASS:',name);}
function dispose(g){const geos=new Set();g.traverse(o=>{if(o.geometry)geos.add(o.geometry);});geos.forEach(x=>x.dispose());new Set(g.userData.ownedMaterials||[]).forEach(m=>m.dispose());g.removeFromParent();}
function signature(g){return g.children.filter(o=>o.isMesh).map(o=>({zone:o.userData.hitZone,pos:o.position.toArray(),rot:o.rotation.toArray(),geo:[...o.geometry.attributes.position.array]}));}
const copies={};
for(const type of ['assault','heavy']){
  const old=createEnemyModel(type,{guardBatch:false}),current=createEnemyModel(type,{loadGuardAsset:false});copies[type]={old,current};
  check(type+': exact legacy direct hit meshes and transforms, new visual is non-combat',()=>{
    assert.deepEqual(signature(current),signature(old));assert(current.userData.parts.variantModel);
    assert(current.children.filter(o=>o.isMesh).every(o=>o.visible===true&&o.material.visible===false));
    current.userData.parts.variantModel.visual.root.traverse(o=>{if(o.isMesh)assert(o.userData.combatDecoration);});
  });
  check(type+': 12,960 front/rear/side ray results match in four animation poses',()=>{
    for(const [time,walking,charge]of [[0,false,0],[.31,true,0],[.77,true,.6],[1.4,false,1]]){
      for(const g of [old,current]){g.scale.setScalar(ENEMY_TYPES[type].scale);g.rotation.y=.17;
        animateEnemy({group:g,type,hp:200,seed:.3,charge},time,walking,12);g.updateMatrixWorld(true);}
      for(let yi=0;yi<30;yi++)for(let xi=-13;xi<=13;xi++)for(const [origin,direction]of [
        [[xi*.1,yi*.1,5],[0,0,-1]],[[xi*.1,yi*.1,-5],[0,0,1]],[[5,yi*.1,xi*.1],[-1,0,0]],[[-5,yi*.1,xi*.1],[1,0,0]]]){
        const ray=new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...direction));
        const a=ray.intersectObjects(old.children,false)[0],b=ray.intersectObjects(current.children,false)[0];
        assert.equal(!!a,!!b);if(a){assert(Math.abs(a.distance-b.distance)<1e-8);assert.equal(a.object.userData.hitZone,b.object.userData.hitZone);assert.equal(b.object.parent,current);}rayCount++;
      }
    }
  });
  check(type+': visual subtree does not intercept recursive combat rays',()=>{
    const root=current.userData.parts.variantModel.visual.root;
    assert.equal(new T.Raycaster(new T.Vector3(0,1.94,5),new T.Vector3(0,0,-1)).intersectObject(root,true).length,0);
  });
}
check('heavy: front armor x0.3, side/rear body x1, rear core x2 unchanged',()=>{
  const g=copies.heavy.current;g.rotation.y=0;
  const e={type:'heavy',group:g},front={x:0,z:10},side={x:10,z:0},rear={x:0,z:-10};
  assert.equal(resolveEnemyDamage(e,100,'armor',front).damage,30);assert.equal(resolveEnemyDamage(e,100,'body',front).damage,30);
  assert.equal(resolveEnemyDamage(e,100,'body',side).damage,100);assert.equal(resolveEnemyDamage(e,100,'body',rear).damage,100);
  const core=resolveEnemyDamage(e,100,'core',rear);assert.equal(core.damage,200);assert(core.weak);
});
check('heavy: visible core socket exactly matches the old weak point throughout locomotion',()=>{
  const g=copies.heavy.current,e={type:'heavy',group:g,hp:162,seed:0,charge:0};g.position.set(3,.2,-4);g.rotation.y=.83;
  for(const time of [0,.1,.35,.8,1.3,2.1]){animateEnemy(e,time,true);g.updateMatrixWorld(true);
    const visual=g.getObjectByName('H12_CoreSocket').getWorldPosition(new T.Vector3()),proxy=g.userData.parts.core.getWorldPosition(new T.Vector3());
    assert(visual.distanceTo(proxy)<1e-9);}
});
check('only assault/heavy have the new adapter; R07 keeps its accepted adapter',()=>{
  for(const type of Object.keys(ENEMY_TYPES).filter(t=>!GUARD_VARIANTS[t])){
    const a=createEnemyModel(type,{loadRangedAsset:false}),b=createEnemyModel(type,{guardBatch:false,loadRangedAsset:false});
    assert.deepEqual(signature(a),signature(b));assert(!a.userData.parts?.variantModel);
    if(type==='ranged')assert(a.userData.parts.guard);dispose(a);dispose(b);
  }
});
check('visual hit feedback and independent movement cadence are wired',()=>{
  for(const type of ['assault','heavy']){const g=copies[type].current,e={type,group:g,hp:160,seed:0,charge:0};
    animateEnemy(e,20,false);animateEnemy(e,20.1,true);assert.equal(g.userData.parts.variantModel.pose.mode,'Patrol');
    e.charge=1;animateEnemy(e,20.2,false);assert.equal(g.userData.parts.variantModel.pose.mode,'Aim');
    e.hp=140;animateEnemy(e,20.3,false);animateEnemy(e,20.4,false);assert(g.userData.parts.variantModel.pose.hit>0);}
  assert(GUARD_VARIANTS.assault.period<GUARD_VARIANTS.heavy.period);
});
globalThis.ProgressEvent ||= class ProgressEvent{constructor(type,init){this.type=type;Object.assign(this,init);}};
const statsByType={};
for(const [type,spec]of Object.entries(GUARD_VARIANTS)){
  const visual=createGuardVariant(type),stats=guardVariantStats(visual.root);statsByType[type]=stats;
  check(type+': finite distinct model, <=10k triangles, <=75 mesh batches; four motion clips',()=>{
    assert(stats.triangles>4000&&stats.triangles<=10000);assert(stats.meshes<=75);
    visual.root.traverse(o=>{if(o.isMesh){assert([...o.geometry.attributes.position.array].every(Number.isFinite));assert(!o.geometry.attributes.uv);}});
    assert.deepEqual(makeGuardVariantClips(visual.root,type).map(c=>c.name),['Idle','Patrol','Aim','Hit']);
  });
  const binary=await readFile(new URL('../models/'+spec.file,import.meta.url));
  const manifest=JSON.parse(await readFile(new URL('../models/'+spec.file.replace('.glb','.manifest.json'),import.meta.url),'utf8'));
  for(const [path,hash]of Object.entries(manifest.sourceHashes))assert.equal(sha(await readFile(new URL('../'+path,import.meta.url))),hash);
  check(type+': GLB2 integrity, provenance, no external resources and no unused UVs',()=>{
    assert.equal(binary.readUInt32LE(0),0x46546c67);assert.equal(binary.readUInt32LE(4),2);assert.equal(binary.readUInt32LE(8),binary.length);
    assert.equal(sha(binary),manifest.sha256);assert.equal(manifest.version,spec.version);
    const json=JSON.parse(binary.subarray(20,20+binary.readUInt32LE(12)).toString());
    assert.equal(json.animations.length,4);assert.equal((json.images||[]).length,0);assert(json.buffers.every(b=>!b.uri));
    assert(json.meshes.every(m=>m.primitives.every(p=>p.attributes.TEXCOORD_0===undefined)));
    assert.equal((json.skins||[]).length,0);assert(binary.length<1200000);
  });
  const gltf=await new GLTFLoader().parseAsync(binary.buffer.slice(binary.byteOffset,binary.byteOffset+binary.byteLength),'');
  const template=gltf.scene.getObjectByName(spec.id+'_Visual');
  check(type+': GLB reload and embedded node animation work',()=>{
    assert(template);bindGuardVariant(template,type);assert.deepEqual(guardVariantStats(template),stats);
    const mixer=new T.AnimationMixer(template);mixer.clipAction(gltf.animations.find(c=>c.name==='Patrol')).play();mixer.update(spec.period/4);
    assert(Math.abs(template.getObjectByName(spec.id+'_Thigh_R').rotation.x)>.1);
    if(type==='heavy')assert.deepEqual(template.getObjectByName('H12_CoreSocket').position.toArray(),[0,1.28,-.6]);
    mixer.stopAllAction();mixer.uncacheRoot(template);
  });
  check(type+': cloned instances own geometry/materials; shared role/core bindings survive replacement',()=>{
    const roleA=new T.MeshStandardMaterial(),roleB=new T.MeshStandardMaterial(),coreA=new T.MeshStandardMaterial(),coreB=new T.MeshStandardMaterial();
    const a=cloneGuardVariant(template,type,{accentMaterial:roleA,coreMaterial:coreA}),b=cloneGuardVariant(template,type,{accentMaterial:roleB,coreMaterial:coreB});
    const ma=[],mb=[];a.root.traverse(o=>{if(o.isMesh)ma.push(o);});b.root.traverse(o=>{if(o.isMesh)mb.push(o);});
    let lost=0;mb.forEach(o=>o.geometry.addEventListener('dispose',()=>lost++));b.materials.forEach(m=>m.addEventListener('dispose',()=>lost++));
    roleA.addEventListener('dispose',()=>lost++);coreA.addEventListener('dispose',()=>lost++);
    ma.forEach((o,i)=>{assert.notEqual(o.geometry,mb[i].geometry);assert.notEqual(o.material,mb[i].material);});
    if(type==='heavy')assert(ma.some(o=>o.material===coreA));assert(ma.some(o=>o.material===roleA));
    disposeGuardVariant(a);assert.equal(lost,0);disposeGuardVariant(b);[roleA,roleB,coreA,coreB].forEach(m=>m.dispose());
  });
  disposeGuardVariant(visual);
}
check('the two models are not recolors: geometry counts and real bounds differ',()=>{
  assert.notEqual(statsByType.assault.triangles,statsByType.heavy.triangles);
  const a=createGuardVariant('assault'),h=createGuardVariant('heavy');
  const aw=new T.Box3().setFromObject(a.root).getSize(new T.Vector3()).x,hw=new T.Box3().setFromObject(h.root).getSize(new T.Vector3()).x;
  assert(hw>aw*1.15);disposeGuardVariant(a);disposeGuardVariant(h);
});
check('20 additional spawn/dispose cycles preserve unique owned materials',()=>{
  for(const type of ['assault','heavy'])for(let i=0;i<10;i++){
    const g=createEnemyModel(type,{loadGuardAsset:false}),owned=g.userData.ownedMaterials;
    assert.equal(new Set(owned).size,owned.length);let count=0;owned.forEach(m=>m.addEventListener('dispose',()=>count++));dispose(g);assert.equal(count,owned.length);
  }
});
for(const c of Object.values(copies)){dispose(c.old);dispose(c.current);}
console.log(JSON.stringify({passed:checks.length,rayCount,stats:statsByType},null,2));
