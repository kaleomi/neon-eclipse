import * as T from '../node_modules/three/build/three.module.js';

const EDITIONS=[
 {title:'恒星之心',sub:'THE ART OF CONTAINMENT',tag:'FUSION / 01',color:'#87ddd5',kind:'core'},
 {title:'让能量流动',sub:'EVERY NODE. ONE NETWORK.',tag:'ENERGY / 02',color:'#edba82',kind:'grid'},
 {title:'保持冷静',sub:'BALANCE BELOW THE SURFACE',tag:'THERMAL / 03',color:'#99c8ec',kind:'flow'},
 {title:'连接下一刻',sub:'A SIGNAL BEYOND THE HORIZON',tag:'SIGNAL / 04',color:'#c1acd9',kind:'orbit'}
];
export function createTechPoster(index){
 const e=EDITIONS[index%EDITIONS.length],canvas=document.createElement('canvas');canvas.width=640;canvas.height=896;
 const c=canvas.getContext('2d'),bg=c.createLinearGradient(0,0,640,896);bg.addColorStop(0,'#102a35');bg.addColorStop(1,'#08141e');c.fillStyle=bg;c.fillRect(0,0,640,896);
 c.strokeStyle='#233d48';c.lineWidth=1;
 for(let x=40;x<640;x+=40){c.beginPath();c.moveTo(x,160);c.lineTo(x,716);c.stroke();}
 for(let y=160;y<=716;y+=40){c.beginPath();c.moveTo(40,y);c.lineTo(600,y);c.stroke();}
 c.fillStyle=e.color;c.fillRect(40,40,34,6);c.font='15px monospace';c.fillText('NEON / RESEARCH DIVISION',90,52);c.fillStyle='#7f9ba7';c.fillText(e.tag,40,104);
 const line=(points,color=e.color,width=3)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
 const ring=(x,y,r,width=2,color=e.color)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();};
 c.save();c.beginPath();c.rect(40,148,560,546);c.clip();
 if(e.kind==='core'){
  for(const r of [68,116,177,220])ring(320,414,r,r===116?8:2,r===220?'#355661':e.color);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;line([[320+Math.cos(a)*133,414+Math.sin(a)*133],[320+Math.cos(a)*166,414+Math.sin(a)*166]],e.color,5);}
  c.fillStyle=e.color;c.beginPath();c.moveTo(320,353);c.lineTo(363,414);c.lineTo(320,475);c.lineTo(277,414);c.closePath();c.fill();
  line([[40,414],[196,414]],'#76919d',1);line([[444,414],[600,414]],'#76919d',1);
 }else if(e.kind==='grid'){
  const nodes=[[120,250],[320,220],[520,270],[205,400],[440,430],[100,572],[320,590],[532,600]];
  for(const [a,b] of [[0,1],[1,2],[0,3],[1,3],[1,4],[2,4],[3,4],[3,5],[3,6],[4,6],[4,7],[5,6],[6,7]])line([nodes[a],nodes[b]],'#698184',2);
  nodes.forEach(([x,y],i)=>{ring(x,y,i===3?37:20,2);c.fillStyle=e.color;c.fillRect(x-5,y-5,10,10);});
  line([[120,250],[205,400],[320,590],[532,600]],e.color,6);
 }else if(e.kind==='flow'){
  for(let j=0;j<13;j++){const points=[];for(let x=25;x<620;x+=4)points.push([x,290+j*21+Math.sin(x*.013+j*.22)*62]);line(points,j%3?'#588497':e.color,j%3?2:4);}
  ring(320,420,166,2);line([[320,204],[320,250]],e.color,3);line([[320,590],[320,640]],e.color,3);
 }else{
  ring(320,414,64,3);c.save();c.translate(320,414);c.rotate(-.55);
  for(const r of [120,180,240]){c.strokeStyle=r===180?e.color:'#547281';c.lineWidth=r===180?5:2;c.beginPath();c.ellipse(0,0,r,r*.5,0,0,Math.PI*2);c.stroke();}c.restore();
  c.fillStyle=e.color;for(const [x,y,r]of [[320,414,12],[451,310,15],[129,455,7]]){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
  for(let i=0;i<26;i++){const x=65+(i*83)%510,y=190+(i*67)%430;c.fillStyle='#8da4b3';c.fillRect(x,y,2,2);}
 }
 c.restore();
 c.fillStyle=e.color;c.font='bold 48px sans-serif';c.fillText(e.title,40,758);
 c.fillStyle='#c2d2d8';c.font='17px monospace';c.fillText(e.sub,42,794);
 c.fillStyle='#4c6570';c.fillRect(40,825,560,1);c.font='12px monospace';c.fillText('SCIENCE FOR A BRIGHTER TOMORROW',40,852);c.fillStyle=e.color;c.fillText(String(index+1).padStart(2,'0'),574,852);
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
 const frame=new T.Group();frame.name=`reactor-tech-poster-${index+1}`;
 const backing=new T.Mesh(new T.BoxGeometry(3.32,4.6,.08),new T.MeshStandardMaterial({color:0x182934,metalness:.55,roughness:.45}));frame.add(backing);
 const face=new T.Mesh(new T.PlaneGeometry(3.2,4.48),new T.MeshBasicMaterial({map,toneMapped:false}));face.position.z=.045;frame.add(face);
 return frame;
}
