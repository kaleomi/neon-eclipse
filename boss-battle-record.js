export function createBossBattleRecord(){
 let data;
 const fresh=()=>({status:'idle',seconds:0,windows:0,shots:[0,0,0],melee:0,arcDamage:0,coreDamage:0,nodeDamage:0,loadout:null});
 function clear(){data=fresh();}
 function start(name,{damageLabel}={}){clear();data.status='active';if(typeof name==='string'&&name)data.name=name;if(typeof damageLabel==='string'&&damageLabel)data.damageLabel=damageLabel;}
 function tick(dt){if(data.status==='active'&&Number.isFinite(dt)&&dt>0)data.seconds+=dt;}
 function shot(index){if(data.status!=='active')return;if(Number.isInteger(index)&&index>=0&&index<3)data.shots[index]++;else if(index===3)data.melee++;else if(index===4)data.tempestShots=(data.tempestShots||0)+1;else if(index===5)data.haloShots=(data.haloShots||0)+1;else if(index===6)data.railspikeShots=(data.railspikeShots||0)+1;else if(index===7)data.voltShots=(data.voltShots||0)+1;}
 function hit(damage,core,opened=false){if(data.status!=='active')return;if(Number.isFinite(damage)&&damage>0)data[core?'coreDamage':'nodeDamage']+=damage;if(opened)data.windows++;}
 function hurt(amount){if(data.status==='active'&&Number.isFinite(amount)&&amount>0)data.arcDamage+=amount;}
 function finish(status,loadout){if(data.status!=='active'||!['won','lost'].includes(status))return;data.status=status;data.loadout=loadout?JSON.parse(JSON.stringify(loadout)):null;}
 clear();return {clear,start,tick,shot,hit,hurt,finish,get summary(){return JSON.parse(JSON.stringify(data));}};
}
export function formatBossBattleRecord(data){
 if(!data||data.status==='idle')return '';
 const seconds=Math.floor(data.seconds),state={active:'进行中',won:'已击破',lost:'本次失败'}[data.status];
 const lines=[`${data.name||'枢纽监察者'} / ${state} · ${Math.floor(seconds/60)}分${seconds%60}秒`,
 `核心暴露 ${data.windows} 轮 · 核心伤害 ${Math.round(data.coreDamage)} · 节点伤害 ${Math.round(data.nodeDamage)}`,
 `战斗期间开火：步枪 ${data.shots[0]} 发 / 霰弹 ${data.shots[1]} 发 / 手枪 ${data.shots[2]} 发 · 近战挥击 ${data.melee} 次`,
 `${data.damageLabel||'Boss 电弧'}实际扣血 ${Math.round(data.arcDamage)}（不含守卫与环境伤害）`];
 if(data.voltShots!==undefined)lines.push(`雷霆电弧霰弹枪 电弧霰弹开火 ${data.voltShots} 发`);
 if(data.loadout?.volt)lines.push(`雷霆电弧霰弹枪 剩余弹药 ${data.loadout.volt.rounds+data.loadout.volt.reserve}`);
 if(data.railspikeShots!==undefined)lines.push(`磁轨穿透枪 磁轨开火 ${data.railspikeShots} 发`);
 if(data.loadout?.railspike)lines.push(`磁轨穿透枪 剩余弹药 ${data.loadout.railspike.rounds+data.loadout.railspike.reserve}`);
 if(data.haloShots!==undefined)lines.push(`光环精准步枪 精准步枪开火 ${data.haloShots} 发`);
 if(data.loadout?.halo)lines.push(`光环精准步枪 剩余弹药 ${data.loadout.halo.rounds+data.loadout.halo.reserve}`);
 if(data.tempestShots!==undefined)lines.push(`风暴冲锋枪 冲锋枪开火 ${data.tempestShots} 发`);
 if(data.loadout?.tempest)lines.push(`冲锋枪剩余弹药 ${data.loadout.tempest.rounds+data.loadout.tempest.reserve}`);
 if(data.loadout){const l=data.loadout;lines.push(`记录时生命 ${Math.ceil(l.health)} · 剩余弹药（弹匣+备用）：${l.rounds.map((r,i)=>r+l.reserves[i]).join(' / ')}`);}
 lines.push('仅本次尝试；暂停不计时。开火数包含对守卫、节点及未命中的射击。');
 return lines.join('\n');
}
