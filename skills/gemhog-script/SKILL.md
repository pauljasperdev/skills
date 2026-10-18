---
name: gemhog-script
description: Write the shorts a Gemhog Report carries, for one named topic or with no topic for every topic in the Content Backlog's Researched column. Writes hook candidates, has a fresh judge rate them and so decide how many videos the Report yields, and writes each video's Skript, its ElevenLabs-Fassung with the hook as a placeholder line, the hook package Paul records from, and a Videobeschreibung draft on a card of its own on the Videos board, without waiting for him; also reviews or revises an existing Skript. Use when asked for hooks, a script, a voiceover text or a video description for a Gemhog topic.
---

# Write a Gemhog script

The **Skript** is the last editorial artifact of a short. It selects from a finished Report and never discovers. It is written from the **hook**, the video's question; the topic's title is only the research question. A Report usually carries several questions worth a video, and each gets its own Skript and its own card on the Videos board.

Paul comes in once the short is edited: he watches it, rewords the hook and records it. So the Skript is written without waiting for him, and everything he needs to record sits in the **hook package**. His rewording keeps the hook's question, so the Skript holds; a different question is a new Skript.

Shared rules are in the `gemhog-content` skill next to this one: [CHANNEL.md](../gemhog-content/CHANNEL.md), [QUESTIONS.md](../gemhog-content/QUESTIONS.md), [FORMATS.md](../gemhog-content/FORMATS.md), [SOURCES.md](../gemhog-content/SOURCES.md), and where things live in Notion in its [SKILL.md](../gemhog-content/SKILL.md). How a hook is found and judged is in [hook-writing.md](hook-writing.md); how the body is built and written for the ear, in [craft.md](craft.md). Both rest on Paul's two guides in Notion, which they link.

## Steps

### 1. Load

With no topic named, take every topic in **Researched** on the Content Backlog.

Fetch the topic's page and read its Report. Fetch Paul's two guides. Read CHANNEL.md, QUESTIONS.md, the topic's format in FORMATS.md, the valuation rules in SOURCES.md, hook-writing.md and craft.md.

Done when the Report and both guides are there. A page without a Report goes to `gemhog-research` first.

### 2. Hook

Read the whole Report for the answers a viewer would want: the Anlegerfragen, their deshalb, the everyday link. Write eight to ten candidates across at least four of the guide's angles, each with the answer it promises and the Report's answers that carry it.

Dispatch a fresh judge on `opus` (in another tool, the strongest model at hand) with the guide's URL, the absolute paths of hook-writing.md, CHANNEL.md and QUESTIONS.md, the Report's text and the candidates, and nothing of your own reasoning. It rates and ranks them per hook-writing.md. Its ranking decides the videos: every question that clears the threshold in hook-writing.md is one, with its best candidate as the hook, changed as the judge proposes where that makes it stronger. When no question clears it but a candidate passes both gates, the strongest such candidate is the one video. When none passes both gates, stop and tell Paul what the Report would need.

Done when every video has its hook, its answer, its score and its Haltbarkeit.

### 3. Skript

Steps 3 to 7 run for each video in turn, the strongest lasting one first.

Write it as **Sprech-Bullets**: complete sentences Paul can read aloud, built as craft.md and the format describe.

- The first bullet is the hook. Paul will say it on camera; until then the voiceover says it.
- The second is the bridge, which begins the answer without echoing the hook's words; then the Erste Belohnung.
- Every factual statement comes from the Report. A new fact is researched and added there before it is spoken.
- The last bullet is the payoff with its deshalb. The call to action is not written; the edit appends it (craft.md).
- 150 to 200 words give 60 to 90 seconds; the call to action adds 9 seconds in the edit. State the duration above the text, as estimated.
- When Paul rewrites a line, his wording stands. An order to restructure keeps his sentences.

Done when the hook's answer is delivered and the check in step 7 passes.

### 4. Hook package

Write it per hook-writing.md: the spoken hook, the Text-Hook, three other wordings of the same question, and the visual hook. A different question is not in it: that is another video with its own card.

Done when every wording asks the hook's question and the bridge follows each of them.

### 5. ElevenLabs-Fassung

The same words for the voice model, with audio tags that make it sound like Paul explaining to a friend, written per [elevenlabs.md](elevenlabs.md). Moods and pauses go in; noises, sound effects and anything one would cut from a recording stay out. The hook is its first line: it is the placeholder the edit plays until Paul's take replaces it, and it lets the voice enter the answer naturally. `gemhog-voiceover` generates the voiceover from this block.

Done when a word-by-word comparison with the Skript shows only tags, breaks, `…` and capitals as differences, and every tag is of a kind elevenlabs.md lets in.

### 6. Videobeschreibung

A draft, one text for YouTube, Instagram and TikTok, written now while the sources are at hand. It stays under 2,200 characters, Instagram's limit, with every source in it: Paul calls the sources the most important part (2026-10-10), so a text that runs long is cut in the market-data paragraph, never in the source list.

- the hook and two or three sentences on what the video explains;
- for a spoken market figure, its Stichtag and what it measures and leaves out;
- „Keine Anlageberatung." and „Voiceover mit KI-generierter Stimme.";
- **Quellen zum Video:** the sources the Skript's statements rest on, each with a label and its URL written out;
- three to five hashtags.

It stays a draft: the edit adds credits for music or footage it used, and the hook in it follows Paul's recorded wording.

Done when every factual sentence of the Skript finds its source in the list and the text counts under 2,200 characters.

### 7. Check

- **Zuschauer:** does the assumed knowledge gap fit CHANNEL.md? Could Paul defend every paragraph without explaining a second topic?
- **Format:** its check in FORMATS.md.
- **Belege:** does each number match the Report in figure, comparison and hedge („ungefähr", „könnte erklären")?
- **Schichten und Ohr:** craft.md's check, every line of it.
- **Grenzen:** every sentence inside CHANNEL.md's Limits. The hedge a statement needs is spoken; what a figure measures and leaves out is in the Videobeschreibung.
- **Nacherzählen:** dispatch a fresh subagent with only the Skript's text and this brief: „Du interessierst dich fürs Investieren, bist aber kein Fachmann. Du hast das einmal gehört. Erzähl in einem Satz, was du mitnimmst, und nenne jedes Wort und jeden Schritt, dem du nicht folgen konntest.“ It passes when the sentence carries the payoff, not a side fact, and every word it names is explained or replaced. Experts misjudge what beginners know, so this stands in for a test with real newcomers; it does not replace one.

Done when all pass.

### 8. Save

**Each video** gets a card on the Videos board; search the board for its hook first, so a second run adds none. Title it with the hook; set `Status` **Skript**, the `Thema` relation to the topic, `Haltbarkeit` (Zeitlos, or News with its `Gültig bis` date), `Punkte`, and in `Notizen` its answer in one sentence. Its page is the recording view: **Hook zum Einsprechen** (the hook package), **Skript**, **ElevenLabs-Fassung**, **Videobeschreibung**, and **Hinweise für den Schnitt** with the visual hook and any wish Paul voiced for the pictures, his wishes in his words. It carries no copy of the Report.

**The topic's page** keeps its Report and gets, after it, **Redaktionelle Auswahl**: the judge's ranking with every candidate's ratings, and the videos made from it. Set the topic's `Status` to **Skripted**.

Fetch every page again to confirm.

Done when every video has its card with these sections and the topic is Skripted. Under a production order (gemhog-content) the voiceover follows at once for every video, a News one first, with `gemhog-voiceover`; otherwise tell Paul per video its hook, duration and Haltbarkeit.

## Other orders

- **A review of a Skript:** run step 7 on it.
- **A revision:** change what was asked, then bring hook package, ElevenLabs-Fassung and Videobeschreibung in line and run step 7.
- **Another question for a video** (Paul's order): write its Skript anew from step 3 with that hook, on the same card.
- **One more video** from a Report already Skripted, for a question Paul names or one the ranking left below the threshold: steps 3 to 8 for it, as one more card on the topic.
