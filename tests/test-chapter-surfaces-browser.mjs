// Fixed-camera real world builders + production presentation controls. No real saves or natural-play/FPS claims.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {startVehicleTestServer} from '../scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const label=process.env.SURFACE_CAPTURE||'after',dir=process.env.SURFACE_OUTPUT||'.tools/qa-chapter-surfaces-2026-09-22-v2';
assert(['before','after'].includes(label));
const views={
 reactor:{entry:[[0,1.7,25],[-8,2,-16]],detail:[[-30,1.7,4],[-39,2.5,-7]]},
 station:{entry:[[-24,1.7,12],[-28,2,-10]],detail:[[0,1.7,5],[-7,1.5,-6]]},
 roof:{entry:[[0,1.7,18],[-18,2,-4]],detail:[[-9,1.7,18],[-21,1.4,22]]},
 tower:{entry:[[-25,1.7,12],[-19,2.5,-6]],detail:[[3,7.7,-6],[10,6.2,2]]},
 train:{entry:[[0,3.2,30],[4,2.8,17]],detail:[[0,6.2,16],[4,4.6,-6]]},
 harbor:{entry:[[0,1.7,28],[-16,2.2,4]],detail:[[-31,1.7,4],[-37.6,2.4,-7]]},
 orbital:{entry:[[0,1.7,31],[-12,3,-5]],detail:[[31,1.7,17],[37.5,2.4,4]]},
 datacenter:{entry:[[0,1.7,29],[-20,2.2,10]],detail:[[-28,1.7,24],[-37.6,2.3,10]]},
 polar:{entry:[[-23,1.7,29],[-27,2,18]],detail:[[-28,1.7,22],[-30.3,1.5,19.6]]}
};
const maps=(process.env.SURFACE_MAPS||Object.keys(views).join(',')).split(',');assert(maps.every(m=>views[m]));
const html=`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#071217}canvas{display:block;width:960px;height:540px}body>div,body>button,body>nav{display:none!important}</style></head><body><div class="mission-card"><button id="quality">Quality</button></div><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script><script type="module">
import * as T from '/node_modules/three/build/three.module.js';
import {createMapArt} from '/src/map-world.js';
import {createPresentation} from '/src/presentation.js';
// Keep decorative RNG independent of Three resource UUID allocations, so adding texture objects does not recolour random server LEDs in the comparison.
let seed=7341,uuidSeed=901;Math.random=()=>{if(new Error().stack.includes('generateUUID'))return ((uuidSeed=(1664525*uuidSeed+1013904223)>>>0)/4294967296);return ((seed=(1664525*seed+1013904223)>>>0)/4294967296);};
localStorage.setItem('neon-eclipse.presentation.v1',JSON.stringify({quality:0,motion:false,strength:1,scale:1,density:'standard'}));
const map=new URLSearchParams(location.search).get('map'),poses=${JSON.stringify(views)}[map];
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(480,270);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x071217);scene.fog=new T.FogExp2(0x071217,.014);
const camera=new T.PerspectiveCamera(74,16/9,.08,180),sun=new T.DirectionalLight(0x9bcbd5,2.6);scene.add(camera,sun,new T.HemisphereLight(0x94e9f6,0x17232b,2.2));
let loading=false,loaded;const assetsReady=new Promise(r=>loaded=r),assetErrors=[];T.DefaultLoadingManager.onStart=()=>{loading=true;};T.DefaultLoadingManager.onLoad=loaded;T.DefaultLoadingManager.onError=url=>assetErrors.push(url);
const obstacles=[],playerCeilings=[],world=createMapArt({scene,renderer,obstacles,playerCeilings}),art=world.art;
if(loading)await assetsReady;
const presentation=createPresentation({scene,renderer,sun,camera,art,qualityButton:document.querySelector('#quality'),record:{records:[]}});
const physical=o=>{const out={};for(const [key,value]of Object.entries(o))if(key!=='mesh'&&(value===null||['number','string','boolean'].includes(typeof value)))out[key]=value;return out;};
const boundary=[];for(let stage=0;stage<5;stage++){art.setStage?.(stage);boundary.push({stage,obstacles:obstacles.map(physical),ceilings:(art.ceilings||playerCeilings).map(physical)});}art.setStage?.(3);art.update?.(0,0);scene.updateMatrixWorld(true);
const geometry=[],signals=[];scene.traverse(o=>{if(o.isMesh){const signature={type:o.geometry.type,parameters:o.geometry.parameters,position:o.position.toArray(),rotation:o.rotation.toArray(),scale:o.scale.toArray(),instances:o.isInstancedMesh?o.count:0};geometry.push(signature);for(const material of Array.isArray(o.material)?o.material:[o.material])if(material?.isMeshBasicMaterial)signals.push({geometry:signature,color:material.color.getHex(),opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite});}});
function render(){renderer.render(scene,camera);renderer.getContext().finish();}
function stats(){const materials=new Set();let lights=0,instances=0;scene.traverse(o=>{if(o.isLight)lights++;if(o.isMesh)for(const material of Array.isArray(o.material)?o.material:[o.material])materials.add(material);if(o.isInstancedMesh&&o.material?.userData.chapterSurface)instances++;});const surfaces=[...materials].filter(m=>m.userData.chapterSurface).map(m=>({type:m.type,...m.userData.chapterSurface,hasColor:!!m.map,hasBump:!!m.bumpMap,hasRoughness:!!m.roughnessMap,hasMetalness:!!m.metalnessMap,anisotropy:m.map?.anisotropy}));return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,programs:renderer.info.programs.length,lights,instances,surfaces,runnable:renderer.info.programs.every(p=>p.diagnostics?.runnable!==false)};}
window.rig={assetErrors,boundary,geometry,signals,stats,render,
 quality:q=>{while(Number(document.body.dataset.renderQuality)!==q)presentation.toggleQuality();},
 view:name=>{camera.position.set(...poses[name][0]);camera.lookAt(...poses[name][1]);scene.updateMatrixWorld(true);const inside=obstacles.filter(o=>Math.abs(camera.position.x-o.x)<o.w/2-.03&&Math.abs(camera.position.z-o.z)<o.d/2-.03&&camera.position.y>(o.bottom??0)+.03&&camera.position.y<(o.top??o.h)-.03);if(inside.length)throw Error('Camera inside solid '+map+' '+name+' '+JSON.stringify(inside.map(physical)));},
 measure:()=>{renderer.setSize(480,270);render();render();return stats();},
 capture:()=>{renderer.setSize(960,540);render();},
 cycle:()=>{for(const q of [0,2,0,2]){rig.quality(q);render();}const warmed=stats();for(const q of [0,2,0,2]){rig.quality(q);render();}return {warmed,cycled:stats()};}
};
</script></body></html>`;
const immutable=['station-data.js','roof-data.js','tower-data.js','train-data.js','harbor-data.js','orbital-data.js','datacenter-data.js','polar-data.js','player-motion.js'];
const moduleHashes=Object.fromEntries(await Promise.all(immutable.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
const server=await startVehicleTestServer();let browser;
try{
 await mkdir(dir,{recursive:true});browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const previous=label==='after'?JSON.parse(await readFile(dir+'/before.json','utf8')):null,report={label,scope:'Real world constructors + production presentation; fixed camera, stage 3, seeded visuals, isolated storage; 480x270 counters/960x540 captures; software WebGL, not FPS.',moduleHashes,maps:[]};
 if(previous)assert.deepEqual(moduleHashes,previous.moduleHashes,'shared layout/motion modules must be unchanged');
 for(const map of maps){
  const context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1}),p=await context.newPage(),errors=[];p.setDefaultTimeout(90000);
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  try{
   await p.route('**/__chapter-surfaces.html?*',r=>r.fulfill({contentType:'text/html',body:html}));await p.goto(server.base+'/__chapter-surfaces.html?map='+map);await p.waitForFunction(()=>window.rig);assert.deepEqual(await p.evaluate(()=>rig.assetErrors),[]);assert.deepEqual(errors,[]);
   const rows=[];for(const q of [0,1,2])for(const view of Object.keys(views[map])){
    await p.evaluate(({q,view})=>{rig.quality(q);rig.view(view);},{q,view});const counters=await p.evaluate(()=>rig.measure());assert(counters.runnable,'shader compilation '+map);rows.push({q,view,...counters});
    if(q===1){await p.evaluate(()=>rig.capture());await p.screenshot({path:dir+'/'+label+'-'+map+'-'+view+'.png'});}console.log('CAPTURE '+label+' '+map+' q='+q+' '+view+' '+JSON.stringify({calls:counters.calls,triangles:counters.triangles,textures:counters.textures,surfaces:counters.surfaces.length}));
   }
   const data=JSON.parse(JSON.stringify(await p.evaluate(()=>({boundary:rig.boundary,geometry:rig.geometry,signals:rig.signals})))),cycles=await p.evaluate(()=>rig.cycle());for(const key of ['textures','geometries','programs'])assert.equal(cycles.warmed[key],cycles.cycled[key],map+' quality cycle '+key+' growth');
   const result={map,rows,...data,cycles};report.maps.push(result);
   if(previous){const before=previous.maps.find(m=>m.map===map);assert(before,'missing baseline '+map);assert.deepEqual(data.boundary,before.boundary,map+' all five stage collision/ceiling snapshots');assert.deepEqual(data.geometry,before.geometry,map+' visual/collision geometry and transforms');assert.deepEqual(data.signals,before.signals,map+' basic cue colours and footprints');
    for(let i=0;i<rows.length;i++){const a=rows[i],b=before.rows[i];for(const key of ['calls','triangles','lights','geometries'])assert.equal(a[key],b[key],map+' unchanged '+key);assert(a.textures<=b.textures+(map==='reactor'?0:8),map+' bounded texture budget');if(map!=='reactor'){assert(a.surfaces.filter(s=>s.type==='MeshStandardMaterial').length>=2,map+' floor/wall surface coverage');assert(a.surfaces.every(s=>s.hasColor),'colour detail retained at all qualities');assert(a.surfaces.filter(s=>s.type==='MeshStandardMaterial').every(s=>qDetail(s,a.q)),map+' quality detail policy');}}
   }
   assert.deepEqual(errors,[]);console.log('PASS '+label+' '+map+' real constructors, three qualities, two views, stable quality cache'+(previous?', identical collisions/geometry/cue colours':''));
   await writeFile(dir+'/'+label+'.json',JSON.stringify(report,null,2)+'\n');
  }finally{await context.close();}
 }
 console.log('PASS '+label+' chapters='+report.maps.length+'; no hardware FPS, combat completion or human readability claim');
}finally{await browser?.close();await server.stop();}
function qDetail(surface,q){return q===0?!surface.hasBump&&!surface.hasRoughness&&!surface.hasMetalness:surface.hasBump&&surface.hasRoughness&&surface.hasMetalness;}
