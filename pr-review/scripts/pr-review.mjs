#!/usr/bin/env node
// pr-review: fetch | check | render | post | apply. See SKILL.md for the loop.

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePrUrl } from './lib/url.mjs';
import { loadProfiles, profileForOrg } from './lib/profile.mjs';
import { getToken } from './lib/token.mjs';
import { createAdo } from './lib/ado.mjs';
import { fetchReview } from './lib/fetch-pr.mjs';
import { workDirFor, loadState, saveState } from './lib/state.mjs';
import { checkFindings } from './lib/findings.mjs';
import { renderPage, brandFor } from './lib/render.mjs';
import { postDecisions } from './lib/post.mjs';
import { applyFixes } from './lib/apply.mjs';
import { parseDecisionsText } from './lib/decisions.mjs';

const SKILL_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const writeJson = (file, v) => writeFileSync(file, `${JSON.stringify(v, null, 2)}\n`);
const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`Cannot read ${file}: ${e.message}`);
  }
};

async function cmdFetch([url]) {
  if (!url) throw new Error('Usage: pr-review.mjs fetch <pull request URL>');
  const pr = parsePrUrl(url);
  const profile = profileForOrg(loadProfiles({ builtinDir: join(SKILL_DIR, 'profiles') }), pr.org);
  const ado = createAdo({ baseUrl: pr.baseUrl, token: await getToken(profile) });
  const dir = workDirFor(profile, pr);
  mkdirSync(dir, { recursive: true });
  const review = await fetchReview({ pr, profile, ado, state: loadState(dir) });
  writeJson(join(dir, 'review.json'), review);
  console.log(dir);
}

async function cmdCheck([dir]) {
  if (!dir) throw new Error('Usage: pr-review.mjs check <work dir>');
  const review = readJson(join(dir, 'review.json'));
  const result = checkFindings(review, readJson(join(dir, 'findings.json')), loadState(dir));
  for (const w of result.warnings) console.log(`warning: ${w}`);
  for (const e of result.errors) console.log(`error: ${e}`);
  if (result.errors.length) {
    process.exitCode = 1;
    return;
  }
  writeJson(join(dir, 'findings.json'), result.doc);
  saveState(dir, result.state);
  console.log(`ok: ${result.doc.findings.length} findings (${result.doc.findings.map((f) => f.id).join(', ') || 'none'})`);
}

async function cmdRender([dir]) {
  if (!dir) throw new Error('Usage: pr-review.mjs render <work dir>');
  const review = readJson(join(dir, 'review.json'));
  let brand = null;
  try {
    brand = brandFor(profileForOrg(loadProfiles({ builtinDir: join(SKILL_DIR, 'profiles') }), review.pr.org).brand);
  } catch { /* no profile: plain page */ }
  const html = renderPage({
    review,
    brand,
    doc: readJson(join(dir, 'findings.json')),
    template: readFileSync(join(SKILL_DIR, 'page', 'template.html'), 'utf8'),
    appSource: readFileSync(join(SKILL_DIR, 'page', 'app.mjs'), 'utf8'),
  });
  writeFileSync(join(dir, 'review.html'), html);
  console.log(join(dir, 'review.html'));
}

function option(args, name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

async function cmdPost(args) {
  const [dir] = args;
  const decisionsFile = option(args, '--decisions');
  if (!dir || !decisionsFile) throw new Error('Usage: pr-review.mjs post <work dir> --decisions <file> [--repo <local clone>] [--dry-run]');
  const review = readJson(join(dir, 'review.json'));
  const doc = readJson(join(dir, 'findings.json'));
  const decisions = parseDecisionsText(readFileSync(decisionsFile, 'utf8'));
  const repoDir = option(args, '--repo');
  const profile = profileForOrg(loadProfiles({ builtinDir: join(SKILL_DIR, 'profiles') }), review.pr.org);
  const ado = createAdo({ baseUrl: `https://dev.azure.com/${review.pr.org}`, token: await getToken(profile) });
  const { receipt } = await postDecisions({
    review, doc, decisions, state: loadState(dir), ado,
    dryRun: args.includes('--dry-run'),
    save: (s) => saveState(dir, s),
    applyFix: repoDir ? (items) => applyFixes({ review, doc, items, repoDir }) : undefined,
  });
  writeJson(join(dir, 'receipt.json'), receipt);
  for (const o of receipt.outcomes) console.log(`${o.id}\t${o.outcome}\t${o.url || o.reason || ''}`);
  if (receipt.outcomes.some((o) => o.outcome === 'failed')) process.exitCode = 1;
}

const COMMANDS = { fetch: cmdFetch, check: cmdCheck, render: cmdRender, post: cmdPost };

const [cmd, ...args] = process.argv.slice(2);
if (!COMMANDS[cmd]) {
  console.error(`Usage: pr-review.mjs <${Object.keys(COMMANDS).join('|')}> ...`);
  process.exit(2);
}
COMMANDS[cmd](args).catch((e) => {
  console.error(e.message);
  process.exit(2);
});
