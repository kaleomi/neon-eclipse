// One set of local vector contours drives both the HUD and the 3D supply marks.
// Three cartridges are a decorative ammunition symbol, not a magazine-capacity display.
const freezeContours = contours => Object.freeze(contours.map(points => Object.freeze(points.map(point => Object.freeze(point)))));
const cartridge = [[8,2],[13,8],[15,15],[15,44],[1,44],[1,15],[3,8]];
const rim = [[0,47],[16,47],[16,51],[0,51]];
const ammo = [2,26,50].flatMap(x => [cartridge, rim].map(points => points.map(([px,py]) => [px+x,py])));
const health = [[[29,10],[39,10],[39,22],[51,22],[51,32],[39,32],[39,44],[29,44],[29,32],[17,32],[17,22],[29,22]]];
export const SUPPLY_SYMBOLS = Object.freeze({
  health: Object.freeze({name:'医疗补给',color:'#ff4f60',width:68,height:54,contours:freezeContours(health)}),
  ammo: Object.freeze({name:'弹药补给',color:'#ffd18a',width:68,height:54,contours:freezeContours(ammo)})
});
export function supplySymbolSVG(type, className = '') {
  const symbol = SUPPLY_SYMBOLS[type];
  if (!symbol) throw new Error('Unknown supply symbol');
  const safeClass = className.replace(/[^a-zA-Z0-9_\- ]/g, '');
  return `<svg class="${safeClass}" viewBox="0 0 ${symbol.width} ${symbol.height}" data-supply-symbol="${type}" aria-hidden="true" focusable="false">${symbol.contours.map(points => `<polygon points="${points.map(point => point.join(',')).join(' ')}" fill="currentColor"/>`).join('')}</svg>`;
}
