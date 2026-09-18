import * as T from './node_modules/three/build/three.module.js';
export function createSwarmModel(){
 const group=new T.Group();group.name='SWARM_DRONE';group.userData.swarmDrone=true;group.userData.combatAnchorY=0;
 const body=new T.MeshStandardMaterial({color:0x243c50,metalness:.6,roughness:.4}),metal=new T.MeshStandardMaterial({color:0x829dad,metalness:.7,roughness:.35}),glow=new T.MeshStandardMaterial({color:0x63cfff,emissive:0x187cff,emissiveIntensity:1.3});group.userData.ownedMaterials=[body,metal,glow];
 const box=(w,h,d,x,y,z,mat,zone='body')=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.userData.hitZone=zone;group.add(m);return m;};
 box(.65,.25,.48,0,0,0,body);box(.4,.08,.34,0,.165,0,metal);box(.22,.12,.06,0,0,.27,glow,'head');
 const rotors=[];
 for(const x of [-.49,.49])for(const z of [-.33,.33]){
  box(.45,.06,.08,x*.6,0,z,metal);
  const ring=new T.Mesh(new T.TorusGeometry(.19,.025,5,16),metal);ring.position.set(x,.04,z);ring.rotation.x=Math.PI/2;ring.userData.hitZone='body';group.add(ring);
  const rotor=box(.34,.022,.06,x,.04,z,glow);rotors.push(rotor);
 }
 group.userData.parts={swarm:true,rotors,accent:glow};return group;
}
export function animateSwarm(enemy,time){const p=enemy.group.userData.parts;for(const rotor of p.rotors)rotor.rotation.y=time*24+enemy.seed;p.accent.emissiveIntensity=enemy.charge>0?2+Math.sin(time*20)*.8:1.1;}
