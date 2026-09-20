const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
(async()=>{
 const dir='.tools/qa-aim-mode',log=dir+'/final-'+Date.now()+'.log',fd=fs.openSync(log,'w'),env={...process.env,VEHICLE_PLAYWRIGHT_MODULE:pathToFileURL(path.resolve('../../.tools/playwright/node_modules/playwright/index.mjs')).href};
 const files=["aim-input.js", "controls-settings.js", "test-aim-mode.mjs", "combat-ui.js", "menu-ui.js", "app.js", "combat.css", "ui-clean.css", "test-aim-mode-browser.mjs"],hash=b=>crypto.createHash('sha256').update(b).digest('hex'),sha=p=>hash(fs.readFileSync(p)),before=Object.fromEntries(files.map(p=>[p,sha(p)])),results=[];console.log('LOG '+log);
 function run(label,args){fs.writeSync(fd,'BEGIN '+label+'\n');const r=spawnSync(process.execPath,args,{env,stdio:['ignore',fd,fd]});results.push({label,exit:r.status});fs.writeSync(fd,'END '+label+' exit='+r.status+'\n');console.log(label+' exit='+r.status);if(r.status!==0){console.log(fs.readFileSync(log,'utf8').slice(-11000));throw Error('Failed '+label);}}
 for(const file of files.filter(p=>/\.(?:m?js)$/.test(p)))run('syntax '+file,['--check',file]);
 run('full check/rules/integration',['scripts/run-tests.mjs','--jobs','2']);
 for(const file of ['test-aim-mode.mjs','test-aim-mode-browser.mjs','test-combat-controls-browser.mjs','test-parry-browser.mjs','test-ui-clean-browser.mjs','test-ui-clean-layout-browser.mjs','test-loadout-terminals-browser.mjs'])run(file,[file]);
 const after=Object.fromEntries(files.map(p=>[p,sha(p)]));if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Verified sources changed during tests');
 const served=[];for(const p of ['index.html',...files.filter(p=>!p.startsWith('test-'))]){const r=await fetch('http://127.0.0.1:5173/'+p),bytes=Buffer.from(await r.arrayBuffer());if(r.status!==200||hash(bytes)!==sha(p))throw Error('Served bytes mismatch '+p);served.push({path:p,status:r.status,sha256:hash(bytes)});}
 fs.closeSync(fd);fs.writeFileSync(dir+'/verified-final.json',JSON.stringify({time:new Date().toISOString(),log,results,sources:after,served},null,2)+'\n');console.log('PASS stable source hashes and '+served.length+' HTTP 200 byte-matched resources');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
