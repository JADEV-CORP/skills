import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffDeps } from '../scripts/lib/deps.mjs';
import { enrichDeps } from '../scripts/lib/lookups.mjs';
import { assetSignals } from '../scripts/lib/assets.mjs';
import { scanSecrets, maskSecret } from '../scripts/lib/secrets.mjs';

const f = (path, oldContent, newContent, changeType = oldContent == null ? 'add' : newContent == null ? 'delete' : 'edit') =>
  ({ path, changeType, oldContent, newContent, binary: false, tooLarge: false });
const byName = (deps) => Object.fromEntries(deps.map((d) => [d.name, d]));

test('package.json upgrade is one DepChange with from and to', () => {
  const deps = diffDeps([f('web/package.json',
    JSON.stringify({ dependencies: { a: '1.0.0', b: '2.0.0' } }),
    JSON.stringify({ dependencies: { a: '1.1.0', b: '2.0.0' }, devDependencies: { c: '^3.0.0' } }))]);
  const d = byName(deps);
  assert.equal(deps.length, 2);
  assert.deepEqual(d.a, { ecosystem: 'npm', manifest: 'web/package.json', name: 'a', from: '1.0.0', to: '1.1.0', licence: null, licenceFrom: null, vulns: null });
  assert.equal(d.c.from, null);
  assert.equal(d.c.to, '^3.0.0');
});

test('csproj new PackageReference', () => {
  const deps = diffDeps([f('src/Api/Api.csproj',
    '<Project><ItemGroup><PackageReference Include="Old.Pkg" Version="1.0.0" /></ItemGroup></Project>',
    '<Project><ItemGroup><PackageReference Include="Old.Pkg" Version="1.0.0" /><PackageReference Include="Foo.Bar" Version="2.1.0" /></ItemGroup></Project>')]);
  assert.deepEqual(deps.map((d) => [d.ecosystem, d.name, d.from, d.to]), [['nuget', 'Foo.Bar', null, '2.1.0']]);
});

test('Directory.Packages.props version bump', () => {
  const deps = diffDeps([f('Directory.Packages.props',
    '<Project><ItemGroup><PackageVersion Include="Foo" Version="1.0.0" /></ItemGroup></Project>',
    '<Project><ItemGroup><PackageVersion Include="Foo" Version="1.1.0" /></ItemGroup></Project>')]);
  assert.deepEqual(deps.map((d) => [d.name, d.from, d.to]), [['Foo', '1.0.0', '1.1.0']]);
});

test('requirements pin change', () => {
  const deps = diffDeps([f('requirements.txt', 'requests==2.31.0\nflask==3.0.0\n', 'requests==2.32.0\nflask==3.0.0\n')]);
  assert.deepEqual(deps.map((d) => [d.ecosystem, d.name, d.from, d.to]), [['pypi', 'requests', '2.31.0', '2.32.0']]);
});

test('Dockerfile FROM change', () => {
  const deps = diffDeps([f('Dockerfile', 'FROM node:20-alpine AS build\nRUN x\n', 'FROM --platform=linux/amd64 node:22-alpine AS build\nRUN x\n')]);
  assert.deepEqual(deps.map((d) => [d.ecosystem, d.name, d.from, d.to]), [['docker', 'node', '20-alpine', '22-alpine']]);
});

test('unchanged deps are not listed', () => {
  const same = JSON.stringify({ dependencies: { a: '1.0.0' } });
  assert.deepEqual(diffDeps([f('package.json', same, same), f('README.md', 'a', 'b')]), []);
});

test('lookups disabled make no request', async () => {
  const deps = [{ ecosystem: 'npm', manifest: 'package.json', name: 'a', from: null, to: '1.0.0', licence: null, licenceFrom: null, vulns: null }];
  const out = await enrichDeps(deps, { enabled: false, fetchImpl: () => { throw new Error('network used'); } });
  assert.deepEqual(out, deps);
});

const jsonRes = (b) => new Response(JSON.stringify(b), { headers: { 'content-type': 'application/json' } });

test('npm licence and OSV vulns are filled', async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push(String(url));
    if (String(url) === 'https://registry.npmjs.org/a/1.1.0') return jsonRes({ license: 'MIT' });
    if (String(url) === 'https://registry.npmjs.org/a/1.0.0') return jsonRes({ license: 'ISC' });
    if (String(url) === 'https://api.osv.dev/v1/query') {
      assert.deepEqual(JSON.parse(init.body), { package: { name: 'a', ecosystem: 'npm' }, version: '1.1.0' });
      return jsonRes({ vulns: [{ id: 'GHSA-xxxx', summary: 'Prototype pollution', details: 'long' }] });
    }
    return new Response('', { status: 404 });
  };
  const [d] = await enrichDeps([{ ecosystem: 'npm', manifest: 'package.json', name: 'a', from: '1.0.0', to: '^1.1.0', licence: null, licenceFrom: null, vulns: null }], { enabled: true, fetchImpl });
  assert.equal(d.licence, 'MIT');
  assert.equal(d.licenceFrom, 'ISC');
  assert.deepEqual(d.vulns, [{ id: 'GHSA-xxxx', summary: 'Prototype pollution' }]);
});

test('NuGet expression licence is read', async () => {
  const fetchImpl = async (url) => String(url).endsWith('foo.bar.nuspec')
    ? new Response('<package><metadata><id>Foo.Bar</id><license type="expression">Apache-2.0</license></metadata></package>')
    : jsonRes({});
  const [d] = await enrichDeps([{ ecosystem: 'nuget', manifest: 'x.csproj', name: 'Foo.Bar', from: null, to: '2.1.0', licence: null, licenceFrom: null, vulns: null }], { enabled: true, fetchImpl });
  assert.equal(d.licence, 'Apache-2.0');
});

test('lookup failures leave licence unknown instead of failing', async () => {
  const fetchImpl = async () => { throw new Error('offline'); };
  const [d] = await enrichDeps([{ ecosystem: 'pypi', manifest: 'requirements.txt', name: 'x', from: null, to: '1.0', licence: null, licenceFrom: null, vulns: null }], { enabled: true, fetchImpl });
  assert.equal(d.licence, null);
  assert.equal(d.vulns, null);
});

const png = (extraChunk) => {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return new Uint8Array([...sig, 0, 0, 0, 4, ...Buffer.from(extraChunk), 1, 2, 3, 4, 0, 0, 0, 0]);
};
const asset = (path) => ({ path, changeType: 'add', binary: true, tooLarge: false, oldContent: null, newContent: null });

test('asset without ASSETS.md row is unregistered', async () => {
  const [a] = await assetSignals([asset('img/logo.png')], { registerCheck: true, register: '| file | source |\n|---|---|\n| img/other.png | own shoot |\n', getBytes: async () => ({ bytes: png('IDAT') }) });
  assert.deepEqual(a, { path: 'img/logo.png', kind: 'image', registered: false, metadata: [] });
});

test('asset listed in ASSETS.md is registered', async () => {
  const [a] = await assetSignals([asset('img/logo.png')], { registerCheck: true, register: '| img/logo.png | Adobe Stock 123 | licence saved |\n', getBytes: async () => ({ bytes: png('IDAT') }) });
  assert.equal(a.registered, true);
});

test('register check off gives null', async () => {
  const [a] = await assetSignals([asset('fonts/a.woff2')], { registerCheck: false, register: null, getBytes: async () => ({ bytes: new Uint8Array([1, 2]) }) });
  assert.equal(a.kind, 'font');
  assert.equal(a.registered, null);
});

test('JPEG with Exif is flagged', async () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10, ...Buffer.from('Exif\0\0'), 1, 2, 3]);
  const [a] = await assetSignals([asset('p/photo.jpg')], { registerCheck: true, register: null, getBytes: async () => ({ bytes: jpeg }) });
  assert.deepEqual(a.metadata, ['EXIF']);
  assert.equal(a.registered, false);
});

test('PNG with tEXt is flagged', async () => {
  const [a] = await assetSignals([asset('img/a.png')], { registerCheck: true, register: null, getBytes: async () => ({ bytes: png('tEXt') }) });
  assert.deepEqual(a.metadata, ['PNG text']);
});

test('XMP packet is flagged and big files are not checked', async () => {
  const xmp = new Uint8Array(Buffer.from('xx<x:xmpmeta xmlns:x="adobe:ns:meta/">'));
  const [a, b] = await assetSignals([asset('a.webp'), asset('b.mp4')], {
    registerCheck: true, register: null,
    getBytes: async (p) => (p === 'a.webp' ? { bytes: xmp } : { tooLarge: true }),
  });
  assert.deepEqual(a.metadata, ['XMP']);
  assert.deepEqual(b.metadata, ['not checked: over 15 MB']);
});

test('only added assets are reported', async () => {
  const edited = { ...asset('img/a.png'), changeType: 'edit' };
  assert.deepEqual(await assetSignals([edited], { registerCheck: true, register: null, getBytes: async () => ({ bytes: png('IDAT') }) }), []);
});

test('secret in added line is found and masked', () => {
  const hits = scanSecrets([f('src/config.js', 'const a = 1;\n', 'const a = 1;\nconst password = "Sandbox123!";\nconst k = "AKIAABCDEFGHIJKLMNOP";\n')]);
  assert.deepEqual(hits.map((h) => [h.path, h.line, h.rule]), [['src/config.js', 2, 'password assignment'], ['src/config.js', 3, 'AWS access key']]);
  assert.equal(hits[0].preview, 'Sand****');
  assert.ok(!JSON.stringify(hits).includes('Sandbox123!'));
});

test('placeholder password is ignored', () => {
  const hits = scanSecrets([f('a.js', null, 'password = "<your-password>"\nsecret: "${SECRET}"\ntoken = "changeme"\napiKey = "example-key-123"\n')]);
  assert.deepEqual(hits, []);
});

test('secret on a removed line is ignored', () => {
  assert.deepEqual(scanSecrets([f('a.js', 'password = "Sandbox123!"\n', 'const x = 1;\n')]), []);
});

test('private key header and connection string are found', () => {
  const hits = scanSecrets([f('k.txt', null, '-----BEGIN RSA PRIVATE KEY-----\nDefaultEndpointsProtocol=https;AccountName=a;AccountKey=abcdEFGH1234==;\n')]);
  assert.deepEqual(hits.map((h) => h.rule), ['private key', 'storage account key']);
});

test('maskSecret keeps four characters', () => {
  assert.equal(maskSecret('abcdefgh'), 'abcd****');
  assert.equal(maskSecret('ab'), '****');
});
