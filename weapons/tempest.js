import {weaponName} from '../weapon-display.js';
// First non-legacy weapon: runtime slot 5, never changes the historical 1–4 IDs.
export default Object.freeze({id:'tempest',category:'primary',combat:Object.freeze({name:weaponName(4),cap:36,reserve:180,delay:.065,damage:16,pellets:1,spread:.016,range:42,reload:1.5,automatic:true,kick:.008,headMultiplier:1.55,falloffStart:14,minimumDamage:.35,movementPenalty:.04,sprintReload:true})});
