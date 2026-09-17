import * as T from './node_modules/three/build/three.module.js';
import {HARBOR_WALLS,HARBOR_CONTAINERS,HARBOR_DECKS,HARBOR_STAIRS,HARBOR_GATES,HARBOR_STAR_PLATFORMS} from './harbor-data.js';
export function createHarborWorld(scene,renderer,obstacles){
 scene.background=new T.Color(0x122536);scene.fog=new T.FogExp2(0x1b3443,.012);renderer.toneMappingExposure=1.15;scene.add(new T.AmbientLight(0xb1ced7,.8));
 const quay=new T.MeshStandardMaterial({color:0x526675,roughness:.38,metalness:.3}),dark=new T.MeshStandardMaterial({color:0x263d49,roughness:.55}),gold=new T.MeshBasicMaterial({color:0xffc275}),cyan=new T.MeshBasicMaterial({color:0x87e4e5}),colors=[0x426d7b,0x866b52,0x4c677d].map(color=>new T.MeshStandardMaterial({color,metalness:.5,roughness:.5}));
 function box(o,mat,solid=false){const m=new T.Mesh(new T.BoxGeometry(o.w,o.top-o.bottom,o.d),mat);m.position.set(o.x,(o.top+o.bottom)/2,o.z);scene.add(m);if(solid)obstacles.push({...o,mesh:m});return m;}
 box({x:-7,z:0,w:62,d:76,bottom:-.3,top:0},quay);box({x:31,z:13,w:14,d:50,bottom:-.3,top:0},quay);
 const water=box({x:31,z:-25,w:14,d:26,bottom:-.3,top:.02},new T.MeshStandardMaterial({color:0x124c61,roughness:.18,metalness:.75,transparent:true,opacity:.9}));water.name='harbor-water';box({x:75,z:-35,w:100,d:160,bottom:-.3,top:-.03},water.material);
 for(const [x,z] of [[50,-18],[62,-50]]){box({x,z,w:1.3,d:1.3,bottom:0,top:18},dark);box({x:x-5,z,w:22,d:1,bottom:17.5,top:18},dark);}

 for(const o of HARBOR_WALLS)box(o,dark,true);
 for(const [i,o] of HARBOR_CONTAINERS.entries()){box(o,o.shipCabin?quay:colors[i%3],true);if(o.top>3&&o.top<4){for(let n=-o.w/2+.4;n<o.w/2;n+=.6)box({x:o.x+n,z:o.z+o.d/2+.015,w:.04,d:.035,bottom:.2,top:o.top-.2},quay);}}
 for(const o of [...HARBOR_DECKS,...HARBOR_STAIRS,...HARBOR_STAR_PLATFORMS]){box(o,quay,true);box({...o,d:.045,bottom:o.top,top:o.top+.035},gold);}
 // Crane boom is above the playable platform; its mast is already in shared collision data.
 box({x:-12,z:-16,w:18,d:.8,bottom:11.5,top:12},colors[1]);box({x:-19,z:-16,w:.05,d:.05,bottom:5.8,top:11.5},gold);box({x:-19,z:-16,w:1.2,d:.7,bottom:5.3,top:5.8},dark);
 box({x:31,z:-28,w:10.4,d:14.4,bottom:.2,top:2.65},dark);box({x:31,z:-35.4,w:8,d:3,bottom:.2,top:2.65},dark);box({x:31,z:-34.38,w:3.8,d:.04,bottom:4.3,top:4.9},cyan);for(const z of [-34.5,-21.5])box({x:31,z,w:9.4,d:.1,bottom:3,top:3.08},cyan);
 for(let z=-34;z<=-14;z+=4)box({x:23.7,z,w:.15,d:2,bottom:.02,top:.06},gold);
 const gates=HARBOR_GATES.map(o=>{const obstacle={...o},mesh=box(o,gold);obstacle.mesh=mesh;obstacles.push(obstacle);return {obstacle,mesh,openAt:o.openAt};});
 function sign(title,sub,x,y,z,width=7,rotation=0){const c=document.createElement('canvas');c.width=768;c.height=192;const g=c.getContext('2d');g.fillStyle='#102633';g.fillRect(0,0,768,192);g.fillStyle='#f8ca87';g.font='bold 48px sans-serif';g.fillText(title,24,78);g.fillStyle='#a0dfe6';g.font='26px sans-serif';g.fillText(sub,24,140);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(width,width/4),new T.MeshBasicMaterial({map,side:T.DoubleSide}));m.position.set(x,y,z);m.rotation.y=rotation;scene.add(m);}
 sign('06 / 风暴港口','STORM HARBOR · 接应船待命',0,5,18.3);sign('吊机高架','西侧金色台阶 / 3m',-8,5.3,-19.8);sign('登船入口','金色台阶 · 不要进入水域',19,3,-31.5,5);sign('返回主路','星星落点沿地面绕回西侧楼梯',-20,2,-28,6);
 const drops=new T.BufferGeometry(),positions=new Float32Array(240*3);for(let i=0;i<240;i++){positions[i*3]=(i*17%76)-38;positions[i*3+1]=i*7%18;positions[i*3+2]=(i*29%76)-38;}drops.setAttribute('position',new T.BufferAttribute(positions,3));const rain=new T.Points(drops,new T.PointsMaterial({color:0xadcbd9,size:.09,transparent:true,opacity:.6}));scene.add(rain);
 const light=new T.PointLight(0xc5e7fa,20,35);light.position.set(-8,13,-16);scene.add(light);let stage=-1;const effects=[];
 function setStage(index){if(stage===index)return false;stage=index;for(const g of gates){const closed=index<g.openAt;g.mesh.visible=closed;const i=obstacles.indexOf(g.obstacle);if(closed&&i<0)obstacles.push(g.obstacle);if(!closed&&i>=0)obstacles.splice(i,1);}return true;}
 function burst(p,color){const m=new T.Mesh(new T.IcosahedronGeometry(.12),new T.MeshBasicMaterial({color,transparent:true}));m.position.copy(p);scene.add(m);effects.push({m,life:.3});}
 function clear(){for(const e of effects){scene.remove(e.m);e.m.geometry.dispose();e.m.material.dispose();}effects.length=0;}
 function update(dt,time){for(let i=0;i<240;i++)positions[i*3+1]=((i*7-time*9)%18+18)%18;drops.attributes.position.needsUpdate=true;water.material.color.setHex(Math.sin(time*.8)>.5?0x185166:0x124c61);light.intensity=20+(time%11<.13?25:0);for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;e.m.material.opacity=Math.max(0,e.life/.3);if(e.life<=0){scene.remove(e.m);e.m.geometry.dispose();e.m.material.dispose();effects.splice(i,1);}}}
 setStage(0);scene.updateMatrixWorld(true);return {ceilings:[],setStage,update,burst,clear,setQuality:high=>{rain.visible=high;scene.fog.density=high?.012:.02;}};
}
