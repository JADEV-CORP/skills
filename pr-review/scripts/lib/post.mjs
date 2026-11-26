// Posts the reviewer's chosen comments to the pull request and writes a receipt with one
// outcome per finding. Nothing is posted without an explicit decision from the page.

import { lintComment, fixLeaksSecret } from './findings.mjs';
import { findingDigest } from '../../page/app.mjs';
import { secretValues } from './secrets.mjs';

const where = (f) => (f.file ? `${f.file}:${f.line.start}${f.line.end !== f.line.start ? `-${f.line.end}` : ''}` : 'the whole PR');

export function threadBody(finding, comment, review, withFix) {
  const content = withFix ? `${comment}\n\nSuggested change:\n\`\`\`diff\n${finding.fix.replace(/\n+$/, '')}\n\`\`\`` : comment;
  const body = { comments: [{ parentCommentId: 0, content, commentType: 1 }], status: 'active' };
  if (finding.file) {
    const file = review.files.find((x) => x.path === finding.file);
    body.threadContext = {
      filePath: `/${finding.file}`,
      rightFileStart: { line: finding.line.start, offset: 1 },
      rightFileEnd: { line: finding.line.end, offset: 1 },
    };
    body.pullRequestThreadContext = {
      changeTrackingId: file?.changeTrackingId,
      iterationContext: { firstComparingIteration: 1, secondComparingIteration: review.iteration.id },
    };
  }
  return body;
}

export async function postDecisions({ review, doc, decisions, state, ado, dryRun = false, save = () => {}, applyFix }) {
  const { pr } = review;
  const link = (threadId) => `${pr.url}?discussionId=${threadId}`;
  const prPath = [pr.project, '_apis', 'git', 'repositories', pr.repoId, 'pullRequests', pr.id];
  const items = new Map((decisions.items || []).map((i) => [i.id, i]));
  const next = { ...state, threads: { ...state.threads } };
  const outcomes = new Map();
  const set = (id, o) => outcomes.set(id, { id, ...o });

  let stale = null;
  if (decisions.pr !== pr.id) stale = `decisions are for PR ${decisions.pr}, the review is PR ${pr.id}`;
  else if (decisions.iteration !== review.iteration.id) stale = `decisions are for iteration ${decisions.iteration}, the review is iteration ${review.iteration.id}`;

  const docStale = doc.iteration !== review.iteration.id
    ? `findings.json was checked for iteration ${doc.iteration}, the review is iteration ${review.iteration.id}; run check and render again`
    : null;
  const secrets = secretValues(review.files);
  const toPost = [];
  const toApply = [];
  for (const f of doc.findings) {
    const item = items.get(f.id);
    if (next.threads[f.id]) set(f.id, { outcome: 'already-posted', threadId: next.threads[f.id], url: link(next.threads[f.id]) });
    else if (!item) set(f.id, { outcome: 'undecided' });
    else if (stale) set(f.id, { outcome: 'failed', reason: stale });
    else if (item.decision === 'skip') set(f.id, { outcome: 'skipped' });
    else if (docStale) set(f.id, { outcome: 'failed', reason: docStale });
    // The decision must be about the issue the page showed: same file, lines, title and fix.
    else if (item.digest !== findingDigest(f)) set(f.id, { outcome: 'failed', reason: 'issue changed since the page was rendered; render the page again and decide' });
    else if (item.decision === 'apply-fix') toApply.push(item);
    else if (item.decision === 'post' || item.decision === 'post-with-fix') {
      const problems = lintComment(item.comment, secrets);
      if (problems.length) set(f.id, { outcome: 'failed', reason: problems.join('; ') });
      else if (item.decision === 'post-with-fix' && !f.fix) set(f.id, { outcome: 'failed', reason: 'no fix to post' });
      else if (item.decision === 'post-with-fix' && fixLeaksSecret(f.fix, secrets)) set(f.id, { outcome: 'failed', reason: 'fix repeats a secret found in the diff' });
      else toPost.push({ f, item });
    } else set(f.id, { outcome: 'failed', reason: `unknown decision ${item.decision}` });
  }

  let moved = false;
  if (toPost.length) {
    const iterations = (await ado.get([...prPath, 'iterations'])).value || [];
    const latest = Math.max(...iterations.map((i) => i.id));
    if (latest !== review.iteration.id) {
      moved = true;
      for (const { f } of toPost) set(f.id, { outcome: 'failed', reason: `PR changed since review (iteration ${review.iteration.id} to ${latest}), run the review again` });
    } else {
      for (const { f, item } of toPost) {
        if (dryRun) {
          set(f.id, { outcome: 'skipped', reason: `dry run: would post on ${where(f)}` });
          continue;
        }
        try {
          const thread = await ado.post([...prPath, 'threads'], threadBody(f, item.comment, review, item.decision === 'post-with-fix'));
          next.threads[f.id] = thread.id;
          save(next); // keep the mapping even if a later post fails
          set(f.id, { outcome: 'posted', threadId: thread.id, url: link(thread.id) });
        } catch (e) {
          set(f.id, { outcome: 'failed', reason: e.message });
        }
      }
    }
  }

  if (toApply.length) {
    if (dryRun) for (const i of toApply) set(i.id, { outcome: 'skipped', reason: 'dry run: would apply the fix locally' });
    else if (!applyFix) for (const i of toApply) set(i.id, { outcome: 'failed', reason: 'apply fix needs --repo <local clone>' });
    else for (const o of await applyFix(toApply)) set(o.id, o);
  }

  if (!dryRun && !stale && !moved) {
    next.lastReviewedIteration = review.iteration.id;
    save(next);
  }
  const receipt = { pr: pr.id, iteration: review.iteration.id, at: new Date().toISOString(), outcomes: doc.findings.map((f) => outcomes.get(f.id)) };
  return { receipt, state: next };
}
