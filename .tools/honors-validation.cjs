const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const log='.tools/honors-polish-final.log',fd=fs.openSync(log,'w');
const env={...process.env,VEHICLE_PLAYWRIGHT_MODULE:pathToFileURL(path.resolve('../../.tools/playwright/node_modules/playwright/index.mjs')).href};
const commands=[...['honors-presentation.js','archive-presentation.js','achievement-ui.js','operations-archive.js','test-honors-polish-browser.mjs'].map(p=>['--check',p]),...['test-achievement-gallery.mjs','test-chapter-achievements.mjs','test-honors-polish-browser.mjs','test-archive-browser.mjs','test-ui-clean-browser.mjs'].map(p=>[p])];
for(const args of commands){fs.writeSync(fd,'BEGIN '+args.join(' ')+'\n');const r=spawnSync(process.execPath,args,{env,stdio:['ignore',fd,fd]});console.log(args.join(' ')+' EXIT '+r.status);if(r.status!==0){fs.closeSync(fd);console.log(fs.readFileSync(log,'utf8').slice(-6000));process.exit(r.status||1);}}
fs.closeSync(fd);console.log('HONORS_VALIDATION_PASS');
