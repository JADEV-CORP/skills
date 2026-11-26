import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDecisionsText } from '../scripts/lib/decisions.mjs';
import { encodeDecisions } from '../page/app.mjs';

const payload = { pr: 42, iteration: 3, items: [{ id: 'R-01', decision: 'post', comment: 'Café, "quotes", commas\nand a second line' }], undecided: ['R-02'] };

test('decisions are read from JSON', () => {
  assert.deepEqual(parseDecisionsText(JSON.stringify(payload)), payload);
});

test('decisions are read from raw Lavish poll output', () => {
  const pollOutput = `session:\n  status: feedback\nprompts[1]{uid,prompt,selector,tag,text}:\n  "1","Post these PR review decisions. Return one outcome per ID. ${encodeDecisions(payload)}\\n\\nContext data:\\npr: 42",div,pr-review-decisions,1 decisions for PR 42\n`;
  assert.deepEqual(parseDecisionsText(pollOutput), payload);
});

test('encodeDecisions gives a single PRR1 token with no spaces or quotes', () => {
  assert.match(encodeDecisions(payload), /^PRR1:[A-Za-z0-9+/=]+$/);
});

test('text without decisions is refused', () => {
  assert.throws(() => parseDecisionsText('session:\n  status: waiting\n'), /No decisions found/);
});

test('the last PRR1 token wins when the reviewer sent twice', () => {
  const first = { ...payload, items: [{ id: 'R-01', decision: 'skip', comment: 'x' }] };
  const text = `"1","Post ${encodeDecisions(first)}"\n"2","Post ${encodeDecisions(payload)}"`;
  assert.deepEqual(parseDecisionsText(text), payload);
});
