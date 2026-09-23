import {routeFor,validConfig} from './p4-catalog.js';
export function createP4Session(config,restored=null){
 if(!validConfig(config))throw Error('Invalid P4 configuration');
 const route=routeFor(config);let s={phase:'ready',previous:'playing',elapsed:0,progress:0,routeIndex:0,credits:0,remaining:0,resumed:false,outcome:null};
 if(restored){s.elapsed=Math.max(0,Math.min(86400,restored.seconds||0));s.routeIndex=Math.max(0,Math.min(route.length-1,restored.routeIndex||0));s.progress=Math.max(0,Math.min(100000,restored.progress||0));s.credits=Math.max(0,Math.min(100000,restored.credits||0));s.resumed=true;}
 function finish(outcome){if(s.phase==='finished')return null;s.phase='finished';s.outcome=outcome;return {type:'finish',outcome};}
 function launch(){s.phase='playing';s.remaining=0;return {type:'launch',entry:route[s.routeIndex],progress:s.progress};}
 return {get state(){return {...s};},get entry(){return route[s.routeIndex];},start(){if(!['ready','shop','supply'].includes(s.phase))return null;return launch();},pause(){if(['playing','shop','supply'].includes(s.phase)){s.previous=s.phase;s.phase='paused';return true;}return false;},resume(){if(s.phase!=='paused')return false;s.phase=s.previous;return true;},
  tick(dt,{hits=0}={}){if(!Number.isFinite(dt)||dt<0||dt>86400||!['playing','shop','supply'].includes(s.phase))return null;s.elapsed+=dt;
   if(config.mode==='raid'&&s.elapsed>=480)return finish('lost');
   if(config.mode==='range'&&s.elapsed>=60)return finish(hits>0?'won':'lost');
   if(s.phase==='shop'||s.phase==='supply'){s.remaining=Math.max(0,s.remaining-dt);if(!s.remaining)return launch();}return null;},
  cleared(){if(s.phase!=='playing')return null;
   if(['survival','tower'].includes(config.mode)){s.progress++;s.credits+=40+Math.min(60,s.progress*2);if(config.mode==='survival'&&s.progress>=20)return finish('won');if(config.mode==='tower'&&s.progress%5===0){s.phase='upgrade';return {type:'upgrade'};}s.phase='shop';s.remaining=30;return {type:'shop'};}
   if(['raid','bossrush'].includes(config.mode)){s.progress++;if(s.routeIndex>=route.length-1)return finish('won');s.routeIndex++;s.phase='supply';s.remaining=config.mode==='bossrush'?15:0;return {type:'supply',entry:route[s.routeIndex]};}
   s.progress=['ghost','modifiers'].includes(config.mode)?5:1;return finish('won');},
  buy(cost){if(s.phase!=='shop'||!Number.isFinite(cost)||cost<0||s.credits<cost)return false;s.credits-=cost;return true;},
  upgrade(){if(s.phase!=='upgrade')return false;s.phase='shop';s.remaining=30;return true;},
  extract(){return config.mode==='tower'&&s.progress>0&&['shop','upgrade','paused'].includes(s.phase)?finish('extracted'):null;},
  lose(){return finish('lost');},abandon(){return finish('abandoned');}
 };
}
