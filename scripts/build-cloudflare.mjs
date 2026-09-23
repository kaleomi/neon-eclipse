import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';

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

// Cloudflare Pages excludes directories named node_modules from direct uploads.
// Vendor Three.js under a normal public path and rewrite the deployment copy only.
await mkdir(new URL('./vendor/three/', dist), { recursive: true });
await cp(new URL('../node_modules/three/build/', import.meta.url), new URL('./vendor/three/build/', dist), { recursive: true });
await cp(new URL('../node_modules/three/examples/jsm/', import.meta.url), new URL('./vendor/three/examples/jsm/', dist), { recursive: true });

async function rewriteThreePaths(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
    if (entry.isDirectory()) await rewriteThreePaths(url);
    else if (/\.(?:html|js|mjs)$/.test(entry.name)) {
      const source = await readFile(url, 'utf8');
      const rewritten = source.replaceAll('node_modules/three/', 'vendor/three/');
      if (rewritten !== source) await writeFile(url, rewritten);
    }
  }
}
await rewriteThreePaths(dist);

console.log('Cloudflare static build created in dist/');
