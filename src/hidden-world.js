import * as T from '../node_modules/three/build/three.module.js';
import {HIDDEN_VOLUMES,PARKOUR_PLATFORMS,TOWER_MAZE} from './hidden-data.js';
export function createHiddenWorld(scene,map,obstacles){
 const stone=new T.MeshStandardMaterial({color:map==='station'?0x506371:0x344350,metalness:.35,roughness:.72});
 const trim=new T.MeshBasicMaterial({color:0xb3915b}),dim=new T.MeshBasicMaterial({color:0x586d78});
 function box(w,h,d,x,y,z,mat){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);scene.add(m);return m;}
 for(const def of HIDDEN_VOLUMES[map]||[]){const o={...def};o.mesh=box(o.w,o.top-o.bottom,o.d,o.x,(o.top+o.bottom)/2,o.z,stone);obstacles.push(o);
 if(map==='reactor'||map==='roof'){box(o.w,.035,.045,o.x,o.top+.018,o.z+o.d/2-.08,trim);box(.045,.035,o.d,o.x-o.w/2+.08,o.top+.018,o.z,dim);}
 if(map==='tower')box(o.w,.025,o.d,o.x,.18,o.z,dim);
 }
 function label(text,x,y,z,width,rotation=0){const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');g.fillStyle='#202b30';g.fillRect(0,0,512,128);g.fillStyle='#a6a596';g.font='32px monospace';g.fillText(text,24,74);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(width,width/4),new T.MeshBasicMaterial({map:tex}));m.position.set(x,y,z);m.rotation.y=rotation;scene.add(m);}
 if(map==='reactor'){label('K-19 / SERVICE TEST',-36.8,1.7,10.64,2);for(const [i,p] of PARKOUR_PLATFORMS.entries())label(String(i+1).padStart(2,'0'),p.x,p.top-.2,p.z+.633,.55);}
 if(map==='roof')label('SKY / OPTIONAL',32,3.35,19.98,1.3,Math.PI);
 if(map==='station')label('VENT / 02',29.9,2.1,-2.23,1.2,Math.PI);
 if(map==='tower'){for(let i=0;i<25;i++){if(TOWER_MAZE.links[i].length!==1||TOWER_MAZE.links[i].includes(i-5))continue;const p=TOWER_MAZE.center(i);label('VALVE / '+String(i+1).padStart(2,'0'),p.x,1.5,p.z-1.66,1.2);}
 label('RETURN / 07',-9.14,1.5,5.8,1.2,-Math.PI/2);const light=new T.PointLight(0x819fa6,5,9);light.position.set(-7.2,2.4,7.2);scene.add(light);}
 scene.updateMatrixWorld(true);
}
