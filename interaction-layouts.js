// Per-chapter placement of the two shared interactions. Validated against solids, authored trials and every stage/defense spawn
// exclusion in test-interaction-layouts.mjs; do not move without re-running it.
// vent: {x,z} console, zone: centre of the steam cloud. light: {x,z} switch. y is the floor height (train cars sit at 1.5).
export const INTERACTION_LAYOUTS=Object.freeze({
 reactor:{theme:'冷却剂排气阀 / 反应堆走廊照明',vent:{x:-5,z:21,zone:{x:-0.8,z:25.2}},light:{x:5,z:21}},
 station:{theme:'月台蒸汽阀 / 站台照明',vent:{x:-22,z:-3,zone:{x:-16.5,z:-0.7}},light:{x:-28,z:12}},
 roof:{theme:'空调排风阀 / 天台泛光灯',vent:{x:-17,z:33,zone:{x:-11,z:33}},light:{x:-17,z:27}},
 tower:{theme:'机房冷却排气 / 设备层照明',vent:{x:-8,z:18,zone:{x:-13.5,z:15.7}},light:{x:-3,z:17}},
 train:{theme:'车厢制动排气 / 车厢照明',vent:{x:-2.5,z:-31,y:1.5,zone:{x:2.5,z:-27,y:1.5}},light:{x:-2.5,z:13,y:1.5}},
 harbor:{theme:'消防雾化炮 / 码头探照灯',vent:{x:-16,z:31,zone:{x:-10,z:31}},light:{x:-16,z:25}},
 orbital:{theme:'基座氮气排放 / 基座照明',vent:{x:-8,z:21,zone:{x:-2.5,z:23.3}},light:{x:7,z:20}},
 datacenter:{theme:'机柜冷却喷淋 / 机房照明',vent:{x:-10,z:31,zone:{x:-4,z:31}},light:{x:16,z:31}},
 polar:{theme:'融雪蒸汽阀 / 雷达站照明',vent:{x:-16,z:15,zone:{x:-20.2,z:19.2}},light:{x:-13,z:21}}
});
