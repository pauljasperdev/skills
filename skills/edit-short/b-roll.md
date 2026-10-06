# B-roll

The script knows only speech, so footage without it rides along as ordinary passages. `052` is the worked example: a walk to the car, a speed-up of getting out and going in, a pan and a laptop shot between two spoken parts.

## In the cut list

- Every take is a `<NNN>/*.mp4` at 1080 × 1920, 30 fps. Convert phone footage first (`ffmpeg … -crf 19 -maxrate 18M`); the originals stay untouched beside it.
- A B-roll clip is a passage with `"text": ""`, `"pre": 0`, `"post": 0` and the role `personality`, at the place in the list where it plays.
- A speed-up is rendered with ffmpeg beforehand and listed as its own take. Show each station once: raw footage of someone getting out of a car holds the same motion several times, and at six times speed the repeats read as a loop.
- A still shown over speech is a graphic with an `<img>`, like `052`'s `photo.html`; the cut stays as it is.

## After `assemble`

Set by hand in `index.html`, and again after every `assemble --force` or `sync`:

- `data-label` on each B-roll `<video>` ("B-Roll: zum Auto"), so the user can find it in Studio.
- `data-volume` on each B-roll `<video>`: its ambience at 0.4 to 0.5, a speed-up at 0.
- The music's `data-automation` lane: up to about 0.34 while B-roll plays without speech, back to the bed level when the voice returns.

## In the checks

`verify` reports the speechless stretch as a pause of 0.8 s or more. That line is a dispute to name in the report; the cut is right.
