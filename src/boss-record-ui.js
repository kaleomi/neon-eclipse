import {formatBossBattleRecord} from './boss-battle-record.js';
export function createBossRecordUI(parent){
 const panel=document.createElement('section');panel.id='boss-battle-record';panel.hidden=true;
 panel.style.cssText='white-space:pre-line;text-align:left;font:12px/1.7 sans-serif;color:#d7eee9;border-left:3px solid #ffbd75;background:#0b2530;padding:12px 16px;margin:12px 0;max-height:180px;overflow:auto';
 const anchor=parent.querySelector('#brief');anchor.after(panel);
 return {clear(){panel.hidden=true;panel.textContent='';},show(data){panel.textContent=formatBossBattleRecord(data);panel.hidden=!panel.textContent;}};
}
