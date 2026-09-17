#!/usr/bin/env node
// Auto-discovering test runner. Replaces the hand-maintained `npm test` command chain.
// Layers:
//   check        node --check for every .js/.mjs/.cjs in the project root and desktop/*.cjs
//   rules        test-*.mjs that do not import three (pure rule / data tests)
//   integration  test-*.mjs that import three (real Three.js directors, physics, worlds)
//   browser      test-*-browser.mjs (Playwright; opt-in, never part of the default run)
// Usage: node scripts/run-tests.mjs [--layer check|rules|integration|browser|all] [--filter text] [--jobs n] [--list] [--verbose]
import {readdirSync,readFileSync,existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const option=(name,fallback)=>{const i=args.indexOf(name);return i>=0&&args[i+1]!==undefined?args[i+1]:fallback;};
const flag=name=>args.includes(name);
const layer=option('--layer','default');
const filter=option('--filter','');
const jobs=Math.max(1,Number(option('--jobs',process.env.TEST_JOBS||4))||4);
const verbose=flag('--verbose');
const listOnly=flag('--list');

// Helper modules live next to tests but are not tests themselves (imported by other scripts, print nothing).
const HELPERS=new Set(['test-flight-pilot.mjs']);
const IMPORT_RE=/from\s+['"]\.\/(test-[a-z0-9-]+\.mjs)['"]/g;
const THREE_RE=/from\s+['"](three|\.\/node_modules\/three[^'"]*)['"]|import\(['"]three['"]\)/;

function discover(){
 const files=readdirSync(root).filter(f=>/^test-[a-z0-9-]+\.mjs$/.test(f)).sort();
 const meta=new Map();
 for(const f of files){
  const source=readFileSync(path.join(root,f),'utf8');
  const imports=[...source.matchAll(IMPORT_RE)].map(m=>m[1]);
  meta.set(f,{file:f,browser:/-browser\.mjs$/.test(f),helper:HELPERS.has(f),imports,three:THREE_RE.test(source)});
 }
 // A test imported by another non-browser test is already executed as part of that test.
 const covered=new Set();
 for(const m of meta.values()){if(m.browser)continue;for(const dep of m.imports)if(!HELPERS.has(dep))covered.add(dep);}
 for(const m of meta.values()){m.coveredBy=[...meta.values()].filter(o=>!o.browser&&o.imports.includes(m.file)).map(o=>o.file);}
 return {meta,covered};
}

function classify(){
 const {meta,covered}=discover();
 const rules=[],integration=[],browser=[];
 for(const m of meta.values()){
  if(m.helper)continue;
  if(m.browser){browser.push(m);continue;}
  if(covered.has(m.file))continue;
  (m.three?integration:rules).push(m);
 }
 return {rules,integration,browser,meta};
}

function checkTargets(){
 const rootFiles=readdirSync(root).filter(f=>/\.(js|mjs|cjs)$/.test(f)&&!f.startsWith('.'));
 const desktop=path.join(root,'desktop');
 let desktopFiles=[];
 try{desktopFiles=readdirSync(desktop).filter(f=>/\.cjs$/.test(f)).map(f=>path.join('desktop',f));}catch{}
 const scripts=path.join(root,'scripts');
 let scriptFiles=[];
 try{scriptFiles=readdirSync(scripts).filter(f=>/\.(js|mjs|cjs)$/.test(f)).map(f=>path.join('scripts',f));}catch{}
 // Source sub-modules (ES modules only; no tests live here).
 const moduleFiles=[];
 for(const dir of ['audio','maps']){try{for(const f of readdirSync(path.join(root,dir)))if(/\.js$/.test(f))moduleFiles.push(path.join(dir,f));}catch{}}
 return [...rootFiles,...desktopFiles,...scriptFiles,...moduleFiles].sort();
}

// Browser tests import Playwright via VEHICLE_PLAYWRIGHT_MODULE. If it is not set, look for a
// tooling install outside the project (workspace/.tools/playwright) so the repo keeps zero test dependencies.
function browserEnv(){
 if(process.env.VEHICLE_PLAYWRIGHT_MODULE)return process.env;
 const candidates=[path.join(root,'node_modules','playwright','index.mjs'),path.resolve(root,'..','..','.tools','playwright','node_modules','playwright','index.mjs')];
 const found=candidates.find(c=>existsSync(c));
 if(!found)return process.env;
 return {...process.env,VEHICLE_PLAYWRIGHT_MODULE:pathToFileURL(found).href};
}
function run(cmdArgs,label,env=process.env){
 return new Promise(resolve=>{
  const started=Date.now();
  const child=spawn(process.execPath,cmdArgs,{cwd:root,env,stdio:['ignore','pipe','pipe']});
  let out='',err='';
  child.stdout.on('data',d=>{out+=d;if(verbose)process.stdout.write(d);});
  child.stderr.on('data',d=>{err+=d;if(verbose)process.stderr.write(d);});
  child.on('close',code=>resolve({label,code,ms:Date.now()-started,out,err}));
  child.on('error',e=>resolve({label,code:1,ms:Date.now()-started,out,err:String(e)}));
 });
}

async function pool(items,worker){
 const results=new Array(items.length);let next=0;
 async function lane(){while(next<items.length){const i=next++;results[i]=await worker(items[i],i);}}
 await Promise.all(Array.from({length:Math.min(jobs,items.length)},lane));
 return results;
}

function report(title,results){
 const failed=results.filter(r=>r.code!==0);
 const total=results.reduce((s,r)=>s+r.ms,0);
 for(const r of results){
  if(r.code!==0||verbose){
   console.log(`${r.code===0?'PASS':'FAIL'} ${r.label} (${r.ms} ms)`);
  }
  if(r.code!==0){
   const tail=(r.out+'\n'+r.err).trim().split('\n').slice(-25).join('\n');
   console.log(tail.replace(/^/gm,'    '));
  }
 }
 console.log(`${title}: ${results.length-failed.length}/${results.length} passed, ${(total/1000).toFixed(1)} s cpu, jobs=${jobs}`);
 return failed.length===0;
}

function matches(name){return !filter||name.includes(filter);}

async function main(){
 const {rules,integration,browser}=classify();
 const wanted=layer==='default'?['check','rules','integration']:layer==='all'?['check','rules','integration','browser']:[layer];
 for(const w of wanted)if(!['check','rules','integration','browser'].includes(w)){console.error(`unknown layer: ${w}`);process.exit(2);}
 if(listOnly){
  if(wanted.includes('check'))console.log('check:',checkTargets().filter(matches).length,'files');
  if(wanted.includes('rules'))console.log('rules:',rules.map(m=>m.file).filter(matches).join(' '));
  if(wanted.includes('integration'))console.log('integration:',integration.map(m=>m.file).filter(matches).join(' '));
  if(wanted.includes('browser'))console.log('browser:',browser.map(m=>m.file).filter(matches).join(' '));
  return;
 }
 let ok=true;
 const wall=Date.now();
 if(wanted.includes('check')){
  const targets=checkTargets().filter(matches);
  const results=await pool(targets,t=>run(['--check',t],`check ${t}`));
  ok=report('check',results)&&ok;
 }
 if(wanted.includes('rules')){
  const targets=rules.map(m=>m.file).filter(matches);
  const results=await pool(targets,t=>run([t],t));
  ok=report('rules',results)&&ok;
 }
 if(wanted.includes('integration')){
  const targets=integration.map(m=>m.file).filter(matches);
  const results=await pool(targets,t=>run([t],t));
  ok=report('integration',results)&&ok;
 }
 if(wanted.includes('browser')){
  const targets=browser.map(m=>m.file).filter(matches);
  // Browser tests share one game server and a real Chromium; keep them sequential.
  const env=browserEnv();
  if(!env.VEHICLE_PLAYWRIGHT_MODULE)console.log('browser: VEHICLE_PLAYWRIGHT_MODULE not set and no Playwright install found; tests will fail to import playwright');
  const results=[];for(const t of targets)results.push(await run([t],t,env));
  ok=report('browser',results)&&ok;
 }
 console.log(`total wall time ${((Date.now()-wall)/1000).toFixed(1)} s`);
 process.exit(ok?0:1);
}
main().catch(e=>{console.error(e);process.exit(1);});
