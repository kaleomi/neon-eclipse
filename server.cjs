const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml' };
const server = http.createServer((req,res) => {
 let filename;
 try {
  const pathname = decodeURIComponent(new URL(req.url,'http://local').pathname);
  filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!filename.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
 } catch { res.writeHead(400); return res.end('Bad request'); }
 fs.stat(filename,(err,stat) => {
  if(err || !stat.isFile()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200,{'Content-Type':types[path.extname(filename)] || 'application/octet-stream','Cache-Control':'no-cache'});
  const stream = fs.createReadStream(filename);stream.on('error',()=>res.destroy());stream.pipe(res);
 });
});
server.on('error',error => { console.error(error.message); process.exitCode=1; });
server.listen(Number(process.env.PORT)||5173,'0.0.0.0',()=>console.log('NEON ECLIPSE ready: http://localhost:' + server.address().port));
