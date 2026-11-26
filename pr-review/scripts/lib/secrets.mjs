// Finds likely secrets on lines a PR adds or changes. Raw values never leave this module:
// hits carry a masked preview only.

const RULES = [
  { rule: 'private key', re: /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/ },
  { rule: 'AWS access key', re: /\b(AKIA[0-9A-Z]{16})\b/ },
  { rule: 'storage account key', re: /AccountKey=([A-Za-z0-9+/=]{8,})/ },
  { rule: 'SAS token', re: /(?:SharedAccessSignature=|[?&]sig=)([A-Za-z0-9%+/=]{10,})/, also: (line) => /SharedAccessSignature=/.test(line) || /[?&]sv=/.test(line) },
  { rule: 'GitHub token', re: /\b(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/ },
  { rule: 'Slack token', re: /\b(xox[abp]-[A-Za-z0-9-]{10,})/ },
  { rule: 'Stripe live key', re: /\b(sk_live_[A-Za-z0-9]{10,})/ },
  { rule: 'JWT', re: /\b(eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,})/ },
  { rule: 'password assignment', re: /(?:password|passwd|pwd|secret|api[_-]?key|token)\w*["']?\s*[:=]\s*["']([^"'\s]{8,})["']/i },
];

const PLACEHOLDER = /^(<.*>|\$\{.*\}|\{\{.*\}\}|%.*%|changeme|x{3,}|\*+|dummy|password|secret|your[-_].*|test.*)$/i;
const isPlaceholder = (v) => PLACEHOLDER.test(v) || /example|placeholder/i.test(v);

export const maskSecret = (value) => (String(value).length > 4 ? `${String(value).slice(0, 4)}****` : '****');

// Lines in the new content that are not in the old content (multiset comparison).
function addedLines(f) {
  const lines = f.newContent.split('\n');
  const old = new Map();
  for (const l of (f.oldContent ?? '').split('\n')) old.set(l, (old.get(l) || 0) + 1);
  const out = [];
  lines.forEach((text, i) => {
    if (f.oldContent != null && old.get(text) > 0) old.set(text, old.get(text) - 1);
    else out.push({ line: i + 1, text });
  });
  return out;
}

export function scanSecrets(files) {
  const hits = [];
  for (const f of files) {
    if (f.newContent == null) continue;
    for (const { line, text } of addedLines(f)) {
      for (const r of RULES) {
        const m = r.re.exec(text);
        if (!m || (r.also && !r.also(text))) continue;
        const value = m[1] ?? m[0];
        if (m[1] !== undefined && isPlaceholder(value)) continue;
        hits.push({ path: f.path, line, rule: r.rule, preview: maskSecret(value) });
      }
    }
  }
  return hits;
}

const KEY_BLOCK = /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----([\s\S]*?)-----END (?:[A-Z]+ )*PRIVATE KEY-----/g;

// Raw values, in memory only: for the comment and fix checks, and for masking the page.
// By default only lines the PR adds or changes; allLines also covers both sides in full.
export function secretValues(files, { allLines = false } = {}) {
  const values = new Set();
  const scan = (lines) => {
    for (const text of lines) {
      for (const r of RULES) {
        const m = r.re.exec(text);
        if (m && m[1] !== undefined && !isPlaceholder(m[1])) values.add(m[1]);
      }
    }
  };
  for (const f of files) {
    if (allLines) {
      for (const c of [f.oldContent, f.newContent]) if (c != null) scan(c.split('\n'));
    } else if (f.newContent != null) {
      scan(addedLines(f).map((l) => l.text));
    }
    // Private key bodies span several lines with no single matching value.
    for (const c of allLines ? [f.oldContent, f.newContent] : [f.newContent]) {
      if (c == null) continue;
      for (const m of c.matchAll(KEY_BLOCK)) {
        for (const line of m[1].split('\n').map((l) => l.trim())) if (line.length >= 16) values.add(line);
      }
    }
  }
  return [...values];
}
