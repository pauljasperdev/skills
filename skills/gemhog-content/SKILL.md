---
name: gemhog-content
description: Gemhog channel rules - audience, promise, the three formats, source and number rules, and where the content lives in Notion. Use for a Gemhog content task that no other gemhog skill covers; those skills read its files.
---

# Gemhog content

Gemhog (@gemhog_com on Instagram, TikTok, YouTube) tells short business stories for private investors, with Paul as face and voice. This skill holds what every step shares; the steps are skills of their own.

## The board

The Content Backlog is a kanban board. An idea's `Status` names what it **has**, and each skill moves it one column on when its work is done. Called without a topic, a skill takes every idea in the column before its own.

| `Status` | The idea has | Who moves it here |
| --- | --- | --- |
| Ideen | a backlog entry | whoever adds it |
| Up Next | Paul's order to research it | Paul |
| Researched | a reviewed **Report** | `gemhog-research`, on its own |
| Skript | **Skript**, ElevenLabs-Fassung and Videobeschreibung in wording Paul confirmed | `gemhog-script`, when Paul confirms |
| Voiceover | `voiceover.mp3` in its folder | `gemhog-voiceover`, on its own |
| Ready to post | the exported short in its folder | `gemhog-edit-short`, on export |
| Queued | its posts in the Buffer queue of the three channels | `gemhog-publish`, when Paul orders it |

- An idea waits in its column until the next one is earned: Videoansätze or a Skript draft that Paul has yet to confirm are still in Researched.
- Read the board with `query_data_sources` in `mode: "rows"`, filtered on `Status`. Its SQL mode answers from a stale copy.
- Between Voiceover and Ready to post lies Paul's one step by hand: he records the hook take. `gemhog-edit-short` finds it.
- Queued is the last column. Buffer publishes from its queue, and nobody keeps a column for what has gone out.

## Reference

- [CHANNEL.md](CHANNEL.md): who watches, what a video promises, what it never does.
- [FORMATS.md](FORMATS.md): the three formats and their checks. Read the idea's format.
- [SOURCES.md](SOURCES.md): how claims, opinions and valuation numbers are checked, and the four Börsenperspektiven.

## Where things live

Notion holds the content, these skills hold the rules.

- **Content Backlog**, the kanban board: `https://app.notion.com/p/63d8a812696347839ec43c075487a5af` (data source `collection://0ac660a1-00bd-47d1-ac4c-bcc60a542dc7`). One entry per idea. Read the `Format` options live before setting one.
- **The idea's page** is its working page: every artifact is written there, under real Notion headings.
- **The short's folder** in the workspace root holds the take, the voiceover and the HyperFrames project. It is named with the next free number and the idea's title in lowercase: `02 was macht eigentlich broadcom?`.

## Working with Paul

- **His order sets the endpoint.** Talking about content is not an order to write. A research order ends with the Report. "Mach weiter" after a Report is not a choice between open Videoansätze.
- **Notion is written on order.** Read the target, change what was ordered, keep everything else on the page, fetch it again to confirm, then name what you changed. A new idea goes into the one backlog, after a search for a duplicate.
- **On criticism,** name the passage and its correction before offering a new draft.
- **A review** gives each finding as *Stelle → Problem → Korrektur* and ends with PASS, REVISE or REJECT (outside the channel). None of them releases anything for publishing.
