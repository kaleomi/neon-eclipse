// Compare feet, not the camera eye, to avoid calling a same-floor guard "below".
export function radarHeight(enemyFeet,playerEye){
 if(!Number.isFinite(enemyFeet)||!Number.isFinite(playerEye))return 'same';
 const delta=enemyFeet-(playerEye-1.7);return delta>.8?'above':delta<-.8?'below':'same';
}
export function drawRadarEnemy(ctx,x,y,r,layer){
 ctx.beginPath();
 if(layer==='same')ctx.arc(x,y,r,0,Math.PI*2);
 else {const sign=layer==='above'?-1:1;ctx.moveTo(x,y+sign*(r+1));ctx.lineTo(x-r,y-sign*r);ctx.lineTo(x+r,y-sign*r);ctx.closePath();}
 ctx.fill();
}
