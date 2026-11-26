import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPage, embedJson } from '../scripts/lib/render.mjs';

const template = '<html><head><title>{{TITLE}}</title></head><body><script type="application/json" id="review-data">{{DATA}}</script><script type="module">{{APP}}</script></body></html>';
const review = { pr: { id: 42, title: 'Fix <b>cart</b> & co', repo: 'shop' }, files: [{ path: 'a.html', newContent: 'x</script><!-- y $& $1 \u2028' }] };
const doc = { findings: [] };

const extractData = (html) => {
  const start = html.indexOf('id="review-data">') + 'id="review-data">'.length;
  return html.slice(start, html.indexOf('</script>', start));
};

test('render embeds data and app', () => {
  const html = renderPage({ review, doc, template, appSource: 'console.log(1)' });
  assert.ok(html.includes('<script type="module">console.log(1)</script>'));
  assert.deepEqual(JSON.parse(extractData(html)), { review, doc });
});

test('render escapes closing script tags', () => {
  const html = renderPage({ review, doc, template, appSource: '' });
  const data = extractData(html);
  assert.ok(!data.includes('</script'));
  assert.ok(!data.includes('<!--'));
  assert.equal(JSON.parse(data).review.files[0].newContent, 'x</script><!-- y $& $1 \u2028');
});

test('render keeps dollar signs and escapes the title', () => {
  const html = renderPage({ review, doc, template, appSource: 'const a = "$&";' });
  assert.ok(html.includes('const a = "$&";'));
  assert.ok(html.includes('<title>PR 42: Fix &lt;b&gt;cart&lt;/b&gt; &amp; co</title>'));
});

test('embedJson escapes angle brackets, ampersands and line separators', () => {
  assert.equal(embedJson({ a: '<>&\u2028\u2029' }), '{"a":"\\u003c\\u003e\\u0026\\u2028\\u2029"}');
});

import { brandFor } from '../scripts/lib/render.mjs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('brandFor inlines a small logo as a data URI', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prr-brand-'));
  writeFileSync(join(dir, 'logo.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const b = brandFor({ name: 'Acme', accent: '#1d4ed8', logo: join(dir, 'logo.png'), robot: true });
  assert.deepEqual(b, { name: 'Acme', accent: '#1d4ed8', logo: 'data:image/png;base64,iVBORw==', robot: true });
});

test('brandFor drops a logo over 100 KB or of another type', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prr-brand-'));
  writeFileSync(join(dir, 'big.png'), Buffer.alloc(100 * 1024 + 1));
  writeFileSync(join(dir, 'logo.exe'), 'x');
  assert.equal(brandFor({ name: 'A', accent: null, logo: join(dir, 'big.png'), robot: true }).logo, null);
  assert.equal(brandFor({ name: 'A', accent: null, logo: join(dir, 'logo.exe'), robot: true }).logo, null);
  assert.equal(brandFor({ name: 'A', accent: null, logo: join(dir, 'missing.png'), robot: true }).logo, null);
});

test('brandFor drops an accent that is not a colour', () => {
  assert.equal(brandFor({ name: 'A', accent: 'red; background:url(x)', logo: null, robot: true }).accent, null);
  assert.equal(brandFor({ name: 'A', accent: 'oklch(0.5 0.2 260)', logo: null, robot: true }).accent, 'oklch(0.5 0.2 260)');
});

test('render embeds the brand', () => {
  const html = renderPage({ review, doc, template, appSource: '', brand: { name: 'Acme', accent: null, logo: null, robot: false } });
  assert.deepEqual(JSON.parse(extractData(html)).brand, { name: 'Acme', accent: null, logo: null, robot: false });
});

test('render masks detected secrets in file contents', () => {
  const r = { pr: { id: 1, title: 't' }, files: [{ path: 'c.js', oldContent: null, newContent: 'const password = "Sandbox123!";\n' }] };
  const html = renderPage({ review: r, doc, template, appSource: '' });
  assert.ok(!html.includes('Sandbox123!'));
  assert.ok(html.includes('Sand****'));
});
