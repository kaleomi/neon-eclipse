// Player-facing labels only. Weapon/save identifiers and numeric slots remain unchanged.
const rows = [
 ['vanguard','先锋突击步枪','突击步枪','rifle',0x83e3c2],
 ['breacher','破门霰弹枪','自动霰弹枪','shotgun',0xffba79],
 ['ghost','幽灵消音手枪','消音手枪','pistol',0x9bc4ed],
 ['arc-blade','电弧战刃','近战战刃','blade',0x7cebdc],
 ['tempest','风暴冲锋枪','机动冲锋枪','smg',0xf2cf69],
 ['halo','光环精准步枪','三连发精准步枪','burst',0xc8e5a2],
 ['railspike','磁轨穿透枪','蓄力磁轨枪','rail',0xc3a4fb],
 ['volt','雷霆电弧霰弹枪','链电霰弹枪','arc',0x69dce9],
 ['pulse','重型脉冲炮','脉冲重炮','pulse',0x8bd7ff],
 ['cinder','灰烬榴弹炮','榴弹炮','grenade',0xffa25a],
 ['lance','光矛穿甲炮','穿甲重炮','lance',0x99eaff],
 ['breaker','破阵重锤','近战重锤','hammer',0xcbb0ff]
];
export const WEAPON_DISPLAY = Object.freeze(rows.map(([id,name,kind,family,color],index)=>Object.freeze({index,id,name,kind,family,color})));
const unknown=Object.freeze({index:-1,id:'unknown',name:'未知武器',kind:'未知类型',family:'rifle',color:0x9caeb7});
export const weaponDisplay=index=>Number.isInteger(index)?WEAPON_DISPLAY[index]||unknown:unknown;
export const weaponName=index=>weaponDisplay(index).name;
