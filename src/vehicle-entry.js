// Navigation policy is separate from rendering and never writes campaign saves.
export function vehicleEntryDecision(session={}){
  if(session.pending)return {allowed:false,message:'请先保存本章结果，再进入驾驶试验区。'};
  return {allowed:true,title:'进入海陆空联合试验区？',description:session.state==='paused'?'当前战斗将离开，本轮一命／纯刀资格不会保留，只能从最近阶段入口继续。已保存战役、星星和荣誉不变。驾驶试验独立运行，不保存本轮位置。':'独立海陆空载具试验，不属于第七章。原六章存档不变，试验区位置与路线计时在退出或刷新后重置。'};
}
