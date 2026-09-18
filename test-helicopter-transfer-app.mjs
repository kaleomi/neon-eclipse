// Headless app wiring only: real simulation/Three objects, fake DOM/canvas/renderer; NOT browser acceptance.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as Three from 'three';
const source=readFileSync(new URL('./helicopter-app.js',import.meta.url),'utf8'),html=readFileSync(new URL('./helicopter.html',import.meta.url),'utf8');
const imports={};
for(const match of source.matchAll(/^import \{([^}]+)\} from '([^']+)';$/gm)){
  const mod=await import(new URL(match[2],import.meta.url));for(const name of match[1].split(',').map(n=>n.trim())){assert(name in mod,name);imports[name]=mod[name];}
}
let checks=0;const test=(name,fn)=>{fn();console.log('PASS '+name);checks++;};
function harness(search){
  let now=0,raf=null,storageReads=0,renders=0;
  class Element{
    constructor(tag='div'){this.tagName=tag.toUpperCase();this.listeners={};this.dataset={};this.style={};this.hidden=false;this.disabled=false;this.textContent='';this.innerHTML='';this.classList={add(){},remove(){},toggle(){}};}
    addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
    emit(k,event={}){for(const fn of this.listeners[k]||[])fn({target:this,preventDefault(){},...event});}
    click(){if(!this.disabled)this.emit('click');}
    focus(){document.activeElement=this;}
    setAttribute(k,v){this[k]=String(v);}
    append(node){this.child=node;}
    closest(selector){return selector==='button'&&this.tagName==='BUTTON'?this:null;}
    getContext(){return new Proxy({}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});}
    querySelectorAll(){return [...nodes.values()].filter(n=>n.tagName==='BUTTON'&&['heli-resume','heli-overlay-reset'].includes(n.id));}
  }
  const nodes=new Map();for(const m of html.matchAll(/<([a-z0-9-]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)){const n=new Element(m[1]);n.id=m[2];n.hidden=/\bhidden\b/.test(m[0]);n.disabled=/\bdisabled\b/.test(m[0]);nodes.set('#'+m[2],n);}
  const lessons=Array.from({length:4},()=>new Element('span'));
  const document=new Element();document.body=new Element('body');document.hidden=false;
  document.querySelector=key=>{if(!nodes.has(key)){assert(key.startsWith('.'),'Missing actual HTML selector '+key);nodes.set(key,new Element());}return nodes.get(key);};
  document.querySelectorAll=key=>key==='[data-lesson]'?lessons:[];document.createElement=tag=>new Element(tag);
  const window=new Element();class Renderer{constructor(){this.domElement=new Element('canvas');}setPixelRatio(){}setSize(){}render(){renders++;}}
  const context={...imports,T:{...Three,WebGLRenderer:Renderer},URLSearchParams,location:{search},document,window,HTMLElement:Element,innerWidth:1280,innerHeight:800,devicePixelRatio:1,performance:{now:()=>now},requestAnimationFrame:fn=>{raf=fn;},console};
  for(const name of ['localStorage','sessionStorage','indexedDB'])Object.defineProperty(context,name,{get(){storageReads++;throw Error('Forbidden storage access: '+name);}});
  // Imported label factory executes in Node's module realm; provide the same fake document there during setup.
  const previousDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
  Object.defineProperty(globalThis,'document',{configurable:true,value:document});
  try{vm.runInNewContext(source.replace(/^import .*;\n/gm,''),context,{filename:'helicopter-app.js',timeout:3000});}
  finally{if(previousDocument)Object.defineProperty(globalThis,'document',previousDocument);else delete globalThis.document;}
  const key=(code,repeat=false)=>window.emit('keydown',{code,repeat,target:document.querySelector('#heli-scene').child});
  const up=code=>window.emit('keyup',{code});
  const tap=code=>{key(code);up(code);};
  const tick=(frames=1,ms=1000/60)=>{for(let i=0;i<frames;i++){now+=ms;assert(raf);const frame=raf;raf=null;frame(now);}};
  return {nodes,window,document,key,up,tap,tick,data:document.body.dataset,get storageReads(){return storageReads;},get renders(){return renders;}};
}
test('H-01 default remains flight-only, with a discoverable H-02 opt-in link',()=>{
  const h=harness('');assert.equal(h.data.heliTask,'flight');assert(h.nodes.get('#heli-transfer-controls').hidden);h.nodes.get('#heli-resume').click();h.tick(60);h.tap('KeyI');h.tap('KeyF');h.tick();assert.equal(h.data.heliPowered,'true');assert.equal(h.data.heliSeat,'pilot');assert.equal(h.storageReads,0);
});
test('H-02 ignition repeat, input release on exit, foot/aircraft separation and explicit boarding ignition',()=>{
  const h=harness('?task=handover');assert.equal(h.data.heliTask,'handover');assert(!h.nodes.get('#heli-transfer-controls').hidden);
  h.nodes.get('#heli-resume').click();h.tick(180);h.key('KeyI');h.key('KeyI',true);h.up('KeyI');assert.equal(h.data.heliPowered,'false');h.tick(180);
  h.key('KeyW');h.tap('KeyF');const x=h.data.heliWalkerX,z=h.data.heliWalkerZ;h.tick(15);assert.equal(h.data.heliSeat,'foot');assert.equal(h.data.heliWalkerX,x);assert.equal(h.data.heliWalkerZ,z);
  h.key('KeyW');h.key('ShiftLeft');h.tick(12);h.up('KeyW');h.up('ShiftLeft');assert.notEqual(h.data.heliWalkerZ,z);assert.equal(Number(h.data.heliY),0);h.tap('KeyI');assert.equal(h.data.heliPowered,'false');
  h.tap('KeyF');assert.equal(h.data.heliSeat,'pilot');assert.equal(h.data.heliPowered,'false');h.tick(30);assert.equal(Number(h.data.heliY),0);h.tap('KeyI');assert.equal(h.data.heliPowered,'true');assert.equal(h.storageReads,0);
});
test('pause/blur freeze walking and task time; resume preserves off engine and clears held keys',()=>{
  const h=harness('?task=handover');h.nodes.get('#heli-resume').click();h.tap('KeyI');h.tick(180);h.tap('KeyF');h.key('KeyW');h.tick(10);h.tap('Escape');
  const before=[h.data.heliWalkerX,h.data.heliWalkerZ,h.data.heliElapsed,h.data.heliStage,h.data.heliHold];h.tick(30,1000);assert.deepEqual([h.data.heliWalkerX,h.data.heliWalkerZ,h.data.heliElapsed,h.data.heliStage,h.data.heliHold],before);
  h.tap('Escape');h.tick(30);assert.equal(h.data.heliPowered,'false');assert.equal(h.data.heliWalkerZ,before[1]);h.window.emit('blur');assert.equal(h.data.heliMode,'paused');assert.equal(h.storageReads,0);
});
test('airborne engine/exit rejection, visibility pause and reset restore an independent attempt',()=>{
  const h=harness('?task=handover');h.nodes.get('#heli-resume').click();h.tick(180);h.key('ShiftLeft');h.tick(120);h.up('ShiftLeft');assert(Number(h.data.heliY)>1);
  h.tap('KeyF');h.tap('KeyI');assert.equal(h.data.heliSeat,'pilot');assert.equal(h.data.heliPowered,'true');
  h.document.hidden=true;h.document.emit('visibilitychange');assert.equal(h.data.heliMode,'paused');const y=h.data.heliY;h.tick(30,1000);assert.equal(h.data.heliY,y);
  h.document.hidden=false;h.nodes.get('#heli-resume').click();h.tap('KeyR');assert.equal(h.data.heliMode,'paused');h.nodes.get('#heli-overlay-reset').click();assert.equal(h.data.heliMode,'ready');assert.equal(h.data.heliSeat,'pilot');assert.equal(h.data.heliTrial,'ready');assert.equal(Number(h.data.heliStage),0);assert.equal(Number(h.data.heliY),0);assert.equal(h.data.heliPowered,'false');assert.equal(h.storageReads,0);
});
test('H-02 full task through app keyboard handlers and published telemetry only',()=>{
  const h=harness('?task=handover');h.nodes.get('#heli-resume').click();
  let descending=false,lastStage=0,frames=0;
  const controlKeys=['KeyW','KeyA','KeyS','KeyD','ShiftLeft','KeyC','Space'];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  for(;frames<60*200&&h.data.heliTrial==='running';frames++){
    for(const k of controlKeys)h.up(k);
    const d=h.data,stage=Number(d.heliStage),x=Number(d.heliX),z=Number(d.heliZ),y=Number(d.heliY),vx=Number(d.heliVx),vz=Number(d.heliVz);
    if(stage!==lastStage){descending=false;lastStage=stage;}
    const keys=[];
    if(stage===0||stage===3){
      if(d.heliPowered==='false')h.tap('KeyI');
      const goal=stage===0?{x:28,z:-32}:{x:-22,z:32},dx=goal.x-x,dz=goal.z-z;
      if(Math.hypot(dx,dz)<2&&Math.hypot(vx,vz)<.6&&y>6)descending=true;
      if(descending){if(d.heliGrounded!=='true')keys.push(Math.hypot(vx,vz)>.35||Math.abs(Number(d.heliPitch))+Math.abs(Number(d.heliRoll))>.045?'Space':'KeyC');}
      else{
        if(y<9.6)keys.push('ShiftLeft');if(y>12.3)keys.push('KeyC');
        if(y>6){const f=clamp(-dz*.6,-4.5,4.5)+vz,r=clamp(dx*.6,-4.5,4.5)-vx;
          if(f>.7)keys.push('KeyW');if(f<-.7)keys.push('KeyS');if(r>.7)keys.push('KeyD');if(r<-.7)keys.push('KeyA');}
      }
    }else if(stage===1&&d.heliSeat==='pilot'){
      if(d.heliPowered==='true')h.tap('KeyI');else if(Number(d.heliRpm)<=.08)h.tap('KeyF');
    }else if(d.heliSeat==='foot'){
      const goal=stage===1?{x:43,z:-26}:{x:x+3.3,z},dx=goal.x-Number(d.heliWalkerX),dz=goal.z-Number(d.heliWalkerZ);
      if(Math.hypot(dx,dz)<(stage===1?1.5:1))h.tap('KeyF');
      else{if(dx>.15)keys.push('KeyD');if(dx<-.15)keys.push('KeyA');if(dz>.15)keys.push('KeyS');if(dz<-.15)keys.push('KeyW');}
    }
    for(const key of keys)h.key(key);h.tick();assert.notEqual(d.heliMode,'crashed',JSON.stringify(d));
  }
  assert.equal(h.data.heliTrial,'complete',JSON.stringify(h.data));assert.equal(Number(h.data.heliLandings),2);assert.equal(Number(h.data.heliStage),4);assert.equal(h.storageReads,0);
  h.tick(3); // Simulation publishes at 60 Hz; HUD rendering is intentionally capped at 30 Hz.
  assert.match(h.nodes.get('#heli-lesson-title').textContent,/换乘训练完成/);
  console.log('  App keyboard rehearsal: '+(frames/60).toFixed(2)+' simulated seconds; fake renderer/DOM, not browser acceptance.');
});
console.log(`H-02 headless app wiring: ${checks}/${checks} groups; no real browser, layout, WebGL, hardware or listening test.`);
