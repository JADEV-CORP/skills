# FFmpeg recipes

For FFmpeg 7.1 or later. Every filter option used here (`loudnorm`, `ebur128`, `sidechaincompress`, `amix`, `adelay`, `alimiter`, `afade`, `pan`, `aformat`, `aresample`, `volume`) exists in the 7.1 source. The commands were run in zsh and bash.

Conventions:

- `-nostdin` on every call so ffmpeg never waits for keyboard input in a script.
- Intermediate files as 32-bit float WAV (`-c:a pcm_f32le`): a sum above 0 dBFS does not clip until the master.
- 48 kHz everywhere for video. Masters as 24-bit WAV (`pcm_s24le`).
- Shell variables inside filter strings always in braces (`${MI}`). In zsh, `$5:l` is read as a modifier and breaks `offset=$5:linear=true`.
- The pass-1 reader below uses Python 3.10 or later, standard library only.

## Inspect

```
ffprobe -v error -show_entries format=duration:stream=codec_name,sample_rate,channels -of default=nw=1 in.wav
ffmpeg -nostdin -hide_banner -nostats -i in.wav -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary:/,$p'
```

The summary gives `I` (integrated LUFS), `LRA` and the true peak. `loudnorm` computes LRA its own way and can print a different value: report the `ebur128` numbers.

## Trim and fade

```
ffmpeg -nostdin -y -ss 1.250 -t 0.800 -i take.wav \
  -af "afade=t=in:st=0:d=0.005,afade=t=out:st=0.795:d=0.005" -c:a pcm_s24le hit.wav
```

5 ms fades remove clicks on short effects. Music endings get a longer fade (`afade=t=out:st=<end-2>:d=2`).

## Two-pass loudnorm

Pass 1 measures. Its own `normalization_type` always says dynamic: ignore it.

```
ffmpeg -nostdin -hide_banner -nostats -i premaster.wav \
  -af "loudnorm=I=-14:TP=-1:LRA=20:print_format=json" -f null - 2>&1 \
  | sed -n '/^{/,/^}/p' > pass1.json

read -r MI MTP MLRA MTH OFF <<< "$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(d["input_i"], d["input_tp"], d["input_lra"], d["input_thresh"], d["target_offset"])' pass1.json)"
```

Pass 2 applies one fixed gain (`linear=true`) and resamples back to 48 kHz (loudnorm works at 192 kHz internally):

```
ffmpeg -nostdin -hide_banner -nostats -y -i premaster.wav \
  -af "loudnorm=I=-14:TP=-1:LRA=20:measured_I=${MI}:measured_TP=${MTP}:measured_LRA=${MLRA}:measured_thresh=${MTH}:offset=${OFF}:linear=true:print_format=summary" \
  -ar 48000 -c:a pcm_s24le master.wav 2>&1 | grep -E "Output Integrated|Output True Peak|Normalization Type"
```

Change `I` and `TP` to the destination's target (`loudness.md`). Valid ranges in 7.x: `I` -70 to -5, `TP` -9 to 0, `LRA` 1 to 50.

**Linear or dynamic.** Pass 2 stays linear only if `input_tp + (target I - input_i)` is at or below the target TP, and `input_lra` is at or below the target LRA. Otherwise loudnorm silently switches to dynamic mode and acts as a compressor. When pass 2 prints `Normalization Type: Dynamic`:

1. Raise the target `LRA` above `input_lra` if that was the cause.
2. If peaks are the cause, limit them first: apply the missing gain plus about 0.5 dB, then an oversampled limiter about 1 dB under the ceiling, then run both passes again on the result.

```
ffmpeg -nostdin -y -i premaster.wav \
  -af "volume=2.5dB,aresample=192000,alimiter=limit=0.794:attack=5:release=50:level=0,aresample=48000" \
  -c:a pcm_f32le limited.wav
```

`limit` is linear: 0.891 is -1 dBFS, 0.794 is -2, 0.708 is -3 (10 to the power dB/20). `level=0` stops the limiter from turning the result back up. Oversampling to 192 kHz makes the sample-peak limiter catch most inter-sample peaks.

3. For speech-only content, dynamic mode can be acceptable. Say so in the report, check LRA and let the person listen.

## Voice first

Normalise each voice take with the two passes above (for example `I=-14` for social video) before mixing, so all takes sit at the same level. Clean-up (noise reduction, de-essing) happens before this step, in the editor or with the person's tools.

## Duck music under the voice

The voice is the key: the bed is compressed while the voice is present.

```
ffmpeg -nostdin -y -i music.wav -i voice.wav -filter_complex \
"[1:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[vo][key];\
[0:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=-18dB[bed];\
[bed][key]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=400[ducked];\
[ducked][vo]amix=inputs=2:duration=longest:normalize=0[mix]" \
-map "[mix]" -c:a pcm_f32le voice-music.wav
```

- `volume=-18dB` sets the bed's resting level under a voice normalised to the target. Adjust after measuring.
- `threshold` is linear (0.05 is about -26 dBFS), `attack` and `release` in milliseconds, `ratio` 1 to 20.
- Both inputs to `sidechaincompress` must share the sample rate, hence `aformat`.
- Check the depth: measure the ducked bed alone (map `[ducked]` to a file) with `volumedetect` on a stretch with voice and one without. Aim for 6 to 12 dB of difference.

```
ffmpeg -nostdin -hide_banner -nostats -ss 6 -t 0.5 -i ducked.wav -af volumedetect -f null - 2>&1 | grep mean_volume
```

## Place effects on their frames

`adelay` takes milliseconds; `all=1` delays every channel by the same amount. Frame to milliseconds: frame / fps * 1000.

```
ffmpeg -nostdin -y -i voice-music.wav -i click.wav -i whoosh.wav -filter_complex \
"[1:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=delays=2350:all=1,volume=-6dB[c];\
[2:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=delays=5100:all=1[w];\
[0:a][c][w]amix=inputs=3:duration=first:normalize=0[out]" \
-map "[out]" -c:a pcm_f32le premaster.wav
```

`normalize=0` keeps each input at the level you set (the default divides by the number of inputs). `duration=first` keeps the length of the first input. The same sound used twice: `asplit=2` it first.

## Mono and phase check

```
ffmpeg -nostdin -hide_banner -nostats -i master.wav \
  -af "pan=mono|c0=0.5*c0+0.5*c1,ebur128=dualmono=true" -f null - 2>&1 | sed -n '/Summary:/,$p'
```

Compare `I` with the stereo measurement. Equal for centred content, a few LU lower for wide recordings. A drop of more than about 3 LU means phase problems: a source will vanish on a phone speaker or a mono device.

## Mux into the video

```
ffmpeg -nostdin -y -i picture.mp4 -i master.wav -map 0:v:0 -map 1:a:0 \
  -c:v copy -c:a aac -b:a 192k -ar 48000 -movflags +faststart final.mp4
ffprobe -v error -show_entries stream=codec_type,duration -of csv=p=0 final.mp4
ffmpeg -nostdin -hide_banner -nostats -i final.mp4 -map 0:a:0 -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary:/,$p'
```

The picture is copied, not re-encoded. Video and audio durations must match; fix the audio length rather than cutting with `-shortest`. Measure the encoded file: AAC can raise the true peak slightly. If it crosses the ceiling, master 0.5 dB lower and mux again.
