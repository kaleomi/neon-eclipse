const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.glb':'model/gltf-binary', '.gltf':'model/gltf+json', '.bin':'application/octet-stream' };
const server = http.createServer((req,res) => {
 let filename;
 try {
  const pathname = decodeURIComponent(new URL(req.url,'http://local').pathname);
  filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!filename.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
 } catch { res.writeHead(400); return res.end('Bad request'); }
 fs.stat(filename,(err,stat) => {
  if(err || !stat.isFile()) { res.writeHead(404); return res.end('Not found'); }
  const ext=path.extname(filename);
  const headers={'Content-Type':ext==='.mp3'?'audio/mpeg':ext==='.ogg'?'audio/ogg':types[ext] || 'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes'};
  let start=0,end=stat.size-1,status=200;
  if(req.headers.range){
   const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
   if(match&&(match[1]||match[2])){
    if(!match[1])start=Math.max(0,stat.size-Number(match[2]));
    else {start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
   }else start=stat.size;
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});return res.end();}
   status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
  }
  headers['Content-Length']=Math.max(0,end-start+1);
  res.writeHead(status,headers);
  if(req.method==='HEAD'||stat.size===0)return res.end();
  const stream = fs.createReadStream(filename,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res);
 });
});
server.on('error',error => { console.error(error.message); process.exitCode=1; });
server.listen(Number(process.env.PORT)||5173,'0.0.0.0',()=>console.log('NEON ECLIPSE ready: http://localhost:' + server.address().port));
