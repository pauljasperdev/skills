---
name: edit-short
description: Edit a short. Turns recordings from ~/Movies/rec into a cut, captioned, illustrated 1080×1920 HyperFrames project in a numbered Shorts folder, revises one after the user's review, or exports it. Use for any work on a numbered Shorts folder.
---

# Edit a short

A short is one HyperFrames project at `<NNN>/hyperframes/`, built from the takes in `<NNN>/` and reviewed by the user in Studio. `053`–`058` show the current style: read one's `prep/` inputs and `hyperframes/compositions/` before writing your own.

The mechanics are one script, run from the workspace root. Its docstring lists the commands:

```sh
.venv-transcribe/bin/python .agents/skills/edit-short/scripts/short.py <command> <NNN>
```

HyperFrames itself stays in its own skills: `/hyperframes-core` for composition rules and lint gotchas, `/hyperframes-cli` for `check`, `snapshot`, `preview`, `history`, `/hyperframes-animation` for motion, `/media-use` for logos. Run its CLI at the version the project's `package.json` pins (`npx --yes hyperframes@<version> …`): folders scaffolded on different days pin different versions, and the CLI refuses a mismatch.

The user's latest correction outranks a supplied reference, which outranks the defaults below. An accepted decision stays accepted when a later note changes something else.

## Working with this user

- **One short first.** A change of approach (cut tightness, layout, hook, mix) goes into one short; the user watches it; then the rest follow.
- **Their Studio edits win.** Before touching a project, read `hyperframes history`. Entries by `You` mean the user edited: run `sync`, never a rebuild.
- **They trim; you leave room.** Cut only clear dead air. Offer a shortening only when asked for one.

## Steps

### 1. Start

`start <NNN> ~/Movies/rec/<take>.mp4 …` creates the folder, copies the takes, scaffolds the HyperFrames project and brief, transcribes, and drafts `prep/cutlist.json` and `prep/edit.json`. A recording that is its own topic gets its own folder; several takes of one piece share a folder.

Then clear the takes out of `~/Movies/rec`, so that folder holds only recordings no short has taken yet: delete each original once `cmp -s` shows its copy in `<NNN>/` is identical. An earlier attempt that goes unused still belongs to the piece: copy it into the folder with the others and delete it from `rec` the same way. Leave every recording that has no identical copy.

Done when it has printed the speech regions of every take and `rec` no longer holds them.

### 2. Choose the takes

Write `cutlist.json`, one entry per passage: `take`, `on`, `off` (source seconds), `role` (hook, context, point, personality, ending) and `text` (the sentences as spoken, names spelled correctly). A passage is a run of whole sentences from the onset of its first speech region to the offset of its last. Take the wording from `prep/<take>.words.json`: the draft is a map of the regions, and its texts drop the quiet words that fall between them ("Ich", "Und", "Was"). A `!` line from `start` marks a word that lasts over a second: speech was dropped there, usually an abandoned start, so run the `window` command it prints and read what was really said.

- Keep whole sentences, the best complete take of each, and the hook. A "Tag X" opener stays when this recording says it.
- **Several takes of one piece:** build the text from the fewest, largest blocks. One good take beats sentences pieced from three. Show the user the resulting transcript, with the take each block comes from, before cutting.
- Remove without asking: abandoned starts, duplicate takes, the lead-in ("So,") and tail, and a filler sound ("äh", "ähm") that stands alone between two pauses.
- Leave pauses to `cut`. List passages at their natural breaks.
- Any other deletion, and any change of order, is substantive: the user asks for it, sees the transcript with the change marked, and approves. Read the changed text first; every sentence must still make sense once its neighbour is gone.
- B-roll, a speed-up or a still between passages: [b-roll.md](b-roll.md).

Done when every kept passage has a source range and a role, every sentence that leans on an earlier one still has it, and a text pieced from several takes has the user's approval.

### 3. Cut

Run `cut`. It joins passages separated only by a pause under 0.8 s, leaves 0.4 s of room at every remaining cut, keeps that room out of neighbouring sounds, joins the kept ranges and transcribes the result. Then read its `heard` line, `prep/captions.draft.txt` and the `!` lines:

- A stray word at a clip's edge (`sein.` before `Das,`) is a neighbouring word's tail: move that `on` or `off`.
- A `!` line means a clip's padding holds sound. When it is a filler or another word, set `"pre"` or `"post"` (seconds) on the entry.
- **A cut inside running speech** (no pause between the passage and what was removed): read the word boundary from the waveform, RMS in 20 ms steps over `prep/<take>.wav`, and set `on` or `off` there with a `pre` or `post` of 0.01 to 0.03. The transcriber's word times drift by a syllable, and its `PASS` holds even when the last word is clipped: a cut that ended inside "kann" passed.
- Two words that touch (a nasal running into the next word) cannot be split cleanly; keep the passage whole.
- A word the transcriber consistently mishears (`Bilder` for `Builder`) goes into `prep/aliases.json` as `{"bilder": "builder"}`.
- A word that is spoken (its own `window` hears it) but missing from `heard` stays in the text. Its `FAIL` line is a dispute: name it in the report.

Done when both `PASS` lines print, or every remaining `FAIL` is a named dispute, and every cut inside running speech was set from the waveform.

### 4. Caption and assemble

Copy `captions.draft.txt` to `captions.txt` and edit it: one phrase per line, short enough for two lines of 64 px type, names spelled correctly. A trailing `-` joins a word to the next without a space; split a word of more than about 24 letters that way.

Read [hooks.md](hooks.md) before writing the hook: a topic label is not one. Fill in `prep/edit.json`: `title`, `hook` (the text hook: two lines of at most 19 characters), `graphics` (`id`, `start`, `duration`, `label`, root seconds) and `sfx` (`id`, `sound`: `pop` or `swoosh`, `at`). Run `assemble`. It writes `compositions/hook.html` once; from then on the hook is edited as HTML.

The assembly is plain so the user can adjust it in Studio: every passage is one `<video>` carrying its own sound, all on one track, end to end, and the `voice` bus holds the one gain, compressor and limiter for the whole track: no layered tracks, fades or per-clip levels.

Done when `assemble` prints the clip count and names the graphics still to write.

### 5. Illustrate

Copy `templates/graphic.html` to `compositions/<id>.html` for each graphic in `edit.json` and build from it. Each graphic illustrates the sentence being spoken: it enters on the word that names it and leaves when that point ends. Empty space between points is fine.

- An illustration over a heading; few words, since the narration carries the explanation.
- Hand-drawn, playful motion: white strokes that draw on, yellow (`#FFE500`) for the accent.
- A real process gets a progressive diagram. Other topics get a different form each time.
- The real logo when a company is named, inline in a tile; OpenAI and Claude are in `047`'s `versus.html`, GitHub in `058`'s `skill.html`. No logo found: a plain labelled tile.
- Evidence is shown as itself: the book's cover, the tweet, the photo, sourced at 800 px or more and saved under `assets/broll/`.
- Every mention of Gemhog shows the product big, so viewers see what is being built: a full-frame scene of 3 to 4 app screens from `~/Documents/gemhog/wireframes/mobile/png` (phone-framed, 866 × 1784) swiping through on brand teal `#0D9488`, the phone about 700 px wide, `gemhog.de` on screen, held for the whole sentence (3 to 5 s). The landing page (`00-landing.png` or gemhog.de) fits when the speech is about the website; the media kit (`~/Documents/gemhog/gemhog-media-kit`) has the logo.
- A pop or swoosh on a meaningful entrance; three to six per short.
- Labels state what was said: outreach is not validation.

Snapshot the hook, the largest graphic and a two-line caption before polishing the rest.

Done when every graphic has a composition and each one sits where the house style puts it.

### 6. Verify and hand over

1. `check` passes, or each warning left is one you can explain, and `verify` prints both `PASS` lines or named disputes.
2. Snapshot the hook, a two-line caption, every graphic at its entrance, middle and exit, and the last frame. Look at each one: the speaker leans in and sits up, so a graphic that clears the eyes at its entrance can cover them two seconds later.
3. Start Studio with `preview --background --port 30<NN>` and give the user the URL. Stop it with `preview --stop` when they are done.

Report what was looked at and what was only machine-checked. Transcription and waveform analysis are an audio check, reported as that; listening is something the user does in Studio.

### 7. Revise

- **The user trimmed or moved clips in Studio:** `sync`. It keeps their clips, snaps them to frames, and moves captions, graphics, sound effects and music to follow.
- **The cut changes** (a deletion, a restored passage, a moved edge): edit `cutlist.json`, then `cut`, `retime`, `assemble --force`. After `retime` the rebuild asks for `--discard-studio-edits`; pass it when `history` shows no entry by `You`.
- **Anything else** (a caption word, a graphic, a level): edit the HTML directly.

`assemble --force` rewrites `index.html`, so labels, volumes and voice-chain values set there by hand return to their defaults; the hook and the graphics are kept. After a recut, a graphic keeps the cue times it was written with, and a generated block at the end of its script (`// retime:start`) maps the current clock onto them. Change a cue on the original clock; `retime` rewrites the map.

### 8. Export

On request only: `export <NNN>` renders `<NNN>/<NNN>.mp4` and checks length, black frames and loudness (about −16 LUFS). When loudness fails low, a few speech peaks from the clip-on microphone cap the level: on the `voice` bus set the limiter's `attack` to 0.1, lower its `limit` (to about −6.5) and raise its `level_out` by the same amount minus 1 dB, and export again. That one limiter is the only level control: no extra gain nodes, no per-clip levels, and more "Voice boost" makes it quieter, since the renderer pulls the mix down to its loudest peak. The effect is not linear, so measure each try.

Done when it prints three `PASS` lines. Publishing is the `publish-short` skill.

## House style

**The band** is where the hook and every graphic sit: the speaker's forehead, visual centre at x 540, y 640 (the one-third line), up to 940 px wide and about 280 px tall. Its lower edge stays above the eyes for as long as the graphic is on screen. When the speaker sits close and the eyes come up to y 770, raise the block until it ends just above them and no further: it belongs on the face, not on the wall above the head.

**Evidence taller than the band** goes outside it, as large as the frame allows: book covers about 330 px wide on either side of the chest (y 850 to 1340, between mouth and caption box), a wide screenshot on the wall above the head with the hook beneath it on the band.

| Element | Default |
| --- | --- |
| Hook | Oswald Bold, uppercase, 100 px, white, two lines in one size and colour, visible from the first frame, about 3 s |
| Type in graphics | Unbounded ExtraBold, uppercase, as large as the band allows and 60 px or more for a heading; its capitals run about 0.85 em wide. Yellow type on skin gets a dark outline (`-webkit-text-stroke: 7px #0d0d0d; paint-order: stroke fill`) |
| Captions | Inter Bold 64, white, only the spoken word `#FFE500`; box x 100, y 1360, 880 × 180, so a two-line caption sits at about y 1415 and 1490. Any lower, the apps' own captions and buttons crowd it |
