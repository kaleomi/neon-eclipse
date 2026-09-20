import {weaponName} from '../weapon-display.js';
// Stable identity; legacyIndex preserves numeric controls and historical records.
export default Object.freeze({id:'breacher',category:'secondary',legacyIndex:1,combat:Object.freeze({name:weaponName(1),cap:8,reserve:48,delay:.32,damage:19,pellets:8,spread:.09,range:28,reload:.55,perShell:true,automatic:true,kick:.055,headMultiplier:1.25,falloffStart:7,minimumDamage:.35})});
