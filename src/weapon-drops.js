import * as T from '../node_modules/three/build/three.module.js';
import {DROP_CAPACITY,droppedPrimary,nearestWeaponDrop,shouldDropWeapon} from './weapon-drop-rules.js';
import {createWeaponPickupModels} from './weapon-pickup-models.js';
import {weaponDisplay} from './weapon-display.js';
export function createWeaponDrops({scene,camera,loadout,weapons,hasSight,isNoticeVisible=()=>false,isBusy,onEquip,notify,random=Math.random}){
 const root=new T.Group();root.name='RECOVERABLE_WEAPONS';scene.add(root);root.visible=false;
 const models=createWeaponPickupModels(),ringGeo=new T.TorusGeometry(.55,.012,4,28);
 const drops=Array.from({length:DROP_CAPACITY},()=>{const group=new T.Group();root.add(group);const light=new T.MeshBasicMaterial({color:0x77e5d4,transparent:true,opacity:.55}),ring=new T.Mesh(ringGeo,light);ring.rotation.x=-Math.PI/2;ring.position.y=.025;ring.raycast=()=>{};group.add(ring);group.visible=false;return {group,ring,light,model:null,primary:-1,x:0,y:0,z:0,active:false,serial:0};});
 const badge=document.createElement('div');badge.className='weapon-drop-hint';badge.hidden=true;const style=document.createElement('style');style.textContent='.weapon-drop-hint{position:fixed;z-index:9;left:50%;top:196px;transform:translateX(-50%);max-width:85vw;pointer-events:none;padding:6px 12px;color:#dcfff3;background:#10352de8;border-left:2px solid #99f1c8;font:11px/1.4 sans-serif}.weapon-drop-hint[hidden]{display:none}@media(max-width:600px){.weapon-drop-hint{top:198px;font-size:10px}}';document.head.append(style);document.body.append(badge);
 let serial=0,attempted=new WeakSet();const sightPoint=new T.Vector3();
 const nearest=()=>nearestWeaponDrop(drops,camera.position,loadout.state.primary,d=>hasSight(sightPoint.set(d.x,d.y+.23,d.z)));
 function drop(enemy){
  const primary=droppedPrimary(enemy),p=enemy?.group?.position;
  if(primary===null||!p||![p.x,p.y,p.z].every(Number.isFinite)||attempted.has(enemy))return false;
  attempted.add(enemy);if(!shouldDropWeapon(enemy,random()))return false;
  const d=drops.find(d=>!d.active)||drops.reduce((a,b)=>a.serial<b.serial?a:b);
  if(d.primary!==primary||!d.model){if(d.model)d.group.remove(d.model);d.model=models.create(primary);d.group.add(d.model);d.light.color.setHex(weaponDisplay(primary).color);}
  Object.assign(d,{primary,x:p.x,y:p.y,z:p.z,active:true,serial:++serial});d.group.position.set(d.x,d.y,d.z);d.group.rotation.y=serial*.7;d.group.visible=true;return true;
 }
 function pick(){const d=nearest();if(!d)return false;if(isBusy()){notify('等待当前武器动作完成后再拾取');return false;}if(!loadout.equip(d.primary)){notify('当前装备配置只读，不能替换');return false;}d.active=false;d.group.visible=false;onEquip(d.primary);notify('已拾取 '+weapons[d.primary].name+' // 替换主武器 · 原武器库存保留 · 不补弹');return true;}
 function reset(){serial=0;attempted=new WeakSet();for(const d of drops){d.active=false;d.group.visible=false;}badge.hidden=true;}
 return {drop,pick,reset,render(playing){root.visible=playing;const d=playing?nearest():null;badge.hidden=!d||isNoticeVisible();if(d)badge.textContent='F 拾取 '+weapons[d.primary].name+' · 替换主武器，不补弹';},snapshot:()=>drops.filter(d=>d.active).map(({primary,x,y,z,serial})=>({primary,x,y,z,serial}))};
}
