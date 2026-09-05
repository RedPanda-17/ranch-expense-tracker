import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const RC_DIR = path.join(ROOT, 'v2-rc');
const PINNED_SUPABASE = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';
const FLOATING_SUPABASE = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const must = (value, message) => {
  if (!value) throw new Error(message);
};

for (const file of ['index.html', 'manifest.webmanifest', 'service-worker.js']) {
  must(fs.existsSync(path.join(RC_DIR, file)), `Missing release candidate file: ${file}`);
}

let html = fs.readFileSync(path.join(RC_DIR, 'index.html'), 'utf8');
html = html.replaceAll('Version 2.0.0 RC', 'Version 2.0.0');
html = html.replaceAll('2.0.0 RC', '2.0.0');
html = html.replaceAll('Cloud Sync Release Candidate', 'Cloud Sync');
html = html.replaceAll('../icon-192.png', 'icon-192.png');
html = html.replaceAll('../icon-512.png', 'icon-512.png');
html = html.replaceAll(FLOATING_SUPABASE, PINNED_SUPABASE);

must(!html.includes('2.0.0 RC'), 'Production HTML still contains an RC version label.');
must(!html.includes('Cloud Sync Release Candidate'), 'Production HTML still contains the RC release name.');
must(!html.includes('../icon-192.png'), 'Production HTML still points outside the repository for the app icon.');
must(!html.includes(FLOATING_SUPABASE), 'Production HTML still uses the floating Supabase SDK tag.');
must(html.includes(PINNED_SUPABASE), 'Pinned Supabase SDK URL was not found in production HTML.');

const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1])
  .filter(Boolean);
for (let i = 0; i < scripts.length; i++) {
  const tmp = path.join(ROOT, `.production-syntax-${i}.js`);
  fs.writeFileSync(tmp, scripts[i]);
  const result = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
  fs.unlinkSync(tmp);
  if (result.status !== 0) {
    throw new Error(`Production inline JavaScript ${i + 1} failed syntax check:\n${result.stderr}`);
  }
}

let manifest = fs.readFileSync(path.join(RC_DIR, 'manifest.webmanifest'), 'utf8');
manifest = manifest.replaceAll('../icon-192.png', 'icon-192.png');
manifest = manifest.replaceAll('../icon-512.png', 'icon-512.png');
const parsedManifest = JSON.parse(manifest);
must(parsedManifest.start_url === './', 'Unexpected production manifest start_url.');
must(parsedManifest.scope === './', 'Unexpected production manifest scope.');
must(parsedManifest.icons?.every(icon => !String(icon.src).startsWith('../')), 'Production manifest has an out-of-scope icon path.');

let serviceWorker = fs.readFileSync(path.join(RC_DIR, 'service-worker.js'), 'utf8');
serviceWorker = serviceWorker.replace('/* Ranch Expense Tracker 2.0.0 RC - app shell only. User records are never stored in the service-worker cache. */', '/* Ranch Expense Tracker 2.0.0 - app shell only. User records are never stored in the service-worker cache. */');
serviceWorker = serviceWorker.replace("const CACHE='ranch-expense-tracker-v2-rc-1';", "const CACHE='ranch-expense-tracker-v2-2.0.0';");
serviceWorker = serviceWorker.replaceAll(FLOATING_SUPABASE, PINNED_SUPABASE);
serviceWorker = serviceWorker.replace("if(k.startsWith('ranch-expense-tracker-v2-rc-')&&k!==CACHE)", "if(k.startsWith('ranch-expense-tracker-v2-')&&k!==CACHE)");

must(!serviceWorker.includes('2.0.0 RC'), 'Production service worker still contains an RC label.');
must(!serviceWorker.includes(FLOATING_SUPABASE), 'Production service worker still uses the floating Supabase SDK tag.');
must(serviceWorker.includes(PINNED_SUPABASE), 'Pinned Supabase SDK URL was not found in production service worker.');

const swTmp = path.join(ROOT, '.production-service-worker-check.js');
fs.writeFileSync(swTmp, serviceWorker);
const swCheck = spawnSync(process.execPath, ['--check', swTmp], { encoding: 'utf8' });
fs.unlinkSync(swTmp);
if (swCheck.status !== 0) throw new Error(`Production service worker failed syntax check:\n${swCheck.stderr}`);

fs.writeFileSync(path.join(ROOT, 'index.html'), html);
fs.writeFileSync(path.join(ROOT, 'manifest.webmanifest'), manifest);
fs.writeFileSync(path.join(ROOT, 'service-worker.js'), serviceWorker);

console.log('Prepared Ranch Expense Tracker 2.0.0 production app shell.');
console.log(`Pinned Supabase browser SDK: 2.115.0`);
console.log(`Inline scripts checked: ${scripts.length}`);
