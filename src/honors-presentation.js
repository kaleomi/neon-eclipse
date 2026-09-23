// Read-only view helpers. Counts describe saved honor TYPES within the selected chapter scope.
const element=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;};
export function renderHonorOverview(host,{rows,error,scope}){
 host.replaceChildren();host.dataset.state=error?'unavailable':'ready';
 const copy=element('div','honor-overview-copy');
 copy.append(element('small','honor-kicker','SAVED HONORS / 历史荣誉'),element('h4','',error?'历史记录暂不可用':scope));
 copy.append(element('p','',error?'无法判断已获得或未获得状态。原记录保持不变。':'只统计已成功保存的荣誉类型；本轮挑战进度在下方单独显示。'));
 const count=element('div','honor-overview-count');
 const earned=rows.filter(row=>row.unlocked).length;
 count.append(element('strong','',error?'—':String(earned)),element('span','',error?'等待读取':`/ ${rows.length} 类已获得`));
 host.append(copy,count);
 if(!error){const progress=element('progress','honor-overview-progress');progress.max=Math.max(1,rows.length);progress.value=earned;progress.setAttribute('aria-label',scope+'已保存荣誉类型');host.append(progress);}
}
export function honorHeading(achievement,title,badge){
 const heading=element('div','honor-card-heading'),state=element('span','honor-state',achievement.unlocked?'✓ 已获得':'○ 未获得');
 heading.append(badge,title,state);return heading;
}
