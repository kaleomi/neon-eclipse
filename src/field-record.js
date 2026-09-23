export function createFieldRecord(){
 let records=[],current=null;
 function begin(stage){if(current&&!current.seconds&&!current.shots&&!current.damage&&!current.windows&&!current.death)records.pop();current={stage,seconds:0,damage:0,shots:0,coreHits:0,windows:0,usedWindows:0,death:null};records.push(current);if(records.length>100)records.shift();}
 begin(0);
 return {begin,tick(dt,stage){if(current.stage!==stage)begin(stage);current.seconds+=Math.max(0,dt);},hurt(n){current.damage+=Math.max(0,n);},shot(){current.shots++;},window(){current.windows++;},coreHit(enemy){current.coreHits++;if(!enemy.fieldWindowUsed){enemy.fieldWindowUsed=true;current.usedWindows++;}},die(p){current.death={x:Math.round(p.x),z:Math.round(p.z),feet:Math.round((p.y-1.7)*10)/10};},get records(){return records.map(r=>({...r,death:r.death?{...r.death}:null}));}};
}
