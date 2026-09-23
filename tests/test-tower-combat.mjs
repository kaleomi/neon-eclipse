import assert from 'node:assert/strict';
import * as T from '../node_modules/three/build/three.module.js';
import {TOWER_STAGES,towerObstacles} from '../src/tower-data.js';
import {createEnemyDirector} from '../src/enemy-ai.js';
import {createTowerNavigation} from '../src/tower-navigation.js';
import {createEnemyProjectiles} from '../src/projectiles.js';
const obstacles=towerObstacles(2).concat(TOWER_STAGES.filter(s=>s.id!=='extract').map(s=>({x:s.x,z:s.z,w:1.8,d:1,bottom:s.feetY,top:s.feetY+1.4,h:s.feetY+1.4}))),scene=new T.Scene();
for(const o of obstacles){o.mesh=new T.Mesh(new T.BoxGeometry(o.w,o.top-o.bottom,o.d),new T.MeshBasicMaterial());o.mesh.position.set(o.x,(o.top+o.bottom)/2,o.z);scene.add(o.mesh);}scene.updateMatrixWorld(true);
for(const type of ['assault','ranged','heavy']){
 const vertical=createTowerNavigation(obstacles),group=new T.Group();group.position.set(-22,0,-8);scene.add(group);
 const enemy={group,type,boss:false,radius:type==='heavy'?.85:.65,speed:type==='heavy'?1.3:2.5,attack:0,charge:0,seed:0,hp:100},shots=[];
 const player={position:new T.Vector3(5,7.7,6)};
 const director=createEnemyDirector({enemies:[enemy],player,navigation:{direction:()=>({x:0,z:0})},vertical,move(){},obstacles,projectiles:{queue:origin=>{shots.push(origin.clone());return true},hasPending:()=>false,cancelOwner(){}},onBossEvent(){}});
 let gate=0,reached=false;for(let i=0;i<10000;i++){gate=director.update(.02,i*.02,Math.max(0,gate-.02));if(group.position.y===6)reached=true;}assert(reached,'AI reaches third floor '+type);assert(shots.some(p=>p.y>=7.5),'third-floor muzzle '+type);
 player.position.set(-23,1.7,16);let down=false;for(let i=0;i<10000;i++){gate=director.update(.02,i*.02,Math.max(0,gate-.02));if(group.position.y===0&&group.position.x<-19)down=true;}assert(down,'AI returns to lobby '+type);scene.remove(group);
}
for(const startY of [4,7.6]){let damage=0;const s=new T.Scene(),projectiles=createEnemyProjectiles(s,[{x:0,z:0,w:10,d:10,h:6,bottom:5.75,top:6}],d=>damage+=d,()=>{});projectiles.queue(new T.Vector3(-8,startY,0),new T.Vector3(8,4,0),false,null,{charge:.01,speed:20,angles:[0],damage:10});projectiles.update(.02,new T.Vector3(8,4.35,0));projectiles.update(1,new T.Vector3(8,4.35,0));assert.equal(damage,startY===4?10:0,'slab blocks crossing, not shots underneath');}
console.log('PASS: actual assault/ranged/heavy AI on three floors, ascending/descending and high muzzle; projectiles respect slab bottom and top');
