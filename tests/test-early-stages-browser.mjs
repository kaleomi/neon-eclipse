// Chapters 01-04, native deployment -> stages 0-2; station/tower additionally complete their pre-boss defenses.
// Isolated storage, no placement/reset/guard deletion/health-ammo injection/progress presets. Scripted aim and controlled ticks remain fixtures.
// OVERSEER's post-boss 20s defense is covered separately by test-early-tails-browser.mjs; these segments are not one natural full run.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const maps=(process.env.EARLY_MAPS||'reactor,station,roof,tower').split(',');
assert(maps.every(m=>['reactor','station','roof','tower'].includes(m)),'unknown EARLY_MAPS');
let child,browser;
try{
 const port=await new Promise((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 child=spawn(process.execPath,['server.cjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),15000);child.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(timer);resolve();}});child.on('error',reject);child.on('exit',code=>{clearTimeout(timer);reject(Error('server exit '+code));});});
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const map of maps){
  const context=await browser.newContext({viewport:{width:1100,height:760}}),errors=[];
  await context.addInitScript(()=>localStorage.setItem('neon-eclipse.presentation.v1',JSON.stringify({quality:0})));
  const p=await context.newPage();p.setDefaultTimeout(90000);p.on('pageerror',e=>{errors.push(e.message);console.error('PAGEERROR',e.stack);});
  await p.route('**/app.js',async route=>{
   const response=await route.fetch();let source=await response.text();assert(source.includes("if(state==='playing')update(dt);"));source=source.replace("if(state==='playing')update(dt);",'if(false)update(dt);');
   source+=`
window.__early={
 snap(){const o=overseer?.state||overseer?.rules?.state||overseer?.boss?.rules?.state;return {map:MAP_ID,state,stage:mission.state.index,node:mission.state.node,defending:mission.state.defending,progress:mission.state.progress,time:mission.state.time,current:{...mission.current},intro:!!chapterIntro?.active,difficulty:currentDifficulty().id,health,kills,x:camera.position.x,z:camera.position.z,feet:playerMotion.state.y,grounded:playerMotion.state.grounded,count:enemies.length,guards:enemies.map(e=>({type:e.type,hp:e.hp,x:e.group.position.x,z:e.group.position.z,feet:e.group.position.y})),rounds:[...rounds],reserves:[...reserves],shots:[...telemetryShots],saved:campaign.checkpoint,collected:missionWorld.collected,supplies:SUPPLIES.filter(s=>!missionWorld.collected.includes(s.id)).map(s=>({...s})),interaction:interactionStatus(),ov:{blocking:!!overseer?.blocking,phase:o?.phase,hp:o?.hp},challenge:achievementUI.attempt.state};},
 face(a){const [x,z,y=camera.position.y]=a,dx=x-camera.position.x,dz=z-camera.position.z,dy=y-camera.position.y,L=Math.hypot(dx,dz)||1e-6;yaw=Math.atan2(-dx,-dz);pitch=Math.max(-1.5,Math.min(1.5,Math.atan2(dy,L)));camera.rotation.set(pitch,yaw,0,camera.rotation.order);camera.updateMatrixWorld(true);const direction=camera.getWorldDirection(new THREE.Vector3());if(direction.dot(new THREE.Vector3(dx,dy,dz).normalize())<.98)throw Error('analytic aim convention mismatch');},
 tick(seconds){for(let left=seconds;left>1e-8&&state==='playing';){const dt=Math.min(.02,left);left-=dt;chrome.update(dt);update(dt);campaignUI.update(dt,true,runMode);}scene.updateMatrixWorld(true);return this.snap();},
 walkTo(a){const [x,z,limit=1800]=a;let best=Infinity,stuck=0;for(let i=0;i<limit&&state==='playing';i++){const d=Math.hypot(camera.position.x-x,camera.position.z-z);if(d<.12)return this.snap();if(d<best-.002){best=d;stuck=0;}else if(++stuck>60)break;this.face([x,z]);this.tick(Math.min(.02,d/9));}return {...this.snap(),blocked:true,best};},
 missionAim(){const a=missionWorld.target(mission.current);this.face([a.x,a.z,a.y]);return interactionStatus();},
 free(x,z,y=playerMotion.state.y){if(!playerMotion.canOccupy(x,z,y))return false;return y<.05||obstacles.concat(art.ceilings||playerCeilings).some(o=>Math.abs(y-(o.top??o.h))<.04&&Math.abs(x-o.x)<o.w/2+.4-1e-5&&Math.abs(z-o.z)<o.d/2+.4-1e-5);},
 line(a,b,y=playerMotion.state.y){const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.2));for(let i=0;i<=n;i++)if(!this.free(a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n,y))return false;return true;},
 guardData(){scene.updateMatrixWorld(true);return enemies.filter(e=>e.hp>0).map(e=>{const meshes=e.group.children.filter(m=>m.userData.hitZone),head=meshes.find(m=>m.userData.hitZone==='head')||meshes[0]||e.group.children[0];return {e,mesh:head,point:head.getWorldPosition(new THREE.Vector3())};}).sort((a,b)=>a.point.distanceTo(camera.position)-b.point.distanceTo(camera.position));},
 visible(g,origin=camera.position){const delta=g.point.clone().sub(origin),ray=new THREE.Raycaster(origin.clone(),delta.normalize(),0,60),hit=ray.intersectObjects(obstacles.map(o=>o.mesh).concat(enemies.flatMap(e=>e.group.children),overseer?.targets||[]),false)[0];return !!hit&&hit.object.parent===g.e.group;},
 guardAim(){const list=this.guardData();let found=list.find(g=>this.visible(g)&&g.point.distanceTo(camera.position)<42)||list[0];if(!found)return {ok:false};const a=found.point;this.face([a.x,a.z,a.y]);const safe=sign=>this.line([camera.position.x,camera.position.z],[camera.position.x+sign*Math.cos(yaw)*1.15,camera.position.z-sign*Math.sin(yaw)*1.15]);return {ok:true,visible:this.visible(found),distance:a.distanceTo(camera.position),x:a.x,z:a.z,type:found.e.type,sides:{a:safe(-1),d:safe(1)}};},
 // Read-only same-floor BFS: it only chooses waypoints. Collision and actual displacement still run through keyboard input/update().
 path(options){const from=[camera.position.x,camera.position.z],goal=options.goal,guards=options.guard?this.guardData():[],y=playerMotion.state.y,n=79,min=-39,total=n*n,parent=new Int32Array(total).fill(-1),queue=[],cache=new Int8Array(total),point=k=>[min+k%n,min+Math.floor(k/n)],index=(x,z)=>(z-min)*n+x-min;
  if(goal&&this.line(from,goal))return {points:[goal]};
  const free=k=>{if(!cache[k]){const a=point(k);cache[k]=this.free(a[0],a[1],y)?1:-1;}return cache[k]>0;};
  const near=[];for(let x=Math.round(from[0])-2;x<=Math.round(from[0])+2;x++)for(let z=Math.round(from[1])-2;z<=Math.round(from[1])+2;z++){if(x<min||x>=min+n||z<min||z>=min+n)continue;const k=index(x,z);if(free(k)&&this.line(from,[x,z],y))near.push(k);}
  near.sort((a,b)=>Math.hypot(...point(a).map((v,i)=>v-from[i]))-Math.hypot(...point(b).map((v,i)=>v-from[i])));for(const k of near){parent[k]=-2;queue.push(k);}
  let end=-1;for(let head=0;head<queue.length;head++){const k=queue[head],a=point(k);let done=goal&&Math.hypot(a[0]-goal[0],a[1]-goal[1])<1.6&&this.line(a,goal,y);
   if(options.guard&&head%2===0){const origin=new THREE.Vector3(a[0],y+1.7,a[1]);done=guards.some(g=>g.point.distanceTo(origin)<35&&this.visible(g,origin));}
   if(done){end=k;break;}for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const x=a[0]+dx,z=a[1]+dz;if(x<min||x>=min+n||z<min||z>=min+n)continue;const q=index(x,z);if(parent[q]!==-1||!free(q)||!this.line(a,[x,z],y))continue;parent[q]=k;queue.push(q);}}
  if(end<0)return {blocked:true,reason:'no supported same-floor route',from,goal,y,visited:queue.length};const reverse=[];for(let k=end;k>=0;k=parent[k])reverse.push(point(k));let raw=reverse.reverse();if(goal)raw.push(goal);const points=[];let anchor=from;for(let i=0;i<raw.length;){let j=i;while(j+1<raw.length&&this.line(anchor,raw[j+1],y))j++;points.push(raw[j]);anchor=raw[j];i=j+1;}return {points,visited:queue.length};}
};`;
   await route.fulfill({response,body:source});
  });
  const call=(method,arg)=>p.evaluate(([method,arg])=>window.__early[method](arg),[method,arg]);
  const trail=[];let s,strafe=null,shots=0;
  async function stop(){if(strafe)await p.keyboard.up(strafe);strafe=null;}
  async function step(seconds){s=await call('tick',seconds);assert.equal(s.state,'playing',map+' stopped '+JSON.stringify({trail,s}));assert.deepEqual(errors,[]);return s;}
  async function direct(x,z){await stop();await p.keyboard.down('w');await p.keyboard.down('Shift');try{s=await call('walkTo',[x,z]);}finally{await p.keyboard.up('w');await p.keyboard.up('Shift');}trail.push({to:[x,z],at:[s.x,s.z,s.feet],hp:s.health,stage:s.stage});if(trail.length>16)trail.shift();assert(!s.blocked,map+' blocked '+JSON.stringify({trail,s}));assert.equal(s.state,'playing',map+' died walking '+JSON.stringify({trail,s}));return s;}
  async function follow(route){assert(!route.blocked,map+' route unavailable '+JSON.stringify({route,s}));for(const point of route.points)await direct(...point);return step(.08);}
  async function go(x,z){await stop();await step(.08);return follow(await call('path',{goal:[x,z]}));}
  async function land(feet){for(let i=0;i<100&&!s.grounded;i++)await step(.02);assert(s.grounded&&Math.abs(s.feet-feet)<.05,map+' floor '+feet+' '+JSON.stringify({trail,s}));}
  async function supply(type){await stop();const candidates=s.supplies.filter(t=>t.type===type&&Math.abs((t.feetY||0)-s.feet)<.05).sort((a,b)=>Math.hypot(a.x-s.x,a.z-s.z)-Math.hypot(b.x-s.x,b.z-s.z));for(const t of candidates){const route=await call('path',{goal:[t.x,t.z]});if(route.blocked)continue;await follow(route);assert(s.collected.includes(t.id),'native supply not collected '+t.id);console.log('SUPPLY '+map+' '+t.id+' health='+s.health+' reserve='+s.reserves[0]);return true;}return false;}
  async function steer(g,index){const preferred=Math.floor(index/8)%2?'d':'a',other=preferred==='a'?'d':'a',side=g?.sides?.[preferred]?preferred:g?.sides?.[other]?other:null;if(side!==strafe){await stop();if(side){await p.keyboard.down(side);strafe=side;}}}
  async function fireAtGuard(g){await steer(g,shots++);
   if(s.rounds[0]===0){if(s.reserves[0]===0){assert(await supply('ammo'),map+' no native ammo supply');}await p.keyboard.press('KeyR');
    // Never carry a single short-horizon strafe permission through a 2.6s reload: it can walk onto optional stairs or off an upper floor.
    for(let i=0;i<26;i++){g=await call('guardAim');await steer(g,i);await step(.1);}g=await call('guardAim');await steer(g,shots);
   }
   await p.mouse.click(550,380);return step(.12);
  }
  async function clearGuards(){const before=s.kills,startStage=s.stage;for(let i=0;i<1200&&s.count>0&&s.stage===startStage;i++){
   if(s.health<45){await supply('health');}
   const g=await call('guardAim');if(g.ok&&g.visible&&g.distance<42)await fireAtGuard(g);else{await stop();const route=await call('path',{guard:true});await follow(route);}
  }await stop();if(s.stage===startStage)assert.equal(s.count,0,map+' uncleared encounter '+JSON.stringify({trail,s}));else assert.equal(s.stage,startStage+1,'only actual defense completion can advance during guard combat');console.log('CLEAR '+map+' stage='+startStage+' kills='+(s.kills-before)+' total='+s.kills+' health='+s.health);return s;}
  async function hold(seconds){await p.keyboard.down('e');try{await step(seconds);}finally{await p.keyboard.up('e');}return s;}
  async function interact(){await stop();await step(.2);const interaction=await call('missionAim');const before={stage:s.stage,node:s.node},duration=s.current.duration;assert(interaction.allowed,map+' interaction unavailable '+JSON.stringify({interaction,s}));await hold(duration*.45);assert.equal(s.stage,before.stage);assert.equal(s.node,before.node);assert(s.progress>0&&s.progress<duration,map+' partial hold '+JSON.stringify(s));await step(.1);assert.equal(s.progress,0,map+' release must reset partial hold');await call('missionAim');await hold(duration+.25);assert(s.stage!==before.stage||s.node!==before.node||s.defending,map+' native interaction did not advance '+JSON.stringify(s));console.log('OBJECTIVE '+map+' '+before.stage+'/'+before.node+' -> '+s.stage+'/'+s.node+' defending='+s.defending+' hp='+s.health);return s;}
  async function defense(outside,inside,{wrongFloor=false}={}){assert(s.defending&&s.progress<1,'defense starts at zero, never preset '+JSON.stringify(s));const startTime=s.time,duration=s.current.defenseDuration,stage=s.stage;
   await go(...outside);const paused=s.progress;await step(.6);assert.equal(s.progress,paused,'defense progress must freeze outside radius');await go(...inside);await clearGuards();
   if(wrongFloor){assert(s.stage===stage&&s.progress<duration-1,'need a live defense window for level negative');await go(1,0);await direct(-7,0);await land(3);await go(4,-6);assert(Math.hypot(s.x-s.current.x,s.z-s.current.z)<s.current.defenseRadius);const wrong=s.progress;await step(.6);assert.equal(s.progress,wrong,'same XZ radius, wrong floor must freeze');await go(-7,0);await direct(1,0);await land(6);await go(...inside);}
   if(s.stage===stage)await go(...inside);for(let i=0;i<400&&s.stage===stage&&!s.ov.blocking;i++)await step(.1);
   assert(s.time-startTime>=duration-.5,'full native defense duration elapsed');if(map==='reactor')assert.equal(s.stage,2);else{assert.equal(s.stage,3);assert.equal(s.progress,duration);assert(s.ov.blocking&&s.ov.phase==='shield','boss activates only after real defense and guard clear');assert.equal(s.saved.stageIndex,3);}
   console.log('DEFENSE '+map+' full='+duration+'s radius-negative'+(wrongFloor?' + wrong-floor-negative':'')+' elapsed='+(s.time-startTime).toFixed(2)+' health='+s.health);return s;
  }
  try{
   await p.goto('http://127.0.0.1:'+port+'/index.html?map='+map+'&menu=chapter');await p.waitForFunction(()=>document.body.dataset.menuOpen==='true');assert.deepEqual(errors,[]);await p.click('#deploy');await p.waitForFunction(()=>window.__early&&document.body.dataset.playState==='playing');s=await call('snap');if(s.intro){await p.keyboard.press('Space');await p.waitForFunction(()=>!window.__early.snap().intro);}await step(.05);assert.equal(s.stage,0);assert.equal(s.kills,0);assert.equal(s.health,100);console.log('START '+map+' native deployment difficulty='+s.difficulty+' guards='+s.count);
   for(let stage=0;stage<3;stage++){
    assert.equal(s.stage,stage);if(map==='tower'&&stage===1){await go(-23,0);await direct(-19,0);await direct(-11.2,0);await land(3);}if(map==='tower'&&stage===2){await go(-7.5,0);await direct(1,0);await land(6);}
    if(s.current.count>0)assert(s.count>=s.current.count,map+' natural encounter was not built');await clearGuards();
    const nodes=s.current.points?.length||1;for(let node=0;node<nodes;node++){assert.equal(s.node,node);const offset=map==='tower'&&stage>0?-2.2:2.2;await go(s.current.x,s.current.z+offset);await interact();}
    if(map==='reactor'&&stage===1)await defense([13,6],[26,2.2]);
    assert.equal(s.stage,stage+1);assert.equal(s.saved.stageIndex,stage+1,'automatic checkpoint follows real objective');
   }
   if(map==='station'||map==='tower'){
    assert(s.count>=s.current.count);await clearGuards();const inside=map==='tower'?[7,-4.8]:[22,-19.8];await go(...inside);await interact();await defense(map==='tower'?[1,4]:[22,-10],inside,{wrongFloor:map==='tower'});
   }
   assert.equal(s.stage,3);assert(s.health>0);assert(s.shots[0]>0);assert(s.challenge.eligible&&s.challenge.alive,'no reset/retry/fixture eligibility loss in front segment');assert.deepEqual(errors,[]);
   if(process.env.EARLY_SCREENSHOTS){await mkdir(process.env.EARLY_SCREENSHOTS,{recursive:true});await p.screenshot({path:process.env.EARLY_SCREENSHOTS+'/'+map+'-front-complete.png'});}
   console.log('PASS '+map+': native entry -> all stage-0/1/2 objectives + original guards + interrupted/real E + automatic checkpoints'+(['station','tower'].includes(map)?' -> native 18s pre-boss defense':'')+'; kills='+s.kills+' health='+s.health+' shots='+s.shots[0]+' collected='+JSON.stringify(s.collected));
  }catch(error){console.error('FAIL '+map+' '+JSON.stringify({trail,s,errors}));if(process.env.EARLY_SCREENSHOTS){await mkdir(process.env.EARLY_SCREENSHOTS,{recursive:true});await p.screenshot({path:process.env.EARLY_SCREENSHOTS+'/'+map+'-front-failed.png'}).catch(()=>{});}throw error;}finally{await context.close();}
 }
}finally{await browser?.close();child?.kill();}
