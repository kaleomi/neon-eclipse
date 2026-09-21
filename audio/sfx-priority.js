// Admission reservation only: no volume, cooldown, distance or recipe changes.
// Ordinary events stop entering at 20 total active voices; critical events may use all 24.
// This bounds work without cutting an already playing sound or queuing a stale warning.
export const RESERVED_CRITICAL_VOICES=4;
export const CRITICAL_SFX=Object.freeze([
 'telegraph.blue','telegraph.orange','telegraph.purple','telegraph.amber','telegraph.pink','telegraph.gold','telegraph.green',
 'boss.phase','boss.window.open','boss.window.close','elite.vent',
 'tether.pulse.warn','abyss.discharge.warn','glacier.shell.warn',
 'player.hazard','player.hurt.low','player.heartbeat','vehicle.stall','warmth.low','ice.crack'
]);
const critical=new Set(CRITICAL_SFX);
export const isCriticalSfx=name=>critical.has(name);
