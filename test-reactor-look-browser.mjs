// Isolated real arena + production presentation controls. Not a full combat FPS benchmark.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {startVehicleTestServer} from './scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const label=process.env.REACTOR_CAPTURE||'after',output='.tools/qa-reactor-look';
const server=await startVehicleTestServer();let browser;
const html=`<!doctype html><style>body{margin:0;background:#071217}canvas{display:block}.mission-card{display:none}</style><div class="mission-card"><button id="quality">Quality</button></div><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script><script type="module">
import * as T from '/node_modules/three/build/three.module.js';
import {buildReactorArena} from '/reactor-arena.js';
import {createPresentation} from '/presentation.js';
let seed=7341;Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
localStorage.setItem('neon-eclipse.presentation.v1',JSON.stringify({quality:0,motion:false,strength:1,scale:1,density:'standard'}));
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(480,270);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x071217);scene.fog=new T.FogExp2(0x071217,.014);
const camera=new T.PerspectiveCamera(74,16/9,.08,160);scene.add(camera);
const hemi=new T.HemisphereLight(0x94e9f6,0x17232b,2.2),sun=new T.DirectionalLight(0x9bcbd5,2.6);scene.add(hemi,sun);
const obstacles=[],playerCeilings=[],assetErrors=[];let loaded;
const ready=new Promise(r=>loaded=r);T.DefaultLoadingManager.onLoad=loaded;T.DefaultLoadingManager.onError=url=>assetErrors.push(url);
const arena=buildReactorArena({scene,renderer,obstacles,playerCeilings});
const presentation=createPresentation({scene,renderer,sun,camera,art:arena.art,qualityButton:document.querySelector('#quality'),record:{records:[]}});
await ready;
const views={entry:[[0,1.7,25],[0,3,-16]],core:[[9,4,-5],[0,4,-16]],floor:[[10,2,8],[0,.3,-8]]};
function view(name){camera.position.set(...views[name][0]);camera.lookAt(...views[name][1]);scene.updateMatrixWorld(true);}
function render(){renderer.render(scene,camera);renderer.getContext().finish();}
function stats(){let lights=0;scene.traverse(o=>lights+=o.isLight?1:0);return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,programs:renderer.info.programs.length,lights};}
window.rig={assetErrors,stats,view,render,quality:q=>{while(Number(document.body.dataset.renderQuality)!==q)presentation.toggleQuality();},capture:()=>{renderer.setSize(960,540);render();},measure:()=>{renderer.setSize(480,270);for(let i=0;i<3;i++)render();const times=[];for(let i=0;i<9;i++){const t=performance.now();render();times.push(performance.now()-t);}times.sort((a,b)=>a-b);return {...stats(),medianMs:times[4],p90Ms:times[8],width:renderer.domElement.width,height:renderer.domElement.height};},collision:obstacles.map(({x,z,w,h,d,cover})=>({x,z,w,h,d,cover:!!cover})),ceilings:playerCeilings,disposeEnvironment:arena.disposeEnvironment};
</script>`;
try{
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1}),errors=[];p.setDefaultTimeout(120000);p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/__reactor-look.html',r=>r.fulfill({contentType:'text/html',body:html}));await p.goto(server.base+'/__reactor-look.html');await p.waitForFunction(()=>window.rig);
 assert.deepEqual(await p.evaluate(()=>rig.assetErrors),[]);await mkdir(output,{recursive:true});const results=[];
 for(const quality of [0,1,2])for(const view of ['entry','core']){
  await p.evaluate(({quality,view})=>{rig.quality(quality);rig.view(view);},{quality,view});const m=await p.evaluate(()=>rig.measure());results.push({quality,view,...m});
  if(quality===1){await p.evaluate(()=>rig.capture());await p.screenshot({path:output+'/'+label+'-'+view+'.png'});}
  console.log('PASS capture '+label+' '+quality+' '+view+' '+JSON.stringify(m));
 }
 const boundary=await p.evaluate(()=>({collision:rig.collision,ceilings:rig.ceilings}));
 const report={label,scope:'480x270 isolated arena; SwiftShader; GPU finish; 3 warmup/9 samples. Timing diagnostic, not hardware FPS.',results,...boundary};
 await writeFile(output+'/'+label+'.json',JSON.stringify(report,null,2)+'\n');
 if(label==='after'){
  const before=JSON.parse(await readFile(output+'/before.json','utf8'));assert.deepEqual(report.collision,before.collision);assert.deepEqual(report.ceilings,before.ceilings);
  for(let i=0;i<results.length;i++){const a=results[i],b=before.results[i];for(const k of ['calls','triangles','textures','lights'])assert(a[k]<=b[k],k+' budget regression');}
  await p.evaluate(()=>{rig.disposeEnvironment?.();rig.disposeEnvironment?.();});console.log('PASS collision/ceiling exact match; no added draws/triangles/textures/lights; idempotent environment release');
 }
 assert.deepEqual(errors,[]);
}finally{await browser?.close();await server.stop();}
