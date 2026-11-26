# Foundations

The project's tokens win over every number here. Use these when the project has no value, or to judge whether the project's values work.

## Hierarchy

- Decide the reading order before styling: what the person must see first, second, third. Write it down for a new screen.
- One primary action per view, styled as the only filled button. Secondary actions are outlined or text buttons. Destructive actions are separated from the primary one and confirm or undo.
- Use few levers and use them together: size, weight, colour, position, space. Changing all of them on every element flattens the page.
- Group by proximity first, then by a shared surface (card, panel), then by lines. Borders are the last resort.
- Squint test: blur the screenshot (or step back). The primary action and the page title must still stand out.
- Left-aligned text for anything longer than two lines. Centred text only for short headings and empty states.

## Spacing

- Base unit 4 px. A practical scale: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Inside a component (icon to label, label to input): 4 to 8. Between related items: 12 to 16. Between groups: 24 to 32. Between page sections: 48 to 96.
- Internal padding of a container is never larger than the space between that container and its neighbours.
- Align edges. Text baselines in a row line up; icons centre on the text's cap height, not the line box.
- Layout grids: 4 columns on phones, 8 on tablets, 12 on desktop, with gutters from the spacing scale. Content max width for reading around 680 to 760 px.

## Type

- Body text at 16 px or more on the web. Small text (captions, meta) not below 12 px, and never for anything the person must read to complete a task.
- Scale: pick one ratio. 1.2 (minor third) for dense product UI, 1.25 to 1.333 for marketing. Example at 1.25 from 16: 13, 16, 20, 25, 31, 39, 49.
- Line height: 1.4 to 1.6 for body, 1.1 to 1.3 for headings. Tighter letter spacing on large headings, never on small text.
- Line length 45 to 75 characters for body copy (`max-width: 65ch` is a good start).
- Two families at most: one for text, optionally one for display. Load only the weights you use, `font-display: swap`, and set fallback metrics to avoid layout shift.
- Numbers in tables: tabular figures (`font-variant-numeric: tabular-nums`), right-aligned.
- Use `rem` for font sizes so browser text settings work.

## Colour and contrast (WCAG 2.2 AA)

| Criterion | What it requires |
|---|---|
| 1.4.3 Contrast (Minimum) | Text 4.5:1. Large text 3:1 (at least 24 px regular or 18.66 px bold). |
| 1.4.11 Non-text Contrast | 3:1 for UI component boundaries and states (input borders, toggles, focus indicators) and for graphics needed to understand content (chart lines, meaningful icons). |
| 1.4.1 Use of Color | Colour is never the only way to convey information. Add text, an icon or a pattern (errors, required fields, chart series, links inside text). |
| 1.4.13 Content on Hover or Focus | Tooltips and popovers can be dismissed (Escape), hovered and stay until dismissed. |

Practice:

- Build the palette as roles, not hues: background, surface, surface-raised, text, text-muted, border, primary, primary-text, success, warning, danger, focus. Components use roles only.
- Text on a coloured button must pass 4.5:1 against that colour in every state, hover included.
- Muted text still passes 4.5:1. Placeholder text is not a label.
- Disabled controls are exempt from contrast rules, but must still look disabled and not be the only way to explain why an action is unavailable.
- Check contrast with the computed colours, including transparency over the real background.

## Dark mode

- Not an inversion. Surfaces get lighter as they rise (raised cards lighter than the page), shadows matter less.
- Use near-black surfaces and off-white text to limit glare; reduce saturation of brand colours that vibrate on dark backgrounds.
- Every role has a dark value. Re-check every contrast pair in dark, not only in light.
- Set `color-scheme: light dark` so form controls and scrollbars follow the theme.
- Images and illustrations: check they still read on dark; logos may need a dark variant.

## States

Controls: default, hover (pointer only), focus-visible, active or pressed, selected, disabled, loading. Use `:focus-visible` for the ring, at least 2 px, 3:1 against its background, not hidden by sticky headers (2.4.11 Focus Not Obscured).

Views and data:

- **Empty:** says why it is empty and offers the next action.
- **Loading:** skeleton for layout-stable content, spinner only for short unknown waits. Reserve space so nothing jumps.
- **Error:** says what happened and what to do, next to the cause. Keep the user's input.
- **Partial and long:** one item, many items, very long names, missing optional fields, large numbers, translated text 30 % longer.
- **Offline or slow:** what still works, and a retry.

Forms: visible labels, help text before the field, errors after it, linked with `aria-describedby`. Do not block paste or password managers (3.3.8 Accessible Authentication). Do not ask twice for what the person already entered in the same process (3.3.7 Redundant Entry).

## Responsive layout

- Mobile first CSS, breakpoints where the content breaks, not at device names. Typical checks: 320, 390, 768, 1024, 1440.
- 1.4.10 Reflow: at 320 CSS px wide, content reads without horizontal scrolling (data tables and maps excepted).
- 1.4.4 Resize Text and 1.4.12 Text Spacing: text at 200 % zoom and with increased spacing must not be clipped or overlap. Avoid fixed heights on text containers.
- Use container queries for components that live in different widths.
- 2.5.8 Target Size (Minimum): targets at least 24 by 24 CSS px, or spaced so a 24 px circle around each does not overlap another. Touch-first screens: 44 px (Apple HIG) or 48 dp (Material).
- 2.5.7 Dragging Movements: anything done by dragging has a single-pointer alternative (buttons, a menu).
- Images: explicit `width` and `height` (or `aspect-ratio`), `srcset` and `sizes`, lazy loading below the fold.

## Motion

- Purpose only: show where something came from, where it went, or that an action registered.
- Durations: 100 to 200 ms for small feedback (press, toggle), 200 to 300 ms for panels and menus, up to 400 ms for large page transitions. Exits shorter than entrances.
- Easing: ease-out for entering, ease-in for leaving, ease-in-out for moving on screen. No linear easing for UI movement.
- Animate `transform` and `opacity`. Never animate `width`, `height`, `top` or `left` on large elements.
- 2.2.2 Pause, Stop, Hide: anything that moves for more than 5 seconds (carousels, background video, tickers) has a pause control.
- 2.3.1 Three Flashes: nothing flashes more than three times per second.

Reduced motion: make motion opt-in, so a person who asked for less motion never gets it by default.

```css
@media (prefers-reduced-motion: no-preference) {
  .panel { transition: transform 240ms ease-out, opacity 240ms ease-out; }
}
```

With reduce set, keep instant state changes or a short opacity fade. Never parallax, large slides, zooms or auto-playing loops. In JavaScript, read `matchMedia('(prefers-reduced-motion: reduce)')` before starting an animation library.

## Semantics and keyboard

- Native elements: `button` for actions, `a` for navigation, `label` tied to inputs, `fieldset` and `legend` for groups, `dialog` for modals.
- One `h1`, headings in order, landmarks (`header`, `nav`, `main`, `footer`).
- Icon-only buttons have an accessible name (`aria-label` or visually hidden text).
- Focus order follows the visual order. Modals trap focus while open and return it on close. Escape closes overlays.
- 4.1.2 Name, Role, Value: custom widgets expose their role and state (`aria-expanded`, `aria-selected`, `aria-checked`).
