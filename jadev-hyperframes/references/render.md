# Check, preview, render, verify

Every command runs from the project folder as `npx --no hyperframes <command>`, with `HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_NO_UPDATE_CHECK=1 HYPERFRAMES_SKIP_SKILLS=1` written in front of it (see `setup.md`; each shell call starts clean). Add `HYPERFRAMES_BROWSER_PATH=...` when using the installed Chrome. The examples below leave the prefix out for readability.

## Read a project

| Command | Gives |
|---|---|
| `timeline` / `timeline --json` | every clip by kind (graphics, video, captions, audio) with absolute start and end, file, source, volume. Read this instead of opening every file. |
| `compositions --json` | every `data-composition-id` with duration, size and element count |
| `info --json` | project size, resolution, duration |
| `docs <topic>` | offline reference in the terminal; `docs` alone lists the topics (`compositions`, `gsap`, `rendering`, `audio`, `troubleshooting` and more) |

## Check

1. `lint` once the first draft exists and again after moving scenes or clips around. Fast, no browser.
2. `check --json` before any snapshot or render: lint, runtime errors, layout (overflow, overlap, text clipping), motion, WCAG contrast on sampled frames, and craft warnings. Exit code is non-zero on errors. Fix every error. Read every warning and either fix it or say why it stays. While lint errors remain, the browser audits do not run.

The report is also saved under `.hyperframes/artifacts/checks/`.

## Look at frames

```
npx --no hyperframes snapshot --at 0,1.5,3.9,4.2 --json
```

- Pick times on every scene: just after it starts, its middle, just before and after each cut, and frame 0 (the thumbnail).
- `--range START,END --frames N` samples a stretch; `--composition <id>` samples one scene; `--zoom "<css selector>"` crops one element at high density.
- PNGs land in `.hyperframes/artifacts/snapshots/<run>/`. Open them and look. A tiny unstyled scene or a missing title usually means a scene failed to mount: check the id rule and the `<template>`.
- Never use `--describe`: it sends frames to an external vision API.

## Preview for the person

```
npx --no hyperframes preview --background
npx --no hyperframes preview --status
npx --no hyperframes preview --stop
```

`--background` prints a local URL and keeps the server running after the command returns. Give the person the URL, say what to look at, and wait. Stop it when the review is over. The preview prints a link to a desktop app; mention it only if the person asks about editing tools.

## Render

Only after the person approves the preview, or asks for the file, and after `check` passes.

```
npx --no hyperframes render --quality draft -o renders/<name>-draft.mp4
npx --no hyperframes render --quality delivery -o renders/<name>.mp4
```

| Flag | Values |
|---|---|
| `--quality`, `-q` | `draft` (fast), `looks` (default, CRF 16), `delivery` (high) |
| `--fps`, `-f` | 24, 25, 30, 50, 60, or `30000/1001` style rationals |
| `--format` | `mp4` (default), `webm` and `mov` (transparency), `gif`, `png-sequence` |
| `--workers`, `-w` | parallel Chrome processes, `auto` by default, about 256 MB RAM each |
| `--strict` | fail the render on lint errors |
| `--docker` | render in a container for byte-stable output (needs Docker running) |

A short film renders in seconds to a few minutes: run it in the foreground. For a long one that outlives the tool timeout, run it in the background with output to a log and wait for `Render complete` or `Render failed` in that log.

## Verify the file

```
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate -of default=nw=1 renders/<name>.mp4
ffmpeg -nostdin -v error -y -ss 2.0 -i renders/<name>.mp4 -frames:v 1 renders/check-2s.png
```

- Duration equals the root `data-duration`. Width, height and frame rate are what the brief asked for.
- Extract a few frames from the encoded file (above) and look at them: encoding can show banding or colour shifts the snapshots did not.
- File size is not zero and plays from start to end.
- Sound: measure loudness and true peak on the final file with the ffmpeg recipes in the `jadev-sound` skill, or mux the mastered mix now:

```
ffmpeg -nostdin -y -i renders/<name>.mp4 -i master.wav -map 0:v:0 -map 1:a:0 \
  -c:v copy -c:a aac -b:a 192k -ar 48000 -movflags +faststart renders/<name>-final.mp4
```

## When something fails

| Symptom | Fix |
|---|---|
| `npx --no` says canceled due to missing packages | The pinned install is missing: `npm i -D --save-exact hyperframes@0.9.98` in the project. |
| Chrome not found or exits at start | Set `HYPERFRAMES_BROWSER_PATH` to the installed Chrome, or ask the person before `browser ensure` downloads the pinned one. Some agent sandboxes block Chrome entirely: deliver the checked composition and say the render must run outside the sandbox. |
| Render waits about 45 s per scene, then shows static frames | Host id, scene `data-composition-id` and timeline key differ, or a timeline never registers (async build, or a still composition missing `data-no-timeline`). |
| Element visible in preview, blank in render | It depends on time from a clock, a network fetch or a media `play()` call. Make it a function of timeline time. |
| Text in the wrong font | Missing `@font-face` or wrong path; paths are `assets/...` without a leading slash. |
| A clip never appears | It ends past the root `data-duration`, or sits inside a timed parent that is hidden at that time (`timeline` warns `never visible`). |
| `check` reports layout overflow on a deliberate bleed | Mark the smallest wrapper with `data-layout-allow-overflow`, not the whole scene. |
| A heavy scene times out before it is ready | Pass a longer `--timeout` in milliseconds (for example `--timeout 90000`) to `check` or `snapshot`. |
| Disk filling up | `clean --dry-run`, then `clean`. Do not delete `.hyperframes/` by hand while a preview runs. |
