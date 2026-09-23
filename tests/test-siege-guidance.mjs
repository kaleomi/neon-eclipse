import assert from 'node:assert/strict';
import {createSiegeUI} from '../src/siege-ui.js';
import {createSiegeBoss} from '../src/siege-rules.js';
import {SKYHOOK,LEVIATHAN} from '../src/siege-data.js';
const elements=[];
globalThis.document={createElement(){const e={style:{},dataset:{},append(){},remove(){}};elements.push(e);return e;},body:{append(){}}};
for(const c of [SKYHOOK,LEVIATHAN]){
 const first=elements.length,ui=createSiegeUI(c),rules=createSiegeBoss(c);rules.activate();rules.interact(.6,{id:0,allowed:true,held:true});assert.equal(rules.arena.mode,'operation');
 ui.update(rules,true,{},0,'');const text=elements[first+4].textContent;
 assert(text.includes('前往')&&text.includes('核心'),c.id+' operation must tell player to approach the core');assert(!text.includes('等待'),c.id+' do not spend the transit interval waiting');
 rules.tick(c.operation);assert.equal(rules.state.phase,'exposed');ui.update(rules,true,{},0,'');assert(elements[first+4].textContent.includes('核心暴露'));assert.equal(rules.state.timer,c.window);ui.dispose();
 console.log('PASS',c.id,'operation routing prompt, exposure prompt and unchanged window');
}

{
 const first=elements.length,ui=createSiegeUI(SKYHOOK),rules=createSiegeBoss(SKYHOOK);rules.activate();
 const text=()=>elements[first+4].textContent;
 ui.update(rules,true,{},0,'',1.5);assert(text().includes('左侧楼梯上楼'),'cabin player needs a roof access route');
 ui.update(rules,true,{},0,'',4.5);assert(!text().includes('左侧楼梯'),'same-floor player does not need a stairs instruction');
 rules.interact(.6,{id:0,allowed:true,held:true});rules.tick(SKYHOOK.operation);rules.hit(800,4.5);rules.tick(SKYHOOK.transition);
 ui.update(rules,true,{},0,'',4.5);assert(text().includes('左侧楼梯下楼'),'roof player needs a cabin access route after transition');
 ui.update(rules,true,{},0,'',1.5);assert(!text().includes('左侧楼梯'),'clear the instruction on arrival');
 ui.update(rules,false,{},0,'',4.5);assert(ui.panel.hidden);ui.dispose();
 console.log('PASS skyhook floor-specific ascent/descent guidance, arrival clearing and pause hiding');
}
