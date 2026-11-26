---
name: jadev-hyperframes
description: "Makes videos from HTML with the HyperFrames CLI pinned at 0.9.98: project setup, composition rules, lint, check, snapshots, preview and local render, telemetry off. Use for any HyperFrames video, motion graphic or Remotion port."
license: MIT
---

# jadev-hyperframes

HyperFrames (npm `hyperframes`, Apache-2.0) renders HTML, CSS and a paused GSAP timeline to video by seeking it frame by frame in headless Chrome. Same files, same frames.

Pinned, checked 2026-11-26: `hyperframes@0.9.98`, Node.js 22+, FFmpeg 7.1+, `gsap@3.15.0` (what the CLI's template loads), Chrome 158.0.8127.88 (the CLI's pin) or the installed Google Chrome.

## 1. Privacy and network rules

- Every CLI call runs with `HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_NO_UPDATE_CHECK=1 HYPERFRAMES_SKIP_SKILLS=1` set; the project `.env` repeats the first. `telemetry status --json` must show `"enabled": false` first.
- Run the CLI only as `npx --no hyperframes <command>` from the project folder. `--no` refuses to download: a missing local install fails instead of fetching the latest release. Never `npx --yes`.
- Never run `events` (usage beacon), `feedback` (posts to a public channel), `share`, `publish`, `cloud`, `lambda`, `cloudrun` (upload the project), `usage` (reads other tools' logins) or `snapshot --describe` (sends frames to a third-party vision API). Never pass `--skill` (telemetry attribution).
- Credentials only from the person's own config or environment; `auth login` is theirs to type. Never copy or print a key.
- Commands that download on first use (`browser ensure`, `capture`, `add`, `transcribe`, `tts`, `remove-background`) run only when the person asks.

## 2. Set up

```
mkdir my-video && cd my-video
npm init -y
npm i -D --save-exact hyperframes@0.9.98 gsap@3.15.0
mkdir -p assets/vendor assets/fonts assets/audio compositions
cp node_modules/gsap/dist/gsap.min.js assets/vendor/
printf 'HYPERFRAMES_NO_TELEMETRY=1\n' >> .env
```

Then write `index.html` from `references/composition.md`. Skip `hyperframes init`: it refuses a non-empty folder and writes npm scripts that call `npx --yes`. Browser, FFmpeg, upgrades: `references/setup.md`.

## 3. Composition rules

The ones that break renders most often; the rest in `references/composition.md`.

1. Every timed element has `class="clip"`, `data-start` and `data-duration` in seconds. It shows over `[start, start + duration)`, so land end states just before the end.
2. The root's `data-duration` is the video length. Raise it before adding anything that ends later.
3. Each composition builds one paused GSAP timeline and registers it last: `window.__timelines["<data-composition-id>"] = tl`. Never call `play()`.
4. Deterministic only: no `Date.now()`, unseeded `Math.random()`, `fetch`, timers, `requestAnimationFrame` loops or `repeat: -1`.
5. Move a child of a `.clip`, never the clip (fading its opacity is fine). Elements GSAP moves get no CSS `transform`. Use `fromTo` in scenes.
6. Media: never play, pause or seek from script. `<video>` is `muted` or `data-has-audio="true"`. Every `<audio>` has an `id`. No `crossorigin`. Paths are `assets/...`, no leading slash.
7. Scene files keep styles, markup and script inside `<template>`, style their root as `#root` with `inset: 0`, and use the same id for the host, the scene's `data-composition-id` and the timeline key.
8. Fonts ship as files in `assets/fonts/` with `@font-face`. A bundled family named without a file makes the compiler fetch it from Google Fonts.
9. Frame 0 is the thumbnail on social players: put the title or key image on screen at 0 s. Text inside the 80 % title-safe area.

## 4. Work loop

1. Write or edit the files.
2. `lint`, then `check --json`. Fix every error and read every warning.
3. `snapshot --at <t1,t2,...>`: each scene, each cut from both sides, frame 0. Open the PNGs and look.
4. `preview --background`, give the person the URL, wait. `preview --stop` after.
5. Render only after their OK or an explicit request: `render --quality draft` while iterating, `render --quality delivery -o renders/<name>.mp4` for the final.
6. Verify the file: duration equals the root `data-duration`, size and frame rate are right, decoded frames look right, sound measured.

Details: `references/render.md`.

## 5. Sound

Music and effects follow `jadev-sound` (licences, `CREDITS.md`, loudness). For delivery, render the picture and mux a mix mastered with `jadev-sound`; `<audio>` clips in the composition are fine for drafts.

## 6. Report

Project path, CLI version, `check` result (warnings left and why), snapshot times looked at, render path with `ffprobe` duration, size and fps, sound status, open items.

## References (load when needed)

- `references/setup.md`: install, environment, browser, FFmpeg, upgrading the pin.
- `references/composition.md`: skeletons, attributes, timing, media, fonts, variables, Remotion ports.
- `references/render.md`: commands, render flags, verification, troubleshooting.
