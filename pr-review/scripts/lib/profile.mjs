// Review profiles: one per Azure DevOps organization.
// Built-in profiles ship with the skill in profiles/ (example.json is a template to edit).
// Add-ons live on the reviewer's machine in ~/.config/pr-review/addons/<name>/addon.json
// and never in this repository.
// An add-on for an org that has a built-in profile inherits that profile's missing fields,
// so a reviewer can override only the token command.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import { homedir } from 'node:os';

const DEFAULTS = {
  language: 'en',
  groups: null,
  assetRegisterCheck: false,
  outsideLookups: false,
  workRoot: '~/pr-reviews',
  instructions: null,
  brand: null,
};

export const DEFAULT_ADDONS_DIR = join(homedir(), '.config', 'pr-review', 'addons');

const expandHome = (p) => (p === '~' ? homedir() : p.startsWith('~/') ? join(homedir(), p.slice(2)) : p);

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`Cannot read profile ${file}: ${e.message}`);
  }
}

function finish(raw, dir, base = DEFAULTS) {
  const p = { ...base, ...raw, dir };
  if (!p.name || !Array.isArray(p.orgs) || !p.orgs.length || !Array.isArray(p.tokenCommand) || !p.tokenCommand.length) {
    throw new Error(`Profile in ${dir} needs name, orgs and tokenCommand`);
  }
  p.workRoot = expandHome(p.workRoot);
  // Inherited instructions are already absolute; only resolve the add-on's own relative path.
  if (raw.instructions) p.instructions = isAbsolute(raw.instructions) ? raw.instructions : join(dir, raw.instructions);
  // Brand shown on the review page. A logo path is relative to the profile's folder.
  if (raw.brand) {
    const b = raw.brand;
    p.brand = { name: b.name || p.name, accent: b.accent ?? null, logo: b.logo ? (isAbsolute(b.logo) ? b.logo : join(dir, b.logo)) : null, robot: b.robot !== false };
  } else if (!base.brand) {
    p.brand = { name: p.name, accent: null, logo: null, robot: true };
  }
  return p;
}

export function loadProfiles({ builtinDir, addonsDir = DEFAULT_ADDONS_DIR }) {
  const builtins = readdirSync(builtinDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => finish(readJson(join(builtinDir, f)), builtinDir));
  const addons = [];
  if (existsSync(addonsDir)) {
    for (const name of readdirSync(addonsDir)) {
      const file = join(addonsDir, name, 'addon.json');
      if (!existsSync(file)) continue;
      const raw = readJson(file);
      const orgs = (raw.orgs || []).map((o) => o.toLowerCase());
      // Inherit a built-in profile only when the add-on covers nothing else, so a client org
      // never picks up another org's settings such as outside lookups or its brand.
      const base = builtins.find((b) => orgs.length && orgs.every((o) => b.orgs.some((x) => x.toLowerCase() === o)));
      addons.push({ ...finish(raw, join(addonsDir, name), base || DEFAULTS), addon: true });
    }
  }
  // Add-ons first so they win over built-ins for the same org.
  return [...addons, ...builtins];
}

export function profileForOrg(profiles, org) {
  const p = profiles.find((x) => x.orgs.some((o) => o.toLowerCase() === String(org).toLowerCase()));
  if (!p) throw new Error(`No review profile for organization "${org}". Add one in ~/.config/pr-review/addons/<name>/addon.json`);
  return p;
}
