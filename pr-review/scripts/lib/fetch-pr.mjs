// Reads one pull request from Azure DevOps into the review data the agent and the page use.

import { isBinaryPath, looksBinary } from './filetypes.mjs';
import { diffDeps } from './deps.mjs';
import { enrichDeps } from './lookups.mjs';
import { assetSignals, isAssetAdd } from './assets.mjs';
import { scanSecrets } from './secrets.mjs';

const MAX_ASSET_BYTES = 15 * 1024 * 1024;

const WI_FIELDS = 'System.Title,System.State,System.WorkItemType,System.Description,Microsoft.VSTS.Common.AcceptanceCriteria';
const stripSlash = (p) => (p || '').replace(/^\//, '');

export function htmlToText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .split('\n').map((l) => l.trim()).filter((l, i, a) => l || (i > 0 && a[i - 1])).join('\n')
    .trim();
}

function normalizeChangeType(t) {
  const s = String(t || '').toLowerCase();
  if (s.includes('delete')) return 'delete';
  if (s.includes('add')) return 'add';
  if (s.includes('rename')) return 'rename';
  return 'edit';
}

const lineCount = (text) => (text ? text.split('\n').length - (text.endsWith('\n') ? 1 : 0) : 0);

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const RESULT = {
  build: { succeeded: 'pass', partiallySucceeded: 'fail', failed: 'fail', canceled: 'fail' },
  status: { succeeded: 'pass', failed: 'fail', error: 'fail', pending: 'running' },
  policy: { approved: 'pass', rejected: 'fail', broken: 'fail', running: 'running', queued: 'running' },
};

function buildChecks({ evaluations, statuses, builds, latest, lastMergeCommit }) {
  const checks = [];
  for (const e of evaluations) {
    const cfg = e.configuration || {};
    if (cfg.isEnabled === false || e.status === 'notApplicable') continue;
    const type = cfg.type?.displayName || 'Policy';
    const name = cfg.settings?.displayName || type;
    const isBuild = type === 'Build';
    // A blocking build policy with no run on the latest commit is a gap, never a pass.
    const gap = isBuild && cfg.isBlocking && (!e.context?.buildId || e.context?.isExpired);
    checks.push({
      name, source: 'pipeline', kind: 'policy',
      result: gap ? 'gap' : RESULT.policy[e.status] || 'gap',
      commit: null, coversLatest: isBuild ? !gap : true, url: null,
    });
  }
  const latestStatus = new Map();
  for (const s of statuses) {
    const key = `${s.context?.genre || ''}/${s.context?.name || ''}`;
    if (!latestStatus.has(key) || s.id > latestStatus.get(key).id) latestStatus.set(key, s);
  }
  for (const s of latestStatus.values()) {
    checks.push({
      name: s.context?.name || 'status', source: 'pipeline', kind: 'status',
      result: RESULT.status[s.state] || 'gap', commit: null,
      coversLatest: s.iterationId === latest, url: s.targetUrl || null,
    });
  }
  const seen = new Set();
  for (const b of builds) {
    const name = b.definition?.name || `build ${b.id}`;
    if (seen.has(name)) continue; // newest first, keep one per definition
    seen.add(name);
    checks.push({
      name, source: 'pipeline', kind: 'build',
      result: b.status === 'completed' ? RESULT.build[b.result] || 'fail' : 'running',
      commit: b.sourceVersion || null, coversLatest: b.sourceVersion === lastMergeCommit,
      url: b._links?.web?.href || null,
    });
  }
  return checks;
}

export async function fetchReview({ pr, profile, ado, state, limits = { maxTextBytes: 400_000, maxPages: 50 }, lookupFetch = fetch }) {
  const repoPath = [pr.project, '_apis', 'git', 'repositories', pr.repo];
  const prPath = [...repoPath, 'pullRequests', pr.id];
  const raw = await ado.get([...repoPath, 'pullrequests', pr.id]);
  const projectId = raw.repository?.project?.id;
  const repoId = raw.repository?.id;
  const lastMergeCommit = raw.lastMergeCommit?.commitId || null;

  const iterations = (await ado.get([...prPath, 'iterations'])).value || [];
  const it = iterations.reduce((a, b) => (b.id > a.id ? b : a));
  const iteration = {
    id: it.id, sourceCommit: it.sourceRefCommit?.commitId, commonCommit: it.commonRefCommit?.commitId, targetCommit: it.targetRefCommit?.commitId,
  };

  const changePath = [...prPath, 'iterations', iteration.id, 'changes'];
  const entries = (await ado.getAllPages(changePath, { $top: 100, $compareTo: 0 }, 'changeEntries', limits.maxPages))
    .filter((c) => c.item?.path && !c.item.isFolder && c.item.gitObjectType !== 'tree');

  const itemsPath = [pr.project, '_apis', 'git', 'repositories', repoId, 'items'];
  const readAt = async (path, commit) => {
    const r = await ado.getBytes(itemsPath, { path, 'versionDescriptor.version': commit, 'versionDescriptor.versionType': 'commit', $format: 'octetStream' }, limits.maxTextBytes);
    if (r.tooLarge) return { tooLarge: true };
    if (looksBinary(r.bytes)) return { binary: true };
    return { text: new TextDecoder().decode(r.bytes) };
  };

  const files = await mapLimit(entries, 8, async (c) => {
    const changeType = normalizeChangeType(c.changeType);
    const path = c.item.path;
    const originalPath = c.originalPath || c.sourceServerItem || null;
    const f = {
      path: stripSlash(path), changeType, changeTrackingId: c.changeTrackingId,
      binary: isBinaryPath(path), tooLarge: false, oldContent: null, newContent: null, newLineCount: 0,
    };
    if (changeType === 'rename' && originalPath) f.originalPath = stripSlash(originalPath);
    if (f.binary) return f;
    const sides = [];
    if (changeType !== 'add') sides.push(['oldContent', originalPath || path, iteration.commonCommit]);
    if (changeType !== 'delete') sides.push(['newContent', path, iteration.sourceCommit]);
    for (const [key, p, commit] of sides) {
      const r = await readAt(p, commit);
      if (r.binary) { f.binary = true; f.oldContent = null; f.newContent = null; return f; }
      if (r.tooLarge) { f.tooLarge = true; f.oldContent = null; f.newContent = null; return f; }
      f[key] = r.text;
    }
    f.newLineCount = lineCount(f.newContent);
    return f;
  });

  const signals = await collectSignals({ files, profile, ado, itemsPath, sourceCommit: iteration.sourceCommit, readAt, lookupFetch });

  let since = null;
  if (state.lastReviewedIteration && state.lastReviewedIteration < iteration.id) {
    const changed = await ado.getAllPages(changePath, { $top: 100, $compareTo: state.lastReviewedIteration }, 'changeEntries', limits.maxPages);
    since = { fromIteration: state.lastReviewedIteration, paths: changed.filter((c) => c.item?.path).map((c) => stripSlash(c.item.path)) };
  }

  const rawThreads = (await ado.get([...prPath, 'threads'])).value || [];
  const threads = rawThreads
    .filter((t) => !t.isDeleted && t.comments?.length && t.comments[0].commentType !== 'system')
    .map((t) => ({
      id: t.id, status: t.status, filePath: t.threadContext?.filePath ? stripSlash(t.threadContext.filePath) : null,
      line: t.threadContext?.rightFileStart?.line ?? null, author: t.comments[0].author?.displayName || '', firstComment: t.comments[0].content || '',
    }));

  const wiRefs = (await ado.get([...prPath, 'workitems'])).value || [];
  const workItemIds = wiRefs.map((w) => Number(w.id));
  let workItems = [];
  if (workItemIds.length) {
    const wis = await ado.get(['_apis', 'wit', 'workitems'], { ids: workItemIds.join(','), fields: WI_FIELDS });
    workItems = (wis.value || []).map((w) => ({
      id: w.id, type: w.fields['System.WorkItemType'], title: w.fields['System.Title'], state: w.fields['System.State'],
      description: htmlToText(w.fields['System.Description']), acceptanceCriteria: htmlToText(w.fields['Microsoft.VSTS.Common.AcceptanceCriteria']),
    }));
  }

  const [evaluations, statuses, builds, conn] = await Promise.all([
    ado.get([pr.project, '_apis', 'policy', 'evaluations'], { artifactId: `vstfs:///CodeReview/CodeReviewId/${projectId}/${pr.id}`, 'api-version': '7.1-preview.1' }).then((r) => r.value || []),
    ado.get([...prPath, 'statuses']).then((r) => r.value || []),
    ado.get([pr.project, '_apis', 'build', 'builds'], { branchName: `refs/pull/${pr.id}/merge`, $top: 10, queryOrder: 'queueTimeDescending' }).then((r) => r.value || []),
    ado.get(['_apis', 'connectionData'], { 'api-version': '7.1-preview.1' }),
  ]);

  const me = conn.authenticatedUser || {};
  const threadStatus = new Map(threads.map((t) => [t.id, t.status]));
  const previous = {
    findings: Object.entries(state.findings || {}).map(([id, f]) => {
      const threadId = state.threads?.[id] ?? null;
      return { id, title: f.title, file: f.file ?? null, threadId, threadStatus: threadId ? threadStatus.get(threadId) ?? null : null };
    }),
  };

  return {
    version: 1,
    pr: {
      org: pr.org, project: pr.project, projectId, repo: pr.repo, repoId, id: pr.id,
      url: `${pr.baseUrl}/${encodeURIComponent(pr.project)}/_git/${encodeURIComponent(pr.repo)}/pullrequest/${pr.id}`,
      title: raw.title, description: raw.description || '', author: { id: raw.createdBy?.id, name: raw.createdBy?.displayName },
      sourceRef: raw.sourceRefName, targetRef: raw.targetRefName, isDraft: !!raw.isDraft, status: raw.status,
      reviewers: (raw.reviewers || []).map((r) => ({ name: r.displayName, vote: r.vote })), workItemIds,
      lastMergeCommit,
    },
    iteration,
    since,
    identity: { id: me.id, name: me.providerDisplayName || '', ownPr: !!me.id && me.id === raw.createdBy?.id },
    profile: {
      name: profile.name, language: profile.language, groups: profile.groups,
      assetRegisterCheck: profile.assetRegisterCheck, outsideLookups: profile.outsideLookups, instructions: profile.instructions,
    },
    workItems,
    files,
    threads,
    checks: buildChecks({ evaluations, statuses, builds, latest: iteration.id, lastMergeCommit }),
    signals,
    previous,
  };
}

async function collectSignals({ files, profile, ado, itemsPath, sourceCommit, readAt, lookupFetch }) {
  const deps = await enrichDeps(diffDeps(files), { enabled: profile.outsideLookups, fetchImpl: lookupFetch });
  let register = null;
  if (profile.assetRegisterCheck && files.some(isAssetAdd)) {
    const inPr = files.find((f) => f.path === 'ASSETS.md');
    if (inPr) register = inPr.newContent;
    else {
      try {
        register = (await readAt('/ASSETS.md', sourceCommit)).text ?? null;
      } catch {
        register = null; // no register in the repo yet
      }
    }
  }
  const getBytes = (path) => ado.getBytes(itemsPath, { path: `/${path}`, 'versionDescriptor.version': sourceCommit, 'versionDescriptor.versionType': 'commit', $format: 'octetStream' }, MAX_ASSET_BYTES);
  const assets = await assetSignals(files, { registerCheck: profile.assetRegisterCheck, register, getBytes });
  return { deps, assets, secrets: scanSecrets(files) };
}
