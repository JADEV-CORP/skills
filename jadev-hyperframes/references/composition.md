# Composition

A project is a folder with `index.html` (the root composition), scene files in `compositions/`, and media, fonts and scripts in `assets/`. The skeletons below were linted, checked, snapshotted and rendered with 0.9.98.

## Root: `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="assets/vendor/gsap.min.js"></script>
    <style>
      @font-face {
        font-family: "ProjectSans";
        src: url("assets/fonts/project-sans.woff2") format("woff2");
        font-weight: 400 700;
      }
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #0b0d12; }
      #root { width: 100%; height: 100%; font-family: "ProjectSans", sans-serif; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="8"
         data-width="1920" data-height="1080">
      <div id="intro" data-composition-id="intro" data-composition-src="compositions/intro.html"
           data-start="0" data-duration="4" data-track-index="1" data-track-kind="graphics"
           data-width="1920" data-height="1080"></div>
      <div id="outro" data-composition-id="outro" data-composition-src="compositions/outro.html"
           data-start="4" data-duration="4" data-track-index="1" data-track-kind="graphics"
           data-width="1920" data-height="1080"></div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
```

- The root holds scene hosts, media and audio only. Each scene lives in its own file.
- The video length is the root's `data-duration`. Anything ending later is cut; a scene ending earlier holds its last frame.
- Canvas presets: 1920 x 1080 landscape, 1080 x 1920 portrait, 1080 x 1080 square. Set the same size on `html, body`, the root and every host. 30 fps unless the brief says otherwise (`render --fps`).

## Scene: `compositions/intro.html`

```html
<template>
  <style>
    #root { position: absolute; inset: 0; display: grid; place-items: center; }
    #intro-title-text { margin: 0; color: #f4f4f5; font-size: 96px; }
  </style>
  <div id="root" data-composition-id="intro" data-width="1920" data-height="1080"
       data-composition-variables='[{"id":"headline","type":"string","label":"Headline","default":"Product name"}]'>
    <div id="intro-title" class="clip" data-start="0" data-duration="3.8">
      <h1 id="intro-title-text" data-var-text="headline">Product name</h1>
    </div>
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    // Visible at 0 s (the thumbnail frame); the entrance is movement only.
    tl.fromTo("#intro-title-text", { y: 24 }, { y: 0, duration: 0.6, ease: "power3.out" }, 0);
    tl.to("#intro-title-text", { opacity: 0, duration: 0.4, ease: "power2.in" }, 3.3);
    window.__timelines["intro"] = tl;
  </script>
</template>
```

- Styles, markup and script outside `<template>` are dropped.
- Style the scene root as `#root` in an inline `<style>`, sized with `inset: 0`, never fixed pixels.
- Host `id`, the scene's `data-composition-id` and the `__timelines` key are the same string. A mismatch makes every render wait for a timeline that never registers.
- Ids are unique across the assembled page: prefix them with the scene name (`intro-title`). A scene's script only reaches elements in its own file.
- Use `fromTo`, not `from`. The runtime seeks a scene again each time it comes on screen, and `from` captures its starting values only on the first build, so seeking back drifts.
- Do not nest scene timelines inside the root timeline. The runtime already drives each one, and nesting seeks it twice.

## Timing

- `data-start` and `data-duration` are seconds, counted in the file where the element is written. Inside a scene, time 0 is the moment its host starts.
- The end is exclusive: a clip with start 1 and duration 2 is gone at exactly 3 s. Finish animations a little before that.
- `data-start="intro + 0.5"` starts half a second after the clip `intro` ends (spaces required). A typo silently resolves to 0: snapshot anything timed this way.
- A clip placed inside another timed element is visible only while its parent is.
- An `<img>` without `data-duration` lasts 3 s; `<video>` and `<audio>` without it play their full length.
- `data-track-index` is only the lane in the editor. Paint order is CSS `z-index`. Clips that never overlap share a lane.

## Animation

- One paused timeline per composition, registered after all tweens are added. If the timeline is built after an async step (font load, image decode), register it at the end of that step.
- Deterministic: every visible value is a function of timeline time. No `Date.now()`, `performance.now()`, unseeded `Math.random()` (use a seeded generator), `fetch`, `setTimeout`, `setInterval`, `requestAnimationFrame` loops or `repeat: -1`.
- The runtime owns the visibility of each `.clip`. Leave its `display` and `visibility` alone and move a child element instead; fading the clip's opacity is fine.
- If GSAP moves an element, give it no `transform` in CSS: put the starting position in `fromTo`. Prefer `transform` and `opacity` over `left`, `top`, `width` and `height`.
- Canvas, WebGL, Three.js or Lottie: keep the code, but draw each frame from the time the timeline gives you (for example a GSAP `onUpdate` that reads `tl.time()`), never from a clock.

## Media

```html
<video id="demo" class="clip" src="assets/video/demo.mp4" muted playsinline
       data-start="2" data-duration="5" data-media-start="1.5" data-track-index="2"></video>
<audio id="music" class="clip" src="assets/audio/music.wav"
       data-start="0" data-duration="8" data-volume="0.5" data-fade-out="1.5" data-track-index="3"></audio>
```

- Never call `play()`, `pause()` or set `currentTime` from script.
- A timed `<video>` is `muted`, or keeps its sound with `data-has-audio="true"`.
- Give every `<audio>` an `id`: the mixer skips audio without one. Leave `crossorigin` off media elements.
- Time the `<video>` element itself, not a wrapper.
- `data-media-start` trims the source, `data-playback-rate` changes speed (0.1 to 10), `data-volume` is linear gain (1 = 0 dB).
- Paths are relative: `assets/...`, no leading slash, also inside scene files. Media files live in the project, never on a remote URL.
- Colour grades, grain and blur on footage: do them on the source file (in an editor or with ffmpeg) rather than with CSS filters, which are slow and can differ between preview and render.
- Every music and effect file needs a licence and a `CREDITS.md` line (`jadev-sound`).

## Fonts

- Ship every font as a file in `assets/fonts/` and declare it with `@font-face` under a project family name. Check the font's licence allows embedding in video.
- The CLI bundles a set of common families (Inter, Roboto, Montserrat and others) that resolve by name, but it fetches extra weights and scripts for them from Google Fonts at compile time. Use files to keep renders offline and repeatable.
- A family named without a `@font-face` and not bundled fails lint (`font_family_without_font_face`).

## Variables

Copy that changes per version (headline, price, colours, a logo) goes into variables so it can change without touching markup. The scene skeleton above declares `headline` on its root and binds it with `data-var-text`. The host sets the value for that mount:

```html
<div id="intro" data-composition-id="intro" data-composition-src="compositions/intro.html"
     data-start="0" data-duration="4" data-track-index="1" data-track-kind="graphics"
     data-width="1920" data-height="1080"
     data-variable-values='{"headline":"New product name"}'></div>
```

- Declare `{id, type, label, default}`: the video's own variables on `index.html`'s `<html>`, a scene's on that scene's root. Types: `string`, `number`, `color`, `boolean`, `enum`.
- Bind text with `data-var-text`, media with `data-var-src` (keep a real fallback `src`), CSS with `var(--id)`.
- Variables cannot change the root's `data-duration`.

## Layout

- Action-safe: 90 % of the frame. Title-safe: 80 %. Captions and key text stay inside title-safe; vertical videos also keep clear of the platform's own buttons at the bottom and right.
- Frame 0 is the thumbnail on social players: something meaningful is on screen at 0 s.
- Intentional overflow or overlap is declared on the smallest element: `data-layout-allow-overflow`, `data-layout-allow-overlap`. Otherwise `check` reports it.
- Contrast: `check` measures text contrast on sampled frames and suggests a colour for failures.

## Porting from Remotion

Translate to native HTML and GSAP when the source is pure animation; bring it in as a rendered video clip when it depends on React state, effects with dependencies, live data or a UI kit.

| Remotion | HyperFrames |
|---|---|
| `<Composition durationInFrames fps width height>` | root `data-duration` (frames / fps), `data-width`, `data-height`, `render --fps` |
| `<Sequence from durationInFrames>` | a timed `.clip` or a scene host with `data-start` and `data-duration` in seconds |
| `useCurrentFrame()`, `interpolate`, `spring` | tweens on the scene timeline at `frame / fps` seconds, with eases |
| `<Audio>`, `<Video>`, `<Img>`, `staticFile()` | `<audio>`, `<video>`, `<img>` with `assets/...` paths |
| `delayRender` | not needed for local files; register the timeline after async setup |
| props and `defaultProps` | composition variables |

Add `* { box-sizing: border-box; }` to the root style when porting: Remotion pages assume it. Compare the result with the original frame by frame: `npx --no hyperframes diff original.mp4 . --at 0.5,2,4.5` without rendering, then `npx --no hyperframes diff original.mp4 renders/port.mp4` after a render (SSIM per frame, worst moments). Write what did not port cleanly into `PORT_NOTES.md`.
