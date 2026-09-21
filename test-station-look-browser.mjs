// Actual station world + boss world, controlled camera/stage; not natural combat or hardware FPS.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {startVehicleTestServer} from './scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const label=process.env.STATION_CAPTURE||'after',dir='.tools/qa-station-look',server=await startVehicleTestServer();let browser;
const html=`<!doctype html><style>body{margin:0;background:#07121c}body>div,.switchyard-panel{display:none!important}canvas{display:block}</style><div class="mission-card"><button id="quality"></button></div><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script><script type="module">
import * as T from '/node_modules/three/build/three.module.js';import {createStationWorld} from '/station-world.js';import {createSwitchyardWorld} from '/switchyard-world.js';import {createPresentation} from '/presentation.js';
localStorage.setItem('neon-eclipse.presentation.v1',JSON.stringify({quality:0,motion:false}));
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(480,270);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(74,16/9,.08,160),sun=new T.DirectionalLight(0x9bcbd5,2.6);scene.add(camera,sun,new T.HemisphereLight(0x94e9f6,0x17232b,2.2));
const obstacles=[],art=createStationWorld(scene,renderer,obstacles),boss=createSwitchyardWorld(scene,obstacles);
const presentation=createPresentation({renderer,scene,camera,sun,art,qualityButton:document.querySelector('#quality'),record:{records:[]}});
const views={platform:[[-24,1.7,12],[-20,2,-10]],carriage:[[0,1.7,12],[0,2,-17]],dispatch:[[28,2.5,-19],[23,1.9,-28]]};
const boundary=[];for(let i=0;i<5;i++){art.setStage(i);boundary.push(obstacles.map(({x,z,w,h,d,bottom,top})=>({x,z,w,h,d,bottom,top})));}art.setStage(3);boss.setStage(3);boss.prepareMission({index:3,defending:true,progress:18},true);
function render(){renderer.render(scene,camera);renderer.getContext().finish();}
function stats(){let lights=0;scene.traverse(o=>lights+=o.isLight?1:0);return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,lights};}
window.rig={boundary,ceilings:art.ceilings,phase:()=>boss.state.phase,quality:q=>{while(Number(document.body.dataset.renderQuality)!==q)presentation.toggleQuality();},view:n=>{camera.position.set(...views[n][0]);camera.lookAt(...views[n][1]);scene.updateMatrixWorld(true);},measure:()=>{renderer.setSize(480,270);for(let i=0;i<3;i++)render();const times=[];for(let i=0;i<9;i++){const t=performance.now();render();times.push(performance.now()-t);}times.sort((a,b)=>a-b);return {...stats(),medianMs:times[4],maxMs:times[8]};},capture:()=>{renderer.setSize(960,540);render();}};
</script>`;
try{
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await browser.newPage({viewport:{width:960,height:540}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/__station-look.html',r=>r.fulfill({contentType:'text/html',body:html}));await p.goto(server.base+'/__station-look.html');await p.waitForFunction(()=>window.rig,{},{timeout:90000});assert.equal(await p.evaluate(()=>rig.phase()),'shield');
 await mkdir(dir,{recursive:true});const results=[];
 for(const q of [0,1,2])for(const view of ['platform','carriage','dispatch']){await p.evaluate(({q,view})=>{rig.quality(q);rig.view(view);},{q,view});const m=await p.evaluate(()=>rig.measure());results.push({q,view,...m});if(q===1){await p.evaluate(()=>rig.capture());await p.screenshot({path:dir+'/'+label+'-'+view+'.png'});}console.log('PASS '+label+' '+q+' '+view+' '+JSON.stringify(m));}
 const report={results,...await p.evaluate(()=>({boundary:rig.boundary,ceilings:rig.ceilings}))};await writeFile(dir+'/'+label+'.json',JSON.stringify(report,null,2)+'\n');
 if(label==='after'){const b=JSON.parse(await readFile(dir+'/before.json','utf8'));assert.deepEqual(JSON.parse(JSON.stringify(report.boundary)),b.boundary);assert.deepEqual(report.ceilings,b.ceilings);for(let i=0;i<results.length;i++)for(const key of ['calls','triangles','textures','lights'])assert(results[i][key]<=b.results[i][key],key+' budget grew');console.log('PASS all five stage collision snapshots and ceilings unchanged; no added draws/triangles/textures/lights');}
 assert.deepEqual(errors,[]);
}finally{await browser?.close();await server.stop();}
