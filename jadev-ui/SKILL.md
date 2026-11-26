---
name: jadev-ui
description: "Designs, critiques and polishes web pages and app screens: hierarchy, spacing, type, colour and WCAG 2.2 AA contrast, states, responsive layout, motion. Use for any UI build, redesign, review or polish, then verify it in a real browser."
license: MIT
---

# jadev-ui

Make interfaces that are clear first and good-looking second, and prove both in a browser. A screen is done when the main task is obvious, every state is designed, it passes WCAG 2.2 AA, and you have looked at it at phone and desktop widths in light and dark.

## 1. Read the project before designing

Brand and design systems live in the project, not in this skill. Before any edit, find and read what exists:

- Design docs: `DESIGN.md`, `PRODUCT.md`, brand guidelines, a `docs/design` folder.
- Tokens: CSS custom properties, `tokens.json`, Tailwind theme, SCSS variables, a theme file in the component library.
- Components: the shared UI library, Storybook, the existing pages that do the same job.

Use the project's tokens and components. Do not invent a colour, font, radius or spacing value that the system already defines. If there is no system, propose a small token set (colours, type scale, spacing scale, radii, shadows) and get a yes before spreading it across files.

## 2. Pick the mode

- **Build:** a new screen or component. Write down the user, the one main task and the content before choosing a look. Then structure, then styling, then motion.
- **Critique:** review without editing. Follow `references/critique.md` and report findings with severity.
- **Polish:** keep the existing identity, copy and behaviour. Fix spacing, alignment, type, contrast, states and motion. Ask before changing copy or layout structure.

Product screens want density and familiar patterns; marketing pages can take a stronger point of view.

## 3. Rules that always apply

Details and numbers: `references/foundations.md`.

- **Hierarchy:** one primary action per view. Size, weight, colour and position agree on what matters most. Squint at the screenshot: the order you see things must match the task.
- **Spacing:** one scale (4 px base) from the tokens. Related things closer than unrelated things. Align to a grid; no off-scale values.
- **Type:** one modular scale, body at 16 px or more on the web, line height 1.4 to 1.6 for body, 45 to 75 characters per line. Two families at most.
- **Colour and contrast:** text 4.5:1, large text and UI parts (borders of inputs, focus rings, icons that carry meaning) 3:1. Colour never carries meaning alone. Check both themes.
- **States:** every control has default, hover, focus-visible, active, disabled and loading where relevant. Every data view has empty, loading, error, partial and long-content states.
- **Responsive:** design at 320, 390, 768 and 1440 px. No horizontal scroll at 320 px. Targets at least 24 by 24 CSS px (44 px on touch-first screens).
- **Motion:** only to explain a change (enter, exit, move, feedback). 100 to 300 ms, transform and opacity only. Wrap non-essential motion in `prefers-reduced-motion: no-preference`.
- **Content:** real or realistic text and data, including long names and empty values. Labels say what happens ("Save changes", not "Submit").
- **Semantics:** native elements first (`button`, `a`, `label`, `dialog`). Keyboard reaches everything in a sensible order, and focus is always visible.

## 4. Verify in a browser

Never report a UI change as done from the code alone. Follow `references/verify.md`:

1. Run the app or open the page.
2. Screenshots at 320, 390, 768 and 1440 px, light and dark, with reduced motion. Open the PNGs and look at them.
3. Automated checks: horizontal overflow, console errors, axe-core with WCAG 2.2 AA tags.
4. Keyboard pass: Tab through the page, check order, visible focus, no traps, Escape closes overlays.
5. Zoom to 200 % and check nothing is cut off.

Fix what one round shows, then run the round again. Automated checks catch only part of the accessibility problems: the keyboard pass and your own look at the screenshots are not optional.

## 5. Report

For a build or polish: what changed, the files, the widths and themes you checked, the tool results, anything left open.

For a critique, one line per finding:

```
[Blocker|Major|Minor|Nit] screen > element @ width/theme: problem. Why (rule or WCAG criterion). Fix.
```

Lead with blockers.

## References (load when needed)

- `references/foundations.md`: hierarchy, spacing and type scales, colour and contrast (WCAG 2.2 AA criteria with numbers), dark mode, states, responsive layout, motion and reduced motion.
- `references/critique.md`: the critique pass in order, the checklist and the severity rules.
- `references/verify.md`: the browser check with pinned `playwright-core` and `@axe-core/playwright`, the script, the keyboard and zoom passes.
