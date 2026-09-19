// Minimal i18n scaffold. Dictionaries are flat key → string; `t(key, vars)` falls back to zh-CN then key.
// Coverage is intentionally partial (menu chrome + new settings panels); gameplay copy stays zh-CN in source.
import {ZH_CN} from './zh-CN.js';
import {EN} from './en.js';
export const LOCALE_KEY='neon-eclipse.locale.v1';
export const LOCALES=Object.freeze({'zh-CN':ZH_CN,'en':EN});
export const LOCALE_LABELS=Object.freeze({'zh-CN':'简体中文','en':'English'});
export function sanitizeLocale(value){return typeof value==='string'&&LOCALES[value]?value:'zh-CN';}
export function detectLocale(languages=[]){for(const l of languages){if(typeof l!=='string')continue;if(l.toLowerCase().startsWith('zh'))return 'zh-CN';if(l.toLowerCase().startsWith('en'))return 'en';}return 'zh-CN';}
export function format(template,vars){return vars?String(template).replace(/\{(\w+)\}/g,(m,k)=>k in vars?String(vars[k]):m):String(template);}
export function createI18n({storage=null,languages=[],doc=globalThis.document}={}){
 let locale='zh-CN';
 try{const saved=storage?.getItem(LOCALE_KEY);locale=saved?sanitizeLocale(saved):detectLocale(languages);}catch{}
 const listeners=new Set();
 function t(key,vars){const dict=LOCALES[locale];const s=dict[key]??ZH_CN[key]??key;return format(s,vars);}
 function apply(root=doc){
  if(!root)return 0;let n=0;
  for(const el of root.querySelectorAll('[data-i18n]')){const key=el.dataset.i18n;if(!(key in ZH_CN))continue;el.textContent=t(key);n++;}
  for(const el of root.querySelectorAll('[data-i18n-attr]')){for(const pair of el.dataset.i18nAttr.split(';')){const [attr,key]=pair.split(':');if(attr&&key&&key in ZH_CN){el.setAttribute(attr.trim(),t(key.trim()));n++;}}}
  if(doc?.documentElement)doc.documentElement.lang=locale;
  return n;
 }
 function set(next){const clean=sanitizeLocale(next);if(clean===locale)return locale;locale=clean;try{storage?.setItem(LOCALE_KEY,locale);}catch{}apply();for(const fn of listeners)fn(locale);return locale;}
 return {t,apply,set,get locale(){return locale;},has(key){return key in ZH_CN;},missing(){return Object.keys(ZH_CN).filter(k=>!(k in EN));},onChange(fn){listeners.add(fn);return ()=>listeners.delete(fn);}};
}
