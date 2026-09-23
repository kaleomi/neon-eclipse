// Chapter-two visual treatment only; reuses existing canvases/materials and collision geometry.
export const STATION_CONTROL_IDLE=0x71828b;
export function drawStationTiles(c,w,h){
 c.fillStyle='#71868a';c.fillRect(0,0,w,h);
 for(let i=0;i<900;i++){c.fillStyle=i%3?'#74898d':'#697e83';c.fillRect((i*73)%w,(i*109)%h,2,1);}
 // Large matte slabs, recessed joints and a restrained edge bevel; no directional navigation marks.
 for(const x of [0,w/2])for(const y of [0,h/2]){
  c.strokeStyle='#40565e';c.lineWidth=3;c.strokeRect(x+1.5,y+1.5,w/2-3,h/2-3);
  c.strokeStyle='#91a4a7';c.lineWidth=1;c.strokeRect(x+4,y+4,w/2-8,h/2-8);
 }
}
export function drawStationSign(c,title,sub,w=768,h=192){
 c.fillStyle='#081b25';c.fillRect(0,0,w,h);
 c.fillStyle='#dcb276';c.fillRect(0,0,12,h);
 c.fillStyle='#203d48';c.fillRect(28,h-18,w-56,2);
 c.fillStyle='#e4eeeb';c.font='bold 56px sans-serif';c.fillText(title,34,84);
 c.fillStyle='#a9c8cd';c.font='24px monospace';c.fillText(sub,36,142);
 // Familiar transit wayfinding frame; the original wording/direction stays authoritative.
 c.fillStyle='#dcb276';c.fillRect(w-74,20,42,5);
}
export function refineStationMaterials({wall,floor,train,ivory,black,orange,seat}){
 wall.color.setHex(0x435b69);wall.roughness=.82;wall.metalness=.12;
 floor.color.setHex(0x96a8aa);floor.roughness=.88;floor.metalness=.08;
 train.color.setHex(0x23515c);train.roughness=.46;train.metalness=.52;
 ivory.color.setHex(0xb5c2bd);ivory.roughness=.4;ivory.metalness=.48;
 black.color.setHex(0x14252e);black.roughness=.76;
 orange.color.setHex(0xd6a263);orange.roughness=.68;
 seat.color.setHex(0x654e48);seat.roughness=.92;seat.metalness=0;
}
export function refineDispatchMaterials({steel,bronze,railMat}){
 steel.color.setHex(0x294752);steel.roughness=.68;
 bronze.color.setHex(0xb18d5d);bronze.roughness=.58;
 railMat.color.setHex(0x8ca5ad);railMat.metalness=.68;railMat.roughness=.38;
}
