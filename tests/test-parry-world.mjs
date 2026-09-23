import assert from 'node:assert/strict';
import * as T from '../node_modules/three/build/three.module.js';
import {createEnemyProjectiles} from '../src/projectiles.js';
import {createParry} from '../src/parry-rules.js';
const player=new T.Vector3(0,1.7,0),forward=new T.Vector3(0,0,-1);
function fixture({color='orange',boss=false,speed=20,originZ=-2,wallZ=null,parry=true,force=false}={}){
 const scene=new T.Scene(),obstacles=[],actor=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(.8,1,.4),new T.MeshBasicMaterial());
 mesh.position.y=1.35;actor.position.z=-4;actor.add(mesh);scene.add(actor);scene.updateMatrixWorld(true);
 if(wallZ!==null)obstacles.push({x:0,z:wallZ,w:4,d:.1,bottom:0,top:3});
 const action=createParry();let hp=100,damage=0,contacts=0,impacts=0;
 const bolts=createEnemyProjectiles(scene,obstacles,n=>hp-=n,()=>impacts++,{
  tryParry:(b,t)=>force||action.intercept(b,t,forward),getReflectTargets:()=>[mesh,mesh],
  onReflectHit:(hit,b)=>{assert.equal(hit.object,mesh);assert(b.reflected);assert.equal(b.owner,null);assert.equal(b.damage,6);damage+=b.damage;contacts++;}
 });
 bolts.queue(new T.Vector3(0,1.35,originZ),new T.Vector3(0,1.35,0),boss,null,{color,speed,charge:.01,damage:6,angles:[0]});bolts.update(.01,player);
 if(parry)action.press();
 const tick=dt=>{action.step(dt);bolts.update(dt,player);return {hp,damage,contacts,count:bolts.count,reflected:bolts.reflectedCount,impacts};};
 return {scene,mesh,actor,obstacles,action,bolts,tick};
}
let f=fixture();let s=f.tick(.12);assert.equal(s.hp,100);assert.equal(s.reflected,1);assert.equal(f.bolts.positions().length,0,'friendly return is not an enemy radar threat');
s=f.tick(.12);assert.equal(s.damage,6);assert.equal(s.contacts,1);assert.equal(s.count,0);assert.equal(f.mesh.material.side,T.FrontSide,'no live material mutation');assert.equal(f.tick(1).contacts,1);
f=fixture({speed:100});s=f.tick(.12);assert.equal(s.hp,100);assert.equal(s.damage,6,'remaining subframe traces reflection back to real triangles');
for(const color of ['purple','amber','pink','blue','green','unknown']){f=fixture({color});s=f.tick(.12);assert.equal(s.hp,94);assert.equal(s.reflected,0);}
f=fixture({boss:true});assert.equal(f.tick(.12).hp,94);
f=fixture({color:'purple',force:true});assert.equal(f.tick(.12).hp,94,'projectile layer independently rejects unsafe hook acceptance');
f=fixture({boss:true,force:true});assert.equal(f.tick(.12).hp,94);
f=fixture({originZ:2});assert.equal(f.tick(.12).hp,94,'behind the player is not protected');
f=fixture({parry:false});assert.equal(f.tick(.12).hp,94,'default damage remains unchanged');
f=fixture({wallZ:-1});s=f.tick(.12);assert.equal(s.hp,100);assert.equal(s.reflected,0);assert.equal(s.damage,0,'wall wins before player/parry');
f=fixture({wallZ:-3});f.tick(.12);s=f.tick(.12);assert.equal(s.damage,0);assert.equal(s.count,0,'return cannot pass through cover');
f=fixture();f.action.step(.24);assert.equal(f.tick(.12).hp,94,'late contact in crossing frame is not parried');
f=fixture();f.action.cancel();assert.equal(f.tick(.12).hp,94,'pause/switch cancellation');
f=fixture();f.actor.visible=false;f.tick(.12);s=f.tick(.2);assert.equal(s.damage,0,'hidden parent cannot be damaged');
f=fixture();f.tick(.12);f.scene.remove(f.actor);s=f.tick(.3);assert.equal(s.damage,0,'detached/dead owner does not become a ghost target');f.tick(4);assert.equal(f.bolts.count,0,'reflection does not reset lifetime');
f=fixture();f.tick(.12);f.bolts.clear();assert.equal(f.bolts.count,0);assert.equal(f.bolts.reflectedCount,0);assert.equal(f.tick(1).damage,0,'reset removes returns');
// Optional hooks do not alter the legacy API's normal damage path.
let damage=0;const old=createEnemyProjectiles(new T.Scene(),[],n=>damage+=n,()=>{});old.queue(new T.Vector3(0,1.35,-2),new T.Vector3(0,1.35,0),false,null,{charge:.01,speed:20,damage:6,angles:[0]});old.update(.01,player);old.update(.12,player);assert.equal(damage,6);
console.log('PASS: real swept orange reflection and triangle return, same-frame fast bolts, one hit, original damage, wall precedence both ways, forbidden colors/Boss/rear, late-window rejection, hidden/detached targets, legacy API, clear/lifetime and radar separation');
f=fixture();f.action.step(.12);f.bolts.update(.12,new T.Vector3(1,1.7,0),new T.Vector3(-1,1.7,0));assert.equal(f.bolts.reflectedCount,1,'moving player uses swept relative contact, not only frame-end overlap');
console.log('PASS: moving-player swept parry contact');

f=fixture();f.tick(.08);const returned=f.scene.children.find(g=>g.isGroup&&g!==f.actor),tail=returned.children[2];
assert(tail.scale.y<=.6);assert(tail.position.length()+tail.scale.y/2<=.1500001,'short new trail never extends past the reflection contact toward the camera');
console.log('PASS: reflected trail grows only along the travelled return segment');
