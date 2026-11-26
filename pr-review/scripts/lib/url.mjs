// Parses an Azure DevOps pull request URL into its parts.
// Supports dev.azure.com/<org>/... and the older <org>.visualstudio.com/... form.

export function parsePrUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`Not an Azure DevOps pull request URL: ${url}`);
  }
  const parts = u.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  let org;
  let rest;
  if (u.hostname === 'dev.azure.com') {
    [org, ...rest] = parts;
  } else if (u.hostname.endsWith('.visualstudio.com')) {
    org = u.hostname.split('.')[0];
    rest = parts;
  }
  // rest: <project> _git <repo> pullrequest <id>
  if (!org || !rest || rest.length < 5 || rest[1] !== '_git' || rest[3].toLowerCase() !== 'pullrequest') {
    throw new Error(`Not an Azure DevOps pull request URL: ${url}`);
  }
  const id = Number(rest[4]);
  if (!Number.isInteger(id) || id < 1) throw new Error(`Not an Azure DevOps pull request URL: ${url}`);
  return { org, project: rest[0], repo: rest[2], id, baseUrl: `https://dev.azure.com/${org}` };
}
