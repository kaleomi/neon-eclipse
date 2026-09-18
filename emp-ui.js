export function createEmpUI(){
 const root=document.createElement('section');root.className='emp-status';root.hidden=true;root.setAttribute('aria-label','EMP 投掷物');root.innerHTML='<b></b><span></span>';document.body.append(root);
 return {update(playing,emp){root.hidden=!playing;if(!playing)return;root.dataset.aiming=String(emp.aiming);root.querySelector('b').textContent='EMP / '+emp.charges+' · '+(emp.aiming?'松开 G 投掷':emp.active?'引信 '+emp.remaining.toFixed(1)+'s':'按住 G 预览');root.querySelector('span').textContent=emp.aiming?'6m 球形范围 · 实体掩体阻隔 · 切枪取消':'炮塔 / 两类蜂群失能 3s · 无伤害，不影响纯刀';}};
}
