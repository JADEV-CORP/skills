# Loudness

## How it is measured

- Loudness is measured with ITU-R BS.1770 (K-weighted, gated). Units: LUFS (EBU name) and LKFS (ATSC name) are the same scale. A change of 1 LU is 1 dB.
- **Integrated loudness (I):** the average over the whole programme. This is the number a target refers to.
- **True peak (TP):** the peak after oversampling, in dBTP. Sample peaks under-read; lossy encoding (AAC, Opus) can push peaks up, which is why ceilings sit below 0.
- **Loudness range (LRA):** spread between soft and loud passages, in LU. Speech-led video works well around 5 to 10 LU; a wide LRA makes quiet parts vanish on phones.
- FFmpeg's `ebur128` and `loudnorm` filters implement BS.1770. Use `ebur128=peak=true` to read I, LRA and true peak (`ffmpeg.md`).

## Targets by destination

| Destination | Integrated | True peak ceiling | Source |
|---|---|---|---|
| Social and web video (YouTube, Instagram, TikTok, LinkedIn, X, site embeds) | -14 LUFS (house target) | -1 dBTP | No platform publishes a binding spec. -14 matches Spotify's published reference and is the widely reported YouTube playback reference. Louder masters are turned down, so going louder only costs dynamics. |
| Spotify (music, video podcasts) | -14 LUFS | below -1 dBTP; below -2 dBTP if the master is louder than -14 | Spotify for Artists, "Loudness normalization" (support.spotify.com/artists/article/loudness-normalization). Loud setting -11, Quiet -19. |
| Apple Podcasts | -16 LKFS, plus or minus 1 dB | -1 dBFS true peak | Apple Podcasts for Creators, "Audio requirements" (podcasters.apple.com/support/893-audio-requirements). |
| European broadcast | -23 LUFS, plus or minus 0.5 LU (1 LU for live) | -1 dBTP | EBU R 128 (version 5.0, 2023) and EBU Tech 3343 (tech.ebu.ch/publications/r128). Short-form (ads, promos): supplement R 128 s1 adds a maximum short-term loudness of -18 LUFS. |
| US broadcast | -24 LKFS, plus or minus 2 dB | -2 dBTP | ATSC A/85 (atsc.org). A revision was published in 2026: check the current document before a broadcast delivery. |

Rules:

- A delivery spec from the client or the broadcaster beats this table. Ask for it.
- Never master a social video to broadcast levels (-23) unless asked: it plays quieter than everything around it on phones.
- One master per target. Do not reuse a -14 master for broadcast by turning it down without re-checking true peak and LRA.

## Voice and music levels

Starting points from practice, not from a standard. Measure, then let the person listen.

- **Voice alone** normalised to the delivery target first (for example -14 LUFS for social, -16 for a podcast), so takes match.
- **Music under speech:** around 15 to 20 LU below the voice while it speaks. Between phrases and with no voice, the bed can come up 6 to 10 LU.
- **Ducking:** 6 to 12 dB of gain reduction on the bed while the voice speaks, attack 10 to 30 ms, release 300 to 600 ms so the bed does not pump between words.
- **Sound effects:** short, caused by something on screen, peaking under the voice. A UI click is felt, not heard over speech.
- **Music-only pieces** (no voice): the music carries the target loudness itself.

## Measure the right thing

- Measure the final mixed file, not the stems.
- Measure the encoded delivery file too (AAC in MP4): its true peak can be higher than the WAV master's. If it crosses the ceiling, lower the master's ceiling by 0.5 dB and encode again.
- For a video under 10 seconds, integrated loudness is unstable. Also read short-term loudness (`ebur128` prints `S:` per 100 ms frame) and keep the loudest moment reasonable.
