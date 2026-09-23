import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from '../node_modules/three/build/three.module.js';
import {CHAPTER_SURFACE_PROFILES,CHAPTER_SURFACE_SIZE,bakeChapterSurface,createChapterSurfaces} from '../src/chapter-surfaces.js';
const digest=a=>createHash('sha256').update(a).digest('hex');
assert.deepEqual(Object.keys(CHAPTER_SURFACE_PROFILES),['station','roof','tower','train','harbor','orbital','datacenter','polar']);
const random=Math.random;let bake;
try{Math.random=()=>{throw Error('Tile bake must not consume the game RNG');};bake=bakeChapterSurface(CHAPTER_SURFACE_PROFILES.tower.floor,7,64);}finally{Math.random=random;}
assert.equal(digest(bake.color),digest(bakeChapterSurface(CHAPTER_SURFACE_PROFILES.tower.floor,7,64).color));
assert.notEqual(digest(bake.color),digest(bakeChapterSurface(CHAPTER_SURFACE_PROFILES.tower.floor,8,64).color));
assert.throws(()=>bakeChapterSurface(CHAPTER_SURFACE_PROFILES.tower.floor,7,0),RangeError);
const families=new Map();
for(const [chapter,profiles]of Object.entries(CHAPTER_SURFACE_PROFILES))for(const [role,profile]of Object.entries(profiles)){
 const data=bakeChapterSurface(profile,17,64);assert.equal(data.color.length,64*64*4);assert.equal(data.packed.length,data.color.length);
 const heights=new Set(),roughness=new Set();for(let i=0;i<data.color.length;i+=4){assert.equal(data.color[i+3],255);assert.equal(data.packed[i+3],255);heights.add(data.packed[i]);roughness.add(data.packed[i+1]);assert(data.packed[i+1]>=51&&data.packed[i+1]<=255);assert(data.packed[i+2]<=179);if(profile.family==='snow'||profile.family==='frost')assert.equal(data.packed[i+2],0);}
 assert(heights.size>8,chapter+'/'+role+' height detail');assert(roughness.size>1,chapter+'/'+role+' roughness detail');families.set(profile.family,digest(data.color));
}
assert(new Set(families.values()).size>=9,'distinct architectural/ground finishes');
console.log('PASS deterministic CPU tiles, no DOM/Canvas or bake RNG dependency, opaque albedo, packed PBR ranges and differentiated chapter finishes');
const scene=new T.Scene(),renderer={capabilities:{getMaxAnisotropy:()=>4}},surfaces=createChapterSurfaces(scene,renderer,'tower');
const wall=new T.MeshStandardMaterial({color:0x202839}),floor=new T.MeshStandardMaterial({color:0x667181}),deck=new T.MeshStandardMaterial({color:0x708794});
const geometry=new T.BoxGeometry(10,3,.5),mesh=new T.Mesh(geometry,wall);mesh.position.set(10,1.5,-6);scene.add(mesh);
const positions=new Float32Array(geometry.attributes.position.array),matrix=mesh.matrixWorld.clone(),children=[...scene.children];
surfaces.coat(wall,'wall');surfaces.coat(floor,'floor');surfaces.coat(deck,'deck');
assert.equal(surfaces.textureCount,4,'two maps per resolved role, deck reuses floor');assert.equal(floor.map,deck.map);assert.equal(floor.bumpMap,deck.bumpMap);
assert.equal(floor.map.colorSpace,T.SRGBColorSpace);assert.equal(floor.bumpMap.colorSpace,T.NoColorSpace);assert.equal(floor.roughnessMap,floor.bumpMap);assert.equal(floor.metalnessMap,floor.bumpMap);
assert.equal(floor.map.image.width,CHAPTER_SURFACE_SIZE);assert.equal(floor.map.wrapS,T.RepeatWrapping);assert.equal(floor.map.minFilter,T.LinearMipmapLinearFilter);assert.equal(floor.map.generateMipmaps,true);assert.equal(floor.map.anisotropy,4);
assert.deepEqual(geometry.attributes.position.array,positions);assert.deepEqual(mesh.matrixWorld,matrix);assert.deepEqual(scene.children,children,'coating adds no meshes or lights');
const albedo=floor.map,packed=floor.bumpMap,color=wall.color.getHex(),key=wall.customProgramCacheKey();
for(let i=0;i<12;i++){surfaces.quality(false);assert.equal(floor.map,albedo);assert.equal(floor.bumpMap,null);assert.equal(floor.roughnessMap,null);assert.equal(floor.metalnessMap,null);surfaces.quality(true);assert.equal(floor.bumpMap,packed);assert.equal(floor.map,albedo);}
surfaces.coat(wall,'wall');assert.equal(surfaces.textureCount,4);assert.equal(wall.color.getHex(),color);assert.equal(wall.customProgramCacheKey(),key,'idempotent coating');
assert.throws(()=>surfaces.coat(wall,'floor'),/another surface role/);
assert.throws(()=>createChapterSurfaces(scene,renderer,'reactor'),/No architectural surface/);
const sameScene=createChapterSurfaces(scene,undefined,'tower'),later=new T.MeshStandardMaterial();surfaces.quality(false);sameScene.coat(later,'deck');assert.equal(later.bumpMap,null,'late boss platform inherits scene quality');assert.equal(later.map,albedo);sameScene.quality(true);assert.equal(later.bumpMap,packed);
console.log('PASS bounded per-scene cache, hardware-capped anisotropy, low-quality colour retention, allocation-free quality cycling, no geometry/transform/scene mutation');
const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};
wall.onBeforeCompile(shader,renderer);assert(shader.vertexShader.includes('modelMatrix * instanceMatrix'));assert(shader.vertexShader.includes('position * chapterSurfaceScale'));assert(!shader.vertexShader.includes('vChapterSurfacePosition = (modelMatrix'),'translation must not make moving scenery textures swim');assert(shader.fragmentShader.includes('chapterSurfaceUV() + dSTdx'));assert(shader.fragmentShader.includes('texture2D( roughnessMap, chapterSurfaceUV() )'));assert.deepEqual(shader.uniforms.chapterSurfaceMetres.value.toArray(),[4,3]);
const cue=new T.MeshBasicMaterial({color:0xffc06f}),cueColor=cue.color.getHex();surfaces.coat(cue,'deck');assert.equal(cue.color.getHex(),cueColor);assert.equal(cue.opacity,1);assert.equal(cue.transparent,false);assert(cue.map);assert.equal(cue.bumpMap,undefined);
const basicShader={uniforms:{},vertexShader:T.ShaderLib.basic.vertexShader,fragmentShader:T.ShaderLib.basic.fragmentShader};cue.onBeforeCompile(basicShader,renderer);assert(basicShader.fragmentShader.includes('texture2D( map, chapterSurfaceUV() )'));
const painted=new T.MeshStandardMaterial({map:new T.Texture()}),original=painted.map;createChapterSurfaces(scene,renderer,'station').coat(painted,'floor',{keepMap:true});assert.equal(painted.map,original,'station pilot albedo retained');
console.log('PASS physical-scale instanced/non-instanced projection, local translation independence, basic overlay hue preservation, existing station map retained');
const textures=new Set([wall.map,wall.bumpMap,floor.map,floor.bumpMap,painted.bumpMap]);let disposed=0;for(const texture of textures)texture.addEventListener('dispose',()=>disposed++);let foreignDisposed=0;original.addEventListener('dispose',()=>foreignDisposed++);
surfaces.dispose();surfaces.dispose();assert.equal(disposed,textures.size);assert.equal(foreignDisposed,0,'caller-owned map is not disposed');assert.equal(surfaces.textureCount,0);assert.throws(()=>surfaces.coat(new T.MeshStandardMaterial()),/Disposed/);
const fresh=createChapterSurfaces(scene,{capabilities:{getMaxAnisotropy:()=>32}},'tower');const freshMat=fresh.coat(new T.MeshStandardMaterial(),'floor');assert.equal(freshMat.map.anisotropy,8);assert.notEqual(freshMat.map,albedo);fresh.dispose();
for(const material of [wall,floor,deck,later,cue,painted,freshMat])material.dispose();original.dispose();geometry.dispose();
console.log('PASS idempotent texture release, unowned maps preserved, fresh scene scope after teardown');
