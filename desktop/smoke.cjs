const {spawnSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const release=path.resolve(__dirname,'../release-desktop');
const env={...process.env};
// Editor-launched terminals may inherit Electron's Node-only execution mode.
delete env.ELECTRON_RUN_AS_NODE;delete env.NODE_OPTIONS;
const executable=process.argv.includes('--unpacked')?path.join(release,'win-unpacked','NEON ECLIPSE.exe'):path.join(release,require('./package.json').build.portable.artifactName);
const version=require('./package.json').version;
const reportPath=path.join(release,'smoke-'+version+(process.argv.includes('--unpacked')?'-unpacked.json':'-portable.json'));
if(fs.existsSync(reportPath))fs.unlinkSync(reportPath);
const result=spawnSync(executable,['--smoke-test','--smoke-output='+reportPath],{env,stdio:'inherit',timeout:120000});
if(result.error)throw result.error;
if(result.status!==0)throw Error('Desktop process failed: '+result.status);
const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
console.log(JSON.stringify(report,null,2));
if(!report.ok||report.checks.length!==7)throw Error('Six-chapter and vehicle mission desktop smoke test failed');
