import assert from 'node:assert/strict';
import * as T from './node_modules/three/build/three.module.js';
import {createWeatherWorld} from './weather-world.js';
import {createKillFxWorld} from './kill-fx-world.js';
import {createEnemyModel} from './enemy-model.js';
import {createEnemyDirector} from './enemy-ai.js';
import {ENEMY_TYPES} from './enemy-rules.js';
import {weatherModifiers,resolveWeather} from './weather-rules.js';
import {KILL_FX} from './kill-fx-rules.js';
function freshScene(){const scene=new T.Scene();scene.background=new T.Color(0x071217);scene.fog=new T.FogExp2(0x071217,.014);const hemi=new T.HemisphereLight(0xffffff,0x222222,2.2),sun=new T.DirectionalLight(0xffffff,2.6);scene.add(hemi,sun);return {scene,lights:[hemi,sun],camera:new T.PerspectiveCamera(74,1,.08,160)};}
// Clear weather: nothing changes, no particles.
{const {scene,lights,camera}=freshScene();const w=createWeatherWorld(scene,{lights,weather:resolveWeather('reactor',''),camera});
 assert.equal(w.params.id,'clear');assert.equal(scene.fog.density,.014);assert.deepEqual(lights.map(l=>l.intensity),[2.2,2.6]);assert.equal(w.particleCount,0);w.update(1);assert.equal(scene.children.some(o=>o.userData.weather),false);}
// Fog at full intensity: density ×2.6, lights ×.9, no particles; snapshot exposes base values for restore checks.
{const {scene,lights,camera}=freshScene();const w=createWeatherWorld(scene,{lights,weather:resolveWeather('reactor','?weather=fog'),camera});
 assert(Math.abs(scene.fog.density-.014*2.6)<1e-9);assert(Math.abs(lights[0].intensity-2.2*.9)<1e-9);assert.equal(w.particleCount,0);assert.equal(w.snapshot().baseFog,.014);}
// Rain: particles exist, move down with dt, do not move with dt=0, recycle above the camera, follow it in xz.
{const {scene,lights,camera}=freshScene();camera.position.set(30,1.7,-20);const w=createWeatherWorld(scene,{lights,weather:resolveWeather('reactor','?weather=rain'),camera,count:200});
 assert.equal(w.particleCount,200);const points=scene.children.find(o=>o.userData.weather);const arr=points.geometry.attributes.position.array;
 const before=Array.from(arr);w.update(0);assert.deepEqual(Array.from(arr),before,'paused: no motion');
 w.update(.1);let moved=0;for(let i=0;i<200;i++)if(arr[i*3+1]!==before[i*3+1])moved++;assert.equal(moved,200);
 for(let k=0;k<200;k++)w.update(.1);for(let i=0;i<200;i++){assert(Math.abs(arr[i*3]-30)<=18.01&&Math.abs(arr[i*3+2]+20)<=18.01,'follows camera');assert(arr[i*3+1]>=camera.position.y-3-1.5,'recycled above floor');}
 w.setQuality(false);assert.equal(points.visible,true,'rain stays visible on low quality');}
// Dust at half intensity: fewer particles, hidden on low quality; particle sheet is not a raycast/collision object.
{const {scene,lights,camera}=freshScene();const w=createWeatherWorld(scene,{lights,weather:resolveWeather('reactor','?weather=dust&weather-intensity=.5'),camera,count:200});
 assert.equal(w.particleCount,100);const points=scene.children.find(o=>o.userData.weather);w.setQuality(false);assert.equal(points.visible,false);w.setQuality(true);assert.equal(points.visible,true);
 const ray=new T.Raycaster(new T.Vector3(0,1,0),new T.Vector3(1,0,0),0,100);ray.params.Points.threshold=50;assert.equal(ray.intersectObjects([points],false).length,0,'particle sheet opts out of raycasting');}
// World-owned chapters keep visual ownership: harbor default rain applies no fog/light change here.
{const {scene,lights,camera}=freshScene();const w=createWeatherWorld(scene,{lights,weather:resolveWeather('harbor',''),camera});
 assert.equal(w.owned,true);assert.equal(scene.fog.density,.014);assert.equal(lights[0].intensity,2.2);assert.equal(w.particleCount,0);assert.equal(w.params.rangeScale,.9,'gameplay modifier still exposed');}
// Weather never changes collision or movement: an enemy under fog moves exactly as under clear weather, only its fire-start range shrinks.
{function run(weather){const scene=new T.Scene(),enemies=[],obstacles=[];const g=createEnemyModel('ranged');g.position.set(0,0,30);scene.add(g);const p=ENEMY_TYPES.ranged;
  const enemy={group:g,type:'ranged',hp:p.hp,maxHp:p.hp,boss:false,speed:p.speed,radius:p.radius,attack:0,charge:0,seed:0};enemies.push(enemy);const player={position:new T.Vector3(0,1.7,0)};const queued=[];
  const director=createEnemyDirector({enemies,player,navigation:{direction:(a,b)=>({x:b.x-a.x,z:b.z-a.z})},move:(pos,dx,dz)=>{pos.x+=dx;pos.z+=dz;},obstacles,projectiles:{hasPending:()=>false,positions:()=>[],queue:(...a)=>queued.push(a),fire(){},cancelOwner(){}},onBossEvent(){},environment:{weather}});
  const track=[];let gate=0;for(let i=0;i<60;i++){gate=director.update(1/30,i/30,gate);track.push(g.position.z);}return {track,fired:queued.length,charge:enemy.charge};}
 const clear=run(weatherModifiers({id:'clear',intensity:0})),fog=run(weatherModifiers({id:'fog',intensity:1}));
 assert.deepEqual(fog.track,clear.track,'movement identical under fog');}
// Kill ghosts: snapshot before disposal, flash then dissolve, cleaned up after .4 s, no raycast hits, cap respected.
{const scene=new T.Scene();let on=true;const fx=createKillFxWorld(scene,{enabled:()=>on,maxGhosts:3});
 const g=createEnemyModel('assault');g.position.set(4,0,-3);scene.add(g);const meshCount=g.children.filter(o=>o.isMesh).length;
 const ghost=fx.spawn(g,'normal');assert(ghost&&ghost.userData.killGhost);assert.equal(fx.count,1);assert(ghost.children.length>0&&ghost.children.length<=Math.max(meshCount,24));
 scene.remove(g);assert(scene.children.includes(ghost),'ghost survives the real group being disposed');assert(Math.abs(ghost.position.x-4)<1.5&&Math.abs(ghost.position.z+3)<1.5,'ghost sits at the kill site');
 const ray=new T.Raycaster(new T.Vector3(-10,1,-3),new T.Vector3(1,0,0),0,50);assert.equal(ray.intersectObjects([ghost],true).length,0,'ghosts are not raycast targets');
 const material=ghost.children[0].material;fx.update(.05);assert.equal(material.opacity,1,'flash phase stays opaque');fx.update(.2);assert(material.opacity<1&&material.opacity>0);assert(ghost.scale.x>1);
 fx.update(.2);assert.equal(fx.count,0);assert.equal(scene.children.includes(ghost),false,'disposed after dissolve');
 for(let i=0;i<5;i++){const m=createEnemyModel('assault');fx.spawn(m,'elite');}assert.equal(fx.count,3,'cap');fx.clear();assert.equal(fx.count,0);assert.equal(scene.children.filter(o=>o.userData.killGhost).length,0);
 on=false;assert.equal(fx.spawn(createEnemyModel('assault')),null,'dissolve toggle off spawns nothing');assert.equal(fx.spawn(null),null);
 assert.equal(KILL_FX.dissolve,.4);}
console.log('presentation world OK');
