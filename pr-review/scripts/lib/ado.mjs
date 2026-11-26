// Minimal Azure DevOps REST client. Paths are arrays of segments; each segment is encoded,
// so project and repository names with spaces or accents work.

export class AdoError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const SIGN_IN = 'Azure DevOps refused the token (401). Sign in again (az login) and re-run the command.';

export function createAdo({ baseUrl, token, fetchImpl = fetch }) {
  const url = (path, query = {}) => {
    const u = new URL(`${baseUrl}/${path.map((s) => encodeURIComponent(String(s))).join('/')}`);
    const q = { 'api-version': '7.1', ...query };
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
    return u;
  };

  async function call(path, query, init = {}) {
    const res = await fetchImpl(url(path, query), {
      ...init,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(init.headers || {}) },
    });
    // ADO answers an expired token with 401, or with 203 and an HTML sign-in page.
    if (res.status === 401 || res.status === 203) throw new AdoError(401, SIGN_IN);
    if (!res.ok) {
      let msg = `Azure DevOps request failed (${res.status})`;
      try {
        const body = await res.json();
        if (body && body.message) msg = `${msg}: ${body.message}`;
      } catch { /* not JSON */ }
      throw new AdoError(res.status, msg);
    }
    return res;
  }

  return {
    async get(path, query) {
      return (await call(path, query)).json();
    },
    async getText(path, query) {
      return (await call(path, query)).text();
    },
    async getBytes(path, query, maxBytes = Infinity) {
      const res = await call(path, query, { headers: { Accept: 'application/octet-stream' } });
      const len = Number(res.headers.get('content-length'));
      if (Number.isFinite(len) && len > maxBytes) return { tooLarge: true };
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length > maxBytes) return { tooLarge: true };
      return { bytes };
    },
    async post(path, body, query) {
      const res = await call(path, query, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
      return res.json();
    },
    // Follows both paging styles ADO uses: nextSkip/nextTop in the body, or a continuation token header.
    async getAllPages(path, query = {}, listKey = 'value', maxPages = 50) {
      const all = [];
      let q = { ...query };
      for (let page = 0; page < maxPages; page++) {
        const res = await call(path, q);
        const body = await res.json();
        all.push(...(body[listKey] || []));
        const ct = res.headers.get('x-ms-continuationtoken');
        if (body.nextSkip) q = { ...q, $skip: body.nextSkip, $top: body.nextTop || q.$top };
        else if (ct) q = { ...q, continuationToken: ct };
        else return all;
      }
      return all;
    },
  };
}
