// Presentation-only: stats are read from the existing runtime profile, never copied into saves.
const silhouettes = {
  rifle:'M22 57h39l16-15h91l12 9h65v13h-66l-13 9h-39l-8 26h-19l5-26H74L51 87H22Z',
  shotgun:'M20 65h37l22-20h95v9h72v10H145v13H94L66 94H45l10-23H20Z',
  compact:'M37 56h37l11-15h88v12h49v12h-65l-8 15h-29l-4 26H98l-6-29H69L48 88H37Z',
  precision:'M17 62h51l16-16h87l9 8h73v8h-76l-15 11h-40l-8 26H97l4-25H72L45 91H17Z',
  rail:'M16 66h39l28-24h90l13 8h75v7h-71v7h71v7h-78l-17 9h-43l-5 22H98l5-23H72L44 94H16Z',
  arc:'M26 60h45l13-20h82l22 15h47v21h-57l-15 12h-33l-9 20H99l4-24H72L51 96H26Z'
};
const roles = {
  0:['全能突击','中距离持续火力，适合稳步推进。','rifle'],
  1:['近距破门','多弹丸近距离压制；逐发装填，注意射击距离。','shotgun'],
  4:['机动压制','高射速、大弹匣，支持冲刺装填。','compact'],
  5:['精准点射','三连发与低散布，适合有节奏地瞄准射击。','precision'],
  6:['蓄力穿透','单发弹匣，蓄力后攻击一线目标。','rail'],
  7:['近距电弧','近距离散射，电弧可传导至邻近目标。','arc']
};
const tacticalNotes = {
  emp:'电磁干扰，用于应对机械威胁。',
  pulse:'范围爆发，适合打击聚集目标。',
  decoy:'部署诱饵，牵制敌人的注意力。',
  smoke:'生成烟幕，为转移和重新部署创造掩护。'
};
export function deploymentPreview(index, weapon) {
  const [role, description, shape] = roles[index] || ['主武器','按你的行动习惯选择装备。','rifle'];
  return {role,description,shape,capacity:weapon.cap,range:weapon.range,reload:weapon.reload,reloadLabel:weapon.perShell?'单发装填':'换弹时间'};
}
export function weaponSchematic(shape) {
  return `<svg viewBox="0 0 280 128" aria-hidden="true" focusable="false"><path class="weapon-guide" d="M12 112h256M12 108v8m256-8v8M140 14v13m-6-6h12"/><path class="weapon-outline" d="${silhouettes[shape]||silhouettes.rifle}"/><path class="weapon-detail" d="M88 54h66m-63 7h41m-31-20v-8h47v8M130 86h22"/></svg>`;
}
export function mountDeploymentPreview(host, weapons) {
  const primary=host.querySelector('#menu-deploy-primary'),throwable=host.querySelector('#menu-deploy-throwable');
  const find=key=>host.querySelector(`[data-deploy-preview="${key}"]`);
  function update() {
    const index=Number(primary.value),weapon=weapons[index],info=deploymentPreview(index,weapon);
    find('art').innerHTML=weaponSchematic(info.shape);
    find('role').textContent=info.role;
    find('name').textContent=weapon.name;
    find('description').textContent=info.description;
    find('capacity').textContent=String(info.capacity)+' 发';
    find('range').textContent=String(info.range)+' m';
    find('reload-label').textContent=info.reloadLabel;
    find('reload').textContent=String(info.reload)+' s';
    find('tactical').textContent=tacticalNotes[throwable.value]||'';
    find('status').textContent=`出发草稿 · ${weapon.name} / ${throwable.selectedOptions[0].textContent} · 开始游戏后应用`;
  }
  primary.addEventListener('change',update);throwable.addEventListener('change',update);update();
}
