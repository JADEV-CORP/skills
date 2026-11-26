// Review page: an Azure DevOps-like view of one PR with the review's findings.
// Pure functions are exported for tests; init() wires the page in the browser.
// All text from the PR goes into the page through textContent, never as HTML.

export const SEVERITY_ORDER = ['Blocker', 'High', 'Medium', 'Low'];
const rank = (s) => {
  const i = SEVERITY_ORDER.indexOf(s);
  return i < 0 ? SEVERITY_ORDER.length : i;
};

export function fileSummary(findings, path) {
  const own = findings.filter((f) => f.file === path);
  const maxSeverity = own.length ? own.map((f) => f.severity).sort((a, b) => rank(a) - rank(b))[0] : null;
  return { count: own.length, maxSeverity };
}

export function buildFileTree(files, findings) {
  const root = { name: '', path: '', children: [] };
  for (const f of files) {
    const parts = f.path.split('/');
    let node = root;
    parts.forEach((name, i) => {
      const path = parts.slice(0, i + 1).join('/');
      if (i === parts.length - 1) {
        node.children.push({ name, path, children: [], file: { path: f.path, changeType: f.changeType, ...fileSummary(findings, f.path) } });
      } else {
        let next = node.children.find((c) => !c.file && c.name === name);
        if (!next) {
          next = { name, path, children: [] };
          node.children.push(next);
        }
        node = next;
      }
    });
  }
  // Folders before files, both alphabetical, as in the ADO Files view.
  const sort = (n) => {
    n.children.sort((a, b) => (!!a.file - !!b.file) || a.name.localeCompare(b.name));
    n.children.forEach(sort);
    return n;
  };
  return sort(root);
}

export function groupFindings(findings, groups) {
  const sorted = [...findings].sort((a, b) => rank(a.severity) - rank(b.severity));
  const headings = groups
    ? [...new Set([...Object.values(groups), ...sorted.map((f) => groups[f.category] || f.category)])]
    : SEVERITY_ORDER;
  const keyOf = (f) => (groups ? groups[f.category] || f.category : f.severity);
  return headings
    .map((heading) => ({ heading, findings: sorted.filter((f) => keyOf(f) === heading) }))
    .filter((g) => g.findings.length);
}

export function decisionOptions(finding, ownPr) {
  const opts = ['post'];
  if (finding.fix) opts.push('post-with-fix');
  if (finding.fix && ownPr) opts.push('apply-fix');
  opts.push('skip');
  return opts;
}

// One base64 token (UTF-8 JSON) that survives any text format the decisions travel through.
export function encodeDecisions(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `PRR1:${btoa(bin)}`;
}

// Fingerprint of what the reviewer saw for one issue (not the editable comment).
// post refuses a decision whose issue changed after the page was rendered.
export function findingDigest(f) {
  const s = JSON.stringify([f.id, f.category, f.severity, f.file ?? null, f.line?.start ?? null, f.line?.end ?? null, f.title, f.fix ?? null]);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// Links on the page open only http(s) targets; anything else (javascript:, data:) is dropped.
export function safeUrl(url) {
  try {
    const u = new URL(String(url));
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

export function collectDecisions(cardStates) {
  const items = [];
  const undecided = [];
  for (const c of cardStates) {
    if (c.decision) items.push({ id: c.id, decision: c.decision, comment: c.comment });
    else undecided.push(c.id);
  }
  return { items, undecided };
}

// The reviewer robot: one small inline SVG, coloured by the brand accent (currentColor).
// It blinks with CSS only, and stops when the reader asks for reduced motion.
export const ROBOT_SVG = '<svg class="prr-robot-svg" viewBox="0 0 64 64" width="72" height="72" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<line x1="30" y1="8" x2="30" y2="14"/><circle class="prr-antenna" cx="30" cy="6" r="3" fill="currentColor" stroke="none"/>'
  + '<rect x="10" y="14" width="40" height="28" rx="9"/><line x1="6" y1="26" x2="10" y2="26"/><line x1="50" y1="26" x2="54" y2="26"/>'
  + '<g class="prr-eyes"><circle cx="22" cy="27" r="4" fill="currentColor" stroke="none"/><circle cx="38" cy="27" r="4" fill="currentColor" stroke="none"/></g>'
  + '<path d="M23 35q7 4 14 0"/><path d="M18 42v8h24v-8"/>'
  + '<circle cx="50" cy="50" r="7"/><line x1="55" y1="55" x2="61" y2="61"/></svg>';

export function robotLine(findings) {
  const n = findings.length;
  if (!n) return 'Nothing found in the checked scope. Not an approval.';
  const blockers = findings.filter((f) => f.severity === 'Blocker').length;
  return `${n} issue${n === 1 ? '' : 's'}${blockers ? `, ${blockers} blocker${blockers === 1 ? '' : 's'}` : ''}. Your call.`;
}

// ---------------------------------------------------------------------------
// Browser part

const DIFFS_URL = 'https://esm.sh/@pierre/diffs@1.2.10?bundle';
const LABEL = { post: 'Post', 'post-with-fix': 'Post with fix', 'apply-fix': 'Apply fix', skip: 'Skip' };
const SEV_CLASS = { Blocker: 'badge-error', High: 'badge-error badge-soft', Medium: 'badge-warning badge-soft', Low: 'badge-info badge-soft' };
const RESULT_CLASS = { pass: 'badge-success', met: 'badge-success', ok: 'badge-success', fail: 'badge-error', 'not-met': 'badge-error', issue: 'badge-error', flag: 'badge-error', gap: 'badge-warning', partly: 'badge-warning', unknown: 'badge-warning', 'cannot-tell': 'badge-warning', running: 'badge-info', 'known-failure': 'badge-ghost', 'not-applicable': 'badge-ghost', additive: 'badge-success badge-soft', breaking: 'badge-error' };
const CHANGE = { add: ['A', 'text-success'], edit: ['M', 'text-info'], delete: ['D', 'text-error'], rename: ['R', 'text-warning'] };
const VOTE = { 10: 'approved', 5: 'approved with suggestions', 0: 'no vote', '-5': 'waiting for author', '-10': 'rejected' };

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
  return el;
}
const badge = (text, cls = 'badge-ghost') => h('span', { class: `badge badge-sm ${cls}` }, text);
const section = (title, ...kids) => h('section', { class: 'space-y-3' }, h('h2', { class: 'text-lg font-semibold tracking-tight' }, title), ...kids);
const table = (head, rows) => h('div', { class: 'overflow-x-auto border border-base-300' },
  h('table', { class: 'table table-sm' }, h('thead', {}, h('tr', {}, head.map((c) => h('th', {}, c)))), h('tbody', {}, rows.map((r) => h('tr', {}, r.map((c) => h('td', {}, c)))))));
const where = (f) => (f.file ? `${f.file}:${f.line?.start}${f.line && f.line.end !== f.line.start ? `-${f.line.end}` : ''}` : 'whole PR');
const short = (c) => (c ? String(c).slice(0, 8) : '');

export function init(doc, win) {
  const { review, doc: fd, brand } = JSON.parse(doc.getElementById('review-data').textContent);
  if (brand?.accent) doc.documentElement.style.setProperty('--color-primary', brand.accent);
  const findings = fd.findings || [];
  const files = new Map(review.files.map((f) => [f.path, f]));
  const ownPr = !!review.identity?.ownPr;
  const storeKey = `pr-review:${review.pr.org}/${review.pr.repo}/${review.pr.id}/${review.iteration.id}`;
  const dark = win.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const theme = { light: 'github-light', dark: 'github-dark' };

  let saved = {};
  try {
    saved = JSON.parse(win.localStorage.getItem(storeKey) || '{}');
  } catch { /* storage blocked */ }
  const states = Object.fromEntries(findings.map((f) => [f.id, { decision: saved[f.id]?.decision ?? null, comment: saved[f.id]?.comment ?? f.comment }]));
  const persist = () => {
    try {
      win.localStorage.setItem(storeKey, JSON.stringify(states));
    } catch { /* storage blocked */ }
    updateBar();
  };

  let diffsLib;
  const lib = async () => (diffsLib ??= await import(DIFFS_URL));

  // --- finding cards (one element per finding, reused across diff renders)
  const cards = new Map();
  function card(f) {
    if (cards.has(f.id)) return cards.get(f.id);
    const st = states[f.id];
    const fixBox = f.fix ? h('div', { class: 'border border-base-300' }) : null;
    const el = h('article', { class: 'prr-card card card-border bg-base-100 my-2', 'data-finding': f.id },
      h('div', { class: 'card-body gap-3 p-4' },
        h('div', { class: 'flex flex-wrap items-center gap-2' }, badge(f.id, 'badge-neutral'), badge(f.severity, SEV_CLASS[f.severity]), badge(f.category), h('span', { class: 'text-xs text-base-content/60 break-all' }, where(f))),
        h('h3', { class: 'font-semibold' }, f.title),
        h('dl', { class: 'grid gap-1 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]' },
          ['observed', 'trigger', 'consequence'].map((k) => [h('dt', { class: 'text-base-content/60' }, k[0].toUpperCase() + k.slice(1)), h('dd', {}, f.evidence?.[k] || '')])),
        h('label', { class: 'grid gap-1 text-sm' }, h('span', { class: 'text-base-content/60' }, 'Comment to post'),
          h('textarea', { class: 'textarea textarea-sm w-full', rows: 4, oninput: (e) => { st.comment = e.target.value; persist(); } }, st.comment)),
        fixBox && h('div', { class: 'grid gap-1 text-sm' }, h('span', { class: 'text-base-content/60' }, 'Proposed fix'), fixBox),
        h('div', { class: 'flex flex-wrap gap-2', role: 'radiogroup', 'aria-label': `Decision for ${f.id}` },
          decisionOptions(f, ownPr).map((o) => h('label', { class: 'flex cursor-pointer items-center gap-2 border border-base-300 px-3 py-1.5 text-sm has-checked:border-(--color-primary) has-checked:bg-(--color-base-200)' },
            h('input', { type: 'radio', name: `d-${f.id}`, value: o, class: 'radio radio-primary radio-xs', checked: st.decision === o, onchange: () => { st.decision = o; persist(); } }), LABEL[o]))),
      ));
    if (fixBox) renderFix(f.fix, fixBox);
    cards.set(f.id, el);
    return el;
  }

  async function renderFix(patch, box) {
    try {
      const { FileDiff, getSingularPatch } = await lib();
      new FileDiff({ theme, themeType: dark ? 'dark' : 'light', overflow: 'wrap', diffStyle: 'unified', disableFileHeader: true }).render({ containerWrapper: box, fileDiff: getSingularPatch(patch) });
    } catch {
      box.replaceChildren(h('p', { class: 'p-2 text-sm text-warning' }, 'The fix could not be displayed as a diff. It will still be posted as written.'));
    }
  }

  // --- header and tabs
  const app = doc.getElementById('app');
  const pr = review.pr;
  const counts = SEVERITY_ORDER.map((s) => [s, findings.filter((f) => f.severity === s).length]).filter(([, n]) => n);
  const allChecks = [...review.checks, ...(fd.checks || []).map((c) => ({ ...c, kind: 'local', coversLatest: true }))];
  const gaps = allChecks.filter((c) => c.result === 'gap' || c.result === 'fail' || !c.coversLatest).length;
  const story = fd.story || [];

  const robot = () => {
    const t = doc.createElement('template');
    t.innerHTML = ROBOT_SVG; // constant markup, no PR data
    return h('div', { class: 'prr-robot flex shrink-0 items-end gap-2 text-primary' }, t.content.firstChild,
      h('p', { class: 'border border-base-300 bg-base-100 px-3 py-2 text-sm text-base-content max-w-[15rem]' }, robotLine(findings)));
  };
  const brandMark = brand?.logo
    ? h('img', { src: brand.logo, alt: brand.name || '', class: 'h-6 w-auto' })
    : brand?.name ? h('span', { class: 'text-sm font-semibold' }, brand.name) : null;
  app.append(
    h('div', { class: 'flex flex-wrap items-start justify-between gap-4' },
    h('header', { class: 'min-w-0 flex-1 space-y-2 pb-6' }, brandMark,
      h('p', { class: 'text-xs font-semibold uppercase tracking-wider text-base-content/60' }, `${pr.org} / ${pr.project} / ${pr.repo} · PR ${pr.id}`, ownPr ? ' · your PR' : ''),
      h('h1', { class: 'text-2xl font-semibold tracking-tight text-balance' }, pr.title),
      h('p', { class: 'text-sm text-base-content/70 break-all' }, `${(pr.sourceRef || '').replace('refs/heads/', '')} into ${(pr.targetRef || '').replace('refs/heads/', '')} · by ${pr.author?.name || ''} · iteration ${review.iteration.id}`),
      safeUrl(pr.url) ? h('p', { class: 'text-sm' }, h('a', { class: 'link', href: safeUrl(pr.url), target: '_blank', rel: 'noopener' }, 'Open in Azure DevOps')) : null),
    brand?.robot === false ? null : robot()),
    h('section', { 'aria-label': 'At a glance', class: 'mb-6 grid grid-cols-1 gap-px border border-base-300 bg-base-300 sm:grid-cols-4' },
      [['Issues', findings.length, counts.map(([s, n]) => `${n} ${s}`).join(', ') || 'none'],
        ['Story', story.length ? `${story.filter((s) => s.result === 'met').length}/${story.length} met` : 'not mapped', review.workItems.length ? review.workItems.map((w) => `#${w.id}`).join(' ') : 'no work item linked'],
        ['Checks', `${gaps} need attention`, `${allChecks.length} checks read`],
        ['Files', review.files.length, `${review.threads.length} existing comments`]]
        .map(([label, value, sub]) => h('div', { class: 'bg-base-100 p-4' }, h('p', { class: 'text-sm text-base-content/60' }, label), h('p', { class: 'text-xl font-semibold' }, String(value)), h('p', { class: 'text-xs text-base-content/60' }, sub)))),
  );

  const tabs = [['overview', 'Overview'], ['files', `Files (${review.files.length})`], ...(review.since ? [['updates', 'Updates']] : [])];
  const tabBar = h('div', { role: 'tablist', class: 'tabs tabs-border mb-4' });
  const panels = {};
  for (const [key, label] of tabs) {
    tabBar.append(h('button', { role: 'tab', class: 'tab', 'data-tab': key, onclick: () => showTab(key) }, label));
    panels[key] = h('div', { 'data-tab-panel': key, class: 'space-y-8', hidden: true });
  }
  app.append(tabBar, ...Object.values(panels));
  function showTab(key) {
    for (const b of tabBar.children) b.classList.toggle('tab-active', b.dataset.tab === key);
    for (const [k, p] of Object.entries(panels)) p.hidden = k !== key;
  }

  // --- overview
  const ov = panels.overview;
  const prLevel = findings.filter((f) => !f.file);
  if (prLevel.length) ov.append(section('Comments on the whole PR', prLevel.map(card)));
  ov.append(section('Issues', findings.length
    ? groupFindings(findings, review.profile.groups).map((g) => h('div', { class: 'space-y-1' }, h('h3', { class: 'text-sm font-semibold text-base-content/70' }, g.heading),
      h('ul', { class: 'space-y-1' }, g.findings.map((f) => h('li', { class: 'flex flex-wrap items-center gap-2 text-sm' }, badge(f.id, 'badge-neutral'), badge(f.severity, SEV_CLASS[f.severity]),
        f.file ? h('button', { class: 'link', onclick: () => openFile(f.file) }, f.title) : h('span', {}, f.title), h('span', { class: 'text-xs text-base-content/60 break-all' }, where(f)))))))
    : h('p', { class: 'text-sm' }, 'No issues found in the checked scope. This is not an approval.')));

  ov.append(section('Story', review.workItems.length
    ? [table(['Work item', 'Title', 'State'], review.workItems.map((w) => [`#${w.id} ${w.type || ''}`, w.title, w.state])),
      story.length ? table(['Criterion', 'Result', 'Evidence'], story.map((s) => [s.criterion, badge(s.result, RESULT_CLASS[s.result]), s.evidence])) : h('p', { class: 'text-sm text-warning' }, 'Acceptance criteria not mapped.')]
    : h('div', { role: 'alert', class: 'alert border-warning/50 bg-warning/10' }, 'No work item is linked to this PR.')));

  ov.append(section('Checks', allChecks.length
    ? table(['Check', 'Source', 'Commit', 'Result', 'Latest commit'], allChecks.map((c) => [safeUrl(c.url) ? h('a', { class: 'link', href: safeUrl(c.url), target: '_blank', rel: 'noopener' }, c.name) : c.name, c.source === 'local' ? 'local run' : `${c.source} ${c.kind}`, short(c.commit), badge(c.result, RESULT_CLASS[c.result]), c.result === 'gap' ? badge('no run', 'badge-warning') : c.coversLatest ? 'yes' : badge('older commit', 'badge-warning')]))
    : h('p', { class: 'text-sm text-warning' }, 'No pipeline result found for this PR.')));

  if ((fd.impact || []).length) {
    ov.append(section('Impact outside this PR', fd.impact.map((c) => h('details', { class: 'border border-base-300 p-3', open: c.change === 'breaking' },
      h('summary', { class: 'cursor-pointer text-sm' }, badge(c.change, RESULT_CLASS[c.change]), ' ', h('span', { class: 'font-medium' }, c.contract), ' ', h('span', { class: 'text-base-content/60 break-all' }, c.path)),
      h('div', { class: 'mt-2 space-y-2 text-sm' }, h('p', {}, c.detail),
        c.consumers?.length ? h('ul', { class: 'prr-tree ml-2 border-l border-base-300 pl-3 space-y-1' }, c.consumers.map((u) => h('li', {}, h('span', { class: 'font-medium' }, u.repo), ' ', h('span', { class: 'break-all text-base-content/60' }, u.path), ': ', u.effect))) : h('p', { class: 'text-base-content/60' }, 'No consumer found.'),
        c.deployOrder ? h('p', {}, h('span', { class: 'text-base-content/60' }, 'Deploy order: '), c.deployOrder) : null)))));
  }

  const deps = review.signals?.deps || [];
  const assets = review.signals?.assets || [];
  ov.append(section('Licences',
    (fd.licences || []).length ? table(['Item', 'Kind', 'Licence', 'Status', 'Note'], fd.licences.map((l) => [l.name, l.kind, l.licence || '', badge(l.status, RESULT_CLASS[l.status]), l.note || ''])) : h('p', { class: 'text-sm' }, 'Nothing new to clear.'),
    deps.length || assets.length ? h('details', { class: 'text-sm' }, h('summary', { class: 'cursor-pointer text-base-content/70' }, 'What the diff added'),
      deps.length ? table(['Dependency', 'From', 'To', 'Licence', 'Known vulnerabilities'], deps.map((d) => [`${d.name} (${d.ecosystem})`, d.from || 'new', d.to || '', d.licence || 'unknown', d.vulns == null ? 'not checked' : d.vulns.map((v) => v.id).join(', ') || 'none'])) : null,
      assets.length ? table(['Asset', 'Kind', 'In ASSETS.md', 'Metadata'], assets.map((a) => [a.path, a.kind, a.registered == null ? 'not checked' : a.registered ? 'yes' : 'no', a.metadata.join(', ') || 'none'])) : null) : null));

  ov.append(section('Security',
    (fd.security || []).length ? h('ul', { class: 'space-y-1 text-sm' }, fd.security.map((s) => h('li', {}, badge(s.status, RESULT_CLASS[s.status]), ' ', h('span', { class: 'font-medium' }, s.area), ': ', s.note || ''))) : h('p', { class: 'text-sm text-warning' }, 'Security not assessed.'),
    (review.signals?.secrets || []).length ? h('div', { role: 'alert', class: 'alert border-error/50 bg-error/10 text-sm' }, h('div', {}, h('p', { class: 'font-medium' }, 'Possible secrets in the diff'),
      h('ul', {}, review.signals.secrets.map((s) => h('li', { class: 'break-all' }, `${s.path}:${s.line} ${s.rule} (${s.preview})`))))) : null));

  if (review.threads.length) {
    ov.append(section('Existing comments', h('ul', { class: 'space-y-1 text-sm' }, review.threads.map((t) => h('li', {}, badge(t.status), ' ', h('span', { class: 'font-medium' }, t.author), ' ', h('span', { class: 'text-base-content/60 break-all' }, t.filePath ? `${t.filePath}:${t.line ?? ''}` : 'whole PR'), ': ', String(t.firstComment).slice(0, 200))))));
  }

  // --- files
  const fp = panels.files;
  const treeNav = h('nav', { class: 'prr-tree border border-base-300 p-2 text-sm max-h-[70vh] overflow-auto', 'aria-label': 'Changed files' });
  const pane = h('div', { class: 'prr-pane space-y-2' });
  fp.append(h('div', { class: 'grid grid-cols-1 gap-4 md:grid-cols-[18rem_minmax(0,1fr)]' }, treeNav, pane));
  const fileButtons = new Map();
  const renderTree = (node) => h('ul', {}, node.children.map((n) => (n.file
    ? h('li', {}, (() => {
      const [letter, cls] = CHANGE[n.file.changeType] || ['?', ''];
      const b = h('button', { class: 'flex items-center gap-2 px-1 py-0.5 hover:bg-base-200', onclick: () => openFile(n.file.path), title: n.file.path },
        h('span', { class: `font-mono text-xs ${cls}` }, letter), h('span', { class: 'min-w-0 flex-1 truncate' }, n.name), n.file.count ? badge(String(n.file.count), SEV_CLASS[n.file.maxSeverity]) : null);
      fileButtons.set(n.file.path, b);
      return b;
    })())
    : h('li', {}, h('details', { open: true }, h('summary', { class: 'cursor-pointer px-1 py-0.5 text-base-content/80' }, n.name), renderTree(n))))));
  treeNav.append(renderTree(buildFileTree(review.files, findings)));

  let diffStyle = (win.innerWidth || 1024) < 768 ? 'unified' : 'split';
  let current = null;
  let currentPath = null;
  async function showFile(path) {
    currentPath = path;
    const f = files.get(path);
    for (const [p, b] of fileButtons) b.classList.toggle('bg-base-200', p === path);
    const container = h('div', {});
    const own = findings.filter((x) => x.file === path);
    pane.replaceChildren(
      h('div', { class: 'flex flex-wrap items-center justify-between gap-2' }, h('p', { class: 'font-mono text-sm break-all' }, path, f.originalPath ? ` (was ${f.originalPath})` : ''),
        h('div', { class: 'join' }, ['split', 'unified'].map((s) => h('button', { class: `btn btn-xs join-item ${diffStyle === s ? 'btn-active' : ''}`, onclick: () => { diffStyle = s; showFile(path); } }, s === 'split' ? 'Side by side' : 'Inline')))),
      container);
    current?.cleanUp?.();
    current = null;
    if (f.binary || f.tooLarge) {
      container.append(h('p', { class: 'text-sm text-base-content/70' }, f.binary ? 'Binary file, no text diff.' : 'File too large to show.'), ...own.map(card));
      return;
    }
    const annotations = [
      ...own.map((x) => ({ side: 'additions', lineNumber: x.line.start, metadata: { kind: 'finding', id: x.id } })),
      ...review.threads.filter((t) => t.filePath === path && t.line).map((t) => ({ side: 'additions', lineNumber: t.line, metadata: { kind: 'thread', t } })),
    ];
    try {
      const { FileDiff } = await lib();
      if (currentPath !== path) return;
      current = new FileDiff({
        theme, themeType: dark ? 'dark' : 'light', overflow: 'wrap', diffStyle,
        renderAnnotation: (a) => (a.metadata.kind === 'finding'
          ? card(findings.find((x) => x.id === a.metadata.id))
          : h('div', { class: 'my-1 border-l-2 border-base-300 bg-base-200 px-3 py-1 text-xs' }, h('span', { class: 'font-medium' }, `${a.metadata.t.author} (${a.metadata.t.status}): `), String(a.metadata.t.firstComment).slice(0, 300))),
      });
      current.render({ containerWrapper: container, oldFile: { name: f.originalPath || f.path, contents: f.oldContent ?? '' }, newFile: { name: f.path, contents: f.newContent ?? '' }, lineAnnotations: annotations });
    } catch (e) {
      container.append(h('p', { class: 'text-sm text-error' }, `The diff could not be shown (${e.message}).`), ...own.map(card));
    }
  }
  function openFile(path) {
    showTab('files');
    showFile(path);
  }

  // --- updates
  if (panels.updates) {
    const prev = review.previous?.findings || [];
    panels.updates.append(
      section(`Changed since iteration ${review.since.fromIteration}`, review.since.paths.length
        ? h('ul', { class: 'space-y-1 text-sm' }, review.since.paths.map((p) => h('li', {}, files.has(p) ? h('button', { class: 'link break-all', onclick: () => openFile(p) }, p) : h('span', { class: 'break-all' }, p))))
        : h('p', { class: 'text-sm' }, 'No file changed.')),
      section('Earlier issues', prev.length
        ? table(['ID', 'Issue', 'File', 'ADO thread'], prev.map((p) => [p.id, p.title, p.file || 'whole PR', p.threadId ? badge(p.threadStatus || 'unknown', p.threadStatus === 'fixed' || p.threadStatus === 'closed' ? 'badge-success' : 'badge-warning') : 'not posted']))
        : h('p', { class: 'text-sm' }, 'None recorded.')));
  }

  // --- send bar
  const counter = h('span', { class: 'text-sm' });
  const status = h('span', { class: 'text-sm text-base-content/70', role: 'status', 'aria-live': 'polite' });
  const sendBtn = h('button', { class: 'btn btn-primary btn-sm', 'data-lavish-action': true, onclick: send });
  app.append(h('div', { class: 'prr-bar mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-base-300 bg-base-100 py-3' }, h('div', { class: 'flex flex-wrap items-center gap-3' }, counter, status), sendBtn));
  function updateBar() {
    const decided = findings.filter((f) => states[f.id].decision).length;
    counter.textContent = `${decided} of ${findings.length} decided`;
    sendBtn.textContent = `Send ${decided} decision${decided === 1 ? '' : 's'}`;
    sendBtn.disabled = decided === 0;
  }
  function send() {
    const { items, undecided } = collectDecisions(findings.map((f) => ({ id: f.id, ...states[f.id] })));
    const byId = new Map(findings.map((f) => [f.id, f]));
    const payload = { pr: pr.id, iteration: review.iteration.id, items: items.map((i) => ({ ...i, digest: findingDigest(byId.get(i.id)) })), undecided };
    if (win.lavish?.queuePrompt) {
      win.lavish.queuePrompt(`Post these PR review decisions. Return one outcome per ID. ${encodeDecisions(payload)}`, { tag: 'pr-review-decisions', text: `${items.length} decisions for PR ${pr.id}`, data: payload, element: sendBtn });
      win.lavish.sendQueuedPrompts?.();
      status.textContent = 'Sent. Nothing is posted until the agent runs post.';
    } else {
      win.navigator.clipboard?.writeText(JSON.stringify(payload)).then(
        () => { status.textContent = 'Lavish is not running: decisions copied to the clipboard. Paste them to the agent.'; },
        () => { status.textContent = 'Lavish is not running and the clipboard is blocked.'; },
      );
    }
  }

  updateBar();
  const wanted = (win.location?.hash || '').slice(1);
  showTab(panels[wanted] ? wanted : 'overview');
  const first = findings.find((f) => f.file)?.file || review.files[0]?.path;
  if (first) showFile(first);
}

if (typeof document !== 'undefined' && document.getElementById('review-data')) init(document, window);
