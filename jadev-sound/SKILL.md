---
name: jadev-sound
description: "Picks licensed music and sound effects (CC0, CC BY with credit, or bought), keeps a credits file and mixes to platform loudness with ffmpeg: two-pass loudnorm, voice ducking, pre-export checks. Use when a video, ad or app needs sound."
license: MIT
---

# jadev-sound

Sound for videos and products: only audio the project may use, measured to a loudness target, documented so anyone can check the licence later.

You cannot hear. Never say a sound "fits" or a mix "sounds good". Report what you measured, and ask the person to listen on headphones and on a phone speaker before sign-off.

Tool: FFmpeg 7.1 or later (`ffmpeg` and `ffprobe` on PATH; 7.1.5 is the current 7.x release). Every filter option in the references was checked against the FFmpeg 7.1 source. Check yours with `ffmpeg -version`.

## 1. Allowed licences

Only three kinds of audio go into a deliverable:

| Licence | Condition |
|---|---|
| CC0 or public domain mark | None. Record the source anyway. |
| CC BY (2.0 to 4.0) | Credit line in the credits file and wherever the video is published (description, end card or about page). |
| Bought or subscribed licence | The licence document is saved with the project and its scope covers this use (platforms, paid ads, client work, duration, territory). |

Never NC (non-commercial), ND (no derivatives: putting music to picture counts as an adaptation under CC 4.0), SA (share-alike), "free for personal use", "royalty free" with no licence text, ripped tracks, or anything whose licence you could not read on the source page. Details, sources and the credit format: `references/licences.md`.

## 2. Choose

1. Write a cue list from the picture: every moment that needs a sound, with its timecode and what causes it on screen. Music: mood, tempo, where it must peak and end.
2. Search licensed libraries (Openverse and Freesound for CC0 and CC BY, the project's paid library for the rest). Downloads go in their own new folder and are only ever read by media tools, never executed.
3. Open each file's source page and confirm the licence there, not only in the search result.
4. Measure every candidate: duration, sample rate, channels, peak, loudness (`references/ffmpeg.md`, "Inspect"). Reject clipped, noisy or too-short files.
5. Trim to the clean moment with short fades so nothing clicks.

## 3. Keep the credits file

Every file used in the final mix has a line in `CREDITS.md` at the project root, written when the file is downloaded, not at the end:

```
| File | Title | Author | Source page | Licence | Changes | Credit line |
```

Format and examples: `references/licences.md`.

## 4. Mix to a target

Pick the target from the destination (`references/loudness.md`, with sources). The house default for social and web video is -14 LUFS integrated, true peak at or below -1 dBTP. Broadcast and podcasts have their own published numbers.

1. Normalise the voice alone first (two-pass `loudnorm`), so speech is consistent across takes.
2. Set the music bed under the voice and duck it with `sidechaincompress` keyed by the voice.
3. Place effects on their frames with `adelay`, mix with `amix` and `normalize=0` so levels stay as set.
4. Master the full mix with two-pass `loudnorm` to the target, `linear=true`, output resampled to 48 kHz.
5. Mux into the video without re-encoding the picture.

Every command: `references/ffmpeg.md`.

## 5. Check before export

- Integrated loudness within 1 LU of the target, true peak at or below the ceiling (`ebur128=peak=true`).
- Pass 2 of `loudnorm` reported linear normalisation. If it says dynamic, lower the target or reduce peaks first.
- No clicks at cuts: every trimmed edge has a fade of at least 5 ms.
- The music ends on a phrase or fades over at least 1.5 s. The last frame is not a cut-off note.
- Mono fold-down loses no more than about 3 LU against the stereo mix (phase check).
- Speech stays clear over the music: ducked bed measured lower while the voice speaks.
- 48 kHz in the final file, AAC at 192 kbps or more for delivery, a 24-bit WAV master kept.
- Audio duration matches the video duration (`ffprobe`).
- `CREDITS.md` complete, licence documents saved, credit lines ready for the publish text.

Report the numbers: integrated LUFS, true peak, LRA, the ducking depth, and the credits status. Then ask the person to listen.

## References (load when needed)

- `references/licences.md`: what each licence allows, where to check it, the credits file, purchased licences and platform claims.
- `references/loudness.md`: targets per destination with their sources, how loudness is measured, voice and music levels.
- `references/ffmpeg.md`: inspect, trim, fade, two-pass loudnorm, ducking, placing effects, mixing, mono check, mux, all for FFmpeg 7.x.
