# Verify in a browser

Look at the rendered result at the widths it ships at. Code review alone does not count as verification.

## Option A: a browser tool the agent already has

If your agent has a browser tool, use it: open the page, resize to each width, switch the colour scheme (emulated `prefers-color-scheme`), turn on emulated `prefers-reduced-motion: reduce`, take full-page screenshots, read the console. Then do the keyboard and zoom passes below.

## Option B: the pinned scripts

Two small scripts with versions checked on npm:

- `playwright-core@1.65.1` (Apache-2.0). It drives the Google Chrome that is already installed (`channel: 'chrome'`). It downloads no browser.
- `@axe-core/playwright@4.14.0` (MPL-2.0), which brings `axe-core` 4.14.

Keep them out of the project's own dependencies. Install once in a local folder that git ignores (the last line assumes a git repository):

```
mkdir -p .ui-check && cd .ui-check
npm init -y
npm i -D --save-exact playwright-core@1.65.1 @axe-core/playwright@4.14.0
cd ..
grep -qx '.ui-check/' .git/info/exclude || echo '.ui-check/' >> .git/info/exclude
```

If Google Chrome is not installed, use `channel: 'msedge'` for Microsoft Edge, or `executablePath` for a Chromium the person already has. Do not download a browser without asking.

Start the app (its own dev server or a static server on `127.0.0.1`), then run the scripts against the local URL.

### Screenshots, overflow, console and axe

Save as `.ui-check/shots.mjs`:

```js
// Screenshots and an axe scan at four widths, light and dark, with reduced motion.
// Usage: node .ui-check/shots.mjs <url> [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { AxeBuilder } from '@axe-core/playwright';

const url = process.argv[2];
const out = process.argv[3] ?? '.ui-check/out';
if (!url) {
  console.error('usage: node .ui-check/shots.mjs <url> [outDir]');
  process.exit(2);
}
mkdirSync(out, { recursive: true });

const widths = [
  { name: 'phone-320', width: 320, height: 640 },
  { name: 'phone-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];
const schemes = ['light', 'dark'];

// channel 'chrome' uses the Google Chrome already installed: nothing is downloaded.
const browser = await chromium.launch({ channel: 'chrome' });
const report = [];
let failed = false;

for (const scheme of schemes) {
  for (const v of widths) {
    const context = await browser.newContext({
      viewport: { width: v.width, height: v.height },
      colorScheme: scheme,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url, { waitUntil: 'networkidle' });
    const file = `${out}/${v.name}-${scheme}.png`;
    await page.screenshot({ path: file, fullPage: true });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    const entry = { file, overflowPx: overflow, consoleErrors: errors };
    // One axe run per scheme at the phone width covers contrast, names and roles.
    if (v.name === 'phone-390') {
      const axe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      entry.axe = axe.violations.map((x) => ({
        id: x.id, impact: x.impact, help: x.help,
        targets: x.nodes.slice(0, 5).map((n) => n.target.join(' ')),
      }));
      if (axe.violations.length) failed = true;
    }
    if (overflow > 0 || errors.length) failed = true;
    report.push(entry);
    await context.close();
  }
}
await browser.close();
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(failed ? 1 : 0);
```

Run `node .ui-check/shots.mjs http://127.0.0.1:3000/page`. Exit code 1 means at least one finding. Then:

- Open every PNG and look at it. The JSON does not tell you the hierarchy is wrong or a card is misaligned.
- `overflowPx` above 0 at 320 or 390 is a reflow failure: find the element that is wider than the viewport.
- A missing `favicon.ico` shows up as a console 404. Add one or note it.
- Each axe violation is a finding. Contrast results depend on the theme, so read both.

For a page behind a login, sign in by hand in the browser tool or ask the person for a test account. Never put credentials in the script.

### Keyboard order

Save as `.ui-check/tabs.mjs`:

```js
// Lists the keyboard focus order and flags elements with no visible focus style.
// Usage: node .ui-check/tabs.mjs <url> [maxSteps]
import { chromium } from 'playwright-core';

const url = process.argv[2];
const max = Number(process.argv[3] ?? 40);
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
const seen = new Set();
for (let i = 1; i <= max; i++) {
  await page.keyboard.press('Tab');
  const info = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const s = getComputedStyle(el);
    const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none';
    const name = (el.getAttribute('aria-label') || el.innerText || el.value || el.id || '').trim().slice(0, 40);
    return { tag: el.tagName.toLowerCase(), name, ring, path: el.id ? `#${el.id}` : el.className ? `.${String(el.className).split(' ')[0]}` : '' };
  });
  if (!info) break;
  const key = `${info.tag}${info.path}${info.name}`;
  if (seen.has(key)) break; // wrapped around
  seen.add(key);
  console.log(`${String(i).padStart(2)} ${info.ring ? 'ring ' : 'NO RING'} ${info.tag}${info.path} "${info.name}"`);
}
await browser.close();
```

Compare the printed order with the visual order. `NO RING` is a likely 2.4.7 failure; confirm on a screenshot with focus on that element. The ring check is a heuristic: a focus style made with a border or background change shows as `NO RING` and needs a look.

## Manual passes

- **Keyboard:** Tab and Shift+Tab through the whole page. Enter and Space activate. Arrow keys inside menus, tabs and radio groups. Escape closes dialogs and menus and returns focus to the trigger. Nothing is reachable only by hover.
- **Zoom:** 200 % browser zoom at 1440 px. No clipped or overlapping text, no lost controls.
- **Reduced motion:** with reduce emulated, nothing slides, zooms or loops.
- **Real content:** the longest realistic name, an empty list, an error from the server, a slow network (throttle in the browser tool).

## Native app screens

Same rules, different tools: simulator or emulator screenshots in light and dark, at the smallest and largest supported device, and at the largest accessibility text size (Dynamic Type on iOS, font scale on Android). Check with the platform's accessibility inspector.

## Clean up

Delete `.ui-check/out/` when the work is done. Keep `.ui-check/` only if the person wants to reuse it.
