import assert from 'node:assert/strict';
import {createI18n,detectLocale,sanitizeLocale,format,LOCALES,LOCALE_KEY} from '../i18n/index.js';
import {ZH_CN} from '../i18n/zh-CN.js';import {EN} from '../i18n/en.js';
const zh=Object.keys(ZH_CN),en=Object.keys(EN);
assert.deepEqual(zh.filter(k=>!(k in EN)),[],'en missing keys');assert.deepEqual(en.filter(k=>!(k in ZH_CN)),[],'en has orphan keys');
for(const k of zh){assert.ok(ZH_CN[k].trim().length,k);assert.ok(EN[k].trim().length,k);const v=(s)=>(s.match(/\{\w+\}/g)||[]).sort().join();assert.equal(v(ZH_CN[k]),v(EN[k]),'placeholder parity '+k);}
assert.equal(detectLocale(['fr-FR','en-GB']),'en');assert.equal(detectLocale(['zh-TW']),'zh-CN');assert.equal(detectLocale([]),'zh-CN');assert.equal(detectLocale([null,'de']),'zh-CN');
assert.equal(sanitizeLocale('en'),'en');assert.equal(sanitizeLocale('xx'),'zh-CN');assert.equal(format('a {x} {y}',{x:1}),'a 1 {y}');
const mem=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),m};};
let s=mem(),i=createI18n({storage:s,languages:['en-US'],doc:null});
assert.equal(i.locale,'en');assert.equal(i.t('menu.new'),'New Game');assert.equal(i.t('gamepad.connected',{id:'X'}),'Connected: X');assert.equal(i.t('missing.key'),'missing.key');
let n=0;i.onChange(()=>n++);assert.equal(i.set('zh-CN'),'zh-CN');assert.equal(s.m.get(LOCALE_KEY),'zh-CN');assert.equal(i.t('menu.new'),'新游戏');assert.equal(i.set('bogus'),'zh-CN');assert.equal(n,1);
s=mem();s.setItem(LOCALE_KEY,'en');assert.equal(createI18n({storage:s,languages:['zh-CN'],doc:null}).locale,'en','saved beats detected');
assert.deepEqual(i.missing(),[]);assert.equal(Object.keys(LOCALES).length,2);assert.equal(i.apply(null),0);
// fake DOM apply
const el=(key,attr)=>({dataset:attr?{i18nAttr:attr}:{i18n:key},textContent:'',attrs:{},setAttribute(a,v){this.attrs[a]=v;}});
const e1=el('menu.settings'),e2=el(null,'aria-label:menu.new; title:settings.title'),e3=el('nope');
const root={querySelectorAll:sel=>sel==='[data-i18n]'?[e1,e3]:[e2]};
i.set('en');assert.equal(i.apply(root),3);assert.equal(e1.textContent,'Settings');assert.equal(e2.attrs['aria-label'],'New Game');assert.equal(e2.attrs.title,'Settings');assert.equal(e3.textContent,'');
console.log('PASS: i18n parity '+zh.length+' keys, detect/persist/apply');
