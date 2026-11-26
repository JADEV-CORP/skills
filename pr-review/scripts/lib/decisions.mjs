// Reads the reviewer's decisions either from a JSON file or from the raw output of
// `lavish-axi poll`, where the page puts them as one base64 token (PRR1:...) so that
// comment text survives exactly, whatever quotes, commas or line breaks it holds.

export function parseDecisionsText(text) {
  const trimmed = String(text).trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed);
  // The reviewer may press Send more than once before a poll: the newest batch wins.
  const tokens = [...String(text).matchAll(/PRR1:([A-Za-z0-9+/=]+)/g)];
  if (!tokens.length) throw new Error('No decisions found: expected a JSON file or the saved output of lavish-axi poll');
  return JSON.parse(Buffer.from(tokens[tokens.length - 1][1], 'base64').toString('utf8'));
}
