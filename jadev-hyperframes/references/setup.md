# Setup

## Versions

| Tool | Version | How it was checked |
|---|---|---|
| `hyperframes` (npm, Apache-2.0) | 0.9.98 | `npm view hyperframes version` on 2026-11-26; package `engines` says Node 22 or later |
| Node.js | 22 or later | the CLI refuses older versions at start |
| `gsap` (npm) | 3.15.0 | the version the CLI's blank template loads; `npm view gsap@3.15.0 version` |
| FFmpeg and FFprobe | 7.1 or later | FFmpeg tag `n7.1.5` is the current 7.x release; `doctor` reports what it finds |
| Chrome | 158.0.8127.88 (CLI pin) or the installed Google Chrome | Chrome for Testing known-good versions list |

Releases of `hyperframes` are frequent (several a day at times). Stay on the pin for a project's whole life. Upgrade on purpose, see the end of this file.

## Install in the project

```
mkdir my-video && cd my-video
npm init -y
npm i -D --save-exact hyperframes@0.9.98 gsap@3.15.0
mkdir -p assets/vendor assets/fonts assets/audio compositions
cp node_modules/gsap/dist/gsap.min.js assets/vendor/
printf 'HYPERFRAMES_NO_TELEMETRY=1\n' >> .env
```

- `--save-exact` writes `0.9.98`, not `^0.9.98`. Commit `package-lock.json`.
- `gsap` is installed only to copy one file into `assets/vendor/`. The composition loads it from there, so renders never fetch scripts from a CDN.
- Add `node_modules/`, `renders/` and `.hyperframes/` to the project's `.gitignore`. `.hyperframes/` holds check reports, snapshots and history.

## Environment for every call

The agent's shell does not keep variables between calls. Prefix each command:

```
HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_NO_UPDATE_CHECK=1 HYPERFRAMES_SKIP_SKILLS=1 npx --no hyperframes check --json
```

What each one does in 0.9.98 (read from the package source):

| Variable | Effect |
|---|---|
| `HYPERFRAMES_NO_TELEMETRY=1` (or `DO_NOT_TRACK=1`) | Turns usage telemetry off, whatever the saved setting. Also read from the project `.env`. |
| `HYPERFRAMES_NO_UPDATE_CHECK=1` | No registry check for a newer version, no update notices, no background self-update. |
| `HYPERFRAMES_SKIP_SKILLS=1` | The CLI does not install or refresh its own agent skills. |

The person can make the opt-out permanent with `npx --no hyperframes telemetry disable` (it writes `telemetryEnabled: false` to the CLI's user config). Ask first: it changes their machine's settings. Check at any time:

```
HYPERFRAMES_NO_TELEMETRY=1 npx --no hyperframes telemetry status --json
```

`"enabled": false` is the only acceptable answer. Telemetry in this CLI is linked to the person's account once they sign in, so it is never "anonymous" for a signed-in user.

## Why `npx --no`

Plain `npx` (without `--no`), with no local install and no terminal attached, assumes yes and downloads the latest release of the package. `npx --no hyperframes` runs the pinned copy in `node_modules/.bin` and cancels if it is missing. The same applies to `npm exec`: use `npm exec --no -- hyperframes <command>` if you prefer it.

Check the pin: `npx --no -- hyperframes --version` prints `0.9.98`.

## Browser

Rendering needs Chrome. Two choices:

- **The installed Google Chrome.** No download. Point the CLI at it for each call:
  `HYPERFRAMES_BROWSER_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"` on macOS, the `chrome.exe` path on Windows, `$(which google-chrome)` on Linux. Pixel output can differ slightly between Chrome versions, so keep one browser per project.
- **The CLI's pinned Chrome (158.0.8127.88).** `npx --no hyperframes browser ensure` downloads it once into the CLI's cache. Only with the person's OK. Best when renders must match across machines.

`npx --no hyperframes doctor --json` lists Node, FFmpeg, FFprobe and Chrome with paths. It always exits 0: read the `ok` field of each check. Optional tools it reports as missing (transcription, local voice and music models, Docker) are not needed for a local render.

## FFmpeg

FFmpeg and FFprobe must be on `PATH`, or set `HYPERFRAMES_FFMPEG_PATH` and `HYPERFRAMES_FFPROBE_PATH` to absolute paths. The CLI never runs an FFmpeg found inside the project folder. On macOS, `brew install ffmpeg` (current) or `brew install ffmpeg@7` (7.1.x).

## Upgrading the pin

Only on purpose, in a branch, with the person's OK:

1. `npm view hyperframes version` and read the release notes on the project's GitHub releases page.
2. `npm i -D --save-exact hyperframes@<new>`.
3. Run `lint`, `check --json` and a snapshot set on an existing project. Compare against the previous snapshots.
4. Re-check the privacy switches in the new version's `telemetry` help and this file. Update the version tables in this skill.
