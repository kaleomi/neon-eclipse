const fs=require('node:fs'),path=require('node:path');
const source=path.resolve(__dirname,'..'),dest=path.join(__dirname,'web');
// Only the generated staging directory is replaced; original game files stay untouched.
fs.rmSync(dest,{recursive:true,force:true});fs.mkdirSync(dest,{recursive:true});
function transform(text,target){
 text=text.replaceAll('./node_modules/three/build/','./vendor/three/').replaceAll('../node_modules/three/build/','../vendor/three/');
 text=text.replaceAll('./node_modules/three/examples/jsm/','./vendor/three/examples/jsm/').replaceAll('../node_modules/three/examples/jsm/','../vendor/three/examples/jsm/');
 const relativeThree=path.relative(path.dirname(target),path.join(dest,'vendor','three','three.module.js')).split(path.sep).join('/');
 const threeModule=relativeThree.startsWith('.')?relativeThree:'./'+relativeThree;
 return text.replace(/from\s+(['"])three\1/g,(_,quote)=>`from ${quote}${threeModule}${quote}`);
}
const ignoredRootDirs=new Set(['.git','.tools','desktop','node_modules','release-desktop','tests']);
const runtimeAssetRoots=new Set(['audio','maps','models']);
const runtimeAssetPattern=/\.(ogg|mp3|glb|gltf|bin|png|jpg|jpeg|webp|svg|json|txt)$/i;
function stageTree(dir,relative=''){
 for(const name of fs.readdirSync(dir)){
  const filename=path.join(dir,name),target=path.join(dest,relative,name),stat=fs.statSync(filename);
  if(stat.isDirectory()){if(!relative&&ignoredRootDirs.has(name))continue;stageTree(filename,path.join(relative,name));continue;}
  const root=relative.split(path.sep)[0];
  if(runtimeAssetRoots.has(root)&&runtimeAssetPattern.test(name)){fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(filename,target);continue;}
  if(!/\.(js|css|html)$/.test(name)||name.startsWith('test-'))continue;
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,transform(fs.readFileSync(filename,'utf8'),target));
 }
}
stageTree(source);
const vendor=path.join(dest,'vendor','three');fs.mkdirSync(vendor,{recursive:true});
for(const name of ['three.module.js','three.core.js'])fs.copyFileSync(path.join(source,'node_modules','three','build',name),path.join(vendor,name));
fs.copyFileSync(path.join(source,'node_modules','three','LICENSE'),path.join(vendor,'THIRD-PARTY-NOTICES.txt'));
const threeExamples=['controls/OrbitControls.js','environments/RoomEnvironment.js','loaders/GLTFLoader.js','utils/BufferGeometryUtils.js','utils/SkeletonUtils.js'];
for(const name of threeExamples){const target=path.join(vendor,'examples','jsm',name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,transform(fs.readFileSync(path.join(source,'node_modules','three','examples','jsm',name),'utf8'),target));}
function runtimeFiles(dir){return fs.readdirSync(dir).flatMap(name=>{const full=path.join(dir,name),stat=fs.statSync(full);return stat.isDirectory()?runtimeFiles(full):[full];});}
for(const filename of runtimeFiles(dest).filter(name=>name.endsWith('.js'))){
 const text=fs.readFileSync(filename,'utf8'),name=path.relative(dest,filename).split(path.sep).join('/');
 for(const match of text.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g)){
  if(!fs.existsSync(path.resolve(path.dirname(filename),match[1])))throw Error(`Missing import in ${name}: ${match[1]}`);
 }
}
console.log('Offline game assets staged in desktop/web');

// Record precisely the transformed offline bytes that will enter app.asar.
const crypto=require('node:crypto'),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for(const root of runtimeAssetRoots){
 const sourceRoot=path.join(source,root);
 for(const filename of runtimeFiles(sourceRoot).filter(file=>runtimeAssetPattern.test(file))){
  const relative=path.relative(source,filename),target=path.join(dest,relative);
  if(!fs.existsSync(target)||hash(filename)!==hash(target))throw Error(`Runtime asset was not staged byte-for-byte: ${relative}`);
 }
}
const assets={};
function inventory(dir){for(const item of fs.readdirSync(dir).sort()){const full=path.join(dir,item);if(fs.statSync(full).isDirectory())inventory(full);else assets[path.relative(dest,full).split(path.sep).join('/')]=hash(full);}}
inventory(dest);
fs.writeFileSync(path.join(dest,'build-manifest.json'),JSON.stringify({version:require('./package.json').version,mainSha256:hash(path.join(__dirname,'main.cjs')),assets},null,2));
console.log('Offline manifest:',Object.keys(assets).length,'assets');
