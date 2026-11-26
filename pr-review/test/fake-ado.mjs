// Synthetic Azure DevOps server for tests. Every name and value here is made up.

const json = (b, status = 200, headers = {}) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json', ...headers } });

export function synthPr(overrides = {}) {
  const d = {
    org: 'acme', project: 'Web', projectId: 'p-1', repo: 'shop', repoId: 'r-1', id: 42,
    authorId: 'u-author', meId: 'u-me',
    lastMergeCommit: 'm2',
    iterations: [{ id: 1, source: 's1', common: 'c1', target: 't1' }],
    // changes per iteration (compareTo 0)
    changes: {
      1: [
        { changeTrackingId: 1, item: { path: '/src/new.js' }, changeType: 'add' },
        { changeTrackingId: 2, item: { path: '/src/app.js' }, changeType: 'edit' },
        { changeTrackingId: 3, item: { path: '/src/old.js' }, changeType: 'delete' },
      ],
    },
    changesSince: {}, // `${latest}:${from}` -> entries
    items: {
      's1:/src/new.js': 'export const a = 1;\n',
      's1:/src/app.js': 'line1\nline2 changed\nline3\n',
      'c1:/src/app.js': 'line1\nline2\nline3\n',
      'c1:/src/old.js': 'gone\n',
    },
    threads: [
      { id: 7, status: 'active', isDeleted: false, threadContext: { filePath: '/src/app.js', rightFileStart: { line: 2, offset: 1 } }, comments: [{ author: { displayName: 'Sam' }, content: 'Why?', commentType: 'text' }] },
      { id: 8, status: 'active', isDeleted: true, comments: [{ author: { displayName: 'Sam' }, content: 'x', commentType: 'text' }] },
      { id: 9, status: 'unknown', isDeleted: false, comments: [{ author: { displayName: 'System' }, content: 'Policy', commentType: 'system' }] },
    ],
    workItemRefs: [{ id: 101 }],
    workItems: [{ id: 101, fields: { 'System.Title': 'Pay by card', 'System.State': 'Active', 'System.WorkItemType': 'User Story', 'System.Description': '<div>As a buyer<br>I pay</div>', 'Microsoft.VSTS.Common.AcceptanceCriteria': '<ul><li>Card accepted</li><li>Receipt &amp; mail</li></ul>' } }],
    evaluations: [
      { configuration: { isBlocking: true, isEnabled: true, type: { displayName: 'Build' }, settings: { displayName: 'CI' } }, status: 'approved', context: { buildId: 500, isExpired: false } },
      { configuration: { isBlocking: true, isEnabled: true, type: { displayName: 'Build' }, settings: { displayName: 'Security build' } }, status: 'queued', context: null },
      { configuration: { isBlocking: false, isEnabled: true, type: { displayName: 'Minimum number of reviewers' }, settings: {} }, status: 'notApplicable', context: null },
    ],
    statuses: [{ id: 1, context: { name: 'sonar', genre: 'quality' }, state: 'succeeded', targetUrl: 'https://sonar.example/x', iterationId: 1 }],
    builds: [
      { id: 500, definition: { name: 'CI' }, status: 'completed', result: 'succeeded', sourceVersion: 'm2', _links: { web: { href: 'https://example/b/500' } } },
      { id: 499, definition: { name: 'Nightly' }, status: 'completed', result: 'failed', sourceVersion: 'm1', _links: { web: { href: 'https://example/b/499' } } },
    ],
    ...overrides,
  };
  return d;
}

export function fakeAdoFetch(d) {
  const calls = [];
  const fn = async (input) => {
    const u = new URL(String(input));
    calls.push(u);
    const p = u.pathname.split('/').map(decodeURIComponent);
    const path = p.join('/');
    const q = u.searchParams;
    if (path.endsWith('/_apis/connectionData')) return json({ authenticatedUser: { id: d.meId, providerDisplayName: 'Me' } });
    if (/\/_apis\/git\/repositories\/[^/]+\/pullrequests\/\d+$/i.test(path)) {
      return json({
        pullRequestId: d.id, title: 'Add card payment', description: 'Adds card payment', status: 'active', isDraft: false,
        createdBy: { id: d.authorId, displayName: 'Author' }, sourceRefName: 'refs/heads/feature/pay', targetRefName: 'refs/heads/main',
        reviewers: [{ displayName: 'Rev', vote: 0 }], repository: { id: d.repoId, name: d.repo, project: { id: d.projectId, name: d.project } },
        lastMergeCommit: { commitId: d.lastMergeCommit },
      });
    }
    let m = path.match(/\/pullRequests\/\d+\/iterations\/(\d+)\/changes$/i);
    if (m) {
      const it = Number(m[1]);
      const cmp = Number(q.get('$compareTo') || 0);
      const all = cmp ? d.changesSince[`${it}:${cmp}`] || [] : d.changes[it] || [];
      const top = Number(q.get('$top') || 100);
      const skip = Number(q.get('$skip') || 0);
      const page = all.slice(skip, skip + top);
      const more = skip + top < all.length;
      return json({ changeEntries: page, nextSkip: more ? skip + top : 0, nextTop: more ? top : 0 });
    }
    if (/\/pullRequests\/\d+\/iterations$/i.test(path)) {
      return json({ value: d.iterations.map((i) => ({ id: i.id, sourceRefCommit: { commitId: i.source }, commonRefCommit: { commitId: i.common }, targetRefCommit: { commitId: i.target } })) });
    }
    if (/\/pullRequests\/\d+\/threads$/i.test(path)) return json({ value: d.threads });
    if (/\/pullRequests\/\d+\/workitems$/i.test(path)) return json({ value: d.workItemRefs });
    if (/\/pullRequests\/\d+\/statuses$/i.test(path)) return json({ value: d.statuses });
    if (path.endsWith('/_apis/wit/workitems')) {
      const ids = (q.get('ids') || '').split(',').map(Number);
      return json({ value: d.workItems.filter((w) => ids.includes(w.id)) });
    }
    if (path.endsWith('/_apis/policy/evaluations')) return json({ value: d.evaluations });
    if (path.endsWith('/_apis/build/builds')) return json({ value: d.builds });
    if (/\/_apis\/git\/repositories\/[^/]+\/items$/i.test(path)) {
      const key = `${q.get('versionDescriptor.version')}:${q.get('path')}`;
      const v = d.items[key];
      if (v === undefined) return json({ message: `TF401174: item ${key} not found` }, 404);
      return new Response(typeof v === 'string' ? new TextEncoder().encode(v) : v);
    }
    return json({ message: `fake ADO: no route for ${path}` }, 404);
  };
  fn.calls = calls;
  return fn;
}
