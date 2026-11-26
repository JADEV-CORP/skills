import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProfiles, profileForOrg } from '../scripts/lib/profile.mjs';

const builtinDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'profiles');
const emptyAddons = () => mkdtempSync(join(tmpdir(), 'prr-addons-'));
const addon = (dir, name, json) => {
  mkdirSync(join(dir, name), { recursive: true });
  writeFileSync(join(dir, name, 'addon.json'), JSON.stringify(json));
};

test('built-in example profile loads', () => {
  const p = profileForOrg(loadProfiles({ builtinDir, addonsDir: emptyAddons() }), 'your-org');
  assert.equal(p.name, 'example');
  assert.equal(p.assetRegisterCheck, false);
  assert.equal(p.outsideLookups, false);
  assert.equal(p.language, 'en');
  assert.equal(p.workRoot, join(homedir(), 'pr-reviews'));
  assert.deepEqual(p.tokenCommand.slice(0, 3), ['az', 'account', 'get-access-token']);
});

test('org match is case-insensitive', () => {
  const p = profileForOrg(loadProfiles({ builtinDir, addonsDir: emptyAddons() }), 'YOUR-ORG');
  assert.equal(p.name, 'example');
});

test('add-on overrides built-in for same org and inherits its missing fields', () => {
  const dir = emptyAddons();
  addon(dir, 'local', { name: 'local', orgs: ['your-org'], tokenCommand: ['echo', 'x'] });
  const p = profileForOrg(loadProfiles({ builtinDir, addonsDir: dir }), 'your-org');
  assert.equal(p.name, 'local');
  assert.deepEqual(p.tokenCommand, ['echo', 'x']);
  assert.equal(p.workRoot, join(homedir(), 'pr-reviews'));
  assert.equal(p.brand.name, 'Your team');
});

test('add-on for a new org takes generic defaults', () => {
  const dir = emptyAddons();
  addon(dir, 'example', { name: 'example-client', orgs: ['ExampleOrg'], tokenCommand: ['echo', 'x'] });
  const p = profileForOrg(loadProfiles({ builtinDir, addonsDir: dir }), 'exampleorg');
  assert.equal(p.language, 'en');
  assert.equal(p.groups, null);
  assert.equal(p.assetRegisterCheck, false);
  assert.equal(p.outsideLookups, false);
  assert.equal(p.instructions, null);
});

test('add-on instructions path resolves against its folder', () => {
  const dir = emptyAddons();
  addon(dir, 'example', { name: 'example-client', orgs: ['ExampleOrg'], tokenCommand: ['echo'], instructions: 'instructions.md', workRoot: '~/x' });
  const p = profileForOrg(loadProfiles({ builtinDir, addonsDir: dir }), 'ExampleOrg');
  assert.equal(p.instructions, join(dir, 'example', 'instructions.md'));
  assert.equal(p.workRoot, join(homedir(), 'x'));
});

test('unknown org throws the add-one message', () => {
  assert.throws(
    () => profileForOrg(loadProfiles({ builtinDir, addonsDir: emptyAddons() }), 'nobody'),
    /No review profile for organization "nobody"\. Add one in ~\/\.config\/pr-review\/addons\/<name>\/addon\.json/,
  );
});

test('missing addons dir is fine', () => {
  const profiles = loadProfiles({ builtinDir, addonsDir: join(tmpdir(), 'does-not-exist-prr') });
  assert.ok(profiles.length >= 1);
});

test('built-in example brand has a name, a colour and no logo', () => {
  const p = profileForOrg(loadProfiles({ builtinDir, addonsDir: emptyAddons() }), 'your-org');
  assert.equal(p.brand.name, 'Your team');
  assert.match(p.brand.accent, /^#[0-9a-f]{6}$/i);
  assert.equal(p.brand.robot, true);
  assert.equal(p.brand.logo, null);
});

test('add-on brand logo resolves against its folder', () => {
  const dir = emptyAddons();
  addon(dir, 'example', { name: 'example-client', orgs: ['ExampleOrg'], tokenCommand: ['echo'], brand: { name: 'Example', accent: '#123456', logo: 'logo.svg' } });
  const p = profileForOrg(loadProfiles({ builtinDir, addonsDir: dir }), 'ExampleOrg');
  assert.deepEqual(p.brand, { name: 'Example', accent: '#123456', logo: join(dir, 'example', 'logo.svg'), robot: true });
});

test('profile without brand gets a name-only brand', () => {
  const dir = emptyAddons();
  addon(dir, 'example', { name: 'example-client', orgs: ['ExampleOrg'], tokenCommand: ['echo'] });
  const p = profileForOrg(loadProfiles({ builtinDir, addonsDir: dir }), 'ExampleOrg');
  assert.deepEqual(p.brand, { name: 'example-client', accent: null, logo: null, robot: true });
});

test('add-on covering a built-in org and another org does not inherit the built-in', () => {
  const dir = emptyAddons();
  addon(dir, 'mixed', { name: 'mixed', orgs: ['your-org', 'ClientOrg'], tokenCommand: ['echo'] });
  const p = profileForOrg(loadProfiles({ builtinDir, addonsDir: dir }), 'ClientOrg');
  assert.equal(p.outsideLookups, false);
  assert.equal(p.assetRegisterCheck, false);
  assert.equal(p.brand.name, 'mixed');
});
