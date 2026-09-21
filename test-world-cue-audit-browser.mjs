// Actual station builder + projectile renderer. Controlled placement/light/fog, not natural combat.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {startVehicleTestServer} from './scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const server=await startVehicleTestServer(),dir=process.env.WORLD_CUE_DIR||'.tools/qa-world-cues';let browser;
const html=`<!doctype html><style>body{margin:0;background:#07121c}body>div{display:none}canvas{display:block}</style><div class="mission-card"><button id="quality"></button></div><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script><script type="module">
import * as T from '/node_modules/three/build/three.module.js';
import {createStationWorld} from '/station-world.js';import {createPresentation} from '/presentation.js';
import {createEnemyProjectiles} from '/projectiles.js';import {ENEMY_TYPES} from '/enemy-rules.js';
import {createEnemyModel} from '/enemy-model.js';import {createAccessibility} from '/accessibility.js';
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(960,540);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(74,16/9,.08,160),sun=new T.DirectionalLight(0x9bcbd5,2.6),hemi=new T.HemisphereLight(0x94e9f6,0x17232b,2.2);scene.add(camera,sun,hemi);
const obstacles=[],art=createStationWorld(scene,renderer,obstacles);art.setStage(0);
const presentation=createPresentation({renderer,scene,camera,sun,art,qualityButton:document.querySelector('#quality'),record:{records:[]}}),a11y=createAccessibility();
camera.position.set(-24,1.7,12);camera.lookAt(-22,1.6,-8);scene.updateMatrixWorld(true);
const types=['assault','ranged','heavy'],models=types.map((type,i)=>{const g=createEnemyModel(type,{rangedSample:false,guardBatch:false,rosterSample:false});g.position.set(-25+i*3,0,-2-i*2);scene.add(g);return g;});
let hits=0;const fx=createEnemyProjectiles(scene,obstacles,()=>hits++,()=>{}),baseFog=scene.fog.density;
const origin=i=>models[i].position.clone().add(new T.Vector3(0,1.5,.65)),target=()=>camera.position.clone().add(new T.Vector3(3,-.4,-1));
function draw(){scene.updateMatrixWorld(true);renderer.render(scene,camera);renderer.getContext().finish();}
function setup(q,mode,condition){while(Number(document.body.dataset.renderQuality)!==q)presentation.toggleQuality();a11y.set({colorMode:mode,shapes:true});scene.fog.density=condition==='fog'?.045:baseFog;renderer.toneMappingExposure=condition==='bright'?2.1:condition==='dark'?.35:1.07;sun.intensity=condition==='dark'?.3:2.45;hemi.intensity=condition==='dark'?.3:2.2;fx.clear();types.forEach((t,i)=>{if(!fx.queue(origin(i),target(),false,models[i],ENEMY_TYPES[t].attack))throw Error('queue');});fx.update(.2,camera.position);draw();return {charging:fx.charging,bolts:fx.count,hits,filter:renderer.domElement.style.filter,fog:scene.fog.density,exposure:renderer.toneMappingExposure,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};}
function lifecycle(){fx.clear();const p=ENEMY_TYPES.ranged.attack,owner=models[1],o=origin(1),t=target();fx.queue(o,t,false,owner,p);const locked=fx.aimTarget(owner);t.x+=100;fx.update(.999,camera.position);const before={charging:fx.charging,count:fx.count,locked:fx.aimTarget(owner).equals(locked)};fx.update(.002,camera.position);const after={charging:fx.charging,count:fx.count};fx.cancelOwner(owner,true);const cancelled=fx.count===0&&fx.charging===0;for(let i=0;i<20;i++){fx.queue(o,target(),false,owner,p);fx.clear();}draw();return {before,after,cancelled,clean:fx.count===0&&fx.charging===0,contextLost:renderer.getContext().isContextLost()};}
window.rig={setup,lifecycle,bolts:()=>{fx.update(1.5,camera.position);draw();return fx.count;},rules:JSON.stringify(ENEMY_TYPES),unchanged:()=>JSON.stringify(ENEMY_TYPES)===rig.rules};
</script>`;
try{
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await browser.newPage({viewport:{width:960,height:540}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/__world-cues.html',r=>r.fulfill({contentType:'text/html',body:html}));await p.goto(server.base+'/__world-cues.html');await p.waitForFunction(()=>window.rig,{},{timeout:90000});await mkdir(dir,{recursive:true});const results=[];
 for(const q of [0,1,2])for(const condition of ['normal','dark','fog','bright'])for(const mode of ['off','deuteranopia','protanopia','tritanopia','high-contrast']){
  const r=await p.evaluate(({q,mode,condition})=>rig.setup(q,mode,condition),{q,mode,condition});assert.equal(r.charging,3);assert.equal(r.bolts,0);assert.equal(r.hits,0);assert(mode==='off'?!r.filter:mode==='high-contrast'?r.filter.includes('contrast'):r.filter.includes('cvd-'+mode));results.push({q,mode,condition,...r});
  if(q===1)await p.screenshot({path:dir+'/'+condition+'-'+mode+'.png'});
 }
 assert.equal(await p.evaluate(()=>rig.bolts()),6);await p.screenshot({path:dir+'/bolts.png'});
 await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>rig.setup(1,'off','normal'));const life=await p.evaluate(()=>rig.lifecycle());assert.deepEqual(life,{before:{charging:1,count:0,locked:true},after:{charging:0,count:1},cancelled:true,clean:true,contextLost:false});assert(await p.evaluate(()=>rig.unchanged()));assert.deepEqual(errors,[]);
 if(process.env.WORLD_CUE_COMPARE){const baseline=JSON.parse(await readFile(process.env.WORLD_CUE_COMPARE+'/audit.json','utf8'));assert.equal(baseline.results.length,results.length);for(let i=0;i<results.length;i++)for(const key of ['q','mode','condition','calls','triangles','charging','bolts','hits','fog','exposure'])assert.equal(results[i][key],baseline.results[i][key],key);assert.deepEqual(life,baseline.lifecycle);console.log('PASS 60 before/after draw and triangle budgets, scene overrides, threat counts and lifecycle equal');}
 await writeFile(dir+'/audit.json',JSON.stringify({scope:'Controlled actual station/projectile rendering; fallback enemy geometry; dark/bright/fog are stress overrides; not natural combat or hardware performance',results,lifecycle:life,errors},null,2)+'\n');console.log('PASS '+results.length+' actual-world render configurations; 3 charged roles; actual color filters; unchanged attack profiles; old-position lock; full charge duration; cancellation/clear; reduced-motion render; no page errors/context loss');
}finally{await browser?.close();await server.stop();}
