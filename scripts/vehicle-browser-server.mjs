// Owned ephemeral server for isolated browser regressions. Never stops an existing developer service.
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function startVehicleTestServer(){
  const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;
  await new Promise(resolve=>probe.close(resolve));
  const child=spawn(process.execPath,['server.cjs'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  try{
    await new Promise((resolve,reject)=>{
      let output='';const timer=setTimeout(()=>reject(Error('Temporary test server startup timeout: '+output)),15000);
      const fail=error=>{clearTimeout(timer);reject(error);};child.once('error',fail);child.once('exit',code=>fail(Error('Test server exited '+code)));
      child.stderr.on('data',d=>{output+=d;});child.stdout.on('data',d=>{output+=d;if(output.includes('NEON ECLIPSE ready:')){clearTimeout(timer);resolve();}});
    });
  }catch(error){child.kill();throw error;}
  return {base:`http://127.0.0.1:${port}`,stop:async()=>{if(child.exitCode!==null)return;const exited=once(child,'exit');child.kill();await exited;}};
}
