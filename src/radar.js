import {radarHeight,drawRadarEnemy} from './radar-height.js';
import {MAP} from './level.js';
import { ARENA } from './arena.js';
export function createRadar(obstacles){
 const panel=document.createElement('aside');panel.className='tactical-radar';panel.setAttribute('aria-label','战术地图：青色为玩家；敌人上三角在高处，下三角在低处，圆点同层');
 panel.style.cssText='position:fixed;left:3vw;bottom:155px;z-index:3;width:160px;padding:9px;background:#061822d9;border:1px solid #54898f66;pointer-events:none;font:9px monospace;color:#86b8c2;letter-spacing:.1em';
 panel.innerHTML='<div style="margin-bottom:7px">'+MAP.radarLabel+'</div>';
 const canvas=document.createElement('canvas');canvas.width=140;canvas.height=140;canvas.style.cssText='width:140px;height:140px';panel.append(canvas);document.body.append(panel);
 const legend=document.createElement('div');legend.style.cssText='margin-top:6px;line-height:1.5;letter-spacing:0;color:#d0e6e6';legend.textContent='▲ 高处 · ● 同层 · ▼ 低处';panel.append(legend);
 const ctx=canvas.getContext('2d'),scale=140/ARENA.size,px=x=>(x+ARENA.half)*scale;let timer=0;
 function update(dt,playing,player,yaw,enemies,bolts,objective=null,supplies=[]){
  panel.hidden=!playing||innerWidth<1100||innerHeight<750;if(panel.hidden)return;
  timer-=dt;if(timer>0)return;timer=.12;
  ctx.fillStyle='#07141c';ctx.fillRect(0,0,140,140);ctx.strokeStyle='#203b46';ctx.lineWidth=1;
  for(let i=0;i<=140;i+=35){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,140);ctx.moveTo(0,i);ctx.lineTo(140,i);ctx.stroke();}
  ctx.fillStyle='#536570';for(const o of obstacles){if(o.hiddenArea||(o.top===0&&(o.bottom??0)<0))continue;ctx.fillRect(px(o.x-o.w/2),px(o.z-o.d/2),o.w*scale,o.d*scale);}
  for(const supply of supplies){ctx.fillStyle=supply.type==='health'?'#77f8b5':'#efc075';ctx.fillRect(px(supply.x)-1.5,px(supply.z)-1.5,3,3);}
  if(objective){ctx.strokeStyle='#ffe0a2';ctx.lineWidth=2;ctx.strokeRect(px(objective.x)-4,px(objective.z)-4,8,8);}
  const counts={above:0,same:0,below:0};for(const e of enemies){const layer=radarHeight(e.group.position.y??0,player.y);counts[layer]++;ctx.fillStyle=layer==='below'?'#c59bff':'#ff8f58';drawRadarEnemy(ctx,px(e.group.position.x),px(e.group.position.z),e.boss?4:2.5,layer);}
  legend.textContent=`▲ 高处 ${counts.above} · ● 同层 ${counts.same} · ▼ 低处 ${counts.below}`;
  ctx.fillStyle='#ffdad3';for(const b of bolts)ctx.fillRect(px(b.x)-1,px(b.z)-1,2,2);
  ctx.save();ctx.translate(px(player.x),px(player.z));ctx.rotate(-yaw);ctx.fillStyle='#8affec';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(4,4);ctx.lineTo(0,2);ctx.lineTo(-4,4);ctx.closePath();ctx.fill();ctx.restore();
 }
 return {update};
}
