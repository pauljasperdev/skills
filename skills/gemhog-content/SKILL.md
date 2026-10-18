---
name: gemhog-content
description: Gemhog channel rules - audience, promise, the three formats, the investor questions, source and number rules, and where the content lives in Notion. Use for a Gemhog content task that no other gemhog skill covers; those skills read its files.
---

# Gemhog content

Gemhog (@gemhog_com on Instagram, TikTok, YouTube) tells short business stories for private investors, with Paul as face and voice. This skill holds what every step shares; the steps are skills of their own.

## The boards

Two kanban boards in Notion: the **Content Backlog** holds topics, the **Videos** board holds shorts. A topic is researched once, and its Report often carries several videos, each a card of its own. A card's `Status` names what it **has**, and each skill moves it one column on when its work is done. Called without a topic, a skill takes every card in the column before its own.

**Content Backlog**, one card per topic:

| `Status` | The topic has | Who moves it here |
| --- | --- | --- |
| Ideen | a backlog entry | whoever adds it |
| Up Next | Paul's order to produce it | Paul |
| Researched | a reviewed **Report** | `gemhog-research`, on its own |
| Skripted | its videos written, each a card on the Videos board | `gemhog-script`, on its own |

**Videos**, one card per short, titled with its hook, its `Thema` relation pointing to the topic that holds the Report:

| `Status` | The video has | Who moves it here |
| --- | --- | --- |
| Skript | **Skript**, hook package, ElevenLabs-Fassung and Videobeschreibung | `gemhog-script`, on its own |
| Pre-Edit | the edited short in Studio with a placeholder hook: the voiceover's own hook over a dark slot | `gemhog-edit-short`, on its own |
| Edit | Paul's hook take in place of the placeholder, waiting for his last look in Studio | `gemhog-edit-short`, once the take is in |
| Ready to post | the exported short in its folder | `gemhog-edit-short`, on export |
| Queued | its posts in the Buffer queue of the three channels | `gemhog-publish`, when Paul orders it |

- **Up Next is a production order.** For a topic there, research and script run, and then voiceover and edit for every video the script put on the Videos board, a breaking one (`Haltbarkeit` News) first, each skill handing on to the next, until every video waits in **Pre-Edit**. Paul comes in there: he watches each, rewords the hook from its hook package and records it. A skill stops early only for what it cannot settle itself: a Report the reviewer rejects, no hook that passes, a failed generation.
- Read a board with `query_data_sources` in `mode: "rows"`, filtered on `Status`. Its SQL mode answers from a stale copy.
- Paul is needed twice, and each time a column says so: in **Pre-Edit** he records the hook take, which `gemhog-edit-short` finds and puts in place of the placeholder; in **Edit** he takes a last look in Studio and orders the export. The voiceover is no column of its own: `gemhog-voiceover` leaves the card in Skript and hands straight to the edit.
- Queued is the last column. Buffer publishes from its queue, and nobody keeps a column for what has gone out.

## Reference

- [CHANNEL.md](CHANNEL.md): who watches, what a video promises, what it never does.
- [FORMATS.md](FORMATS.md): the three formats and their checks. Read the topic's format.
- [QUESTIONS.md](QUESTIONS.md): the questions a private investor asks about a company, which every Report answers.
- [SOURCES.md](SOURCES.md): how claims, expectations, opinions and valuation numbers are checked.

## Where things live

Notion holds the content, these skills hold the rules.

- **Content Backlog**, the topics board: `https://app.notion.com/p/63d8a812696347839ec43c075487a5af` (data source `collection://0ac660a1-00bd-47d1-ac4c-bcc60a542dc7`). One entry per topic, titled with its research question. Read the `Format` options live before setting one.
- **Videos**, the shorts board: `https://app.notion.com/p/59a7868cf65b4b3297f99c8faf595af5` (data source `collection://68760402-c131-43b3-8923-0835f6a391f8`). One entry per short; `Haltbarkeit` is Zeitlos or News, a News one with its `Gültig bis` date; `Punkte` is the judge's score; `Ordner` names its folder.
- **The topic's page** holds the Report and the **Redaktionelle Auswahl**. **The video's page** holds everything of one short: hook package, Skript, ElevenLabs-Fassung, Videobeschreibung, Hinweise für den Schnitt, under real Notion headings.
- **The short's folder** in the workspace root holds the take, the voiceover and the HyperFrames project. It is named with the next free number and the video's hook in lowercase, without its full stop: `18 drei firmen beherrschen den arbeitsspeicher-markt, darunter micron`, and the name is written to the card's `Ordner`.

## Working with Paul

- **His order sets the endpoint.** Talking about content is not an order to write. Up Next runs to the edited shorts; an order for one step (a Report only, a Skript only) ends with that step.
- **Notion is written on order.** Read the target, change what was ordered, keep everything else on the page, fetch it again to confirm, then name what you changed. A new topic goes into the Content Backlog, after a search for a duplicate.
- **On criticism,** name the passage and its correction before offering a new draft.
- **A review** gives each finding as *Stelle → Problem → Korrektur* and ends with PASS, REVISE or REJECT (outside the channel). None of them releases anything for publishing.
