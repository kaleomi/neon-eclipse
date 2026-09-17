const {app,BrowserWindow,protocol,session,dialog}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const smoke=process.argv.includes('--smoke-test');
const smokeOutput=process.argv.find(arg=>arg.startsWith('--smoke-output='))?.slice('--smoke-output='.length);
if(smoke)app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'neon-eclipse-smoke-')));
else app.setPath('userData',path.join(app.getPath('appData'),'NEON-ECLIPSE'));
protocol.registerSchemesAsPrivileged([{scheme:'neon',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
const home='neon://game/',root=path.join(__dirname,'web');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const isLocal=url=>{try{const u=new URL(url);return u.protocol==='neon:'&&u.hostname==='game'&&!u.port&&!u.username&&!u.password;}catch{return false;}};
let window;
if(!app.requestSingleInstanceLock())app.quit();
else{
 app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus();}});
 app.whenReady().then(async()=>{
  protocol.handle('neon',async request=>{
   if(!isLocal(request.url)||request.method!=='GET')return new Response('Forbidden',{status:403});
   try{
    const u=new URL(request.url),p=decodeURIComponent(u.pathname),filename=path.resolve(root,'.'+(p==='/'?'/index.html':p));
    if(!filename.startsWith(root+path.sep))return new Response('Forbidden',{status:403});
    const body=await fs.promises.readFile(filename);
    return new Response(body,{headers:{'Content-Type':types[path.extname(filename)]||'application/octet-stream','X-Content-Type-Options':'nosniff'}});
   }catch{return new Response('Not found',{status:404});}
  });
  session.defaultSession.setPermissionRequestHandler((contents,permission,callback)=>callback(contents===window?.webContents&&permission==='pointerLock'&&isLocal(contents.getURL())));
  session.defaultSession.setPermissionCheckHandler((contents,permission,origin)=>contents===window?.webContents&&permission==='pointerLock'&&isLocal(origin));
  // This edition is fully offline: no remote navigation, popups or resource requests.
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','ws://*/*','wss://*/*']},(_details,callback)=>callback({cancel:true}));
  window=new BrowserWindow({width:1440,height:900,minWidth:960,minHeight:640,show:!smoke,title:'NEON ECLIPSE',backgroundColor:'#09181d',autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,backgroundThrottling:false}});
  window.setMenu(null);
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(event,url)=>{if(!isLocal(url))event.preventDefault();});
  window.webContents.on('before-input-event',(event,input)=>{
   if(input.type==='keyDown'&&!input.isAutoRepeat&&(input.key==='F11'||(input.alt&&input.key==='Enter'))){event.preventDefault();window.setFullScreen(!window.isFullScreen());}
  });
  window.on('closed',()=>{window=null;});
  if(smoke){
   const report={version:app.getVersion(),electron:process.versions.electron,checks:[],errors:[]};
   window.webContents.on('console-message',event=>{if(event.level==='error'||event.level===3)report.errors.push(event.message||'Renderer error');});
   try{
    for(const map of ['reactor','station','roof','tower','train','harbor']){
     await window.loadURL(home+'?map='+map);
     const check=await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{const button=document.querySelector('#menu-new'),canvas=document.querySelector('#game canvas');if(button&&canvas){clearInterval(timer);const gl=canvas.getContext('webgl2');localStorage.setItem('desktop-smoke','ok');resolve({menu:!!button,canvas:!!canvas,webgl:!!gl,storage:localStorage.getItem('desktop-smoke')==='ok',width:canvas.width,height:canvas.height});}else if(++n>150){clearInterval(timer);reject(Error('Game initialization timed out'));}},100);})`);
     report.checks.push({map,...check});if(!check.webgl||!check.storage)throw Error('Renderer/storage check failed: '+map);
    }
    await window.loadURL(home+'vehicle.html');
    const vehicle=await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(document.body.dataset.flightMissionStatus==='idle'&&document.querySelector('#vehicle-scene canvas')){clearInterval(timer);resolve({webgl:!!document.querySelector('#vehicle-scene canvas').getContext('webgl2'),storage:localStorage.getItem('desktop-smoke')==='ok'});}else if(++n>150){clearInterval(timer);reject(Error('Vehicle initialization timed out'));}},100);})`);
    const tasks=await window.webContents.executeJavaScript(`(()=>{const click=s=>document.querySelector(s).click(),d=document.body.dataset;click('#start-chase');click('#start-chase');const naval=d.chaseStatus==='active'&&d.navalCount==='2';click('#pause-drive');click('#start-flight');click('#start-flight');const flight=d.flightMissionStatus==='active'&&d.vehicleKind==='plane'&&d.chaseStatus==='idle'&&d.seaProjectiles==='0';click('#pause-drive');const paused=d.driveActive==='false';click('#flight-free-drive');click('#flight-free-drive');const reset=d.flightMissionStatus==='idle'&&d.vehicleKind==='walking';click('#pause-drive');click('#start-recon');click('#start-recon');const recon=d.flightMissionType==='recon'&&d.flightMissionStatus==='active'&&d.reconRecords==='[]';click('#pause-drive');click('#flight-free-drive');click('#flight-free-drive');return {naval,flight,paused,reset,recon,reconReset:d.flightMissionStatus==='idle'&&d.reconRecords==='[]',storage:localStorage.getItem('desktop-smoke')==='ok'};})()`);
    const records=await window.webContents.executeJavaScript(`(async()=>{const {createFlightRecordStore}=await import('./flight-records-store.js');const store=createFlightRecordStore(),record={schema:1,id:'desktop-score-smoke-000001',type:'return',ruleVersion:'return-v1',elapsedMs:80000,completedAt:1700000000000};const first=await store.save(record),again=await store.save(record),history=await store.read();store.close();return {recordsWrite:first.ok,recordsDedupe:again.ok&&again.duplicate,recordsRead:history.ok&&history.records.length===1};})()`);
    await window.loadURL(home+'vehicle.html');
    records.recordsReload=await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{const panel=document.querySelector('#flight-records-panel');if(panel?.dataset.state==='ready'){clearInterval(timer);resolve(document.querySelector('[data-task=return][data-rules=return-v1]')?.dataset.count==='1');}else if(panel?.dataset.state==='error'||++n>150){clearInterval(timer);reject(Error('Flight records initialization failed'));}},100);})`);
    if(!Object.values(records).every(Boolean))throw Error('Local record persistence smoke check failed');
    report.checks.push({map:'vehicle',...vehicle,...tasks,...records});
    if(!vehicle.webgl||!vehicle.storage||!Object.values(tasks).every(Boolean))throw Error('Vehicle/mission smoke check failed');
    report.ok=report.checks.length===7&&report.errors.length===0;
   }catch(error){report.ok=false;report.errors.push(error.stack||String(error));}
   if(smokeOutput)fs.writeFileSync(smokeOutput,JSON.stringify(report,null,2));
   console.log(JSON.stringify(report));app.exit(report.ok?0:1);
  }else await window.loadURL(home);
 }).catch(error=>{dialog.showErrorBox('NEON ECLIPSE 启动失败',String(error));app.exit(1);});
 app.on('window-all-closed',()=>app.quit());
}
