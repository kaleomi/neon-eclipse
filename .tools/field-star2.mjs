
const hid=await import('../hidden-data.js');
console.log('HIDDEN_STARS:',JSON.stringify(hid.HIDDEN_STARS).slice(0,500));
console.log('TOWER_MAZE:',JSON.stringify(hid.TOWER_MAZE).slice(0,300));
console.log('ROOF_STAR_START:',JSON.stringify(hid.ROOF_STAR_START).slice(0,200));
