// Chapter 2–9 cover dressing in the real world builders. Fixed camera, stage 3, seeded decor; software WebGL, not FPS.
// Baseline: the `before.json` captured by test-chapter-surfaces-browser.mjs (SURFACE_CAPTURE=before) in COVER_BASELINE.
// Contract: collision / ceiling snapshots identical for all five stages, BasicMaterial cue colours identical,
// same 'entry' camera as the baseline: extra draw calls == merged cover meshes (x2 with the q=2 shadow pass), bounded triangle growth, no page errors, no texture growth.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {startVehicleTestServer} from '../scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const dir=process.env.COVER_OUTPUT||'.tools/qa-cover-props-2026-09-22',baselinePath=process.env.COVER_BASELINE||dir+'/before.json';
const views={
 station:[[-24,1.7,12],[-28,2,-10]],roof:[[0,1.7,18],[-18,2,-4]],tower:[[-25,1.7,12],[-19,2.5,-6]],train:[[0,3.2,30],[4,2.8,17]],
 harbor:[[0,1.7,28],[-16,2.2,4]],orbital:[[0,1.7,31],[-12,3,-5]],datacenter:[[0,1.7,29],[-20,2.2,10]],polar:[[-23,1.7,29],[-27,2,18]]
};
const maps=(process.env.COVER_MAPS||Object.keys(views).join(',')).split(',');assert(maps.every(m=>views[m]));
const html=`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#071217}canvas{display:block}body>div,body>button,body>nav{display:none!important}</style></head><body><div class="mission-card"><button id="quality">Quality</button></div><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script><script type="module">
import * as T from '/node_modules/three/build/three.module.js';
import {createMapArt} from '/src/map-world.js';
import {createPresentation} from '/src/presentation.js';
let seed=7341,uuidSeed=901;Math.random=()=>{if(new Error().stack.includes('generateUUID'))return ((uuidSeed=(1664525*uuidSeed+1013904223)>>>0)/4294967296);return ((seed=(1664525*seed+1013904223)>>>0)/4294967296);};
localStorage.setItem('neon-eclipse.presentation.v1',JSON.stringify({quality:1,motion:false,strength:1,scale:1,density:'standard'}));
const map=new URLSearchParams(location.search).get('map'),pose=${JSON.stringify(views)}[map];
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(960,540);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x071217);scene.fog=new T.FogExp2(0x071217,.014);
const camera=new T.PerspectiveCamera(74,16/9,.08,180),sun=new T.DirectionalLight(0x9bcbd5,2.6);scene.add(camera,sun,new T.HemisphereLight(0x94e9f6,0x17232b,2.2));
const obstacles=[],playerCeilings=[],world=createMapArt({scene,renderer,obstacles,playerCeilings}),art=world.art;
const presentation=createPresentation({scene,renderer,sun,camera,art,qualityButton:document.querySelector('#quality'),record:{records:[]}});
const physical=o=>{const out={};for(const [key,value]of Object.entries(o))if(key!=='mesh'&&(value===null||['number','string','boolean'].includes(typeof value)))out[key]=value;return out;};
const boundary=[];for(let stage=0;stage<5;stage++){art.setStage?.(stage);boundary.push({stage,obstacles:obstacles.map(physical),ceilings:(art.ceilings||playerCeilings).map(physical)});}art.setStage?.(3);art.update?.(0,0);scene.updateMatrixWorld(true);
const signals=[],covers=[];scene.traverse(o=>{if(!o.isMesh)return;if(o.userData.coverProps){covers.push({theme:o.userData.coverProps,triangles:o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3,bounded:!!o.geometry.boundingSphere});return;}const signature={type:o.geometry.type,parameters:o.geometry.parameters,position:o.position.toArray(),rotation:o.rotation.toArray(),scale:o.scale.toArray(),instances:o.isInstancedMesh?o.count:0};for(const material of Array.isArray(o.material)?o.material:[o.material])if(material?.isMeshBasicMaterial)signals.push({geometry:signature,color:material.color.getHex(),opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite});});
camera.position.set(...pose[0]);camera.lookAt(...pose[1]);scene.updateMatrixWorld(true);
function render(){renderer.render(scene,camera);renderer.getContext().finish();}
function stats(){return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,programs:renderer.info.programs.length,runnable:renderer.info.programs.every(p=>p.diagnostics?.runnable!==false)};}
window.rig={boundary,signals,covers,measure:q=>{while(Number(document.body.dataset.renderQuality)!==q)presentation.toggleQuality();renderer.setSize(480,270);render();render();return stats();},capture:()=>{renderer.setSize(960,540);render();}};
</script></body></html>`;
const server=await startVehicleTestServer();let browser;
try{
 await mkdir(dir,{recursive:true});const baseline=JSON.parse(await readFile(baselinePath,'utf8'));
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const report=[];
 for(const map of maps){
  const context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1}),p=await context.newPage(),errors=[];p.setDefaultTimeout(90000);
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  try{
   await p.route('**/__cover-props.html?*',r=>r.fulfill({contentType:'text/html',body:html}));await p.goto(server.base+'/__cover-props.html?map='+map);await p.waitForFunction(()=>window.rig);
   const data=JSON.parse(JSON.stringify(await p.evaluate(()=>({boundary:rig.boundary,signals:rig.signals,covers:rig.covers})))),before=baseline.maps.find(m=>m.map===map);assert(before,'missing baseline '+map);
   assert.deepEqual(data.boundary,before.boundary,map+' all five stage collision/ceiling snapshots unchanged');
   assert.deepEqual(data.signals,before.signals,map+' basic cue colours, footprints and gates unchanged');
   assert(data.covers.length>=2&&data.covers.length<=14,map+' merged cover meshes '+data.covers.length);assert(data.covers.every(c=>c.bounded));
   const triangles=data.covers.reduce((n,c)=>n+c.triangles,0);assert(triangles<=16000,map+' cover triangles '+triangles);
   const rows=[];for(const q of [0,1,2]){const s=await p.evaluate(q=>rig.measure(q),q);assert(s.runnable,map+' shader compilation');const b=before.rows.find(r=>r.q===q&&r.view==='entry');
    assert(s.textures<=b.textures,map+' q='+q+' no texture growth');const hidesHost=data.covers.some(c=>c.theme==='snowbank');assert((hidesHost?s.calls<=b.calls+data.covers.length*(q===2?2:1)&&s.calls>=b.calls-data.covers.length*4:s.calls>=b.calls&&s.calls<=b.calls+data.covers.length*(q===2?2:1)),map+' q='+q+' draw calls '+b.calls+' -> '+s.calls+' (merged meshes '+data.covers.length+', shadow pass at q=2'+(hidesHost?', hidden flat snowbank boxes':'')+')');assert(s.triangles>=b.triangles&&s.triangles<=b.triangles+16000*(q===2?2:1),map+' q='+q+' triangles '+b.triangles+' -> '+s.triangles);rows.push({q,...s,baselineCalls:b.calls,baselineTriangles:b.triangles});}
   await p.evaluate(()=>rig.capture());await p.screenshot({path:dir+'/cover-'+map+'.png'});
   assert.deepEqual(errors,[]);report.push({map,covers:data.covers,coverTriangles:triangles,rows});
   console.log('PASS '+map+' covers='+data.covers.length+' triangles='+triangles+' calls q1 '+rows[1].baselineCalls+'->'+rows[1].calls+' triangles q1 '+rows[1].baselineTriangles+'->'+rows[1].triangles+'; collisions/ceilings/gates/cues identical; no page errors');
  }finally{await context.close();}
 }
 await writeFile(dir+'/cover-props.json',JSON.stringify({scope:'Real world constructors, stage 3, fixed camera, seeded decor, software WebGL; collision/cue parity against surfaces baseline; not FPS or human readability',baseline:baselinePath,maps:report},null,2)+'\n');
 console.log('PASS cover props browser: '+report.length+' chapters; collision, ceiling, gate and cue parity; bounded merged meshes; no texture growth');
}finally{await browser?.close();await server.stop();}
