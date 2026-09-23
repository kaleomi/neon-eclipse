import assert from 'node:assert/strict';
import * as T from '../node_modules/three/build/three.module.js';
import {drawStationTiles,drawStationSign,refineStationMaterials,refineDispatchMaterials,STATION_CONTROL_IDLE} from '../src/station-look.js';
function canvasLog(){const calls=[];const ctx={};for(const method of ['fillRect','strokeRect','fillText'])ctx[method]=(...a)=>calls.push([method,ctx.fillStyle,ctx.strokeStyle,...a]);return {ctx,calls};}
const a=canvasLog(),b=canvasLog();drawStationTiles(a.ctx,256,256);drawStationTiles(b.ctx,256,256);assert.deepEqual(a.calls,b.calls);assert(a.calls.length>900);
const sign=canvasLog();drawStationSign(sign.ctx,'调度室  →','EAST EXIT / DISPATCH');assert.deepEqual(sign.calls.filter(c=>c[0]==='fillText').map(c=>c[3]),['调度室  →','EAST EXIT / DISPATCH']);
const keys=['wall','floor','train','ivory','black','orange','seat'],m=Object.fromEntries(keys.map(k=>[k,new T.MeshStandardMaterial()]));const texture=new T.Texture();m.floor.map=texture;const meshes=keys.map(k=>new T.Mesh(new T.BoxGeometry(),m[k])),geometries=meshes.map(m=>m.geometry);refineStationMaterials(m);assert.equal(m.floor.map,texture);assert.deepEqual(meshes.map(m=>m.geometry),geometries);assert.equal(m.floor.roughness,.88);assert.equal(m.seat.metalness,0);
const boss={steel:new T.MeshStandardMaterial(),bronze:new T.MeshStandardMaterial(),railMat:new T.MeshStandardMaterial()};refineDispatchMaterials(boss);assert.equal(boss.railMat.roughness,.38);assert(![0xffc36d,0x75fff1,0xff5366].includes(STATION_CONTROL_IDLE));
console.log('PASS deterministic same-size tiles, original sign wording/directions, existing texture/material ownership, inactive/active state palette separation');
