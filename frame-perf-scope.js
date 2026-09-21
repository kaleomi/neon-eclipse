import {FRAME_STATS_MAX_SAMPLES,validFramePerf} from './frame-stats.js';
// Read-only explanation of the current sampler. Old/custom records do not carry their sampling policy.
export function framePerfScopeText(records,{unavailable=false}={}){
 if(unavailable)return '帧时序暂不可读取，无法判断采样覆盖范围；原记录未修改。';
 const list=records.map(r=>r.perf).filter(p=>p&&validFramePerf(p)&&p.frames>0);
 if(!list.length)return '当前筛选无有效帧时序，无法估算采样覆盖范围。旧记录不会补写性能数据。';
 const capped=list.filter(p=>p.frames>FRAME_STATS_MAX_SAMPLES).length;
 const retained=list.reduce((n,p)=>n+Math.min(p.frames,FRAME_STATS_MAX_SAMPLES),0);
 return `${list.length} 条记录含有效帧时序；按当前采样上限估算最多 ${retained.toLocaleString('zh-CN')} 个保留样本。${capped?`${capped} 条记录超过 ${FRAME_STATS_MAX_SAMPLES} 帧，超出部分不参与平均值、百分位或长帧计数。`:'记录帧数未超过当前采样上限。'}历史记录未保存采样策略，不能据此还原完整运行时长。`;
}
