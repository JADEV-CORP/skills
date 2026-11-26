// Applies proposed fixes to the reviewer's own local clone. Never commits or pushes.

import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const execFile = promisify(execFileCb);
const firstLine = (e) => String(e.stderr || e.message || 'git apply failed').split('\n')[0];

export async function applyFixes({ review, doc, items, repoDir, run = (cmd, args) => execFile(cmd, args) }) {
  const fail = (reason) => items.map((i) => ({ id: i.id, outcome: 'failed', reason }));
  if (!review.identity?.ownPr) return fail('apply fix is only for your own PR');
  let head;
  try {
    head = String((await run('git', ['-C', repoDir, 'rev-parse', 'HEAD'])).stdout).trim();
  } catch {
    return fail('cannot read the local clone');
  }
  if (head !== review.iteration.sourceCommit) return fail('local clone is not at the PR commit');

  const tmp = mkdtempSync(join(tmpdir(), 'pr-review-fix-'));
  try {
    const out = [];
    for (const item of items) {
      const f = doc.findings.find((x) => x.id === item.id);
      if (!f?.fix) {
        out.push({ id: item.id, outcome: 'failed', reason: 'no fix to apply' });
        continue;
      }
      const patch = join(tmp, `${item.id}.patch`);
      writeFileSync(patch, f.fix.endsWith('\n') ? f.fix : `${f.fix}\n`);
      try {
        await run('git', ['-C', repoDir, 'apply', '--check', patch]);
        await run('git', ['-C', repoDir, 'apply', '--whitespace=nowarn', patch]);
        out.push({ id: item.id, outcome: 'applied' });
      } catch (e) {
        out.push({ id: item.id, outcome: 'failed', reason: firstLine(e) });
      }
    }
    return out;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
