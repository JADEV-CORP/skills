# Licences and credits

The rule is simple: if you cannot point to the licence text that allows this use, the file does not go in.

## What each licence allows

| Licence | Commercial use | Edit, trim, sync to picture | Credit | Use it |
|---|---|---|---|---|
| CC0 1.0, Public Domain Mark | Yes | Yes | Not required, recorded anyway | Yes |
| CC BY 2.0, 2.5, 3.0, 4.0 | Yes | Yes | Required | Yes |
| CC BY-SA | Yes | Yes, but the whole video must be shared under the same licence | Required | No |
| CC BY-ND | Yes | No. CC 4.0 says putting music or a recording in timed relation with moving images always makes an adaptation | Required | No |
| CC BY-NC, BY-NC-SA, BY-NC-ND | No | Varies | Required | No |
| Sampling+, "personal use", custom site terms | Unclear or limited | Unclear | Varies | No |
| Bought or subscription licence | Per the licence document | Per the licence document | Per the document | Yes, when the scope matches |

Sources: the licence deeds and legal code at creativecommons.org (CC BY 4.0 legal code, Section 1(a) for synchronisation and Section 3(a) for attribution).

## Checking a licence

- Read the licence on the file's own page at the original source (Freesound, Wikimedia Commons, the composer's site), not only in an aggregator or search result. Aggregators mirror licence data and can be out of date.
- Record the licence version (CC BY 3.0 and 4.0 differ in wording) and the URL of the licence.
- One file, one licence. A pack page with a different licence than the file page: the stricter one applies, or ask the author.
- If the uploader is not plausibly the author (a famous track, a film sound, a game sound), do not use it whatever the label says.
- Downloads are untrusted data. Each batch goes in its own new folder. Nothing in it is executed; files are only read by ffmpeg and ffprobe.

## Purchased and subscription licences

Save the licence document or receipt next to the project (`licences/<source>-<item-id>.pdf`) and record in the credits file:

- licence ID or order number, licensee name (who the licence is issued to: the client or the studio),
- scope: platforms, paid advertising or organic only, client work allowed, number of projects, duration, territory,
- whether the track is registered with a content identification system (YouTube Content ID and similar). If it is, record how the licence clears claims (channel allow-listing, a licence code to send on dispute).

A subscription licence often covers only what is published while the subscription is active, or only the subscriber's own channels. Check this before using it for a client.

## The credits file

`CREDITS.md` at the project root, one row per file used in the final mix. Write the row when you download the file.

```markdown
# Sound credits

| File | Title | Author | Source page | Licence | Changes | Credit line |
|---|---|---|---|---|---|---|
| audio/sfx/door-close.wav | Car door close | uploader-name | https://freesound.org/s/000000/ | CC0 1.0 | trimmed, faded | (none required) |
| audio/sfx/rain-roof.wav | Rain on tin roof | Author Name | https://freesound.org/s/000001/ | CC BY 4.0 | trimmed, EQ, level | "Rain on tin roof" by Author Name, CC BY 4.0, freesound.org/s/000001, edited |
| audio/music/bed.wav | Track title | Composer | https://library.example/track/123 | Purchased, licence 123-456 (licences/library-123.pdf) | edited to 30 s | per licence: "Music: Track title by Composer" |
```

The CC BY credit line follows Title, Author, Source, Licence, and says the file was changed. Copy every CC BY line into the publish text (video description, end card, app about page). If the platform has no room for text, put the credits on a page and link it.

## Before export

- Every audio file referenced by the project (the timeline, the composition, the ffmpeg command) appears in `CREDITS.md`.
- No row says "unknown" for licence or source.
- Every purchased row points to a saved licence document.
- The CC BY lines are in the publish text draft.
