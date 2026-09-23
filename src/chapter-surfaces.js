import * as T from '../node_modules/three/build/three.module.js';

// Architectural finishes only. No downloaded assets, Canvas/DOM, vertices or collision edits.
// The deterministic tile bake does not consume Math.random; Three resource UUIDs retain their normal lifecycle.
// R = shallow height, G = roughness, B = metalness: one packed linear map, plus one sRGB albedo tile.
export const CHAPTER_SURFACE_SIZE=512;
const spec=(family,tint,roughness,metalness,metres=[4,4],mix=.38,bump=.07)=>Object.freeze({family,tint,roughness,metalness,metres:Object.freeze(metres),mix,bump});
export const CHAPTER_SURFACE_PROFILES=Object.freeze({
 station:Object.freeze({floor:spec('tile',0x96a8aa,.88,.08,[4,4],0,.035),wall:spec('cladding',0x8ba3ac,.78,.14,[4,3.6],.4,.07)}),
 roof:Object.freeze({floor:spec('tread',0x92a3af,.72,.28,[4,4],.12,.055),wall:spec('weathered',0x8799ad,.82,.16,[4,3],.48,.085)}),
 tower:Object.freeze({floor:spec('access',0x8895a6,.65,.38,[4,4],.3,.055),wall:spec('cladding',0x8393a8,.73,.2,[4,3],.5,.07)}),
 train:Object.freeze({floor:spec('tread',0x9babad,.65,.38,[4,4],.24,.055),wall:spec('ribbed',0x819aa6,.66,.32,[4,3],.35,.065)}),
 harbor:Object.freeze({floor:spec('wet',0x879fa4,.78,.06,[5,5],.38,.075),wall:spec('weathered',0x899b9d,.86,.12,[4,3],.45,.085),deck:spec('tread',0x839ba3,.6,.35,[4,4],.25,.06)}),
 orbital:Object.freeze({floor:spec('access',0x8b9fb5,.63,.4,[4,4],.48,.055),wall:spec('cladding',0x8296b4,.71,.26,[4,4.5],.5,.075)}),
 datacenter:Object.freeze({floor:spec('sealed',0x83a2a9,.7,.2,[4,4],.44,.045),wall:spec('weathered',0x7f9ba8,.8,.18,[4,3],.5,.075)}),
 polar:Object.freeze({floor:spec('snow',0xcfdbe6,.96,0,[8,8],0,.12),wall:spec('insulated',0x9c9c99,.86,.12,[3,3],.42,.075),deck:spec('tread',0xa0adb7,.76,.3,[4,4],.24,.06),cliff:spec('frost',0x93a6b6,.95,0,[6,6],.25,.14)})
});
const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
const fract=v=>v-Math.floor(v);
function hash(x,y,seed){let h=Math.imul(x+seed,374761393)^Math.imul(y+17,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
function noise(u,v,n,seed){const x=u*n,y=v*n,ix=Math.floor(x),iy=Math.floor(y),fx=fract(x),fy=fract(y),a=fx*fx*(3-2*fx),b=fy*fy*(3-2*fy),h=(dx,dy)=>hash((ix+dx)%n,(iy+dy)%n,seed);return (h(0,0)*(1-a)+h(1,0)*a)*(1-b)+(h(0,1)*(1-a)+h(1,1)*a)*b;}
const seedFor=text=>[...text].reduce((s,c)=>Math.imul(s,31)+c.charCodeAt(0)|0,157);

export function bakeChapterSurface(profile,seed=19,size=CHAPTER_SURFACE_SIZE){
 if(!Number.isInteger(size)||size<16||size>1024)throw new RangeError('Surface size must be 16..1024');
 const color=new Uint8Array(size*size*4),packed=new Uint8Array(size*size*4),family=profile.family,wall=['cladding','weathered','ribbed','insulated'].includes(family);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,g=hash(x,y,seed)-.5,big=noise(u,v,4,seed)-.5,fine=noise(u,v,16,seed+7)-.5;
  let value=.80+big*.055+fine*.032+g*.021,height=.53+fine*.022+g*.012,rough=profile.roughness+fine*.045,metal=profile.metalness,red=1,blue=1;
  if(family==='snow'){
   const wind=Math.sin((u*3+Math.sin(v*Math.PI*4)*.16)*Math.PI*2),ripple=Math.sin((u*15+Math.sin(v*Math.PI*2)*.2)*Math.PI*2);
   value=.91+big*.075+wind*.027+fine*.026+g*.018;height=.5+wind*.1+ripple*.025+fine*.024;rough=.96+g*.018;metal=0;red=.96;blue=1.025;
  }else if(family==='frost'){
   const strata=Math.sin((v*8+Math.sin(u*Math.PI*4)*.13)*Math.PI*2),ice=clamp((big+.15)*2);
   value=.68+big*.14+fine*.08+strata*.027+ice*.1;height=.48+big*.22+strata*.04+fine*.07;rough=.9+ice*.07;metal=0;red=.93;blue=1.06;
  }else if(wall){
   const a=fract(u*(family==='insulated'?4:2)),seam=Math.min(a,1-a),edge=Math.min(v,1-v),plinth=family==='ribbed'?0:v<.16?1:0;
   value+=plinth?-.15:.035;height-=plinth?.045:0;
   if(seam<.008||edge<.008){value=.31+g*.025;height=.18;rough=.9;metal=.1;}
   else if(seam<.016||edge<.016){value+=.095;height+=.035;}
   if(family==='ribbed'){
    const rib=Math.cos(u*Math.PI*24);value+=rib*.044;height+=rib*.09;rough+=rib*.025;
   }else{
    if(Math.abs(v-.16)<.005||Math.abs(v-.79)<.004){value+=.13;height+=.045;metal+=.08;}
    const inset=Math.min(Math.abs(a-.085),Math.abs(a-.915));
    if(v>.27&&v<.71&&inset<.006){value-=.11;height-=.035;}
    if(v>.27&&v<.71&&a>.09&&a<.91){value+=.015;}
   }
   // Recessed fasteners, not emissive symbols or new interactable-looking labels.
   const bx=Math.min(Math.abs(a-.052),Math.abs(a-.948)),by=Math.min(Math.abs(v-.055),Math.abs(v-.945)),bolt=Math.hypot(bx*1.7,by);
   if(bolt<.014){value=bolt<.008?.69:.36;height=bolt<.008?.56:.35;metal=.55;rough=.51;if(Math.abs(bx)<.002&&by<.007)value=.3;}
   if(family==='weathered'){
    const streak=noise(u,v*.0625,32,seed+41),damp=clamp((streak-.52)*4)*(1-v)*.16;
    value-=damp;height-=damp*.12;red+=damp*.15;blue-=damp*.12;rough=clamp(rough+damp,.45,.98);
   }
   if(family==='insulated'&&v>.87){const frost=(v-.87)/.13;value+=frost*.07;height+=frost*.02;rough=.94;blue=1.035;}
  }else{
   const count=family==='wet'?1:2,a=fract(u*count),b=fract(v*count),joint=Math.min(a,1-a,b,1-b);
   if(joint<.009){value=.29+g*.027;height=.18;rough=.89;metal=.07;}
   else if(joint<.018){value+=.085;height+=.038;}
   if(family==='tile'){
    value+=hash(Math.floor(u*2),Math.floor(v*2),seed)*.055-.025;
   }else if(family==='wet'){
    const wet=clamp((noise(u,v,5,seed+73)-.45)*5);value-=wet*.095;rough=profile.roughness-wet*.43;metal=.035;height+=big*.045+fine*.03;
   }else{
    if(joint>.055&&joint<.067){value-=.095;height-=.028;}
    const bx=Math.min(Math.abs(a-.075),Math.abs(a-.925)),by=Math.min(Math.abs(b-.075),Math.abs(b-.925)),bolt=Math.hypot(bx,by);
    if(bolt<.017){value=bolt<.01?.72:.31;height=bolt<.01?.53:.32;metal=.62;rough=.49;}
    if(family==='tread'&&joint>.095){
     const row=Math.floor(v*16),xx=fract(u*16+(row%2)*.5)-.5,yy=fract(v*16)-.5,across=(xx+(row%2?yy:-yy))*.707,along=(xx-(row%2?yy:-yy))*.707;
     if(Math.abs(across)<.065&&Math.abs(along)<.31){value+=.062;height+=.055;rough-=.05;}else if(Math.abs(across-.085)<.028&&Math.abs(along)<.31)value-=.035;
    }
    if(family==='access'||family==='sealed'){
     const brush=Math.sin(v*Math.PI*384)*.006;value+=brush;height+=brush*.24;
     if(a>.31&&a<.69&&b>.47&&b<.50){value-=.12;height-=.065;}
     if(family==='sealed'){const damp=clamp((big+.14)*2);rough-=damp*.13;value-=damp*.035;blue=1.018;}
    }
   }
  }
  const i=(y*size+x)*4;color[i]=Math.round(clamp(value*red)*255);color[i+1]=Math.round(clamp(value)*255);color[i+2]=Math.round(clamp(value*blue)*255);color[i+3]=255;
  packed[i]=Math.round(clamp(height)*255);packed[i+1]=Math.round(clamp(rough,.2,1)*255);packed[i+2]=Math.round(clamp(metal,0,.7)*255);packed[i+3]=255;
 }
 return {color,packed,size};
}

// Local-metre planar projection: object/instance dimensions contribute, translations do not.
// Batched unit boxes keep the same texel density as ordinary boxes; moving train scenery carries its paint with it.
const vertexHeader='varying vec3 vChapterSurfacePosition;\nvarying vec3 vChapterSurfaceNormal;\n';
const vertexProjection=`
 mat4 chapterSurfaceTransform = modelMatrix;
 #ifdef USE_INSTANCING
  chapterSurfaceTransform = modelMatrix * instanceMatrix;
 #endif
 vec3 chapterSurfaceScale = vec3(length(chapterSurfaceTransform[0].xyz),length(chapterSurfaceTransform[1].xyz),length(chapterSurfaceTransform[2].xyz));
 vChapterSurfacePosition = position * chapterSurfaceScale;
 vChapterSurfaceNormal = normal;
`;
const fragmentHeader=`
 varying vec3 vChapterSurfacePosition;
 varying vec3 vChapterSurfaceNormal;
 uniform vec2 chapterSurfaceMetres;
 vec2 chapterSurfaceUV(){
  vec3 n=abs(vChapterSurfaceNormal);
  if(n.y>=n.x&&n.y>=n.z)return vChapterSurfacePosition.xz/chapterSurfaceMetres;
  if(n.x>=n.z)return vChapterSurfacePosition.zy/chapterSurfaceMetres;
  return vChapterSurfacePosition.xy/chapterSurfaceMetres;
 }
`;
const scopes=new WeakMap();
function scopeFor(scene,renderer){
 let scope=scopes.get(scene);if(scope)return scope;
 const maximum=renderer?.capabilities?.getMaxAnisotropy?.(),anisotropy=Number.isFinite(maximum)?clamp(maximum,1,8):1;
 scope={high:true,anisotropy,packs:new Map(),materials:new Map(),disposed:false};scopes.set(scene,scope);return scope;
}
function tilePack(scope,chapter,key,profile){
 const id=chapter+':'+key;if(scope.packs.has(id))return scope.packs.get(id);
 const data=bakeChapterSurface(profile,seedFor(id));
 const make=(pixels,colorSpace)=>{const texture=new T.DataTexture(pixels,data.size,data.size,T.RGBAFormat,T.UnsignedByteType);texture.colorSpace=colorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.anisotropy=scope.anisotropy;texture.needsUpdate=true;return texture;};
 const pack={color:make(data.color,T.SRGBColorSpace),packed:make(data.packed,T.NoColorSpace)};scope.packs.set(id,pack);return pack;
}
function detail(record,high){
 const {material,profile,pack}=record,changed=material.userData.chapterSurface.detail!==high;
 material.userData.chapterSurface.detail=high;
 if(material.isMeshStandardMaterial){material.bumpMap=high?pack.packed:null;material.roughnessMap=high?pack.packed:null;material.metalnessMap=high?pack.packed:null;material.bumpScale=profile.bump;material.roughness=high?1:profile.roughness;material.metalness=high?1:profile.metalness;}
 if(changed)material.needsUpdate=true;
}
export function createChapterSurfaces(scene,renderer,chapter){
 const profiles=CHAPTER_SURFACE_PROFILES[chapter];if(!profiles)throw new RangeError('No architectural surface profile for '+chapter);
 const scope=scopeFor(scene,renderer);
 return {
  coat(material,kind='floor',{keepMap=false,mix}={}){
   if(scope.disposed)throw new Error('Disposed surface scope');
   if(!material?.isMeshStandardMaterial&&!material?.isMeshBasicMaterial)throw new TypeError('Architectural surface requires a mesh material');
   const existing=scope.materials.get(material);if(existing){if(existing.chapter!==chapter||existing.kind!==kind)throw new Error('Material already belongs to another surface role');return material;}
   const key=Object.hasOwn(profiles,kind)?kind:'floor',profile=profiles[key],pack=tilePack(scope,chapter,key,profile);
   if(!keepMap||!material.map)material.map=pack.color;
   // Preserve basic cue hues exactly; only static floor overlays explicitly opt into an albedo map.
   if(material.isMeshStandardMaterial)material.color.lerp(new T.Color(profile.tint),mix??profile.mix);
   const previousCompile=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
   material.onBeforeCompile=function(shader,render){
    previousCompile.call(this,shader,render);
    shader.uniforms.chapterSurfaceMetres={value:new T.Vector2(...profile.metres)};
    shader.vertexShader=vertexHeader+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+vertexProjection);
    shader.fragmentShader=fragmentHeader+shader.fragmentShader;
    for(const [chunk,uv]of [['map_fragment','vMapUv'],['bumpmap_pars_fragment','vBumpMapUv'],['roughnessmap_fragment','vRoughnessMapUv'],['metalnessmap_fragment','vMetalnessMapUv']])shader.fragmentShader=shader.fragmentShader.replace('#include <'+chunk+'>',T.ShaderChunk[chunk].replaceAll(uv,'chapterSurfaceUV()'));
   };
   material.customProgramCacheKey=()=>previousKey+'|chapter-surfaces-v1';
   material.userData.chapterSurface={chapter,kind,family:profile.family,metres:[...profile.metres],detail:null};
   const forget=()=>{scope.materials.delete(material);material.removeEventListener('dispose',forget);};
   const record={material,profile,pack,chapter,kind,forget};scope.materials.set(material,record);material.addEventListener('dispose',forget);detail(record,scope.high);material.needsUpdate=true;return material;
  },
  quality(high){scope.high=!!high;for(const record of scope.materials.values())detail(record,scope.high);},
  get textureCount(){return scope.packs.size*2;},
  // Only on world/renderer teardown, never on stage retry/clear. The scene-keyed cache also releases with the page realm.
  dispose(){if(scope.disposed)return;scope.disposed=true;for(const record of scope.materials.values())record.material.removeEventListener('dispose',record.forget);for(const pack of scope.packs.values()){pack.color.dispose();pack.packed.dispose();}scope.packs.clear();scope.materials.clear();scopes.delete(scene);}
 };
}
