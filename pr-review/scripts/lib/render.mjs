import { readFileSync, statSync } from 'node:fs';
import { secretValues, maskSecret } from './secrets.mjs';

// Builds the self-contained review page: template + embedded data + page script.

const ESC = { '<': '\\u003c', '>': '\\u003e', '&': '\\u0026', '\u2028': '\\u2028', '\u2029': '\\u2029' };

// JSON that is safe inside a <script> element: no "</script", no "<!--", no raw line separators.
export const embedJson = (value) => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (c) => ESC[c]);

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const LOGO_TYPES = { png: 'image/png', svg: 'image/svg+xml', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
const MAX_LOGO_BYTES = 100 * 1024;
const COLOUR = /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla|oklch|oklab)\([0-9.,%\s/-]+\))$/i;

// Brand for the page: the logo is inlined once (small files only), the accent must be a plain colour.
export function brandFor(brand) {
  if (!brand) return null;
  let logo = null;
  const type = brand.logo && LOGO_TYPES[String(brand.logo).split('.').pop().toLowerCase()];
  if (type) {
    try {
      if (statSync(brand.logo).size <= MAX_LOGO_BYTES) logo = `data:${type};base64,${readFileSync(brand.logo).toString('base64')}`;
    } catch { /* missing logo: show the name instead */ }
  }
  return { name: String(brand.name || ''), accent: brand.accent && COLOUR.test(brand.accent) ? brand.accent : null, logo, robot: brand.robot !== false };
}

// Detected secret values never reach the page: each is replaced by its masked preview.
function masked(review) {
  const values = secretValues(review.files || [], { allLines: true }).sort((a, b) => b.length - a.length);
  if (!values.length) return review;
  const hide = (text) => (text == null ? text : values.reduce((t, v) => t.split(v).join(maskSecret(v)), text));
  return { ...review, files: review.files.map((f) => ({ ...f, oldContent: hide(f.oldContent), newContent: hide(f.newContent) })) };
}

export function renderPage({ review, doc, template, appSource, brand = null }) {
  if (/<\/script/i.test(appSource)) throw new Error('page script must not contain a closing script tag');
  const values = {
    TITLE: escapeHtml(`PR ${review.pr.id}: ${review.pr.title}`),
    DATA: embedJson(brand ? { review: masked(review), doc, brand } : { review: masked(review), doc }),
    APP: appSource,
  };
  // A function replacer keeps "$&" and "$1" in the data literal.
  return template.replace(/\{\{(TITLE|DATA|APP)\}\}/g, (_, key) => values[key]);
}
