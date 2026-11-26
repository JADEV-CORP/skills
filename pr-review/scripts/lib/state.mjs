// Per-PR work folder and state. Lives outside any repository.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const emptyState = () => ({ lastReviewedIteration: null, ids: {}, nextId: 1, threads: {}, findings: {} });

export const workDirFor = (profile, pr) => join(profile.workRoot, pr.org, pr.repo, `pr-${pr.id}`);

export function loadState(dir) {
  const file = join(dir, 'state.json');
  if (!existsSync(file)) return emptyState();
  return { ...emptyState(), ...JSON.parse(readFileSync(file, 'utf8')) };
}

export function saveState(dir, state) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'state.json'), `${JSON.stringify(state, null, 2)}\n`);
}
