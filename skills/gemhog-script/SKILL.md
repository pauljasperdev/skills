---
name: gemhog-script
description: Write a Gemhog short's text from its Report, for one named idea or with no topic for every idea in the board's Researched column. Derives up to three Videoansätze, waits for Paul's Auswahl, then writes the Skript, its ElevenLabs-Fassung and a Videobeschreibung draft on the idea's Notion page; also reviews or revises an existing Skript. Use when asked for video angles, a script, a voiceover text or a video description for a Gemhog topic.
---

# Write a Gemhog script

The **Skript** is the last editorial artifact of a short. It selects from a finished Report and never discovers. Three things exist before its first sentence: the checked Report, the **Videoansatz** Paul chose, and his order to write.

Shared rules are in the `gemhog-content` skill next to this one: [CHANNEL.md](../gemhog-content/CHANNEL.md), [FORMATS.md](../gemhog-content/FORMATS.md), [SOURCES.md](../gemhog-content/SOURCES.md), and where things live in Notion in its [SKILL.md](../gemhog-content/SKILL.md). How a script is layered and written for the ear is in [craft.md](craft.md).

## Steps

### 1. Load

With no topic named, take every idea in **Researched** on the board, each at the step its page shows is next: no Videoansätze yet, an open Auswahl, or a Skript draft waiting for Paul's confirmation.

Fetch the idea's page and read its Report. Read CHANNEL.md, the idea's format in FORMATS.md, the valuation rules in SOURCES.md, and craft.md.

Done when the Report is there. A page without one goes to `gemhog-research` first.

### 2. Videoansätze

Derive up to three, as many as the findings honestly carry. They differ in what the viewer learns, not in wording. Each holds:

- **Ausgangsfrage / erste Belohnung:** the question and its plain answer, the one sentence a newcomer could repeat. It holds no angle yet.
- **Befund / zweite Belohnung:** the carrying finding with its source, and which of the four Börsenperspektiven it is. For a scenario: the Folgenstrang.
- **Spannung und Begrenzung:** the open explanation that keeps someone watching, and what the evidence does not show.
- **Vorwissen / Auslassungen:** what must be explained in passing, and what stays in the Report.

Name a favourite in one sentence, weighing insight, evidence and how simply Paul can explain it. When no finding carries a second Belohnung, say so and propose what to research.

Done when the Ansätze are on the page under **Redaktionelle Auswahl**, below the Report, and in your message to Paul as A, B, C. Then stop.

### 3. Auswahl

Paul picks. When the talk about it shows a factual gap, research it and update the Report first.

Done when he has named one Ansatz and asked for the Skript. A choice he already made is not asked for again. Record it on the page; the others stay as documented alternatives.

### 4. Skript

Write the chosen Ansatz as **Sprech-Bullets**: complete sentences Paul can read aloud, built as craft.md and the format describe.

- The first bullet is the hook, the title question. Paul says it on camera; everything after it becomes the voiceover.
- The second bullet is the first Pay-off, the plain answer. The Ansatz's finding arrives later, behind a Rehook.
- Every factual statement comes from the Report. A new fact is researched and added there before it is spoken.
- The last bullet is the close. The call to action is not written; the edit appends it (craft.md).
- 150 to 200 words give 60 to 90 seconds; the call to action adds 9 seconds in the edit. State the duration above the text, as estimated.
- When Paul rewrites a line, his wording stands. An order to restructure keeps his sentences.

Done when the chosen insight is delivered and the check in step 7 passes.

### 5. ElevenLabs-Fassung

The same words for the voice model, with audio tags that make it sound like Paul explaining to a friend, written per [elevenlabs.md](elevenlabs.md). Moods and pauses go in; noises, sound effects and anything one would cut from a recording stay out. The hook question stays in as the first line so the voice enters the answer naturally; the edit removes that repeat. `gemhog-voiceover` generates the voiceover from this block.

Done when a word-by-word comparison with the Skript shows only tags, breaks, `…` and capitals as differences, and every tag is of a kind elevenlabs.md lets in.

### 6. Videobeschreibung

A draft, one text for YouTube, Instagram and TikTok, written now while the sources are at hand. It stays under 2,200 characters, Instagram's limit, with every source in it: Paul calls the sources the most important part (2026-10-10), so a text that runs long is cut in the market-data paragraph, never in the source list.

- the title question and two or three sentences on what the video explains;
- for a spoken market figure, its Stichtag and what it measures and leaves out;
- „Keine Anlageberatung." and „Voiceover mit KI-generierter Stimme.";
- **Quellen zum Video:** the sources the Skript's statements rest on, each with a label and its URL written out;
- three to five hashtags.

It stays a draft: the edit adds credits for music or footage it used.

Done when every factual sentence of the Skript finds its source in the list and the text counts under 2,200 characters.

### 7. Check

- **Zuschauer:** does the assumed knowledge gap fit CHANNEL.md? Could Paul defend every paragraph without explaining a second topic?
- **Format:** its check in FORMATS.md.
- **Belege:** does each number match the Report in figure, comparison and hedge („ungefähr", „könnte erklären")?
- **Schichten und Ohr:** craft.md's check, every line of it.
- **Grenzen:** no recommendation, no promise. The hedge a statement needs is spoken; what a figure measures and leaves out is in the Videobeschreibung.

Done when all pass.

### 8. Save

Arrange the page as the recording view: **Skript**, **ElevenLabs-Fassung**, **Videobeschreibung**, then the Report, **Redaktionelle Auswahl** and the appendix. A wish Paul voiced for the pictures goes under **Hinweise für den Schnitt**, in his words. `Status` stays **Researched** while the Skript is a draft; set it to **Skript** once Paul has confirmed the wording. Fetch the page again to confirm.

Tell Paul the estimated duration and anything in the text that is weaker than he might assume. The voiceover is the next step, `gemhog-voiceover`, on his order.

## Other orders

- **A review of a Skript:** run step 7 on it.
- **A revision:** change what was asked, then bring ElevenLabs-Fassung and Videobeschreibung in line and run step 7.
