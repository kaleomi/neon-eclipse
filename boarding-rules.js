export function boardingStatus(time){
 const t=((time%36)+36)%36;
 if(t<3)return {dock:'ground',remaining:3-t};
 if(t>=7&&t<10)return {dock:'upper',remaining:10-t};
 if(t>=18&&t<21)return {dock:'far',remaining:21-t};
 if(t>=33)return {dock:'ground',remaining:39-t};
 return {dock:null,remaining:0};
}
export function mayCloseBoardingGate(player,feet,gate){
 return !(Math.abs(player.x-gate.x)<gate.w/2+.45&&Math.abs(player.z-gate.z)<gate.d/2+.45&&feet<gate.top&&feet+1.8>gate.bottom);
}
