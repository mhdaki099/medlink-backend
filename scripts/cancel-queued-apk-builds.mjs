#!/usr/bin/env node
/**
 * Cancel all queued/new APK builds (non-interactive).
 * eas build:cancel requires a build ID in non-interactive mode.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const statuses = ['in-queue', 'new'];

function listBuilds(status) {
  const out = execFileSync(
    'npx',
    [
      'eas',
      'build:list',
      '--platform',
      'android',
      '--profile',
      'apk',
      '--status',
      status,
      '--json',
      '--non-interactive',
    ],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
  const builds = JSON.parse(out.trim() || '[]');
  return Array.isArray(builds) ? builds : [];
}

const ids = new Set();
for (const status of statuses) {
  for (const build of listBuilds(status)) {
    if (build?.id) ids.add(build.id);
  }
}

if (ids.size === 0) {
  console.log('No queued APK builds to cancel.');
  process.exit(0);
}

for (const id of ids) {
  console.log(`Canceling build ${id}...`);
  execFileSync(
    'npx',
    ['eas', 'build:cancel', id, '--non-interactive'],
    { cwd: root, stdio: 'inherit' }
  );
}

console.log(`Canceled ${ids.size} build(s).`);
