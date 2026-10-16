---
name: gemhog-edit-short
description: Edit a Gemhog short. Turns one hook take and one voiceover file into a captioned 1080×1920 HyperFrames project in the gemhog.com look, with the speaker on screen for the hook and graphic scenes over the voiceover; revises it after the user's Studio review, or exports it. Use for any work on a short's folder in the Gemhog content workspace.
---

# Edit a Gemhog short

A short is one HyperFrames project at `<folder>/hyperframes/`, built from two files in `<folder>/`: the **take**, an `.mp4` in which the speaker says the hook, and the **voiceover**, one audio file that reads the whole script. The speaker is on screen for the hook only. At the cut the **board** takes over, a page in the gemhog.com look, and one **scene** per passage of the voiceover is drawn on it. The **call to action** ends it: a fixed endcard on teal over a fixed recording of the CTA line, the same in every short.

`examples/` holds the eight scenes of the first short, "Was ist eigentlich eine Neo Cloud?". The user approved that look: read two of them before writing a scene.

The mechanics are one script, run from the workspace root. Its docstring lists the commands:

```sh
uv run <this skill's folder>/scripts/short.py <command> "<folder>"
```

Every cue (a scene entrance, a sound effect, a caption word) is written in **voiceover seconds**, the times in `prep/voiceover.words.json`. The script maps them onto the timeline through one **clock**, so a trim or a new speed moves scenes, captions, sound effects and the call to action together.

HyperFrames itself stays in its own skills: `/hyperframes-core` for composition rules and lint gotchas, `/hyperframes-cli` for `check`, `snapshot` and `preview`. `start` writes `BRIEF.md`, which answers the HyperFrames intent interview. Run the CLI at the version `hyperframes/package.json` pins: `npm run check` inside `hyperframes/`.

## Working with this user

- **Their Studio edits win.** They trim and move clips in Studio while you work, and render from it. `assemble` refuses once `index.html` differs from the last build; from then on use `sync` and direct HTML edits.
- **Calm.** They had these removed from the first cut: sub-headlines above the scene headings, a tagline next to the wordmark, a progress bar, a dotted and drifting background. The scene animations in `examples/` are what they called very good.
- **Centred.** They noticed left-set headings over centred diagrams. Headings and diagrams share the centre line; see [scenes.md](scenes.md).
- **Export on request.** They review in Studio first and say when to export.
- **One short after another**, in the one session.

## Steps

### 1. Start

With no folder named, take the ideas in **Voiceover** on the board ([gemhog-content](../gemhog-content/SKILL.md) says how to read it); each has `voiceover.mp3` in its folder.

**The take** is the folder's one `.mp4`. Paul records the hooks into `~/Movies/rec`, several ideas in a row. For a folder without a take, find the recording, newer than the voiceover, in which he asks that idea's hook question, and copy it in; the recording stays where it is. Name the ideas no recording fits and leave them in Voiceover.

Run `start "<folder>"`. It scaffolds the project, transcribes both files, finds the real edges of the hook from the waveform, finds where the voiceover joins (it usually repeats the hook question first, and joins after that), and drafts `prep/plan.json`, `prep/edit.json` and `prep/captions.txt`. The first `.mp4` by name is the take; `--take STEM --force` picks another.

A recording often holds the hook twice. `start` then quotes both attempts, cuts across them and misses that the voiceover repeats the hook. Use the last attempt: in `prep/plan.json` set `hook_in` and `hook_dur` to its edges in the waveform, `vo_start` to `hook_dur + 0.25` and `vo_in` to where the voiceover goes on after its own hook question; drop the extra hook lines from `prep/captions.txt`.

A voiceover from before 2026-10-16 still reads the old call to action at its end. `start` finds it by „Kauf keine Aktien", ends the clip before it (`vo_cut` in `prep/plan.json`), leaves its words out of the scenes and captions, and says so; the fixed call to action follows instead.

Done when its first line quotes the hook as spoken in the take, once, and it has printed the voiceover's sentences.

### 2. Plan the scenes

Edit `prep/edit.json`:

- `scenes`: `id` (lowercase, becomes the file name), `label`, and `from`, the voiceover second the passage starts. A scene is a passage that shares one picture: one to three sentences, 6 to 13 s. A scene whose last element is named in its final second takes up to 0.5 s of the next sentence, so that element stays 0.7 s on screen.
- `hook`: two lines, written per [hooks.md](hooks.md).
- `sfx`: [scenes.md](scenes.md) says where sounds belong.

Correct `prep/captions.txt` against the **Skript** on the idea's page in the Content Backlog (where that is: [gemhog-content](../gemhog-content/SKILL.md)). Its spelling and numbers stand; a **Hinweise für den Schnitt** section there holds what Paul asked for in the pictures. One phrase per line. A trailing `-` joins a word to the next (`Neo-@v2.78 Cloud@v3.12` shows "Neo-Cloud"). The transcriber splits compounds, lowercases brand names and hears "Claude" as "Cloud"; a transcript that disagrees with the script on a small word ("den" for "dem") is usually the transcriber.

Done when every sentence of the voiceover belongs to a scene and every caption line reads as the script does.

### 3. Assemble

Run `assemble`. It writes `index.html`, the hook, the board, the call to action and the captions, copies fonts and sounds, and creates a stub in `compositions/` for every scene that has no file yet.

Done when it prints the timeline and names the stubs.

### 4. Illustrate

Write each stub following [scenes.md](scenes.md). Logos come from the workspace's `media/` folder into `hyperframes/assets/logos/`.

Done when every scene holds a heading and a graphic, and `npm run check` passes.

### 5. Verify and hand over

1. `sheet` writes contact sheets of the hook, every scene just before it leaves, and the call to action twice. Look at each sheet: headings centred, nothing clipped at x 90 or 990, the hook labels above the speaker's eyes, every label readable.
2. `export --draft` renders `prep/draft.mp4` and prints `PASS` or `FAIL` lines for length, black or dark frames, loudness, and the captions against a transcript of the render. Explain or fix every `FAIL`.
3. Start Studio with `npx --yes hyperframes@<pinned> preview --background --port 30<NN>` inside `hyperframes/` and give the user the URL.

Report what you looked at and what was only machine-checked. Transcription and loudness are audio checks; listening is something the user does.

### 6. Revise

- **The user trimmed or moved the take or the voiceover in Studio:** `sync`. It reads those clips from `index.html`, keeps every other edit, and moves scenes, captions, sound effects and the call to action to follow. It also extends the board to the last frame; a board that ends early leaves a gap on black.
- **A scene boundary, a sound effect or a caption changes:** edit `edit.json` or `captions.txt`, then `sync`.
- **Anything else** (a label, a position, a level, the speed): edit the HTML, then `sync` when a clip's timing changed. The speed is `data-playback-rate` on `#voiceover`.

A scene keeps the cue times it was written with; the script rewrites only its clock constants (`VO0`, `RATE`, `DUR`).

### 7. Export

On request only: `export` renders `<folder>/<folder name>.mp4` and prints the same lines as the draft.

Done when every line says `PASS`, or each `FAIL` is explained to the user, and the idea's `Status` is **Ready to post**.

Then bring the **Videobeschreibung** draft on the idea's page up to date when the edit used something that needs a credit, such as music or footage.

## House style

`hyperframes/design.md` holds the brand tokens, copied from this skill's `assets/`.

| Element | Default |
| --- | --- |
| Hook | two Urbanist pills on the speaker's forehead, centre (540, 640): teal on top, white below; lower edge above the eyes |
| Board | paper `#f5f5f0`, a still teal tint, the notices `Keine Anlageberatung` and `KI-generiert` at the very top, left and right, the lockup of the app mark and the lowercase `gemhog` below them, with no rule under it (the user dropped it on 2026-10-16 as clutter); nothing on it moves. The first notice says the short explains and does not advise, the second is the EU's label for the AI voice; both stay in every short. The user wanted them at the very top on 2026-10-11, away from the captions and out of the wordmark's line |
| Scenes | heading at y 356, graphic between y 560 and 1350, both centred |
| Captions | DM Sans Bold 58 in a rounded white card at y 1370–1550, the spoken word teal. The user moved them up from y 1500 on 2026-10-11, to where his other shorts carry them |
| Call to action | `templates/outro.html` with `assets/cta/cta.mp3`, 9 s, right after the voiceover's last word: on teal, one phone is built from the app's Strong-takes screen (the bullish take, an open „?" slot, then the bearish take), two more screens fan out behind it, and the `gemhog.de` pill stays at the bottom throughout. The user chose it on 2026-10-16 and placed it 80 px below the first draft, clear of the platforms' top bar. Its cues follow the recording, which plays at 1.1x whatever the voiceover's speed; it carries no captions. The screens come from the media kit with the companies' logos put into the letter tiles |
| Sound | pops at 0.2 and swooshes at 0.35 from `media/sound/`; no music |
