import assert from 'node:assert/strict';
import * as T from './node_modules/three/build/three.module.js';
import {reconVolume,reconHeightHint,reconReadiness} from './vehicle-guidance.js';
import {RECON_TARGETS,reconCondition} from './recon-rules.js';
import {buildReconWorld} from './recon-world.js';
for(const g of RECON_TARGETS){const v=reconVolume(g);assert.equal(v.radius,90);assert.equal(v.height,g.maxHeight-g.minHeight);for(const [y,state] of [[v.bottom-.01,'low'],[v.bottom,'inside'],[v.top,'inside'],[v.top+.01,'high']]){const p={x:g.x,z:g.z,y,yaw:g.yaw,roll:0,speed:30,verticalSpeed:0,onGround:false};assert.equal(reconHeightHint(p,g).state,state);assert.equal(reconCondition(p,g),state==='inside'?'ready':'altitude');}}
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};const scene=new T.Scene(),world=buildReconWorld(scene);for(let i=0;i<3;i++){world.update({type:'recon',status:'active',phase:'route',route:{index:i},recon:{reason:'range'}},0);const meshes=[];scene.traverse(o=>{if(o.geometry?.type==='CylinderGeometry'&&o.geometry.parameters.radiusTop===90)meshes.push(o)});assert.equal(meshes.length,3);meshes.forEach((m,j)=>{assert.equal(m.parent.visible,i===j);assert.equal(m.geometry.parameters.height,30);assert.equal(m.position.y,(RECON_TARGETS[j].minHeight+RECON_TARGETS[j].maxHeight)/2+1.3);assert.equal(m.material.depthWrite,false);});}world.dispose();assert.equal(scene.children.length,0);console.log('PASS: all three cylinder bounds match scan rules; low/inside/high boundaries; current-only volume and disposal');

for(const g of RECON_TARGETS){
 const p={x:g.x,y:g.y+1.3,z:g.z,yaw:g.yaw,roll:0,speed:30,verticalSpeed:0,onGround:false};assert(reconReadiness(p,g).every(r=>r.ok));
 for(const [change,id] of [[{y:g.minHeight},'height'],[{x:g.x+91},'range'],[{yaw:g.yaw+1},'heading'],[{speed:21},'speed'],[{roll:.51},'stable'],[{verticalSpeed:6.01},'stable'],[{onGround:true},'range']])assert.equal(reconReadiness({...p,...change},g).find(c=>c.id===id).ok,false);
 assert.match(reconReadiness({...p,yaw:g.yaw-1},g).find(c=>c.id==='heading').text,/向右转/);assert.match(reconReadiness({...p,yaw:g.yaw+1},g).find(c=>c.id==='heading').text,/向左转/);
 assert(reconReadiness({...p,yaw:g.yaw+Math.PI*2},g).every(r=>r.ok));
}
const s2=new T.Scene(),w2=buildReconWorld(s2);s2.updateMatrixWorld(true);const courses=[];s2.traverse(o=>{if(o.name==='recon-course-arrow')courses.push(o)});assert.equal(courses.length,3);courses.forEach((o,i)=>{const direction=new T.Vector3(0,0,-1).applyQuaternion(o.getWorldQuaternion(new T.Quaternion()));assert(Math.abs(direction.x-Math.sin(RECON_TARGETS[i].yaw))<1e-8);assert(Math.abs(direction.z+Math.cos(RECON_TARGETS[i].yaw))<1e-8);assert.equal(o.children.length,6);});w2.dispose();assert.equal(s2.children.length,0);console.log('PASS: readiness reasons, left/right heading and wraparound, 3D arrow directions match flight convention');
