// File kinds by extension. Shared by the fetch (binary detection) and the asset checks.

const KINDS = {
  image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp', 'tif', 'tiff', 'avif', 'heic'],
  font: ['woff', 'woff2', 'ttf', 'otf', 'eot'],
  media: ['mp4', 'mov', 'webm', 'mp3', 'wav', 'ogg', 'm4a'],
  binary: ['zip', 'gz', 'tgz', '7z', 'rar', 'jar', 'dll', 'exe', 'so', 'dylib', 'pdf', 'docx', 'xlsx', 'pptx', 'bin', 'pfx', 'p12'],
};
const BY_EXT = Object.fromEntries(Object.entries(KINDS).flatMap(([k, exts]) => exts.map((e) => [e, k])));

export function kindOf(path) {
  const m = /\.([a-z0-9]+)$/i.exec(path);
  return (m && BY_EXT[m[1].toLowerCase()]) || null;
}

// SVG is an image for the asset checks but readable text for the diff.
export const isBinaryPath = (path) => {
  const k = kindOf(path);
  return k !== null && !/\.svg$/i.test(path);
};

export function looksBinary(bytes) {
  const n = Math.min(bytes.length, 8000);
  for (let i = 0; i < n; i++) if (bytes[i] === 0) return true;
  return false;
}
