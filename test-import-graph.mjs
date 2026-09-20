// Every static relative import reachable from the page entry points must resolve to a file that is tracked in Git.
// CI runs on a clean checkout, so a module that only exists in a developer's working tree breaks the whole page there
// while passing locally (2026-09-20: app.js imported uncommitted characters/roster-runtime.js).
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const root=new URL('.',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1');
const tracked=new Set(execFileSync('git',['ls-files'],{cwd:root,encoding:'utf8'}).split(/\r?\n/).filter(Boolean));
const entries=['app.js','ui-shell.js','hologram-ui.js','vehicle-app.js','helicopter-entry.js','operations-archive.js'].filter(f=>existsSync(path.join(root,f)));
const seen=new Set(),untracked=[],missing=[];
function walk(rel){
 rel=rel.split(path.sep).join('/');if(seen.has(rel))return;seen.add(rel);
 if(rel.startsWith('node_modules/'))return;
 const abs=path.join(root,rel);if(!existsSync(abs)){missing.push(rel);return;}
 if(!tracked.has(rel))untracked.push(rel);
 const src=readFileSync(abs,'utf8');
 for(const m of src.matchAll(/(?:from\s+|import\s*\(\s*)'(\.\.?\/[^']+)'/g))walk(path.normalize(path.join(path.dirname(rel),m[1])));
}
for(const e of entries)walk(e);
assert.deepEqual(missing,[],'imports that do not exist on disk');
assert.deepEqual(untracked,[],'imports reachable from page entries that are not tracked in Git (commit them or stop importing them)');
console.log('import graph ok: '+entries.length+' entries, '+seen.size+' modules, all tracked');
