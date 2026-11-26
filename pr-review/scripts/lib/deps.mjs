// Lists dependencies a PR adds or changes, per manifest. No network here.

const blank = (ecosystem, manifest, name, from, to) => ({ ecosystem, manifest, name, from, to, licence: null, licenceFrom: null, vulns: null });

function npmDeps(text) {
  try {
    const j = JSON.parse(text);
    return new Map(Object.entries({ ...(j.dependencies || {}), ...(j.devDependencies || {}) }));
  } catch {
    return new Map();
  }
}

function nugetDeps(text) {
  const out = new Map();
  const re = /<Package(?:Reference|Version)\b([^>]*?)(\/>|>([\s\S]*?)<\/Package(?:Reference|Version)>)/g;
  for (const m of text.matchAll(re)) {
    const attrs = m[1];
    const name = /\bInclude="([^"]+)"/.exec(attrs)?.[1];
    const version = /\bVersion(?:Override)?="([^"]+)"/.exec(attrs)?.[1] || /<Version>([^<]+)<\/Version>/.exec(m[3] || '')?.[1] || null;
    if (name) out.set(name, version);
  }
  return out;
}

function pipDeps(text) {
  const out = new Map();
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line || line.startsWith('-')) continue;
    const m = /^([A-Za-z0-9_.\-[\]]+)\s*(==|>=|<=|~=|>|<|!=)?\s*([^;\s]*)/.exec(line);
    if (m) out.set(m[1], m[2] === '==' ? m[3] : m[2] ? `${m[2]}${m[3]}` : '*');
  }
  return out;
}

function dockerDeps(text) {
  const out = new Map();
  for (const m of text.matchAll(/^\s*FROM\s+(?:--\S+\s+)*(\S+)/gim)) {
    const ref = m[1];
    let name = ref;
    let tag = null;
    const at = ref.indexOf('@');
    if (at > 0) {
      name = ref.slice(0, at);
      tag = ref.slice(at + 1);
    } else {
      const colon = ref.lastIndexOf(':');
      if (colon > ref.lastIndexOf('/')) {
        name = ref.slice(0, colon);
        tag = ref.slice(colon + 1);
      }
    }
    out.set(name, tag);
  }
  return out;
}

const MANIFESTS = [
  { test: (p) => /(^|\/)package\.json$/.test(p), ecosystem: 'npm', parse: npmDeps },
  { test: (p) => /\.(cs|fs|vb)proj$/i.test(p) || /(^|\/)Directory\.(Packages|Build)\.props$/i.test(p), ecosystem: 'nuget', parse: nugetDeps },
  { test: (p) => /(^|\/)requirements[^/]*\.txt$/i.test(p), ecosystem: 'pypi', parse: pipDeps },
  { test: (p) => /(^|\/)Dockerfile[^/]*$/.test(p), ecosystem: 'docker', parse: dockerDeps },
];

export function diffDeps(files) {
  const out = [];
  for (const f of files) {
    if (f.newContent == null) continue;
    const kind = MANIFESTS.find((m) => m.test(f.path));
    if (!kind) continue;
    const before = f.oldContent == null ? new Map() : kind.parse(f.oldContent);
    for (const [name, to] of kind.parse(f.newContent)) {
      const from = before.has(name) ? before.get(name) : null;
      if (before.has(name) && from === to) continue;
      out.push(blank(kind.ecosystem, f.path, name, from, to));
    }
  }
  return out;
}
