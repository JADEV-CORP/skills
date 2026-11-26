// Licence and known-vulnerability lookups for new or changed dependencies.
// Only runs when the profile allows outside lookups: package names leave the machine.

const plainVersion = (spec) => {
  if (!spec) return null;
  const v = String(spec).replace(/^[\^~>=<v\s]+/, '');
  return /^\d+(\.\d+)*([-+.][0-9A-Za-z.-]+)?$/.test(v) ? v : null;
};

async function safe(fn) {
  try {
    return await fn();
  } catch {
    return null;
  }
}

async function getJson(fetchImpl, url) {
  const r = await fetchImpl(url);
  if (!r.ok) return null;
  return r.json();
}

const LICENCE = {
  async npm(fetchImpl, name, v) {
    const j = await getJson(fetchImpl, `https://registry.npmjs.org/${name.replace('/', '%2F')}/${v}`);
    const l = j?.license;
    return (typeof l === 'string' ? l : l?.type) || null;
  },
  async nuget(fetchImpl, name, v) {
    const id = name.toLowerCase();
    const r = await fetchImpl(`https://api.nuget.org/v3-flatcontainer/${id}/${v.toLowerCase()}/${id}.nuspec`);
    if (!r.ok) return null;
    const xml = await r.text();
    const expr = /<license\s+type="expression">([^<]+)<\/license>/i.exec(xml)?.[1];
    if (expr) return expr.trim();
    const url = /<licenseUrl>([^<]+)<\/licenseUrl>/i.exec(xml)?.[1];
    return url ? `licenseUrl: ${url.trim()}` : null;
  },
  async pypi(fetchImpl, name, v) {
    const j = await getJson(fetchImpl, `https://pypi.org/pypi/${encodeURIComponent(name)}/${v}/json`);
    const l = j?.info?.license_expression || j?.info?.license;
    return l ? String(l).slice(0, 100) : null;
  },
};

const OSV_ECOSYSTEM = { npm: 'npm', nuget: 'NuGet', pypi: 'PyPI' };

async function vulns(fetchImpl, d, v) {
  const r = await fetchImpl('https://api.osv.dev/v1/query', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ package: { name: d.name, ecosystem: OSV_ECOSYSTEM[d.ecosystem] }, version: v }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  return (j.vulns || []).map((x) => ({ id: x.id, summary: x.summary || String(x.details || '').slice(0, 160) }));
}

export async function enrichDeps(deps, { enabled, fetchImpl = fetch }) {
  if (!enabled) return deps;
  return Promise.all(deps.map(async (d) => {
    const lookup = LICENCE[d.ecosystem];
    if (!lookup) return d;
    const to = plainVersion(d.to);
    const from = plainVersion(d.from);
    return {
      ...d,
      licence: to ? await safe(() => lookup(fetchImpl, d.name, to)) : null,
      licenceFrom: from ? await safe(() => lookup(fetchImpl, d.name, from)) : null,
      vulns: to ? await safe(() => vulns(fetchImpl, d, to)) : null,
    };
  }));
}
