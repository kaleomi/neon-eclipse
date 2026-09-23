import { cp, mkdir, readdir, rm } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const dist = new URL('../dist/', import.meta.url);
const runtimeDirs = ['audio', 'characters', 'i18n', 'maps', 'models', 'src', 'styles', 'weapons'];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const dir of runtimeDirs) {
  await cp(new URL(`../${dir}/`, import.meta.url), new URL(`./${dir}/`, dist), { recursive: true });
}

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.html')) {
    await cp(new URL(`../${entry.name}`, import.meta.url), new URL(`./${entry.name}`, dist));
  }
}

// Preserve the paths used by the import map and GLTFLoader imports.
await mkdir(new URL('./node_modules/three/', dist), { recursive: true });
await cp(new URL('../node_modules/three/build/', import.meta.url), new URL('./node_modules/three/build/', dist), { recursive: true });
await cp(new URL('../node_modules/three/examples/jsm/', import.meta.url), new URL('./node_modules/three/examples/jsm/', dist), { recursive: true });

console.log('Cloudflare static build created in dist/');
