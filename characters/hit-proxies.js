// Keep logical mesh visibility for direct rays, melee and reflected-projectile filtering.
// Clone draw materials instead of changing global/shared materials or the hit geometry.
export function hideProxyDraw(group,meshes,marker='artProxy',owned=group.userData.ownedMaterials){
 const materials=new Map();for(const o of meshes){if(!o?.isMesh||o.userData.combatDecoration)continue;
  if(o.userData.artProxy){o.userData[marker]=true;continue;}
  const hide=m=>{if(!materials.has(m)){const copy=m.clone();copy.visible=false;materials.set(m,copy);}return materials.get(m);};
  o.material=Array.isArray(o.material)?o.material.map(hide):hide(o.material);o.userData.artProxy=true;o.userData[marker]=true;
 }owned.push(...materials.values());return meshes;
}
