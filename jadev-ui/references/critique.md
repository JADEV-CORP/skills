# Critique

A critique is read-only. Do not edit files during it. Look at the rendered screens (see `verify.md`), not only the code.

## Severity

| Level | Meaning | Examples |
|---|---|---|
| Blocker | Someone cannot complete the task, or is excluded. Ship stops. | Body text or a control below WCAG contrast; an action not reachable by keyboard; focus invisible; layout broken or scrolling sideways at 320 px; input without a label; data lost on error; a target under 24 px with no spacing. |
| Major | Most people are slowed down or misled. Fix before release. | Primary action unclear or competing with others; missing loading, empty or error state; dark mode unreadable in places; inconsistent components for the same job; content jumps while loading; motion ignores reduced-motion. |
| Minor | Visible lack of polish. Fix in the same pass if cheap. | Off-scale spacing; misaligned edges or baselines; mixed radii or shadows; heading widows; inconsistent capitalisation; icon sizes that differ by a pixel or two. |
| Nit | Taste. Mention once, never block on it. | A colour a shade off, a different easing you would prefer. |

Rank by severity, then by how many screens or people it touches. Do not inflate: a Minor called a Blocker teaches people to ignore the list.

## The pass, in order

1. **Five-second read.** What is this screen, what can I do here, what is the main action? If you cannot answer from the screenshot, that is the first finding.
2. **Hierarchy.** One primary action. Reading order matches the task. Title, key numbers and the action stand out in a blurred screenshot.
3. **Layout and spacing.** One spacing scale, consistent gutters, aligned edges, related items grouped, nothing cramped against edges.
4. **Type.** One scale, readable body size, line length, line height, heading levels used in order, no faux bold or stretched text.
5. **Colour and contrast.** Every text and UI pair in both themes (computed colours). Meaning not by colour alone. Brand colours used for roles, not decoration everywhere.
6. **States.** Hover, focus-visible, active, disabled, loading on controls. Empty, loading, error, partial, long content on views. Form errors next to their field with the input kept.
7. **Responsive.** 320, 390, 768, 1440. No sideways scroll, no clipped text, targets big enough, navigation usable on a phone, tables handled (scroll container, stacked rows or fewer columns).
8. **Motion.** Purposeful, short, transform and opacity, reduced-motion respected, nothing auto-moving for more than 5 seconds without pause.
9. **Content.** Labels say the outcome. Errors say what to do. No lorem ipsum, no fake precision, no jargon the audience does not use. Numbers formatted for the locale.
10. **Accessibility.** Keyboard order and traps, visible focus, accessible names on icon buttons, headings and landmarks, alt text that says what the image means, `lang` set, 200 % zoom.
11. **Consistency with the system.** Tokens used instead of raw values, the shared component used instead of a near copy, patterns that match the rest of the product.
12. **Performance you can see.** Layout shift from images without dimensions or late fonts, a slow largest image, heavy effects (large blurs, many shadows) on scroll.

## Checklist

Copy this into the report and mark each line pass, fail (with the finding) or not applicable.

```
[ ] Main task and primary action obvious in 5 seconds
[ ] One spacing scale, edges aligned
[ ] One type scale, body >= 16 px, line length <= 75 characters
[ ] Text contrast 4.5:1, large text and UI parts 3:1, light and dark
[ ] Meaning never by colour alone
[ ] Focus visible on every interactive element, not hidden by sticky bars
[ ] Keyboard reaches everything in visual order, no traps, Escape closes overlays
[ ] Every control has its states; every view has empty, loading, error
[ ] No horizontal scroll at 320 px; nothing clipped at 200 % zoom
[ ] Targets >= 24 x 24 px (44 px on touch-first screens)
[ ] Motion purposeful, 100 to 300 ms, reduced-motion respected
[ ] Labels and errors say what happens and what to do
[ ] Tokens and shared components used, no stray raw values
[ ] No console errors; axe-core clean or every remaining item explained
```

## Report shape

```
Scope:     screens, widths and themes reviewed, how (browser, tool versions)
Verdict:   ship / ship after blockers / rework
Blockers:  [Blocker] screen > element @ width/theme: problem. Why. Fix.
Major:     ...
Minor:     ...
Nits:      ...
Works:     one or two lines on what to keep, only if true
```

Each finding names where it is, what is wrong, the rule it breaks (a WCAG criterion number when it is one) and a concrete fix with the token or value to use. Attach or reference the screenshot file for each Blocker and Major.
