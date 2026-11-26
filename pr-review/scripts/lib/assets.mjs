// Images, fonts and media a PR adds: is each one in the asset register, and does it still carry metadata?

import { kindOf } from './filetypes.mjs';

const ASSET_KINDS = new Set(['image', 'font', 'media']);

function metadataOf(bytes, path) {
  const s = Buffer.from(bytes).toString('latin1');
  const found = [];
  const isPng = bytes[0] === 0x89 && s.startsWith('PNG', 1);
  if (s.includes('Exif\0\0') || (isPng && s.includes('eXIf'))) found.push('EXIF');
  if (s.includes('<x:xmpmeta') || s.includes('http://ns.adobe.com/xap/1.0/')) found.push('XMP');
  if (isPng && /tEXt|iTXt|zTXt/.test(s)) found.push('PNG text');
  if (/\.svg$/i.test(path) && /<metadata|<rdf:RDF/i.test(s)) found.push('SVG metadata');
  return found;
}

export function isAssetAdd(f) {
  return f.changeType === 'add' && ASSET_KINDS.has(kindOf(f.path));
}

export async function assetSignals(files, { registerCheck, register, getBytes }) {
  const out = [];
  for (const f of files.filter(isAssetAdd)) {
    let metadata;
    try {
      const r = await getBytes(f.path);
      metadata = r.tooLarge ? ['not checked: over 15 MB'] : metadataOf(r.bytes, f.path);
    } catch {
      metadata = ['not checked: could not read'];
    }
    out.push({
      path: f.path,
      kind: kindOf(f.path),
      registered: registerCheck ? !!register && register.includes(f.path) : null,
      metadata,
    });
  }
  return out;
}
