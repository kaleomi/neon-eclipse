const fs=require('node:fs'),path=require('node:path');
const source=path.resolve(__dirname,'..'),dest=path.join(__dirname,'web');
// Only the generated staging directory is replaced; original game files stay untouched.
fs.rmSync(dest,{recursive:true,force:true});fs.mkdirSync(dest,{recursive:true});
for(const name of fs.readdirSync(source)){
 if(!/\.(js|css|html)$/.test(name)||name.startsWith('test-'))continue;
 const filename=path.join(source,name);if(!fs.statSync(filename).isFile())continue;
 const text=fs.readFileSync(filename,'utf8').replaceAll('./node_modules/three/build/','./vendor/three/');
 fs.writeFileSync(path.join(dest,name),text);
}
const vendor=path.join(dest,'vendor','three');fs.mkdirSync(vendor,{recursive:true});
for(const name of ['three.module.js','three.core.js'])fs.copyFileSync(path.join(source,'node_modules','three','build',name),path.join(vendor,name));
fs.copyFileSync(path.join(source,'node_modules','three','LICENSE'),path.join(vendor,'THIRD-PARTY-NOTICES.txt'));
for(const name of fs.readdirSync(dest).filter(n=>n.endsWith('.js'))){
 const text=fs.readFileSync(path.join(dest,name),'utf8');
 for(const match of text.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g)){
  if(!fs.existsSync(path.resolve(dest,match[1])))throw Error(`Missing import in ${name}: ${match[1]}`);
 }
}
console.log('Offline game assets staged in desktop/web');

// Record precisely the transformed offline bytes that will enter app.asar.
const crypto=require('node:crypto'),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const assets={};
function inventory(dir){for(const item of fs.readdirSync(dir).sort()){const full=path.join(dir,item);if(fs.statSync(full).isDirectory())inventory(full);else assets[path.relative(dest,full).split(path.sep).join('/')]=hash(full);}}
inventory(dest);
fs.writeFileSync(path.join(dest,'build-manifest.json'),JSON.stringify({version:require('./package.json').version,mainSha256:hash(path.join(__dirname,'main.cjs')),assets},null,2));
console.log('Offline manifest:',Object.keys(assets).length,'assets');
