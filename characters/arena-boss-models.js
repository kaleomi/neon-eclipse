// Eight chapter bosses outside ENEMY_TYPES. Existing arena weakpoints remain authoritative.
import {T,mesh,box,cylinder,panel,plate,strut} from './guard-geometry.js';
import {artKit,finishArt,resetArt,artClips} from './art-kit.js';
const spec=(type,id,name,color,colors,core,extra={})=>({type,id,name,color,colors,core,version:id.toLowerCase()+'-v1',file:type+'-'+id.toLowerCase()+'.glb',clips:['Idle','Aim','Exposed','Hit'],...extra});
export const ARENA_BOSS_ASSETS=Object.freeze({
 overseer:spec('overseer','O01','OVERSEER · 枢纽监察者',0xffbd64,[0x344a62,0xa0bdc8,0x90afbc],[0,1.8,0,1.05]),
 switchyard:spec('switchyard','Y02','SWITCHYARD · 道岔主机',0xffc36d,[0x214957,0xb08857,0x829ca7],[0,1.25,0,.95]),
 elevator:spec('elevator','E09','ELEVATOR · 中枢升降守卫',0xc2a1ff,[0x4d6076,0xc3c9d0,0x98b0c4],[0,1.25,.4,.46]),
 skyhook:spec('skyhook','A17','SKYHOOK · 追击直升机',0xffbd6f,[0x3f5c61,0xc3bc9e,0x9aafb1],[0,1.25,1.7,.48],{clips:['Flight','Aim','Boarding','Exposed','Hit']}),
 leviathan:spec('leviathan','N19','LEVIATHAN · 港务旗舰炮台',0xffbd6f,[0x3e5769,0xc2a879,0xa4b8c3],[0,1.25,1.6,.48]),
 tether:spec('tether','O12','TETHER · 锚定核心',0xffbd64,[0x405575,0xb5c7dc,0x87afd0],[0,2,0,1.1]),
 abyss:spec('abyss','A08','ABYSS · 水冷主机',0x63d9ff,[0x234c5e,0x8cbbc3,0x87adb9],[0,2.2,0,1]),
 glacier:spec('glacier','G40','GLACIER · 极地重炮机甲',0xff7a3a,[0x516479,0xd1dce5,0x95adbf],[0,3.2,1.85,.6])
});
function torus(p,r,t,pos,m,rot=[0,0,0]){return mesh(p,new T.TorusGeometry(r,t,8,40),m,pos,rot);}
function vents(p,pos,w,h,m){for(let i=0;i<5;i++)box(p,[w,h/12,.025],[pos[0],pos[1]+(i-2)*h/5,pos[2]],m);}
function port(a,parent=a.root){const [x,y,z,r]=a.spec.core,c=a.joint('Core',parent,[x,y,z]);mesh(c,new T.IcosahedronGeometry(r,1),a.m.Core);return c;}
function orbMachine(a,type){const {m,joint:j,root}=a,[,cy,,r]=a.spec.core,h=j('Hull',root);
 port(a);const radius=r+.50;
 if(type==='overseer'){
  for(const s of [-1,1]){const w=j('Wing_'+(s>0?'R':'L'),h,[s*1.85,1.8,-.18]);panel(w,.49,1.30,2.58,[0,0,0],m.Armor,.07);panel(w,.35,.88,.14,[0,.04,1.38],m.Shell,.03);
   panel(w,.18,1.15,.16,[s*.18,.03,1.24],m.Metal,.02);for(let k=0;k<4;k++)panel(w,.54,.10,.39,[0,-.4+k*.26,.83],m.Dark,.012);
   strut(h,[s*.62,1.0,-.35],[s*1.82,1.9,-.35],.12,.17,m.Metal);panel(w,.23,.08,.025,[0,.37,1.478],m.Signal,.009);}
  const crown=j('Crown',h,[0,cy,0]);torus(crown,radius,.11,[0,0,-.38],m.Armor);torus(crown,radius+.18,.035,[0,0,-.40],m.Metal);
  for(let i=0;i<8;i++){const t=i*Math.PI/4;panel(crown,.18,.28,.20,[Math.sin(t)*(radius+.13),Math.cos(t)*(radius+.13),-.36],m.Shell,.024,[0,0,-t]);}
  panel(h,2.6,.3,.42,[0,3.44,-.36],m.Armor,.04);panel(h,1.8,.11,.12,[0,3.66,-.35],m.Signal,.015);
 }else if(type==='switchyard'){
  // Perforated dispatch cage leaves the low, melee-accessible original core unobstructed.
  for(const x of [-1.08,1.08])for(const z of [-.82,.82]){panel(h,.17,2.30,.17,[x,1.9,z],m.Armor,.028);strut(h,[x,.8,z],[x*.78,3.12,z],.043,.043,m.Metal);}
  panel(h,2.37,.20,2.17,[0,3.1,0],m.Armor,.045);panel(h,2.03,.07,1.95,[0,3.24,0],m.Signal,.015);
  panel(h,2.55,.21,2.33,[0,.20,0],m.Dark,.045);torus(h,1.19,.058,[0,.34,0],m.Metal,[Math.PI/2,0,0]);
  for(const x of [-1.19,1.19]){panel(h,.29,.83,.70,[x,1.92,-.16],m.Shell,.03);vents(h,[x,1.97,.224],.19,.56,m.Dark);}
  const dial=j('Dial',h,[0,3.6,0]);cylinder(dial,.47,.59,.48,[0,0,0],m.Armor,[0,0,0],12);torus(dial,.34,.028,[0,.26,0],m.Signal,[Math.PI/2,0,0]);
 }else if(type==='tether'){
  // Three differently oriented gimbals make the anchor visually distinct from OVERSEER.
  for(let i=0;i<3;i++){const ring=j('Gimbal'+i,h,[0,cy,0]);torus(ring,radius+i*.20,.074,[0,0,0],i===1?m.Metal:m.Armor,[i===0?.65:i===1?-.65:0,i===2?1.2:0,0]);
   const t=i*2.1;panel(ring,.35,.60,.40,[Math.cos(t)*(radius+.1),Math.sin(t)*(radius+.1),0],m.Shell,.045);}
  for(const s of [-1,1]){panel(h,.30,2.5,.36,[s*1.95,cy,0],m.Armor,.05);for(let k=0;k<4;k++)panel(h,.44,.16,.58,[s*1.95,cy-.90+k*.58,0],m.Metal,.025);box(h,[.18,.42,.03],[s*1.95,cy+.15,.204],m.Signal);}
  const cap=j('Crown',h,[0,cy+1.67,0]);cylinder(cap,.28,.46,.55,[0,0,0],m.Armor,[0,0,0],10);cylinder(cap,.12,.15,.52,[0,.30,0],m.Signal);
 }else{
  // Water-cooled processor: vertical exchanger stacks and a clear front inspection port.
  cylinder(h,1.64,1.82,.38,[0,.24,0],m.Dark,[0,0,0],24);torus(h,1.49,.095,[0,.50,0],m.Metal,[Math.PI/2,0,0]);
  for(let i=0;i<5;i++){const t=Math.PI*.30+i*Math.PI*.35,x=Math.cos(t)*1.48,z=-Math.sin(t)*1.48;const tank=j('Cooler'+i,h,[x,cy,z]);
   cylinder(tank,.27,.30,2.5,[0,0,0],m.Armor,[0,0,0],12);for(const y of [-.95,0,.95])cylinder(tank,.34,.34,.12,[0,y,0],m.Metal,[0,0,0],12);
   panel(tank,.17,1.18,.05,[0,.1,.307],m.Signal,.012);}
  torus(h,1.30,.13,[0,cy,-.39],m.Shell);torus(h,1.53,.04,[0,cy,-.44],m.Metal);
  panel(h,2.23,.25,1.0,[0,cy+1.46,-.31],m.Armor,.05);vents(h,[0,cy+1.45,.229],1.68,.18,m.Dark);
 }
}
function elevator(a){const {m,joint:j,root}=a,h=j('Hull',root);port(a);
 // Open chest frame around the native .46m core, not a new armor plate over it.
 panel(h,1.52,1.23,.55,[0,1.28,-.13],m.Dark,.047);
 for(const s of [-1,1]){panel(h,.38,1.23,.72,[s*.67,1.26,0],m.Armor,.04);panel(h,.22,.76,.09,[s*.64,1.30,.43],m.Shell,.019);
  const arm=j('Arm_'+(s>0?'R':'L'),h,[s*1,1.78,0]);cylinder(arm,.16,.16,.40,[0,0,0],m.Metal,[0,0,Math.PI/2]);panel(arm,.34,1.17,.42,[0,-.52,0],m.Armor,.025);panel(arm,.36,.19,.48,[0,-1.15,.08],m.Dark,.02);
  const leg=j('Leg_'+(s>0?'R':'L'),h,[s*.5,.77,0]);panel(leg,.28,.56,.46,[0,-.28,0],m.Dark,.024);strut(leg,[s*.11,-.04,-.13],[s*.11,-.55,-.13],.035,.032,m.Metal);panel(leg,.44,.16,.64,[0,-.67,.10],m.Armor,.027);}
 const head=j('Head',h,[0,2.05,0]);panel(head,.82,.37,.53,[0,0,0],m.Armor,.034);panel(head,.49,.058,.027,[0,.02,.295],m.Signal,.008);
 torus(h,.63,.045,[0,1.25,.365],m.Metal);panel(h,1.23,.13,.7,[0,1.96,-.015],m.Shell,.02);panel(h,.68,.75,.33,[0,1.23,-.55],m.Armor,.028);
 vents(h,[0,1.36,-.73],.47,.40,m.Metal);
}
function helicopter(a){const {m,joint:j,root}=a,flight=j('Flight',root),inside=j('Inside',root);port(a);
 panel(flight,2.25,1.13,2.85,[0,1.25,0],m.Armor,.10);panel(flight,1.74,.61,.49,[0,1.50,1.48],m.Dark,.06);
 for(const s of [-1,1]){plate(flight,[[s*.08,-.2],[s*.73,-.13],[s*.72,.14],[s*.11,.23]],.065,[0,1.53,1.765],m.Signal,.008);
  panel(flight,.44,.64,1.15,[s*1.16,1.38,-.09],m.Shell,.045);vents(flight,[s*1.16,1.42,.512],.30,.37,m.Dark);
  strut(flight,[s*.85,.80,.94],[s*1.2,.38,.89],.055,.055,m.Metal);strut(flight,[s*.83,.80,-.78],[s*1.2,.38,-.80],.055,.055,m.Metal);
  panel(flight,.13,.15,3.55,[s*1.2,.34,.03],m.Metal,.035);}
 panel(flight,.41,.41,3.19,[0,1,-2.76],m.Armor,.055);panel(flight,1.77,.14,.56,[0,1,-4.10],m.Shell,.035);
 plate(flight,[[-.15,-.3],[.15,-.3],[.21,.91],[-.04,1.2],[-.12,.95]],.37,[0,1.36,-3.82],m.Armor,.025,[0,Math.PI/2,0]);
 const rotor=j('Rotor',flight,[0,2.7,0]);cylinder(rotor,.17,.2,.32,[0,0,0],m.Metal);
 for(let i=0;i<4;i++){const blade=new T.Group();blade.rotation.y=i*Math.PI/2;rotor.add(blade);panel(blade,.22,.065,3.35,[0,.04,1.70],m.Dark,.018);box(blade,[.235,.012,.28],[0,.082,3.24],m.Shell);}
 panel(inside,1.47,1.74,1.15,[0,1.1,0],m.Dark,.055);
 for(const s of [-1,1]){panel(inside,.23,1.17,1.67,[s*.85,.65,0],m.Armor,.027);panel(inside,.26,.08,.71,[s*.52,1.98,.11],m.Shell,.012);for(let i=0;i<3;i++)cylinder(inside,.08,.08,.74,[s*(.18+i*.17),1.13,.65],m.Metal);}
}
function navalTurret(a){const {m,joint:j,root}=a,h=j('Hull',root);port(a);
 panel(h,3.75,.23,3.45,[0,.65,0],m.Metal,.09);panel(h,3.32,1.72,2.91,[0,1.25,-.04],m.Armor,.10);
 for(const s of [-1,1]){panel(h,.87,1.35,.16,[s*1.15,1.3,1.51],m.Shell,.045);vents(h,[s*1.16,1.48,1.61],.60,.60,m.Dark);
  cylinder(h,.12,.14,1.50,[s*1.49,1.42,1.56],m.Metal);box(h,[.09,.33,.03],[s*1.49,1.6,1.725],m.Signal);
  panel(h,.21,.74,1.78,[s*1.73,1.5,-.32],m.Dark,.036);}
 const gun=j('Cannon',h,[0,2.15,.35]);cylinder(gun,.24,.29,2.9,[0,0,1.55],m.Metal,[Math.PI/2,0,0],16);
 for(let z=.30;z<2.9;z+=.63)cylinder(gun,.35,.35,.16,[0,0,z],m.Armor,[Math.PI/2,0,0],12);
 cylinder(gun,.31,.33,.34,[0,0,3.04],m.Dark,[Math.PI/2,0,0],12);cylinder(gun,.16,.16,.012,[0,0,3.218],m.Dark,[Math.PI/2,0,0],12);
 torus(h,.65,.057,[0,1.25,1.54],m.Metal);panel(h,1.18,.17,1.16,[0,2.26,-.78],m.Shell,.03);
}
function glacier(a){const {m,joint:j,root}=a,h=j('Hull',root);port(a);
 panel(h,4.12,2.48,3.28,[0,3.4,-.04],m.Armor,.13);panel(h,3.67,.35,2.83,[0,4.81,-.14],m.Shell,.10);
 for(const s of [-1,1]){panel(h,1.08,1.67,.21,[s*1.31,3.26,1.73],m.Shell,.06);vents(h,[s*1.32,3.33,1.855],.73,1.03,m.Dark);panel(h,.22,1.7,2.28,[s*2.10,3.4,-.1],m.Dark,.055);}
 const cannon=j('Cannon',h,[0,4,2.8]);cylinder(cannon,.35,.43,4.58,[0,0,0],m.Metal,[Math.PI/2,0,0],14);
 for(const z of [-1.35,-.55,.35,1.35])cylinder(cannon,.5,.49,.22,[0,0,z],m.Armor,[Math.PI/2,0,0],12);
 cylinder(cannon,.43,.43,.42,[0,0,2.15],m.Dark,[Math.PI/2,0,0],12);cylinder(cannon,.24,.24,.013,[0,0,2.371],m.Dark,[Math.PI/2,0,0],12);
 for(let i=0;i<4;i++){const x=i%2?1.8:-1.8,z=i<2?-1.2:1.2,l=j('Leg'+i,h,[x,2.2,z]);panel(l,.67,2.14,.67,[0,-1.07,0],m.Dark,.065);panel(l,.49,1.28,.23,[0,-.8,.36],m.Shell,.045);
  strut(l,[-.27,-.18,-.19],[-.27,-1.94,-.19],.071,.059,m.Metal);panel(l,.92,.21,1.03,[0,-2.08,.12],m.Armor,.048);}
 mesh(h,new T.SphereGeometry(.25,12,10),m.Signal,[0,4.4,1.71]);torus(h,.81,.07,[0,3.2,1.77],m.Metal);
}
export function createArenaBossVisual(type){const s=ARENA_BOSS_ASSETS[type];if(!s)throw Error('Unknown arena boss '+type);const a=artKit(s);
 if(['overseer','switchyard','tether','abyss'].includes(type))orbMachine(a,type);else if(type==='elevator')elevator(a);else if(type==='skyhook')helicopter(a);else if(type==='leviathan')navalTurret(a);else glacier(a);
 return finishArt(a,poseArenaBoss);
}
export function poseArenaBoss(rig,type,{time=0,mode=ARENA_BOSS_ASSETS[type]?.clips[0],hit=0,runtime=false}={}){
 resetArt(rig);const n=rig.nodes,open=mode==='Exposed',aim=mode==='Aim';if(n.Core)n.Core.scale.setScalar(open?1.2:1);
 if(n.Crown)n.Crown.rotation.y=time*.16;if(n.Dial)n.Dial.rotation.y=time*.35;
 if(type==='tether')for(let i=0;i<3;i++)n['Gimbal'+i].rotation.y=Math.sin(time*.45+i)*.14;
 if(type==='overseer')for(const q of ['L','R'])n['Wing_'+q].rotation.z=(q==='L'?1:-1)*(open?.09:.02);
 if(type==='elevator')for(const q of ['L','R'])n['Arm_'+q].rotation.x=aim?-.15:Math.sin(time*2)*.013;
 if(n.Cannon)n.Cannon.rotation.x=aim?-.018:0;
 if(type==='skyhook'){n.Rotor.rotation.y=time*18;n.Flight.scale.setScalar(runtime||mode!=='Boarding'?1:.001);n.Inside.scale.setScalar(runtime||mode==='Boarding'?1:.001);}
 if(n.Hull)n.Hull.rotation.z=hit*.018;
}
export const makeArenaBossClips=(root,type)=>artClips(root,ARENA_BOSS_ASSETS[type],poseArenaBoss);
export function styleArenaBoss(rig,type,mode){if(rig.materials.Signal)rig.materials.Signal.emissiveIntensity=mode==='Aim'?2:1;if(rig.materials.Core)rig.materials.Core.emissiveIntensity=mode==='Exposed'?1.8:1;}
