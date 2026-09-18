// Separate database: never imports or rewrites flight scores, FPS saves or mission checkpoints.
import {createCheckpointStore} from './joint-checkpoint-store.js';
import {validExpedition,canonicalExpedition} from './expedition-model.js';
export const EXPEDITION_DB='neon-eclipse.expedition.v1';
export function createExpeditionStore(factory){
  return createCheckpointStore({dbName:EXPEDITION_DB,valid:validExpedition,canonical:canonicalExpedition},factory,arguments.length===0);
}
