import assert from 'node:assert/strict';
import {DEPLOYMENT_PRIMARIES,validDeployment,deploymentLoadout,deploymentURL,deploymentFromSearch} from '../src/menu-deployment.js';
for(const primary of DEPLOYMENT_PRIMARIES)for(const throwable of ['emp','pulse','decoy','smoke']){
 const value={primary,throwable};assert(validDeployment(value));assert.deepEqual(deploymentFromSearch(deploymentURL(value)),value);
 assert.deepEqual(deploymentLoadout(value),{version:1,primary,secondary:2,melee:3,throwable});
}
for(const value of [null,{}, {primary:8,throwable:'emp'}, {primary:9,throwable:'emp'},{primary:11,throwable:'emp'}, {primary:'1',throwable:'emp'},{primary:0,throwable:'invalid'}]){assert(!validDeployment(value));assert.throws(()=>deploymentLoadout(value));}
assert.equal(deploymentFromSearch('?menu=home&primary=1&throwable=emp'),null);
assert.equal(deploymentFromSearch('?menu=deploy&throwable=emp'),null);
console.log('PASS deployment choices: 24 round trips; fixed sidearm/blade, no chapter pickups, invalid inputs rejected');
